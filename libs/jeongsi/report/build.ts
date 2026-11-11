// ============================================================
// JeongsiAnalysis + Gemini → JeongsiReportContent 조립
//
// 설계 원칙:
// - 섹션의 수치 필드는 전부 이 파일에서 JeongsiAnalysis 로부터 직접
//   만든다. AI 응답은 해설 문자열만 담은 별도 객체로 파싱되고, 머지
//   단계에서 해설 필드에만 꽂힌다. 수치가 AI 응답으로 덮일 경로가
//   구조적으로 존재하지 않는다.
// - PART 1~5 해설 호출은 서로 의존하지 않으므로 5개를 병렬로 던진다.
// - 호출이 실패하거나 응답이 스키마에 어긋나도 리포트는 완성된다.
//   파싱 함수가 폴백 문구를 돌려주므로 숫자는 모두 코드값으로 남는다.
// ============================================================

import { getCategoryForDepartment } from "../../report/constants/department-category-map.ts";
import type {
  GeminiCallOptions,
  GeminiCallResult,
} from "../../report/pipeline/gemini-client.ts";
import { findFieldGroup, type FieldGroupName } from "../engine/field-groups.ts";
import { resolveAreaRatios } from "../engine/convert-score.ts";
import {
  JEONGSI_SECTION_ORDER,
  type AdvantageItem,
  type AreaScoreRow,
  type CombinationItem,
  type CombinationSlot,
  type CutComparison,
  type JeongsiCombinationSection,
  type JeongsiRecommendationSection,
  type JeongsiReportContent,
  type JeongsiScoreAnalysisSection,
  type JeongsiSection,
  type JeongsiSectionId,
  type JeongsiUniversityDetailSection,
  type JeongsiUniversityMatchSection,
  type RecommendationItem,
  type UniversityDetailItem,
} from "../report-types.ts";
import type {
  AdmissionGroup,
  AdmissionTier,
  AreaRatios,
  AreaSelectionRule,
  BonusPolicy,
  BonusRule,
  ConversionFormula,
  EnglishPolicy,
  GradeScoreTable,
  HistoryPolicy,
  JeongsiAnalysis,
  MathElective,
  MetricByArea,
  PassChance,
  PlanEvaluation,
  PreferredRegion,
  RiskAppetite,
  ScoreArea,
  ScoreMetric,
  SubjectRestriction,
  SuneungGrade,
  SuneungScore,
} from "../types.ts";
import {
  JEONGSI_AREA_LABEL,
  buildAreaSummaryLine,
  buildCombinationPrompt,
  composeCombinationStrategy,
  composeFullyDistinctSentence,
  collectAreaRatios,
  findDistinctSlots,
  collectCautionItems,
  formatTierGapRanges,
  type AreaRatioFact,
  isFullyDistinct,
  buildRecommendationPrompt,
  buildScoreAnalysisPrompt,
  buildUniversityMatchPrompt,
  assignChanceMeanings,
  assignRecommendationOpenings,
  composeOverlapSentence,
  composeRecommendationComment,
  buildRepairPrompt,
  DETAIL_SENTENCE_MAX_CHARS,
  type RecommendationPromptEntry,
  type RecommendationTier,
  type JeongsiSelectionNotes,
  type UniversityDetailPromptItem,
  type UniversityMatchPromptItem,
} from "./prompts.ts";
import {
  countByTier,
  formatCardAllocation,
  formatTierCounts,
  normalizeCardAllocation,
  normalizeChanceWording,
  normalizeEnglishCitation,
  normalizeGapDirection,
  normalizeNumberParticles,
  normalizeRatioMentions,
  normalizeTierCounts,
  sanitizeCommentaryTone,
  stripLeadingSubject,
  stripTopicLabel,
} from "./commentary-guards.ts";
import {
  assignDetailFacts,
  assignMatchFacts,
  composeDetailAdvice,
  composeMatchVerdicts,
  composeFactSentence,
  coreCombinationLabel,
  findAllocationMatches,
  judgeCombinationAllocation,
  judgeRecommendationOverall,
  listDetailFacts,
  listMatchFacts,
  describeAreaLevel,
  judgeScoreOverall,
  type JudgedFact,
  type StudentContext,
} from "./judged-facts.ts";
import {
  chanceMeaningsOf,
  collectNumbers,
  composeChanceSentence,
  ensureUniqueSentences,
  findTextViolations,
  findForeignUniversityNames,
  findMismatchedAreaScores,
  findUngroundedNumbers,
  findWeaknessCalledStrength,
  keepFrameSentences,
  resolveSlots,
  splitSentences,
  type CommentarySlot,
  type SentenceEntry,
  type TextRule,
} from "./commentary-validation.ts";
import {
  JEONGSI_COMMENTARY_FALLBACK,
  parseCombinationCommentary,
  parseRepairedCommentary,
  parseRecommendationCommentary,
  parseScoreAnalysisCommentary,
  parseUniversityMatchCommentary,
  type CommentaryByIndex,
} from "./schemas.ts";
import {
  JEONGSI_CHANCE_PHRASES,
  JEONGSI_COMMON_SYSTEM_PROMPT,
  buildJeongsiSystemPrefix,
} from "./system-prompt.ts";

// ─── 상수 ───

/** jeongsi_reports.content 스키마 버전 */
export const JEONGSI_REPORT_VERSION = 1;

/** PART 2 에 싣는 유리한 대학 수. 토큰과 지면을 함께 고려한 상한 */
const MAX_ADVANTAGE_ITEMS = 5;

/** PART 3·5 의 구분 제시 순서 */
const RECOMMENDATION_TIER_ORDER: RecommendationTier[] = [
  "상향",
  "적정",
  "안정",
];

/** 표 표시용 영역 순서 */
const AREA_DISPLAY_ORDER: ScoreArea[] = [
  "korean",
  "math",
  "english",
  "inquiry",
];

/** PART 5 컷 추이에 싣는 최근 학년도 수 */
const CUT_HISTORY_YEARS = 3;

const SECTION_TITLE: Record<JeongsiSectionId, string> = {
  jeongsiScoreAnalysis: "성적 종합 분석",
  jeongsiUniversityMatch: "나에게 유리한 대학 분석",
  jeongsiRecommendation: "지원 가능 대학·학과",
  jeongsiCombination: "가·나·다군 지원 조합",
  jeongsiUniversityDetail: "대학별 상세 분석",
};

/** Gemini responseSchema stub — 스키마 준수는 프롬프트로 강제한다 */
const EMPTY_SCHEMA = {} as never;

/** thinking OFF (타임아웃·503 방지) */
const THINKING_BUDGET = 0;

/** 모델에 해설을 맡기는 파트. PART 5 는 코드 판정 문장만 쓴다 */
type ModelSectionId = Exclude<JeongsiSectionId, "jeongsiUniversityDetail">;

const MAX_OUTPUT_TOKENS: Record<ModelSectionId, number> = {
  jeongsiScoreAnalysis: 2048,
  jeongsiUniversityMatch: 3072,
  jeongsiRecommendation: 3072,
  jeongsiCombination: 3072,
};

// ─── 환산식 요약 포매터 ───

const METRIC_LABEL: Record<ScoreMetric, string> = {
  standard: "표준점수",
  percentile: "백분위",
  convertedStandard: "변환표준점수",
};

/** 등급 테이블을 1~3등급까지만 요약한다 */
const GRADE_SAMPLE: SuneungGrade[] = [1, 2, 3];

const formatGradeTable = (table: GradeScoreTable): string =>
  GRADE_SAMPLE.map((grade) => `${grade}등급 ${table[grade]}`).join(" · ");

/**
 * 가중치형 대학(고려대·경북대 등)은 반영비율이 계수에서 역산돼
 * "31.235" 같은 값이 된다. 표시는 소수 첫째 자리까지만 쓴다.
 */
const formatRatio = (value: number): string =>
  String(Math.round(value * 10) / 10);

const AREA_SHORT_LABEL: Record<ScoreArea, string> = {
  korean: "국",
  math: "수",
  english: "영",
  inquiry: "탐",
};

/**
 * 반영비율 요약. 상위 영역 선택 대학은 대상 영역 비율이 학생마다
 * 달라지므로 고정 비율 대신 규칙을 적는다.
 * 예) "영10·탐15 / 국·수 중 상위순 45·30"
 */
export const formatRatioSummary = (
  ratios: AreaRatios,
  selection?: AreaSelectionRule
): string => {
  if (!selection) {
    // 영어를 가산·감점으로만 처리하는 대학은 비율이 0 이다. "영0" 은 영어를
    // 반영하지 않는 것처럼 읽히므로 빼고, 영어·한국사 요약에 맡긴다.
    return (Object.keys(AREA_SHORT_LABEL) as ScoreArea[])
      .filter((area) => area !== "english" || ratios.english > 0)
      .map((area) => `${AREA_SHORT_LABEL[area]}${formatRatio(ratios[area])}`)
      .join("·");
  }
  const fixed = (Object.keys(AREA_SHORT_LABEL) as ScoreArea[])
    .filter((area) => !selection.areas.includes(area) && ratios[area] > 0)
    .map((area) => `${AREA_SHORT_LABEL[area]}${formatRatio(ratios[area])}`)
    .join("·");
  const targets = selection.areas
    .map((area) => AREA_SHORT_LABEL[area])
    .join("·");
  const rule = `${targets} 중 상위순 ${selection.rankRatios.map(formatRatio).join("·")}`;
  return fixed ? `${fixed} / ${rule}` : rule;
};

/**
 * 모집단위의 반영비율 표기.
 * 가중합 산출식 대학은 formula.ratios 가 역산한 배점 비중이라, 대학이
 * 공시한 가중치(plan.statedRatios)를 그대로 쓴다.
 */
export const formatPlanRatioSummary = (plan: PlanEvaluation["plan"]): string =>
  plan.statedRatios
    ? `${plan.statedRatios} 가중합`
    : formatRatioSummary(plan.formula.ratios, plan.formula.selection);

export const formatMetricSummary = (
  metric: MetricByArea,
  inquiryCount: ConversionFormula["inquiryCount"]
): string =>
  `국어 ${METRIC_LABEL[metric.korean]} / 수학 ${METRIC_LABEL[metric.math]} / 탐구 ${METRIC_LABEL[metric.inquiry]} ${inquiryCount}과목`;

const formatEnglishPolicy = (policy: EnglishPolicy): string => {
  if (policy.type === "ratioIncluded") {
    return `영어 반영비율 포함(${formatGradeTable(policy.scoreByGrade)})`;
  }
  if (policy.type === "add") {
    return `영어 가산(${formatGradeTable(policy.scoreByGrade)})`;
  }
  return `영어 감산(${formatGradeTable(policy.penaltyByGrade)})`;
};

const formatHistoryPolicy = (policy: HistoryPolicy): string =>
  policy.type === "add"
    ? `한국사 가산(${formatGradeTable(policy.scoreByGrade)})`
    : `한국사 감산(${formatGradeTable(policy.penaltyByGrade)})`;

export const formatEnglishHistorySummary = (
  formula: ConversionFormula
): string =>
  `${formatEnglishPolicy(formula.english)} / ${formatHistoryPolicy(formula.history)}`;

const formatBonusRule = (rule: BonusRule): string =>
  rule.type === "percent" ? `+${rule.value}%` : `+${rule.value}점`;

export const formatBonusSummary = (bonus?: BonusPolicy): string | null => {
  if (!bonus) {
    return null;
  }

  const parts: string[] = [];

  if (bonus.mathElective) {
    const entries = Object.entries(bonus.mathElective) as [
      MathElective,
      BonusRule | undefined,
    ][];
    const mathParts = entries
      .filter((entry): entry is [MathElective, BonusRule] => !!entry[1])
      .map(([elective, rule]) => `${elective} ${formatBonusRule(rule)}`);
    if (mathParts.length > 0) {
      parts.push(`수학 ${mathParts.join(", ")}`);
    }
  }

  if (bonus.scienceInquiry) {
    const scope = bonus.scienceInquiry.appliesTo === "each" ? "과목별" : "합산";
    const condition = bonus.scienceInquiry.minCount ? "(2과목 응시 시)" : "";
    parts.push(
      `과탐${condition} ${scope} ${formatBonusRule(bonus.scienceInquiry)}`
    );
  }

  return parts.length > 0 ? parts.join(" / ") : null;
};

export const formatRestrictionSummary = (
  restrictions?: SubjectRestriction
): string | null => {
  if (!restrictions) {
    return null;
  }

  const parts: string[] = [];
  if (restrictions.math && restrictions.math.length > 0) {
    parts.push(`수학 ${restrictions.math.join("·")} 중 응시 필수`);
  }
  if (restrictions.inquiry && restrictions.inquiry !== "제한없음") {
    parts.push(`탐구 ${restrictions.inquiry}`);
  }

  return parts.length > 0 ? parts.join(" / ") : null;
};

// ─── 영역 행 ───

const resolveSubjectName = (
  area: ScoreArea,
  score: SuneungScore
): string | null => {
  if (area === "korean") {
    return score.korean.elective;
  }
  if (area === "math") {
    return score.math.elective;
  }
  if (area === "inquiry") {
    return `${score.inquiry1.subject}·${score.inquiry2.subject}`;
  }
  return null;
};

const resolveGrade = (area: ScoreArea, score: SuneungScore): number | null =>
  area === "english" ? score.english.grade : null;

export const buildAreaScoreRows = (
  analysis: JeongsiAnalysis
): AreaScoreRow[] => {
  const { score } = analysis.input;

  return [...analysis.diagnosis.areas]
    .sort(
      (a, b) =>
        AREA_DISPLAY_ORDER.indexOf(a.area) - AREA_DISPLAY_ORDER.indexOf(b.area)
    )
    .map((standing) => ({
      area: standing.area,
      label: JEONGSI_AREA_LABEL[standing.area],
      subjectName: resolveSubjectName(standing.area, score),
      standardScore: standing.standardScore,
      percentile: standing.percentile,
      grade: resolveGrade(standing.area, score),
      rank: standing.rank,
      deviation: standing.deviation,
    }));
};

// ─── 평가 결과 → 섹션 항목 ───

const asRecommendableTier = (tier: AdmissionTier): RecommendationTier | null =>
  tier === "지원불가" ? null : tier;

/**
 * 상위 영역 선택 대학에서 이 학생에게 실제로 적용되는 비율. 프롬프트 전용.
 * 규칙 표기("국·수·탐 중 상위순 40·40")만 주면 해설이 약점 영역의 반영
 * 여부를 "파악하기 어렵다"고 쓴다(실측).
 */
const formatAppliedRatioSummary = (
  evaluation: PlanEvaluation,
  score: JeongsiAnalysis["input"]["score"]
): string | undefined => {
  const { plan } = evaluation;
  if (!plan.formula.selection || plan.statedRatios) return undefined;
  return formatRatioSummary(resolveAreaRatios(score, plan.formula));
};

export const buildAdvantageItems = (
  analysis: JeongsiAnalysis
): UniversityMatchPromptItem[] =>
  analysis.advantageousPlans
    .filter((evaluation) => evaluation.eligible)
    .slice(0, MAX_ADVANTAGE_ITEMS)
    .map((evaluation) => {
      const applied = formatAppliedRatioSummary(
        evaluation,
        analysis.input.score
      );
      return {
        university: evaluation.plan.university,
        department: evaluation.plan.department,
        group: evaluation.plan.group,
        ratioSummary: formatPlanRatioSummary(evaluation.plan),
        metricSummary: formatMetricSummary(
          evaluation.plan.formula.metric,
          evaluation.plan.formula.inquiryCount
        ),
        advantageScore: evaluation.advantageScore,
        ...(applied ? { appliedRatioSummary: applied } : {}),
      };
    });

/**
 * 구분 순서대로 평탄화한 추천 목록.
 * 프롬프트의 index, PART 3 그룹, PART 5 상세가 모두 이 순서를 공유하므로
 * 해설 매핑이 어긋나지 않는다.
 */
export const flattenRecommendations = (
  analysis: JeongsiAnalysis
): { tier: RecommendationTier; evaluation: PlanEvaluation }[] =>
  RECOMMENDATION_TIER_ORDER.flatMap((tier) =>
    (analysis.recommendations[tier] ?? []).map((evaluation) => ({
      tier,
      evaluation,
    }))
  );

/** 소수 셋째 자리 반올림 (엔진 roundTo3 와 같은 규칙) */
const round3 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

/**
 * 입결 컷과 같은 축의 학생 값.
 *
 * 엔진의 gapRatio 는 백분위 입결이면 "학생 − 컷"(백분위점), 환산점수
 * 입결이면 "(학생 − 컷) / 만점 × 100" 이다. 컷에 되돌려 더하면 엔진이
 * 실제로 비교한 학생 값(산출 기준·가산 포함 여부까지 맞춘 값)이 나온다.
 */
export const buildCutComparison = (
  evaluation: PlanEvaluation
): CutComparison | null => {
  const cut = evaluation.referenceCut;
  if (!cut || evaluation.gapRatio === null) {
    return null;
  }
  const studentValue =
    cut.metric === "percentile"
      ? cut.value + evaluation.gapRatio
      : cut.value +
        (evaluation.gapRatio / 100) * evaluation.plan.formula.totalScore;
  const latest = [...evaluation.cutHistory]
    .sort((a, b) => b.year - a.year)
    .find((entry) => entry.cut !== null);

  return {
    metric: cut.metric,
    studentValue: round3(studentValue),
    referenceCut: cut.value,
    previousYear:
      latest && latest.cut !== null
        ? { year: latest.year, cut: latest.cut }
        : null,
  };
};

/** 이보다 작은 연도 간 변화는 보합으로 본다 (백분위점). 90.5→90 을 "하락"으로 부르지 않는다 */
const CUT_TREND_FLAT_THRESHOLD = 1;

/**
 * 연도별 컷의 흐름을 코드가 한 단어로 판정한다.
 * 숫자만 주면 해설이 "96.22에서 94.88로 하락"처럼 일부 구간만 인용해,
 * 다시 96 으로 오른 흐름을 하락으로 전달했다(실측).
 */
export const describeCutDirection = (cuts: number[]): string | null => {
  if (cuts.length < 2) return null;
  const steps = cuts
    .slice(1)
    .map((cut, index) => cut - cuts[index])
    .map((step) =>
      Math.abs(step) < CUT_TREND_FLAT_THRESHOLD ? 0 : Math.sign(step)
    )
    .filter((sign) => sign !== 0);
  if (steps.length === 0) return "보합";
  if (steps.every((sign) => sign > 0)) return "상승";
  if (steps.every((sign) => sign < 0)) return "하락";
  return steps[steps.length - 1] > 0 ? "하락 후 반등" : "상승 후 하락";
};

/** 공개된 연도의 컷만 이어 쓰고 흐름 판정을 붙인다. 코멘트 근거용 */
const formatCutTrend = (evaluation: PlanEvaluation): string | undefined => {
  const entries = [...evaluation.cutHistory]
    .sort((a, b) => a.year - b.year)
    .flatMap(({ year, cut }) => (cut === null ? [] : [{ year, cut }]));
  if (entries.length === 0) return undefined;
  const series = entries.map(({ year, cut }) => `${year} ${cut}`).join(" → ");
  const direction = describeCutDirection(entries.map(({ cut }) => cut));
  return direction ? `${series}, ${direction}` : series;
};

const toRecommendationEntry = (
  tier: RecommendationTier,
  evaluation: PlanEvaluation
): RecommendationPromptEntry => ({
  tier,
  percentileGap: evaluation.percentileGap,
  university: evaluation.plan.university,
  department: evaluation.plan.department,
  group: evaluation.plan.group,
  quota: evaluation.plan.quota,
  convertedScore: evaluation.convertedScore,
  referenceCut: evaluation.referenceCut?.value ?? null,
  gapRatio: evaluation.gapRatio,
  cutComparison: buildCutComparison(evaluation),
  ...(evaluation.plan.suneungWeight
    ? { suneungWeight: evaluation.plan.suneungWeight }
    : {}),
  cutTrend: formatCutTrend(evaluation),
  chance: evaluation.chance,
  // 적정이 비어 다른 구분에서 끌어온 항목은 실제 판정을 따로 싣는다.
  // 칸 이름(적정)을 그 대학의 구분처럼 쓰면 틀린 정보다(실측: 안정 판정인
  // 경희대 자율전공학부를 "가군 적정 원서로"라고 씀).
  ...(actualTierOf(evaluation, tier) !== tier
    ? { substitutedFrom: actualTierOf(evaluation, tier) }
    : {}),
});

/** 엔진이 실제로 내린 구분. 적정 칸으로 끌어온 항목은 칸 이름과 다르다 */
const actualTierOf = (
  evaluation: PlanEvaluation,
  band: RecommendationTier
): RecommendationTier => asRecommendableTier(evaluation.tier) ?? band;

// ─── PART 5 상세 항목 ───

const buildDetailItem = (
  tier: RecommendationTier,
  evaluation: PlanEvaluation
): Omit<UniversityDetailItem, "reason"> => {
  // 경쟁률·컷 추이는 엔진이 입결에서 뽑아 PlanEvaluation 에 담아 준다.
  // 리포트에서 입결을 다시 조회하면 두 곳의 판정이 어긋날 수 있다.
  const cutHistory = [...evaluation.cutHistory]
    .sort((a, b) => a.year - b.year)
    .slice(-CUT_HISTORY_YEARS);

  return {
    university: evaluation.plan.university,
    department: evaluation.plan.department,
    group: evaluation.plan.group,
    quota: evaluation.plan.quota,
    competitionRate: evaluation.competitionRate,
    ratioSummary: formatPlanRatioSummary(evaluation.plan),
    metricSummary: formatMetricSummary(
      evaluation.plan.formula.metric,
      evaluation.plan.formula.inquiryCount
    ),
    englishHistorySummary: formatEnglishHistorySummary(evaluation.plan.formula),
    bonusSummary: formatBonusSummary(evaluation.plan.formula.bonus),
    restrictionSummary: formatRestrictionSummary(evaluation.plan.restrictions),
    convertedScore: evaluation.convertedScore,
    totalScore: evaluation.plan.formula.totalScore,
    referenceCut: evaluation.referenceCut?.value ?? null,
    cutHistory,
    cutComparison: buildCutComparison(evaluation),
    ...(evaluation.plan.suneungWeight
      ? { suneungWeight: evaluation.plan.suneungWeight }
      : {}),
    tier,
    chance: evaluation.chance,
  };
};

// ─── 한국어 조사 (안내 문구용) ───

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const JONGSEONG_CYCLE = 28;

/**
 * 끝 글자의 한글 받침(종성) 유무.
 * 한글 음절이 아니면 false — 영문·숫자로 끝나는 학과명("AI융합학부" 같은
 * 표기 변형, 영문 학부명)은 받침 없는 쪽 조사로 붙인다.
 *
 * libs/report/pipeline/postprocessor.ts 에 같은 로직이 있지만 export 되지
 * 않고 그 파일은 5,600줄이 넘는다. 조사 하나 때문에 수시 후처리 모듈 전체를
 * 끌어올 이유가 없어 여기에 순수 함수로 둔다.
 */
export const hasJongseong = (word: string): boolean => {
  if (!word) {
    return false;
  }

  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_SYLLABLE_START || code > HANGUL_SYLLABLE_END) {
    return false;
  }

  return (code - HANGUL_SYLLABLE_START) % JONGSEONG_CYCLE !== 0;
};

/** 받침에 맞는 보조사(은/는)를 붙인다. */
export const withTopicParticle = (word: string): string =>
  `${word}${hasJongseong(word) ? "은" : "는"}`;

/** 받침에 맞는 목적격 조사(을/를)를 붙인다. */
export const withObjectParticle = (word: string): string =>
  `${word}${hasJongseong(word) ? "을" : "를"}`;

/** 받침에 맞는 접속 조사(와/과)를 붙인다. */
export const withAndParticle = (word: string): string =>
  `${word}${hasJongseong(word) ? "과" : "와"}`;

// ─── 추천 목록 안내 문구 (코드 생성) ───
//
// specs/013-jeongsi-domain-rules.md §8-b 의 확정 문안을 그대로 구현한다.
// 이 문장은 학생에게 가공 없이 노출되므로 §8-b.1 공통 원칙을 따른다:
// 내부 용어(계열그룹·대계열·격차·적정 구간·모집단위) 금지 / 사유→사실→행동
// 순서 / 결핍 서술 금지 / 중복 금지 / 괄호 중첩 금지 / 조사 처리.

/** §8-b.5 자유 입력 target 을 그대로 노출할 수 있는 최대 길이 */
const MAX_TARGET_LENGTH = 20;

/** target 이 비정상일 때 쓰는 최후 표기 */
const TARGET_FALLBACK_LABEL = "희망 계열";

/**
 * 학생에게 보여줄 희망 학과 표기.
 *
 * preference.target 은 사용자 자유 입력("의대" / "의예과" / "의학과")이다.
 * 그대로 쓰는 편이 친근하지만 비정상 입력은 문장을 깨뜨리므로, 길이·공백을
 * 검증하고 어긋나면 정규화된 category 명으로 대체한다 (§8-b.5).
 */
const resolveTargetLabel = (
  analysis: JeongsiAnalysis,
  normalizedCategory: string
): string => {
  const trimmed = analysis.input.preference.target.trim();
  const isDisplayable =
    trimmed.length > 0 &&
    trimmed.length <= MAX_TARGET_LENGTH &&
    !/[\s]{2,}/.test(trimmed) &&
    !/[\n\r\t]/.test(trimmed);

  if (isDisplayable) {
    return trimmed;
  }

  if (normalizedCategory.length > 0) {
    return normalizedCategory;
  }

  // 후보에 실제로 담긴 표준 카테고리를 마지막 수단으로 쓴다.
  const fromPlans =
    analysis.ineligiblePlans[0]?.plan.category ??
    flattenRecommendations(analysis)[0]?.evaluation.plan.category;

  return fromPlans ?? TARGET_FALLBACK_LABEL;
};

/** 희망 학과를 표준 카테고리로 정규화. 매핑에 없으면 입력값을 그대로 쓴다 */
const toTargetCategory = (target: string): string =>
  getCategoryForDepartment(target) ?? target;

// ─── blockedByRestrictions (§8-b.2) ───

/** 수학 요구를 문구에 적을 순서 */
const MATH_ELECTIVE_ORDER: MathElective[] = ["미적분", "기하", "확률과통계"];

const INQUIRY_REQUIREMENT_LABEL: Record<string, string> = {
  과탐필수: "과학탐구 2과목",
  과탐1과목이상: "과학탐구 1과목 이상",
};

/** 과탐 요구가 과목 수만 다를 때 두 요구를 한 문구로 묶은 표기 */
const INQUIRY_REQUIREMENT_BOTH = "과학탐구 1~2과목";

/**
 * 차단된 모집단위들의 수학 요구 합집합.
 *
 * ineligibleReason 은 이미 완결된 문장이라 이어 붙이면 괄호 중첩과 중복이
 * 생긴다(§8-b.2 실측 202자). 제한은 수학·탐구 두 차원뿐이므로 차원별
 * 합집합으로 집계해 사유를 2개로 정리한다.
 */
const collectMathRequirement = (plans: PlanEvaluation[]): string | null => {
  const electives = new Set<MathElective>();

  for (const { plan } of plans) {
    for (const elective of plan.restrictions?.math ?? []) {
      electives.add(elective);
    }
  }

  const ordered = MATH_ELECTIVE_ORDER.filter((elective) =>
    electives.has(elective)
  );

  return ordered.length > 0 ? ordered.join(" 또는 ") : null;
};

/** 차단된 모집단위들의 탐구 요구 집계 */
const collectInquiryRequirement = (plans: PlanEvaluation[]): string | null => {
  const kinds = new Set<string>();

  for (const { plan } of plans) {
    const inquiry = plan.restrictions?.inquiry;
    if (inquiry && inquiry !== "제한없음") {
      kinds.add(inquiry);
    }
  }

  if (kinds.size === 0) {
    return null;
  }
  if (kinds.size > 1) {
    return INQUIRY_REQUIREMENT_BOTH;
  }

  const [only] = [...kinds];
  return INQUIRY_REQUIREMENT_LABEL[only] ?? null;
};

/** "이 계열은 ~을 요구합니다." 한 문장. 요구가 없으면 null */
const buildRequirementSentence = (plans: PlanEvaluation[]): string | null => {
  const requirements = [
    collectMathRequirement(plans),
    collectInquiryRequirement(plans),
  ].filter((requirement): requirement is string => requirement !== null);

  if (requirements.length === 0) {
    return null;
  }

  const [first, second] = requirements;
  const subject =
    second === undefined
      ? withObjectParticle(first)
      : `${withAndParticle(first)} ${withObjectParticle(second)}`;

  return `이 계열은 ${subject} 요구합니다.`;
};

/**
 * 지원 불가 안내 (§8-b.2).
 *
 * 이 리포트에서 가장 결과가 무거운 문구다. "불가능하다"로 끝나면 학생이
 * 멈추므로 마지막에 행동 안내를 둔다. 다음 수능 응시 과목 변경 안내는
 * 자동 리포트가 재수를 권하는 것으로 읽혀 넣지 않는다.
 */
const buildBlockedNotice = (
  analysis: JeongsiAnalysis,
  targetLabel: string
): string => {
  const { score } = analysis.input;
  const takenSubjects = `수학 ${score.math.elective}, 탐구 ${score.inquiry1.subject}·${score.inquiry2.subject}`;
  const requirement = buildRequirementSentence(analysis.ineligiblePlans);

  return [
    `희망하신 ${withTopicParticle(targetLabel)} 정시에서 수능 응시 과목 조건이 있어, 현재 응시 과목(${takenSubjects})으로는 지원할 수 있는 곳이 없습니다.`,
    requirement,
    "희망 계열을 바꿔 다시 분석해 보세요.",
  ]
    .filter((sentence): sentence is string => sentence !== null)
    .join(" ");
};

// ─── poolStage (§8-b.3) ───

/**
 * 학생에게 보여줄 계열명과 예시 학과.
 *
 * "계열그룹"은 내부 용어라 노출하지 않고, 구체적인 계열명과 예시 학과를
 * 적는다. 철학 지망생의 목록에 사학과가 보이는 이유를 이 문구가 설명한다.
 * 예시는 FIELD_GROUPS(§6.1-b 그룹 표)에서 학생 어휘로 2~3개만 뽑았다.
 * 계열무관(자유전공·공학계열)은 계열명으로 쓸 표현이 없어 비워 둔다.
 */
const FIELD_GROUP_DISPLAY: Partial<
  Record<FieldGroupName, { label: string; examples: string[] }>
> = {
  경상: { label: "경상계열", examples: ["경제", "회계", "무역"] },
  사회: { label: "사회계열", examples: ["사회학", "정치학", "심리학"] },
  인문: { label: "인문계열", examples: ["국어국문", "영어영문", "사학"] },
  교육: {
    label: "사범계열",
    examples: ["국어교육", "초등교육", "유아교육"],
  },
  "컴퓨터·IT": {
    label: "컴퓨터·IT 계열",
    examples: ["컴퓨터공학", "소프트웨어", "인공지능"],
  },
  전기전자: {
    label: "전기전자계열",
    examples: ["전자공학", "전기공학", "반도체공학"],
  },
  "기계·건설": {
    label: "기계·건설계열",
    examples: ["기계공학", "산업공학", "토목공학"],
  },
  "화학·생명": {
    label: "화학·생명계열",
    examples: ["화학공학", "생명공학", "생명과학"],
  },
  "수리·자연": {
    label: "수리·자연계열",
    examples: ["수학", "물리학", "통계학"],
  },
  의약: { label: "의약계열", examples: ["치의학", "한의학", "약학"] },
  보건: { label: "보건계열", examples: ["간호학", "재활학", "보건학"] },
  "예체능·디자인": {
    label: "예체능·디자인계열",
    examples: ["디자인", "의류학", "체육학"],
  },
};

/** 예시에서 희망 학과 자신을 걸러내기 위한 느슨한 비교 ("수학" ↔ "수") */
const isSameDepartmentName = (a: string, b: string): boolean =>
  a.replace(/학$/, "") === b.replace(/학$/, "");

const EXAMPLE_COUNT = 3;

/**
 * 후보 확대 안내 (§8-b.3).
 *
 * "부족해서"는 학생 잘못으로 읽히므로 원인을 대학 모집 현황에 귀속시키고,
 * 확대가 선택지를 넓혀 준 서비스 행위로 읽히도록 행동을 먼저 쓴다.
 */
const buildPoolStageNotice = (
  targetLabel: string,
  targetCategory: string,
  region: PreferredRegion
): string => {
  const reason = `희망 지역(${region})의 ${targetLabel}만으로는 현재 성적에 맞는 지원처를 고루 찾기 어려워 비교 범위를 넓혔습니다.`;

  const group = findFieldGroup(targetCategory);
  const display = group === null ? undefined : FIELD_GROUP_DISPLAY[group];

  if (display === undefined) {
    return `희망하신 ${targetLabel} 외에 인접 계열까지 함께 비교했습니다. ${reason}`;
  }

  const examples = display.examples
    .filter((example) => !isSameDepartmentName(example, targetCategory))
    .slice(0, EXAMPLE_COUNT);
  const scope =
    examples.length > 0
      ? `${display.label}(${examples.join("·")} 등)`
      : display.label;

  return `희망하신 ${targetLabel} 외에 ${scope}까지 함께 비교했습니다. ${reason}`;
};

// ─── moderateBandSubstituted (§8-b.4) ───

/**
 * 끌어온 항목은 자기 tier 를 유지하므로(§9 #9) 목록의 구분 표시가 진실이다.
 * "적정 구간"·"격차" 같은 내부 용어를 쓰지 않고 그쪽을 보라고 안내한다.
 */
const MODERATE_SUBSTITUTED_NOTICE =
  "현재 성적에 정확히 '적정'으로 분류되는 곳이 많지 않아, 기준컷과의 격차가 적정에 가장 가까운 곳을 함께 담았습니다. 함께 담은 대학의 실제 구분은 코멘트와 대학별 상세 분석에 적었습니다.";

/** 적정이 비었을 때 대안을 가리킬 밴드와 그 언급 순서 */
const MODERATE_ALTERNATIVE_TIERS: RecommendationTier[] = ["상향", "안정"];

/**
 * 적정이 빈 경우의 안내.
 *
 * 근접 대체가 발동했더라도 끌어올 후보가 전부 다른 밴드에 이미 노출되어
 * 있으면(또는 1.5σ 상한에 걸리면) 적정은 빈 채로 나온다. 그때 "가장 가까운
 * 곳을 함께 담았습니다"를 쓰면 비어 있는 섹션과 정면으로 모순된다.
 *
 * 가리킬 밴드는 **실제로 채워진 것만** 언급한다. 비어 있는 목록을 보라고
 * 안내하는 것은 "전멸인데 넓혀 비교했습니다"·"비었는데 담았습니다"와 같은
 * 종류의 오류다.
 */
const buildModerateEmptyNotice = (
  recommendations: JeongsiAnalysis["recommendations"]
): string => {
  const filled = MODERATE_ALTERNATIVE_TIERS.filter(
    (tier) => recommendations[tier].length > 0
  );
  const head = "현재 성적에 '적정'으로 분류되는 곳이 없습니다.";

  if (filled.length === 0) {
    return head;
  }

  return `${head} 가장 가까운 선택지는 아래 ${filled.join("·")} 목록에서 확인해 주세요.`;
};

/**
 * 추천 목록을 그대로 읽으면 오해할 수 있는 사실을 문구로 만든다.
 *
 * notices 는 AI 필드가 아니다. 선정 과정의 사실은 코드가 확정하고,
 * AI 는 이 문구를 읽어 총평의 톤만 맞춘다. 같은 사실을 양쪽이 각자
 * 서술하면 리포트 안에서 두 설명이 어긋난다.
 */
export const buildRecommendationNotices = (
  analysis: JeongsiAnalysis
): string[] => {
  const { selection } = analysis;
  const targetCategory = toTargetCategory(
    analysis.input.preference.target.trim()
  );
  const targetLabel = resolveTargetLabel(analysis, targetCategory);

  // 지원 불가일 때는 이 문구만 내보낸다 (§8-b.2).
  // 판정 범위가 Stage 1+2 라서 전멸인데도 poolStage 가 2 일 수 있고, 그러면
  // "넓혀 비교했습니다"와 "지원할 수 있는 곳이 없습니다"가 한 화면에
  // 동시에 뜬다. 추천이 빈 상태에서 확대·대체 안내는 의미가 없다.
  if (selection.blockedByRestrictions) {
    return [buildBlockedNotice(analysis, targetLabel)];
  }

  // 확대·대체 안내는 모두 "목록에 담긴 것"을 설명하는 문구다.
  // 목록이 비면 설명할 대상이 없으므로 내보내지 않는다.
  if (flattenRecommendations(analysis).length === 0) {
    return [];
  }

  const notices: string[] = [];

  if (selection.poolStage !== 1) {
    notices.push(
      buildPoolStageNotice(
        targetLabel,
        targetCategory,
        analysis.input.preference.region
      )
    );
  }

  // 문구를 고르는 1차 기준은 플래그가 아니라 **적정 버킷의 항목 수**다.
  // §8-b.4 는 빈 경우의 조건을 moderateBandSubstituted === false 로 적지만,
  // 대체가 발동했는데도 끌어올 후보가 전부 다른 밴드에 이미 노출되어 비는
  // 경로가 있다. 그 경우까지 "담았습니다"로 말하지 않도록 항목 수를 먼저 본다.
  if (analysis.recommendations.적정.length === 0) {
    notices.push(buildModerateEmptyNotice(analysis.recommendations));
  } else if (selection.moderateBandSubstituted) {
    notices.push(MODERATE_SUBSTITUTED_NOTICE);
  }

  return notices;
};

// ─── 조합 ───

const COMBINATION_GROUP_ORDER: AdmissionGroup[] = ["가", "나", "다"];

export const buildCombinationItems = (
  analysis: JeongsiAnalysis
): Omit<CombinationItem, "strategy">[] =>
  analysis.combinations.map((combination) => {
    const slots: CombinationSlot[] = [];

    for (const group of COMBINATION_GROUP_ORDER) {
      const evaluation = combination[group];
      if (!evaluation) {
        continue;
      }
      const tier = asRecommendableTier(evaluation.tier);
      if (!tier) {
        continue;
      }
      slots.push({
        group,
        university: evaluation.plan.university,
        department: evaluation.plan.department,
        tier,
        chance: evaluation.chance,
      });
    }

    return { id: combination.id, label: combination.label, slots };
  });

// ─── 진행률 ───

export type JeongsiBuildStatus = "done" | "fallback" | "skipped";

export interface JeongsiBuildProgress {
  sectionId: JeongsiSectionId;
  /** 화면·SSE 표시용 섹션 제목 */
  title: string;
  /**
   * done: AI 해설 수신
   * fallback: 호출 실패로 폴백 문구 적용
   * skipped: geminiClient 미주입으로 해설 호출 자체를 건너뜀
   */
  status: JeongsiBuildStatus;
  completed: number;
  total: number;
  percent: number;
}

const createProgressTracker = (
  total: number,
  onProgress?: (progress: JeongsiBuildProgress) => void
) => {
  let completed = 0;

  return (sectionId: JeongsiSectionId, status: JeongsiBuildStatus): void => {
    completed += 1;
    onProgress?.({
      sectionId,
      title: SECTION_TITLE[sectionId],
      status,
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    });
  };
};

// ─── Gemini 호출 ───

/** gemini-client 의 call 만 의존한다 (테스트에서 목으로 대체하기 위함) */
export interface JeongsiGeminiClient {
  call: <T>(options: GeminiCallOptions) => Promise<GeminiCallResult<T>>;
}

/**
 * 해설에 쓰는 모델.
 * gemini-client 의 DEFAULT_MODEL 과 같은 값이며, flash-lite 는 폴백 체인이
 * 비어 있어 모델이 다운그레이드되지 않는다. 따라서 해설이 생성된 파트는
 * 항상 이 모델로 만들어진다 (jeongsi_reports.ai_model_version 기록용).
 */
export const JEONGSI_AI_MODEL = "gemini-2.5-flash-lite";

export interface BuildJeongsiReportOptions {
  /**
   * 미주입이면 해설 호출을 모두 건너뛰고 코드 계산값 + 폴백 문구만으로
   * 리포트를 완성한다. AI 비활성 경로에서 별도 조립 코드가 필요 없다.
   */
  geminiClient?: JeongsiGeminiClient;
  reportId: string;
  onProgress?: (progress: JeongsiBuildProgress) => void;
  /** 생성 시각 주입 (테스트 고정용) */
  createdAt?: string;
}

/**
 * 해설 한 파트를 요청한다.
 * 호출 실패는 던지지 않고 null 을 돌려주어, 파싱 단계에서 폴백 문구로
 * 수렴시킨다. 응답이 스키마에 어긋난 경우와 같은 경로를 타게 된다.
 */
const requestCommentary = async (
  sectionId: ModelSectionId,
  client: JeongsiGeminiClient,
  systemPrefix: string,
  prompt: string,
  report: (sectionId: JeongsiSectionId, status: JeongsiBuildStatus) => void
): Promise<unknown> => {
  try {
    const result = await client.call<unknown>({
      systemPrefix,
      prompt,
      responseSchema: EMPTY_SCHEMA,
      thinkingBudget: THINKING_BUDGET,
      maxOutputTokens: MAX_OUTPUT_TOKENS[sectionId],
    });
    report(sectionId, "done");
    return sanitizeCommentaryTone(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[jeongsi:report] ${sectionId} 해설 생성 실패 → 폴백 적용: ${message.slice(0, 150)}`
    );
    report(sectionId, "fallback");
    return null;
  }
};

const resolveItemComment = (
  byIndex: CommentaryByIndex,
  index: number,
  fallback: string
): string => byIndex.get(index) ?? fallback;

/** 다시 쓰기 요청은 진행률에 세지 않는다 (파트당 진행 단계는 1회) */
const IGNORE_PROGRESS = (): void => {};

/**
 * 해설 칸별 규칙. 프롬프트가 적은 문장 수·글자 수 상한과 같은 값이며,
 * 리포트에 담기 전에 코드가 이 값으로 검사한다.
 */
const TEXT_RULE = {
  scoreOverall: { sentences: 3, maxChars: 300 },
  scoreStrength: { sentences: 2, maxChars: 200 },
  scoreWeakness: { sentences: 2, maxChars: 200 },
  matchOverall: { sentences: 3, maxChars: 250 },
  matchReason: { sentences: 2, maxChars: 120 },
  recommendationOverall: { sentences: 3, maxChars: 300 },
  recommendationComment: { sentences: 1, maxChars: 110 },
  combinationOverall: { sentences: 3, maxChars: 250 },
  combinationDifference: { sentences: 1, maxChars: 90 },
  detailSentence: { sentences: 1, maxChars: DETAIL_SENTENCE_MAX_CHARS },
  /** PART 5 추천 이유 전체 (AI 1문장 + 코드 격차 문장) */
  detailReason: { sentences: 3, maxChars: 300 },
} satisfies Record<string, TextRule>;

interface CreateSlotInput {
  target: CommentarySlot["target"];
  /** 파싱한 원문. finalize 를 거쳐 칸의 1차 해설이 된다 */
  raw: string;
  rule: TextRule;
  finalize?: (raw: string) => string;
  fallback: (text: string) => string;
  extraCheck?: (text: string) => string[];
  /** 수치 검사. 이 칸에 없는 수치나 영역과 맞지 않는 성적이면 위반이다 */
  checkNumbers: (text: string) => string[];
}

const createSlot = ({
  raw,
  finalize: guards = (text) => text,
  extraCheck,
  checkNumbers,
  ...rest
}: CreateSlotInput): CommentarySlot => {
  // 숫자 뒤 조사는 모든 가드 뒤에 맞춘다. 가드가 "가중치 120%는"을
  // "가중치 120는"으로 바꾸며 조사가 틀어졌다(실측).
  const finalize = (text: string) => normalizeNumberParticles(guards(text));
  return {
    ...rest,
    text: finalize(raw),
    finalize,
    extraCheck: (text) => [
      ...checkNumbers(text),
      ...(extraCheck?.(text) ?? []),
    ],
  };
};

/**
 * 값만 이어 붙인 문자열. 키 이름의 숫자(inquiry1 등)는 인용 가능한 수치가
 * 아니므로 뺀다.
 */
const joinLeafValues = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(joinLeafValues).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(joinLeafValues).join(" ");
  }
  return "";
};

/**
 * 총평류 칸. 다시 받은 문장도 규칙을 어기면 앞에서부터 규칙의 문장 수만큼
 * 남겨 보고, 그래도 어기면 고정 폴백 문구를 쓴다.
 */
const createFieldSlot = (
  field: string,
  raw: string,
  rule: TextRule,
  fallback: string,
  checkNumbers: (text: string) => string[],
  finalize?: (raw: string) => string,
  extraCheck?: (text: string) => string[]
): CommentarySlot =>
  createSlot({
    target: { field },
    raw,
    rule,
    finalize,
    checkNumbers,
    extraCheck,
    fallback: (text) => {
      const kept = keepFrameSentences(text, rule.sentences);
      const problems = [
        ...findTextViolations(kept, rule),
        ...checkNumbers(kept),
        ...(extraCheck?.(kept) ?? []),
      ];
      return problems.length === 0 ? kept : fallback;
    },
  });

const formatSigned = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
};

/**
 * PART 1 강점·약점 해설 폴백. 그 영역의 실제 성적과 반영비율 판단으로 쓴다
 * ("강점 해설을 생성하지 못했습니다" 같은 안내문은 해석이 없다).
 */
export const composeAreaCommentFallback = (
  row: AreaScoreRow | undefined,
  role: "강점" | "약점",
  level?: string
): string | null => {
  if (!row) return null;
  const { label } = row;
  // 강점·약점은 백분위가 있는 국어·수학·탐구에서만 나온다(영어는 등급만 있다)
  if (row.percentile === null || row.deviation === null || row.rank === null) {
    return null;
  }
  const position = level ? `(${level})` : "";
  const score = `${label} 백분위 ${row.percentile}점${position}`;
  const deviation = `평균 대비 ${formatSigned(row.deviation)}점`;
  return role === "강점"
    ? `${score}은 국어·수학·탐구 중 ${row.rank}순위로, ${deviation} 앞선 강점입니다. ${label} 반영비율이 높은 대학에서 환산점수가 유리하게 잡히므로, ${label} 비중이 큰 대학을 원서 후보로 먼저 살피는 편이 합리적입니다.`
    : `${score}은 국어·수학·탐구 중 ${row.rank}순위로, ${deviation} 뒤처진 약점입니다. ${label} 반영비율이 높은 대학에서는 환산 손실이 생기므로, ${label} 비중이 작은 대학을 우선 살피는 편이 합리적입니다.`;
};

const AVERAGE_SCOPE =
  /((?:국어|수학|탐구|국|수|탐)(?:\s*[·,]\s*(?:국어|수학|탐구|국|수|탐))*)\s*평균/g;

/**
 * 평균 대비 편차의 기준을 국·수·탐 세 영역이 아닌 평균으로 쓴 문장.
 * 실측: 국·수·탐 평균 대비 +1.2점을 "국어·탐구 평균 대비 1.2점 높아"로 씀.
 */
export const findWrongAverageScope = (text: string): string[] => {
  const wrong = [...text.matchAll(AVERAGE_SCOPE)].some(([, scope]) => {
    const areas = new Set(
      scope.split(/\s*[·,]\s*/).map((name) => name.slice(0, 1))
    );
    return areas.size < 3;
  });
  return wrong
    ? ["평균 대비 편차는 국·수·탐 평균(세 영역) 기준이라고 씁니다"]
    : [];
};

const findPart1Problems = (text: string): string[] => [
  ...findEnglishPercentile(text),
  ...findWrongAverageScope(text),
];

const SOLE_CLAIM = /유일|이곳뿐|하나뿐/;

/**
 * "유일한 대학" 같은 목록 안 단독 주장을 재료 판정에 없는데 쓴 문장.
 * 실측: 국어 0% 대학이 셋인데 그중 하나를 "국어를 0% 반영하는 유일한 대학"으로 씀.
 */
export const findUnsupportedSoleClaim = (
  text: string,
  facts: JudgedFact[]
): string[] => {
  if (!SOLE_CLAIM.test(text)) return [];
  const supported = facts.some((fact) =>
    [fact.meaning, fact.sentence, fact.alternate?.sentence].some(
      (sentence) => sentence !== undefined && SOLE_CLAIM.test(sentence)
    )
  );
  return supported
    ? []
    : ["목록에서 하나뿐이라는 말은 재료에 그 판정이 있을 때만 씁니다"];
};

const ENGLISH_PERCENTILE = /영어(?:\s*영역)?(?:의)?\s*(?:백분위|표준점수)/;

/**
 * 영어를 백분위·표준점수로 쓴 문장. 영어는 원문에 등급만 있다
 * (등급을 백분위로 바꾼 값은 원문 값이 아니다 — 사용자 결정 2026-11-05).
 */
export const findEnglishPercentile = (text: string): string[] =>
  ENGLISH_PERCENTILE.test(text)
    ? ["영어는 등급만 있으므로 등급으로 씁니다"]
    : [];

/**
 * PART 5 1문장 폴백. 판정 문장을 쓰고, 값까지 붙이면 상한을 넘을 때는
 * 판정만 쓴다(판정 문장이 해석을 담고 있다).
 */
const composeDetailFallback = (fact: JudgedFact): string => {
  const sentence = composeFactSentence(fact);
  return sentence.length <= DETAIL_SENTENCE_MAX_CHARS ? sentence : fact.meaning;
};

const BURDEN_REDUCED = /부담(?:을|이)?\s*(?:줄|적|최소|크지 않|없|덜)/;

/**
 * 약점 영역 비율이 목록에서 가장 높은 대학을 "부담을 줄여 준다"고 쓴 문장.
 * 소재 배정 뒤에도 2회 실측됐다(9회차 동국대, 학생 E 의 탐구 25%).
 */
export const findReversedBurden = (
  text: string,
  weakness: AreaRatioFact | undefined
): string[] => {
  if (!weakness || weakness.position !== "가장 높음") return [];
  const reversed = splitSentences(text).some(
    (sentence) =>
      sentence.includes(weakness.label) &&
      sentence.includes("가장 높") &&
      BURDEN_REDUCED.test(sentence)
  );
  return reversed
    ? [
        `약점인 ${weakness.label} 반영 ${weakness.value}%는 목록 대학 중 가장 높으므로, 부담이 큰 쪽으로 씁니다`,
      ]
    : [];
};

/** 조합의 칸을 모두 대학명으로 나열했는지. 다른 조합과 달라지는 칸만 짚어야 한다 */
const namesEverySlot = (
  combination: Pick<CombinationItem, "slots">,
  text: string
): boolean =>
  combination.slots.length > 1 &&
  combination.slots.every((slot) => text.includes(slot.university));

/**
 * PART 4 차이 문장 폴백. 다른 조합과 갈리는 칸을 짚어 조합마다 다르게 쓴다
 * (일반 문구 하나를 쓰면 세 조합에 같은 문장이 반복된다).
 */
const composeDifferenceFallback = (
  combination: Omit<CombinationItem, "strategy">,
  combinations: Omit<CombinationItem, "strategy">[]
): string => {
  const [slot] = findDistinctSlots(combination, combinations);
  if (!slot) return JEONGSI_COMMENTARY_FALLBACK.combinationStrategy;
  const conclusion =
    "다른 조합과 갈리는 칸이라, 이 칸의 선택이 조합의 성격을 정합니다.";
  const named = `${slot.group}군 ${slot.tier} 원서(${slot.university} ${slot.department})가 ${conclusion}`;
  return named.length <= TEXT_RULE.combinationDifference.maxChars
    ? named
    : `${slot.group}군 ${slot.tier} 원서가 ${conclusion}`;
};

// ─── 조립 ───

export const buildJeongsiReport = async (
  analysis: JeongsiAnalysis,
  options: BuildJeongsiReportOptions
): Promise<JeongsiReportContent> => {
  const { geminiClient, reportId, onProgress } = options;
  const { preference } = analysis.input;

  // 1) 코드 계산값으로 섹션 데이터를 먼저 완성한다.
  const rows = buildAreaScoreRows(analysis);
  const areaSummary = buildAreaSummaryLine(rows);
  const advantageItems = buildAdvantageItems(analysis);
  const flattened = flattenRecommendations(analysis);
  const recommendationEntries = flattened.map(({ tier, evaluation }) =>
    toRecommendationEntry(tier, evaluation)
  );
  const combinationItems = buildCombinationItems(analysis);
  // PART 5 는 대학마다 한 장이라 칸이 아니라 실제 판정으로 구분을 쓴다
  const detailItems = flattened.map(({ tier, evaluation }) =>
    buildDetailItem(actualTierOf(evaluation, tier), evaluation)
  );
  // 섹션에는 report-types 계약대로 담고, 프롬프트에만 분류 척도를 덧붙인다.
  const notices = buildRecommendationNotices(analysis);
  const selectionNotes: JeongsiSelectionNotes = {
    notices,
    blockedByRestrictions: analysis.selection.blockedByRestrictions,
  };
  const detailPromptItems: UniversityDetailPromptItem[] = detailItems.map(
    (item, index) => ({
      ...item,
      percentileGap: flattened[index].evaluation.percentileGap,
    })
  );

  // 문장 재료: 코드가 판정한 값과 의미 (judged-facts.ts). 프롬프트와 폴백이
  // 같은 판정을 쓴다.
  const studentContext: StudentContext = {
    score: analysis.input.score,
    rows,
    strengths: analysis.diagnosis.strengths,
    weaknesses: analysis.diagnosis.weaknesses,
  };
  // 영역별 응시자 중 위치(백분위 정의로 정해지는 값). 해설이 인용할 수 있게 수치 대조에도 싣는다.
  const areaLevels: Partial<Record<ScoreArea, string>> = Object.fromEntries(
    (["korean", "math", "inquiry"] as const).flatMap((area) => {
      const level = describeAreaLevel(analysis.input.score, area);
      return level ? [[area, level]] : [];
    })
  );
  const scoreFacts = judgeScoreOverall(
    studentContext,
    analysis.diagnosis.averagePercentile,
    analysis.diagnosis.totalStandardScore
  );
  const strengthFacts = collectAreaRatios(
    advantageItems,
    analysis.diagnosis.strengths
  );
  const weaknessFacts = collectAreaRatios(
    advantageItems,
    analysis.diagnosis.weaknesses
  );
  const matchFactInputs = advantageItems.map((item, index) => ({
    university: item.university,
    metricSummary: item.metricSummary,
    ratioSummary: item.ratioSummary.includes("가중")
      ? item.ratioSummary
      : undefined,
    strength: strengthFacts[index][0],
    weakness: weaknessFacts[index][0],
  }));
  const matchFacts = assignMatchFacts(matchFactInputs, studentContext);
  const matchFactPools = listMatchFacts(matchFactInputs, studentContext);
  const matchVerdicts = composeMatchVerdicts(matchFactInputs);
  const tierCounts = countByTier(recommendationEntries);
  const recommendationOverallInput = {
    tierCounts: formatTierCounts(tierCounts),
    counts: {
      상향: tierCounts.get("상향") ?? 0,
      적정: tierCounts.get("적정") ?? 0,
      안정: tierCounts.get("안정") ?? 0,
    },
    gapRanges: formatTierGapRanges(recommendationEntries),
    allocation: formatCardAllocation(preference.risk),
    risk: preference.risk,
    cautions: collectCautionItems(recommendationEntries),
  };
  const recommendationFacts = judgeRecommendationOverall(
    recommendationOverallInput
  );
  // 폴백 총평이 상한을 넘으면(신중히 볼 대학 이름이 길 때) 이름을 하나만 적는다
  const recommendationFallback =
    [2, 1]
      .map((listedCautions) =>
        judgeRecommendationOverall({
          ...recommendationOverallInput,
          listedCautions,
        })
          .map(composeFactSentence)
          .join(" ")
      )
      .find(
        (text) => text.length <= TEXT_RULE.recommendationOverall.maxChars
      ) ?? recommendationFacts.map(composeFactSentence).join(" ");
  const detailFacts = assignDetailFacts(
    flattened.map(({ evaluation }) => evaluation),
    detailItems.map((item) => item.ratioSummary),
    studentContext
  );
  const recommendationOpenings = assignRecommendationOpenings(
    recommendationEntries
  );

  // 수치 대조: 칸마다 인용할 수 있는 값은 학생 성적과 그 칸의 데이터·판정이다.
  // 다른 대학이나 다른 영역의 값을 옮겨 쓰면 위반이 된다.
  const studentValues = joinLeafValues({
    score: analysis.input.score,
    rows,
    averagePercentile: analysis.diagnosis.averagePercentile,
    totalStandardScore: analysis.diagnosis.totalStandardScore,
  });
  const areaScores = rows.map(({ label, percentile, standardScore }) => ({
    label,
    percentile,
    standardScore,
  }));
  // 대학 이름도 같은 방식으로 본다: 그 칸의 데이터에 있는 대학만 쓸 수 있다.
  const checkAgainst = (...sources: unknown[]) => {
    const sourceText = sources.map(joinLeafValues).join(" ");
    const allowed = collectNumbers(studentValues, sourceText);
    return (text: string): string[] => [
      ...findUngroundedNumbers(text, allowed),
      ...findMismatchedAreaScores(text, areaScores),
      ...findForeignUniversityNames(text, sourceText),
    ];
  };

  // PART 4 총평: 기본 배분과 같은 조합은 코드가 칸을 세어 정한다
  const allocationInputs = combinationItems.map((item) => ({
    label: item.label,
    tiers: item.slots.map((slot) => slot.tier),
  }));
  const allocationFact = judgeCombinationAllocation(
    allocationInputs,
    preference.risk
  );
  const allocationMatches = findAllocationMatches(
    allocationInputs,
    preference.risk
  );
  const combinationOverallFallback = [
    "가·나·다군에서 한 장씩 쓰는 정시 구조라, 조합은 군마다 어떤 구분의 원서를 두느냐로 성격이 갈립니다.",
    composeFactSentence(allocationFact),
    "조합 사이에서 고민된다면 희망 학과, 대학 선호, 합격 여유 중 무엇을 앞세울지를 먼저 정하는 편이 합리적입니다.",
  ].join(" ");
  // 배분을 말하는 문장이 지목한 조합은 코드가 센 결과와 같아야 한다
  const checkAllocationClaim = (text: string): string[] => {
    const labels = combinationItems.map((item) =>
      coreCombinationLabel(item.label)
    );
    const mentioned = splitSentences(text)
      .filter((sentence) => sentence.includes("배분"))
      .flatMap((sentence) => {
        const compact = sentence.replace(/\s/g, "");
        return labels.filter((label) =>
          compact.includes(label.replace(/\s/g, ""))
        );
      });
    const allMatch =
      labels.length > 0 && allocationMatches.length === labels.length;
    const wrong = allMatch
      ? mentioned.length > 0 && new Set(mentioned).size < labels.length
      : mentioned.some((label) => !allocationMatches.includes(label));
    return wrong
      ? [
          `기본 배분과 같은 조합은 재료의 판단대로 씁니다: ${allocationFact.meaning}`,
        ]
      : [];
  };

  // PART 1 강점·약점 칸: 폴백은 그 영역의 실제 성적으로 쓴다
  const rowOf = (areas: ScoreArea[]) =>
    rows.find((row) => row.area === areas[0]);
  const strengthFallback =
    composeAreaCommentFallback(
      rowOf(analysis.diagnosis.strengths),
      "강점",
      areaLevels[analysis.diagnosis.strengths[0]]
    ) ?? JEONGSI_COMMENTARY_FALLBACK.scoreStrength;
  const weaknessFallback =
    composeAreaCommentFallback(
      rowOf(analysis.diagnosis.weaknesses),
      "약점",
      areaLevels[analysis.diagnosis.weaknesses[0]]
    ) ?? JEONGSI_COMMENTARY_FALLBACK.scoreWeakness;
  // PART 3 총평은 신중히 볼 곳을 이름으로 밝혀야 한다(실측: 이름을 빼고
  // "이 대학들에 원서를 쓸 때는"으로 써 가리키는 대상이 없었다).
  const firstCaution = recommendationEntries.find(
    (entry) =>
      entry.chance === "낮음" ||
      entry.chance === "매우낮음" ||
      (entry.percentileGap !== null && entry.percentileGap < 0)
  );

  // 목록이 빈 파트의 총평은 코드가 쓴다. 비어 있는 목록을 모델에 맡기자
  // "목록 대학들은 모두 영어 반영 비율이 높아", "모든 대학이 기준컷 이상"처럼
  // 없는 대학을 설명했다(실측). 호출도 하지 않는다.
  const widenAdvice =
    preference.region === "전국"
      ? "희망 계열을 넓혀"
      : "희망 지역이나 계열을 넓혀";
  const strengthLabel =
    JEONGSI_AREA_LABEL[analysis.diagnosis.strengths[0]] ?? null;
  // 응시 과목 제한으로 비었으면 안내 문구와 같은 이유로 말한다
  const blocked = analysis.selection.blockedByRestrictions;
  const reasonLabel = blocked
    ? "현재 응시 과목 조건"
    : `현재 조건(희망 지역 ${preference.region}, 희망 학과 ${preference.target})`;
  const retryAdvice = blocked ? "응시 과목 조건이 맞는 대학으로" : widenAdvice;
  const emptyOverall = {
    jeongsiUniversityMatch:
      advantageItems.length === 0
        ? [
            `${reasonLabel}으로는 지원 가능한 대학이 없어, 반영방식을 비교할 대학 목록도 비어 있습니다.`,
            strengthLabel
              ? `강점인 ${strengthLabel} 비중이 큰 대학일수록 같은 성적이 더 높게 환산된다는 점은 그대로입니다.`
              : "영역별 반영비율에 따라 같은 성적의 환산 결과가 달라진다는 점은 그대로입니다.",
            `${retryAdvice} 다시 확인할 때, 반영비율을 먼저 보는 편이 합리적입니다.`,
          ].join(" ")
        : null,
    jeongsiRecommendation:
      recommendationEntries.length === 0
        ? [
            `${reasonLabel}으로는 기준컷 자료로 지원 가능하다고 판단할 수 있는 대학이 없습니다.`,
            `${preference.risk} 성향의 기본 배분(${formatCardAllocation(preference.risk)})을 채울 원서를 찾으려면 ${retryAdvice} 다시 확인해야 합니다.`,
            strengthLabel
              ? `조건을 넓힐 때는 강점인 ${strengthLabel} 비중이 큰 대학부터 살피는 편이 합리적입니다.`
              : "조건을 넓힐 때는 반영비율이 성적에 맞는 대학부터 살피는 편이 합리적입니다.",
          ].join(" ")
        : null,
    jeongsiCombination:
      combinationItems.length === 0
        ? [
            "지원 가능한 대학이 없어 가·나·다군 조합을 구성하지 못했습니다.",
            `${blocked ? "응시 과목 조건이 맞는" : `${widenAdvice} 지원 가능한`} 대학이 생기면, 군마다 한 장씩 ${formatCardAllocation(preference.risk)}을 기본으로 조합을 구성할 수 있습니다.`,
            "그때는 희망 학과, 대학 선호, 합격 여유 중 무엇을 앞세울지를 먼저 정하는 편이 합리적입니다.",
          ].join(" ")
        : null,
  };

  // 2) PART 1~5 해설을 병렬 요청한다. 서로 의존하지 않는다.
  const systemPrefix = buildJeongsiSystemPrefix(preference);
  const report = createProgressTracker(
    JEONGSI_SECTION_ORDER.length,
    onProgress
  );
  const skip = (sectionId: JeongsiSectionId): Promise<unknown> => {
    report(sectionId, "skipped");
    return Promise.resolve(null);
  };
  const request = (
    sectionId: ModelSectionId,
    prompt: string
  ): Promise<unknown> => {
    if (!geminiClient) {
      return skip(sectionId);
    }
    return requestCommentary(
      sectionId,
      geminiClient,
      systemPrefix,
      prompt,
      report
    );
  };

  // 다시 쓰기 요청이 같은 프롬프트를 이어 쓰므로 파트별 프롬프트를 남겨 둔다.
  // PART 5 는 모델에 맡기지 않는다(아래 detailSentences).
  const prompts: Record<ModelSectionId, string> = {
    jeongsiScoreAnalysis: buildScoreAnalysisPrompt({
      rows,
      areaLevels,
      overallFacts: scoreFacts,
      averagePercentile: analysis.diagnosis.averagePercentile,
      totalStandardScore: analysis.diagnosis.totalStandardScore,
      strengthAreas: analysis.diagnosis.strengths,
      weaknessAreas: analysis.diagnosis.weaknesses,
    }),
    jeongsiUniversityMatch: buildUniversityMatchPrompt({
      areaSummary,
      facts: matchFacts,
      strengthAreas: analysis.diagnosis.strengths,
      weaknessAreas: analysis.diagnosis.weaknesses,
      items: advantageItems,
      selection: selectionNotes,
    }),
    jeongsiRecommendation: buildRecommendationPrompt({
      areaSummary,
      overallFacts: recommendationFacts,
      risk: preference.risk,
      items: recommendationEntries,
      selection: selectionNotes,
    }),
    jeongsiCombination: buildCombinationPrompt({
      risk: preference.risk,
      allocationFact,
      combinations: combinationItems,
      selection: selectionNotes,
    }),
  };

  const [scoreRaw, matchRaw, recommendationRaw, combinationRaw] =
    await Promise.all([
      request("jeongsiScoreAnalysis", prompts.jeongsiScoreAnalysis),
      emptyOverall.jeongsiUniversityMatch
        ? skip("jeongsiUniversityMatch")
        : request("jeongsiUniversityMatch", prompts.jeongsiUniversityMatch),
      emptyOverall.jeongsiRecommendation
        ? skip("jeongsiRecommendation")
        : request("jeongsiRecommendation", prompts.jeongsiRecommendation),
      emptyOverall.jeongsiCombination
        ? skip("jeongsiCombination")
        : request("jeongsiCombination", prompts.jeongsiCombination),
    ]);
  // PART 5 는 항목마다 판정 하나를 옮기는 1문장뿐이라 모델에 맡기지 않고
  // 코드 판정 문장을 그대로 쓴다. 모델은 값을 주어로 세우고 판정 문장을
  // 서술어로 이어 붙여 주어·서술어가 맞지 않는 문장을 만들었다(실측:
  // "영어 2등급과 한 등급 아래의 차 3점은 … 영향을 주는 구조입니다").
  report("jeongsiUniversityDetail", "done");

  // 3) 해설을 검증한다. 규칙을 어긴 칸만 한 번 다시 요청하고, 그래도
  //    어기면 코드 문장으로 바꾼다(commentary-validation.ts).
  const scoreCommentary = parseScoreAnalysisCommentary(scoreRaw);
  const matchCommentary = parseUniversityMatchCommentary(matchRaw);
  const recommendationCommentary =
    parseRecommendationCommentary(recommendationRaw);
  const combinationCommentary = parseCombinationCommentary(combinationRaw);

  // 1차 호출 자체가 실패한 파트(응답 null)는 다시 요청하지 않고 폴백으로 둔다.
  const resolveSection = (
    sectionId: ModelSectionId,
    firstResponse: unknown,
    slots: CommentarySlot[]
  ): Promise<string[]> =>
    resolveSlots(slots, {
      requestRepair: async (violations) => {
        if (!geminiClient || firstResponse === null) return null;
        const raw = await requestCommentary(
          sectionId,
          geminiClient,
          systemPrefix,
          buildRepairPrompt(
            prompts[sectionId],
            violations.map(({ slot, problems }) => ({
              target: slot.target,
              text: slot.text,
              problems,
              sentences: slot.rule.sentences,
            }))
          ),
          IGNORE_PROGRESS
        );
        return raw === null ? null : parseRepairedCommentary(raw);
      },
      onFallback: ({ slot, problems }) => {
        const { field, index } = slot.target;
        console.warn(
          `[jeongsi:report] ${sectionId} ${field}${index === undefined ? "" : `[${index}]`} 폴백 적용: ${problems.join(" / ")}`
        );
      },
    });

  const recommendationMeanings = assignChanceMeanings(recommendationEntries);
  const distinctCombinations = combinationItems.map((item) =>
    isFullyDistinct(item, combinationItems)
  );
  const differenceIndexes = combinationItems.flatMap((_item, index) =>
    distinctCombinations[index] ? [] : [index]
  );
  const detailMeanings = assignChanceMeanings(detailPromptItems);
  const strengthLabels = analysis.diagnosis.strengths.map(
    (area) => JEONGSI_AREA_LABEL[area]
  );
  const weaknessLabels = analysis.diagnosis.weaknesses.map(
    (area) => JEONGSI_AREA_LABEL[area]
  );
  const checkAreaRoles = (text: string): string[] =>
    findWeaknessCalledStrength(text, strengthLabels, weaknessLabels);

  const [
    [scoreOverall, scoreStrength, scoreWeakness],
    [matchOverall, ...matchReasons],
    [recommendationOverall],
    [combinationOverall, ...combinationDifferences],
  ] = await Promise.all([
    resolveSection("jeongsiScoreAnalysis", scoreRaw, [
      createFieldSlot(
        "overallComment",
        scoreCommentary.overallComment,
        TEXT_RULE.scoreOverall,
        scoreFacts.map(composeFactSentence).join(" "),
        checkAgainst(scoreFacts, areaLevels),
        undefined,
        findPart1Problems
      ),
      createFieldSlot(
        "strengthComment",
        scoreCommentary.strengthComment ===
          JEONGSI_COMMENTARY_FALLBACK.scoreStrength
          ? strengthFallback
          : scoreCommentary.strengthComment,
        TEXT_RULE.scoreStrength,
        strengthFallback,
        checkAgainst(scoreFacts, areaLevels),
        undefined,
        findPart1Problems
      ),
      createFieldSlot(
        "weaknessComment",
        scoreCommentary.weaknessComment ===
          JEONGSI_COMMENTARY_FALLBACK.scoreWeakness
          ? weaknessFallback
          : scoreCommentary.weaknessComment,
        TEXT_RULE.scoreWeakness,
        weaknessFallback,
        checkAgainst(scoreFacts, areaLevels),
        undefined,
        findPart1Problems
      ),
    ]),
    resolveSection("jeongsiUniversityMatch", matchRaw, [
      createFieldSlot(
        "overallComment",
        emptyOverall.jeongsiUniversityMatch ?? matchCommentary.overallComment,
        TEXT_RULE.matchOverall,
        emptyOverall.jeongsiUniversityMatch ??
          JEONGSI_COMMENTARY_FALLBACK.matchOverall,
        checkAgainst(advantageItems, matchFacts)
      ),
      ...advantageItems.map((item, index) =>
        createSlot({
          target: { field: "reason", index },
          // 해설이 오지 않은 칸은 판정 문장을 그대로 쓴다(일반 문구 대신)
          raw: resolveItemComment(
            matchCommentary.byIndex,
            index,
            matchFacts[index].map(composeFactSentence).join(" ")
          ),
          rule: TEXT_RULE.matchReason,
          checkNumbers: checkAgainst(item, matchFacts[index]),
          finalize: (raw) =>
            normalizeRatioMentions(
              stripLeadingSubject(raw, item.university),
              item.ratioSummary
            ),
          extraCheck: (text) => [
            ...findReversedBurden(text, weaknessFacts[index][0]),
            ...checkAreaRoles(text),
            ...findUnsupportedSoleClaim(text, matchFactPools[index]),
          ],
          fallback: () => matchFacts[index].map(composeFactSentence).join(" "),
        })
      ),
    ]),
    resolveSection("jeongsiRecommendation", recommendationRaw, [
      createFieldSlot(
        "overallComment",
        emptyOverall.jeongsiRecommendation ??
          recommendationCommentary.overallComment,
        TEXT_RULE.recommendationOverall,
        emptyOverall.jeongsiRecommendation ?? recommendationFallback,
        checkAgainst(
          recommendationOverallInput,
          recommendationFacts,
          recommendationEntries,
          recommendationOpenings
        ),
        (raw) =>
          normalizeTierCounts(
            normalizeCardAllocation(raw, preference.risk),
            tierCounts,
            preference.risk
          ),
        (text) =>
          firstCaution && !text.includes(firstCaution.university)
            ? [
                `신중히 볼 곳은 ${firstCaution.university}처럼 대학 이름으로 밝혀 씁니다`,
              ]
            : []
      ),
    ]),
    resolveSection("jeongsiCombination", combinationRaw, [
      createFieldSlot(
        "overallComment",
        emptyOverall.jeongsiCombination ??
          (combinationCommentary.overallComment ===
          JEONGSI_COMMENTARY_FALLBACK.combinationOverall
            ? combinationOverallFallback
            : combinationCommentary.overallComment),
        TEXT_RULE.combinationOverall,
        emptyOverall.jeongsiCombination ?? combinationOverallFallback,
        checkAgainst(
          combinationItems,
          formatCardAllocation(preference.risk),
          allocationFact
        ),
        (raw) => normalizeCardAllocation(raw, preference.risk),
        checkAllocationClaim
      ),
      ...differenceIndexes.map((index) =>
        createSlot({
          target: { field: "difference", index },
          raw: resolveItemComment(
            combinationCommentary.byIndex,
            index,
            composeDifferenceFallback(combinationItems[index], combinationItems)
          ),
          rule: TEXT_RULE.combinationDifference,
          checkNumbers: checkAgainst(combinationItems[index]),
          fallback: () =>
            composeDifferenceFallback(
              combinationItems[index],
              combinationItems
            ),
          extraCheck: (text) =>
            namesEverySlot(combinationItems[index], text)
              ? ["다른 조합과 달라지는 칸만 짚습니다"]
              : [],
        })
      ),
    ]),
  ]);

  const detailSentences = detailFacts.map(composeDetailFallback);

  // 4) 섹션 안에서 똑같은 문장이 두 번 나오지 않게 한다. 같은 단어를 다시
  //    쓰는 것은 괜찮고, 문장 전체가 같을 때만 그 칸의 다른 판정 문장으로
  //    바꾼다(실측: 5명 중 4명에게 같은 문장 1~2쌍).
  const unique = (sectionId: JeongsiSectionId, entries: SentenceEntry[]) =>
    ensureUniqueSentences(entries, ({ sentence }) =>
      console.warn(
        `[jeongsi:report] ${sectionId} 바꿀 문장이 없어 반복 문장을 뺌: ${sentence}`
      )
    );
  const chanceAlternatives = (
    gap: number | null,
    chance: PassChance,
    prefixes: string[] = []
  ): string[] =>
    JEONGSI_CHANCE_PHRASES[chance].meanings.flatMap((meaning) => {
      const sentence = composeChanceSentence(gap, meaning);
      return [sentence, ...prefixes.map((prefix) => `${prefix} ${sentence}`)];
    });

  const [uniqueScoreOverall, uniqueScoreStrength, uniqueScoreWeakness] = unique(
    "jeongsiScoreAnalysis",
    [{ text: scoreOverall }, { text: scoreStrength }, { text: scoreWeakness }]
  );

  // 바꿀 문장은 그 위치 판정의 다른 표현을 먼저, 그다음 이 항목의 다른
  // 판정을 쓴다. 다른 위치가 쓰는 판정은 빼야 한 항목 안에서 같은 뜻이
  // 두 번 나오지 않는다(실측: "영어 비중은 60%로 …" 뒤에 같은 판정의 다른 표현).
  const variantsOf = (fact: JudgedFact): string[] => [
    composeFactSentence(fact),
    ...(fact.alternate ? [fact.alternate.sentence] : []),
    ...(fact.extraSentences ?? []),
  ];
  const matchAlternatives = (index: number): string[][] =>
    matchFacts[index].map((fact, position) => {
      const otherValue = matchFacts[index][1 - position].value;
      const pool = matchFactPools[index];
      return [
        ...new Set([
          ...variantsOf(fact),
          ...pool
            .filter((candidate) => candidate.value === fact.value)
            .flatMap(variantsOf),
          ...pool
            .filter(
              (candidate) =>
                candidate.value !== fact.value && candidate.value !== otherValue
            )
            .flatMap(variantsOf),
        ]),
      ];
    });
  const [uniqueMatchOverall, ...uniqueMatchReasons] = unique(
    "jeongsiUniversityMatch",
    [
      { text: matchOverall },
      ...matchReasons.map((text, index) => ({
        text,
        rule: TEXT_RULE.matchReason,
        alternatives: matchAlternatives(index),
      })),
    ]
  );

  // PART 3 한 줄 코멘트는 코드가 잇는다(composeRecommendationComment).
  const recommendationComments = recommendationEntries.map((entry, index) =>
    composeRecommendationComment(
      recommendationOpenings[index],
      entry.percentileGap,
      recommendationMeanings[index]
    )
  );
  const [uniqueRecommendationOverall, ...uniqueRecommendationComments] = unique(
    "jeongsiRecommendation",
    [
      { text: recommendationOverall },
      ...recommendationComments.map((text, index) => {
        const entry = recommendationEntries[index];
        return {
          text,
          rule: {
            ...TEXT_RULE.recommendationComment,
            requiredAnyOf: chanceMeaningsOf(entry.chance),
          },
          alternatives: [
            chanceAlternatives(entry.percentileGap, entry.chance, [
              `${entry.group}군 ${entry.tier} 원서로`,
              `${entry.quota}명을 뽑는 모집단위로`,
            ]),
          ],
        };
      }),
    ]
  );

  const combinationStrategies = combinationItems.map((item, index) => {
    // 이 조합에만 있는 칸이 없으면 가장 비슷한 조합과 다른 칸을 코드가 짚는다
    const noDistinctSlot =
      findDistinctSlots(item, combinationItems).length === 0;
    const difference = distinctCombinations[index]
      ? composeFullyDistinctSentence(item.label, item.slots.length)
      : noDistinctSlot
        ? (composeOverlapSentence(item, combinationItems) ??
          combinationDifferences[differenceIndexes.indexOf(index)])
        : combinationDifferences[differenceIndexes.indexOf(index)];
    return composeCombinationStrategy(item.label, difference);
  });
  const [uniqueCombinationOverall, ...uniqueCombinationStrategies] = unique(
    "jeongsiCombination",
    [
      { text: combinationOverall },
      ...combinationStrategies.map((text) => ({ text })),
    ]
  );

  const detailFactPools = listDetailFacts(
    flattened.map(({ evaluation }) => evaluation),
    detailItems.map((item) => item.ratioSummary),
    studentContext
  );
  // 추천 이유 = 반영방식 판정 + 격차·합격 가능성 + 원서 운용 조언(컨설턴트 관점)
  const detailAdvice = composeDetailAdvice(detailItems);
  const detailReasons = unique(
    "jeongsiUniversityDetail",
    detailItems.map((_item, index) => {
      const { percentileGap } = detailPromptItems[index];
      return {
        text: `${detailSentences[index]} ${composeChanceSentence(
          percentileGap,
          detailMeanings[index]
        )} ${detailAdvice[index]}`,
        rule: TEXT_RULE.detailReason,
        alternatives: [
          detailFactPools[index].flatMap((fact) =>
            [
              composeDetailFallback(fact),
              ...(fact.alternate ? [fact.alternate.sentence] : []),
            ].filter((sentence) => sentence.length <= DETAIL_SENTENCE_MAX_CHARS)
          ),
          // 격차가 같은 대학이 셋 이상이면 표현 두 가지로 모자라 문장이
          // 지워졌다(실측: +2.8 세 곳). 모집군·모집인원 머리말로 표현을 더 둔다.
          chanceAlternatives(percentileGap, detailItems[index].chance, [
            `${detailItems[index].group}군 ${detailItems[index].tier} 원서로`,
            `${detailItems[index].quota}명을 뽑는 모집단위로`,
          ]),
        ],
      };
    })
  );

  const scoreSection: JeongsiScoreAnalysisSection = {
    sectionId: "jeongsiScoreAnalysis",
    title: SECTION_TITLE.jeongsiScoreAnalysis,
    rows,
    averagePercentile: analysis.diagnosis.averagePercentile,
    totalStandardScore: analysis.diagnosis.totalStandardScore,
    strengthAreas: analysis.diagnosis.strengths,
    weaknessAreas: analysis.diagnosis.weaknesses,
    overallComment: uniqueScoreOverall,
    strengthComment: uniqueScoreStrength,
    weaknessComment: uniqueScoreWeakness,
  };

  const matchSection: JeongsiUniversityMatchSection = {
    sectionId: "jeongsiUniversityMatch",
    title: SECTION_TITLE.jeongsiUniversityMatch,
    // 근거 두 문장 뒤에 컨설턴트 판단 문장을 코드가 붙인다(composeMatchVerdicts)
    items: advantageItems.map(({ appliedRatioSummary, ...item }, index) => ({
      ...item,
      reason: `${uniqueMatchReasons[index]} ${matchVerdicts[index]}`,
    })),
    overallComment: uniqueMatchOverall,
  };

  const recommendationItems: RecommendationItem[] = recommendationEntries.map(
    (entry, index) => {
      // tier 는 그룹 키로, percentileGap 은 프롬프트 전용 척도로만 쓴다.
      const {
        tier: _tier,
        percentileGap: _percentileGap,
        cutTrend: _cutTrend,
        substitutedFrom: _substitutedFrom,
        ...rest
      } = entry;
      return { ...rest, comment: uniqueRecommendationComments[index] };
    }
  );

  const recommendationSection: JeongsiRecommendationSection = {
    sectionId: "jeongsiRecommendation",
    title: SECTION_TITLE.jeongsiRecommendation,
    groups: RECOMMENDATION_TIER_ORDER.map((tier) => ({
      tier,
      items: recommendationItems.filter(
        (_item, index) => recommendationEntries[index].tier === tier
      ),
    })),
    overallComment: uniqueRecommendationOverall,
    notices,
  };

  const combinationSection: JeongsiCombinationSection = {
    sectionId: "jeongsiCombination",
    title: SECTION_TITLE.jeongsiCombination,
    risk: preference.risk,
    combinations: combinationItems.map((item, index) => ({
      ...item,
      strategy: uniqueCombinationStrategies[index],
    })),
    overallComment: uniqueCombinationOverall,
  };

  // PART 5 추천 이유: AI 가 쓴 1문장 + 코드가 쓴 격차·합격 가능성 문장
  const detailSection: JeongsiUniversityDetailSection = {
    sectionId: "jeongsiUniversityDetail",
    title: SECTION_TITLE.jeongsiUniversityDetail,
    items: detailItems.map((item, index) => ({
      ...item,
      reason: detailReasons[index],
    })),
  };

  const sectionById: Record<JeongsiSectionId, JeongsiSection> = {
    jeongsiScoreAnalysis: scoreSection,
    jeongsiUniversityMatch: matchSection,
    jeongsiRecommendation: recommendationSection,
    jeongsiCombination: combinationSection,
    jeongsiUniversityDetail: detailSection,
  };

  return {
    meta: {
      reportId,
      input: analysis.input,
      createdAt: options.createdAt ?? new Date().toISOString(),
      version: JEONGSI_REPORT_VERSION,
    },
    sections: JEONGSI_SECTION_ORDER.map((sectionId) => sectionById[sectionId]),
  };
};

/** 캐시 없이 정시 리포트용 Gemini 클라이언트를 만들 때 쓰는 공통 프롬프트 */
export { JEONGSI_COMMON_SYSTEM_PROMPT };
