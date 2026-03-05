/** 섹션 18: 실행 로드맵 (actionRoadmap) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface ActionRoadmapPromptInput {
  weaknessAnalysisResult: string;
  admissionStrategyResult: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 출력 수준: 간략

### 1. 생기부 마무리 전략 (completionStrategy)
- 3학년 세특 작성 방향: 어떤 주제를 어떤 과목에서 다뤄야 하는지
- 스토리라인 완성 전략: 1~2학년 생기부와 어떻게 연결할지

### 2. 학기별 실행 계획 (phases)
시기별로 해야 할 활동을 구체적으로 나열합니다:
- 현재 방학: 사전 준비 활동 (phase + period + goals + tasks)
- 다음 학기: 학교 내 활동 계획
- 입시 시즌: 원서/면접 준비

- prewriteProposals, evaluationWritingGuide, interviewTimeline 필드는 출력하지 않습니다.`,
  premium: `## 출력 수준: 확장
Standard의 모든 항목 + 다음을 추가로 출력하세요:

### 3. 보고서 사전 준비 (prewriteProposals)
- 방학 중 미리 작성해둘 보고서/활동 제안
- 구체적 주제와 분량 제안

### 4. 세특 서술 전략 (evaluationWritingGuide)
세특이 어떤 구조로 서술되면 좋을지 가이드합니다:
- structure: 권장 구조 (활동동기 -> 주제 -> 방법 -> 내용 -> 결과 -> 소감)
- goodExample: 좋은 서술 예시
- badExample: 피해야 할 서술 예시

### 5. 면접 대비 타임라인 (interviewTimeline)
- 면접 준비 시작 시점
- 단계별 준비 방법`,
};

export const buildActionRoadmapPrompt = (
  input: ActionRoadmapPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생을 위한 구체적 실행 로드맵을 작성하세요.

## 입력 데이터

### 약점 분석 결과
${input.weaknessAnalysisResult}

### 입시 전략 결과
${input.admissionStrategyResult}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
