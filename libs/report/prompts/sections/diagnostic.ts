/** 섹션 4: 종합 진단 (diagnostic) */

import type { ReportPlan } from "../../types.ts";

export interface DiagnosticPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentTypeClassification: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력
- 한줄 총평 + 키워드 3개 + 역량 요약만 출력합니다.
- admissionPositioning, strategyOverview 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력
- 한줄 총평 + 키워드 3개 + 역량 요약을 출력합니다.
- 추가로 입시 포지셔닝(admissionPositioning)을 포함합니다: 추천 전형 방향 + 이유를 3~5줄로 서술합니다.`,
  premium: `## 플랜별 출력
- 한줄 총평 + 키워드 3개 + 역량 요약을 출력합니다.
- 추가로 입시 포지셔닝(admissionPositioning)과 합격 가능 전략 요약(strategyOverview)을 포함합니다.
- strategyOverview: 포지셔닝 + 구체적 전략 방향을 서술합니다.`,
};

export const buildDiagnosticPrompt = (
  input: DiagnosticPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부 분석 결과를 바탕으로 종합 진단을 작성하세요.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 한줄 총평 (oneLiner)
- 입학사정관이 이 생기부를 한 줄로 평가한다면 어떻게 말할지를 담으세요.
- 강점과 보완점을 모두 포함합니다.
- 구체적인 전공/진로 방향을 언급합니다.
- 예시: "자동차 분야에 대한 2년간의 일관된 관심은 진로역량의 강점이나, 기계공학과 지망에 걸맞는 수학적/물리학적 깊이 보강이 시급합니다."

### 핵심 키워드 3개 (keywords)
- 각 키워드는 [역량 영역 + 평가 방향]으로 구성합니다.
- 라벨(4~8자)과 설명(15~25자)을 포함합니다.
- 긍정적 키워드 1~2개, 보완 필요 키워드 1~2개를 균형 있게 배치합니다.

### 역량 요약 (competencySummary)
- 학업역량, 진로역량, 공동체역량, 발전가능성 각각에 대해 1줄 요약을 작성합니다.
- 각 요약에 카테고리(academic/career/community/growth)와 라벨을 포함합니다.
- 사정관의 서류 평가 4대 항목(학업역량/진로역량/공동체역량/발전가능성)에 대응하므로, 각 역량이 서류 평가에서 어떤 인상을 줄지를 담으세요.

${PLAN_SPECIFIC[plan]}`;
};
