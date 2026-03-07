/** 섹션 19: 추천 도서 (bookRecommendation) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface BookRecommendationPromptInput {
  competencyExtraction: string;
  subjectAnalysisResult: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 플랜별 출력: 상세
- 3~5권 추천
- 각 도서: title + author + reason + connectionToRecord + relatedSubject`,
  premium: `## 플랜별 출력: 정밀
- **5권** 추천 (초과 금지)
- 각 도서: title + author + reason(2줄 이내) + connectionToRecord(1줄) + relatedSubject`,
};

export const buildBookRecommendationPrompt = (
  input: BookRecommendationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 진로와 활동 이력을 바탕으로 맞춤 도서를 추천하세요.

## 추천 기준
1. 학생의 목표 전공/진로와 관련된 도서를 우선합니다.
2. 기존 탐구 활동을 심화하거나 확장할 수 있는 도서를 포함합니다.
3. 면접에서 활용할 수 있는 도서를 고려합니다.
4. 실제 존재하는 도서만 추천합니다 (존재하지 않는 도서를 만들어내지 마세요).
5. 고등학생이 이해할 수 있는 수준의 도서를 선택합니다.

## 규칙
- 각 도서에 대해: 제목, 저자, 추천 이유, 학생 활동과의 연결 포인트를 포함합니다.
- 추천 이유는 "왜 이 학생에게 이 책이 필요한지"를 구체적으로 서술합니다.
- 단순히 "전공 관련 도서"가 아닌, 학생의 기존 탐구와 어떻게 연결되는지 명시합니다.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 세특 분석 결과
${input.subjectAnalysisResult}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
