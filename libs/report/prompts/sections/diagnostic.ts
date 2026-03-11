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
- 반드시 "평가", "전형", "사정관" 중 하나의 키워드를 포함하세요.
- 예시: "자동차 분야에 대한 2년간의 일관된 관심은 진로역량 평가에서 강점이나, 기계공학과 지망에 걸맞는 수학적/물리학적 깊이 보강이 시급합니다."

### 핵심 키워드 3개 (keywords)
- 각 키워드는 [역량 영역 + 평가 방향]으로 구성합니다.
- 라벨(4~8자)과 설명(15~25자)을 포함합니다.
- **긍정적 키워드 1~2개 + 보완 필요 키워드 반드시 1개 이상** 포함합니다. 긍정만 3개는 금지.
- 예: [{"label": "진로 일관성", "description": "2년간 동일 분야 탐구로 진로역량 강점"}, {"label": "탐구 깊이 부족", "description": "세특이 나열식으로 상위권 대학에서 변별력 약함"}]

### ⚠️ 생기부-학과 괴리 반영 (필수)
- 학생 유형 분류 결과에서 생기부와 희망 학과 간 괴리가 감지된 경우:
  - oneLiner에 괴리를 반드시 반영하세요. "~학과 지원에 긍정적"이라고 쓰면 안 됩니다.
  - 예: "환경·생태 분야의 탐구는 우수하나, 컴퓨터공학과 지원 시 전공 관련 활동·성적이 부족하여 서류 평가에서 불리합니다."
  - keywords에 "전공 괴리" 관련 보완 키워드를 반드시 포함하세요.
  - competencySummary의 진로역량 요약에서 괴리를 명시하세요.

### 역량 요약 (competencySummary)
- 학업역량, 진로역량, 공동체역량, 발전가능성 각각에 대해 1줄 요약을 작성합니다.
- 각 요약에 카테고리(academic/career/community/growth)와 라벨을 포함합니다.
- 사정관의 서류 평가 4대 항목(학업역량/진로역량/공동체역량/발전가능성)에 대응하므로, 각 역량이 서류 평가에서 어떤 인상을 줄지를 담으세요.

${PLAN_SPECIFIC[plan]}`;
};
