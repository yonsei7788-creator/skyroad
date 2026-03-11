/** 섹션 15: 예상 면접 질문 (interviewPrep) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface InterviewPrepPromptInput {
  subjectAnalysisResult: string;
  studentProfile: string;
  academicData: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- **8~10개** 질문만 출력합니다.
- 각 질문: question + questionType(세특기반/성적기반/진로기반/인성기반) + importance(high/medium/low) 필드만 출력합니다.
- intent, answerStrategy, sampleAnswer, followUpQuestions 필드는 출력하지 않습니다.

## 분량 가이드
- 예상 질문 3개 + 답변 가이드. A4 1페이지 이내.`,
  standard: `## 플랜별 출력: 상세
- 각 질문: question + questionType(세특기반/성적기반/진로기반/인성기반) + intent(출제 의도 1~2줄) + importance(high/medium/low)
- answerStrategy, sampleAnswer, followUpQuestions 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- questions 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 intent는 **100자 이내**로 작성합니다. 100자 초과 금지.`,
  premium: `## 플랜별 출력: 정밀
- 각 질문: question + questionType + intent(1~2줄) + importance(high/medium/low) + answerStrategy(답변 전략, 2줄 이내)
- **상위 3개 질문(importance: high)에만** sampleAnswer + followUpQuestions(1개)를 포함합니다.
- 나머지 질문은 sampleAnswer, followUpQuestions를 출력하지 않습니다.
- **Premium은 반드시 Standard보다 상세해야 합니다**: intent는 1~2줄로 Standard보다 구체적으로, answerStrategy는 Standard에 없는 추가 가치를 제공합니다.

⚠️ **분량 제한 (반드시 준수)**:
- questions 배열은 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- 각 sampleAnswer는 반드시 **300자 이내**로 작성합니다. 300자 초과 금지.
- 각 answerStrategy는 **150자 이내**로 작성합니다.`,
};

export const buildInterviewPrepPrompt = (
  input: InterviewPrepPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부를 바탕으로 예상 면접 질문을 생성하세요.

## 출력 JSON 스키마

중요: questions 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "interviewPrep",
  "title": "면접 준비",
  "questions": [
    {
      "question": "사회·문화 시간에 복지 정책을 비교 분석했는데, 한국의 복지 정책에서 가장 시급한 개선점은 무엇이라고 생각하나요?",
      "questionType": "세특기반",
      "intent": "세특에 기록된 복지 정책 탐구의 깊이를 검증하기 위한 질문을 받을 수 있어 대비해야 합니다.",
      "importance": "high",
      "answerStrategy": "구체적 정책 사례를 들어 비교하고...",
      "sampleAnswer": "한국의 복지 정책은 보편적 복지와 선별적 복지 사이에서...",
      "followUpQuestions": [
        {"question": "그렇다면 북유럽 모델을 한국에 적용할 때의 한계는?", "context": "비판적 사고력 검증"}
      ]
    }
  ]
}

## 질문 생성 기준
questionType은 반드시 다음 4개 중 하나만 사용: "세특기반" | "성적기반" | "진로기반" | "인성기반". 다른 값 사용 금지.

1. 세특기반: 세특에 기록된 구체적 탐구 내용에 대한 심화 질문
2. 성적기반: 성적 추이, 과목 간 편차 등에 대한 설명 요구
3. 진로기반: 진로 선택 이유, 전공 관련 활동의 의미
4. 인성기반: 갈등 해결, 협업 경험, 성장 과정

## 규칙
- 질문은 실제 대학 면접에서 나올 법한 질문이어야 합니다.
- 좋은 질문의 기준:
  1. 생기부 원문의 특정 내용(과목명, 탐구 주제, 활동명)을 직접 언급할 것
  2. "왜 ~를 선택했나요?"처럼 의사결정 과정을 묻는 질문일 것
  3. "~의 한계점은 무엇이었나요?"처럼 비판적 사고를 요구하는 질문일 것
  4. 학생이 실제로 탐구한 내용의 깊이를 검증할 수 있는 질문일 것
- 피해야 할 질문: "~에 대해 말해보세요", "~이 뭔가요?" 같은 단순 설명 요구형 질문.
- 생기부의 특정 내용을 직접 언급하는 질문을 포함하세요.
- **intent(출제 의도) 작성법**: "~의도입니다", "~검증합니다" 형식이 아닌, **"~질문을 받을 수 있어 대비해야 합니다"** 형식으로 학생에게 직접 조언하는 톤으로 작성하세요.
  - BAD: "학생의 탐구 깊이를 검증하려는 의도입니다."
  - GOOD: "세특에 기록된 탐구 내용의 깊이를 검증하기 위한 질문을 받을 수 있어 대비해야 합니다."

## 입력 데이터

### 세특 분석 결과
${input.subjectAnalysisResult}

### 학생 프로필
${input.studentProfile}

### 성적 데이터
${input.academicData}

${PLAN_SPECIFIC[plan]}`;
};
