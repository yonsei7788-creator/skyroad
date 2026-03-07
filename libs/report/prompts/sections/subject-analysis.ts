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
각 과목에 대해 Lite의 모든 항목 + 다음을 추가로 출력하세요:
- 원문 핵심 인용: 세특에서 평가에 중요한 문장 1~2개를 직접 인용
- 상세 평가: 전문 컨설턴트 수준의 핵심 평가 (2~3줄)
  - 이 과목의 세특이 왜 좋은지/부족한지 핵심만 서술
  - "과목다운 세특"인지 판단
- 개선 방향: 3학년 세특에서 보완할 구체적 방향 (1~2줄)
- 개선 예시 문장: 약한 부분이 있다면 구체적 예시 1개 제시 (2줄 이내)
- 교과 간 연결성은 storyAnalysis에서 분석하므로 crossSubjectConnections는 출력하지 않습니다.`,
  premium: `## 분석 수준: 정밀 (핵심 과목 집중)

### 과목 분류 및 분석 깊이
1. **핵심 과목 (전공 관련 상위 8과목)**: Standard 수준의 상세 분석을 출력합니다.
2. **나머지 과목**: rating + evaluationComment(1~2줄 요약)만 출력합니다. detailedEvaluation, keyQuotes, improvementDirection, improvementExample, crossSubjectConnections는 생략합니다.

### 문장 단위 분석 (상위 2과목만)
- **전공 관련도가 가장 높은 2과목에 한해서만** sentenceAnalysis를 출력합니다.
- 각 과목당 sentenceAnalysis는 **최대 5문장**까지만 분석합니다.
- 나머지 과목은 sentenceAnalysis를 절대 포함하지 않습니다.

### 모든 과목 공통
- 중요도 퍼센트(importancePercent): 0~100%
- 평가 영향도(evaluationImpact): high / medium / low

### crossSubjectConnections 생략
- 과목 간 연결 분석은 storyAnalysis 섹션에서 수행합니다. subjectAnalysis에서는 crossSubjectConnections를 출력하지 않습니다.

⚠️ **출력 분량 제한**: 전체 JSON 출력은 25,000자 이내로 유지하세요.
- **핵심 과목 (상위 8과목)**: evaluationComment은 3~4줄, detailedEvaluation은 3~4줄로 작성합니다. 핵심을 짚되, 불필요한 반복이나 장황한 서술은 피하고 평가의 깊이에 집중하세요.
- **나머지 과목**: evaluationComment은 1~2줄 요약만 작성합니다.
- **sentenceAnalysis의 각 문장 evaluation**: 2~3줄로 작성합니다. 해당 문장이 입학사정관에게 어떤 인상을 주는지, 역량이 어떻게 드러나는지를 구체적으로 평가하세요.`,
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

${COMPETENCY_TAG_GUIDE}

## 학생 프로필
${input.studentProfile}

## 교과 세특 원문 데이터
${input.subjectData}

${PLAN_SPECIFIC[plan]}`;
};
