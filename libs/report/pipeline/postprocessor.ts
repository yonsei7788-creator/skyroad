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
    section = normalizeSection(section, preprocessed);
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

const AI_TONE_REPLACEMENTS: [RegExp, string][] = [
  [/이\s?돋보입니다/g, "이 강점입니다"],
  [/가\s?돋보입니다/g, "이 강점입니다"],
  [/돋보입니다/g, "두드러집니다"],
  [/돋보인다/g, "두드러진다"],
  [/돋보이는/g, "눈에 띄는"],
  [/매우 인상적입니다/g, "주요 평가 포인트입니다"],
  [/인상적입니다/g, "주요 평가 포인트입니다"],
  [/인상적이다/g, "주요 평가 포인트다"],
  [/협동심을 길렀/g, "협동심을 보여주었"],
  [/배려심을 길렀/g, "배려심을 보여주었"],
  [/을 길렀습니다/g, "을 보여주었습니다"],
  [/를 길렀습니다/g, "를 보여주었습니다"],
  [/을 발전시켰습니다/g, "이 향상되었습니다"],
  [/를 발전시켰습니다/g, "가 향상되었습니다"],
  [/을 발전시켰다/g, "이 향상되었다"],
  [/를 발전시켰다/g, "가 향상되었다"],
  [/충분히 합격할 겁니다/g, "합격 가능성이 있습니다"],
  [/충분히 합격/g, "합격 가능성이 높다고 판단"],
  [/긍정적으로 기여합니다/g, "긍정 요소로 작용할 수 있습니다"],
  [/긍정적으로 기여할/g, "긍정 요소로 작용할"],
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
  pre: PreprocessedData
): ReportSection => {
  let s = section as any;

  // ── AI 금지 표현 치환 (모든 섹션 공통) ──
  s = sanitizeDeep(s) as any;

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
    s.gradeDeviationAnalysis = {
      highestSubject: gv.highest,
      lowestSubject: gv.lowest,
      deviationRange: gv.spread,
      riskAssessment:
        aiDev.riskAssessment || aiDev.analysis || aiDev.recommendation || "",
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
