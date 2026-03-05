/** 섹션 3: 합격 예측 (admissionPrediction) */

import type { ReportPlan } from "../../types.ts";

export interface AdmissionPredictionPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentTypeClassification: string;
  universityCandidates: string;
  studentProfile: string;
  /** Group 4 시점에서 추가되는 입력 */
  competencyEvaluationResult?: string;
  subjectAnalysisResult?: string;
  academicAnalysisResult?: string;
  attendanceAnalysisResult?: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 간략 근거 + 종합 코멘트를 출력합니다.
- universityPredictions 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 간략 근거 + 종합 코멘트를 출력합니다.
- 추가로 전형별 주요 대학 예측(universityPredictions)을 포함합니다: 상향/안정/하향 각 1~2교.`,
  premium: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 상세 근거 + 종합 코멘트를 출력합니다.
- 추가로 전형별 주요 대학 예측(universityPredictions)을 포함합니다: 상향/안정/하향 각 1~2교, 더 상세한 분석 포함.`,
};

export const buildAdmissionPredictionPrompt = (
  input: AdmissionPredictionPromptInput,
  plan: ReportPlan
): string => {
  const additionalInputs = [
    input.competencyEvaluationResult
      ? `### 역량별 종합 평가 결과\n${input.competencyEvaluationResult}`
      : "",
    input.subjectAnalysisResult
      ? `### 교과 세특 분석 결과\n${input.subjectAnalysisResult}`
      : "",
    input.academicAnalysisResult
      ? `### 성적 분석 결과 (상세)\n${input.academicAnalysisResult}`
      : "",
    input.attendanceAnalysisResult
      ? `### 출결 분석 결과\n${input.attendanceAnalysisResult}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `## 작업
학생의 역량 분석 결과와 성적 데이터를 바탕으로 전형별 합격 가능성을 예측하세요.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 코드 산정 대학 후보군
${input.universityCandidates}

### 학생 프로필
${input.studentProfile}

${additionalInputs}

## 출력 지시

### 추천 전형 (recommendedType)
- "학종", "교과", "정시" 중 학생에게 가장 적합한 전형을 선택합니다.
- 추천 이유를 2~3줄로 서술합니다.

### 전형별 합격 예측 (predictions)
학종, 교과, 정시 각 전형에 대해:
- 합격률 표시 (예: "60~70%")
- 합격률 수치 범위 [하한, 상한] (예: [60, 70])
- 근거 분석 (2~3줄)
  - 학종: 역량 점수, 세특 품질, 활동 일관성 기반
  - 교과: 내신 등급, 교과 조합 평균 기반
  - 정시: 모의고사 데이터 기반 (없으면 "데이터 부족" 표시)

### 합격 예측 산출 가이드라인
- 합격률은 학생의 목표 대학/학과군 기준으로 산출합니다.
- 목표 대학이 없는 경우, 학생의 성적 수준에 맞는 적정 대학군을 기준으로 합니다.
- 합격률 범위는 10% 단위로 설정합니다 (예: 50~60%, 70~80%).
- 합격률 산출 시 고려 요소:
  - 학종: 역량 점수, 세특 질, 활동 일관성, 출결
  - 교과: 내신 등급, 과목 조합, 등급 추이
  - 정시: 모의고사 등급/백분위 (데이터 있는 경우)

### 종합 코멘트 (overallComment)
- 전형별 예측을 종합하여 최종 조언을 2~3줄로 서술합니다.

${PLAN_SPECIFIC[plan]}`;
};
