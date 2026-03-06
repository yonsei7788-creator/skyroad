/** 섹션 15: 예상 면접 질문 (interviewPrep) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface InterviewPrepPromptInput {
  subjectAnalysisResult: string;
  studentProfile: string;
  academicData: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 플랜별 출력: 상세
- 최대 20개 질문을 출력합니다.
- 각 질문: question + questionType(세특기반/성적기반/진로기반/인성기반) + intent(출제 의도 1~2줄) + importance(high/medium/low)
- answerStrategy, sampleAnswer, followUpQuestions 필드는 출력하지 않습니다.`,
  premium: `## 플랜별 출력: 정밀
- 30개 질문을 출력합니다.
- 각 질문: question + questionType + intent + importance(high/medium/low) + answerStrategy(답변 전략) + sampleAnswer(모범 답변 가이드) + followUpQuestions(꼬리질문 1~2개)`,
};

export const buildInterviewPrepPrompt = (
  input: InterviewPrepPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부를 바탕으로 예상 면접 질문을 생성하세요.

## 질문 생성 기준
1. 세특 기반: 세특에 기록된 구체적 탐구 내용에 대한 심화 질문
2. 성적 기반: 성적 추이, 과목 간 편차 등에 대한 설명 요구
3. 진로 기반: 진로 선택 이유, 전공 관련 활동의 의미
4. 인성 기반: 갈등 해결, 협업 경험, 성장 과정

## 규칙
- 질문은 실제 대학 면접에서 나올 법한 구체적이고 날카로운 질문이어야 합니다.
- 생기부의 특정 내용을 직접 언급하는 질문을 포함하세요.
- "~에 대해 말해보세요" 같은 단순 질문보다 "~에서 ~를 선택한 이유는?" 같은 구체적 질문을 선호합니다.

## 입력 데이터

### 세특 분석 결과
${input.subjectAnalysisResult}

### 학생 프로필
${input.studentProfile}

### 성적 데이터
${input.academicData}

${PLAN_SPECIFIC[plan]}`;
};
