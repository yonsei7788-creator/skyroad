/** 섹션 3: 합격 예측 (admissionPrediction) */

import type { ReportPlan } from "../../types.ts";

// ─── 공유 헬퍼 ───

const GRADE_TABLE_5 = `| 등급 | 예상 대학 |
|------|----------|
| 1.0 | 의·치·한·약·수, 서울대, SKY, KAIST, 포항공대 |
| 1.1 | 서강대, 성균관대, 한양대 |
| 1.2 | 중앙대, 경희대, 한국외대, 서울시립대 |
| 1.3 | 건국대, 동국대, 홍익대 |
| 1.4 | 아주대, 인하대, 경북대, 부산대 |
| 1.5 | 국민대, 숭실대, 세종대, 단국대 |
| 1.6~1.7 | 한양대(ERICA), 한국항공대, 광운대, 명지대 |
| 1.8~2.0 | 인천대, 가천대, 경기대 |`;

const GRADE_TABLE_9 = `| 등급 | 예상 대학 |
|------|----------|
| 1.0~1.5 | 의·치·한·약·수, 서울대, SKY, KAIST, 포항공대 |
| 1.5~2.0 | 서강대, 성균관대, 한양대 |
| 2.0~2.5 | 중앙대, 경희대, 한국외대, 서울시립대 |
| 2.5~3.0 | 건국대, 동국대, 홍익대 |
| 3.0~3.5 | 아주대, 인하대, 경북대, 부산대 |
| 3.5~4.0 | 국민대, 숭실대, 세종대, 단국대 |
| 4.0~4.5 | 한양대(ERICA), 광운대, 명지대 |
| 4.5~5.0 | 인천대, 가천대, 경기대 |
| 5.0 이상 | 지방 국립대, 수도권 하위 대학 |`;

const buildGradeContext5 = (variant: "hakjong" | "gyogwa"): string => {
  const hakjongExtra =
    variant === "hakjong"
      ? `\n\n### 5등급제 학종 핵심 원칙
- 등급 변별력이 약하므로 등급만으로 합격선을 판단하면 안 됩니다.
- 동일 등급 내에서도 원점수·세특·선택과목 이수 현황에 따라 합격 여부가 갈립니다.
- rationale에 세특·선택과목·탐구 활동까지 종합 판단하세요.`
      : "";
  return `## 5등급제 ${variant === "hakjong" ? "입시" : "교과전형"} 환경 (이 학생에게 적용)
이 학생은 5등급제(2022 개정 교육과정) 적용 대상입니다.

### 등급별 예상 대학 라인 (일반고 기준${variant === "hakjong" ? ", 학종" : ""})
${GRADE_TABLE_5}

⚠️ 5등급제 2.0 이상의 학생에게 SKY/서성한 급 대학을 추천하면 안 됩니다.${hakjongExtra}
`;
};

const buildGradeContext9 = (variant: "hakjong" | "gyogwa"): string => {
  const cutoffNote =
    variant === "hakjong"
      ? `\n\n### 학종 커트라인 특성
- 학종은 세특/활동/발전가능성을 종합 평가하므로 내신 3.0~3.5까지도 가능`
      : `\n\n### 교과전형 커트라인 특성
- 내신 2.5~3.0 필요
- 교과전형은 최종 등급 기준 성적순 정량 선발이므로 합격선이 높습니다.`;
  return `## 9등급제 ${variant === "hakjong" ? "입시" : "교과전형"} 환경 (이 학생에게 적용)
이 학생은 9등급제(2015 개정 교육과정) 적용 대상입니다.

### 등급별 예상 대학 라인 (일반고 기준${variant === "hakjong" ? ", 학종" : ""})
${GRADE_TABLE_9}${cutoffNote}
⚠️ 내신 5.0 이상의 학생에게 중앙대 이상 대학을 추천하면 안 됩니다.
`;
};

const buildMedicalCtx = (variant: "hakjong" | "gyogwa"): string => {
  if (variant === "gyogwa") {
    return `## ⚠️ 의·치·한·약·수 계열 교과전형 규칙
- 합격선은 0.1~0.2등급 차이로 갈립니다.
- 영어 1등급이 아닌 경우 불리합니다. 학생의 영어 등급을 확인하세요.

`;
  }
  return `## ⚠️ 의·치·한·약·수 계열 합격 예측 규칙 (반드시 적용)
1. **영어 1등급 필수**: 영어 1등급이 아니면 학종 chance를 "high" 이상으로 부여 금지. analysis에 "영어 X등급으로 의·치·한·약·수 기준 충족/미충족" 명시.
2. **합격선 소수점 변별**: 0.1~0.2등급 차이로 갈립니다.
3. **울산대 의과대학**: 지방대이지만 빅5 의대. 합격선을 낮게 추정 금지.
4. **의대 정원 확대**: 2027학년도 약 490명 증원(총 3,548명). N수생 유입으로 경쟁 심화 가능. overallComment에 포함.
5. **3개년 종합 판단**: overallComment에 "3개년 이상 입시 결과 종합 필요" 포함.

`;
};

const buildArtSportCtx = (variant: "hakjong" | "gyogwa"): string => {
  if (variant === "gyogwa") {
    return `## ⚠️ 실기 예체능 학과 규칙 (필수)
universityPredictions는 빈 배열([])로 출력하세요.
analysis에 "실기 전형이 포함된 학과로, 실기 성적에 따라 합격 여부가 크게 달라집니다."를 포함하세요.

`;
  }
  return `## ⚠️ 실기 예체능 학과 규칙 (필수)
universityPredictions는 빈 배열([])로 출력하세요.
overallComment에 "실기 전형이 포함된 학과로, 실기 성적에 따라 합격 여부가 크게 달라집니다."를 포함하세요.

`;
};

/** 플랜별 대학 수 + 분량 제한 (학종/교과 공용) */
const buildPlanOutput = (
  plan: ReportPlan,
  variant: "hakjong" | "gyogwa"
): string => {
  const tierCounts: Record<ReportPlan, string> = {
    lite: "상향/적정/안정/하향 각 1교",
    standard: "상향/적정/안정/하향 각 1~2교",
    premium: "상향/적정/안정/하향 각 2~3교, 상세 분석 포함",
  };

  const analysisDepth: Record<ReportPlan, string> = {
    lite: "간략 근거 (1~2문장)",
    standard: "일반 근거 (2~3문장)",
    premium: "상세 근거 (3~4문장, 역량/성적/활동 구체적)",
  };

  const hakjongExtra =
    variant === "hakjong"
      ? `
- recommendedTypeReason은 **150자 이내**.`
      : "";

  return `## 플랜별 출력
- universityPredictions: ${tierCounts[plan]}. ⚠️ 빈 배열 금지, 4개 티어 모두 포함.
- analysis: ${analysisDepth[plan]}, **250자 이내**.
- overallComment: **300자 이내**.${hakjongExtra}`;
};

/** 공통 규칙: 환산등급 금지 + 영단어 금지 + 티어 표현 금지 */
const COMMON_OUTPUT_RULES = `### ⚠️ 환산 등급 노출 금지
"환산 등급", "보정 등급", "환산 내신", "보정 내신" 등의 표현을 절대 사용하지 마세요.

### ⛔ 본문 표현 금지
- analysis, rationale, overallComment에서 "high", "medium", "low" 등 영단어 사용 금지 → 한글(높음/보통/낮음) 사용.
- "상위권 대학", "중위권 대학", "하위권 대학" 등 티어 분류 표현 금지 → 구체적 대학명 사용.`;

/** 공통: 티어별 chance 매핑 */
const TIER_CHANCE_RULES = `### 티어별 chance 매핑
- "하향" 티어 대학 → chance "very_high" 또는 "high" (안전 지원)
- "안정" 티어 대학 → chance "high" 또는 "medium"
- "적정" 티어 대학 → chance "medium"
- "상향" 티어 대학 → chance "low" 또는 "very_low"
- ⚠️ 안정/하향 대학은 반드시 "medium" 이상. 모든 대학이 "low"/"very_low"만 나오면 안 됩니다.`;

/** 공통: rationale 규칙 */
const RATIONALE_RULES = `### rationale 규칙
- 각 대학별 rationale는 **200자 이내**.
- 대학별 rationale가 동일하거나 등급 부분만 다르면 품질 실패. 각 대학의 전형 특성, 경쟁률, 학생 강점/약점 중 해당 대학에 특히 유리/불리한 요소를 반영하여 차별화하세요.`;

/** 공통: 추천 등급 범위 */
const GRADE_RANGE_RULES = `### 추천 등급 범위
- 5등급제: 학생 등급 기준 **±0.5등급 범위** 내 대학 위주
- 9등급제: 학생 등급 기준 **±1.5등급 범위** 내 대학 위주`;

// ─── 교과전형 전용 ───

export interface GyogwaPredictionPromptInput {
  academicAnalysis: string;
  universityCandidates: string;
  studentProfile: string;
  academicAnalysisResult?: string;
  targetUniversities?: string;
  gradingSystem?: "5등급제" | "9등급제";
  isMedical?: boolean;
  isArtSportPractical?: boolean;
  noGyogwaTargets?: boolean;
  hopeDepartment?: string;
}

export const buildGyogwaPredictionPrompt = (
  input: GyogwaPredictionPromptInput,
  plan: ReportPlan
): string => {
  const hasTargetUniversities =
    !!input.targetUniversities && input.targetUniversities.trim().length > 0;

  const additionalInputs = [
    input.academicAnalysisResult
      ? `### 성적 분석 결과 (상세)\n${input.academicAnalysisResult}`
      : "",
    hasTargetUniversities
      ? `### 유저 설정 희망대학 (교과전형만 해당)\n${input.targetUniversities}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const gradeContext =
    input.gradingSystem === "5등급제"
      ? buildGradeContext5("gyogwa")
      : input.gradingSystem === "9등급제"
        ? buildGradeContext9("gyogwa")
        : "";

  const medicalContext = input.isMedical ? buildMedicalCtx("gyogwa") : "";
  const artSportContext = input.isArtSportPractical
    ? buildArtSportCtx("gyogwa")
    : "";

  const targetUniversityRule = input.noGyogwaTargets
    ? `### universityPredictions 비활성화
universityPredictions는 빈 배열([])로 출력하세요.
analysis와 overallComment는 학생의 최종 평균 등급과 등급별 대학 라인 테이블을 비교하여 일반적 포지션만 서술하세요.`
    : hasTargetUniversities
      ? (() => {
          const tuList = input
            .targetUniversities!.split("\n")
            .filter((l) => l.startsWith("- "))
            .map((l) =>
              l
                .replace(/^- \d+지망: /, "")
                .replace(/ \(.*$/, "")
                .trim()
            );
          return `### ⛔ 희망대학 전수 포함 (최우선 — 1개라도 누락 시 품질 실패)
아래 대학을 universityPredictions에 **전부** 포함하세요:
${tuList.map((u, i) => `${i + 1}. ${u}`).join("\n")}

⚠️ 위 ${tuList.length}개 전부 포함 필수. 희망대학 외 대학은 추가 금지.`;
        })()
      : `### 대학 선정 규칙
- 코드 산정 대학 후보군에서 선택. 후보군에 없는 대학 추가 금지.`;

  return `${gradeContext}${medicalContext}${artSportContext}## 작업
학생의 **최종 등급**과 등급별 대학 라인 테이블을 비교하여 **학생부교과전형** 합격 가능성을 예측하세요.

## 서술 관점: 입시 전략가 — 합격선 대비 포지션 분석
- "합격선 대비 여유가 있다", "합격선에 근접한다" 등 상대적 표현 사용.
- ⛔ 합격선의 구체적 등급 수치 언급 금지. ⛔ 개별 과목명·과목별 등급 언급 금지.
- ⛔ 약점 진단·보완 방향·등급 추세 분석은 다른 섹션 담당 → 여기서는 합격 가능성 **판단**만.

## 핵심 원칙
- 교과전형은 **최종 평균 등급**이 유일한 핵심 평가 기준.
- 교과 조합별 평균(국영수사과, 국영수사, 국영수과 등)도 참고.
- 전 과목 또는 주요 교과 평균으로 반영하므로 전체 평균 등급 기준으로만 서술.

## 입력 데이터

### 성적 분석 결과
${input.academicAnalysis}

${
  input.noGyogwaTargets
    ? `### 학생 희망 학과\n${input.hopeDepartment ?? "미등록"}\n`
    : hasTargetUniversities
      ? ""
      : `### 코드 산정 대학 후보군\n${input.universityCandidates}\n`
}
### 학생 프로필
${input.studentProfile}

${additionalInputs}

## 출력 JSON 스키마

{
  "admissionType": "교과",
  "passRateLabel": "40~50%",
  "passRateRange": [40, 50],
  "analysis": "최종 평균 등급이 합격선 대비 여유가 있어...",
  "overallComment": "학생의 교과전형 전체 전략과 핵심 조언 (200~300자)",
  "universityPredictions": [
    {"university": "한양대학교", "department": "행정학과", "chance": "medium", "rationale": "최종 평균 등급이 합격선에 근접하여..."}
  ]
}

- chance: "very_high" | "high" | "medium" | "low" | "very_low"
- passRateRange: [하한, 상한], 10% 단위.

## 교과전형 분석 방법
1. 최종 평균 등급과 교과 조합 평균 확인.
2. 등급별 대학 라인 테이블 참조하여 합격선 대비 위치 판단.
3. 등급이 합격선보다 좋으면(숫자 낮으면) → chance "high" 이상
4. 등급이 합격선과 비슷하면(±0.3) → chance "medium"
5. 등급이 합격선보다 나쁘면(숫자 높으면) → chance "low" 이하

⚠️ **평균 등급 기반 chance 상한 규칙**:
- 9등급제: 전체 평균 5.0↑ → "medium" 이상 금지, 6.0↑ → "low" 이하.
- 5등급제: 전체 평균 3.5↑ → "medium" 이상 금지, 4.0↑ → "low" 이하.

${GRADE_RANGE_RULES}

${TIER_CHANCE_RULES}

${RATIONALE_RULES}

${targetUniversityRule}

${COMMON_OUTPUT_RULES}

${buildPlanOutput(plan, "gyogwa")}`;
};

// ─── 학종 전용 ───

export interface HakjongPredictionPromptInput {
  competencyExtraction: string;
  academicAnalysis: string;
  studentTypeClassification: string;
  universityCandidates: string;
  studentProfile: string;
  subjectAnalysisResult?: string;
  academicAnalysisResult?: string;
  attendanceAnalysisResult?: string;
  majorEvaluationContext?: string;
  targetUniversities?: string;
  gradingSystem?: "5등급제" | "9등급제";
  isMedical?: boolean;
  isArtSportPractical?: boolean;
  includeNonsul?: boolean;
  noHakjongTargets?: boolean;
  hopeDepartment?: string;
}

export const buildHakjongPredictionPrompt = (
  input: HakjongPredictionPromptInput,
  plan: ReportPlan
): string => {
  const hasTargetUniversities =
    !!input.targetUniversities && input.targetUniversities.trim().length > 0;

  const additionalInputs = [
    input.subjectAnalysisResult
      ? `### 교과 세특 분석 결과\n${input.subjectAnalysisResult}`
      : "",
    input.academicAnalysisResult
      ? `### 성적 분석 결과 (상세)\n${input.academicAnalysisResult}`
      : "",
    input.attendanceAnalysisResult
      ? `### 출결 분석 결과\n${input.attendanceAnalysisResult}`
      : "",
    hasTargetUniversities
      ? `### 유저 설정 희망대학 (합격 예측 참고용 — 분석 방향을 좌우하면 안 됨)\n⚠️ 아래 희망대학은 해당 대학의 합격 가능성 예측에만 사용하세요.\n${input.targetUniversities}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const gradeContext =
    input.gradingSystem === "5등급제"
      ? buildGradeContext5("hakjong")
      : input.gradingSystem === "9등급제"
        ? buildGradeContext9("hakjong")
        : "";

  const medicalContext = input.isMedical ? buildMedicalCtx("hakjong") : "";
  const artSportContext = input.isArtSportPractical
    ? buildArtSportCtx("hakjong")
    : "";

  const targetUniversityRule = input.noHakjongTargets
    ? `### universityPredictions 비활성화
universityPredictions는 빈 배열([])로 출력하세요.
analysis와 overallComment는 일반적 포지션만 서술하세요.`
    : hasTargetUniversities
      ? `### ⚠️ 유저 설정 희망대학 우선 규칙
- 유저 희망대학 중 **(학생부종합)** 전형 대학은 학종 predictions에 포함.
- **(학생부교과)** 전형 대학은 이 호출에서 제외 (별도 교과 분석).
- 학종 희망대학은 빠짐없이 포함. 희망대학 외 대학 추가 금지.`
      : `- "유저 설정 희망대학"이 없으므로, 코드 산정 대학 후보군에서 선택하세요.`;

  const nonsulContext = input.includeNonsul
    ? `## 논술전형 분석 (필수)
predictions에 admissionType: "논술"을 포함하세요.
- 논술 실력은 검증 불가 → 내신 등급과 논술 반영 비율 기준 보수적 판단.
- passRateLabel에 "논술 성적에 따라 변동" 명시.
- analysis에서 수학/국어/사회 교과 성적 기반 수리논술/인문논술 적합도 서술.

`
    : "";

  return `${gradeContext}${medicalContext}${artSportContext}${nonsulContext}## 작업
학생의 역량 분석 결과와 성적 데이터를 바탕으로 **학생부종합전형**${input.includeNonsul ? "과 **논술전형**" : ""} 합격 가능성을 예측하세요.
⚠️ **이 호출에서는 학생부교과전형을 분석하지 마세요.** predictions에 "교과"/"정시" admissionType 포함 금지.${!input.includeNonsul ? " 논술전형도 포함하지 마세요." : ""}

## 서술 관점: 입시 전략가 — 합격선 대비 포지션 분석
- "합격선 대비 여유가 있다", "~전형에서 ~요소가 유리/불리하게 작용한다" 등 전략 분석 어투.
- ⛔ 합격선의 구체적 등급 수치 언급 금지 → 상대적 표현만.
- ⛔ 약점 진단·등급 상세 해석·보완 전략은 다른 섹션 담당 → 여기서는 합격 가능성 **판단**만.
- "~요소가 합격에 유리/불리하게 작용한다"는 허용, "~가 부족하다/약점이다"는 금지.

## ⛔ 용어 규칙
- "전공적합성" 사용 금지 → 현재 학종 평가 기준은 **"진로역량"**.
- overallComment, analysis는 "생기부에서 ~분야 역량이 확인되며"로 시작.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 유형 분류 결과
${input.studentTypeClassification}

${
  input.noHakjongTargets
    ? `### 학생 희망 학과\n${input.hopeDepartment ?? "미등록"}\n`
    : hasTargetUniversities
      ? ""
      : `### 코드 산정 대학 후보군\n${input.universityCandidates}\n`
}
### 학생 프로필
${input.studentProfile}

${additionalInputs}

${input.majorEvaluationContext ? `### 학생 희망 학과 평가 기준 (입학사정관 관점)\n${input.majorEvaluationContext}` : ""}

## ⛔ 학과 적합도 판단 (필수)
- 역량 추출 결과의 실제 활동/탐구가 희망 학과 평가 기준에 부합하는지 **있는 그대로** 판단.
- ❌ 활동이 다른 분야 중심인데 "희망 학과에 적합하다" 금지.
- ✅ 부합하면: "세특에서 [구체 활동]이 확인되어 진로역량이 우수합니다"
- ✅ 미부합: "세특에서 [실제 분야] 탐구는 풍부하나, [희망 학과]와 직접 연관성이 낮아 진로역량 평가에서 불리합니다"

## 출력 JSON 스키마

{
  "sectionId": "admissionPrediction",
  "title": "희망 학교·학과 판단",
  "recommendedType": "학종",
  "recommendedTypeReason": "학생의 세특 내용과 활동 이력이 학종에 적합하며...",
  "predictions": [
    {
      "admissionType": "학종",
      "passRateLabel": "60~70%",
      "passRateRange": [60, 70],
      "analysis": "세특 내용의 질과 활동의 일관성이 학종에서 경쟁력이...",
      "universityPredictions": [
        {"university": "한양대학교", "department": "행정학과", "chance": "medium", "rationale": "등급 경쟁력은 보통 수준이나, 세특 전반에서 행정학 관련 탐구가 부족하여 진로역량 평가에서 불리합니다."}
      ]
    }
  ],
  "overallComment": "학생부종합전형을 주력으로 하되..."
}

- **admissionType**: "학종"${input.includeNonsul ? ' | "논술"' : ""} | "고른기회" 중 하나. "교과"/"정시" 포함 금지.${!input.includeNonsul ? ' "논술"도 포함 금지.' : ""}
- **recommendedType**: "학종"${input.includeNonsul ? ' | "논술"' : ""} | "고른기회" 중 추천.
- **chance**: "very_high" | "high" | "medium" | "low" | "very_low"
- **passRateLabel**: "데이터 없음"으로 고정, **passRateRange**: [0, 0]으로 고정.

## 학종 분석 규칙

### rationale에 "진로역량" 필수
- rationale과 analysis에서 교과성적만 언급 금지. 학종은 진로역량 40~50% + 학업역량 + 공동체역량 + 발전가능성 종합 평가.
- **rationale에 반드시 "진로역량" 단어 포함**, 생기부 내용과 학과의 관련성 평가.

### 단일 과목만으로 진로역량 인정 금지
- 특정 과목 1개의 활동으로 "합격 가능성이 높다" 금지. 학종 진로역량은 생기부 **전반**의 일관된 관련 서술로 판단.

### 학종 상향 지원 시 보완 멘트 (필수)
chance가 "low"/"very_low"인 대학의 rationale에는, 어려움을 솔직히 서술한 뒤 "학종은 성적만으로 판단하지 않으므로 면접에서 탐구 역량과 진로 일관성을 어필하면 합격 가능성을 높일 수 있다"는 방향의 보완 문장 필수.
- ❌ "커트라인 기준 상향"으로만 끝내면 안 됩니다. ❌ chance 판단 자체를 완화하면 안 됩니다.

⚠️ **핵심 교과 부진 시 chance 상한**:
- 9등급제: 핵심 교과 6등급↓ → "medium" 이상 금지
- 5등급제: 핵심 교과 4등급↓ → "medium" 이상 금지

⚠️ **학종 합격률 조정**: "학과 맞춤 평가 기준" 제공 시, 핵심 교과 성취도 + 관련 활동 일치도 기반으로 ±10%p 조정.

## 추천 전형 (recommendedType)
- "학종", "고른기회" 중 선택. 추천 이유 2~3줄.
- ⚠️ 하나의 전형만 단순 추천 금지. 학생 상황별로 어떤 전형이 유리한지 구분하여 서술.

## universityPredictions 규칙
⚠️ 반드시 출력. 빈 배열 금지. 각 항목에 chance 필드 필수.

${TIER_CHANCE_RULES}

${RATIONALE_RULES}

${
  input.noHakjongTargets || hasTargetUniversities
    ? ""
    : `## 대학 추천 개인화 규칙
- universityPredictions는 **"코드 산정 대학 후보군"에 포함된 대학만** 사용. ⛔ 후보군 외 대학 추가 금지.
- 후보군 중 학생의 세특/활동과 학과 적합성이 높은 대학 우선.

${GRADE_RANGE_RULES}

### 특성화고 학생: 특성화고 특별전형 대학 우선 추천.
### 여자대학교: 남학생에게 추천 금지. 확실하지 않으면 제외.

### 합격가능성 분포
- 후보군 내에서 다양한 chance 분포 배분. "very_high"가 전체 50% 초과 금지.
`
}
${targetUniversityRule}

### 종합 코멘트 (overallComment)
- 가장 유리한 전형, 원서 구성 전략을 2~3줄로 서술.
- 대학별 합격가능성은 universityPredictions에 포함되므로, 전형 전략과 종합 조언에 집중.

${COMMON_OUTPUT_RULES}

## ⛔ 출력 전 자기 검증 (반드시 수행)
1. 모든 universityPredictions[].rationale에 "진로역량"이라는 단어가 포함되었는가? (❌ "전공적합성" 사용 금지)
2. 유저 설정 희망대학이 있는 경우, **모든 희망대학이 빠짐없이** universityPredictions에 포함되었는가?
3. predictions에 "교과" 또는 "정시" admissionType이 포함되지 않았는가?

${buildPlanOutput(plan, "hakjong")}`;
};
