/** 섹션 11: 행동특성 분석 (behaviorAnalysis) -- Standard+ */

import type { ReportPlan } from "../../types.ts";

export interface BehaviorAnalysisPromptInput {
  behavioralAssessment: string;
  competencyExtraction: string;
  studentProfile: string;
  /** 학생의 현재 학년 (1, 2, 3) */
  studentGrade: number;
}

const PLAN_VOLUME_GUIDE: Record<ReportPlan, string> = {
  lite: "",
  standard: `⚠️ **분량 제한 (반드시 준수)**:
- overallComment + admissionRelevance를 합쳐 **300자 이내**로 작성합니다. 300자 초과 금지.
- consistentTraits 배열은 **최대 3개**입니다. 4개 이상 절대 출력하지 마세요.
- 각 yearlyAnalysis의 summary는 **100자 이내**로 작성합니다.`,
  premium: `⚠️ **분량 제한 (반드시 준수)**:
- overallComment + admissionRelevance를 합쳐 **500자 이내**로 작성합니다. 500자 초과 금지.
- consistentTraits 배열은 **최대 5개**입니다. 6개 이상 절대 출력하지 마세요.
- 학년별 변화를 포함하되, 각 yearlyAnalysis의 summary는 **150자 이내**로 작성합니다.`,
};

export const buildBehaviorAnalysisPrompt = (
  input: BehaviorAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 행동특성 및 종합의견을 학년별로 분석하고, 입시에서의 활용 포인트를 도출하세요.

## 이 섹션의 역할
담임교사가 작성한 행동특성 텍스트에서 **인성, 태도, 리더십, 협업 등 일관된 성격 특성**을 추출합니다.
창체 활동 내용은 activityAnalysis, 세특 탐구 내용은 subjectAnalysis에서 다루므로, 여기서는 담임 서술에 드러난 인성적 특성에 집중합니다.
## 서술 관점: 인성 관찰자
이 섹션은 **담임 기록에서 드러나는 성격 특성과 태도**를 추출합니다. 인성·리더십·협업 등 정성적 특성을 중심으로 서술하세요.
- "~한 성향이 일관되게 나타난다", "담임 서술에서 ~특성이 반복적으로 확인된다" 등 인성 관찰 어투를 사용하세요.
- 다른 섹션에서 이미 사용한 표현이나 문장 구조를 반복하지 마세요.

## 출력 JSON 스키마

중요: yearlyAnalysis 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "behaviorAnalysis",
  "title": "행동특성 분석",
  "yearlyAnalysis": [
    {
      "year": 1,
      "summary": "성실하고 책임감 있는 학생으로 학급 활동에 적극 참여...",
      "competencyTags": [
        {"category": "community", "subcategory": "성실성"},
        {"category": "community", "subcategory": "리더십"}
      ],
      "keyQuotes": ["학급 내에서 모범적인 생활 태도를 보이며..."]
    },
    {
      "year": 2,
      "summary": "자기주도적 학습 태도가 강화되어...",
      "competencyTags": [
        {"category": "growth", "subcategory": "자기주도성"}
      ],
      "keyQuotes": ["스스로 학습 계획을 세우고..."]
    }
  ],
  "consistentTraits": ["자기주도적 학습 태도", "또래 학습 도움", "성실한 과제 수행"],
  "overallComment": "행동특성에서 일관되게 성실성과 리더십이 드러나며...",
  "admissionRelevance": "면접에서 리더십 경험을 구체적으로..."
}

## 현재 학년 정보
- 학생의 현재 학년: ${input.studentGrade}학년
- **현재 학년 이후의 데이터가 없는 것은 당연합니다.** 아직 해당 학년이 종료되지 않았거나 시작되지 않았기 때문입니다.

## ⛔ 기록 부재 언급 금지 (절대 준수)
- "N학년 기록이 부재하여 아쉽습니다", "N학년 데이터가 없어 분석이 제한됩니다" 등 **기록 부재에 대한 부정적 언급은 절대 금지**합니다.
- 데이터가 없는 학년은 분석에서 제외하고, 존재하는 학년의 데이터만으로 분석하세요.
- overallComment, admissionRelevance에서도 "기록이 부재하여", "데이터가 부족하여" 등의 표현을 사용하지 마세요.

## 규칙
1. 행동특성 및 종합의견은 담임교사가 작성하는 총평으로, 학생의 인성과 태도를 종합 판단하는 자료입니다.
2. 학년별로 어떤 특성이 강조되는지 분석합니다. **데이터가 없는 학년은 yearlyAnalysis에 포함하지 마세요.**
3. 여러 학년에 걸쳐 일관되게 등장하는 특성을 식별합니다 (일관성 = 높은 신뢰도).
4. 형식적 표현과 구체적 행동 서술을 구분합니다.
5. 입학사정관이 행동특성에서 주로 확인하는 항목 (우선순위 순):
   - 학업 태도 (수업 참여도, 질문/토론, 자기주도성) — 가장 우선
   - 성실성 (역할 이행, 과제 수행, 일관성)
   - 배려와 협업 (타인 도움, 의사소통, 모둠 활동)
   - 리더십 (임원/부장 등 역할명보다 구체적 에피소드가 있는지가 핵심)
   - ⚠️ 학생회/반장/임원 활동은 필수 요소가 아닙니다. 대학은 "리더"보다 "탐구하는 학생"을 선호합니다.
   - 구체적 에피소드가 있는 서술 vs 일반적 칭찬
6. **평가자 관점 필수**: 원문을 반복·요약하지 마세요. "무엇이 좋은지/부족한지"를 판단하세요.
   - 형식적 칭찬("밝고 명랑한 성격")은 입시에서 변별력이 없다고 명확히 지적하세요.
   - 구체적 에피소드가 있는 서술과 없는 서술의 차이를 반드시 구분하세요.

## 입학사정관 관점 (필수)
- "~우수하다고 평가됩니다" 대신 구체적으로 어떤 역량 평가에서 어떻게 반영되는지 서술
- BAD: "공동체역량이 우수하다고 평가됩니다"
- GOOD: "공동체역량 측면에서 협업 및 의사소통, 자기관리 역량에서 긍정 평가받을 요소로, 특히 면접평가에서 공동체역량 반영 비율이 높은 대학에서 질문을 받을 수 있습니다."

## Few-shot 예시 (반드시 이 톤과 수준으로 작성)

### BAD (원문 반복형 — 절대 금지):
summary: "학급 부반장으로서 급우들의 학교생활 적응을 도왔으며, 성실한 학업 태도를 유지하였습니다."
overallComment: "성실하고 책임감 있는 학생으로, 학급 활동에 적극적으로 참여하며 모범적인 생활 태도를 보였습니다."

### GOOD (전문 컨설턴트형 평가):
summary: "부반장 역할이 기재되었으나 구체적 에피소드가 없어 리더십 증거로서 변별력이 약함. '급우 도움'이 어떤 상황에서 어떻게 이루어졌는지 서술이 필요했음."
overallComment: "3년간 행동특성에서 '성실', '모범적'이라는 형용사가 반복되나, 이는 대부분의 학생 기록에 등장하는 관용 표현으로 변별력이 낮음. 입학사정관은 '어떤 상황에서 어떤 행동을 했는가'를 봄. 2학년 학급 갈등 중재 에피소드만 유일하게 구체적이며, 이것이 이 학생의 행동특성에서 가장 강한 증거임."

### BAD (긍정 편향형 — 절대 금지):
admissionRelevance: "리더십과 성실성이 잘 드러나 면접에서 좋은 평가를 받을 수 있습니다."

### GOOD (입시 전략 제시형):
admissionRelevance: "현재 행동특성은 관용 표현 위주로, 면접 시 '구체적으로 어떤 상황이었나요?'라는 후속 질문에 취약함. 2학년 갈등 중재 경험을 STAR(상황-과제-행동-결과) 구조로 준비해야 함. 반면 학업 태도 관련 기술은 교과 성적과 세특으로 이미 증명되므로 면접에서 별도로 강조할 필요 없음."

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
- 면접에서 행동특성 내용을 어떻게 활용할 수 있는지 조언합니다 (3~5줄).
- 특히 인성 면접 질문과 연결 가능한 에피소드를 식별합니다.

### 역량 태그 형식
역량 태그는 반드시 JSON 객체 형식으로 출력합니다:
- {"category": "academic"|"career"|"community"|"growth", "subcategory": "하위역량명"}
- 문자열("학업역량-학업성취도")이 아닌 객체 형식을 사용하세요.

${PLAN_VOLUME_GUIDE[plan]}`;
};
