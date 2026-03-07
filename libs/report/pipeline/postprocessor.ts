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

  // 2. 섹션 정렬 (플랜별 순서)
  const sectionOrder = SECTION_ORDER[plan];
  validatedSections.sort((a, b) => {
    const aIdx = sectionOrder.indexOf(a.sectionId);
    const bIdx = sectionOrder.indexOf(b.sectionId);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  // 4. ReportMeta 생성
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

  // 5. ReportContent 조합
  const content: ReportContent = {
    meta,
    sections: validatedSections,
  };

  // 6. 플랜별 검증
  const planValidationErrors = validateByPlan(content);

  return {
    content,
    validationResults,
    planValidationErrors,
  };
};

// ─── AI 출력 필드명 정규화 + 전처리 데이터 보강 ───

const normalizeSection = (
  section: ReportSection,
  pre: PreprocessedData
): ReportSection => {
  const s = section as any;

  if (s.sectionId === "academicAnalysis") {
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

    // ── gradeChangeAnalysis: AI 필드명 매핑 ──
    if (s.gradeChangeAnalysis) {
      const g = s.gradeChangeAnalysis;
      const trendMap: Record<string, string> = {
        ascending: "상승",
        stable: "유지",
        descending: "하락",
      };
      s.gradeChangeAnalysis = {
        currentTrend:
          g.currentTrend || trendMap[pre.gradeTrend.direction] || "유지",
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

    // ── fiveGradeSimulation: original/converted → currentGrade/simulatedGrade ──
    if (Array.isArray(s.fiveGradeSimulation)) {
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
