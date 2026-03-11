/** 섹션 3: 합격 예측 (admissionPrediction) */

import type { ReportPlan } from "../../types.ts";

export interface AdmissionPredictionPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentTypeClassification: string;
  universityCandidates: string;
  studentProfile: string;
  /** Group 4 시점에서 추가되는 입력 */
  competencyEvaluationResult?: string;
  subjectAnalysisResult?: string;
  academicAnalysisResult?: string;
  attendanceAnalysisResult?: string;
  /** 코드 산정 기본 합격률 (등급-커트라인 기반) */
  basePassRates?: string;
  /** 계열별 입학사정관 평가 기준 */
  majorEvaluationContext?: string;
}

const PLAN_SPECIFIC: Record<ReportPlan, string> = {
  lite: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 간략 근거 + 종합 코멘트를 출력합니다.
- universityPredictions 필드는 출력하지 않습니다.`,
  standard: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 간략 근거 + 종합 코멘트를 출력합니다.
- 추가로 전형별 주요 대학 예측(universityPredictions)을 포함합니다: 상향/적정/안정/하향 각 1~2교.
- ⚠️ 반드시 4개 티어(상향/적정/안정/하향) 모두 포함하세요. 하향 대학은 합격 가능성이 높은 안전 지원 대학입니다.

⚠️ **분량 제한 (반드시 준수)**:
- 각 전형(학종/교과/정시)의 analysis는 반드시 **150자 이내**로 작성합니다. 150자 초과 금지.
- overallComment는 **200자 이내**로 작성합니다. 200자 초과 금지.
- recommendedTypeReason은 **100자 이내**로 작성합니다.`,
  premium: `## 플랜별 출력
- 추천 전형 + 전형별 합격률 범위 + 상세 근거 + 종합 코멘트를 출력합니다.
- 추가로 전형별 주요 대학 예측(universityPredictions)을 포함합니다: 상향/적정/안정/하향 각 2~3교, 더 상세한 분석 포함.
- ⚠️ 반드시 4개 티어(상향/적정/안정/하향) 모두 포함하세요. 하향 대학은 합격 가능성이 높은 안전 지원 대학입니다.

⚠️ **분량 제한 (반드시 준수)**:
- 각 전형(학종/교과/정시)의 analysis는 반드시 **250자 이내**로 작성합니다. 250자 초과 금지.
- overallComment는 **300자 이내**로 작성합니다. 300자 초과 금지.
- recommendedTypeReason은 **150자 이내**로 작성합니다.`,
};

export const buildAdmissionPredictionPrompt = (
  input: AdmissionPredictionPromptInput,
  plan: ReportPlan
): string => {
  const additionalInputs = [
    input.basePassRates
      ? `### 코드 산정 기본 합격률 (등급-커트라인 기반, 필수 참조)\n${input.basePassRates}`
      : "",
    input.competencyEvaluationResult
      ? `### 역량별 종합 평가 결과\n${input.competencyEvaluationResult}`
      : "",
    input.subjectAnalysisResult
      ? `### 교과 세특 분석 결과\n${input.subjectAnalysisResult}`
      : "",
    input.academicAnalysisResult
      ? `### 성적 분석 결과 (상세)\n${input.academicAnalysisResult}`
      : "",
    input.attendanceAnalysisResult
      ? `### 출결 분석 결과\n${input.attendanceAnalysisResult}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return `## 작업
학생의 역량 분석 결과와 성적 데이터를 바탕으로 전형별 합격 가능성을 예측하세요.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 코드 산정 대학 후보군
${input.universityCandidates}

### 학생 프로필
${input.studentProfile}

${additionalInputs}

${input.majorEvaluationContext ? `### 학과 맞춤 평가 기준 (입학사정관 관점)\n${input.majorEvaluationContext}` : ""}

## 출력 JSON 스키마

중요: predictions 배열의 각 요소는 반드시 아래와 같은 완전한 객체여야 합니다.

{
  "sectionId": "admissionPrediction",
  "title": "합격 예측",
  "recommendedType": "학종",
  "recommendedTypeReason": "학생의 세특 내용과 활동 이력이 학종에 적합하며...",
  "predictions": [
    {
      "admissionType": "학종",
      "passRateLabel": "60~70%",
      "passRateRange": [60, 70],
      "analysis": "세특 내용의 질과 활동의 일관성이 학종에서 경쟁력이...",
      "universityPredictions": [
        {"university": "한양대학교", "department": "행정학과", "chance": "medium", "rationale": "세특 내용은 우수하나 내신이..."}
      ]
    },
    {
      "admissionType": "교과",
      "passRateLabel": "40~50%",
      "passRateRange": [40, 50],
      "analysis": "내신 등급이 교과전형 지원에는 다소 부족하며...",
      "universityPredictions": []
    }
  ],
  "overallComment": "학생부종합전형을 주력으로 하되..."
}

- **"간략 근거" (Lite)** = analysis 필드에 1~2문장으로 핵심만 서술
- **"상세 근거" (Premium)** = analysis 필드에 3~4문장으로 역량/성적/활동 근거를 구체적으로 서술

## 출력 지시

### 추천 전형 (recommendedType)
- "학종", "교과", "정시" 중 학생에게 가장 적합한 전형을 선택합니다.
- 추천 이유를 2~3줄로 서술합니다.
- 특성화고/과학고/외고 등 특수 학교유형인 경우, 해당 학교유형 특별전형도 고려하여 안내합니다.

### 전형별 합격 예측 (predictions)
**admissionType은 반드시 다음 3개 중 하나:** "학종" | "교과" | "정시". "학생부종합" 등 다른 표현 금지.
**chance는 반드시 다음 5개 중 하나:** "very_high" | "high" | "medium" | "low" | "very_low". 다른 값 금지.
학종, 교과, 정시 각 전형에 대해:
- 합격률 표시 (예: "60~70%")
- 합격률 수치 범위 [하한, 상한] (예: [60, 70])
- 근거 분석 (2~3줄)
  - 학종: 역량 점수, 세특 품질, 활동 일관성 기반 + **학과 맞춤 평가 기준 반영**
  - 교과: 내신 등급, 교과 조합 평균 기반
  - 정시: 모의고사 데이터 기반 (없으면 "데이터 부족" 표시)

⚠️ **학종 합격률 조정 시 학과 적합성 반영**: 아래에 "학과 맞춤 평가 기준"이 제공된 경우, 해당 계열의 핵심 교과 성취도와 관련 활동 일치도를 기반으로 ±10%p 조정폭을 결정하세요.
- 핵심 교과 성취도가 전체 평균보다 우수하고, 관련 탐구 활동이 풍부하면 → 상향 조정 (+5~10%p)
- 핵심 교과 성취도가 전체 평균보다 부진하거나, 관련 활동이 빈약하면 → 하향 조정 (-5~10%p)

### 합격 예측 산출 규칙 (필수 준수)

⚠️ **코드 산정 기본 합격률을 반드시 기준으로 사용하세요.**
입력 데이터의 "코드 산정 기본 합격률"에 대학별 basePassRate가 제공됩니다.
이 수치는 학생의 환산 등급과 대학별 커트라인 등급 차이(gradeDiff)로 정량 산출된 값입니다.

- **기본 합격률(basePassRate)에서 ±10%p(aiAdjustMax) 범위 내에서만 조정** 가능합니다.
- 세특 품질, 활동 일관성, 출결 등 정성적 요소로 기본값 대비 최대 +10%p 또는 -10%p 조정합니다.
- 예시: 기본 합격률 [10, 20]이면 → 최종 합격률은 0~30% 범위 내
- 예시: 기본 합격률 [40, 50]이면 → 최종 합격률은 30~60% 범위 내

**절대 규칙:**
- gradeDiff가 +0.5 이상(학생 등급이 커트라인보다 0.5등급 이상 낮음)인 대학에 대해 합격률 50% 이상 부여 금지
- gradeDiff가 +1.0 이상인 대학에 대해 합격률 30% 이상 부여 금지
- universityPredictions의 chance 값도 합격률과 일치시키세요: 80%+ → "very_high", 60~79% → "high", 40~59% → "medium", 20~39% → "low", 0~19% → "very_low"

⚠️ **티어별 chance 기대값 (후보군 티어와 chance가 일관되어야 함)**:
- "하향" 티어 대학 → chance는 보통 "very_high" 또는 "high" (안전 지원)
- "안정" 티어 대학 → chance는 보통 "high" 또는 "medium"
- "적정" 티어 대학 → chance는 보통 "medium"
- "상향" 티어 대학 → chance는 보통 "low" 또는 "very_low" (도전 지원)
- ⚠️ 모든 대학이 "low"/"very_low"만 나오면 안 됩니다. 안정/하향 대학은 반드시 "medium" 이상이어야 합니다.

⚠️ **핵심 교과 부진 시 chance 상한 규칙**:
- 목표 학과의 핵심 교과(학과 맞춤 평가 기준의 keySubjects) 성적이 6등급 이하인 경우, 해당 학과의 chance를 "medium" 이상으로 부여하지 마세요.
- 핵심 교과 2개 이상이 6등급 이하인 경우, chance를 "low" 이하로 제한하세요.

- 합격률 범위는 10% 단위로 설정합니다 (예: 50~60%, 70~80%).
- 전형별 합격률 산출 기준:
  - 학종: 기본 합격률 + 세특 품질/활동 일관성/출결 보정
  - 교과: 기본 합격률 기준 (등급이 핵심이므로 조정폭 최소)
  - 정시: 모의고사 데이터 기반 (없으면 "데이터 부족" 표시)

### universityPredictions 구성 규칙 (필수)
⚠️ **universityPredictions에는 반드시 다양한 chance 분포가 포함되어야 합니다.**
- 입력 데이터의 "코드 산정 대학 후보군"에 상향/적정/안정/하향 티어가 모두 포함되어 있습니다.
- universityPredictions에 **안정/하향 티어 대학을 반드시 포함**하세요. 이들은 chance가 "high" 또는 "very_high"여야 합니다.
- 상향 대학만 나열하면 모든 대학이 "low"/"very_low"로 보여 학생에게 좌절감을 줍니다. **절대 금지.**
- 후보군의 tier 정보를 그대로 반영하세요: 하향 대학 → "very_high"/"high", 안정 → "high"/"medium", 적정 → "medium", 상향 → "low"/"very_low"

### 목표 대학 분석 (필수)
- 학생 프로필에 목표 대학이 있으면, universityPredictions에 **반드시 목표 대학을 포함**하세요.
- 합격이 어려워도 "왜 어려운지 + 현실적 대안"을 구체적으로 서술하세요.
- 목표 대학이 후보군에 없으면 가장 유사한 대학의 데이터를 참조하여 분석하세요.

### 종합 코멘트 (overallComment)
- 전형별 예측을 종합하여 최종 조언을 2~3줄로 서술합니다.
- 목표 대학이 비현실적인 경우, 솔직하게 현실적 대안을 제시하세요.

${PLAN_SPECIFIC[plan]}`;
};
