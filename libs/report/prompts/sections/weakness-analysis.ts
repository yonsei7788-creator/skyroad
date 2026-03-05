/** 섹션 13: 부족한 부분 + 보완 전략 (weaknessAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface WeaknessAnalysisPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 3개 부족 영역을 출력합니다.
- 각 영역: area + description + suggestedActivities (1~2개)
- evidence, competencyTag, priority 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- 5개 부족 영역을 출력합니다.
- 각 영역: area + description + suggestedActivities + evidence(상세 근거) + competencyTag(역량 매핑) + priority(보완 우선순위 high/medium/low)`,
  premium: `## 플랜별 출력: 정밀
- 5개 이상 부족 영역을 출력합니다.
- Standard의 모든 항목 + urgency(시급도) + effectiveness(효과도) 매트릭스 + executionStrategy(실행 전략) + subjectLinkStrategy(진로-선택과목 연계 전략)`,
};

export const buildWeaknessAnalysisPrompt = (
  input: WeaknessAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부에서 부족한 부분을 구체적으로 식별하고 보완 방향을 제시하세요.

## 부족 유형 체크리스트
다음 유형의 약점이 존재하는지 확인하고, 해당되는 경우 포함하세요:

| 유형 | 설명 |
|------|------|
| 탐구 깊이 부족 | "조사함", "발표함"으로 끝나고 구체적 탐구 내용 없음 |
| 나열식 서술 | 여러 활동을 깊이 없이 나열, 핵심 탐구 불명확 |
| 추상적 결론 | "흥미를 느낌", "유익했음" 등 일반적 소감으로 마무리 |
| 과목 간 연결 부재 | 같은 주제를 다른 과목에서 다루면서 연결성 미언급 |
| 전공 부적합 | 진로와 관련 없는 활동이 과다, 전공 연관성 부족 |
| 성적-세특 불일치 | 성적은 낮은데 세특은 우수하다고 서술되는 모순 |
| 과목다운 세특 부재 | 과목 본질과 무관한 소재만 활용, 교과 특성이 드러나지 않음 |
| 주제 반복 without 심화 | 같은 주제가 여러 과목에서 반복되지만 깊이가 동일 수준에 머무름 |

## 성적-세특 교차분석 규칙
- 성적이 낮은데 세특 평가가 우수한 경우: 사정관이 의구심을 가질 수 있음을 지적
- 성적이 높은데 세특이 빈약한 경우: 학업역량은 있으나 탐구 어필이 안 되는 것이 약점
- 전공 관련 과목 성적이 비관련 과목보다 낮은 경우: 진로역량에 감점 요인
- 이 교차분석 결과를 부족 영역 식별에 반영하세요.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
