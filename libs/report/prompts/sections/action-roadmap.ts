/** 섹션 18: 실행 로드맵 (actionRoadmap) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface ActionRoadmapPromptInput {
  weaknessAnalysisResult: string;
  admissionStrategyResult: string;
  studentProfile: string;
  currentDate?: string;
  studentGrade?: number;
  isGraduate?: boolean;
  isMedical?: boolean;
  completedSubjectsByYear?: string;
  /** 학생이 입력한 수강 예정 과목 텍스트 */
  plannedSubjects?: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: "",
  standard: `## 출력 수준: 간략

### 1. 생기부 마무리 전략 (completionStrategy)
- 3학년 세특 작성 방향: 어떤 주제를 어떤 과목에서 다뤄야 하는지
- 스토리라인 완성 전략: 1~2학년 생기부와 어떻게 연결할지

- prewriteProposals, evaluationWritingGuide, interviewTimeline 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- completionStrategy는 **300자 이내**로 작성합니다.

### ⛔ 본문 영단어 사용 금지 (위반 시 품질 실패)
- completionStrategy 등 **모든 한글 서술 필드**에서 "high", "medium", "low", "priority" 등 영단어를 사용하지 마세요.
- 한글 대체: high→높음, medium→보통, low→낮음, priority→우선순위`,
  premium: `## 출력 수준: 확장
Standard의 모든 항목 + 다음을 추가로 출력하세요:

### 2. 보고서 사전 준비 (prewriteProposals)
- 방학 중 미리 작성해둘 보고서/활동 제안
- 구체적 주제와 분량 제안

### 3. 세특 서술 전략 (evaluationWritingGuide)
학생의 목표 전공과 현재 생기부를 고려하여, 3학년 세특이 어떻게 서술되면 효과적인지 가이드합니다:
- structure: 권장 구조 배열 (예: ["활동동기", "주제선정", "탐구방법", "분석내용", "결론/시사점", "성장소감"])
- goodExample: 학생의 전공 분야에 맞춘 좋은 서술 예시 (**5~7줄, 300자 이상**). 실제 세특처럼 구체적으로 작성하세요. 단순 나열이 아닌, 탐구 과정과 사고의 흐름이 드러나는 서술이어야 합니다.
- badExample: 같은 주제인데 피해야 할 서술 예시 (**2~3줄**). 왜 나쁜지 이유를 괄호로 부연합니다.

### 4. 면접 대비 타임라인 (interviewTimeline)
- 면접 준비 시작 시점과 단계별 준비 방법을 **3줄 이내**로 간결하게 서술

⚠️ **분량 제한 (반드시 준수)**:
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

  const gradeContext = input.isGraduate
    ? `\n- 이 학생은 **졸업생**입니다. 생기부를 더 이상 수정할 수 없습니다.
- "세특 보완", "활동 추가", "성적 향상", "~를 보완하세요" 같은 교내 활동/학업 관련 제안을 **절대 하지 마세요**.
- completionStrategy는 **면접 대비, 수능 준비, 지원 전략 수립** 중심으로 작성하세요.`
    : grade === 3
      ? `\n- 이 학생은 **고3**입니다. 한국 대입은 ${currentYear}년 8월 31일이 생기부 마감 → 9월 초 수시 원서접수입니다.
- ✅ 생기부 활동(세특/탐구/동아리)은 반드시 **${currentYear}년 8월까지** 마무리하는 방향으로 제시하세요.
- ✅ 9월 이후 시점은 **면접 대비, 수능 마무리, 정시 지원 전략** 중심으로 작성하세요.`
      : grade === 2
        ? `\n- 이 학생은 2학년입니다. 다음 해 8월 31일이 생기부 마감이고, 그 직후 9월 초 수시 원서접수입니다.
- "3학년 1학기", "3학년 ${currentYear + 1}년 8월" 등을 지칭하지 말고 "남은 학기", "앞으로의 기간" 유연한 표현 사용.
- ❌ "3학년 1학기 내신을 1등급으로" → 아직 2학년이므로 부적절합니다.
- ✅ "남은 기간 성적을 끌어올려야 합니다", "다음 학년에서 ~를 보완"`
        : grade === 1
          ? `\n- 이 학생은 1학년입니다. 다다음 해 8월 31일이 생기부 마감입니다.`
          : "";

  return `## ⚠️⚠️⚠️ 현재 날짜: ${currentYear}년 ${currentMonth}월 (최우선 — 위반 시 품질 실패)${grade ? `\n- 학생 학년: ${grade}학년` : ""}
${gradeContext}

${
  input.isMedical
    ? `## ⚠️ 의·치·한·약·수 계열 실행 로드맵 규칙 (반드시 적용)
- 의·치·한·약·수는 경쟁이 매우 치열합니다. completionStrategy에 핵심 교과 성적 관리와 세특 심화 탐구 방향을 반드시 포함하세요.
- **영어 1등급 확보**를 위한 학습 방향을 completionStrategy에 포함하세요.
- 수학·과학 핵심 과목의 성적 관리 + 세특 심화 탐구를 병행하는 방향을 제시하세요.
`
    : ""
}## 작업
학생을 위한 생기부 마무리 전략과 (Premium) 사전 준비·세특 서술 가이드·면접 타임라인을 작성하세요.

## 서술 관점: 실행 플래너
이 섹션은 **생기부 마무리와 세특 작성 방향**을 제시합니다. 무엇을 어떻게 마무리해야 하는지를 명확히 서술하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 약점 재진단 (예: "탐구 깊이가 부족하다") → weaknessAnalysis에서 이미 다룸
- ❌ 성적 해석, 합격 가능성 판단 → academicAnalysis·admissionPrediction에서 다룸
- ❌ "교과 성적을 N등급으로 올리세요", "내신을 개선하세요", "성적 개선", "N등급 이내로 끌어올리세요" 등 성적 향상 목표 직접 언급 금지. 성적 분석은 academicAnalysis·consultantReview에서 다룹니다.
- ⚠️ 이 금지는 **completionStrategy 등 모든 출력 필드**에 적용됩니다.
- ✅ 로드맵에서는 구체적인 마무리 방향(세특 심화 탐구, 동아리 활동, 면접 준비 등)만 제시하세요. "수학 성적 개선" 대신 "수학 교과 세특에서 경제 모델링 탐구 심화"처럼 활동 중심으로 작성하세요.
- ⚠️ **표현 차별화**: 약점이나 성적을 언급할 경우, "마무리 방향의 동기"로만 1문장 이내로 언급하고 즉시 구체적 활동으로 넘어가세요.

## 출력 JSON 스키마

{
  "sectionId": "actionRoadmap",
  "title": "실행 로드맵",
  "completionStrategy": "1학기에 사회과학 심화 탐구를 중심으로...",
  "prewriteProposals": ["지역 복지 정책 비교 분석 보고서"],
  "evaluationWritingGuide": {
    "structure": ["활동동기", "주제", "방법", "내용", "결과", "소감"],
    "goodExample": "복지 정책의 효과성에 관심을 갖고 KOSIS 데이터를 활용하여...",
    "badExample": "복지 정책에 대해 조사하고 발표함."
  },
  "interviewTimeline": "9월부터 면접 준비 시작, 10월 모의 면접..."
}

## 조언 작성 원칙
- ⛔ **추천하는 활동·탐구 주제는 약점 분석과 입시 전략에서 감지된 강점 계열과 관련되어야 합니다.** 강점 계열과 무관한 분야의 활동(예: 정치외교 강점인데 마케팅/광고 활동 제안)을 추천하면 안 됩니다.
- ⛔ **completionStrategy에 "성적 개선", "성적 향상", "등급 끌어올리기" 등 성적 목표를 넣지 마세요.** 활동/탐구 중심으로만 작성합니다.
- 학생이 **앞으로 실행 가능한 것**만 제시하세요.
- "이수 완료 과목 정보"에 나열된 과목은 이미 확정된 성적이므로, 조언 대상에서 제외하세요.
- 학생이 수강 예정 과목을 입력한 경우, 성적 향상·과목 추천·탐구 주제 제안은 해당 과목 범위 내에서만 하세요. 수강 예정 과목에 없는 과목의 이수나 성적 향상을 권고하지 마세요.

## 학생 상태별 처리 규칙
- 학생 프로필의 "학생 상태"와 "분석 범위"를 반드시 확인하세요.
- **졸업생/N수생**: 이 프롬프트가 호출되지 않습니다 (파이프라인에서 자동 스킵).
- **고3 재학생**: 3학년 1학기까지의 데이터만 분석되었으므로, 3학년 2학기 및 이후 마무리 방향을 작성합니다.
- **고2 재학생 (2학년 데이터까지 입력)**: "3학년 때~" 시점부터 시작합니다.
- **고1 재학생 (1학년 데이터만 입력)**: "2학년 때~" 시점부터 시작합니다.
- ⚠️ **입력된 성적의 최대 학년 기준으로 "다음 학년부터"** 설명을 시작하세요.

## 단계별 추론 절차
1. **현재 시점 파악**: 학생의 학년과 현재 시기(학기 중/방학)를 확인하고, 남은 생기부 작성 기간을 계산합니다. 입력된 성적 데이터의 최대 학년/학기를 확인하여 다음 학년/학기부터의 마무리 방향을 세웁니다.
2. **약점 → 마무리 방향 변환**: 약점 분석 결과의 각 area를 구체적 마무리 방향으로 변환합니다. 추상적 조언("더 노력하세요")이 아닌 행동 가능한 방향("OO 주제로 실험 보고서 작성")을 설계합니다.
3. **입시 전략과 정합성 확인**: 입시 전략 결과의 추천 전형/대학에 맞춰 마무리 방향의 우선순위를 조정합니다. 학종이면 세특/활동 중심, 교과면 성적 관리 중심으로 설계합니다.
4. **실현 가능성 검증**: 각 방향이 고등학생이 실제 수행 가능한 범위인지 최종 점검합니다.

## 입력 데이터

### 약점 분석 결과
${input.weaknessAnalysisResult}

### 입시 전략 결과
${input.admissionStrategyResult}

### 학생 프로필
${input.studentProfile}

${input.completedSubjectsByYear ? `### 이수 완료 과목 정보\n${input.completedSubjectsByYear}\n⛔ 위 과목은 재이수 불가. 이수 완료 과목의 성적/성취도 향상을 절대 제시하지 마세요.` : ""}

${input.plannedSubjects ? `### 수강 예정 과목 정보\n${input.plannedSubjects}\n→ 학생이 수강 예정 과목을 입력한 경우, 성적 향상·과목 추천·탐구 주제 제안은 해당 과목 범위 내에서만 하세요. 수강 예정 과목에 없는 과목의 이수나 성적 향상을 권고하지 마세요.` : ""}

${PLAN_SPECIFIC[plan]}`;
};
