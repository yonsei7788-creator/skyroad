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
  _data: PreprocessedData,
  studentInfo: StudentInfo,
  plan: ReportPlan,
  reportId: string
): PostprocessResult => {
  const validationResults: SectionValidationResult[] = [];

  // 1. 각 섹션 Zod 검증
  const validatedSections: ReportSection[] = [];

  for (const section of rawSections) {
    const result = validateSection(section);
    validationResults.push(result);

    if (result.valid) {
      validatedSections.push(section);
    } else {
      // 검증 실패 시에도 섹션 포함 (최선의 결과 제공)
      // 필수 섹션은 반드시 포함, 선택 섹션은 에러가 심각하면 제외 가능
      const isCritical = isCriticalSection(section.sectionId, plan);
      if (isCritical) {
        validatedSections.push(section);
      }
    }
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
    version: 3,
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
