/** 섹션 18: 실행 로드맵 (actionRoadmap) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface ActionRoadmapPromptInput {
  weaknessAnalysisResult: string;
  admissionStrategyResult: string;
  studentProfile: string;
  currentDate?: string;
  studentGrade?: number;
  isMedical?: boolean;
  completedSubjectsByYear?: string;
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
  const dateStr = input.currentDate || new Date().toISOString().slice(0, 10);
  const [yearStr, monthStr] = dateStr.split("-");
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);
  const grade = input.studentGrade;

  const gradeContext =
    grade && grade <= 2
      ? `\n- 이 학생은 아직 ${grade}학년입니다. "3학년 1학기" 등 특정 학기를 지칭하지 말고 "남은 학기", "앞으로의 기간" 등 유연한 표현을 사용하세요.
- ❌ "3학년 1학기 내신을 1등급으로" → 아직 ${grade}학년이므로 부적절합니다.
- ✅ "남은 기간동안 성적을 끌어올려야 합니다", "다음 학년에서 ~를 보완"`
      : grade === 3
        ? `\n- 이 학생은 3학년입니다. 현재 시점에서 실행 가능한 전략만 제시하세요.`
        : "";

  // 현재 시점 기준 phase 예시를 동적 생성
  const examplePhases = (() => {
    const m = currentMonth;
    const y = currentYear;
    if (m >= 3 && m <= 6) {
      // 1학기 중
      return [
        {
          phase: "1학기 핵심 활동기",
          period: `${y}년 ${m}~7월`,
          goals: ["세특 주제 실행", "동아리 심화 활동"],
          tasks: [
            "수업 중 탐구 발표 주제 선정 및 실행",
            "동아리에서 전공 관련 프로젝트 수행",
          ],
        },
        {
          phase: "여름방학 집중기",
          period: `${y}년 7~8월`,
          goals: ["2학기 세특 사전 준비", "부족 과목 보완"],
          tasks: ["2학기 탐구 보고서 초안 작성", "취약 과목 기초 개념 정리"],
        },
        {
          phase: "2학기 마무리",
          period: `${y}년 9~12월`,
          goals: ["생기부 스토리라인 완성"],
          tasks: ["2학기 세특에서 1학기와 연결되는 심화 탐구 수행"],
        },
      ];
    } else if (m >= 7 && m <= 8) {
      // 여름방학
      return [
        {
          phase: "여름방학 집중기",
          period: `${y}년 ${m}~8월`,
          goals: ["2학기 세특 사전 준비"],
          tasks: ["탐구 보고서 초안 작성", "관련 문헌 조사"],
        },
        {
          phase: "2학기 실행기",
          period: `${y}년 9~12월`,
          goals: ["세특 심화 탐구 완성"],
          tasks: ["수업 중 탐구 발표 실행", "동아리 프로젝트 마무리"],
        },
      ];
    } else if (m >= 9 && m <= 12) {
      // 2학기
      return [
        {
          phase: "2학기 핵심 활동기",
          period: `${y}년 ${m}~12월`,
          goals: ["세특 스토리라인 완성"],
          tasks: ["수업 중 심화 탐구 발표", "동아리 최종 결과물 정리"],
        },
        {
          phase: "겨울방학 준비기",
          period: `${y}년 12월~${y + 1}년 2월`,
          goals: ["다음 학년 사전 준비"],
          tasks: ["부족 과목 기초 정리", "다음 학기 탐구 주제 사전 조사"],
        },
      ];
    } else {
      // 1~2월 (겨울방학)
      return [
        {
          phase: "겨울방학 준비기",
          period: `${y}년 ${m}~2월`,
          goals: ["새 학기 탐구 주제 구체화"],
          tasks: ["관련 문헌 사전 조사", "탐구 보고서 초안 설계"],
        },
        {
          phase: "1학기 실행기",
          period: `${y}년 3~7월`,
          goals: ["세특 주제 실행"],
          tasks: ["수업 중 탐구 발표 수행", "동아리 심화 활동 연계"],
        },
      ];
    }
  })();

  return `## ⚠️⚠️⚠️ 현재 날짜: ${currentYear}년 ${currentMonth}월 (최우선 — 위반 시 품질 실패)${grade ? `\n- 학생 학년: ${grade}학년` : ""}

### 과거 날짜 절대 금지 규칙
- ⛔ phases의 period에 **${currentYear}년 ${currentMonth}월 이전** 날짜를 사용하면 품질 실패입니다.
- ⛔ "${currentYear}년 1~2월", "${currentYear - 1}년" 등 이미 지난 시기는 절대 포함하면 안 됩니다.
- ⛔ "방학 사전 준비"라는 이름으로 이미 지난 방학 시기를 제안하면 안 됩니다.
- ✅ 첫 번째 phase의 period는 반드시 **"${currentYear}년 ${currentMonth}월~"** 이후부터 시작합니다.

### 출력 전 자기 검증 (반드시 수행)
JSON을 출력하기 직전에 phases 배열의 **모든 period를 하나씩** 점검하세요:
1. period에 포함된 시작 월이 ${currentMonth}월 이상인가? → 아니면 삭제 또는 수정
2. period에 ${currentYear - 1}년이 포함되어 있지 않은가? → 포함되면 삭제
3. 첫 번째 phase가 현재 시점(${currentYear}년 ${currentMonth}월)부터 시작하는가?
${gradeContext}

${
  input.isMedical
    ? `## ⚠️ 메디컬 계열 실행 로드맵 규칙 (반드시 적용)
- 메디컬은 **정시 비중 40% 이상**. 로드맵에 수능 준비 일정을 반드시 포함하세요.
- **영어 1등급 확보**를 위한 학습 계획을 phases에 포함하세요.
- 수학·과학 핵심 과목의 성적 관리 + 세특 심화 탐구를 병행하는 계획을 설계하세요.
- 학종 준비와 정시 준비를 동시에 진행하는 현실적 시간 배분을 제시하세요.
`
    : ""
}## 작업
학생을 위한 구체적 실행 로드맵을 작성하세요.

## 출력 JSON 스키마

중요: phases 배열의 각 요소는 반드시 완전한 객체여야 합니다. null 대신 빈 배열이나 빈 객체를 사용하세요.

{
  "sectionId": "actionRoadmap",
  "title": "실행 로드맵",
  "completionStrategy": "1학기에 사회과학 심화 탐구를 중심으로...",
  "phases": ${JSON.stringify(examplePhases, null, 4)},
  "prewriteProposals": ["지역 복지 정책 비교 분석 보고서"],
  "evaluationWritingGuide": {
    "structure": ["활동동기", "주제", "방법", "내용", "결과", "소감"],
    "goodExample": "복지 정책의 효과성에 관심을 갖고 KOSIS 데이터를 활용하여...",
    "badExample": "복지 정책에 대해 조사하고 발표함."
  },
  "interviewTimeline": "9월부터 면접 준비 시작, 10월 모의 면접..."
}

## 학생 상태별 처리 규칙
- 학생 프로필의 "학생 상태"와 "분석 범위"를 반드시 확인하세요.
- **졸업생/N수생**: 이 프롬프트가 호출되지 않습니다 (파이프라인에서 자동 스킵).
- **고3 재학생**: 3학년 1학기까지의 데이터만 분석되었으므로, 3학년 2학기 및 이후 일정에 대한 실행 계획을 작성합니다.
- **고2 재학생 (2학년 데이터까지 입력)**: "3학년 때~" 시점부터 시작합니다.
- **고1 재학생 (1학년 데이터만 입력)**: "2학년 때~" 시점부터 시작합니다.
- ⚠️ **입력된 성적의 최대 학년 기준으로 "다음 학년부터"** 설명을 시작하세요. "3학년 때 모든 주요 과목에서~"라고 일괄 작성하면 안 됩니다.

## ⚠️ 타임라인 시점 규칙 (필수)
- phases의 period는 **현재 시점(리포트 생성 시점)부터** 시작해야 합니다.
- 2026년에 생성된 리포트의 타임라인이 "2025년 1~2월"부터 시작하면 안 됩니다.
- 학생 프로필의 학년과 현재 날짜를 확인하여 현실적인 시점을 산출하세요.

## 단계별 추론 절차
1. **현재 시점 파악**: 학생의 학년과 현재 시기(학기 중/방학)를 확인하고, 남은 생기부 작성 기간을 계산합니다. 입력된 성적 데이터의 최대 학년/학기를 확인하여 다음 학년/학기부터의 계획을 세웁니다.
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

${input.completedSubjectsByYear ? `### 이수 완료 과목 정보\n${input.completedSubjectsByYear}\n⛔ 로드맵의 tasks에서 이수 완료 과목의 성적 향상을 과제로 제시하면 안 됩니다. 해당 교과 영역의 향후 선택과목으로 안내하세요.` : ""}

${PLAN_SPECIFIC[plan]}`;
};
