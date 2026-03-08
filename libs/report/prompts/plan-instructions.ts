import type { ReportPlan } from "../types.ts";

const LITE_INSTRUCTIONS = `## 분석 깊이: 기본
- 핵심 사항만 간결하게 서술합니다.
- 각 평가 항목은 3~5줄 이내로 요약합니다.
- 원문 인용은 핵심 1~2개만 포함합니다.
- 전반적인 방향성과 큰 그림에 집중합니다.
- 자연스럽고 이해하기 쉬운 표현으로 작성합니다.`;

const STANDARD_INSTRUCTIONS = `## 분석 깊이: 상세
- 전문 입시 컨설턴트 수준의 분석을 **간결하게** 제공합니다.
- 각 평가 항목은 2~4줄의 핵심 서술을 포함합니다.
- 원문 인용은 핵심 1~2개만 포함합니다.
- 역량별 등급(S/A/B/C/D)을 부여할 때 핵심 근거 1~2가지를 제시합니다.
- 개선 방향은 구체적인 활동과 연결하여 1~2줄로 제안합니다.
- 전문 컨설턴트처럼 따뜻하고 확신 있게 작성합니다.`;

const PREMIUM_INSTRUCTIONS = `## 분석 깊이: 정밀 (컨설팅급)
- 최상위 입시 컨설턴트 수준의 정밀 분석을 제공하되, **핵심 위주로 간결하게** 서술합니다.
- 문장 단위 분석은 subjectAnalysis의 상위 과목에만 한정합니다. 다른 섹션에서는 수행하지 않습니다.
- 원문 인용은 핵심 근거 1~2개만 포함하고, 긴 인용 대신 핵심 구절만 발췌합니다.
- 전략적 조언은 가장 중요한 1~2가지에 집중합니다. 모든 항목에 조언을 붙이지 않습니다.
- 정확하되 학생 눈높이에서 공감할 수 있게 작성합니다.
- **절대 규칙: 장황하게 늘려 쓰지 않습니다. 같은 내용을 다른 표현으로 반복하지 않습니다.**`;

const PLAN_INSTRUCTIONS: Record<ReportPlan, string> = {
  lite: LITE_INSTRUCTIONS,
  standard: STANDARD_INSTRUCTIONS,
  premium: PREMIUM_INSTRUCTIONS,
};

export const getPlanInstructions = (plan: ReportPlan): string => {
  return PLAN_INSTRUCTIONS[plan];
};
