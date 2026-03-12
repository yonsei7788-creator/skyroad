/** 섹션 5: 역량별 종합 평가 (competencyEvaluation) */

import type { ReportPlan } from "../../types.ts";

export interface CompetencyEvaluationPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 기본
- 장점 3개 + 단점 3개를 출력합니다.
- 간략 종합 코멘트 (3~5줄)를 출력합니다.
- 역량별 등급 (4대 역량, S/A/B/C/D)을 출력합니다.
- subcategories 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- 장점 5개 + 단점 5개를 출력합니다.
- 역량별 등급 (4대 역량, S/A/B/C/D) + 역량별 1문단 코멘트를 출력합니다.
- subcategories 필드는 출력하지 않습니다.`,
  premium: `## 플랜별 출력: 정밀
- 장점 5개 + 단점 5개를 출력합니다 (초과 금지).
- 역량별 등급 (4대 역량) + 하위항목별 개별 등급(subcategories)을 출력합니다.
- 코멘트는 핵심 위주로 간결하게 서술합니다 (각 코멘트 2~3줄 이내).`,
};

const GRADE_CRITERIA = `## 등급 기준
| 등급 | 의미 | 설명 |
|------|------|------|
| S | 최우수 | 동일 전형 지원자 상위 10% 수준. 구체적 증거가 다수이며 학년 간 심화·확장이 뚜렷함 |
| A | 우수 | 상위 25% 수준, 경쟁력 있음. 구체적 증거가 존재하고 일관된 흐름이 확인됨 |
| B | 보통 | 평균 수준, 증거가 있으나 깊이가 부족하거나 형식적 |
| C | 미흡 | 보완 필요, 증거가 적고 형식적 표현 위주 |
| D | 부족 | 심각한 보완 필요, 해당 역량 증거가 거의 없음 |

⚠️ **등급 부여 시 주의**: 증거가 풍부하고 구체적인 역량에는 반드시 S 또는 A를 부여하세요. 모든 역량을 B로 수렴시키는 것은 잘못된 평가입니다. 강점과 약점이 구분되도록 등급을 차등화하세요.`;

export const buildCompetencyEvaluationPrompt = (
  input: CompetencyEvaluationPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 생기부에서 추출한 역량 증거를 바탕으로 종합 평가를 작성하세요.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

## 출력 지시

### 장점 리스트 (strengths)
- 각 장점은 역량 태그(competencyTag) + 라벨 + 생기부 근거(evidence)로 구성합니다.
- competencyTag는 { category: "academic"|"career"|"community"|"growth", subcategory: "세부항목", assessment: "우수"|"양호" } 형식입니다.
- 근거는 생기부 원문에서 직접 인용합니다.
- 예시: { competencyTag: { category: "career", subcategory: "진로탐색" }, label: "2년간 일관된 자동차 분야 탐구", evidence: "1학년 물리학1 '전기차 모터 효율 분석', 2학년 역학 '자율주행 알고리즘 원리 탐구'" }

### 단점 리스트 (weaknesses)
- 장점과 동일한 형식으로, 보완이 필요한 영역을 식별합니다.
- 단순 비판이 아닌 "왜 문제인지" + "입학사정관이 이 부분을 어떻게 해석할 수 있는지"를 포함합니다.
- assessment는 "미흡" 또는 "부족"을 사용합니다.

### 역량별 등급 (competencyRatings)
- 학업역량, 진로역량, 공동체역량, 발전가능성 4개 역량에 대해 S/A/B/C/D 등급을 부여합니다.
- 각 등급에 대한 코멘트를 포함합니다.
- ⚠️ **코멘트에는 입학사정관 관점의 해석을 반영하세요.** 단순히 "우수합니다/부족합니다"가 아닌, 사정관이 이 역량을 서류 평가에서 어떻게 읽어낼지를 서술합니다.
  - 예시 (BAD): "학업역량이 우수합니다."
  - 예시 (GOOD): "전공 관련 교과에서 가설-실험-결론 구조의 탐구가 반복적으로 나타나, 사정관이 '탐구력이 검증된 학생'으로 판단할 가능성이 높습니다."

### 종합 코멘트 (overallComment)
- 전체적인 역량 분포와 특징을 요약합니다.
- 입학사정관이 이 학생의 생기부를 처음 읽었을 때 어떤 인상을 받을지를 포함합니다.

${GRADE_CRITERIA}

${PLAN_SPECIFIC[plan]}`;
};
