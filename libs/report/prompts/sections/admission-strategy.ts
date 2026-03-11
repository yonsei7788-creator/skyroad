/** 섹션 16: 입시 전략 + 대학 추천 (admissionStrategy) */

import type { ReportPlan } from "../../types.ts";

export interface AdmissionStrategyPromptInput {
  academicAnalysis: string;
  competencyEvaluation: string;
  admissionPredictionResult: string;
  universityCandidates: string;
  recommendedCourseMatch: string;
  studentProfile: string;
  basePassRates?: string;
  majorEvaluationContext?: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 추천 전형 방향(recommendedPath, 2~3줄) 출력
- 대학 추천(recommendations): 상향 1/적정 1/안정 2/하향 2 = 총 **6개** 고정, 대학명+학과+전형명+티어+간단 rationale(1줄)
- ⚠️ 반드시 "하향" 티어 대학 2개를 포함하세요. 하향 대학은 합격 가능성이 높은 안전 지원 대학입니다.
- typeStrategies, schoolTypeAnalysis, nextSemesterStrategy, csatMinimumStrategy, applicationSimulation, universityGuideMatching, tierGroupedRecommendations 필드는 출력하지 않습니다.

⚠️ **분량 제한**: 이 섹션은 A4 1페이지 이내로 작성합니다.`,
  standard: `## 플랜별 출력: 상세
- 추천 전형 방향(recommendedPath) + 대학 추천(recommendations)
- 대학 추천 수: 상향 2/적정 2/안정 2/하향 2 = 총 **8개** 고정.
- ⚠️ 반드시 4개 티어(상향/적정/안정/하향) 모두 포함하세요. 하향 대학은 합격 가능성이 높은 안전 지원 대학입니다.
- 대학별 합격 가능성(chance + chanceRationale + chancePercentLabel)만 출력합니다. admissionData 필드는 출력하지 않습니다.
- 전형별 전략(typeStrategies) 출력
- 주의/유리 학교 유형(schoolTypeAnalysis)
- 다음 학기 전략(nextSemesterStrategy)
- csatMinimumStrategy, applicationSimulation, universityGuideMatching, tierGroupedRecommendations 필드는 출력하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- recommendations는 반드시 **8개** 고정.
- 각 chanceRationale은 반드시 **80자 이내**로 작성합니다. 80자 초과 금지.
- typeStrategies의 각 analysis는 **100자 이내**, 각 reason은 **80자 이내**로 작성합니다.
- schoolTypeAnalysis의 rationale은 **100자 이내**로 작성합니다.
- nextSemesterStrategy는 **150자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력: 정밀
Standard의 모든 항목에 추가로 다음을 출력합니다:
- 대학 추천 수: 상향 3/적정 3/안정 3/하향 3 = 총 **최대 12개**.
- ⚠️ 반드시 4개 티어(상향/적정/안정/하향) 모두 포함하세요. 하향 대학은 합격 가능성이 높은 안전 지원 대학입니다.
- 전형별 상세 전략(typeStrategies)
- 수능 최저 전략(csatMinimumStrategy)
- 6장 카드 배분 시뮬레이션(applicationSimulation): 반드시 아래 형식. **학생부교과전형도 반드시 포함**하세요.
  "applicationSimulation": {"description": "수시 6개 + 정시 배분 전략...", "details": [{"admissionType": "학생부종합", "count": 3, "targetUniversities": ["한양대", "중앙대", "경희대"]}, {"admissionType": "학생부교과", "count": 2, "targetUniversities": ["서울시립대", "숭실대"]}, {"admissionType": "논술", "count": 1, "targetUniversities": ["건국대"]}]}
  ⚠️ **전형 유형별 최소 1개 배정**: 학생부종합과 학생부교과에 각각 최소 1개는 배분하세요. 교과전형이 불리한 학생이라도 안전망 차원에서 최소 1개는 교과전형 하향 안정권 대학에 배정합니다.
- 대학별 학종 가이드북 키워드 매칭(universityGuideMatching): **상위 3개 대학만** 배열 형식으로 출력
  "universityGuideMatching": [{"university": "한양대학교", "emphasisKeywords": ["자기주도성", "탐구력"], "studentStrengthMatch": ["세특 탐구 깊이"], "studentWeaknessMatch": ["교과 편차"]}]
- 조합별 대학 추천(tierGroupedRecommendations): "상향 위주" 2개 + "안정 위주" 2개 + "하향 위주" 2개 = 총 6개
- 서울대학교는 학생부교과전형이 없으므로 교과전형 데이터를 생성하지 않습니다.

⚠️ **분량 제한 (반드시 준수)**:
- recommendations는 **최대 12개**.
- 각 chanceRationale은 반드시 **150자 이내**로 작성합니다. 150자 초과 금지.
- admissionData 포함 가능.
- typeStrategies의 각 analysis는 **200자 이내**로 작성합니다.`,
};

const ADMISSION_CONTEXT = `## 학교유형별 특수전형 안내
- **특성화고**: 특성화고 특별전형(정원 외) 지원 가능. 일반대학 지원 시 내신 경쟁력이 일반고 대비 불리할 수 있으며, 특성화고 환산 보정이 적용됨을 안내하세요. 특성화고졸 재직자 전형도 졸업 후 경로로 안내하세요.
- **자율고/외국어고/국제고**: 2025학년도부터 자사고·외고·국제고 일반고 전환 예정. 전환 이전 학생은 기존 학교 유형으로 평가됨을 안내하세요.
- **과학고/영재학교**: 조기졸업, 과학특성화대학 추천 입학 등 특수 경로를 안내하세요.
→ 학생의 학교 유형에 해당하는 특수전형이 있으면 반드시 typeStrategies나 recommendedPath에서 언급하세요.

## 정시 학생부 반영 대학 (2028학년도)
정시에서 학생부를 반영하는 주요 대학:
서울대(2023~), 고려대(2024~), 연세대(2026~), 한양대(2026~),
성균관대 사대(2026~), 동국대(2027~), 중앙대(2027~), 경희대(2028~)
→ 이 대학을 정시 목표로 하는 경우 학생부 준비도 중요함을 안내하세요.

## 학교폭력 기록 주의사항
학생 프로필에 학교폭력 조치 기록이 있는 경우:
- 다음 전형은 지원이 제한될 수 있음을 경고하세요:
  경희대 지역균형, 숙명여대 지역균형, 연세대 추천형, 이화여대 고교추천, 한국외대 학교장추천
- 조치 유형(1~3호 vs 4~8호)에 따른 기록 유보/유지 여부도 안내하세요.`;

export const buildAdmissionStrategyPrompt = (
  input: AdmissionStrategyPromptInput,
  plan: ReportPlan
): string => {
  return `## 작업
학생의 성적과 생기부 분석 결과를 바탕으로 입시 전략과 대학을 추천하세요.

## 출력 JSON 스키마

중요: recommendations, typeStrategies, tierGroupedRecommendations의 각 배열 요소는 반드시 완전한 객체여야 합니다. null 대신 빈 배열이나 빈 객체를 사용하세요.

**enum 제한 (반드시 아래 값만 사용):**
- typeStrategies[].type: "학종" | "교과" | "정시" (다른 표현 금지)
- typeStrategies[].suitability: "적합" | "보통" | "부적합"
- recommendations[].tier: "상향" | "안정" | "하향"
- recommendations[].chance: "very_high" | "high" | "medium" | "low" | "very_low"
- tierGroupedRecommendations[].tierGroup: "상향 위주" | "안정 위주" | "하향 위주"
- universityGuideMatching: 반드시 배열 형태 (객체 아님)
- applicationSimulation: 반드시 {"description": "string", "details": [...]} 형태

{
  "sectionId": "admissionStrategy",
  "title": "입시 전략",
  "recommendedPath": "학생부종합전형을 주력으로 하되, 교과전형도 병행하는 전략이...",
  "recommendations": [
    {
      "university": "한양대학교",
      "department": "행정학과",
      "admissionType": "학생부종합-서류형",
      "tier": "안정",
      "chance": "medium",
      "chanceRationale": "세특 내용이 우수하나 내신이...",
      "chancePercentLabel": "55~65%",
      "admissionData": {"cutoff50": 2.5, "cutoff70": 3.0, "competitionRate": 5.2, "enrollment": 30}
    }
  ],
  "typeStrategies": [
    {"type": "학종", "analysis": "세특 내용의 질과 활동 일관성이...", "suitability": "적합", "reason": "진로 관련 탐구가 구체적이며..."},
    {"type": "교과", "analysis": "내신 등급이 안정적이며...", "suitability": "보통", "reason": "교과 성적은 양호하나..."},
    {"type": "정시", "analysis": "수능 대비 전략이...", "suitability": "부적합", "reason": "수능 데이터 부족으로..."}
  ],
  "schoolTypeAnalysis": {
    "cautionTypes": ["지역균형전형 미운영 대학"],
    "advantageTypes": ["서류 중심 평가 대학"],
    "rationale": "학생의 세특 내용이 우수하여..."
  },
  "tierGroupedRecommendations": [
    {
      "tierGroup": "상향 위주",
      "recommendations": [
        {"university": "서울대학교", "department": "행정학과", "admissionType": "학생부종합-일반", "tier": "상향", "chance": "low", "chanceRationale": "...", "chancePercentLabel": "20~30%", "admissionData": {}}
      ]
    }
  ]
}

**recommendations vs tierGroupedRecommendations 관계:**
- \`recommendations\`: Lite/Standard에서 사용. 단일 리스트에 상향/안정/하향 대학을 혼합 배치.
- \`tierGroupedRecommendations\`: Premium 전용. 상향 위주/안정 위주/하향 위주 3가지 시나리오별로 2개씩 그룹화하여 총 6개 추천. recommendations와 별도 필드.

⚠️ **대학 중복 금지 규칙:**
- 같은 대학-학과 조합이 recommendations 내에서 2번 이상 나타나면 안 됩니다.
- tierGroupedRecommendations에서도 같은 대학-학과가 다른 tierGroup에 중복 배치되면 안 됩니다.
- 각 대학-학과는 하나의 티어에만 속해야 합니다 (상향이면 상향에만).
- recommendations와 tierGroupedRecommendations 간 합격률/chance가 일치해야 합니다.

## 대학 추천 규칙
- 아래 제공된 "대학 후보군"은 코드에서 학생의 환산 등급을 기반으로 사전 산정한 결과입니다.
- 이 후보군 범위 내에서만 대학을 추천하세요. 후보군에 없는 대학은 추천하지 마세요.
- 커트라인, 경쟁률, 모집인원 등 구체적 입시 수치는 제공된 데이터만 인용하세요. 직접 수치를 생성하지 마세요.
- 역할: 후보군 중 학생의 역량/세특과 가장 잘 매칭되는 대학을 선별하고 전략적 분석을 제공하세요.

## 전형 다양성 (필수)
- 지원 조합 시뮬레이션에서 학생부종합전형만 추천하지 마세요.
- 학생부교과전형도 반드시 1개 이상 포함하세요.
- 특히 생기부 내용과 희망 학과의 괴리가 큰 경우, 서류 비중이 낮은 전형(교과전형, 면접 중심 전형)을 우선 추천하세요.

## 전공 미스매치 대응
- 생기부의 탐구 내용이 희망 학과와 일치하지 않는 경우:
  - "세특 내용의 질과 탐구 활동의 깊이가 우수하다"라고 평가하지 마세요.
  - 대신 "희망 학과와 생기부 내용 간 괴리가 있어, 서류전형보다 면접 비중이 높은 전형이 유리합니다"로 안내하세요.

## 생기부-학과 괴리 대응 전략
- 학과 맞춤 평가 기준이 제공된 경우, 학생의 생기부가 목표 학과와 괴리가 큰지 판단하세요.
- **괴리가 큰 경우** (핵심 교과 성적 부진 또는 관련 활동 부재):
  - 학종보다 **면접전형, 교과전형**을 우선 추천합니다.
  - recommendedPath에서 괴리 사실과 대안 전략을 솔직하게 안내합니다.
  - "정성 평가 반영"이라는 모호한 표현 대신, 구체적으로 어떤 전형이 유리한지 제시합니다.

## 주의/유리 학교 유형 판단 기준
| 학생 특성 | 피해야 할 학교 | 유리한 학교 |
|-----------|---------------|------------|
| 과목 간 성적 편차 큼 | 고른 성적 분포 중시 학교 | 전공 과목 성적 위주 학교 |
| 탐구 깊이 부족 | 지적호기심/탐구력 강조 학교 | 학업태도/성실성 중시 학교 |
| 공동교육과정 이수 | -- | 교과 이수 노력 중시 학교 |
| 출결 이슈 | 출결 엄격 반영 학교 | -- |

${ADMISSION_CONTEXT}

## 코드 산정 대학 후보군
${input.universityCandidates}

## 코드 산정 기본 합격률 (등급-커트라인 기반)
${input.basePassRates ?? "없음"}
→ 대학 추천 시 chancePercentLabel은 반드시 이 기본 합격률의 ±10%p 범위 내에서 설정하세요.
→ gradeDiff가 +0.5 이상인 대학에 50% 이상, +1.0 이상인 대학에 30% 이상 합격률 부여 금지.
→ ⚠️ 티어와 chance가 일관되어야 합니다: "하향" 대학은 "very_high"/"high", "안정" 대학은 "high"/"medium", "상향" 대학은 "low"/"very_low".
→ 모든 대학이 "low"/"very_low"만 나오면 안 됩니다. 안정/하향 대학은 반드시 "medium" 이상이어야 합니다.

## 합격 예측 결과
${input.admissionPredictionResult}

## 권장 이수 과목 매칭
${input.recommendedCourseMatch}
→ 학생의 목표 계열 대비 권장과목 이수율을 입시 전략에 반영하세요.
→ 미이수 과목이 있다면 이것이 지원 시 불리할 수 있음을 안내하세요.

## 입력 데이터

### 성적 분석 결과
${input.academicAnalysis}

### 역량별 종합 평가 결과
${input.competencyEvaluation}

### 학생 프로필
${input.studentProfile}

${input.majorEvaluationContext ? `### 학과 맞춤 평가 기준 (입학사정관 관점)\n${input.majorEvaluationContext}\n\n⚠️ 대학 추천 시 이 계열의 핵심 교과 성취도와 관련 활동 일치도를 고려하여 학생의 강점/약점을 분석하세요. universityGuideMatching에서 emphasisKeywords와 studentStrengthMatch/WeaknessMatch를 이 기준에 맞춰 작성하세요.` : ""}

${PLAN_SPECIFIC[plan]}`;
};

/** 고1 전용 대체 프롬프트 (directionGuide) */
export interface DirectionGuidePromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  recommendedCourseMatch: string;
  studentProfile: string;
}

export const buildDirectionGuidePrompt = (
  input: DirectionGuidePromptInput
): string => {
  return `## 작업 (고1 전용)
학생의 생기부에서 드러나는 관심 분야를 분석하여 방향 설정 가이드를 작성하세요.

## 출력 JSON 스키마
\`\`\`json
{
  "sectionId": "directionGuide",
  "title": "방향 설정 가이드",
  "recommendedTracks": ["string (적합한 계열/학과 방향, 2~3개)"],
  "subjectSelectionGuide": ["string (과목명 + 선택 이유)"],
  "preparationAdvice": "string (향후 탐구 방향 제안)"
}
\`\`\`

## 출력
- 적합한 계열/학과 방향 (recommendedTracks: 2~3개, 근거 포함)
- 2학년 선택과목 추천 (subjectSelectionGuide: 과목명 + 선택 이유)
  - 목표 계열에 따른 2028학년도 계열별 권장 선택과목 데이터를 활용하세요.
  - 메디컬 지망 시 대학별 필수 과목(수학·과학)을 구체적으로 사전 안내하세요.
- 향후 탐구 방향 제안 (preparationAdvice)

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 권장 이수 과목 매칭 데이터
${input.recommendedCourseMatch}

### 학생 프로필
${input.studentProfile}`;
};
