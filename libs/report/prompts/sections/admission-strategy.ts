/** 섹션 16: 입시 전략 + 대학 추천 (admissionStrategy) */

import type { ReportPlan } from "../../types.ts";

export interface AdmissionStrategyPromptInput {
  academicAnalysis: string;
  competencyEvaluation: string;
  admissionPredictionResult: string;
  universityCandidates: string;
  recommendedCourseMatch: string;
  studentProfile: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력: 간략
- 추천 전형 방향(recommendedPath, 2~3줄) 출력
- 대학 추천(recommendations): 상향 1/안정 2/하향 1 = 총 **4개** 고정, 대학명+학과+전형명+티어+간단 rationale(1줄)
- 4개를 초과하지 않습니다.
- typeStrategies, schoolTypeAnalysis, nextSemesterStrategy, csatMinimumStrategy, applicationSimulation, universityGuideMatching, tierGroupedRecommendations 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력: 상세
- 추천 전형 방향(recommendedPath) + 대학 추천(recommendations)
- 전형별 상세 전략(typeStrategies: 학생부종합전형/학생부교과전형/수능(정시)전형)
- 대학별 합격 가능성(chance + chanceRationale + chancePercentLabel) + 입시 데이터(admissionData)
- 주의/유리 학교 유형(schoolTypeAnalysis)
- 다음 학기 전략(nextSemesterStrategy: 3~4줄)`,
  premium: `## 플랜별 출력: 정밀
Standard의 모든 항목 + 다음을 추가로 출력합니다:
- 수능 최저 전략(csatMinimumStrategy)
- 6장 카드 배분 시뮬레이션(applicationSimulation): 반드시 아래 형식
  "applicationSimulation": {"description": "수시 6개 + 정시 배분 전략...", "details": [{"admissionType": "학생부종합", "count": 4, "targetUniversities": ["한양대", "중앙대", "경희대", "건국대"]}, {"admissionType": "학생부교과", "count": 2, "targetUniversities": ["서울시립대", "숭실대"]}]}
- 대학별 학종 가이드북 키워드 매칭(universityGuideMatching): **상위 3개 대학만** 배열 형식으로 출력
  "universityGuideMatching": [{"university": "한양대학교", "emphasisKeywords": ["자기주도성", "탐구력"], "studentStrengthMatch": ["세특 탐구 깊이"], "studentWeaknessMatch": ["교과 편차"]}]
- 조합별 대학 추천(tierGroupedRecommendations): "상향 위주" 3개 + "안정 위주" 3개 + "하향 위주" 3개 = 총 9개
- 서울대학교는 학생부교과전형이 없으므로 교과전형 데이터를 생성하지 않습니다.`,
};

const ADMISSION_CONTEXT = `## 정시 학생부 반영 대학 (2028학년도)
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
- recommendations[].chance: "high" | "medium" | "low"
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
- \`tierGroupedRecommendations\`: Premium 전용. 상향 위주/안정 위주/하향 위주 3가지 시나리오별로 6개씩 그룹화하여 총 18개 추천. recommendations와 별도 필드.

## 대학 추천 규칙
- 아래 제공된 "대학 후보군"은 코드에서 학생의 환산 등급을 기반으로 사전 산정한 결과입니다.
- 이 후보군 범위 내에서만 대학을 추천하세요. 후보군에 없는 대학은 추천하지 마세요.
- 커트라인, 경쟁률, 모집인원 등 구체적 입시 수치는 제공된 데이터만 인용하세요. 직접 수치를 생성하지 마세요.
- 역할: 후보군 중 학생의 역량/세특과 가장 잘 매칭되는 대학을 선별하고 전략적 분석을 제공하세요.

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
