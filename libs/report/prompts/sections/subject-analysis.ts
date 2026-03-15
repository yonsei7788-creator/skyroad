/** 섹션 10: 교과 세특 분석 (subjectAnalysis) */

import type { ReportPlan } from "../../types.ts";
import { SESPEC_EXPRESSION_GUIDE } from "../../constants/major-evaluation-criteria.ts";

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

⚠️ **과목 수 제한 (절대 준수)**: subjects 배열에 **정확히 5개 과목만** 출력하세요. 6개 이상 출력 금지.

### 과목 선택 우선순위 (반드시 이 순서대로 5개 선별)
1. **전공 핵심 교과** (이공계: 수학·물리학·기하·화학, 인문계: 사회·문화·정치와법·경제) — 최우선
2. **국어, 영어** — 공통 핵심
3. **전공 관련 탐구과목** (이공계: 생명과학·지구과학, 인문계: 세계사·동아시아사·윤리)
4. 위 과목이 5개 미만이면 나머지 일반선택과목으로 보충

⚠️ **절대 선택하면 안 되는 과목**: 정보, 독서, 기술·가정, 제2외국어(일본어·중국어·독일어 등), 한문, 교양, 보건, 체육, 음악, 미술. 이 과목들은 학종 핵심 평가 대상이 아니므로 5개 안에 절대 포함하지 마세요. 컴퓨터공학과 지망이라도 정보 과목은 포함하지 마세요.

### 중요도 규칙 (Lite에서도 적용)
- importancePercent와 evaluationImpact를 반드시 출력하세요.
- 전공 핵심 교과: 중요도 25~40%, evaluationImpact: "very_high" 또는 "high"
- 국어/영어: 중요도 10~15%, evaluationImpact: "medium"
- 나머지: 중요도 5~10%

### 출력 필드
- 평가 등급(rating): excellent / good / average / weak
- 핵심 활동 요약(activitySummary): **2줄 이내**로 간결 작성
- 평가 코멘트(evaluationComment): **2줄 이내**로 간결 작성. ⚠️ 생기부 내용을 반복하지 말고, **입학사정관이 이 세특을 어떻게 평가할지**를 판단하세요.
- 역량 태깅(competencyTags): 해당 세특에서 드러나는 역량 태그 1~3개
- importancePercent, evaluationImpact
- keyQuotes, detailedEvaluation, improvementDirection, improvementExample, sentenceAnalysis 필드는 출력하지 않습니다.

### ⚠️ 장점만 나열 금지
- evaluationComment에서 장점과 부족한 점을 반드시 함께 언급하세요.
- 5개 과목 중 최소 2개는 부족한 점이나 아쉬운 점을 명확히 지적해야 합니다.
- "탐구력이 우수합니다"로만 끝나지 마세요. "다만 ~이 빠져 있어 ~합니다"를 반드시 추가하세요.`,
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

### ⚠️ importancePercent / evaluationImpact 일관성 규칙
같은 importancePercent를 가진 과목은 반드시 같은 evaluationImpact를 가져야 합니다:
- importancePercent 30% 이상 → evaluationImpact: "very_high"
- importancePercent 20~29% → evaluationImpact: "high"
- importancePercent 10~19% → evaluationImpact: "medium"
- importancePercent 5~9% → evaluationImpact: "low"
- importancePercent 5% 미만 → evaluationImpact: "very_low"

⚠️ **분량 제한 (반드시 준수 — JSON 파싱 오류 방지)**:
- evaluationComment는 반드시 **150자 이내**로 작성합니다. 150자를 초과하는 항목은 절대 출력하지 마세요.
- strengthPoints/weaknessPoints는 각 **최대 2개**, 각 항목 **80자 이내**로 작성합니다.
- detailedEvaluation은 **200자 이내**로 작성합니다.
- improvementDirection은 **100자 이내**, improvementExample은 **150자 이내**로 작성합니다.
- keyQuotes는 과목당 **최대 2개**, 각 인용 **100자 이내**로 작성합니다.
- ⛔ 전체 JSON 출력이 20,000자를 초과하면 안 됩니다. 분량이 길어지면 하위 우선순위 과목의 내용을 축약하세요.`,
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
- 평가 영향도(evaluationImpact): "very_high" / "high" / "medium" / "low" / "very_low"

⚠️ **중요도와 평가 영향도 정합성 규칙 (필수 준수)**:
- importancePercent와 evaluationImpact는 반드시 일치해야 합니다.
- importancePercent 30% 이상 → evaluationImpact: "very_high"
- importancePercent 20~29% → evaluationImpact: "high"
- importancePercent 10~19% → evaluationImpact: "medium"
- importancePercent 5~9% → evaluationImpact: "low"
- importancePercent 5% 미만 → evaluationImpact: "very_low"
- 같은 중요도 퍼센트를 가진 과목이 서로 다른 평가 영향도를 가지면 안 됩니다.
- ⚠️ evaluationImpact는 반드시 영문 값("very_high"/"high"/"medium"/"low"/"very_low")을 사용하세요. "매우 높음", "높음", "보통", "낮음" 등 한글 금지.

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

## ⛔ 과목 다양성 규칙 (필수 — 위반 시 품질 실패)
- **같은 교과군(수학, 과학, 국어, 영어, 사회)에서 최대 2개 과목만** 분석 대상에 포함하세요.
- 예: 수학, 수학Ⅰ, 수학Ⅱ, 기하가 모두 있어도 **수학 관련 과목은 최대 2개만** 선택합니다.
- 같은 교과군 내에서는 학년이 높은(최근) 과목, 전공 관련도가 높은 과목을 우선합니다.
- 나머지 자리에는 **다른 교과군** 과목을 배치하여 생기부 전반을 균형 있게 분석합니다.
- 특히 **전공 핵심 과목의 약점**(낮은 등급)이 있는 과목은 반드시 분석에 포함하세요.

## ⛔ 과목 분류 (이 규칙이 모든 다른 규칙보다 우선합니다)

분석을 시작하기 전에, 학생의 목표 학과를 확인하고 아래 기준으로 과목을 분류하세요.
**이 분류 결과가 importancePercent, evaluationImpact, evaluationComment, detailedEvaluation 등 모든 출력에 반영되어야 합니다.**

### ⚠️ majorEvaluationContext 기반 과목 분류 (최우선)
1단계: majorEvaluationContext의 "핵심 권장과목"/"권장과목" 목록을 확인하세요.
2단계: 해당 목록에 포함된 과목은 아래 기본 분류보다 우선합니다.
- 핵심 권장과목 → importancePercent: 30~40%, evaluationImpact: "very_high"
- 권장과목 → importancePercent: 15~25%, evaluationImpact: "high"
- 위 목록에 없는 일반 과목 → 기존 분류 규칙 적용

### 비핵심 과목 (importancePercent: 2~5%, evaluationImpact: "very_low")
다음 과목들은 **어떤 학과를 지망하든** 학종 평가에서 핵심이 아닙니다.
**사정관들은 이 과목들을 학업에 직접적인 영향이 없는 것으로 보고, 성실도를 볼 때 참고하는 정도입니다.**

- **정보**: 고교 정보는 1학년 1~2단위 기초 과목으로, 컴퓨터공학과 지망이라도 입학사정관은 수학·물리학 세특으로 전공 적합성을 판단합니다. 정보 세특은 "관심 확인" 수준일 뿐 변별력이 없습니다.
- 제2외국어: 일본어, 중국어, 독일어, 프랑스어, 스페인어, 러시아어, 아랍어, 베트남어
- 교양/실생활: 기술·가정, 독서, 한문, 교양, 보건, 환경, 논리학
- 예체능: 체육, 음악, 미술

⚠️ 비핵심 과목의 evaluationComment/detailedEvaluation 작성 시:
- ❌ "전공 적합성이 높다", "핵심 과목으로서 중요하다", "입학사정관이 주목할 것이다"
- ❌ importancePercent를 10% 이상 부여하면 안 됩니다 (이과 학생이든 문과 학생이든 동일)
- ✅ "학종 평가에서 보조적 과목으로, 성실성 확인 수준으로 반영됩니다", "전공 핵심 과목은 아니지만 수업 태도를 보여줍니다"

### ⚠️ 이과 학생 과목 중요도 배분 (필수)
이과(자연/공학/의약학) 학생의 경우:
- 수학 관련 과목: importancePercent 25~35%
- 과학 관련 과목(물리/화학/생명과학/지구과학): importancePercent 25~35%
- 국어/영어: importancePercent 10~15%
- 사회탐구: importancePercent 5~10%
- 비핵심 과목(정보, 한문, 기가, 제2외국어 등): importancePercent **2~5% (절대 10% 이상 부여 금지)**

⚠️ 비핵심 과목의 중요도가 전공 핵심 과목보다 높게 나오면 안 됩니다. 생명과학 지망 학생에게 정보 과목이 10% 이상이면 오류입니다.

### 전공 핵심 과목 (importancePercent: 25~40%, evaluationImpact: "very_high" 또는 "high")
- 이공계: 수학, 미적분, 기하, 확률과통계, 물리학, 화학, 생명과학 (전공에 따라)
- 인문사회: 사회·문화, 정치와법, 경제, 세계사, 동아시아사, 윤리와사상
- 의약학: 생명과학, 화학, 수학

### 공통 기초 과목 (importancePercent: 10~15%, evaluationImpact: "medium")
- 국어, 영어, 문학, 언어와매체, 화법과작문

### 비관련 탐구 과목 (importancePercent: 5~10%, evaluationImpact: "low")
- 이공계 학생의 사회탐구, 인문계 학생의 과학탐구 등

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
7. **평가자 관점 필수 (최우선)**: 원문을 요약·반복하지 마세요. "이 세특이 왜 좋은지/부족한지"를 판단하세요.
   - "~에 대한 탐구를 진행하였다"는 서술이지 평가가 아닙니다. 반드시 평가 판단을 추가하세요.
   - **evaluationComment에 반드시 "입학사정관" 또는 "평가" 또는 "전형" 키워드가 포함되어야 합니다.**
   - ⛔ "실험했으니 탐구력 긍정", "모델링했으니 사고력 우수" 같은 **당연한 매핑은 금지**입니다. 대신 "이 세특이 같은 등급대 다른 학생의 세특과 비교해서 특별한가, 흔한가"를 판단하세요.
   - BAD: "에너지 효율에 대한 실험을 설계하고 분석하여 탐구력을 보여주었습니다."
   - BAD: "수학적 모델링을 활용하여 학업역량이 우수합니다." (모델링→학업역량은 당연한 매핑)
   - GOOD: "실험 설계부터 분석까지의 과정이 기술되어 있어, 같은 등급대 학생 대비 탐구의 완결성이 높은 편입니다. 다만 오차 분석이 빠져 상위권 대학에서는 깊이가 부족하다고 판단될 겁니다."
8. **개선 예시 문체 규칙**: improvementExample 등 세특 서술 예시는 반드시 "~함.", "~임.", "~됨." 등 세특 문체로 작성합니다. 존댓말("~합니다", "~입니다")은 세특 예시에서 절대 사용하지 마세요.
9. **요약-인용 중복 제거**: 과목명 하단의 요약 서술(activitySummary, 2줄 분량)과 핵심 인용(keyQuotes) 내용이 중복되는 경우, 요약 서술을 생략하고 핵심 인용만 남기세요.
10. **입학사정관 해석 관점**: evaluationComment 또는 detailedEvaluation에서 사정관이 이 세특을 읽었을 때 어떻게 평가할지를 자연스럽게 포함하세요.
   - 모든 과목에 넣으라는 것이 아닙니다. 사정관 해석이 의미 있는 과목(전공 관련 핵심 과목, 성적-세특 괴리가 있는 과목 등)에만 포함합니다.
   - 예시: "수학적 모델링까지 시도한 점은 사정관이 '교과 깊이를 갖춘 학생'으로 해석할 수 있는 근거가 됩니다."
   - 예시: "성적 대비 세특 내용이 빈약하여, 사정관이 '수업 참여도가 낮은 학생'으로 판단할 우려가 있습니다."
11. **형식적 표현 패턴 탐지 (필수)**: 세특에서 아래 표현이 발견되면 evaluationComment에서 반드시 단점으로 지적하세요.
   - "자기주도적으로 탐구함" (구체적 과정 없음) → "구체적 탐구 과정이 서술되지 않아 다른 학생에게도 동일하게 기재 가능한 표현으로, 독창성이 드러나지 않습니다."
   - "~을 알게 됨", "~을 이해함"으로 끝나는 마무리 → "단순 조사 수준의 마무리로, 탐구 과정이 있었더라도 평가 효과가 제한적입니다."
   - "~하고 싶다" 반복 → "의지만 표명되고 실천 사례가 없어 실천력 측면에서 부정적으로 평가될 수 있습니다."
   - "~을 기대함" → "원론적 의견으로 평가에 영향이 미미합니다."
   - "~을 탐색함" (결과 없음) → "관심 표명 수준으로, 탐구력 근거로 불충분합니다."
   - 이러한 표현이 전혀 없는 세특은 거의 없으므로, 최소 절반 이상의 과목에서 표현상 한계를 지적해야 합니다.

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

${PLAN_SPECIFIC[plan]}

${plan !== "lite" ? SESPEC_EXPRESSION_GUIDE : ""}`;
};
