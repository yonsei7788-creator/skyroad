/** 섹션 14: 세특 주제 추천 (topicRecommendation) */

import type { ReportPlan } from "../../types.ts";

export interface TopicRecommendationPromptInput {
  subjectAnalysisResult: string;
  weaknessAnalysisResult: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 3개 주제를 출력합니다.
- 각 주제: topic + relatedSubjects + description (1줄)
- rationale, existingConnection 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- 5개 주제를 출력합니다.
- 각 주제: topic + relatedSubjects + description + rationale(주제 선정 이유) + existingConnection(기존 탐구 연결)`,
  premium: `## 플랜별 출력: 정밀
- 5개 주제를 출력합니다.
- Standard의 모든 항목 + activityDesign(구체적 탐구 설계: steps/duration/expectedResult) + sampleEvaluation(세특 서술 예시)`,
};

export const buildTopicRecommendationPrompt = (
  input: TopicRecommendationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 향후 세특에 활용할 수 있는 탐구 주제를 맞춤 추천하세요.

## 추천 기준 (우선순위 순)
1. 학생의 기존 탐구 흐름과 자연스럽게 이어지는 주제
2. 부족한 역량을 보완할 수 있는 주제
3. 전공 관련성이 높은 주제
4. 탐구 깊이를 보여줄 수 있는 주제 (단순 조사가 아닌, 실험/분석/비교/모델링 등)

## 규칙
- 추천 주제는 고등학생이 실제로 수행 가능한 수준이어야 합니다.
- 기존 세특에서 이미 다룬 주제와 직접 겹치면 안 됩니다 (확장/심화는 가능).
- 각 주제는 서로 다른 과목과 연계되어야 합니다.

## 입력 데이터

### 세특 분석 결과
${input.subjectAnalysisResult}

### 약점 분석 결과
${input.weaknessAnalysisResult}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
