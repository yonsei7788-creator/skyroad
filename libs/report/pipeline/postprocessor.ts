/**
 * Phase 4: 후처리
 *
 * Zod 스키마 검증, wordCloud 섹션 주입, ReportContent 조합.
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
      const growthMap: Record<string, number> = {
        S: 95,
        A: 80,
        B: 65,
        C: 50,
        D: 35,
      };
      profile.radarChart.growth =
        growthMap[compScore.growthGrade] ?? profile.radarChart.growth;
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

  // ── 기타 AI식 표현 ──
  [/발전시켰/g, "보여주었"],
  [/충분히 합격할 겁니다/g, "합격 가능성이 높습니다"],
  [/충분히 합격/g, "합격 가능성이 높은"],
  [/다른 요소로 충분히 커버 가능합니다/g, "다른 요소로 보완 가능합니다"],
  [/충분히 커버 가능합니다/g, "보완 가능합니다"],
  [/충분히 커버/g, "보완"],
  [/충분히 경쟁력/g, "경쟁력"],
  [/충분히 가능/g, "가능"],

  // ── 무의미한 추상 평가 표현 → 제거/대체 ──
  [/비판적 사고력을?\s*입증/g, "탐구 과정에서 다각적 분석을 시도"],
  [
    /비판적 사고력을?\s*(보여주었|드러냈|발휘했|보여줍니다|드러냅니다|발휘합니다)/g,
    "다각적 분석을 시도했",
  ],
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

  // ── "~할 수 있습니다" → "~할 겁니다" (평가 맥락) ──
  [/평가할 수 있습니다/g, "평가할 겁니다"],
  [/평가될 수 있습니다/g, "평가될 겁니다"],
  [/작용할 수 있습니다/g, "작용할 겁니다"],
];

const sanitizeAiTone = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of AI_TONE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

/** 객체의 모든 문자열 필드를 재귀적으로 AI 톤 치환 */
const sanitizeDeep = (obj: unknown): unknown => {
  if (typeof obj === "string") return sanitizeAiTone(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeDeep(value);
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

    // ── 과목 중요도 강제 보정 (전공 계열 기반) ──
    const targetDept = (studentInfo.targetDepartment ?? "").toLowerCase();
    const isScienceTrack =
      /공학|컴퓨터|전자|기계|물리|화학|생명|의학|의예|약학|간호|수학|통계|IT|소프트웨어|AI|로봇|건축|환경|에너지|재료|항공|반도체/.test(
        targetDept
      );
    const isHumanitiesTrack =
      /인문|사회|경영|경제|법|정치|행정|국어|영어|교육|심리|철학|역사|문학|미디어|언론|광고|외교|국제/.test(
        targetDept
      );

    // CS 관련 학과 여부 (정보 과목 예외 처리용)
    const isCSTrack =
      /컴퓨터|소프트웨어|정보|IT|AI|인공지능|데이터|사이버|보안|게임/.test(
        targetDept
      );

    // 비핵심 과목 패턴 (학종 평가에서 거의 무의미한 과목)
    // ⚠️ CS 관련 학과 지망 시 "정보"는 핵심 과목이므로 제외
    const NON_CORE_SUBJECTS = [
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
      "진로와\\s*직업",
      "체육",
      "음악",
      "미술",
      "독서",
      "보건",
      "환경",
      "논리학",
      "실용\\s*국어",
      "실용\\s*영어",
      "심화\\s*국어",
      "심화\\s*영어",
      "직업",
      "로봇",
    ];
    // CS 관련 학과가 아닐 때만 "정보"를 비핵심에 포함
    if (!isCSTrack) {
      NON_CORE_SUBJECTS.unshift("정보");
    }
    const NON_CORE_PATTERN = new RegExp(`^(${NON_CORE_SUBJECTS.join("|")})`);
    const SOCIAL_PATTERN =
      /^(사회[·]?문화|정치와\s*법|경제|세계지리|한국지리|세계사|동아시아사|윤리와\s*사상|생활과\s*윤리|통합사회)/;
    const SCIENCE_PATTERN =
      /^(물리학|화학|생명과학|지구과학|과학탐구실험|통합과학)/;
    const MATH_PATTERN = /^(수학|미적분|확률과\s*통계|기하)/;
    const CORE_LANG_PATTERN =
      /^(국어|영어|문학|언어와\s*매체|화법과\s*작문|영어[ⅠⅡ12])/;

    for (const subj of s.subjects) {
      const name = (subj.subjectName ?? "").replace(/^\d학년\s*/, "");

      if (NON_CORE_PATTERN.test(name)) {
        // 비핵심 과목: 중요도 2% (거의 0에 가깝게)
        subj.importancePercent = 2;
        subj.evaluationImpact = "very_low";
      } else if (isCSTrack && /^정보/.test(name)) {
        // CS 관련 학과 지망: 정보 과목은 전공 핵심
        subj.importancePercent = Math.max(subj.importancePercent ?? 0, 30);
        subj.evaluationImpact = "very_high";
      } else if (isScienceTrack) {
        // 이공계 전공 특화: 수학/물리/기하 최우선
        if (MATH_PATTERN.test(name) || /물리학|기하/.test(name)) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 35);
          subj.evaluationImpact = "very_high";
        } else if (
          SCIENCE_PATTERN.test(name) &&
          !/과학탐구실험|통합과학/.test(name)
        ) {
          // 화학, 생명과학, 지구과학
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 20);
          subj.evaluationImpact = "high";
        } else if (/과학탐구실험/.test(name)) {
          subj.importancePercent = Math.min(subj.importancePercent ?? 10, 8);
          subj.evaluationImpact = "low";
        } else if (/통합과학/.test(name)) {
          subj.importancePercent = Math.min(subj.importancePercent ?? 12, 12);
          subj.evaluationImpact = "medium";
        } else if (CORE_LANG_PATTERN.test(name)) {
          // 국영: 중간 수준
          subj.importancePercent = Math.min(
            Math.max(subj.importancePercent ?? 10, 10),
            15
          );
          subj.evaluationImpact = "medium";
        } else if (SOCIAL_PATTERN.test(name)) {
          // 이공계한테 사회탐구는 비중요
          subj.importancePercent = Math.min(subj.importancePercent ?? 5, 5);
          subj.evaluationImpact = "low";
        }
      } else if (isHumanitiesTrack) {
        // 인문사회 전공 특화: 사회탐구 최우선
        if (SOCIAL_PATTERN.test(name) && !/통합사회|생활과\s*윤리/.test(name)) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 30);
          subj.evaluationImpact = "very_high";
        } else if (/통합사회/.test(name)) {
          subj.importancePercent = Math.min(subj.importancePercent ?? 12, 12);
          subj.evaluationImpact = "medium";
        } else if (CORE_LANG_PATTERN.test(name)) {
          // 국영: 중간~높음
          subj.importancePercent = Math.min(
            Math.max(subj.importancePercent ?? 12, 12),
            18
          );
          subj.evaluationImpact = "medium";
        } else if (MATH_PATTERN.test(name)) {
          // 문과한테 수학: 중간
          subj.importancePercent = Math.min(
            Math.max(subj.importancePercent ?? 10, 10),
            15
          );
          subj.evaluationImpact = "medium";
        } else if (SCIENCE_PATTERN.test(name)) {
          // 인문계한테 과학탐구는 비중요
          subj.importancePercent = Math.min(subj.importancePercent ?? 5, 5);
          subj.evaluationImpact = "low";
        }
      } else {
        // 전공 미지정: 국영수 중간, 나머지 기본
        if (CORE_LANG_PATTERN.test(name) || MATH_PATTERN.test(name)) {
          subj.importancePercent = Math.max(subj.importancePercent ?? 0, 15);
          subj.evaluationImpact = "medium";
        }
      }
    }

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

    // ── fiveGradeSimulation: 전처리 데이터 기반 강제 주입 (과목별 최종 등급 기준) ──
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

  if (s.sectionId === "weaknessAnalysis") {
    // ── areas 배열: priority 기준 내림차순 정렬 (high → medium → low) ──
    if (Array.isArray(s.areas)) {
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

  // ── admissionStrategy: schoolTypeAnalysis 빈 객체 제거 ──
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
  }

  if (s.sectionId === "courseAlignment") {
    // matchRate: 전처리 데이터에서 직접 주입
    const prMatch = pre.recommendedCourseMatch;
    if (prMatch.matchRate > 0) {
      s.matchRate = prMatch.matchRate;
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
