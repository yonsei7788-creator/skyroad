/** 섹션 10: 교과 세특 분석 (subjectAnalysis) */

import type { ReportPlan } from "../../types.ts";
import { SESPEC_EXPRESSION_GUIDE } from "../../constants/major-evaluation-criteria.ts";

export interface SubjectAnalysisPromptInput {
  subjectData: string;
  studentProfile: string;
  studentGrade: number;
  isGraduate?: boolean;
  isMedical?: boolean;
  gradingSystem?: "5등급제" | "9등급제";
  isGyogwaOnly?: boolean;
  detectedMajorGroupLabel?: string;
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

선택적으로 assessment 필드를 추가할 수 있습니다: "우수" | "보통" | "미흡" | "부족"`;

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 분석 수준: 간략

⚠️ **과목 수 제한 (절대 준수)**: subjects 배열에 **정확히 5개 과목만** 출력하세요. 6개 이상 출력 금지.

### 과목 선택 우선순위 (반드시 이 순서대로 5개 선별)
%%SUBJECT_PRIORITY%%

⚠️ **절대 선택하면 안 되는 과목**: 정보, 독서, 기술·가정, 제2외국어(일본어·중국어·독일어 등), 한문, 교양, 보건, 체육, 음악, 미술. 이 과목들은 학종 핵심 평가 대상이 아니므로 5개 안에 절대 포함하지 마세요. 컴퓨터공학과 지망이라도 정보 과목은 포함하지 마세요.

### evaluationImpact 규칙 (Lite에서도 적용 — 필수)
evaluationImpact를 반드시 출력하세요. importancePercent는 출력하지 마세요.

**계열별 evaluationImpact 기준:**

%%EVALUATION_IMPACT%%

⚠️ **이과 학생에게 수학/과학을 "medium" 이하로 평가하면 품질 실패입니다.** 수학·과학은 이공계의 핵심 교과이므로 반드시 "very_high" 또는 "high"여야 합니다.
⚠️ **국어/영어는 계열 무관하게 최소 "medium"입니다.** "low" 이하로 내리지 마세요.

### 출력 필드
- 평가 등급(rating): excellent / good / average / weak
- 핵심 활동 요약(activitySummary): **150자 이내**로 작성
- 평가 코멘트(evaluationComment): **250자 이내**로 작성. ⚠️ 생기부 내용을 반복하지 말고, **입학사정관이 이 세특을 어떻게 평가할지**를 판단하세요. 반드시 **왜 그렇게 판단했는지 세특 원문의 구체적 근거**(어떤 활동/탐구/기록이 있거나 없어서)를 함께 서술하세요.
- 역량 태깅(competencyTags): 해당 세특에서 드러나는 역량 태그 1~3개
- evaluationImpact (importancePercent는 출력하지 마세요)
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

### ⚠️ evaluationImpact 일관성 규칙
Lite 섹션의 "계열별 evaluationImpact 기준"을 그대로 적용하세요. importancePercent는 출력하지 마세요.

⚠️ **분량 제한 (반드시 준수 — JSON 파싱 오류 방지)**:
- evaluationComment는 반드시 **250자 이내**로 작성합니다. 250자를 초과하는 항목은 절대 출력하지 마세요.
- strengthPoints/weaknessPoints는 각 **최대 2개**, 각 항목 **100자 이내**로 작성합니다.
- detailedEvaluation은 **250자 이내**로 작성합니다.
- improvementDirection은 **150자 이내**, improvementExample은 **200자 이내**로 작성합니다.
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
- 평가 영향도(evaluationImpact): "very_high" / "high" / "medium" / "low" / "very_low"
- ⚠️ importancePercent는 출력하지 마세요. evaluationImpact만 출력합니다.
- ⚠️ evaluationImpact는 반드시 영문 값("very_high"/"high"/"medium"/"low"/"very_low")을 사용하세요. "매우 높음", "높음", "보통", "낮음" 등 한글 금지.
- Lite 섹션의 "계열별 evaluationImpact 기준"을 그대로 적용하세요.

### crossSubjectConnections 생략
- 과목 간 연결 분석은 storyAnalysis 섹션에서 수행합니다. subjectAnalysis에서는 crossSubjectConnections를 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- evaluationComment는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- strengthPoints/weaknessPoints는 각 **최대 3개**, 각 항목 **100자 이내**로 작성합니다.
- detailedEvaluation은 **300자 이내**로 작성합니다.
- **sentenceAnalysis의 각 문장 evaluation**: **150자 이내**로 작성합니다.
- 나머지 과목은 evaluationComment **100자 이내** 1줄 요약만 작성합니다.
- ⛔ **전체 JSON 출력이 35,000자를 초과하면 안 됩니다.** 분량이 길어지면 하위 우선순위 과목의 내용을 축약하세요.`,
};

export const buildSubjectAnalysisPrompt = (
  input: SubjectAnalysisPromptInput,
  plan: ReportPlan
): string => {
  const medicalSubjectContext = input.isMedical
    ? `## ⚠️ 의·치·한·약·수 계열 세특 분석 가이드 (반드시 적용)

이 학생은 의·치·한·약·수 계열(의·치·한·약·수) 지원 학생입니다.

### ⛔ 세특 평가의 핵심 원칙 (최우선)
- 세특 평가는 **"이 활동이 어떤 역량을 보여주는가?"**를 기준으로 합니다.
- ❌ "의·치·한·약·수 계열 지원에 매우 적합한 탐구" — 희망학과 기준 평가 금지
- ❌ "의·치·한·약·수 지원에 필요한 탐구 깊이" — 희망학과 잣대로 재기 금지
- ✅ "질병의 병리적 기전을 심층 분석하고 기술의 한계를 비판적으로 인식한 점은 탐구력이 매우 우수합니다" — 역량 중심 서술
- ✅ "실험 기반의 과학적 방법론이 체계적으로 적용되어 학업역량에서 긍정적입니다" — 역량 중심 서술
- evaluationComment에 **"의·치·한·약·수 계열 지원에 적합"이라는 표현을 사용하지 마세요.** 대신 탐구력, 분석력, 자기주도성 등 역량 용어로 평가하세요.

### 의·치·한·약·수 학생의 세특 채점 시 추가 기준
- **생명과학/화학 세특**: 실험 기반 탐구(가설→실험→결과→한계인식)가 있는지 확인. 단순 조사나 교과서 내용 정리 수준이면 "탐구의 깊이가 조사 수준에 머물러 있습니다"로 평가.
- **수학 세특**: 미적분/통계를 의료·생명과학 맥락에 적용한 탐구가 있으면 융합적 사고력으로 긍정 평가.
- **영어 세특**: 학술 원서 읽기, 영어 발표 등의 기록이 있으면 원서 독해 역량으로 긍정 평가.
- **단순 직업 탐색형 기록 주의**: "의사에게 필요한 역량 조사", "의학계열 진출 방법 정리" 수준의 세특은 입학사정관이 높게 평가하지 않습니다. 실제 과학적 탐구가 있는지가 핵심입니다.

`
    : "";

  const subjectPriority =
    input.gradingSystem === "5등급제"
      ? `1. **전공 핵심 교과** (이공계: 수학·물리학·기하·화학, 인문계: 사회와 문화·정치·법과 사회·경제) — 최우선
2. **국어, 영어** — 공통 핵심
3. **전공 관련 탐구과목** (이공계: 생명과학·지구과학, 인문계: 세계사·윤리와 사상)
4. 위 과목이 5개 미만이면 나머지 일반선택과목으로 보충`
      : `1. **전공 핵심 교과** (이공계: 수학·물리학·기하·화학, 인문계: 사회·문화·정치와법·경제) — 최우선
2. **국어, 영어** — 공통 핵심
3. **전공 관련 탐구과목** (이공계: 생명과학·지구과학, 인문계: 세계사·동아시아사·윤리)
4. 위 과목이 5개 미만이면 나머지 일반선택과목으로 보충`;

  const evaluationImpact =
    input.gradingSystem === "5등급제"
      ? `**이공계 (자연과학/공학/의약학/컴퓨터) — 2022 개정 교육과정:**
- "very_high": 수학(대수, 미적분Ⅰ, 미적분Ⅱ, 기하, 확률과통계) + 해당 학과 핵심 과학(물리학, 역학과 에너지, 화학, 화학 반응의 세계, 생명과학, 세포와 물질대사, 지구과학)
- "high": 통합과학, 과학탐구실험, 해당 학과 권장 과학
- "medium": 국어, 영어
- "low": 사회탐구 계열 (사회와 문화, 정치, 법과 사회 등)
- "very_low": 한문, 정보, 기술·가정, 제2외국어, 교양, 보건, 체육, 음악, 미술

**인문·사회계열 — 2022 개정 교육과정:**
- "very_high": 국어, 영어, 해당 학과 핵심 사회탐구(경제학→경제, 정치외교→정치, 사학→세계사)
- "high": 나머지 사회탐구 과목 (사회와 문화, 법과 사회, 세계시민과 지리 등)
- "medium": 수학(경영·경제 계열은 "high")
- "low": 과학탐구 계열
- "very_low": 한문, 정보, 기술·가정, 제2외국어, 교양, 보건, 체육, 음악, 미술`
      : `**이공계 (자연과학/공학/의약학/컴퓨터) — 2015 개정 교육과정:**
- "very_high": 수학(수학Ⅰ, 수학Ⅱ, 미적분, 기하, 확률과통계) + 해당 학과 핵심 과학(물리학Ⅰ·Ⅱ, 화학Ⅰ·Ⅱ, 생명과학Ⅰ·Ⅱ, 지구과학Ⅰ·Ⅱ)
- "high": 통합과학, 과학탐구실험, 해당 학과 권장 과학
- "medium": 국어, 영어
- "low": 사회탐구 계열 (사회·문화, 정치와 법 등)
- "very_low": 한문, 정보, 기술·가정, 제2외국어, 교양, 보건, 체육, 음악, 미술

**인문·사회계열 — 2015 개정 교육과정:**
- "very_high": 국어, 영어, 해당 학과 핵심 사회탐구(경제학→경제, 정치외교→정치와 법, 사학→세계사·동아시아사)
- "high": 나머지 사회탐구 과목
- "medium": 수학(경영·경제 계열은 "high")
- "low": 과학탐구 계열
- "very_low": 한문, 정보, 기술·가정, 제2외국어, 교양, 보건, 체육, 음악, 미술`;

  const planText = PLAN_SPECIFIC[plan]
    .replace("%%SUBJECT_PRIORITY%%", subjectPriority)
    .replace("%%EVALUATION_IMPACT%%", evaluationImpact);

  const gyogwaOnlyContext = input.isGyogwaOnly
    ? `## ⛔ 교과전형 전용 (이 규칙이 다른 모든 지시보다 우선)
이 학생은 모든 희망대학이 학생부교과전형입니다.
- "학종", "학생부종합전형", "학종 평가에서 핵심" 등의 표현을 사용하지 마세요.
- evaluationComment에 "입학사정관"이 아닌 "교과전형 평가", "전형 평가" 등으로 작성하세요.
- 세특 분석은 학생의 교과 역량과 학업 태도 파악 용도로 작성하되, "학종 서류평가에서 ~"가 아닌 "교과 학습 역량 측면에서 ~"로 프레이밍하세요.

`
    : "";

  return `${gyogwaOnlyContext}${medicalSubjectContext}## 작업
학생의 세부능력 및 특기사항(세특)을 과목별로 분석하세요.

## 이 섹션의 역할
이 학생은 현재 **${input.studentGrade}학년**입니다. 이 학년에 맞는 분석과 제안을 하세요.

세특 텍스트에 기록된 **탐구 주제의 깊이, 교과 연계성, 학문적 발전 가능성**을 분석합니다.
창체 활동 자체의 분석은 activityAnalysis, 성적 추이는 academicAnalysis, 과목 이수 구조는 courseAlignment에서 각각 다룹니다.
## 서술 관점: 교과 전문 평가자
이 섹션은 **과목별 세특 텍스트의 질**을 개별 평가합니다. 탐구 주제의 학문적 깊이와 교과 연계성을 중심으로 서술하세요.
- "해당 과목에서 ~가 확인된다", "~주제의 탐구 깊이는 ~수준이다" 등 과목 단위의 평가 어투를 사용하세요.

## ⛔ 다른 섹션과의 역할 경계 (필수)
- ❌ 등급의 입시적 의미 (예: "N등급이라 약점으로 작용한다", "합격이 어렵다") → academicAnalysis·admissionPrediction에서 다룸
- ❌ 약점 종합 진단/보완 전략 → weaknessAnalysis에서 다룸
- ❌ 활동 평가 → activityAnalysis에서 다룸
- ❌ "성적을 N등급으로 올려야 한다", "내신을 개선해야 한다" 등 성적 향상 목표 제시 → academicAnalysis·consultantReview에서 다룸
- ✅ 이 섹션에서 할 것: **세특 텍스트의 질적 평가** (탐구 깊이, 교과 연계성, 학문적 수준)

## ⛔ 과목 다양성 규칙 (필수 — 위반 시 품질 실패)
- **같은 과목명은 학년이 달라도 반드시 하나의 항목으로 통합 분석하세요.** 예: 2학년 사회문화 + 3학년 사회문화 → subjects 배열에 "사회문화" 항목 1개만 출력하고, year는 가장 최근 학년으로 설정합니다. 여러 학년의 세특 내용을 종합하여 하나의 evaluationComment/detailedEvaluation에 담으세요.
- **같은 교과군(수학, 과학, 국어, 영어, 사회)에서 최대 2개 과목만** 분석 대상에 포함하세요.
- 예: 수학, 수학Ⅰ, 수학Ⅱ, 기하가 모두 있어도 **수학 관련 과목은 최대 2개만** 선택합니다.
- 같은 교과군 내에서는 학년이 높은(최근) 과목, 전공 관련도가 높은 과목을 우선합니다.
- 나머지 자리에는 **다른 교과군** 과목을 배치하여 생기부 전반을 균형 있게 분석합니다.
- 특히 **전공 핵심 과목의 약점**(낮은 등급)이 있는 과목은 반드시 분석에 포함하세요.

## ⛔ 과목 분류 (이 규칙이 모든 다른 규칙보다 우선합니다)

분석을 시작하기 전에, majorEvaluationContext에서 **생기부 기반 강점 계열**을 확인하고 아래 기준으로 과목을 분류하세요.
**이 분류 결과가 evaluationImpact, evaluationComment, detailedEvaluation 등 모든 출력에 반영되어야 합니다.**

### ⚠️ majorEvaluationContext 기반 과목 분류 (최우선)
1단계: majorEvaluationContext의 "핵심 권장과목"/"권장과목" 목록을 확인하세요.
2단계: 해당 목록에 포함된 과목은 아래 기본 분류보다 우선합니다.
- 핵심 권장과목 → evaluationImpact: "very_high"
- 권장과목 → evaluationImpact: "high"
- 위 목록에 없는 일반 과목 → Lite의 "계열별 evaluationImpact 기준" 적용

### 비핵심 과목 (evaluationImpact: "very_low")
다음 과목들은 **어떤 학과를 지망하든** 학종 평가에서 핵심이 아닙니다.
**사정관들은 이 과목들을 학업에 직접적인 영향이 없는 것으로 보고, 성실도를 볼 때 참고하는 정도입니다.**

- **정보**: 고교 정보는 1학년 1~2단위 기초 과목으로, 컴퓨터공학과 지망이라도 입학사정관은 수학·물리학 세특으로 진로역량을 판단합니다. 정보 세특은 "관심 확인" 수준일 뿐 변별력이 없습니다.
- 제2외국어: 일본어, 중국어, 독일어, 프랑스어, 스페인어, 러시아어, 아랍어, 베트남어
- 교양/실생활: 기술·가정, 독서, 한문, 교양, 보건, 환경, 논리학
- 예체능: 체육, 음악, 미술

⚠️ 비핵심 과목의 evaluationComment/detailedEvaluation 작성 시:
- ❌ "전공 적합성이 높다", "핵심 과목으로서 중요하다", "입학사정관이 주목할 것이다"
- ✅ "학종 평가에서 보조적 과목으로, 성실성 확인 수준으로 반영됩니다"

⚠️ 비핵심 과목의 evaluationImpact가 전공 핵심 과목보다 높으면 안 됩니다.

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
      "evaluationImpact": "medium"
    }
  ]
}

플랜별로 불필요한 필드는 생략 가능하지만, subjects 배열의 각 요소는 반드시 위와 같은 객체 형태여야 합니다.

**crossSubjectConnections의 connectionType은 반드시 다음 3개 중 하나:** "주제연결" | "역량연결" | "중복". 다른 값 사용 금지.

## 규칙
1. **교과 세특만** 분석합니다.
2. 평가는 반드시 원문 내용에 근거합니다.
3. 역량 태깅은 가장 두드러지는 역량 1~3개를 선택합니다.
4. 학년-과목명 형식으로 과목을 식별합니다 (예: "2학년 물리학1").
5. **"과목다운 세특" 관점을 반드시 적용합니다**: 해당 과목의 본질적 특성에 맞는 세특인지 평가합니다.
   - 수학 세특에는 수학적 사고/증명/모델링이, 물리학 세특에는 실험/현상 분석이 드러나야 합니다.
   - 과목 특성과 무관한 단순 소재 활용(예: 물리학 세특인데 자동차 역사 조사)은 감점 요인입니다.
6. **활동 밀도를 분석합니다**: 1500바이트(약 500자) 내 3개 이상 활동 나열은 깊이 부족으로 판단합니다.
   - 활동 수 대비 분량을 확인하고, 밀도가 낮은(=활동 수는 적지만 깊이 있는) 세특을 높이 평가합니다.
7. **학업 역량 판단 기준**: 세특에서 다음 패턴이 나타나면 학업역량(탐구력/학업태도)에서 높은 평가를 받는 학생입니다:
   - 수업 중 **질문을 제기**하고 그 질문에서 탐구가 출발한 경우 → 지적 호기심 + 자기주도성 증거
   - **추가 자료를 찾아 분석**한 기록 (논문, 통계, 실험 데이터 등) → 탐구의 깊이 증거
   - **수업 토론에서 자신의 견해를 제시**한 기록 → 비판적 사고력 증거
   - 반대로, "교사가 제시한 주제를 조사함" 수준에 머무르면 자기주도성이 보이지 않아 탐구력 점수가 낮아집니다.
8. **평가자 관점 필수 (최우선)**: 시스템 프롬프트의 '서술 vs 평가' 기준을 적용하세요. 원문 요약·반복 금지, 반드시 평가 판단 + 세특 원문의 구체적 근거를 함께 서술하세요.
   - **evaluationComment에 반드시 "입학사정관" 또는 "평가" 또는 "전형" 키워드가 포함되어야 합니다.**
   - 시스템 프롬프트의 '당연한 매핑 금지' 기준을 적용하세요. "이 세특이 같은 등급대 다른 학생의 세특과 비교해서 특별한가, 흔한가"를 판단하세요.
9. **개선 예시 문체 규칙**: improvementExample 등 세특 서술 예시는 반드시 "~함.", "~임.", "~됨." 등 세특 문체로 작성합니다. 존댓말("~합니다", "~입니다")은 세특 예시에서 절대 사용하지 마세요.
10. **요약-인용 중복 제거**: 과목명 하단의 요약 서술(activitySummary, 2줄 분량)과 핵심 인용(keyQuotes) 내용이 중복되는 경우, 요약 서술을 생략하고 핵심 인용만 남기세요.
11. **입학사정관 해석 관점**: evaluationComment 또는 detailedEvaluation에서 사정관이 이 세특을 읽었을 때 어떻게 평가할지를 자연스럽게 포함하세요.
   - 모든 과목에 넣으라는 것이 아닙니다. 사정관 해석이 의미 있는 과목(전공 관련 핵심 과목, 성적-세특 괴리가 있는 과목 등)에만 포함합니다.
   - 예시: "수학적 모델링까지 시도한 점은 사정관이 '교과 깊이를 갖춘 학생'으로 해석할 수 있는 근거가 됩니다."
   - 예시: "성적 대비 세특 내용이 빈약하여, 사정관이 '수업 참여도가 낮은 학생'으로 판단할 우려가 있습니다."
12. **형식적 표현 패턴 탐지 (필수)**: 시스템 프롬프트의 '형식적 표현 패턴' 기준을 적용하여, 세특에서 해당 표현이 발견되면 evaluationComment에서 반드시 단점으로 지적하세요. 최소 절반 이상의 과목에서 표현상 한계를 지적해야 합니다. (단, **1학년 세특**에서는 탐색기 특성상 감점 수준을 낮추세요.)
13. **탐구 4단계 체크리스트 (필수)**: 시스템 프롬프트의 '탐구 구조 4단계' 기준을 적용하여 각 세특의 탐구 수준(조사/탐구/심화 탐구)을 판단하고 evaluationComment에 반영하세요.
14. **학년 간 심화 흐름 판단**: 같은 교과군 내에서 1학년 → 2학년으로 주제가 심화되었는지 확인합니다.
   - 심화: 같은 주제를 더 깊게 탐구 (개념 → 실험 → 수식/모델)
   - 유지: 비슷한 수준의 다른 주제
   - 후퇴: 2학년 세특이 1학년보다 형식적
   evaluationComment에 해당 판단을 자연스럽게 반영합니다.
15. **improvementDirection은 생기부 전체 흐름을 고려 (필수)**:
${
  input.isGraduate
    ? `   - ⚠️ **이 학생은 졸업생입니다.** 생기부를 더 이상 수정할 수 없으므로, "3학년에서는...", "다음 학기에...", "~를 보완하세요" 같은 활동/학업 관련 제안은 금지합니다.
   - improvementDirection은 **면접에서 이 과목을 어떤 관점으로 설명하면 효과적인지** 방향으로 작성하세요.
   - improvementExample은 **면접에서 강조할 수 있는 포인트**로 작성하세요.
   - 예: "이 과목은 1학년 통합과학에서 시작한 에너지 탐구가 물리학으로 심화된 흐름으로 설명하면, 정량 분석의 부족함보다 학년별 성장 궤적이 부각되어 효과적입니다."`
    : `   - 해당 과목 안에서만 완결되는 개선 방향은 금지합니다.
   - 반드시 다음 중 하나 이상을 포함하세요:
     a) **다른 과목 세특과의 연결**: "이 탐구를 XX 과목 세특에서도 연결하면 교과 간 일관성이 생깁니다"
     b) **이전 학년 탐구와의 심화 연결**: "1학년에서 다룬 XX 주제를 확장하면 학년별 심화 흐름이 만들어집니다"
     c) **창체/동아리 활동과의 연결**: "이 탐구를 동아리 활동으로 확장하면 진로 일관성을 강화할 수 있습니다"`
}
   - 입학사정관은 과목별로 분리해서 보지 않고 생기부 전체의 스토리라인을 봅니다. 개선 방향도 이 관점에서 제시하세요.
   - ⛔ **improvementDirection과 improvementExample은 세특 원문에 등장하는 키워드가 아니라, 아래 강점 계열 방향에서 이 과목을 어떻게 활용할 수 있는지를 제시해야 합니다.** 세특 원문에 강점 계열과 무관한 키워드(예: "마케팅", "광고", "경영" 등)가 있더라도, 개선 방향은 반드시 강점 계열과 연결되는 탐구로 전환하세요. 원문 키워드를 확장하여 우회 연결(예: 광고→미디어→사회 문제)하는 것도 금지입니다. 위반 시 품질 실패입니다.

## Few-shot 예시 (시스템 프롬프트의 예시 톤을 따르되, 이 섹션 특화 참고)

### improvementDirection 예시 (생기부 전체 흐름 연결 — 이 섹션 고유 규칙)

**BAD:** "3학년 물리학2에서 오차 분석을 추가하면 탐구의 완결성이 높아질 겁니다." → 해당 과목 안에서만 완결되는 방향은 금지.

**GOOD:** "1학년 통합과학에서 에너지 전환 효율을 탐구했으므로, 3학년 물리학2 세특에서 '카르노 효율 vs 실제 효율'로 확장하면 학년별 심화 흐름이 만들어집니다. 수식 기반 오차 분석을 포함하면 수학 세특의 통계 분석과도 연결되어 교과 간 탐구 일관성을 보여줄 수 있습니다."


${COMPETENCY_TAG_GUIDE}

${input.detectedMajorGroupLabel ? `## 생기부 기반 강점 계열 (개선 방향 작성 시 필수 참고)\n이 학생의 강점 계열: **${input.detectedMajorGroupLabel}**\n- improvementDirection/improvementExample는 반드시 이 계열과 관련된 활동·탐구를 추천하세요.\n- 이 계열과 무관한 분야의 활동을 추천하면 안 됩니다.\n` : ""}
## 학생 프로필
${input.studentProfile}

## 교과 세특 원문 데이터
${input.subjectData}

${planText}

${plan !== "lite" ? SESPEC_EXPRESSION_GUIDE : ""}`;
};
