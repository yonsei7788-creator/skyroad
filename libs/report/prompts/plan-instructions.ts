import type { ReportPlan } from "../types.ts";

const LITE_INSTRUCTIONS = `## 분석 깊이: 기본
- 핵심 사항만 간결하게 서술합니다.
- 각 평가 항목은 3~5줄 이내로 요약합니다.
- 원문 인용은 핵심 1~2개만 포함합니다.
- 전반적인 방향성과 큰 그림에 집중합니다.`;

const STANDARD_INSTRUCTIONS = `## 분석 깊이: 상세
- 전문 입시 컨설턴트 수준의 상세한 분석을 제공합니다.
- 각 평가 항목은 5~8줄의 구체적 서술을 포함합니다.
- 원문 인용은 핵심 2~3개를 포함하고, 인용에 대한 해석을 덧붙입니다.
- 역량별 등급(S/A/B/C/D)을 부여할 때 구체적 근거를 함께 제시합니다.
- 개선 방향은 구체적인 활동과 연결하여 제안합니다.`;

const PREMIUM_INSTRUCTIONS = `## 분석 깊이: 정밀 (컨설팅급)
- 최상위 입시 컨설턴트 수준의 정밀 분석을 제공합니다.
- 세특은 문장 단위로 분석하며, 각 문장이 어필하는 역량과 평가 영향을 태깅합니다.
- 원문 전문을 분석 대상으로 삼고, 인상적인 문장과 감점 요인 문장을 구분합니다.
- 약한 문장에 대해 "이렇게 서술되었으면 좋았을 것"이라는 구체적 개선 예시를 제시합니다.
- 모든 분석에 전략적 조언을 포함합니다 (단순 평가를 넘어 합격 전략까지).
- 과목 간 연결 관계, 학년 간 심화 흐름을 적극적으로 분석합니다.`;

const PLAN_INSTRUCTIONS: Record<ReportPlan, string> = {
  lite: LITE_INSTRUCTIONS,
  standard: STANDARD_INSTRUCTIONS,
  premium: PREMIUM_INSTRUCTIONS,
};

export const getPlanInstructions = (plan: ReportPlan): string => {
  return PLAN_INSTRUCTIONS[plan];
};
