/** 섹션 10: 교과 세특 분석 (subjectAnalysis) */

import type { ReportPlan } from "../../types.ts";

export interface SubjectAnalysisPromptInput {
  subjectData: string;
  studentProfile: string;
}

const COMPETENCY_TAG_GUIDE = `## 역량 태깅 가이드
역량 태그는 반드시 아래 JSON 객체 형식으로 출력합니다. 문자열("학업역량-학업성취도")이 아닌 객체 형식을 사용하세요.

사용 가능한 태그:
- {"category": "academic", "subcategory": "학업성취도"}
- {"category": "academic", "subcategory": "학업태도"}
- {"category": "academic", "subcategory": "탐구력"}
- {"category": "career", "subcategory": "교과이수노력"}
- {"category": "career", "subcategory": "교과성취도"}
- {"category": "career", "subcategory": "진로탐색"}
- {"category": "community", "subcategory": "나눔과배려"}
- {"category": "community", "subcategory": "소통및협업"}
- {"category": "community", "subcategory": "리더십"}
- {"category": "community", "subcategory": "성실성"}
- {"category": "growth", "subcategory": "자기주도성"}
- {"category": "growth", "subcategory": "경험다양성"}
- {"category": "growth", "subcategory": "성장과정"}
- {"category": "growth", "subcategory": "창의적문제해결"}

선택적으로 assessment 필드를 추가할 수 있습니다: "우수" | "양호" | "미흡" | "부족"`;

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 분석 수준: 간략
- **주요 5과목만** 분석합니다. 나머지 과목은 출력하지 않습니다.
- 각 과목에 대해 다음을 출력하세요:
  - 평가 등급(rating): excellent / good / average / weak
  - 핵심 활동 요약(activitySummary): **2줄 이내**로 간결 작성
  - 평가 코멘트(evaluationComment): **2줄 이내**로 간결 작성
  - 역량 태깅(competencyTags): 해당 세특에서 드러나는 역량 태그 1~3개
- keyQuotes, detailedEvaluation, improvementDirection, improvementExample, sentenceAnalysis 필드는 출력하지 않습니다.`,
  standard: `## 분석 수준: 상세
### 과목 분류 및 분석 범위
- **상위 7개 과목만** 분석합니다. 반드시 7개 이하로 출력하세요. 8개 이상 과목은 절대 출력하지 마세요.
- 8번째 이후 과목은 과목명 + 등급(rating) + evaluationComment 1줄 요약만 출력합니다.

각 상세 분석 과목에 대해 Lite의 모든 항목 + 다음을 추가로 출력하세요:
- 원문 핵심 인용: 세특에서 평가에 중요한 문장 1~2개를 직접 인용
- 상세 평가: 전문 컨설턴트 수준의 핵심 평가 (2~3줄)
  - 이 과목의 세특이 왜 좋은지/부족한지 핵심만 서술
  - "과목다운 세특"인지 판단
- 개선 방향: 3학년 세특에서 보완할 구체적 방향 (1~2줄)
- 개선 예시 문장: 약한 부분이 있다면 구체적 예시 1개 제시 (2줄 이내)
- 교과 간 연결성은 storyAnalysis에서 분석하므로 crossSubjectConnections는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- evaluationComment는 반드시 **150자 이내**로 작성합니다. 150자를 초과하는 항목은 절대 출력하지 마세요.
- strengthPoints/weaknessPoints는 각 **최대 2개**, 각 항목 **80자 이내**로 작성합니다.
- detailedEvaluation은 **200자 이내**로 작성합니다.`,
  premium: `## 분석 수준: 정밀 (핵심 과목 집중)

### 과목 분류 및 분석 깊이
1. **핵심 과목 (전공 관련 상위 10개 과목)**: 상세 분석을 출력합니다. 10개를 초과하면 안 됩니다.
2. **11번째 이후 과목**: 과목명 + 등급(rating) + evaluationComment 1줄 요약만 출력합니다. detailedEvaluation, keyQuotes, improvementDirection, improvementExample, crossSubjectConnections는 생략합니다.

### 문장 단위 분석 (상위 2과목만)
- **전공 관련도가 가장 높은 2과목에 한해서만** sentenceAnalysis를 출력합니다.
- 각 과목당 sentenceAnalysis는 **최대 5문장**까지만 분석합니다.
- 나머지 과목은 sentenceAnalysis를 절대 포함하지 않습니다.

### 모든 과목 공통
- 중요도 퍼센트(importancePercent): 0~100%
- 평가 영향도(evaluationImpact): high / medium / low

⚠️ **중요도와 평가 영향도 정합성 규칙 (필수 준수)**:
- importancePercent와 evaluationImpact는 반드시 일치해야 합니다.
- importancePercent 20% 이상 → evaluationImpact: "high"
- importancePercent 10~19% → evaluationImpact: "medium"
- importancePercent 10% 미만 → evaluationImpact: "low"
- 같은 중요도 퍼센트를 가진 과목이 서로 다른 평가 영향도를 가지면 안 됩니다.

### crossSubjectConnections 생략
- 과목 간 연결 분석은 storyAnalysis 섹션에서 수행합니다. subjectAnalysis에서는 crossSubjectConnections를 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- evaluationComment는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- strengthPoints/weaknessPoints는 각 **최대 3개**, 각 항목 **100자 이내**로 작성합니다.
- detailedEvaluation은 **300자 이내**로 작성합니다.
- **sentenceAnalysis의 각 문장 evaluation**: **150자 이내**로 작성합니다.
- 나머지 과목은 evaluationComment **100자 이내** 1줄 요약만 작성합니다.`,
};

export const buildSubjectAnalysisPrompt = (
  input: SubjectAnalysisPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 세부능력 및 특기사항(세특)을 과목별로 분석하세요.

## 출력 JSON 스키마

중요: subjects 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다. 문자열 배열 절대 금지.

{
  "sectionId": "subjectAnalysis",
  "title": "과목별 분석",
  "subjects": [
    {
      "subjectName": "통합과학",
      "year": 1,
      "rating": "good",
      "competencyTags": [
        {"category": "academic", "subcategory": "탐구력"}
      ],
      "activitySummary": "에너지 전환 효율에 대한 탐구를 진행하고...",
      "evaluationComment": "과학적 탐구 과정이 잘 드러나며...",
      "keyQuotes": ["에너지를 생산하기 위해..."],
      "detailedEvaluation": "이 세특은...",
      "improvementDirection": "3학년에서는...",
      "improvementExample": "...",
      "crossSubjectConnections": [
        {"targetSubject": "물리학1", "connectionType": "주제연결", "description": "에너지 주제 심화"},
        {"targetSubject": "화학1", "connectionType": "역량연결", "description": "탐구력 공통 발현"}
      ],
      "sentenceAnalysis": [
        {
          "sentence": "원문 문장",
          "evaluation": "평가",
          "competencyTags": [{"category": "academic", "subcategory": "탐구력"}],
          "highlight": "positive",
          "improvementSuggestion": ""
        }
      ],
      "importancePercent": 15,
      "evaluationImpact": "medium"
    }
  ]
}

플랜별로 불필요한 필드는 생략 가능하지만, subjects 배열의 각 요소는 반드시 위와 같은 객체 형태여야 합니다.

**crossSubjectConnections의 connectionType은 반드시 다음 3개 중 하나:** "주제연결" | "역량연결" | "중복". 다른 값 사용 금지.

## 규칙
1. **교과 세특만** 분석합니다. 창체(자율·자치/동아리/진로)는 activityAnalysis에서 별도 분석합니다.
2. 평가는 반드시 원문 내용에 근거합니다.
3. 역량 태깅은 가장 두드러지는 역량 1~3개를 선택합니다.
4. 학년-과목명 형식으로 과목을 식별합니다 (예: "2학년 물리학1").
5. **"과목다운 세특" 관점을 반드시 적용합니다**: 해당 과목의 본질적 특성에 맞는 세특인지 평가합니다.
   - 수학 세특에는 수학적 사고/증명/모델링이, 물리학 세특에는 실험/현상 분석이 드러나야 합니다.
   - 과목 특성과 무관한 단순 소재 활용(예: 물리학 세특인데 자동차 역사 조사)은 감점 요인입니다.
6. **활동 밀도를 분석합니다**: 1500바이트(약 500자) 내 3개 이상 활동 나열은 깊이 부족으로 판단합니다.
   - 활동 수 대비 분량을 확인하고, 밀도가 낮은(=활동 수는 적지만 깊이 있는) 세특을 높이 평가합니다.
7. **평가자 관점 필수**: 원문을 요약·반복하지 마세요. "이 세특이 왜 좋은지/부족한지"를 판단하세요.
   - "~에 대한 탐구를 진행하였다"는 서술이지 평가가 아닙니다. 반드시 평가 판단을 추가하세요.
8. **개선 예시 문체 규칙**: improvementExample 등 세특 서술 예시는 반드시 "~함.", "~임.", "~됨." 등 세특 문체로 작성합니다. 존댓말("~합니다", "~입니다")은 세특 예시에서 절대 사용하지 마세요.
9. **요약-인용 중복 제거**: 과목명 하단의 요약 서술(activitySummary, 2줄 분량)과 핵심 인용(keyQuotes) 내용이 중복되는 경우, 요약 서술을 생략하고 핵심 인용만 남기세요.
10. **입학사정관 해석 관점**: evaluationComment 또는 detailedEvaluation에서 사정관이 이 세특을 읽었을 때 어떻게 평가할지를 자연스럽게 포함하세요.
   - 모든 과목에 넣으라는 것이 아닙니다. 사정관 해석이 의미 있는 과목(전공 관련 핵심 과목, 성적-세특 괴리가 있는 과목 등)에만 포함합니다.
   - 예시: "수학적 모델링까지 시도한 점은 사정관이 '교과 깊이를 갖춘 학생'으로 해석할 수 있는 근거가 됩니다."
   - 예시: "성적 대비 세특 내용이 빈약하여, 사정관이 '수업 참여도가 낮은 학생'으로 판단할 우려가 있습니다."

## Few-shot 예시 (반드시 이 톤과 수준으로 작성)

### evaluationComment 예시

**BAD (원문 반복 — 절대 금지):**
"에너지 전환 효율에 대해 실험을 설계하고 데이터를 분석하는 과학적 탐구 과정이 잘 드러나 있습니다."

**GOOD (전문 컨설턴트형 평가):**
"실험 설계→데이터 수집→결론 도출의 탐구 과정이 온전히 기술되어 물리학 세특의 핵심을 충족. 다만 오차 분석이나 변인 통제 논의가 빠져 '깊이'가 아쉬움. 3등급 물리학 세특 중 상위 수준."

### detailedEvaluation 예시

**BAD (칭찬 나열 — 절대 금지):**
"다양한 탐구 활동을 수행하며 학업역량과 탐구력이 잘 드러나 있습니다. 특히 데이터 분석 과정에서 뛰어난 역량을 보여줍니다."

**GOOD (구조적 평가):**
"[강점] 가설→실험→결론의 과학적 방법론을 충실히 따름. 에너지 전환 효율이라는 주제가 물리학 본질에 부합하여 '과목다운 세특'으로 평가. [약점] 500자 내 2개 활동을 기술하여 밀도는 적정하나, 두 번째 활동(열전달 실험)은 결론 없이 나열에 그쳐 깊이가 떨어짐. [입시 관점] 서울대·KAIST 수준에서는 수식·그래프 기반 분석이 없으면 변별력 부족."

### improvementDirection 예시

**BAD (모호한 방향):**
"3학년에서는 더 깊이 있는 탐구를 진행하면 좋겠습니다."

**GOOD (구체적 전략):**
"3학년 물리학2 세특에서 이 주제를 확장해 '카르노 효율 vs 실제 효율'을 정량 비교하고, 수식 기반 오차 분석을 포함하면 상위권 대학의 변별 기준을 충족할 수 있음."

### activitySummary 예시

**BAD (원문 복붙):**
"에너지 전환 효율에 대한 실험을 설계하고 데이터를 분석하여 결과를 도출함."

**GOOD (핵심 판단 포함):**
"에너지 전환 효율 실험 설계 및 분석 — 과학적 방법론 준수, 물리학 본질 부합. 단, 정량적 오차 분석 부재."

${COMPETENCY_TAG_GUIDE}

## 학생 프로필
${input.studentProfile}

## 교과 세특 원문 데이터
${input.subjectData}

${PLAN_SPECIFIC[plan]}`;
};
