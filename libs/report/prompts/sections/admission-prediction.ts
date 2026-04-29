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
  return `## ⚠️ 의·치·한·약·수 계열 적합도 분석 규칙 (반드시 적용)
1. **영어 1등급 필수**: 영어 1등급이 아닌 경우 analysis에 "영어 X등급으로 의·치·한·약·수 기준 충족/미충족"을 명시하고, rationale의 부합도 톤은 "정량 기준 미달 영역이 있어 보완 필요" 수준으로 서술.
2. **합격선 소수점 변별**: 합격선이 0.1~0.2등급 차이로 갈리는 영역이므로, analysis에 정량 변별이 매우 좁은 영역임을 명시.
3. **울산대 의과대학**: 지방대이지만 빅5 의대. 정량 기준을 낮게 추정 금지.
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
  // 학생이 등록한 희망대학 전체를 항목으로 포함. 추가 대학을 임의로 끼워넣지 않는다.
  const chanceCounts: Record<ReportPlan, string> = {
    lite: "학생 등록 희망대학 전체 (학종 전형만, 최대 4교)",
    standard: "학생 등록 희망대학 전체 (학종 전형만, 최대 8교)",
    premium: "학생 등록 희망대학 전체 (학종 전형만, 최대 12교, 상세 분석 포함)",
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
- universityPredictions: ${chanceCounts[plan]}. ⚠️ 빈 배열 금지. 학생이 등록한 희망대학(해당 전형 한정) 전체를 빠짐없이 포함.
- analysis: ${analysisDepth[plan]}, **250자 이내**.
- overallComment: **300자 이내**.${hakjongExtra}`;
};

/** 공통 규칙: 환산등급 금지 + 영단어 금지 + 라벨 분류 표현 금지 + 본문 대학명 나열 금지 */
const COMMON_OUTPUT_RULES = `### ⚠️ 환산 등급 노출 금지
"환산 등급", "보정 등급", "환산 내신", "보정 내신" 등의 표현을 절대 사용하지 마세요.

### ⛔ 본문 표현 금지 (analysis, recommendedTypeReason, overallComment 모든 본문 필드 공통)
- "high", "medium", "low" 등 영단어 사용 금지 → 한글(높음/보통/낮음) 사용.
- "상위권 대학", "중위권 대학", "하위권 대학" 등 대학 등급 묶음 표현 금지.
- 짧은 한글 라벨(예: "○○ 지원", "○○ 라인", "○○ 추천", "○○ 합격권") 형태로 대학을 분류하지 마세요.

### ⛔⛔ 본문에 특정 대학명 나열·언급 금지 (가장 중요)
- analysis, recommendedTypeReason, overallComment **본문 어디에도 특정 대학명**(예: "연세대학교", "고려대학교", "성균관대학교", "한양대학교" 등)을 **나열하거나 언급하지 마세요.**
- 대학명+학과 조합("연세대학교 생물학과", "고려대학교 생물공학과")도 본문에 등장 금지.
- 본문에서 학과를 언급할 때는 **학과 계열 단위**("약학 계열", "생명과학 계열")로만 서술하세요.
- 대학별 부합도 평가는 **universityPredictions[].rationale 에서만 서술**합니다. 본문(analysis/recommendedTypeReason/overallComment)은 학종 평가 4축(진로역량/학업역량/공동체역량/발전가능성) + 학과 계열 단위 톤만 사용.
- 이 규칙을 어기면 사용자 의도(특정 학교 가능성 판단을 본문에서 제외)를 위반한 것으로 간주하여 품질 실패입니다.`;

/** 공통: universityPredictions[].rationale 톤 가이드 — 진로역량 부합도 중심 */
const TIER_CHANCE_RULES = `### universityPredictions[].rationale 톤 — 진로역량 부합도 중심
**이 톤은 universityPredictions[].rationale 필드 전용입니다.** 본문(analysis/recommendedTypeReason/overallComment)에서는 이 톤을 모방하더라도 대학명·"[대학명] [학과명]" 패턴을 끌어쓰지 마세요. 본문 서술은 별도 가이드(OVERALL_ONLY_EXAMPLES)를 따르세요.

이 섹션은 합격 가능성을 단정하지 않습니다. 대신 **학생 생기부의 진로역량**과 **해당 학과 평가 기준의 부합도**를 기술합니다. 각 rationale은 학생 생기부에 어떤 진로역량 근거가 있는지, 그리고 해당 학과 평가 기준과 얼마나 매칭되는지의 두 축으로만 서술합니다.

권장 톤 (universityPredictions[].rationale 작성 시 이 패턴을 모방):
- ✅ "세특에서 [학과 핵심 영역] 탐구가 학년에 걸쳐 일관되게 확인되어, 진로역량 측면에서 [학과] 평가 기준에 부합합니다."
- ✅ "[학과 영역] 관련 활동이 일부 확인되며, [추가 보완 영역]으로 진로역량 근거를 강화할 수 있습니다."
- ✅ "세특에서 확인되는 [실제 분야] 탐구가 [학과] 평가 기준과 직접 연관성이 낮아, 진로역량 측면의 부합도가 제한됩니다."

합격 가능성 단정(안정적 지원 가능 / 도전해볼 만 / 합격선 대비 여유 / 지원이 어려움 등)은 이 섹션의 영역이 아닙니다.`;

/** 공통: rationale 규칙 */
const RATIONALE_RULES = `### rationale 규칙
- 각 대학별 rationale는 **200자 이내**.
- 대학별 rationale가 동일하거나 등급 부분만 다르면 품질 실패. 각 대학의 전형 특성, 경쟁률, 학생 강점/약점 중 해당 대학에 특히 유리/불리한 요소를 반영하여 차별화하세요.`;

/** 공통: 추천 등급 범위 */
const GRADE_RANGE_RULES = `### 추천 등급 범위
- 5등급제: 학생 등급 기준 **±0.5등급 범위** 내 대학 위주
- 9등급제: 학생 등급 기준 **±1.5등급 범위** 내 대학 위주`;

/**
 * 공통: 본문(analysis/rationale/overallComment)을 진로역량 부합도 + 전형 정량 기준 적합도
 * 두 축으로만 서술하도록 유도하는 긍정 예시 블록. 과목별 편차·약점·추세 등 academicAnalysis
 * 어휘가 본문에 누출되는 문제와 합격 가능성 단정 표현이 등장하는 문제를 한꺼번에
 * 모델이 따라 쓰기 좋은 문장 패턴으로 막는다.
 */
const OVERALL_ONLY_EXAMPLES = `### ✅ 본문 서술 문장 패턴 (이 패턴만 사용)
이 섹션의 본문(analysis, recommendedTypeReason, overallComment)은 항상 **"최종 평균 등급" 또는 "생기부 전반"**을 주어로 삼고, **학종 평가 요소 적합도(진로역량/학업역량/공동체역량/발전가능성) / 전형 정량 기준 적합도**의 두 축으로만 서술합니다. 특정 과목명·특정 대학명을 주어로 삼거나 본문에 끌어쓰지 마세요. 과목 디테일은 academicAnalysis, 대학별 부합도는 universityPredictions[].rationale의 책임 영역입니다.

권장 문장 패턴 (이 톤을 모방):
- ✅ "최종 평균 등급 X등급으로, 학종 평가에서 학업역량 측면의 정량 기반은 마련되어 있습니다."
- ✅ "생기부 전반에서 진로 일관성과 탐구 깊이가 드러나, 학종 평가 요소 중 진로역량 측면의 적합도가 확인됩니다."
- ✅ "희망 학과 평가 기준에서 핵심으로 삼는 [핵심 영역] 활동이 세특에서 확인되어, 진로역량 측면의 부합도가 뚜렷합니다."
- ✅ "세특에서 확인되는 탐구 분야가 희망 학과군 평가 기준과 직접 연관성이 낮아, 진로역량 측면의 부합도는 제한적입니다."
- ✅ "교과 전 영역의 평균 등급이 안정적으로 유지되고 있어, 학생부교과전형의 정량 기준 측면에서 활용 가능성이 있습니다."

⛔ 금지 패턴 (절대 모방 금지):
- ❌ "[대학명] [학과명]의 평가 기준에 부합" — 본문에 대학명 등장 금지
- ❌ "연세대학교 생물학과, 고려대학교 생물공학과... 평가 기준에 부합" — 여러 대학 나열 금지
- ❌ 본문에 universityPredictions의 대학을 모아서 다시 나열하지 마세요. 본문은 학과 계열 단위 톤만, 대학별 디테일은 universityPredictions[].rationale에만.

→ 모든 본문 서술의 주어는 "최종 평균 등급" / "전체 평균" / "생기부 전반" / "교과 전 영역" 중 하나입니다. "수학 과목은…", "영어 등급이…", "이 과목들의 편차는…"처럼 개별 과목·과목군이 주어가 되는 문장이 본문에 등장하면, 그 문장은 academicAnalysis 섹션의 영역으로 간주되어 이 섹션의 책임 범위를 벗어납니다.

→ 본문에서 학과를 언급할 때는 **학과 계열 단위**("약학 계열", "생명과학 계열", "사회과학 계열")로만 서술합니다. "[대학명] [학과명]" 형식은 universityPredictions[].rationale에서만 사용합니다.

→ 합격 가능성 단정(안정적 지원 가능 / 도전해볼 만 / 합격선 대비 여유 / 지원이 어려움 등)은 이 섹션의 영역이 아닙니다. 부합도 평가만 수행하세요.`;

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

## ✅ analysis 필수 작성 구조 (반드시 이 3문장 구조로)
이 섹션의 주제는 **희망 학교·학과 판단**입니다. 학생 일반 진단을 늘어놓는 것이 아니라,
**학생 프로필을 희망 학과군 교과전형 정량 기준에 매핑**하여 적합도를 판단합니다.
모든 문장은 "학생 [속성] ↔ 희망 학과군 교과 [평가 기준]" 매핑 구조를 가져야 하며,
문장 순서·역할을 변경하거나 문장을 추가/삭제하지 마세요.

**예시 출력** (학생 평균 2.55등급, 핵심 5과목 평균 2.45등급):
> "최종 평균 등급 2.55등급은 희망 학과군 교과전형 정량 기준에 근접한 구간입니다. 주요 5과목 평균은 2.45등급으로 전체 평균보다 0.10등급 높아, 반영 교과 비중이 큰 대학 풀에서는 학생 정량 기준 적합도가 더 안정적으로 나타납니다. 희망 교과 풀은 정량 변별이 좁은 영역인 만큼 대학별 반영 교과 구성·교과 가중치 등 정량 산식 점검이 학생 합격 적합도 평가의 핵심 변수입니다."

**문장별 역할 (모두 "희망 학과군 ↔ 학생 정량 프로필" 매핑 형태):**
1. **1문장 — 학생 등급 ↔ 희망 학과군 교과 정량 기준**:
   "최종 평균 등급 X등급은 희망 학과군 교과전형 정량 기준에 [부합/근접/보완 여지가 있는] 구간입니다."
   (X = 학생의 실제 최종 평균 등급, 소수점 둘째 자리. 적합도 톤은 학생 등급 위치에 맞춰 선택. ⛔ 합격 가능성 단정 금지)
2. **2문장 — 학생 반영 교과 평균 ↔ 희망 풀 반영 교과 비중 적합도**:
   "주요 [핵심 교과 조합명] 평균은 Y등급으로 전체 평균보다 [높음/낮음/유사함]을 보여, 반영 교과 비중이 큰 대학 풀에서는 학생 정량 기준 적합도가 [더 안정적/추가 보완 여지가 있는] 구조입니다."
   (subjectCombinations 데이터에서 "국수영사" 또는 "국수영과" 등 학생 진로 관련 조합 1개 선택. 비교는 0.X등급 단위 정량 차이만 서술.
    ⛔ 학년별 추세·학기별 등급·세특 등 정성 요소 언급 금지)
3. **3문장 — 희망 교과 풀 전체 핵심 변수 종합**:
   "희망 교과 풀은 정량 변별이 좁은 영역인 만큼 [대학별 반영 교과 구성·교과 가중치 등 정량 산식 점검 / 마감 학기 정량 안정 유지 등]이 학생 합격 적합도 평가의 핵심 변수입니다."
   (⛔ 특정 대학명 금지, 합격 단정 금지)

⛔ 위 3문장 외 추가 문장(특히 합격선 비교·대학명 언급·학년별 추세·세특 언급)은 출력에 포함하지 마세요.
⛔ 데이터가 빈약한 경우(예: subjectCombinations 부재) 2문장은 일반 표현("주요 핵심 교과 평균이 전체 평균과 유사한 수준" 등)으로 보수적으로 서술하되, 항상 "희망 학과군 교과 [기준]" 매핑 후미를 유지하세요.

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
  "analysis": "(위 3문장 구조 그대로. 학생의 실제 최종 평균 등급으로 X 자리만 채우고, 3문장 학업 흐름 표현만 학생 추세에 맞게 조정)",
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
    `### 유저 설정 희망대학 (교과전형만 해당)\n${input.targetUniversities}`,
  ]
    .filter(Boolean)
    .join("\n\n");

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
학생의 **최종 등급**과 등급별 대학 라인 테이블을 비교하여 **학생부교과전형** 정량 기준 적합도를 분석하세요.

## 서술 관점: 전형 정량 기준 적합도 분석가
- "최종 평균 등급이 [학과] 교과전형 정량 기준에 부합합니다", "정량 기준 대비 보완이 필요한 구간입니다" 등 적합도 분석 어투.
- ⛔ 합격선의 구체적 등급 수치 언급 금지. ⛔ 개별 과목명·과목별 등급 언급 금지.
- 합격 가능성 단정(안정적 지원 가능 / 도전해볼 만 / 어렵다 / 합격선 대비 여유 등)은 이 섹션의 영역이 아닙니다. 학생 등급 ↔ 학과 정량 기준의 적합도만 평가하세요.
- 약점 진단·보완 방향·등급 추세 분석은 다른 섹션 담당 → 여기서는 적합도 평가에만 집중.

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
  "passRateLabel": "데이터 없음",
  "passRateRange": [0, 0],
  "analysis": "최종 평균 등급 X등급으로, [학과] 교과전형 정량 기준에 부합하는 구간입니다...",
  "overallComment": "학생의 교과전형 적합도 종합 + 원서 구성 시 정량 어필 전략 (200~300자)",
  "universityPredictions": [
    {"university": "한양대학교", "department": "행정학과", "rationale": "최종 평균 등급이 [학과] 교과전형 정량 기준 대비 적합한 구간입니다. 정량 평가 위주이므로 등급 안정성이 변별 요소입니다."}
  ]
}

- passRateLabel/passRateRange: "데이터 없음" / [0, 0]으로 고정.
- chance 필드는 deprecated. 출력 생략 가능. 출력 시에는 적합도 톤과 일관되게 유지.

## 교과전형 분석 방법
1. 최종 평균 등급과 교과 조합 평균 확인.
2. 등급별 대학 라인 테이블 참조하여 정량 기준 적합도 판단.
3. 등급이 정량 기준 대비 부합 정도에 따라 적합도 톤 조정 (충분히 부합 / 적합 / 보완 필요).

⚠️ **평균 등급 기반 적합도 톤 가이드**:
- 9등급제: 전체 평균 5.0↑ → 적합도 톤은 "보완 필요" 수준. 6.0↑ → "현저한 보완 필요".
- 5등급제: 전체 평균 3.5↑ → 적합도 톤은 "보완 필요" 수준. 4.0↑ → "현저한 보완 필요".

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

## ✅ analysis 필수 작성 구조 (반드시 이 4문장 구조로)
이 섹션의 주제는 **희망 학교·학과 판단**입니다. 학생 일반 진단을 늘어놓는 것이 아니라,
**학생 프로필을 희망 학과군 학종 평가 기준에 매핑**하여 적합도를 판단합니다.
모든 문장은 "학생 [속성] ↔ 희망 학과군 학종 [평가 기준]" 매핑 구조를 가져야 하며,
문장 순서·역할을 변경하거나 문장을 추가/삭제하지 마세요.

**예시 출력** (학생 평균 2.46등급, 진로역량 강점, 학업역량 보완 필요):
> "최종 평균 등급 2.46등급은 희망 학과군의 학종 정량 변별 영역 대비 부합하는 구간입니다. 생기부 전반에서 진로와 연결되는 탐구 활동의 흐름과 학년에 걸친 일관된 관심사가 확인되어, 희망 학과군 학종 평가의 진로역량 측면에서 학생 프로필이 부합하는 구조입니다. 다만 핵심 교과 성취도와 탐구 결과 분석의 깊이는 희망 학과군의 학업역량 평가 측면에서 보완 여지가 있는 영역입니다. 희망 학종 풀 전반은 진로역량 적합형 + 학업역량 보강 필요 구조로 정리되며, 면접·세특 보강이 학생 합격 적합도의 핵심 변수입니다."

**문장별 역할 (모두 "희망 학과군 ↔ 학생 프로필" 매핑 형태):**
1. **1문장 — 학생 등급 ↔ 희망 학과군 학종 정량 변별 영역**:
   "최종 평균 등급 X등급은 희망 학과군의 학종 정량 변별 영역 대비 [부합/근접/보완 여지가 있는] 구간입니다."
   (X = 학생의 실제 최종 평균 등급, 소수점 둘째 자리. 적합도 톤은 학생 등급과 학과군 정량 영역 위치에 맞춰 선택. ⛔ 합격 가능성 단정 금지)
2. **2문장 — 학생 강점 활동/관심사 ↔ 희망 학과군 학종 [관련 역량] 평가**:
   "생기부 전반에서 [구체 강점 1~2개]가 확인되어, 희망 학과군 학종 평가의 [진로역량/학업역량/공동체역량/발전가능성 중 1~2개] 측면에서 학생 프로필이 부합하는 구조입니다."
   ([구체 강점]은 역량 추출 결과에서 실제로 확인된 것만 기입. 강점이 빈약하면 일반 표현으로 보수적으로 서술)
3. **3문장 — 학생 보완 영역 ↔ 희망 학과군 학종 [관련 역량] 평가**:
   "다만 [학생의 상대적 약점/보완 영역]은 희망 학과군의 [관련 역량] 평가 측면에서 보완 여지가 있는 영역입니다."
   (보완 영역도 역량 추출 결과의 약점 영역 기반. ⛔ 합격 단정·과목별 등급 나열 금지)
4. **4문장 — 희망 학종 풀 전체 적합도 + 핵심 변수 종합**:
   "희망 학종 풀 전반은 [강점 역량] 적합형 + [보완 역량] 보강 필요 구조로 정리되며, [학생 합격 적합도의 핵심 변수]가 핵심입니다."
   ([핵심 변수]는 면접·세특 보강·탐구 깊이·공동체 활동 보강 등. ⛔ 특정 대학명 금지·합격 가능성 단정 금지)

⛔ 위 4문장 외 추가 문장(특히 합격선 비교·대학명 언급)은 출력에 포함하지 마세요.
⛔ 매핑이 빈약한 경우(예: 강점/약점이 명확히 도출 안 됨) 일반 표현으로 보수적으로 서술하되, 학생 일반 진단(예: "탐구 활동이 두드러진다")으로 끝내지 말고 항상 "희망 학과군 [평가 기준]" 매핑 후미를 붙여 마무리하세요.

${OVERALL_ONLY_EXAMPLES_NO_TARGETS}

## 입력 데이터

### 성적 분석 결과
${input.academicAnalysis}

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
      "analysis": "(위 4문장 구조 그대로. 학생의 실제 최종 평균 등급으로 X 자리를 채우고, 3문장 강점/4문장 관련 역량만 학생 생기부에 맞게 조정)",
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
    `### 유저 설정 희망대학 (합격 예측 참고용 — 분석 방향을 좌우하면 안 됨)\n⚠️ 아래 희망대학은 해당 대학의 합격 가능성 예측에만 사용하세요.\n${input.targetUniversities}`,
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
학생의 역량 분석 결과와 성적 데이터를 바탕으로 **학생부종합전형**${input.includeNonsul ? "과 **논술전형**" : ""} 진로역량 부합도와 전형 적합도를 분석하세요. (합격 가능성은 단정하지 않습니다.)
⚠️ **이 호출에서는 학생부교과전형을 분석하지 마세요.** predictions에 "교과"/"정시" admissionType 포함 금지.${!input.includeNonsul ? " 논술전형도 포함하지 마세요." : ""}

## 서술 관점: 진로역량 부합도 분석가
- 본문은 학과 계열 단위(예: "약학 계열", "사회과학 계열")의 부합도 분석 어투. 대학별 디테일은 universityPredictions[].rationale에만.
- 합격 가능성 단정(안정적 지원 가능 / 도전해볼 만 / 어렵다 / 합격선 대비 여유 등)은 이 섹션의 영역이 아닙니다. 학생 생기부 ↔ 학과 계열·전형 평가 기준의 부합도만 평가하세요.
- 약점 진단·등급 상세 해석·보완 전략은 다른 섹션 담당 → 여기서는 부합도 평가에만 집중.
- "~요소가 희망 학과군 진로역량 평가에 유리/불리하게 작용한다"는 허용. 합격 가능성 자체에 대한 단정은 사용하지 않습니다.

${OVERALL_ONLY_EXAMPLES}

## ⛔ 용어 규칙
- "전공적합성" 사용 금지 → 현재 학종 평가 기준은 **"진로역량"**.
- overallComment, analysis, recommendedTypeReason은 "생기부에서 ~분야 역량이 확인되며" 또는 "최종 평균 등급은 X등급입니다" 등으로 시작.
- 본문에 특정 대학명(예: "연세대학교", "고려대학교") 또는 "[대학명] [학과명]" 조합을 절대 사용하지 마세요. 학과는 **학과 계열 단위**("약학 계열", "생명과학 계열")로만 언급합니다.

## 입력 데이터

### 역량 추출 결과
${input.competencyExtraction}

### 성적 분석 결과
${input.academicAnalysis}

### 학생 유형 분류 결과
${input.studentTypeClassification}

### 학생 프로필
${input.studentProfile}

${additionalInputs}

${input.majorEvaluationContext ? `### 학생 희망 학과 평가 기준 (입학사정관 관점)\n${input.majorEvaluationContext}` : ""}

## ⛔ 학과 적합도 판단 (필수)
- 역량 추출 결과의 실제 활동/탐구가 희망 학과 평가 기준에 부합하는지 **있는 그대로** 판단.
- ❌ 활동이 다른 분야 중심인데 "희망 학과에 적합하다" 금지.
- ✅ 부합하면 (universityPredictions[].rationale 안에서): "세특에서 [구체 활동]이 확인되어 진로역량이 우수합니다"
- ✅ 미부합 (universityPredictions[].rationale 안에서): "세특에서 [실제 분야] 탐구는 풍부하나, [희망 학과]와 직접 연관성이 낮아 진로역량 평가에서 불리합니다"
- 위 어법은 universityPredictions[].rationale 전용입니다. 본문(analysis/recommendedTypeReason/overallComment)은 학과 계열 단위 톤만 사용합니다.

## ✅ predictions[0].analysis 필수 작성 구조 (반드시 이 4문장 구조로 — 위반 시 품질 실패)
이 섹션의 주제는 **희망 학교·학과 판단**입니다. 학생 일반 진단을 늘어놓는 것이 아니라,
**학생 프로필을 희망 학과군 학종 평가 기준에 매핑**하여 적합도를 판단합니다.
모든 문장은 "학생 [속성] ↔ 희망 학과군 학종 [평가 기준]" 매핑 구조를 가져야 합니다.
본문에 특정 대학명(예: "연세대학교 생물학과", "고려대학교 생물공학과")을 나열하지 마세요. 대학별 부합도는 universityPredictions[].rationale에서만 서술합니다.

**예시 출력** (학생 평균 2.46등급, 약학 계열 진로역량 강점, 학업역량 보완 필요):
> "최종 평균 등급 2.46등급은 희망 학과군의 학종 정량 변별 영역 대비 부합하는 구간입니다. 생기부 전반에서 약학 계열 분야에 대한 깊이 있는 탐구와 학년에 걸친 일관된 진로 관심사가 확인되어, 희망 학과군 학종 평가의 진로역량 측면에서 학생 프로필이 부합하는 구조입니다. 다만 핵심 교과 성취도와 탐구 결과 분석의 깊이는 희망 학과군의 학업역량 평가 측면에서 보완 여지가 있는 영역입니다. 희망 학종 풀 전반은 진로역량 적합형 + 학업역량 보강 필요 구조로 정리되며, 면접·세특 보강이 학생 합격 적합도의 핵심 변수입니다."

**문장별 역할 (모두 "희망 학과군 ↔ 학생 프로필" 매핑 형태):**
1. **1문장 — 학생 등급 ↔ 희망 학과군 학종 정량 변별 영역**:
   "최종 평균 등급 X등급은 희망 학과군의 학종 정량 변별 영역 대비 [부합/근접/보완 여지가 있는] 구간입니다."
   (X = 학생 실제 평균, 소수점 둘째 자리. ⛔ 합격 가능성 단정 금지)
2. **2문장 — 학생 강점 활동/관심사 ↔ 희망 학과군 학종 [관련 역량] 평가**:
   "생기부 전반에서 [학과 계열 단위 강점 1~2개]가 확인되어, 희망 학과군 학종 평가의 [진로역량/학업역량/공동체역량/발전가능성 중 1~2개] 측면에서 학생 프로필이 부합하는 구조입니다."
   ([강점]은 역량 추출 결과에서 도출된 것을 **학과 계열 단위**로 표현. ⛔ 특정 대학명·과목명 금지)
3. **3문장 — 학생 보완 영역 ↔ 희망 학과군 학종 [관련 역량] 평가**:
   "다만 [학생의 상대적 약점/보완 영역]은 희망 학과군의 [관련 역량] 평가 측면에서 보완 여지가 있는 영역입니다."
   (보완 영역도 역량 추출 결과의 약점 영역 기반. ⛔ 합격 단정·과목별 등급 나열 금지)
4. **4문장 — 희망 학종 풀 전체 적합도 + 핵심 변수 종합**:
   "희망 학종 풀 전반은 [강점 역량] 적합형 + [보완 역량] 보강 필요 구조로 정리되며, [학생 합격 적합도의 핵심 변수]가 핵심입니다."
   ([핵심 변수]는 면접·세특 보강·탐구 깊이·공동체 활동 보강 등. ⛔ 특정 대학명 금지·합격 가능성 단정 금지)

⛔ 위 4문장 외 추가 문장(특히 합격선 비교·대학명 언급·과목별 등급)은 출력에 포함하지 마세요.
⛔ 매핑이 빈약한 경우 일반 표현으로 보수적으로 서술하되, 학생 일반 진단으로 끝내지 말고 항상 "희망 학과군 [평가 기준]" 매핑 후미를 붙여 마무리하세요.

## 출력 JSON 스키마

{
  "sectionId": "admissionPrediction",
  "title": "희망 학교·학과 판단",
  "recommendedType": "학종",
  "recommendedTypeReason": "(학종 추천 사유 150자 이내. 학과 계열 단위 톤만 사용. 특정 대학명·'[대학명] [학과명]' 조합 금지. 예: '생기부 전반에서 [학과 계열] 분야 탐구의 깊이와 일관성이 확인되어, 학종 평가 4축에 부합하는 정도가 높아 학생부종합전형을 우선 추천합니다.')",
  "predictions": [
    {
      "admissionType": "학종",
      "passRateLabel": "데이터 없음",
      "passRateRange": [0, 0],
      "analysis": "(위 4문장 구조 그대로. 본문에 특정 대학명 금지. 학과는 계열 단위로만 언급)",
      "universityPredictions": [
        {"university": "한양대학교", "department": "행정학과", "rationale": "세특에서 확인되는 탐구 분야가 행정학과 평가 기준과 직접 연관성이 낮아 진로역량 측면의 부합도가 제한적입니다. 면접에서 진로 동기를 명확히 어필하면 보완 여지가 있습니다."}
      ]
    }
  ],
  "overallComment": "(학생 생기부에 가장 부합하는 전형 + 원서 구성 시 진로역량 어필 전략 2~3줄. 학과 계열 단위 톤. 특정 대학명·'[대학명] [학과명]' 조합 금지. 300자 이내)"
}

- **admissionType**: "학종"${input.includeNonsul ? ' | "논술"' : ""} | "고른기회" 중 하나. "교과"/"정시" 포함 금지.${!input.includeNonsul ? ' "논술"도 포함 금지.' : ""}
- **recommendedType**: "학종"${input.includeNonsul ? ' | "논술"' : ""} | "고른기회" 중 추천.
- **passRateLabel**: "데이터 없음"으로 고정, **passRateRange**: [0, 0]으로 고정.
- **chance** 필드는 deprecated (frontend 비노출). 출력 생략 가능. 출력 시에는 진로역량 부합도 톤과 일관되게 유지.

## 학종 분석 규칙

### rationale에 "진로역량" 필수
- rationale과 analysis에서 교과성적만 언급 금지. 학종은 진로역량 40~50% + 학업역량 + 공동체역량 + 발전가능성 종합 평가.
- **rationale에 반드시 "진로역량" 단어 포함**, 생기부 내용과 학과의 관련성 평가.

### 단일 과목만으로 진로역량 인정하지 않기
- 특정 과목 1개의 활동만으로 진로역량 부합도가 높다고 단정하지 마세요. 학종 진로역량은 생기부 **전반**의 일관된 관련 서술로 판단합니다.

### 부합도가 낮은 학과의 rationale 보완 멘트
[학과] 평가 기준과 생기부 부합도가 낮은 경우, rationale에는 부합도 제한 사유를 서술한 뒤 "학종은 정량 평가만으로 판단하지 않으므로 면접에서 탐구 역량과 진로 일관성을 어필하면 진로역량 평가를 보완할 수 있다"는 방향의 보완 문장을 함께 포함합니다.
- 부합도 제한 사유만 짧게 언급하고 끝내지 마세요. 보완 가능 영역도 함께 제시.
- 짧은 라벨 형태로 대학을 분류하지 말고, 위의 rationale 톤 가이드의 풀어쓴 표현을 사용하세요.

⚠️ **핵심 교과 부진 시 진로역량 부합도 톤**:
- 9등급제: 핵심 교과 6등급 이하 → 부합도 톤은 "제한적" 또는 "보완 필요" 수준으로 서술.
- 5등급제: 핵심 교과 4등급 이하 → 부합도 톤은 "제한적" 또는 "보완 필요" 수준으로 서술.

⚠️ **부합도 평가 시 학과 평가 기준 반영**: "학과 맞춤 평가 기준" 제공 시, 핵심 교과 성취도 + 관련 활동 일치도 기반으로 부합도 톤을 조정하세요.

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
⚠️ 반드시 출력. 빈 배열 금지. 각 항목에 rationale 필드 필수.

${TIER_CHANCE_RULES}

${RATIONALE_RULES}

${targetUniversityRule}

### 종합 코멘트 (overallComment)
- 학생 생기부에 가장 부합하는 전형이 무엇인지, 원서 구성 시 진로역량 어필 전략을 2~3줄로 서술.
- 대학별 부합도 평가는 universityPredictions에 포함되므로, 전형 선택 근거와 종합 조언에 집중.
- ⛔ 본문에 특정 대학명("연세대학교", "고려대학교" 등)·"[대학명] [학과명]" 조합 등장 금지. 학과는 계열 단위("약학 계열", "사회과학 계열")로만.
- 합격 가능성 단정 표현은 사용하지 않습니다.

${COMMON_OUTPUT_RULES}

## ⛔ 출력 전 자기 검증 (반드시 수행 — 하나라도 실패하면 품질 실패)
1. 모든 universityPredictions[].rationale에 "진로역량"이라는 단어가 포함되었는가? (❌ "전공적합성" 사용 금지)
2. 유저 설정 희망대학이 있는 경우, **모든 희망대학이 빠짐없이** universityPredictions에 포함되었는가?
3. predictions에 "교과" 또는 "정시" admissionType이 포함되지 않았는가?
4. analysis/recommendedTypeReason/overallComment에 "안정적 지원 가능", "도전해볼 만", "합격선 대비 여유", "지원이 어려움" 등 합격 가능성 단정 표현이 포함되지 않았는가?
5. **predictions[].analysis / recommendedTypeReason / overallComment 본문에 특정 대학명**(예: "연세대학교", "고려대학교", "성균관대학교", "한양대학교") 또는 "[대학명] [학과명]" 조합이 **단 한 번이라도** 등장하지 않았는가? (universityPredictions[].rationale은 대학명 포함 OK — 거기에만 등장해야 함)
6. predictions[0].analysis가 위에서 정의한 4문장 구조(등급↔정량 변별 → 강점↔관련 역량 → 보완↔관련 역량 → 풀 종합)를 그대로 따랐는가? 4문장 외 문장을 추가하지 않았는가? 모든 문장이 "희망 학과군 ↔ 학생 프로필" 매핑 형태인가? (학생 일반 진단으로 끝나면 실패)
7. predictions[].analysis / recommendedTypeReason / overallComment에 "[학과 계열]" 단위 표현(예: "약학 계열", "생명과학 계열")만 사용하고, 구체 학과명+대학명 조합은 universityPredictions에만 들어갔는가?

${buildPlanOutput(plan, "hakjong")}`;
};
