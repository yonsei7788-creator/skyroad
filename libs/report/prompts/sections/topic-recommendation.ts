/** 섹션 14: 세특 주제 추천 (topicRecommendation) */

import type { ReportPlan } from "../../types.ts";

export interface TopicRecommendationPromptInput {
  subjectAnalysisResult: string;
  weaknessAnalysisResult: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- **3개** 주제를 출력합니다.
- 각 주제: topic + relatedSubjects + description(**1줄**) + importance(high/medium/low)
- rationale, existingConnection, activityDesign, sampleEvaluation 필드는 출력하지 않습니다.

## 분량 가이드
- 추천 주제 3개. A4 1페이지 이내.`,
  standard: `## 플랜별 출력: 상세
- 각 주제: topic + relatedSubjects + description + rationale(주제 선정 이유) + existingConnection(기존 탐구 연결) + importance(high/medium/low)

⚠️ **분량 제한 (반드시 준수)**:
- topics 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 description은 반드시 **100자 이내**로 작성합니다. 100자 초과 금지.
- 각 rationale은 **100자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력: 정밀
- Standard의 모든 항목 + activityDesign(구체적 탐구 설계: steps 3단계 이내/duration/expectedResult 1줄) + sampleEvaluation(세특 서술 예시, 3줄 이내) + importance(high/medium/low)

⚠️ **분량 제한 (반드시 준수)**:
- topics 배열은 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- 각 description은 반드시 **150자 이내**로 작성합니다. 150자 초과 금지.
- 각 rationale은 **200자 이내**로 작성합니다.
- sampleEvaluation은 **200자 이내**로 작성합니다.`,
};

export const buildTopicRecommendationPrompt = (
  input: TopicRecommendationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 향후 세특에 활용할 수 있는 탐구 주제를 맞춤 추천하세요.

## 출력 JSON 스키마

중요: topics 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "topicRecommendation",
  "title": "주제 추천",
  "topics": [
    {
      "topic": "지역 복지 정책의 효과성 비교 분석",
      "relatedSubjects": ["사회·문화", "정치와법"],
      "description": "국내 지자체별 복지 정책을 비교 분석하여...",
      "importance": "high",
      "rationale": "기존 사회·문화 탐구를 정책 분석으로 심화...",
      "existingConnection": "2학년 사회·문화에서 복지 문제를 다룬 것과 연결...",
      "activityDesign": {
        "steps": ["1단계: 지자체별 복지 예산 데이터 수집", "2단계: 정책 효과 비교 기준 설정", "3단계: 분석 및 보고서 작성"],
        "duration": "4주",
        "expectedResult": "지역별 복지 정책 비교 분석 보고서"
      },
      "sampleEvaluation": "지역 복지 정책의 효과성에 관심을 갖고..."
    }
  ]
}

**[필수] Premium 플랜에서 sampleEvaluation은 모든 주제에 반드시 포함해야 합니다. 누락 시 출력이 불완전한 것으로 간주됩니다.**

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
