/** 섹션 20: AI 전공 추천 (majorExploration) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface MajorExplorationPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 플랜별 출력: 상세
- 현재 목표 평가(currentTargetAssessment) + AI 추천 전공 3~5개
- 각 전공: major + fitScore + rationale + strengthMatch
- university, gapAnalysis 필드는 출력하지 않습니다.`,
  premium: `## 플랜별 출력: 정밀
- 현재 목표 평가 + AI 추천 전공 3~5개
- Standard의 모든 항목 + 대학 추천 연계(university) + 보완 분석(gapAnalysis)`,
};

export const buildMajorExplorationPrompt = (
  input: MajorExplorationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 역량과 활동 이력을 분석하여 적합한 전공/학과를 추천하세요.

## 추천 기준
1. 학생의 4대 역량 프로필에 가장 적합한 전공을 선별합니다.
2. 기존 탐구 활동의 주제/방향성과 일치하는 전공을 우선합니다.
3. 학생의 성적 수준에서 경쟁력이 있는 전공을 고려합니다.
4. 학생이 미처 고려하지 못한 관련 전공도 제안합니다.

## 규칙
- 학생의 현재 목표 학과가 있다면 그에 대한 평가(currentTargetAssessment)를 먼저 제공합니다.
- 각 추천 전공에 대해 적합도 점수(0~100)와 근거를 포함합니다.
- 학생의 강점과 매칭되는 포인트(strengthMatch)를 명시합니다.
- 보완이 필요한 부분(gapAnalysis)도 솔직하게 제시합니다.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
