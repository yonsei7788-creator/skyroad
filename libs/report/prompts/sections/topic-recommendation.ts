/** 섹션 14: 세특 주제 추천 (topicRecommendation) */

import type { ReportPlan } from "../../types.ts";

export interface TopicRecommendationPromptInput {
  subjectAnalysisResult: string;
  weaknessAnalysisResult: string;
  studentProfile: string;
  isGyogwaOnly?: boolean;
  /** AI가 생기부 분석을 통해 판단한 추천 학과 (majorExploration 결과, 최대 2개) */
  aiRecommendedMajors?: string[];
  /** 학생이 입력한 수강 예정 과목 텍스트 */
  plannedSubjects?: string;
  studentGrade?: number;
  isGraduate?: boolean;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- **3개** 주제를 출력합니다.
- 각 주제: topic + relatedSubjects + description(**150자 이내**) + importance(high/medium/low)
- description에 입시 효과를 1문장 포함합니다.
- rationale, existingConnection, activityDesign, sampleEvaluation 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- 각 주제: topic + relatedSubjects + description + rationale(주제 선정 이유) + existingConnection(기존 탐구 연결) + importance(high/medium/low)

⚠️ **분량 제한 (반드시 준수)**:
- topics 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 description은 반드시 **150자 이내**로 작성합니다 (입시 효과 포함).
- 각 rationale은 **200자 이내**로 작성합니다.

⚠️ **existingConnection 작성 규칙**:
- "~와 연결됩니다", "~를 심화하여" 등 AI스러운 지시문 톤 금지
- 구체적으로 어떤 세특의 어떤 탐구와 어떻게 이어지는지 서술하세요.
- BAD: "2학년 수학Ⅱ의 '미분을 활용한 태양광 발전 효율성 분석' 탐구와 연결됩니다."
- GOOD: "2학년 수학Ⅱ에서 미분으로 태양광 발전 효율을 분석한 경험이 있으므로, 이를 인공지능 알고리즘 최적화로 확장하면 탐구의 일관성과 심화를 동시에 보여줄 수 있습니다."`,
  premium: `## 플랜별 출력: 정밀
- Standard의 모든 항목 + activityDesign(구체적 탐구 설계: steps 3단계 이내/expectedResult 1줄, ⚠️ duration 필드는 출력하지 마세요) + sampleEvaluation(세특 서술 예시, 3줄 이내) + importance(high/medium/low)

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
  const gyogwaOnlyContext = input.isGyogwaOnly
    ? `## ⛔ 교과전형 전용 (이 규칙이 다른 모든 지시보다 우선)
이 학생은 모든 희망대학이 학생부교과전형입니다.
- description에 "학생부종합전형에서 ~역량을 평가", "학종에서 긍정적 평가" 등의 표현을 사용하지 마세요.
- 대신 "교과 학습 역량 강화에 도움", "교과전형 서류평가에서 긍정적 요소" 등으로 작성하세요.
- 탐구 주제 추천은 학생의 학업 역량 강화와 교과 성적 향상 관점에서 제시합니다.

`
    : "";

  const graduateContext = input.isGraduate
    ? `## ⚠️ 졸업생 규칙 (최우선)
이 학생은 **졸업생**입니다. 생기부를 더 이상 수정할 수 없습니다.
- "향후 세특에 활용할 주제" 대신 **"면접에서 활용할 탐구 주제"**로 전환하세요.
- description에서 "세특에 작성하면...", "3학년에서 탐구하면...", "~를 보완하세요" 같은 표현을 **절대 사용하지 마세요**.
- "이 주제는 ~관점으로 정리하면 면접에서 진로역량을 어필할 수 있습니다", "이 주제를 ~와 연결하면 탐구의 일관성을 보여주기에 효과적입니다" 등으로 작성하세요.
- 주제 자체는 동일하게 추천하되, 활용 맥락을 **면접에서의 설명 관점**으로 바꾸세요.

`
    : "";

  return `${gyogwaOnlyContext}${graduateContext}## 작업
${input.isGraduate ? "학생의 면접에서 활용할 수 있는 탐구 주제를 맞춤 추천하세요." : "학생의 향후 세특에 활용할 수 있는 탐구 주제를 맞춤 추천하세요."}

## 서술 관점: 탐구 설계자
${input.isGraduate ? "이 섹션은 **면접에서 활용할 탐구 주제**를 설계합니다. 기존 탐구의 확장 관점과 면접 답변에서의 활용 방법을 중심으로 서술하세요." : "이 섹션은 **향후 세특에 활용할 구체적 탐구 주제**를 설계합니다. 기존 탐구의 확장 가능성과 실현 방법을 중심으로 서술하세요."}
- "기존 ~탐구를 확장하여 ~주제로 발전시킬 수 있다", "~과목에서 ~방향의 탐구가 효과적이다" 등 주제 설계 어투를 사용하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 성적·등급 언급, 약점 재진단 → academicAnalysis·weaknessAnalysis에서 다룸
- ❌ 세특 내용의 질적 평가 (이미 기록된 세특에 대한 판단) → subjectAnalysis에서 다룸
- ✅ 이 섹션에서 할 것: **향후 탐구 주제 설계**만. 기존 세특의 평가가 아닌 미래 주제 제안에 집중하세요.

## ⚠️ 분석 방향 원칙 (최우선 — 반드시 준수)
주제 추천의 기반은 **생기부에서 실제로 축적된 탐구 방향**입니다.
단, 아래 "AI 분석 기반 추천 학과"가 제공된 경우, 해당 학과 방향성과 연결되는 주제를 우선 추천하세요.
이는 학생의 희망학과가 아니라 **생기부 분석을 통해 AI가 자체적으로 판단한 적합 학과**입니다.

${
  input.aiRecommendedMajors && input.aiRecommendedMajors.length > 0
    ? `### AI 분석 기반 추천 학과
${input.aiRecommendedMajors.map((m, i) => `${i + 1}순위: ${m}`).join("\n")}

위 학과 방향과 관련된 주제를 우선 배치하되, 생기부에 근거가 없는 주제를 억지로 만들지는 마세요.`
    : "추천 학과 정보가 없으므로 생기부 탐구 흐름만으로 주제를 추천하세요."
}

- "전공적합성을 어필" 같은 표현 대신, "기존 탐구를 심화/확장" 관점으로 작성하세요.

## 출력 JSON 스키마

중요: topics 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "topicRecommendation",
  "title": "주제 추천",
  "topics": [
    {
      "topic": "지역 복지 정책의 효과성 비교 분석",
      "relatedSubjects": ["사회탐구"],
      "description": "국내 지자체별 복지 정책을 비교 분석하여...",
      "importance": "high",
      "rationale": "기존 사회·문화 탐구를 정책 분석으로 심화...",
      "existingConnection": "2학년 사회·문화에서 복지 문제를 다룬 것과 연결...",
      "activityDesign": {
        "steps": ["1단계: 지자체별 복지 예산 데이터 수집", "2단계: 정책 효과 비교 기준 설정", "3단계: 분석 및 보고서 작성"],
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
3. 생기부에서 드러나는 강점 계열과 관련성이 높은 주제 (희망 학과가 아닌 생기부 기반 계열)
4. 탐구 깊이를 보여줄 수 있는 주제 (단순 조사가 아닌, 실험/분석/비교/모델링 등)

## 엮으면 좋은 과목 영역 규칙
- 각 추천 주제의 relatedSubjects는 **대분류 과목 영역 1개만** 출력하세요.
- 허용되는 대분류 목록: 국어, 영어, 수학, 사회, 과학, 사회탐구, 과학탐구
- 정보, 예체능, 제2외국어/한문, 한국사 등 비주요 교과는 절대 포함하지 마세요.
- 세부 과목명(예: 사회·문화, 생명과학1, 영어Ⅱ)이 아닌 위 대분류 과목 영역 중 하나를 선택합니다.
- 가장 직접적으로 관련된 핵심 과목 영역 1개만 선택합니다.

## 규칙
- 학생이 수강 예정 과목을 입력한 경우, 성적 향상·과목 추천·탐구 주제 제안은 해당 과목 범위 내에서만 하세요. 수강 예정 과목에 없는 과목의 이수나 성적 향상을 권고하지 마세요.
- 추천 주제는 고등학생이 실제로 수행 가능한 수준이어야 합니다.
- 기존 세특에서 이미 다룬 주제와 직접 겹치면 안 됩니다 (확장/심화는 가능).
- 각 주제는 서로 다른 과목과 연계되어야 합니다.
- **입시 효과 분석 필수**: 각 주제에 대해 "이 주제를 탐구하면 입시에서 어떤 효과가 있는지"를 반드시 포함하세요.
  - 예: "기존 탐구의 연장선으로 진로역량 심화 가능", "부족한 탐구 깊이를 보완하여 학업역량 어필 가능"
  - rationale 또는 description에 입시 효과를 자연스럽게 녹여내세요.
- **외부 활동 추천 금지**: 학원, 온라인 강좌, 외부 대회, 사설 프로그램 등 학교 밖 활동은 추천하지 마세요. 교과 수업 내에서 수행 가능한 탐구만 추천합니다.

## 추천 주제 설명 규칙
- 각 추천 주제의 설명에 반드시 "이 활동을 하면 입시에서 어떤 효과가 있는지"를 포함하세요.
- **"~분석합니다", "~탐구합니다", "~연구합니다"로 끝나는 AI 지시문 톤 절대 금지.**
  - BAD: "사회 문제의 원인을 데이터로 분석합니다"
  - GOOD: "사회 문제를 데이터로 분석하는 탐구입니다. 기존 통계 분석 활동의 연장선으로 진로역량의 깊이를 보여줄 수 있습니다."
- 설명은 최소 2~3줄로 작성하세요.
- description 문장의 종결어미는 "~입니다", "~됩니다", "~있습니다", "~좋겠습니다"만 사용하세요.
- **입학사정관 관점의 긍정적 요인 필수 포함**: description 마지막 문장에 반드시 "학생부종합전형에서 ~역량을 중점적으로 평가하는 대학에서는 긍정적 평가를 받을 요소가 됩니다" 또는 "진로역량을 중시하는 대학의 경우 깊이 있는 탐구로 인정받을 수 있습니다" 등 입학사정관이 해당 주제를 어떻게 평가할지 구체적으로 서술하세요.
  - BAD: "컴퓨터공학과의 핵심 역량을 어필할 수 있습니다."
  - GOOD: "학생부종합전형 중 진로역량을 중점적으로 평가하는 대학에서는 해당 분야의 깊이 있는 탐구로 긍정적 평가를 받을 수 있습니다."

## 입력 데이터

### 세특 분석 결과
${input.subjectAnalysisResult}

### 약점 분석 결과
${input.weaknessAnalysisResult}

### 학생 프로필
${input.studentProfile}

${input.plannedSubjects ? `### 수강 예정 과목 정보\n${input.plannedSubjects}` : ""}

${PLAN_SPECIFIC[plan]}`;
};
