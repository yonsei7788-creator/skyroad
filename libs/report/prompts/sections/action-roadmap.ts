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

- prewriteProposals, evaluationWritingGuide, interviewTimeline 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- phases 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 phase의 tasks는 **최대 3개**이며, 각 task는 **80자 이내**로 작성합니다.
- completionStrategy는 **200자 이내**로 작성합니다.
- goals는 phase당 **최대 2개**로 제한합니다.

### ⛔ 본문 영단어 사용 금지 (위반 시 품질 실패)
- completionStrategy, goals, tasks 등 **모든 한글 서술 필드**에서 "high", "medium", "low", "priority" 등 영단어를 사용하지 마세요.
- 한글 대체: high→높음, medium→보통, low→낮음, priority→우선순위`,
  premium: `## 출력 수준: 확장
Standard의 모든 항목 + 다음을 추가로 출력하세요:

### 3. 보고서 사전 준비 (prewriteProposals)
- 방학 중 미리 작성해둘 보고서/활동 제안
- 구체적 주제와 분량 제안

### 4. 세특 서술 전략 (evaluationWritingGuide)
학생의 목표 전공과 현재 생기부를 고려하여, 3학년 세특이 어떻게 서술되면 효과적인지 가이드합니다:
- structure: 권장 구조 배열 (예: ["활동동기", "주제선정", "탐구방법", "분석내용", "결론/시사점", "성장소감"])
- goodExample: 학생의 전공 분야에 맞춘 좋은 서술 예시 (**5~7줄, 300자 이상**). 실제 세특처럼 구체적으로 작성하세요. 단순 나열이 아닌, 탐구 과정과 사고의 흐름이 드러나는 서술이어야 합니다.
- badExample: 같은 주제인데 피해야 할 서술 예시 (**2~3줄**). 왜 나쁜지 이유를 괄호로 부연합니다.

### 5. 면접 대비 타임라인 (interviewTimeline)
- 면접 준비 시작 시점과 단계별 준비 방법을 **3줄 이내**로 간결하게 서술

⚠️ **분량 제한 (반드시 준수)**:
- phases 배열은 **최대 6개**입니다. 7개 이상 절대 출력하지 마세요.
- 각 phase의 tasks는 **최대 5개**이며, 각 task는 **100자 이내**로 작성합니다.
- completionStrategy는 **300자 이내**로 작성합니다.
- prewriteProposals는 **최대 3개**로 제한합니다.
- interviewTimeline은 **200자 이내**로 작성합니다.

### ⛔ 본문 영단어 사용 금지
- 모든 한글 서술 필드에서 "high", "medium", "low" 등 영단어 사용 금지. 한글로 대체하세요.`,
};

export const buildActionRoadmapPrompt = (
  input: ActionRoadmapPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생을 위한 구체적 실행 로드맵을 작성하세요.

## 출력 JSON 스키마

중요: phases 배열의 각 요소는 반드시 완전한 객체여야 합니다. null 대신 빈 배열이나 빈 객체를 사용하세요.

{
  "sectionId": "actionRoadmap",
  "title": "실행 로드맵",
  "completionStrategy": "3학년 1학기에 사회과학 심화 탐구를 중심으로...",
  "phases": [
    {
      "phase": "방학 사전 준비",
      "period": "2026년 1~2월",
      "goals": ["복지 정책 탐구 주제 구체화", "관련 문헌 사전 조사"],
      "tasks": ["지역 복지 정책 비교 분석 보고서 초안 작성", "통계청 KOSIS 데이터 수집"]
    },
    {
      "phase": "3학년 1학기",
      "period": "2026년 3~7월",
      "goals": ["세특 주제 실행", "동아리 심화 활동"],
      "tasks": ["사회·문화 수업에서 복지 정책 탐구 발표", "동아리에서 정책 제안서 작성"]
    }
  ],
  "prewriteProposals": ["지역 복지 정책 비교 분석 보고서"],
  "evaluationWritingGuide": {
    "structure": ["활동동기", "주제", "방법", "내용", "결과", "소감"],
    "goodExample": "복지 정책의 효과성에 관심을 갖고 KOSIS 데이터를 활용하여...",
    "badExample": "복지 정책에 대해 조사하고 발표함."
  },
  "interviewTimeline": "9월부터 면접 준비 시작, 10월 모의 면접..."
}

## 단계별 추론 절차
1. **현재 시점 파악**: 학생의 학년과 현재 시기(학기 중/방학)를 확인하고, 남은 생기부 작성 기간을 계산합니다.
2. **약점 → 과제 변환**: 약점 분석 결과의 각 area를 구체적 실행 과제로 변환합니다. 추상적 조언("더 노력하세요")이 아닌 행동 가능한 과제("OO 주제로 실험 보고서 작성")를 설계합니다.
3. **시기별 배분**: 과제를 현재 방학/다음 학기/입시 시즌으로 배분합니다. 학교 내 수행 가능한 활동(수업 중 탐구, 동아리)과 자율 활동을 구분합니다.
4. **입시 전략과 정합성 확인**: 입시 전략 결과의 추천 전형/대학에 맞춰 로드맵의 우선순위를 조정합니다. 학종이면 세특/활동 중심, 교과면 성적 관리 중심으로 설계합니다.
5. **실현 가능성 검증**: 각 과제가 고등학생이 실제 수행 가능한 범위인지, 시간 배분이 현실적인지 최종 점검합니다.

## 입력 데이터

### 약점 분석 결과
${input.weaknessAnalysisResult}

### 입시 전략 결과
${input.admissionStrategyResult}

### 학생 프로필
${input.studentProfile}

${PLAN_SPECIFIC[plan]}`;
};
