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
  // chance 분포 가이드 — 본문에 쓰지 말아야 할 한글 라벨 어휘를 프롬프트에 인용하면
  // 모델이 그 단어를 본문에 그대로 사용하므로, chance 영문 값으로만 분포를 지시한다.
  const chanceCounts: Record<ReportPlan, string> = {
    lite: '총 4교 (chance "very_high"/"high" 1교, "medium" 1교, "low" 1교, "very_low" 1교)',
    standard:
      '총 4~8교 (chance "very_high"/"high" 1~2교, "medium" 1~2교, "low" 1~2교, "very_low" 1~2교)',
    premium:
      '총 8~12교 (chance "very_high"/"high" 2~3교, "medium" 2~3교, "low" 2~3교, "very_low" 2~3교, 상세 분석 포함)',
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
- universityPredictions: ${chanceCounts[plan]}. ⚠️ 빈 배열 금지, chance 분포 다양화 필수("very_high"/"high"가 반드시 1교 이상 포함).
- analysis: ${analysisDepth[plan]}, **250자 이내**.
- overallComment: **300자 이내**.${hakjongExtra}`;
};

/** 공통 규칙: 환산등급 금지 + 영단어 금지 + 라벨 분류 표현 금지 */
const COMMON_OUTPUT_RULES = `### ⚠️ 환산 등급 노출 금지
"환산 등급", "보정 등급", "환산 내신", "보정 내신" 등의 표현을 절대 사용하지 마세요.

### ⛔ 본문 표현 금지 (analysis, rationale, overallComment 모든 본문 필드 공통)
- "high", "medium", "low" 등 영단어 사용 금지 → 한글(높음/보통/낮음) 사용.
- "상위권 대학", "중위권 대학", "하위권 대학" 등 대학 등급 묶음 표현 금지 → 구체적 대학명 사용.
- 짧은 한글 라벨(예: "○○ 지원", "○○ 라인", "○○ 추천", "○○ 합격권") 형태로 대학을 분류하지 마세요.
  → 대학별 합격 가능성은 chance 필드(영문 값)로만 표현하고, 본문에서는 아래 chance 표현 규칙의 풀어쓴 톤만 사용하세요.`;

/** 공통: chance 영문 값별 본문 표현 가이드 */
const TIER_CHANCE_RULES = `### chance 영문 값별 본문 표현 (필수)
chance를 본문에서 풀어 쓸 때는 다음 톤만 사용하세요. 짧은 분류 라벨 형태로 변환하지 마세요.
- chance "very_high"/"high" → "안정적으로 지원이 가능할 것으로 보입니다" 톤 (예: "현 등급 기준 합격선보다 여유가 있어 안정적으로 지원이 가능할 것으로 보입니다.")
- chance "medium" → "지원이 가능한 구간 안에 있다고 볼 여지가 있습니다" 톤 (예: "합격선과 비슷한 구간으로, 지원이 가능한 구간 안에 있다고 볼 여지가 있습니다.")
- chance "low"/"very_low" → "지원이 어려울 수 있습니다" 톤 (예: "합격선 대비 등급 격차가 있어 지원이 어려울 수 있습니다.")
- ⚠️ chance 분포는 다양화 필수. "very_high"/"high"가 반드시 1교 이상 포함되어야 하며, 모든 대학이 "low"/"very_low"만 나오면 안 됩니다.`;

/** 공통: rationale 규칙 */
const RATIONALE_RULES = `### rationale 규칙
- 각 대학별 rationale는 **200자 이내**.
- 대학별 rationale가 동일하거나 등급 부분만 다르면 품질 실패. 각 대학의 전형 특성, 경쟁률, 학생 강점/약점 중 해당 대학에 특히 유리/불리한 요소를 반영하여 차별화하세요.`;

/** 공통: 추천 등급 범위 */
const GRADE_RANGE_RULES = `### 추천 등급 범위
- 5등급제: 학생 등급 기준 **±0.5등급 범위** 내 대학 위주
- 9등급제: 학생 등급 기준 **±1.5등급 범위** 내 대학 위주`;

/**
 * 공통: 합격 가능성 서술 시 "전체 평균 등급 + 합격선 대비 위치" 두 축만 사용하도록
 * 유도하는 긍정 예시 블록. 과목별 편차·약점·추세 등 academicAnalysis 어휘가
 * 본문에 누출되는 문제를 prohibition 대신 모델이 따라 쓰기 좋은 문장 패턴으로 막는다.
 */
const OVERALL_ONLY_EXAMPLES = `### ✅ 합격 가능성 서술 문장 패턴 (이 패턴만 사용)
이 섹션의 본문(analysis, rationale, overallComment)은 항상 **"최종 평균 등급" 또는 "생기부 전반"**을 주어로 삼고, **합격선 대비 위치 / 전형 적합도**의 두 축으로만 서술합니다. 특정 과목명을 주어로 삼은 문장은 academicAnalysis 섹션의 책임 영역이므로, 이 섹션에서는 사용하지 않습니다.

권장 문장 패턴 (이 톤을 모방):
- ✅ "최종 평균 등급 X등급 기준, ○○대학교 합격선 대비 여유가 있는 구간에 위치합니다."
- ✅ "전체 평균 등급이 합격선과 근접한 구간이라, 면접·서류 등 다른 평가 요소가 변별력으로 작용할 수 있습니다."
- ✅ "최종 평균 등급이 합격선 대비 격차가 커 지원 가능성이 제한되는 구간입니다."
- ✅ "생기부 전반에서 진로 일관성과 탐구 깊이가 드러나, 학종 평가 요소 중 진로역량에서 유리하게 작용할 가능성이 있습니다."
- ✅ "교과 전 영역의 평균 등급이 안정적으로 유지되고 있어, 학생부교과전형의 정량 기준에 부합하는 수준입니다."

→ 모든 합격 가능성 서술의 주어는 "최종 평균 등급" / "전체 평균" / "생기부 전반" / "교과 전 영역" 중 하나입니다. "수학 과목은…", "영어 등급이…", "이 과목들의 편차는…"처럼 개별 과목·과목군이 주어가 되는 문장이 본문에 등장하면, 그 문장은 academicAnalysis 섹션의 영역으로 간주되어 이 섹션의 책임 범위를 벗어납니다.`;

/** noTargets 변형: 특정 합격선이 없으므로 "전형 적합도" 톤만 사용 */
const OVERALL_ONLY_EXAMPLES_NO_TARGETS = `### ✅ 전형 적합도 서술 문장 패턴 (이 패턴만 사용)
이 호출은 특정 대학의 합격선과 비교하는 호출이 아닙니다. 본문은 항상 **"최종 평균 등급" 또는 "생기부 전반"**을 주어로 삼고, **해당 전형의 정량/정성 기준에 대한 적합도**만 서술합니다. 특정 과목명을 주어로 삼은 문장은 academicAnalysis 섹션의 책임 영역이므로, 이 섹션에서는 사용하지 않습니다.

권장 문장 패턴 (이 톤을 모방):
- ✅ "최종 평균 등급은 X등급으로, 학생부교과전형은 전체 평균 등급을 핵심 기준으로 삼는 정량 평가입니다."
- ✅ "전체 평균 등급이 안정적으로 유지되어, 학생부교과전형의 정량 기준 측면에서는 일정한 활용 가능성이 있습니다."
- ✅ "생기부 전반에서 진로 일관성과 탐구 깊이가 확인되어, 학종 평가에서 진로역량/학업역량 측면의 적합도가 드러납니다."
- ✅ "구체적인 합격 가능성은 희망 대학을 등록한 뒤 별도 분석에서 판단할 수 있습니다."

→ 모든 서술의 주어는 "최종 평균 등급" / "전체 평균" / "생기부 전반" 중 하나입니다. "수학 과목의 편차는…", "영어 등급이…"처럼 개별 과목이 주어가 되는 문장이 본문에 등장하면, 그 문장은 academicAnalysis 섹션의 영역으로 간주되어 이 섹션의 책임 범위를 벗어납니다.`;

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
  hopeDepartment?: string;
}

export const buildGyogwaPredictionPrompt = (
  input: GyogwaPredictionPromptInput,
  plan: ReportPlan
): string => {
  const hasTargetUniversities =
    !!input.targetUniversities && input.targetUniversities.trim().length > 0;

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

  // ── 희망대학 0건: "전형 적합도 일반 판단" 모드 ──
  // 학과 정보가 없으므로 특정 합격선 비교/단정 표현 금지. 학생 생기부가
  // 학생부교과전형에 적합한지 일반 판단만 출력 (universityPredictions=[]).
  if (!hasTargetUniversities) {
    return `## 작업
학생이 학생부교과전형 희망대학을 등록하지 않았습니다. 이 호출은 **이 학생의 생기부가 학생부교과전형에 어떤 적합도를 가지는지** 일반 판단을 출력합니다. 특정 대학과의 합격 가능성 판단은 수행하지 않습니다.

## ⛔ 절대 금지
- "합격선 대비 여유가 있다", "안정적으로 지원이 가능하다", "지원이 어려울 수 있다" 등 **합격선 대비 단정 표현 금지** (특정 학과의 합격선 정보가 없으므로 판단 불가).
- 특정 대학명 또는 대학군 추정 금지.
- **개별 과목 편차·과목별 등급·약점·성적 추세** 언급 금지 (이는 academicAnalysis 영역).
- 짧은 한글 라벨(예: "○○ 지원", "○○ 라인", "○○ 추천", "○○ 합격권") 형태로 분류 금지.
- "이 과목들", "이러한 과목" 등 antecedent 없는 과목 지칭 금지.

## ✅ 작성 가이드
- 학생의 최종 평균 등급은 **사실로만** 서술 가능 (예: "최종 평균 등급은 X등급입니다").
- 학생부교과전형의 평가 특성("최종 평균 등급이 핵심 기준", "전 과목 또는 주요 교과 평균으로 반영")을 일반 안내로 제공.
- 학생 생기부에서 드러난 **전반적 학업 안정성/진로 일관성** 관점에서 교과전형 활용 가능성을 일반 판단으로 서술.
- 최종 평균 등급이 학생부교과전형에서 어느 정도 경쟁력을 가질지에 대한 **일반적·전반적 평가**까지만.
- 합격 가능성은 희망 대학을 등록한 뒤 별도 판단이 필요함을 자연스럽게 안내.

${OVERALL_ONLY_EXAMPLES_NO_TARGETS}

## 입력 데이터

### 성적 분석 결과
${input.academicAnalysis}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

{
  "admissionType": "교과",
  "passRateLabel": "데이터 없음",
  "passRateRange": [0, 0],
  "analysis": "(학생 등급 사실 서술 + 학생부교과전형 적합도 일반 판단, 250자 이내)",
  "overallComment": "(전형 적합도 종합 + 희망대학 등록 시 별도 합격 가능성 판단 가능 안내, 300자 이내)",
  "universityPredictions": []
}

## 출력 규칙
- **passRateLabel은 "데이터 없음"으로 고정**, **passRateRange는 [0, 0]으로 고정**.
- **universityPredictions는 빈 배열([])로 고정**.
- analysis는 학생 등급(사실) + 교과전형 적합도 판단(일반 평가) 위주로 작성.
- overallComment는 종합 평가 + 합격 가능성 판단을 위한 희망대학 등록 안내.

${COMMON_OUTPUT_RULES}`;
  }

  const targetUniversityRule = (() => {
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
  })();

  return `${gradeContext}${medicalContext}${artSportContext}## 작업
학생의 **최종 등급**과 등급별 대학 라인 테이블을 비교하여 **학생부교과전형** 합격 가능성을 예측하세요.

## 서술 관점: 입시 전략가 — 합격선 대비 포지션 분석
- "합격선 대비 여유가 있다", "합격선에 근접한다" 등 상대적 표현 사용.
- ⛔ 합격선의 구체적 등급 수치 언급 금지. ⛔ 개별 과목명·과목별 등급 언급 금지.
- ⛔ 약점 진단·보완 방향·등급 추세 분석은 다른 섹션 담당 → 여기서는 합격 가능성 **판단**만.

${OVERALL_ONLY_EXAMPLES}

## 핵심 원칙
- 교과전형은 **최종 평균 등급**이 유일한 핵심 평가 기준.
- 교과 조합별 평균(국영수사과, 국영수사, 국영수과 등)도 참고.
- 전 과목 또는 주요 교과 평균으로 반영하므로 전체 평균 등급 기준으로만 서술.

## 입력 데이터

### 성적 분석 결과
${input.academicAnalysis}

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
4. 등급이 합격선과 비슷하면(±0.4) → chance "medium"
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

  // ── 희망대학 0건: "전형 적합도 일반 판단" 모드 ──
  if (!hasTargetUniversities) {
    return `## 작업
학생이 학생부종합전형 희망대학을 등록하지 않았습니다. 이 호출은 **이 학생의 생기부가 학생부종합전형에 어떤 적합도를 가지는지** 일반 판단을 출력합니다. 특정 대학과의 합격 가능성 판단은 수행하지 않습니다.

## ⛔ 절대 금지
- "합격선 대비 여유가 있다", "안정적으로 지원이 가능하다", "지원이 어려울 수 있다" 등 **합격선 대비 단정 표현 금지**.
- 특정 대학명 또는 대학군 추정 금지.
- **개별 과목 편차·과목별 등급·약점·성적 추세** 단정 서술 금지 (이는 academicAnalysis·weaknessAnalysis 영역).
- 짧은 한글 라벨로 분류 금지.
- "이 과목들" 등 antecedent 없는 과목 지칭 금지.
- predictions에 "교과"/"정시" admissionType 포함 금지.

## ✅ 작성 가이드
- 학생부종합전형의 평가 기준(진로역량 + 학업역량 + 공동체역량 + 발전가능성)에 비추어 **이 학생 생기부의 강점/적합도**를 일반 판단.
- 세특 탐구 깊이, 진로 일관성, 활동의 구체성 등 학종 평가 핵심 요소 기반.
- 학종 적합도가 어느 정도인지 일반 평가 (특정 대학·합격선과는 무관).
- 합격 가능성은 희망 대학을 등록한 뒤 별도 판단이 필요함을 자연스럽게 안내.
- analysis는 "생기부에서 ~분야 역량이 확인되며"로 시작.

${OVERALL_ONLY_EXAMPLES_NO_TARGETS}

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 학생 프로필
${input.studentProfile}

## 출력 JSON 스키마

{
  "sectionId": "admissionPrediction",
  "title": "희망 학교·학과 판단",
  "recommendedType": "학종",
  "recommendedTypeReason": "(학종 적합도 판단 근거 150자 이내)",
  "predictions": [
    {
      "admissionType": "학종",
      "passRateLabel": "데이터 없음",
      "passRateRange": [0, 0],
      "analysis": "생기부에서 확인되는 학종 적합도 일반 판단 (250자 이내)",
      "universityPredictions": []
    }
  ],
  "overallComment": "학종 적합도 종합 + 희망대학 등록 시 별도 합격 가능성 판단 가능 안내 (300자 이내)"
}

## 출력 규칙
- **passRateLabel은 "데이터 없음" 고정**, **passRateRange는 [0, 0] 고정**.
- **universityPredictions는 빈 배열([]) 고정**.

${COMMON_OUTPUT_RULES}`;
  }

  const targetUniversityRule = `### ⚠️ 유저 설정 희망대학 우선 규칙
- 유저 희망대학 중 **(학생부종합)** 전형 대학은 학종 predictions에 포함.
- **(학생부교과)** 전형 대학은 이 호출에서 제외 (별도 교과 분석).
- 학종 희망대학은 빠짐없이 포함. 희망대학 외 대학 추가 금지.`;

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

${OVERALL_ONLY_EXAMPLES}

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

${hasTargetUniversities ? "" : `### 코드 산정 대학 후보군\n${input.universityCandidates}\n`}
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

### 학종 합격 가능성이 낮은 대학 보완 멘트 (필수)
chance가 "low"/"very_low"인 대학의 rationale에는, 합격선 대비 격차로 지원이 어려울 수 있음을 솔직히 서술한 뒤 "학종은 성적만으로 판단하지 않으므로 면접에서 탐구 역량과 진로 일관성을 어필하면 합격 가능성을 높일 수 있다"는 방향의 보완 문장 필수.
- ❌ 합격선 격차만 짧게 언급하고 끝내면 안 됩니다. ❌ chance 판단 자체를 완화하면 안 됩니다.
- 짧은 라벨 형태로 대학을 분류하지 말고 위의 chance 영문 값별 풀어쓴 톤만 사용하세요.

⚠️ **핵심 교과 부진 시 chance 상한**:
- 9등급제: 핵심 교과 6등급↓ → "medium" 이상 금지
- 5등급제: 핵심 교과 4등급↓ → "medium" 이상 금지

⚠️ **학종 합격률 조정**: "학과 맞춤 평가 기준" 제공 시, 핵심 교과 성취도 + 관련 활동 일치도 기반으로 ±10%p 조정.

## 추천 전형 (recommendedType)
- "학종", "고른기회" 중 선택. 추천 이유 2~3줄.
- ⚠️ 하나의 전형만 단순 추천 금지. 학생 상황별로 어떤 전형이 유리한지 구분하여 서술.

### ⛔ 추천 결정 원칙 (반드시 준수)
- 학종은 본질적으로 단일 합격률 수치로 측정할 수 없습니다(passRateRange는 [0,0] 고정). **합격률 수치가 없다는 이유로 학종 추천을 회피하지 마세요.** 활동·세특·진로 일관성·성적 추세 등 **종합 분석으로** 학종 적합 여부를 판단하세요.
- 다음 신호가 하나라도 있으면 **학종을 적극 추천**하세요:
  1. 세특에 전공 관련 심화 탐구가 학년에 걸쳐 일관되게 기록됨
  2. 진로 일관성이 강함 (1~3학년 활동·세특이 동일 계열로 연결)
  3. 성적 상승 추세 (1→2학년 평균 등급 향상 0.3 이상)
  4. 활동 풍부 (자율·동아리·진로 활동에 구체적 결과물 있음)
  5. 핵심 교과(국·수·영·사·과) 평균이 3등급 이내
- 다음에만 학종 추천 회피:
  - 핵심 교과가 6등급 이하로 부진하거나
  - 세특/활동 기록이 빈약하거나
  - 진로 일관성이 전혀 없는 경우

## universityPredictions 규칙
⚠️ 반드시 출력. 빈 배열 금지. 각 항목에 chance 필드 필수.

${TIER_CHANCE_RULES}

${RATIONALE_RULES}

${
  hasTargetUniversities
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
