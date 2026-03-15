/**
 * Phase 4: 후처리
 *
 * Zod 스키마 검증, ReportContent 조합.
 * 검증 실패 시 섹션별 fallback 전략을 적용한다.
 */

import { z } from "zod/v4";

import { ReportSectionSchema, validateByPlan } from "../schemas.ts";
import { SECTION_ORDER } from "../types.ts";
import type {
  ReportPlan,
  ReportContent,
  ReportMeta,
  ReportSection,
  StudentInfo,
} from "../types.ts";
import type { PreprocessedData } from "./preprocessor.ts";
import { matchMajorEvaluationCriteria } from "../constants/major-evaluation-criteria.ts";
import { UNIVERSITY_ADMISSION_DATA } from "../constants/university-admission-data.ts";

// ─── 검증 결과 타입 ───

export interface SectionValidationResult {
  sectionId: string;
  valid: boolean;
  errors: string[];
}

export interface PostprocessResult {
  content: ReportContent;
  validationResults: SectionValidationResult[];
  planValidationErrors: string[];
}

// ─── 메인 후처리 함수 ───

export const postprocess = (
  rawSections: ReportSection[],
  preprocessed: PreprocessedData,
  studentInfo: StudentInfo,
  plan: ReportPlan,
  reportId: string
): PostprocessResult => {
  const validationResults: SectionValidationResult[] = [];

  // 1. 각 섹션 Zod 검증
  const validatedSections: ReportSection[] = [];

  for (let section of rawSections) {
    section = normalizeSection(section, preprocessed, plan, studentInfo);
    const result = validateSection(section);
    validationResults.push(result);

    if (!result.valid) {
      console.warn(
        `[report:${reportId}] 섹션 검증 실패 (포함됨): ${section.sectionId}`,
        result.errors.join("; ").substring(0, 500)
      );
    }
    // 검증 실패해도 모든 섹션 포함 — Flash 모델은 스키마를 완벽히 준수하지 않을 수 있음
    validatedSections.push(section);
  }

  // 2. 크로스 섹션 동기화: competencyScore → studentProfile radarChart
  const compScore = validatedSections.find(
    (s) => s.sectionId === "competencyScore"
  ) as any;
  const profile = validatedSections.find(
    (s) => s.sectionId === "studentProfile"
  ) as any;
  if (compScore?.scores && profile?.radarChart) {
    for (const sc of compScore.scores) {
      if (sc.category === "academic") profile.radarChart.academic = sc.score;
      if (sc.category === "career") profile.radarChart.career = sc.score;
      if (sc.category === "community") profile.radarChart.community = sc.score;
    }
    if (compScore.growthGrade) {
      // 등급 기준: S(90~100), A(75~89), B(60~74), C(40~59), D(0~39)
      const growthMap: Record<string, number> = {
        S: 95,
        A: 82,
        B: 67,
        C: 50,
        D: 20,
      };
      const growthNumeric =
        growthMap[compScore.growthGrade] ?? profile.radarChart.growth;
      profile.radarChart.growth = growthNumeric;
      // 발전가능성 숫자 점수를 competencyScore 섹션에 주입
      compScore.growthScore = growthNumeric;
    }
  }

  // 3. 크로스 섹션 동기화: admissionStrategy → admissionPrediction chance 일관성
  const admPred = validatedSections.find(
    (s) => s.sectionId === "admissionPrediction"
  ) as any;
  const admStrat = validatedSections.find(
    (s) => s.sectionId === "admissionStrategy"
  ) as any;
  if (admPred && admStrat) {
    // admissionStrategy의 대학별 chance를 기준으로 admissionPrediction 동기화
    const strategyChanceMap = new Map<string, string>();
    if (Array.isArray(admStrat.universities)) {
      for (const uni of admStrat.universities) {
        const key = `${uni.university}|${uni.department}`;
        strategyChanceMap.set(key, uni.chance);
        // 대학명만으로도 매핑 (학과가 다를 수 있으므로)
        strategyChanceMap.set(uni.university, uni.chance);
      }
    }

    if (Array.isArray(admPred.predictions)) {
      for (const pred of admPred.predictions) {
        if (!Array.isArray(pred.universityPredictions)) continue;
        for (const uniPred of pred.universityPredictions) {
          const exactKey = `${uniPred.university}|${uniPred.department}`;
          const stratChance =
            strategyChanceMap.get(exactKey) ||
            strategyChanceMap.get(uniPred.university);
          if (stratChance && stratChance !== uniPred.chance) {
            uniPred.chance = stratChance;
          }
        }
      }
    }

    // basePassRates 기반 tier-chance 일관성 강제 보정
    if (Array.isArray(admPred.predictions)) {
      // preprocessed basePassRates에서 대학별 tier 정보 수집
      const tierMap = new Map<string, string>();
      for (const bp of preprocessed.basePassRates) {
        tierMap.set(bp.university, bp.tier);
      }
      // admissionStrategy에서도 보충
      if (Array.isArray(admStrat.universities)) {
        for (const uni of admStrat.universities) {
          if (!tierMap.has(uni.university)) {
            tierMap.set(uni.university, uni.tier);
          }
        }
      }

      for (const pred of admPred.predictions) {
        if (!Array.isArray(pred.universityPredictions)) continue;
        for (const uniPred of pred.universityPredictions) {
          const tier = tierMap.get(uniPred.university);
          if (!tier) continue;

          // 티어-chance 일관성 강제 보정
          const { chance } = uniPred;
          if (tier === "하향") {
            // 하향 대학은 반드시 high 이상
            if (
              chance === "low" ||
              chance === "very_low" ||
              chance === "medium"
            ) {
              uniPred.chance = "high";
            }
          } else if (tier === "안정") {
            // 안정 대학은 반드시 medium 이상
            if (chance === "low" || chance === "very_low") {
              uniPred.chance = "medium";
            }
          } else if (tier === "적정") {
            // 적정 대학은 very_low 불가
            if (chance === "very_low") {
              uniPred.chance = "low";
            }
          }
          // 상향 대학은 low/very_low 허용 (도전 지원)
        }
      }
    }
  }

  // 3-1. AI 생성 대학-학과가 실제 존재하는지 검증
  // 후보군(candidateSet) + 전체 DB(dbSet) 모두 허용 — AI가 역량 분석 기반으로 후보군 외 대학 추천 가능
  const candidateSet = new Set(
    preprocessed.basePassRates.map((bp) => `${bp.university}|${bp.department}`)
  );
  // 유저 설정 희망대학도 허용 목록에 추가
  if (studentInfo.targetUniversities) {
    for (const tu of studentInfo.targetUniversities) {
      candidateSet.add(`${tu.universityName}|${tu.department}`);
    }
  }
  const candidateUniversities = new Set(
    preprocessed.basePassRates.map((bp) => bp.university)
  );
  if (studentInfo.targetUniversities) {
    for (const tu of studentInfo.targetUniversities) {
      candidateUniversities.add(tu.universityName);
    }
  }

  // 전체 DB에 존재하는 대학-학과 셋 (후보군 외 AI 추천 검증용)
  const dbUniversitySet = new Set(
    UNIVERSITY_ADMISSION_DATA.map((e) => e.university)
  );

  // admissionPrediction: DB에도 없는 대학만 제거 (후보군 외 AI 추천은 허용)
  if (admPred && Array.isArray(admPred.predictions)) {
    for (const pred of admPred.predictions) {
      if (!Array.isArray(pred.universityPredictions)) continue;
      pred.universityPredictions = pred.universityPredictions.filter(
        (up: any) => {
          const exactKey = `${up.university}|${up.department}`;
          // 후보군 정확 매칭
          if (candidateSet.has(exactKey)) return true;
          // 후보군 대학명 매칭 (학과 다를 수 있음)
          if (candidateUniversities.has(up.university)) return true;
          // 전체 DB에 대학이 존재하면 허용 (AI 역량 기반 추천)
          if (dbUniversitySet.has(up.university)) {
            console.log(
              `[report:${reportId}] 후보군 외 AI 추천 대학 허용: ${up.university} ${up.department}`
            );
            return true;
          }
          console.warn(
            `[report:${reportId}] DB에 없는 대학-학과 제거: ${up.university} ${up.department}`
          );
          return false;
        }
      );
    }
  }

  // admissionStrategy: DB에도 없는 대학만 제거
  if (admStrat && Array.isArray(admStrat.recommendations)) {
    admStrat.recommendations = admStrat.recommendations.filter((rec: any) => {
      const exactKey = `${rec.university}|${rec.department}`;
      if (candidateSet.has(exactKey)) return true;
      if (candidateUniversities.has(rec.university)) return true;
      if (dbUniversitySet.has(rec.university)) {
        console.log(
          `[report:${reportId}] 후보군 외 AI 추천 대학 허용: ${rec.university} ${rec.department}`
        );
        return true;
      }
      console.warn(
        `[report:${reportId}] DB에 없는 추천 대학 제거: ${rec.university} ${rec.department}`
      );
      return false;
    });
  }

  // 4. 섹션 정렬 (플랜별 순서)
  const sectionOrder = SECTION_ORDER[plan];
  validatedSections.sort((a, b) => {
    const aIdx = sectionOrder.indexOf(a.sectionId);
    const bIdx = sectionOrder.indexOf(b.sectionId);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // 5. ReportMeta 생성
  const meta: ReportMeta = {
    reportId,
    plan,
    studentInfo: {
      name: studentInfo.name,
      grade: studentInfo.grade,
      track: studentInfo.track,
      schoolType: studentInfo.schoolType,
      targetUniversity: studentInfo.targetUniversity,
      targetDepartment: studentInfo.targetDepartment,
      hasMockExamData: studentInfo.hasMockExamData,
    },
    createdAt: new Date().toISOString(),
    version: 4,
  };

  // 6. ReportContent 조합
  const content: ReportContent = {
    meta,
    sections: validatedSections,
  };

  // 7. 플랜별 검증
  const planValidationErrors = validateByPlan(content);

  return {
    content,
    validationResults,
    planValidationErrors,
  };
};

// ─── AI 금지 표현 치환 ───

// 안전한 치환만 수행 (앞뒤 문맥과 무관하게 1:1 대응되는 표현만)
const AI_TONE_REPLACEMENTS: [RegExp, string][] = [
  // ── 단독으로 쓰이는 AI식 형용사/부사 → 자연스러운 대체 ──
  [/돋보입니다/g, "강점입니다"],
  [/돋보인다/g, "강점이다"],
  [/돋보이는/g, "눈에 띄는"],
  [/매우 인상적입니다/g, "주요 평가 포인트입니다"],
  [/인상적입니다/g, "평가 포인트입니다"],
  [/주목할 만합니다/g, "중요합니다"],
  [/탁월한 역량/g, "우수한 역량"],
  [/뛰어난 역량/g, "우수한 역량"],
  [/매우 우수한 역량/g, "우수한 역량"],

  // ── 문장 끝 어미 (완전한 어미 단위로만 치환) ──
  [/것으로 사료됩니다/g, "것으로 봅니다"],
  [/바람직합니다/g, "좋겠습니다"],

  // ── "길렀다" 계열 (부자연스러운 표현) ──
  [/협동심을 길렀/g, "협동심을 보여주었"],
  [/배려심을 길렀/g, "배려심을 보여주었"],

  // ── 돋보이다 활용형 추가 ──
  [/돋보여\s/g, "강점이 있어 "],
  [/돋보이며/g, "강점이 있으며"],
  [/돋보이지만/g, "강점이지만"],
  [/돋보임\./g, "강점입니다."],
  [/돋보임$/gm, "강점입니다"],

  // ── 3년 개근 → 2년 개근 (현행 교육과정 기준) ──
  [/3년간\s*개근/g, "재학 기간 동안 개근"],
  [/3년간\s*무결석/g, "재학 기간 동안 무결석"],
  [/3년간\s*무단결석/g, "재학 기간 동안 무단결석"],
  [/3년\s*연속\s*개근/g, "재학 기간 동안 개근"],

  // ── 존재하지 않는 학년 데이터 언급 제거 ──
  [/3학년\s*생기부\s*기록이\s*부재[했하][^\\.]*\./g, ""],
  [/3학년\s*(생기부\s*)?기록이\s*없[어다는][^\\.]*\./g, ""],
  [/3학년\s*데이터가\s*없[어다는][^\\.]*\./g, ""],

  // ── 명령형 어미 → 권유형 전환 ──
  [/작성하세요/g, "작성하는 것이 좋습니다"],
  [/설명하세요/g, "설명하는 것이 효과적입니다"],
  [/구성하세요/g, "구성하는 것이 효과적입니다"],
  [/분석하세요/g, "분석하는 것이 좋습니다"],
  [/준비하세요/g, "준비하는 것이 좋습니다"],
  [/활용하세요/g, "활용하는 것이 효과적입니다"],

  // ── 교외 활동 표현 → 교내 활동으로 치환 ──
  [/온라인 강의[를을\s]*활용/g, "교내 수업 활동을 활용"],
  [/온라인 강좌/g, "교내 심화 학습"],

  // ── AI식 칭찬/경쟁력 표현 ──
  [/높은 경쟁력을 가집니다/g, "강점 요소입니다"],
  [/높은 경쟁력이 있습니다/g, "강점 요소입니다"],
  [/경쟁력이 있습니다/g, "강점 요소입니다"],
  [/경쟁력을 가집니다/g, "강점 요소입니다"],
  [/매우 유리합니다/g, "유리한 편입니다"],
  [/매우 적합합니다/g, "적합한 편입니다"],
  [/매우 긍정적입니다/g, "긍정적 요소입니다"],
  [/우수한 수준입니다/g, "양호한 수준입니다"],
  [/매우 뛰어나며/g, "양호하며"],
  [/매우 뛰어난/g, "양호한"],

  // ── 기타 AI식 표현 ──
  [/발전시켰/g, "보여주었"],
  [/충분히 합격할 겁니다/g, "합격 가능성이 높습니다"],
  [/충분히 합격/g, "합격 가능성이 높은"],
  // ── 중복 표현 제거 ──
  [/가능성이 높은 가능성이 높습니다/g, "가능성이 높습니다"],
  [/다른 요소로 충분히 커버 가능합니다/g, "다른 요소로 보완 가능합니다"],
  [/충분히 커버 가능합니다/g, "보완 가능합니다"],
  [/충분히 커버/g, "보완"],
  [/충분히 경쟁력/g, "경쟁력"],
  [/충분히 어필/g, "어필"],
  [/충분히 가능/g, "가능"],

  // ── 무의미한 추상 평가 표현 → 제거/대체 ──
  // "비판적 사고력" 치환: 문맥 파괴 방지를 위해 독립 표현만 매칭
  [/비판적 사고력을\s*입증합니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*보여주었습니다/g, "다각적 분석 역량을 보여주었습니다"],
  [/비판적 사고력을\s*보여줍니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*드러냅니다/g, "다각적 분석 역량이 확인됩니다"],
  [/비판적 사고력을\s*발휘합니다/g, "다각적 분석 역량을 보여줍니다"],
  [/비판적 사고력을\s*드러냈/g, "다각적 분석 역량을 보여주었"],
  [/비판적 사고력을\s*발휘했/g, "다각적 분석 역량을 보여주었"],
  [/비판적 사고력/g, "다각적 분석 역량"],
  [/실질적 기여 의지/g, "참여 의지"],
  [/문제 해결 능력을 보여주었습니다/g, "문제 해결 과정이 기록되어 있습니다"],
  [/창의적 사고를 발휘했습니다/g, "독자적 접근 방식을 시도했습니다"],
  [/리더십을 발휘했습니다/g, "리더 역할을 수행했습니다"],

  // ── "드러납니다" 계열 (금지 표현) ──
  [/잘 드러납니다/g, "잘 확인됩니다"],
  [/잘 드러나며/g, "확인되며"],
  [/잘 드러나고/g, "확인되고"],
  [/드러납니다/g, "확인됩니다"],
  [/드러나며/g, "확인되며"],

  // ── "매우 우수합니다" → 톤 다운 ──
  [/매우 우수합니다/g, "우수한 편입니다"],
  [/매우 우수하여/g, "우수하여"],
  [/매우 높은 수준/g, "높은 수준"],
  [/강력한 강점/g, "주요 강점"],

  // ── "~할 수 있습니다" → "~할 겁니다" (평가 맥락) ──
  [/높은 평가를 받을 수 있습니다/g, "긍정적 요소로 작용할 겁니다"],
  [/매우 높은 평가를 받을 겁니다/g, "긍정적 요소로 작용할 겁니다"],
  [/높은 평가를 받을 겁니다/g, "긍정적 요소로 작용할 겁니다"],
  [/평가할 수 있습니다/g, "평가할 겁니다"],
  [/평가될 수 있습니다/g, "평가될 겁니다"],
  [/작용할 수 있습니다/g, "작용할 겁니다"],

  // ── 온점 3개(줄임표) → (중략) ──
  [/\.{3,}/g, "(중략)"],
  [/…/g, "(중략)"],
];

const sanitizeAiTone = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of AI_TONE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

// ─── 한글 서술문 내 영단어 치환 ───

const ENGLISH_WORD_REPLACEMENTS: [RegExp, string][] = [
  // 본문에 노출되는 영단어 → 한글 대체 (JSON enum 값은 제외)
  [/\bhigh\b/gi, "높음"],
  [/\bmedium\b/gi, "보통"],
  [/\blow\b/gi, "낮음"],
  [/\bpriority\b/gi, "우선순위"],
  [/\bimpact\b/gi, "영향"],
];

// JSON enum 값으로 사용되는 필드는 영단어 치환 제외
const ENUM_FIELDS = new Set([
  "sectionId",
  "category",
  "chance",
  "suitability",
  "rating",
  "tier",
  "tierGroup",
  "highlight",
  "connectionType",
  "depth",
  "type",
  "admissionType",
  "achievement",
  "grade",
  "growthGrade",
  "overallRating",
  "gradeTrend",
  "currentTrend",
  "status",
  "importance",
  "evaluationImpact",
  "questionType",
]);

const sanitizeEnglishWords = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of ENGLISH_WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

/** 객체의 모든 문자열 필드를 재귀적으로 AI 톤 치환 + 영단어 치환 */
const sanitizeDeep = (obj: unknown, fieldName?: string): unknown => {
  if (typeof obj === "string") {
    // enum 필드는 영단어 치환 건너뜀
    const toned = sanitizeAiTone(obj);
    if (fieldName && ENUM_FIELDS.has(fieldName)) return toned;
    return sanitizeEnglishWords(toned);
  }
  if (Array.isArray(obj)) return obj.map((item) => sanitizeDeep(item));
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeDeep(value, key);
    }
    return result;
  }
  return obj;
};

// ─── AI 출력 필드명 정규화 + 전처리 데이터 보강 ───

const normalizeSection = (
  section: ReportSection,
  pre: PreprocessedData,
  plan: ReportPlan,
  studentInfo: StudentInfo
): ReportSection => {
  let s = section as any;

  // ── AI 금지 표현 치환 (모든 섹션 공통) ──
  s = sanitizeDeep(s) as any;

  // ── subjectAnalysis: evaluationImpact 정규화 + 플랜별 과목 수 제한 ──
  if (s.sectionId === "subjectAnalysis" && Array.isArray(s.subjects)) {
    const impactMap: Record<string, string> = {
      "very high": "very_high",
      "매우 높음": "very_high",
      높음: "high",
      보통: "medium",
      낮음: "low",
      "very low": "very_low",
      "매우 낮음": "very_low",
    };
    for (const subj of s.subjects) {
      if (subj.evaluationImpact && impactMap[subj.evaluationImpact]) {
        subj.evaluationImpact = impactMap[subj.evaluationImpact];
      }
    }

    // ── 과목 중요도 강제 보정 (계열별 세분화 기준) ──
    const targetDept = studentInfo.targetDepartment ?? "";
    const criteria = matchMajorEvaluationCriteria(targetDept);

    // 비핵심 과목 패턴 (학종 평가에서 변별력 없는 과목)
    // "정보" 과목: 어떤 학과든(컴공 포함) 비핵심. 고교 정보는 1학년 1~2단위
    // 기초 수준으로, 입학사정관은 수학·물리학 세특으로 전공 적합성을 판단함.
    // 과목명은 정규화 후 매칭 (공백/숫자/로마숫자 제거됨)
    const NON_CORE_SUBJECTS = [
      "정보",
      "정보과학",
      "기술[·]?가정",
      "제2외국어",
      "일본어",
      "중국어",
      "독일어",
      "프랑스어",
      "스페인어",
      "러시아어",
      "아랍어",
      "베트남어",
      "한문",
      "교양",
      "진로와?직업",
      "체육",
      "음악",
      "미술",
      "독서",
      "보건",
      "환경",
      "논리학",
      "실용국어",
      "실용영어",
      "심화국어",
      "심화영어",
      "직업",
      "로봇",
    ];
    const NON_CORE_PATTERN = new RegExp(`^(${NON_CORE_SUBJECTS.join("|")})`);
    const CORE_LANG_PATTERN = /^(국어|영어|문학|언어와매체|화법과작문)/;

    // 핵심/권장과목 매칭용 정규화 함수
    const normalizeCourseForMatch = (course: string): string =>
      course.replace(/[ⅠⅡⅢ\s·]/g, "");

    for (const subj of s.subjects) {
      // 과목명 정규화: "2학년 정보", "제2 외국어", "일본어Ⅰ" 등 변형 처리
      const name = (subj.subjectName ?? "")
        .replace(/^\d학년\s*/, "")
        .replace(/\s+/g, "")
        .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ1-9]+$/, "");
      let matched = false;

      if (NON_CORE_PATTERN.test(name)) {
        // 비핵심 과목: 중요도 2% (거의 0에 가깝게)
        subj.importancePercent = 2;
        subj.evaluationImpact = "very_low";
        matched = true;
      }

      // 핵심 권장과목 매칭 (계열별 세분화)
      if (!matched) {
        const isCoreSubject = criteria.coreSubjects.some((core) =>
          name.includes(normalizeCourseForMatch(core))
        );
        if (isCoreSubject) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 35);
          subj.evaluationImpact = "very_high";
          matched = true;
        }
      }

      // 권장과목 매칭
      if (!matched) {
        const isRecommended = criteria.recommendedSubjects.some((rec) =>
          name.includes(normalizeCourseForMatch(rec))
        );
        if (isRecommended) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 20);
          subj.evaluationImpact = "high";
          matched = true;
        }
      }

      // 국어/영어: 공통 기초 과목
      if (!matched && CORE_LANG_PATTERN.test(name)) {
        subj.importancePercent = Math.min(
          Math.max(subj.importancePercent ?? 10, 10),
          15
        );
        subj.evaluationImpact = "medium";
        matched = true;
      }

      // 안전장치: 어떤 핵심 패턴에도 매칭되지 않은 과목은 중요도 상한 10%
      if (!matched && (subj.importancePercent ?? 0) > 10) {
        subj.importancePercent = 5;
        subj.evaluationImpact = "low";
      }
    }

    // ── 과목 다양성 강제: 같은 교과 카테고리에서 최대 2개 ──
    const getSubjectCategory = (name: string): string => {
      const n = name
        .replace(/^\d학년\s*/, "")
        .replace(/\s+/g, "")
        .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ1-9]+$/, "");
      if (/^(수학|미적분|기하|확률과통계|인공지능수학|경제수학)/.test(n))
        return "수학";
      if (/^(물리학|물리)/.test(n)) return "물리";
      if (/^(화학)/.test(n)) return "화학";
      if (/^(생명과학|생물)/.test(n)) return "생명과학";
      if (/^(지구과학|천문)/.test(n)) return "지구과학";
      if (/^(국어|문학|화법|언어와매체|독서|실용국어|심화국어)/.test(n))
        return "국어";
      if (/^(영어|영어Ⅰ|영어Ⅱ|실용영어|심화영어|영어독해|영어회화)/.test(n))
        return "영어";
      if (
        /^(통합사회|사회|정치|경제|세계사|동아시아사|한국지리|세계지리|사회문화|윤리)/.test(
          n
        )
      )
        return "사회";
      return "기타";
    };

    // 중요도 높은 순 정렬 후, 같은 카테고리에서 최대 2개만 유지
    s.subjects.sort(
      (a: any, b: any) =>
        (b.importancePercent ?? 0) - (a.importancePercent ?? 0)
    );
    const categoryCounts = new Map<string, number>();
    const MAX_PER_CATEGORY = 2;
    s.subjects = s.subjects.filter((subj: any) => {
      const cat = getSubjectCategory(subj.subjectName ?? "");
      const count = categoryCounts.get(cat) ?? 0;
      if (count >= MAX_PER_CATEGORY) return false;
      categoryCounts.set(cat, count + 1);
      return true;
    });

    // 플랜별 과목 수 강제 제한 — 중요도 높은 순으로 선별
    const maxSubjects: Record<ReportPlan, number> = {
      lite: 5,
      standard: 7,
      premium: 10,
    };
    const limit = maxSubjects[plan];
    if (s.subjects.length > limit) {
      // 중요도 높은 순 정렬 후 상위 N개만 유지
      s.subjects.sort(
        (a: any, b: any) =>
          (b.importancePercent ?? 0) - (a.importancePercent ?? 0)
      );
      s.subjects = s.subjects.slice(0, limit);
    }
  }

  if (s.sectionId === "academicAnalysis") {
    // ── 핵심 정량 수치: 코드 전처리 결과로 강제 덮어쓰기 ──
    s.overallAverageGrade = pre.overallAverage;

    s.gradesByYear = pre.averageByGrade.map((g) => ({
      year: g.year,
      semester: g.semester,
      averageGrade: Math.round(g.average * 100) / 100,
    }));

    s.subjectCombinations = pre.subjectCombinations.map((c) => ({
      combination: c.name,
      averageGrade: c.average,
    }));

    const trendMap: Record<string, string> = {
      ascending: "상승",
      stable: "유지",
      descending: "하락",
    };
    s.gradeTrend = trendMap[pre.gradeTrend.direction] || "유지";

    // ── gradeDeviationAnalysis: 전처리 gradeVariance에서 확정값 주입 ──
    const gv = pre.gradeVariance;
    const aiDev = s.gradeDeviationAnalysis ?? {};
    const riskText =
      aiDev.riskAssessment || aiDev.analysis || aiDev.recommendation || "";
    s.gradeDeviationAnalysis = {
      highestSubject: gv.highest || "-",
      lowestSubject: gv.lowest || "-",
      deviationRange: gv.spread ?? 0,
      riskAssessment:
        riskText ||
        (gv.spread > 0
          ? `최고 과목(${gv.highest})과 최저 과목(${gv.lowest}) 간 ${gv.spread}등급 차이가 있습니다.`
          : "과목별 성적 데이터가 부족하여 편차 분석이 어렵습니다."),
    };

    // ── majorRelevanceAnalysis: AI 필드명 매핑 ──
    if (s.majorRelevanceAnalysis) {
      const m = s.majorRelevanceAnalysis;
      s.majorRelevanceAnalysis = {
        enrollmentEffort: m.enrollmentEffort || m.comparison || "",
        achievement: m.achievement || m.recommendation || "",
        recommendedSubjects:
          m.recommendedSubjects || m.weaknesses || m.strengths || [],
      };
    }

    // ── gradeChangeAnalysis: AI 필드명 매핑 + 코드값 강제 ──
    if (s.gradeChangeAnalysis) {
      const g = s.gradeChangeAnalysis;
      s.gradeChangeAnalysis = {
        currentTrend: trendMap[pre.gradeTrend.direction] || "유지",
        prediction: g.prediction || g.analysis || "",
        actionItems: g.actionItems || g.recommendations || [],
        actionItemPriorities: g.actionItemPriorities || [],
      };
    }

    // ── careerSubjectAnalyses: AI 필드명 정규화 + 전처리 데이터 주입 ──
    if (Array.isArray(s.careerSubjectAnalyses)) {
      const careerMap = new Map(
        pre.careerSubjects.map((cs) => [cs.subject, cs])
      );
      s.careerSubjectAnalyses = s.careerSubjectAnalyses.map((cs: any) => {
        const preData = careerMap.get(cs.subject);
        return {
          subject: cs.subject ?? "",
          achievement: cs.achievement || preData?.achievement || "",
          achievementDistribution:
            cs.achievementDistribution ||
            preData?.achievementDistribution ||
            "",
          interpretation: cs.interpretation || cs.analysis || cs.comment || "",
        };
      });
    }

    // ── fiveGradeSimulation: 등급제에 따라 처리 분기 ──
    // 고1·고2 (5등급제): 이미 5등급제이므로 전환 불필요, AI 출력 유지
    // 고3/졸업 (9등급제): 전처리 데이터 기반 강제 주입
    if (
      Array.isArray(pre.fiveGradeConversion) &&
      pre.fiveGradeConversion.length > 0
    ) {
      // 과목별 최종(가장 최근) 등급만 사용
      const latestBySubject = new Map<
        string,
        { original: number; converted: number }
      >();
      for (const fc of pre.fiveGradeConversion) {
        latestBySubject.set(fc.subject, {
          original: fc.original,
          converted: fc.converted,
        });
      }
      // AI가 선택한 주요 5과목의 interpretation은 유지하되, 수치는 코드값으로 대체
      const aiSimMap = new Map<string, string>(
        (Array.isArray(s.fiveGradeSimulation) ? s.fiveGradeSimulation : []).map(
          (sim: any): [string, string] => [
            sim.subject ?? "",
            sim.interpretation ?? "",
          ]
        )
      );
      // 주요 5과목 선정: AI가 선택한 과목이 있으면 그대로, 없으면 전처리에서 상위 5개
      const targetSubjects: string[] =
        aiSimMap.size > 0
          ? [...aiSimMap.keys()].slice(0, 5)
          : [...latestBySubject.keys()].slice(0, 5);
      s.fiveGradeSimulation = targetSubjects
        .filter((subj: string) => latestBySubject.has(subj))
        .map((subj) => {
          const data = latestBySubject.get(subj)!;
          return {
            subject: subj,
            currentGrade: data.original,
            simulatedGrade: data.converted,
            interpretation: aiSimMap.get(subj) || "",
          };
        });
    } else if (Array.isArray(s.fiveGradeSimulation)) {
      s.fiveGradeSimulation = s.fiveGradeSimulation.map((sim: any) => ({
        subject: sim.subject ?? "",
        currentGrade: sim.currentGrade ?? sim.original ?? null,
        simulatedGrade: sim.simulatedGrade ?? sim.converted ?? null,
        percentileCumulative: sim.percentileCumulative,
        interpretation: sim.interpretation ?? "",
      }));
    }

    // ── universityGradeSimulations: 빈값 행 제거 ──
    if (Array.isArray(s.universityGradeSimulations)) {
      s.universityGradeSimulations = s.universityGradeSimulations
        .map((sim: any) => ({
          university: sim.university ?? "",
          department: sim.department ?? "",
          reflectionMethod: sim.reflectionMethod || sim.method || "",
          calculatedScore: sim.calculatedScore || sim.score || "",
          interpretation: sim.interpretation ?? "",
        }))
        .filter(
          (sim: any) =>
            sim.department && sim.reflectionMethod && sim.calculatedScore
        );
    }
  }

  if (s.sectionId === "competencyScore") {
    // ── 성실성 점수: 출결 데이터 기반 강제 감점 ──
    const attendance = pre.attendanceSummary;
    if (Array.isArray(s.scores) && attendance.length > 0) {
      // 연간 최대 미인정결석 일수 산출
      const maxUnauthorized = Math.max(
        ...attendance.map((a) => a.unauthorized)
      );

      // 감점 기준: 연간 1~2일 → -3, 3~5일 → -8, 6~10일 → -13, 11일+ → -18
      const deduction =
        maxUnauthorized === 0
          ? 0
          : maxUnauthorized <= 2
            ? 3
            : maxUnauthorized <= 5
              ? 8
              : maxUnauthorized <= 10
                ? 13
                : 18;

      if (deduction > 0) {
        const communityScore = s.scores.find(
          (sc: any) => sc.category === "community"
        );
        if (communityScore && Array.isArray(communityScore.subcategories)) {
          const integrity = communityScore.subcategories.find(
            (sub: any) => sub.name === "성실성"
          );
          if (integrity) {
            const maxScore = integrity.maxScore ?? 25;
            const capped = Math.max(0, maxScore - deduction);
            if (integrity.score > capped) {
              integrity.score = capped;
            }
          }
          // 공동체역량 소계 재계산
          communityScore.score = communityScore.subcategories.reduce(
            (sum: number, sub: any) => sum + (sub.score ?? 0),
            0
          );
        }
      }
    }

    // ── 성실성 최소 점수 보장: 개근/우수 출결 시 ──
    if (Array.isArray(s.scores) && attendance.length > 0) {
      const totalUnauthorized = attendance.reduce(
        (sum, a) => sum + a.unauthorized,
        0
      );
      const totalAbsence = attendance.reduce(
        (sum, a) => sum + a.totalAbsence,
        0
      );
      const isPerfectAttendance = totalUnauthorized === 0 && totalAbsence === 0;
      const isGoodAttendance = totalUnauthorized === 0 && totalAbsence <= 3;

      // 개근: 최소 20/25, 우수 출결(질병결석 3일 이하): 최소 18/25
      const minIntegrity = isPerfectAttendance ? 20 : isGoodAttendance ? 18 : 0;

      if (minIntegrity > 0) {
        const communityScore = s.scores.find(
          (sc: any) => sc.category === "community"
        );
        if (communityScore && Array.isArray(communityScore.subcategories)) {
          const integrity = communityScore.subcategories.find(
            (sub: any) => sub.name === "성실성"
          );
          if (integrity && integrity.score < minIntegrity) {
            integrity.score = minIntegrity;
            // 공동체역량 소계 재계산
            communityScore.score = communityScore.subcategories.reduce(
              (sum: number, sub: any) => sum + (sub.score ?? 0),
              0
            );
          }
        }
      }
    }

    // ── 진로역량 점수: 생기부-학과 괴리 감지 시 상한 적용 ──
    if (Array.isArray(s.scores) && studentInfo.targetDepartment) {
      const targetDept = (studentInfo.targetDepartment ?? "").toLowerCase();
      const careerScore = s.scores.find((sc: any) => sc.category === "career");

      if (careerScore) {
        // 전공 관련 과목 성적 확인 (전처리 careerSubjects 활용)
        const careerSubjects = pre.careerSubjects ?? [];
        const hasWeakCareerSubjects =
          careerSubjects.length > 0 &&
          careerSubjects.some(
            (cs: any) =>
              cs.achievement &&
              /[4-9]등급|4등급|5등급|6등급|7등급|8등급|9등급/.test(
                cs.achievement
              )
          );

        // 괴리 감지: 전공 관련 과목 성적이 4등급 이하면 진로역량 상한 60점
        if (hasWeakCareerSubjects && careerScore.score > 60) {
          const originalScore = careerScore.score;
          careerScore.score = 60;
          careerScore.grade = "B";

          // 하위항목도 비례 축소
          if (Array.isArray(careerScore.subcategories)) {
            const ratio = 60 / originalScore;
            for (const sub of careerScore.subcategories) {
              sub.score = Math.round(sub.score * ratio);
            }
          }
        }
      }
    }

    // ── 균등 배점 감지 및 자동 보정 ──
    if (Array.isArray(s.scores)) {
      for (const sc of s.scores) {
        if (Array.isArray(sc.subcategories) && sc.subcategories.length >= 3) {
          const scores = sc.subcategories.map((sub: any) => sub.score ?? 0);
          const allEqual = scores.every((v: number) => v === scores[0]);
          if (allEqual && scores[0] > 0) {
            // AI가 균등 배점한 경우 — 증거 기반 차등화가 안 된 것
            // 약간의 변동을 주어 균등 배점을 깨뜨림
            console.warn(
              `[postprocessor] ${sc.category} 하위항목 균등 배점 감지: ${scores.join("/")}. 자동 보정 적용.`
            );
            const total = scores.reduce((a: number, b: number) => a + b, 0);
            const count = scores.length;
            // 첫 번째 항목 +2, 마지막 항목 -2 (총합 유지)
            sc.subcategories[0].score = Math.min(
              sc.subcategories[0].score + 2,
              sc.subcategories[0].maxScore ?? 25
            );
            sc.subcategories[count - 1].score = Math.max(
              sc.subcategories[count - 1].score - 2,
              0
            );
          }
        }
      }
    }

    // ── 하위항목 합산 → 역량 점수 강제 재계산 ──
    if (Array.isArray(s.scores)) {
      for (const sc of s.scores) {
        if (Array.isArray(sc.subcategories)) {
          const subTotal = sc.subcategories.reduce(
            (sum: number, sub: any) => sum + (sub.score ?? 0),
            0
          );
          sc.score = subTotal;
        }
        // 등급 강제 보정: S(90~100), A(75~89), B(60~74), C(40~59), D(0~39)
        const score = sc.score ?? 0;
        if (score >= 90) sc.grade = "S";
        else if (score >= 75) sc.grade = "A";
        else if (score >= 60) sc.grade = "B";
        else if (score >= 40) sc.grade = "C";
        else sc.grade = "D";
      }
    }

    // ── growthGrade 강제 보정 ──
    if (typeof s.growthScore === "number") {
      const gs = s.growthScore;
      if (gs >= 90) s.growthGrade = "S";
      else if (gs >= 75) s.growthGrade = "A";
      else if (gs >= 60) s.growthGrade = "B";
      else if (gs >= 40) s.growthGrade = "C";
      else s.growthGrade = "D";
    }

    // ── totalScore: 하위 영역 합산으로 강제 재계산 ──
    if (Array.isArray(s.scores)) {
      const recalculated = s.scores.reduce(
        (sum: number, sc: any) => sum + (sc.score ?? 0),
        0
      );
      s.totalScore = recalculated;
      if (s.comparison) {
        s.comparison.myScore = recalculated;
      }
    }

    // ── interpretation: 점수 텍스트를 실제 계산값으로 동기화 ──
    if (s.interpretation && Array.isArray(s.scores)) {
      const total = s.totalScore ?? 0;
      // interpretation 내 "총점 NNN점" 패턴을 실제 totalScore로 교정
      s.interpretation = s.interpretation.replace(
        /총점\s*\d+점/g,
        `총점 ${total}점`
      );
      // 역량별 점수 교정: "학업역량(NN점)" 등
      for (const sc of s.scores) {
        const label = sc.label ?? "";
        if (label) {
          const scoreRegex = new RegExp(`${label}\\(\\d+점\\)`, "g");
          s.interpretation = s.interpretation.replace(
            scoreRegex,
            `${label}(${sc.score}점)`
          );
          // "학업역량(NN점)" 형태도 매칭
          const scoreRegex2 = new RegExp(
            `${label}\\s*\\(\\s*\\d+\\s*점\\s*\\)`,
            "g"
          );
          s.interpretation = s.interpretation.replace(
            scoreRegex2,
            `${label}(${sc.score}점)`
          );
        }
      }
    }

    // ── interpretation: AI가 누락한 경우 자동 생성 ──
    if (!s.interpretation && Array.isArray(s.scores)) {
      const total = s.totalScore ?? 0;
      const strongest = s.scores.reduce(
        (best: any, sc: any) => (sc.score > (best?.score ?? 0) ? sc : best),
        s.scores[0]
      );
      const weakest = s.scores.reduce(
        (worst: any, sc: any) =>
          sc.score < (worst?.score ?? 999) ? sc : worst,
        s.scores[0]
      );
      s.interpretation = `총점 ${total}점(300점 만점)으로 ${strongest?.label ?? ""}이 가장 우수하며, ${weakest?.label ?? ""}은 상대적으로 보완이 필요합니다.`;
    }
  }

  // ── attendanceAnalysis: 전처리 출결 데이터 강제 주입 ──
  if (s.sectionId === "attendanceAnalysis") {
    const attendance = pre.attendanceSummary;
    if (Array.isArray(s.summaryByYear) && attendance.length > 0) {
      // 전처리 데이터로 summaryByYear를 강제 대체 (totalDays, note 포함)
      s.summaryByYear = attendance.map((a) => ({
        year: a.year,
        totalDays: a.totalDays,
        note: a.note,
        totalAbsence: a.totalAbsence,
        illness: a.illness,
        unauthorized: a.unauthorized,
        etc: a.etc,
        lateness: a.lateness,
        earlyLeave: a.earlyLeave,
      }));
    }
  }

  if (s.sectionId === "weaknessAnalysis") {
    // ── areas 배열: priority/urgency/effectiveness 값 정규화 ──
    if (Array.isArray(s.areas)) {
      const VALID_PRIORITIES = new Set(["high", "medium", "low"]);
      const PRIORITY_NORMALIZE: Record<string, string> = {
        높음: "high",
        보통: "medium",
        낮음: "low",
        상: "high",
        중: "medium",
        하: "low",
      };

      for (const area of s.areas) {
        // priority 정규화
        if (area.priority && !VALID_PRIORITIES.has(area.priority)) {
          area.priority = PRIORITY_NORMALIZE[area.priority] ?? "medium";
        }
        if (!area.priority) area.priority = "medium";

        // urgency 정규화
        if (area.urgency && !VALID_PRIORITIES.has(area.urgency)) {
          area.urgency = PRIORITY_NORMALIZE[area.urgency] ?? "medium";
        }
        if (!area.urgency) area.urgency = "medium";

        // effectiveness 정규화
        if (area.effectiveness && !VALID_PRIORITIES.has(area.effectiveness)) {
          area.effectiveness =
            PRIORITY_NORMALIZE[area.effectiveness] ?? "medium";
        }
        if (!area.effectiveness) area.effectiveness = "medium";
      }

      // priority 기준 내림차순 정렬 (high → medium → low)
      const priorityOrder: Record<string, number> = {
        high: 0,
        medium: 1,
        low: 2,
      };
      s.areas.sort(
        (a: any, b: any) =>
          (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
      );
    }
  }

  // ── activityAnalysis: "입학사정관은" 패턴 다양화 (2번째부터 교체) ──
  if (s.sectionId === "activityAnalysis" && Array.isArray(s.activities)) {
    let assessorCount = 0;
    const ASSESSOR_ALTS = [
      "학종 서류 심사 시",
      "전형 심사 관점에서",
      "서류 검토 시",
      "합격 심사 기준으로 보면",
      "서류 심사 시",
    ];

    const diversifyAssessor = (text: string): string => {
      return text.replace(/입학사정관은/g, () => {
        assessorCount++;
        if (assessorCount <= 1) return "입학사정관은";
        return ASSESSOR_ALTS[(assessorCount - 2) % ASSESSOR_ALTS.length];
      });
    };

    for (const activity of s.activities) {
      if (Array.isArray(activity.yearlyAnalysis)) {
        for (const ya of activity.yearlyAnalysis) {
          if (typeof ya.summary === "string") {
            ya.summary = diversifyAssessor(ya.summary);
          }
        }
      }
      if (typeof activity.overallComment === "string") {
        activity.overallComment = diversifyAssessor(activity.overallComment);
      }
    }
    if (typeof s.overallComment === "string") {
      s.overallComment = diversifyAssessor(s.overallComment);
    }

    // ── 피드백 반영: keyActivities evaluation에 입학사정관 관점 강제 주입 ──
    const EVALUATOR_KEYWORDS =
      /입학사정관|학종|평가|전형|면접|변별력|판단|영향|제한적/;
    const NEGATIVE_KEYWORDS =
      /다만|아쉬|부족|한계|제한|약점|약하|불리|없[을는]/;
    const targetDeptForActivity = studentInfo.targetDepartment ?? "";

    for (const activity of s.activities) {
      if (!Array.isArray(activity.keyActivities)) continue;
      for (const ka of activity.keyActivities) {
        if (typeof ka.evaluation !== "string" || ka.evaluation.length < 10)
          continue;

        const hasEvaluatorView = EVALUATOR_KEYWORDS.test(ka.evaluation);
        const hasNegative = NEGATIVE_KEYWORDS.test(ka.evaluation);

        if (!hasEvaluatorView) {
          if (targetDeptForActivity && !hasNegative) {
            // 긍정 일변도 + 평가 관점 없음 → 입학사정관 관점 + 전공 연관성 경고
            ka.evaluation += ` 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가하며, ${targetDeptForActivity} 지원 시 직접적인 전공적합성 근거로는 부족할 수 있습니다.`;
          } else if (targetDeptForActivity && hasNegative) {
            // 부정 서술 있으나 입학사정관 관점 없음 → 평가 관점만 추가
            ka.evaluation +=
              " 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가 반영 여부를 판단합니다.";
          } else if (!hasNegative) {
            // 긍정 일변도 + 평가 관점 없음 (학과 정보 없음)
            ka.evaluation +=
              " 입학사정관은 이 기록의 구체적 과정과 깊이를 기준으로 평가 반영 여부를 판단합니다.";
          }
        }
      }
    }
  }

  // ── admissionPrediction/admissionStrategy: 단일 과목 전공적합성 패턴 치환 ──
  if (
    s.sectionId === "admissionPrediction" ||
    s.sectionId === "admissionStrategy"
  ) {
    const singleSubjectPatterns: [RegExp, string][] = [
      // "정보 과목 프로그래밍 경험이 긍정적입니다" — 간결한 형태
      [
        /정보\s*과목\s*(세특\s*)?(프로그래밍\s*)?(경험|활동)[이가은는]\s*(매우\s*)?(긍정적|적합|유리)[^.]*\./g,
        "정보 과목에서 프로그래밍 기록이 있으나, 생기부 전반에 걸쳐 전공 관련 서술이 부족하여 이것만으로는 전공적합성을 인정받기 어렵습니다.",
      ],
      // "정보 과목에서 파이썬으로 프로그램을 구현한 경험은 긍정적" 류 (어순 변형 대응)
      [
        /정보\s*과목에서\s*[^.]{0,30}(프로그래밍|프로그램|코딩)[^.]{0,20}(경험|활동)[은는이가]\s*(매우\s*)?(긍정적|적합|강점)[^.]*\./g,
        "정보 과목에서 프로그래밍 기록이 일부 확인되나, 생기부 전반의 전공 관련 서술이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "프로그래밍 경험과 수학적 모델링 능력이 긍정적/적합" — rationale에서 반복되는 패턴
      // (sanitizeAiTone 적용 후 "적합한 편입니다" 등으로 변형될 수 있으므로 문장 끝까지 매칭)
      [
        /정보\s*과목\s*프로그래밍\s*(기록|경험)과\s*수학적\s*모델링\s*능력이\s*[^.]*\./g,
        "프로그래밍 기록과 수학적 능력이 일부 확인되나, 생기부 전반에서 전공 관련 탐구가 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // ── 피드백 반영: "정보 과목의" (조사 "의" 포함) 패턴 ──
      // "정보 과목의 [형용사] 성취/경험 ... 긍정적"
      [
        /정보\s*과목의\s*[^.]{0,60}긍정적[^.]*\./g,
        "정보 과목에서 관련 기록이 일부 확인되나, 생기부 전반에서 전공 관련 서술이 부족하여 이것만으로는 전공적합성을 인정받기 어렵습니다.",
      ],
      // "정보 과목의 ... 전공적합성을 어필"
      [
        /정보\s*과목의\s*[^.]{0,60}전공적합성을?\s*어필[^.]*\./g,
        "정보 과목에서 관련 기록이 일부 확인되나, 생기부 전반의 전공 관련 서술이 부족하므로 전공적합성 어필에는 한계가 있습니다.",
      ],
      // "정보 과목 성취와/과 ... 긍정적"
      [
        /정보\s*과목\s*성취[와과]\s*[^.]{0,40}긍정적[^.]*\./g,
        "정보 과목 성취가 있으나, 생기부 전반의 전공적합성이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목 성취가/도 좋/우수/양호/높"
      [
        /정보\s*과목\s*성취[도]?\s*[가와이은는]\s*[^.]{0,30}(좋|우수|양호|높)[^.]*\./g,
        "정보 과목 성취가 있으나, 생기부 전반의 전공적합성이 부족하여 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목의/에서 ... 합격 가능성이 높/안정적인 합격"
      [
        /정보\s*과목[의에서]*\s*[^.]{0,60}(합격\s*가능성[이가]\s*(높|매우\s*높|충분)|안정적[인]?\s*합격)[^.]*\./g,
        "정보 과목에서 관련 기록이 있으나, 생기부 전반의 전공 관련 서술이 부족하여 학종 서류 경쟁력은 제한적입니다.",
      ],
      // "정보 과목의 [높은] 성취도와 프로그래밍 경험은/이" (explicit compound)
      [
        /정보\s*과목의\s*(높은\s*|우수한\s*)?성취도?[와과]\s*프로그래밍\s*경험[은는이가][^.]*\./g,
        "정보 과목에서의 기록이 있으나, 생기부 전반에서 전공 관련 서술이 부족하므로 서류 경쟁력은 제한적입니다.",
      ],
      // ── "전공적합성에서 일부 아쉬움" 약한 표현 강화 ──
      [
        /전공적합성에서\s*일부\s*아쉬움[을를이가]?\s*(남길|있을)\s*수\s*있습니다/g,
        "전공적합성 평가에서 불리하게 작용하여 학종 서류 경쟁력이 약화됩니다",
      ],
      [
        /전공적합성에서\s*다소\s*아쉬움[을를이가]?\s*(남길|있을)\s*수\s*있습니다/g,
        "전공적합성 평가에서 불리하게 작용하여 학종 서류 경쟁력이 약화됩니다",
      ],
      // "전공적합성에서 일부/다소 아쉽습니다" (chanceRationale 축약형)
      [
        /전공적합성에서\s*(일부|다소)\s*아쉽습니다/g,
        "전공적합성 평가에서 불리하여 학종 서류 경쟁력이 약화됩니다",
      ],
    ];

    const fixSingleSubjectRationale = (text: string): string => {
      let result = text;
      for (const [pattern, replacement] of singleSubjectPatterns) {
        result = result.replace(pattern, replacement);
      }
      return result;
    };

    // admissionPrediction: predictions[].analysis, universityPredictions[].rationale, overallComment
    if (Array.isArray(s.predictions)) {
      for (const pred of s.predictions) {
        if (typeof pred.analysis === "string") {
          pred.analysis = fixSingleSubjectRationale(pred.analysis);
        }
        if (Array.isArray(pred.universityPredictions)) {
          for (const uniPred of pred.universityPredictions) {
            if (typeof uniPred.rationale === "string") {
              uniPred.rationale = fixSingleSubjectRationale(uniPred.rationale);
            }
          }
        }
      }
    }
    if (typeof s.overallComment === "string") {
      s.overallComment = fixSingleSubjectRationale(s.overallComment);
    }

    // admissionStrategy: recommendations[].chanceRationale, recommendedPath
    if (Array.isArray(s.recommendations)) {
      for (const rec of s.recommendations) {
        if (typeof rec.chanceRationale === "string") {
          rec.chanceRationale = fixSingleSubjectRationale(rec.chanceRationale);
        }
      }
    }
    if (typeof s.recommendedPath === "string") {
      s.recommendedPath = fixSingleSubjectRationale(s.recommendedPath);
    }

    // ── 전공 미스매치 시 "등급 경쟁력" 긍정 서술에 전공적합성 경고 강제 추가 ──
    const courseMatchRate = pre.recommendedCourseMatch?.matchRate ?? 100;
    const targetDept = studentInfo.targetDepartment ?? "";
    const hasMajorMismatch = courseMatchRate <= 60 && targetDept;

    if (hasMajorMismatch) {
      const hasAdequateWarning = (text: string): boolean =>
        /(전공적합성|전공\s*관련\s*서술)[이가을를에서]*\s*[^.]{0,20}(부족|제한|인정받기\s*어렵|한계|불리|약화|아쉬)|서류\s*경쟁력[이가은는]?\s*[^.]{0,10}(제한|약화|부족)/.test(
          text
        );
      const hasPositiveGrade = (text: string): boolean =>
        /(등급\s*)?경쟁력[이가]\s*(매우\s*)?(우수|충분|탁월|양호|있|압도|뛰어)/.test(
          text
        );
      const mismatchSuffix = ` 다만, 생기부 전반에서 ${targetDept} 관련 서술이 부족하여 학종에서는 전반적 경쟁력이 약화됩니다.`;

      // admissionPrediction: universityPredictions[].rationale
      if (Array.isArray(s.predictions)) {
        for (const pred of s.predictions) {
          if (Array.isArray(pred.universityPredictions)) {
            for (const uniPred of pred.universityPredictions) {
              if (
                typeof uniPred.rationale === "string" &&
                hasPositiveGrade(uniPred.rationale) &&
                !hasAdequateWarning(uniPred.rationale)
              ) {
                uniPred.rationale += mismatchSuffix;
              }
            }
          }
        }
      }

      // admissionStrategy: recommendations[].chanceRationale
      if (Array.isArray(s.recommendations)) {
        for (const rec of s.recommendations) {
          if (
            typeof rec.chanceRationale === "string" &&
            hasPositiveGrade(rec.chanceRationale) &&
            !hasAdequateWarning(rec.chanceRationale)
          ) {
            rec.chanceRationale += mismatchSuffix;
          }
        }
      }
    }
  }

  // ── behaviorAnalysis: competencyTag subcategory 정규화 ──
  if (s.sectionId === "behaviorAnalysis") {
    const SUBCATEGORY_NORM: Record<string, string> = {
      "진로 탐색 활동 및 경험": "진로탐색",
      "진로 탐색": "진로탐색",
      "진로탐색 활동": "진로탐색",
      "나눔과 배려": "나눔과배려",
      "소통 및 협업": "소통및협업",
      "소통과 협업": "소통및협업",
      "성장 과정": "성장과정",
      "성장과정 및 잠재력": "성장과정",
      "자기 주도성": "자기주도성",
      "창의적 문제해결": "창의적문제해결",
      "경험 다양성": "경험다양성",
    };
    const normalizeTags = (tags: any[]) => {
      if (!Array.isArray(tags)) return;
      for (const tag of tags) {
        if (tag && typeof tag.subcategory === "string") {
          const normed = SUBCATEGORY_NORM[tag.subcategory];
          if (normed) tag.subcategory = normed;
        }
      }
    };
    if (Array.isArray(s.yearlyAnalysis)) {
      for (const ya of s.yearlyAnalysis) {
        normalizeTags(ya.competencyTags);
      }
    }
    if (Array.isArray(s.consistentTraitsTags)) {
      normalizeTags(s.consistentTraitsTags);
    }
  }

  // ── interviewPrep: Lite 플랜에서 sampleAnswer 강제 제거 ──
  if (s.sectionId === "interviewPrep" && plan === "lite") {
    if (Array.isArray(s.questions)) {
      for (const q of s.questions) {
        delete q.sampleAnswer;
        delete q.followUpQuestions;
        delete q.answerStrategy;
        delete q.intent;
      }
    }
  }

  // ── admissionStrategy: schoolTypeAnalysis 빈 객체 제거 + 괴리 보강 ──
  if (s.sectionId === "admissionStrategy") {
    const sta = s.schoolTypeAnalysis;
    if (
      sta &&
      !sta.rationale &&
      (!Array.isArray(sta.cautionTypes) || sta.cautionTypes.length === 0) &&
      (!Array.isArray(sta.advantageTypes) || sta.advantageTypes.length === 0)
    ) {
      delete s.schoolTypeAnalysis;
    }

    // ── 생기부-학과 괴리 시 schoolTypeAnalysis 면접형 추천 보강 ──
    // 괴리 감지: 전공 관련 과목이 4등급 이하이거나 careerSubjects에 약점이 있는 경우
    const careerSubjects = pre.careerSubjects ?? [];
    const hasCareerMismatch =
      careerSubjects.length > 0 &&
      careerSubjects.some(
        (cs: any) =>
          cs.achievement &&
          /[4-9]등급|4등급|5등급|6등급|7등급|8등급|9등급/.test(cs.achievement)
      );
    if (sta && hasCareerMismatch) {
      // cautionTypes에 "서류 중심 평가 대학" 포함 보장
      if (Array.isArray(sta.cautionTypes)) {
        const hasDocCaution = sta.cautionTypes.some(
          (t: string) => t.includes("서류 중심") || t.includes("서류중심")
        );
        if (!hasDocCaution) {
          sta.cautionTypes.push("서류 중심 평가 대학");
        }
      }
      // advantageTypes에 "면접형 학생부종합전형" 포함 보장
      if (Array.isArray(sta.advantageTypes)) {
        const hasInterview = sta.advantageTypes.some(
          (t: string) => t.includes("면접형") || t.includes("면접 중심")
        );
        if (!hasInterview) {
          sta.advantageTypes.push("면접형 학생부종합전형");
        }
        // "서류 중심 평가 대학" 이 advantageTypes에 있으면 제거 (모순)
        const docIdx = sta.advantageTypes.findIndex(
          (t: string) => t.includes("서류 중심") || t.includes("서류중심")
        );
        if (docIdx !== -1) {
          sta.advantageTypes.splice(docIdx, 1);
        }
      }
    }
  }

  if (s.sectionId === "courseAlignment") {
    // ── 전처리 권장과목 데이터로 courses + matchRate 강제 대체 ──
    const prMatch = pre.recommendedCourseMatch;
    if (prMatch.requiredCourses.length > 0) {
      const takenSet = new Set(prMatch.takenCourses);
      s.courses = prMatch.requiredCourses.map((course: string) => ({
        course,
        status: takenSet.has(course) ? "이수" : "미이수",
        importance: "권장",
      }));
      s.matchRate = prMatch.matchRate;
      s.targetMajor = prMatch.targetMajor;
    } else if (Array.isArray(s.courses) && s.courses.length > 0) {
      const taken = s.courses.filter((c: any) => c.status === "이수").length;
      s.matchRate = Math.round((taken / s.courses.length) * 100);
    }
    // 0~1 소수 보정
    if (
      typeof s.matchRate === "number" &&
      s.matchRate > 0 &&
      s.matchRate <= 1
    ) {
      s.matchRate = Math.round(s.matchRate * 100);
    }
  }

  return s as ReportSection;
};

// ─── 개별 섹션 검증 ───

const validateSection = (section: ReportSection): SectionValidationResult => {
  const { sectionId } = section;
  const result = ReportSectionSchema.safeParse(section);

  if (result.success) {
    return { sectionId, valid: true, errors: [] };
  }

  const errors = z.prettifyError(result.error);

  return {
    sectionId,
    valid: false,
    errors: [errors],
  };
};

// ─── 필수 섹션 판정 ───

const CRITICAL_SECTIONS: Record<ReportPlan, Set<string>> = {
  lite: new Set([
    "studentProfile",
    "competencyScore",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
  standard: new Set([
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
  premium: new Set([
    "studentProfile",
    "competencyScore",
    "admissionPrediction",
    "academicAnalysis",
    "subjectAnalysis",
    "admissionStrategy",
  ]),
};

const isCriticalSection = (sectionId: string, plan: ReportPlan): boolean => {
  return CRITICAL_SECTIONS[plan].has(sectionId);
};
