/** 섹션 11: 행동특성 분석 (behaviorAnalysis) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface BehaviorAnalysisPromptInput {
  behavioralAssessment: string;
  competencyExtraction: string;
  studentProfile: string;
}

export const buildBehaviorAnalysisPrompt = (
  input: BehaviorAnalysisPromptInput,
  _plan: ReportPlan
): string => {
  return `## 작업
학생의 행동특성 및 종합의견을 학년별로 분석하고, 입시에서의 활용 포인트를 도출하세요.

## 규칙
1. 행동특성 및 종합의견은 담임교사가 작성하는 총평으로, 학생의 인성과 태도를 종합 판단하는 자료입니다.
2. 학년별로 어떤 특성이 강조되는지 분석합니다.
3. 여러 학년에 걸쳐 일관되게 등장하는 특성을 식별합니다 (일관성 = 높은 신뢰도).
4. 형식적 표현과 구체적 행동 서술을 구분합니다.
5. 입학사정관이 행동특성에서 주로 확인하는 항목:
   - 성실성, 리더십, 배려, 자기주도성, 학업 태도
   - 구체적 에피소드가 있는 서술 vs 일반적 칭찬

## 입력 데이터

### 행동특성 및 종합의견 원문
${input.behavioralAssessment}

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 학년별 분석 (yearlyAnalysis)
각 학년에 대해:
- year: 학년
- summary: 핵심 서술 요약 (2~3줄)
- competencyTags: 드러나는 역량 태그 (1~3개)
- keyQuotes: 원문 핵심 인용 (1~2개)

### 일관된 특성 (consistentTraits)
- 여러 학년에 걸쳐 반복적으로 등장하는 특성을 문자열 리스트로 정리합니다.
- 예시: ["자기주도적 학습 태도", "또래 학습 도움", "성실한 과제 수행"]

### 종합 평가 (overallComment)
- 행동특성이 전달하는 학생 이미지를 종합합니다 (3~5줄).

### 입시 활용 포인트 (admissionRelevance)
- 면접이나 자소서에서 행동특성 내용을 어떻게 활용할 수 있는지 조언합니다.
- 특히 인성 면접 질문과 연결 가능한 에피소드를 식별합니다.`;
};
