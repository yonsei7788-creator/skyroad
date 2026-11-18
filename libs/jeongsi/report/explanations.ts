// ============================================================
// 모집단위 판정 설명 (PART 5) — 학생이 리포트를 읽다 묻게 되는 질문에 답한다.
//
//   - 왜 이 구분인가: 기준컷을 어떻게 만들었고, 내 점수가 어느 구간에 드는지
//   - 전년도 컷보다 높은데 왜 상향인가: 한 해 컷이 아니라 기준컷과 실측 비율로 판정한다
//   - 어떤 성적이 유리하고 불리했나: 영어 등급 손실, 강점·약점 영역 반영비율
//   - 판정이 바뀌는 조건: 2027 컷이 얼마나 움직이면 70%컷 위아래가 바뀌는지, 이 학과의 실제 컷 변동 폭
//   - 합격선을 움직일 변수: 소수 모집, 모집인원 변화, 최종 모집인원, 경쟁률·충원율, 반영방식 변경, 모집군 변경
//   - 희망 학과와 다른 분류인 곳: 왜 담았고 무엇을 판정에 넣지 않았는지
//
// 모든 문장은 엔진 값과 원문 값으로 코드가 쓴다. 모델은 관여하지 않는다(CONTEXT §1.1).
// 확률을 새로 만들지 않고, 실측 비율은 cut-movement·classify 의 실측 상수만 인용한다.
// ============================================================

import {
  FIT_SAME_CATEGORY,
  RECOMMENDATION_SIZE,
  SNIPING_SIZE,
} from "../engine/analyze.ts";
import {
  COMPETITION_SIGNAL_PASS_RATES,
  COMPETITION_SURGE_RATIO,
  FILL_RATE_SIGNAL,
  FINAL_QUOTA_SIGNAL_PASS_RATES,
  FINAL_QUOTA_SIGNAL_RATIO,
  GAP_BANDS,
  RESULT_YEAR_WEIGHTS,
  SMALL_QUOTA_MAX,
  SMALL_QUOTA_SAFE_PASS_RATES,
  SNIPING_MIN_GAP,
  isSmallQuota,
  tierForGap,
} from "../engine/classify.ts";
import { calcEnglishLoss, resolveAreaRatios } from "../engine/convert-score.ts";
import type {
  NotComparedGroup,
  NotListedRow,
  UnitExplanation,
} from "../report-types.ts";
import type {
  AdmissionTier,
  JeongsiAnalysis,
  NotComparedEntry,
  NotComparedReason,
  NotListedEntry,
  PlanEvaluation,
  ScoreArea,
} from "../types.ts";

import { describePastGroups, describeSafeCapReasons } from "./safe-cap.ts";
import { buildScoreBreakdown, computeAreaEffects } from "./score-effects.ts";
import type { AreaEffect } from "./score-effects.ts";

type ExplainedTier = Exclude<AdmissionTier, "지원불가">;

const TIER_RANK: Record<ExplainedTier, number> = {
  소신: 0,
  상향: 1,
  적정: 2,
  안정: 3,
};

const AREA_LABEL: Record<Exclude<ScoreArea, "english">, string> = {
  korean: "국어",
  math: "수학",
  inquiry: "탐구",
};

const fmt = (value: number): string => (Math.round(value * 10) / 10).toFixed(1);

const signed = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toFixed(1)}`;
};

const percent = (rate: number): string => `${Math.round(rate * 100)}%`;

/** 부호 있는 판정 격차(만점 대비 %). 0.1 미만은 둘째 자리까지 써서 "±0.0"을 피한다 */
const signedGap = (gap: number): string => {
  const size = Math.abs(gap);
  if (size > 0 && size < 0.1) {
    const rounded = Math.round(gap * 100) / 100;
    if (rounded !== 0) {
      return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(2)}`;
    }
  }
  return signed(gap);
};

/** 소수 첫째 자리까지, 끝의 .0 은 뗀다 (비율, 백분위, 인원) */
const fmtTrim = (value: number): string => String(Math.round(value * 10) / 10);

const bandRange = (tier: ExplainedTier): string => {
  if (tier === "안정") {
    return `만점 대비 ${signed(GAP_BANDS.안정하한)}% 이상 ${signed(GAP_BANDS.안정상한)}% 이하`;
  }
  if (tier === "적정") {
    return `만점 대비 ${signed(GAP_BANDS.적정하한)}% 이상 ${signed(GAP_BANDS.안정하한)}% 미만`;
  }
  if (tier === "상향") {
    return `만점 대비 ${signed(GAP_BANDS.상향하한)}% 이상 ${signed(GAP_BANDS.적정하한)}% 미만`;
  }
  return `만점 대비 ${signed(SNIPING_MIN_GAP)}% 이상 ${signed(GAP_BANDS.상향하한)}% 미만`;
};

/** 안정 제한 사유를 지킨 구분 (엔진 classifyPlan 과 같은 규칙) */
const cappedTierForGap = (
  gap: number,
  evaluation: PlanEvaluation
): AdmissionTier => {
  const tier = tierForGap(gap);
  return tier === "안정" && evaluation.safeCapReasons.length > 0
    ? "적정"
    : tier;
};

const isExplainedTier = (tier: AdmissionTier): tier is ExplainedTier =>
  tier !== "지원불가";

// ─── 왜 이 구분인가 ───

/** 기준컷을 만든 방법 (원문 컷, 학년도 비중, 모집인원 보정) */
const describeReferenceCut = (evaluation: PlanEvaluation): string | null => {
  const ref = evaluation.referenceCut?.value;
  if (ref === undefined) return null;
  const cuts = evaluation.cutHistory
    .filter(
      (entry): entry is { year: 2025 | 2026; cut: number } =>
        evaluation.resultYears.includes(entry.year as 2025 | 2026) &&
        entry.cut !== null
    )
    .sort((a, b) => a.year - b.year);
  if (cuts.length === 0) return null;
  const base =
    cuts.length >= 2
      ? `${cuts[0].year} 70%컷 ${fmt(cuts[0].cut)}점과 ${cuts[1].year} 70%컷 ${fmt(cuts[1].cut)}점을 ${RESULT_YEAR_WEIGHTS[cuts[0].year] * 10}:${RESULT_YEAR_WEIGHTS[cuts[1].year] * 10} 비중으로 묶은 값`
      : `${cuts[0].year} 70%컷 ${fmt(cuts[0].cut)}점`;
  const adjustment = evaluation.quotaChange?.cutAdjustment ?? 0;
  const adjusted =
    Math.abs(adjustment) >= 0.05
      ? `${base}에 2027 모집인원 변화를 반영해 ${signed(adjustment)}점 보정한 값`
      : base;
  return `기준컷 ${fmt(ref)}점은 ${adjusted}입니다.`;
};

/** 구간 판정 문장 */
const describeBand = (evaluation: PlanEvaluation): string | null => {
  const gap = evaluation.gapRatio;
  const points = evaluation.gapPoints;
  if (gap === null || points === null || !isExplainedTier(evaluation.tier)) {
    return null;
  }
  const position =
    Math.round(points * 10) === 0
      ? "기준컷과 같은 수준으로"
      : `기준컷보다 ${fmt(Math.abs(points))}점 ${points > 0 ? "높아" : "낮아"}`;
  const head = `내 환산점수 ${fmt(evaluation.convertedScore)}점은 ${position}, 만점 대비 ${signedGap(gap)}%입니다.`;
  if (evaluation.safeCapped) {
    const reason = describeSafeCapReasons(evaluation);
    return `${head} 격차만 보면 안정 구간(${bandRange("안정")})이지만, ${reason}이라 적정으로 판정했습니다.`;
  }
  return `${head} ${evaluation.tier} 구간(${bandRange(evaluation.tier)})에 듭니다.`;
};

/** 실측 비율 문장. 기준컷보다 높은데 상향인 곳은 그 이유를 먼저 밝힌다 */
const describeMeasuredRate = (evaluation: PlanEvaluation): string | null => {
  const rate = evaluation.historicalPassRate;
  if (rate === null || rate === undefined) return null;
  const scope =
    evaluation.historicalPassRateScope === "smallQuota"
      ? ` 모집인원 ${SMALL_QUOTA_MAX}명 이하 모집단위끼리 잰 값입니다.`
      : "";
  const measured = `2025 기준컷 대비 같은 여유였던 모집단위가 2026 70%컷을 넘은 비율은 ${percent(rate)}였습니다.${scope}`;
  if (evaluation.tier === "상향" && (evaluation.gapPoints ?? 0) > 0) {
    return `기준컷보다 높아도 상향인 것은 컷이 해마다 움직이기 때문입니다. ${measured}`;
  }
  return measured;
};

/** 가장 최근 학년도 70%컷과 견준 위치. 한 해 컷과 판정이 엇갈려 보일 때 그 이유를 쓴다 */
const describeLatestCut = (evaluation: PlanEvaluation): string | null => {
  const latest = evaluation.latestAdmitCuts;
  const ref = evaluation.referenceCut?.value;
  if (!latest || ref === undefined) return null;
  const diff = evaluation.convertedScore - latest.cut70;
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) return null;
  const lowTier = evaluation.tier === "상향" || evaluation.tier === "소신";
  if (rounded > 0 && lowTier) {
    return `${latest.year} 70%컷 ${fmt(latest.cut70)}점보다는 ${fmt(diff)}점 높지만, 판정은 한 해 컷이 아니라 위 기준컷과 실측 비율로 합니다.`;
  }
  if (rounded < 0 && !lowTier) {
    return `${latest.year} 70%컷 ${fmt(latest.cut70)}점만 보면 ${fmt(Math.abs(diff))}점 낮습니다. 기준컷은 ${latest.year} 컷보다 ${fmt(Math.abs(latest.cut70 - ref))}점 낮은데, 이전 학년도 컷을 함께 보기 때문입니다.`;
  }
  return null;
};

// ─── 유리·불리 요인 ───

/** 영어 등급 손실. 손실을 뺐을 때 구분이 올라가면 그 사실을 붙인다 */
const describeEnglishFactor = (
  evaluation: PlanEvaluation,
  analysis: JeongsiAnalysis
): UnitExplanation["factors"][number] | null => {
  const { score } = analysis.input;
  const { grade } = score.english;
  if (grade === 1) return null;
  const { formula } = evaluation.plan;
  const lossPercent = calcEnglishLoss(
    formula,
    grade,
    resolveAreaRatios(score, formula).english
  );
  if (lossPercent <= 0.0005) {
    return {
      effect: "유리",
      text: `영어 ${grade}등급이어도 1등급과 같은 점수를 받아 영어에서 잃는 점수가 없습니다.`,
      points: 0,
    };
  }
  const lossPoints = (lossPercent * formula.totalScore) / 100;
  const text = `영어 ${grade}등급이라 1등급보다 환산점수 ${fmt(lossPoints)}점(만점 대비 ${fmt(lossPercent)}%) 덜 받습니다.`;
  const gap = evaluation.gapRatio;
  if (gap === null || !isExplainedTier(evaluation.tier)) {
    return { effect: "불리", text, points: lossPoints };
  }
  const without = cappedTierForGap(gap + lossPercent, evaluation);
  const flips =
    isExplainedTier(without) && TIER_RANK[without] > TIER_RANK[evaluation.tier];
  return {
    effect: "불리",
    text: flips ? `${text} 이 차이가 없었다면 ${without} 구간입니다.` : text,
    points: lossPoints,
  };
};

/**
 * 반영비율 때문에 이 대학에서 더 받거나 덜 받는 실제 점수 (specs/014 D1: 영역 강점·약점 서술은
 * PART 1 에만 두고, 다른 파트는 대학 환산식을 적용한 점수로 말한다). 득실이 가장 큰 영역과
 * 가장 작은 영역만 쓰고, 그 점수가 없었다면 구분이 바뀌는지 붙인다.
 */
const describeAreaEffectFactors = (
  evaluation: PlanEvaluation,
  analysis: JeongsiAnalysis
): UnitExplanation["factors"] => {
  const breakdown = buildScoreBreakdown(evaluation, analysis.input.score);
  const effects = computeAreaEffects(breakdown).filter(
    (effect) => Math.abs(effect.percent) >= MEANINGFUL_EFFECT_PERCENT
  );
  const sorted = [...effects].sort((a, b) => b.points - a.points);
  const gain = sorted.find((effect) => effect.points > 0);
  const loss = [...sorted].reverse().find((effect) => effect.points < 0);
  const gap = evaluation.gapRatio;
  const flipText = (shifted: number, kind: "점수" | "차이"): string => {
    if (gap === null || !isExplainedTier(evaluation.tier)) return "";
    const tier = cappedTierForGap(shifted, evaluation);
    if (!isExplainedTier(tier) || tier === evaluation.tier) return "";
    return ` 이 ${kind}가 없었다면 ${tier} 구간입니다.`;
  };
  const label = (effect: AreaEffect): string =>
    `${AREA_LABEL[effect.area as Exclude<ScoreArea, "english">]} ${fmtTrim(effect.ratio)}% 반영`;
  const factors: UnitExplanation["factors"] = [];
  if (gain) {
    factors.push({
      effect: "유리",
      text: `국어, 수학, 탐구 성적이 모두 같았을 때와 견주면 ${label(gain)}으로 환산점수 ${fmt(gain.points)}점(만점 대비 ${fmt(gain.percent)}%)을 더 받습니다.${flipText((gap ?? 0) - gain.percent, "점수")}`,
      points: gain.points,
    });
  }
  if (loss) {
    factors.push({
      effect: "불리",
      text: `${label(loss)}으로 환산점수 ${fmt(Math.abs(loss.points))}점(만점 대비 ${fmt(Math.abs(loss.percent))}%)을 덜 받습니다.${flipText((gap ?? 0) + Math.abs(loss.percent), "차이")}`,
      points: Math.abs(loss.points),
    });
  }
  return factors;
};

/** 만점 대비 이 비율(%) 미만의 영역 득실은 다루지 않는다 (score-effects 와 같은 기준) */
const MEANINGFUL_EFFECT_PERCENT = 0.1;

// ─── 판정이 바뀌는 조건 ───

const describeConditions = (evaluation: PlanEvaluation): string[] => {
  const points = evaluation.gapPoints;
  if (points === null) return [];
  const conditions: string[] = [
    points >= 0
      ? `2027 70%컷이 기준컷보다 ${fmt(points)}점 넘게 오르지 않으면 내 환산점수가 70%컷 위에 있습니다.`
      : `내 환산점수가 2027 70%컷에 닿으려면 컷이 기준컷보다 ${fmt(Math.abs(points))}점 이상 내려가야 합니다.`,
  ];
  const cutOf = (year: 2025 | 2026): number | null =>
    evaluation.cutHistory.find((entry) => entry.year === year)?.cut ?? null;
  const from = cutOf(2025);
  const to = cutOf(2026);
  const bothUsed =
    evaluation.resultYears.includes(2025) &&
    evaluation.resultYears.includes(2026);
  if (from !== null && to !== null && bothUsed) {
    const swing = to - from;
    const size = Math.abs(swing);
    conditions.push(
      `이 모집단위의 70%컷은 2025 ${fmt(from)}점에서 2026 ${fmt(to)}점으로 ${signed(swing)}점 움직였습니다.`
    );
    if (points >= 0) {
      conditions.push(
        size > points
          ? `같은 폭(${fmt(size)}점)만큼 오르면 70%컷이 내 점수를 넘어서는 폭이라, 컷 변동에 따라 판정이 달라질 수 있습니다.`
          : `같은 폭(${fmt(size)}점)만큼 올라도 내 점수가 70%컷 위에 남는 여유입니다.`
      );
    } else {
      conditions.push(
        size >= Math.abs(points)
          ? `같은 폭(${fmt(size)}점)만큼 내려가면 70%컷에 닿는 폭입니다.`
          : `같은 폭(${fmt(size)}점)만큼 내려가도 70%컷에는 닿지 않습니다.`
      );
    }
    return conditions;
  }
  const missing = ([2025, 2026] as const).find(
    (year) => !evaluation.resultYears.includes(year)
  );
  if (missing) {
    const why = evaluation.plan.formulaChangedYears?.includes(missing)
      ? `비교할 ${missing} 입결이 없어(아래 반영방식 변경)`
      : `${missing} 70%컷이 같은 기준으로 공개되지 않아`;
    conditions.push(`${why}, 이 모집단위의 컷 변동 폭은 견줄 수 없습니다.`);
  }
  return conditions;
};

// ─── 합격선을 움직일 변수 ───

const describeVariables = (evaluation: PlanEvaluation): string[] => {
  const { plan } = evaluation;
  const variables: string[] = [];

  if (isSmallQuota(plan.quota)) {
    variables.push(
      `모집인원 ${plan.quota}명: ${SMALL_QUOTA_MAX}명 이하 모집단위는 다음 해 컷이 더 크게 움직였습니다. 안정 하한 격차에서 다음 해 컷을 넘은 비율이 ${percent(SMALL_QUOTA_SAFE_PASS_RATES.smallQuota)}로, 6명 이상(${percent(SMALL_QUOTA_SAFE_PASS_RATES.others)})보다 낮았습니다.`
    );
  }

  const quota = evaluation.quotaChange;
  if (quota && Math.abs(quota.cutAdjustment) >= 0.05) {
    const more = quota.currentQuota > quota.pastAverageQuota;
    variables.push(
      `2027 모집인원 ${quota.currentQuota}명은 입결 학년도 평균 ${fmtTrim(quota.pastAverageQuota)}명보다 ${more ? "많아" : "적어"}, 기준컷을 ${fmt(Math.abs(quota.cutAdjustment))}점 ${more ? "낮춰" : "높여"} 잡았습니다.`
    );
  }

  const final = evaluation.finalQuotaChange;
  if (final) {
    const head = `2027 최종 모집인원(수시 이월 반영)은 ${final.finalQuota}명으로 ${final.previousYear} ${final.previousQuota}명 대비 ${signed(final.ratio * 100)}%입니다.`;
    variables.push(
      final.ratio >= FINAL_QUOTA_SIGNAL_RATIO
        ? `${head} 최종 모집인원이 ${percent(FINAL_QUOTA_SIGNAL_RATIO)} 넘게 늘어난 곳은 기준컷보다 만점 대비 ${fmt(Math.abs(FINAL_QUOTA_SIGNAL_PASS_RATES.gap))}% 낮은 학생도 다음 해 컷을 넘은 비율이 ${percent(FINAL_QUOTA_SIGNAL_PASS_RATES.withSignal)}(그 밖은 ${percent(FINAL_QUOTA_SIGNAL_PASS_RATES.withoutSignal)})였습니다.`
        : head
    );
  }

  const competitions = plan.recentCompetitions ?? [];
  const previous = competitions.find((entry) => entry.year === 2025);
  const latest = competitions.find((entry) => entry.year === 2026);
  if (latest?.competitionRate !== undefined) {
    const fill =
      latest.additionalPassRate !== undefined
        ? `, 2026 충원율 ${fmtTrim(latest.additionalPassRate)}%`
        : "";
    const rates =
      previous?.competitionRate !== undefined
        ? `경쟁률은 2025 ${fmtTrim(previous.competitionRate)}대 1, 2026 ${fmtTrim(latest.competitionRate)}대 1${fill}입니다.`
        : `경쟁률은 2026 ${fmtTrim(latest.competitionRate)}대 1${fill}입니다.`;
    const surged =
      previous?.competitionRate !== undefined &&
      previous.competitionRate > 0 &&
      latest.competitionRate / previous.competitionRate >=
        COMPETITION_SURGE_RATIO;
    if (surged) {
      const withFill =
        latest.additionalPassRate !== undefined &&
        latest.additionalPassRate >= FILL_RATE_SIGNAL;
      const rate = withFill
        ? COMPETITION_SIGNAL_PASS_RATES.surgeWithFill
        : COMPETITION_SIGNAL_PASS_RATES.surgeOnly;
      variables.push(
        `${rates} 경쟁률이 ${percent(COMPETITION_SURGE_RATIO - 1)} 넘게 오른${withFill ? ` 데다 충원율이 ${FILL_RATE_SIGNAL}% 이상인` : ""} 곳은 다음 해 기준컷보다 만점 대비 ${fmt(Math.abs(COMPETITION_SIGNAL_PASS_RATES.gap))}% 낮은 학생이 컷을 넘은 비율이 ${percent(rate)}로, 그 밖(${percent(COMPETITION_SIGNAL_PASS_RATES.others)})보다 높았습니다.`
      );
    } else {
      variables.push(rates);
    }
  }

  const changed = plan.formulaChangedYears ?? [];
  if (changed.length > 0) {
    variables.push(
      `2027 반영방식이 ${changed.join(", ")} 학년도와 달라, 그해 입결은 기준컷에 쓰지 않았습니다.`
    );
  }

  const regrouped = describePastGroups(evaluation.pastGroups);
  if (regrouped) {
    variables.push(
      `${regrouped}입니다. 군이 바뀌면 함께 지원하는 대학이 달라져 합격선도 달라질 수 있습니다.`
    );
  }

  if (plan.suneungWeight) {
    const note = plan.selectionNote ? `(${plan.selectionNote})` : "";
    variables.push(
      `수능 ${plan.suneungWeight}% 전형${note}이라, 이 판정은 수능 성적만으로 본 위치입니다.`
    );
  }
  return variables;
};

// ─── 희망 학과와 다른 분류 ───

export interface FitContext {
  /** 희망 학과 표기 (예: "컴퓨터공학") */
  targetLabel: string;
  /** 넓혀 담은 계열 이름 (예: "컴퓨터와 IT 계열"). 없으면 null */
  fieldLabel: string | null;
  /** 모집단위의 희망 학과 적합도 */
  fit: number;
}

const describeFit = (
  evaluation: PlanEvaluation,
  context: FitContext
): string | undefined => {
  if (context.fit >= FIT_SAME_CATEGORY) return undefined;
  const scope = context.fieldLabel ?? "같은 계열";
  return `희망 학과(${context.targetLabel})와 다른 분류인 ${evaluation.plan.category}입니다. 같은 분류만으로 상향, 적정, 안정 목록을 채우지 못해 ${scope}까지 넓혀 담았습니다. 이 학과의 교육과정과 입학 후 전공 선택 제도는 원문 자료에 없어 판정에 넣지 않았으니, 지원 전에 대학의 학과 안내에서 확인하세요.`;
};

// ─── 조립 ───

/** 유리·불리 요인 (반영비율, 영어 등급). PART 4 원서별 이유도 같은 판정을 쓴다 */
export const composeFactors = (
  evaluation: PlanEvaluation,
  analysis: JeongsiAnalysis
): UnitExplanation["factors"] => {
  const english = describeEnglishFactor(evaluation, analysis);
  return [
    ...describeAreaEffectFactors(evaluation, analysis),
    ...(english ? [english] : []),
  ];
};

export const composeUnitExplanation = (
  evaluation: PlanEvaluation,
  analysis: JeongsiAnalysis,
  fitContext: FitContext
): UnitExplanation => {
  const tierReason = [
    describeReferenceCut(evaluation),
    describeBand(evaluation),
    describeMeasuredRate(evaluation),
    describeLatestCut(evaluation),
  ].filter((sentence): sentence is string => sentence !== null);
  const factors = composeFactors(evaluation, analysis);
  const fitNote = describeFit(evaluation, fitContext);
  return {
    tierReason,
    factors,
    conditions: describeConditions(evaluation),
    variables: describeVariables(evaluation),
    ...(fitNote ? { fitNote } : {}),
  };
};

// ─── 목록에 넣지 않은 곳, 비교하지 못한 곳 (PART 3) ───

/** 사유마다 이름을 싣는 최대 수 */
export const NOT_COMPARED_NAMES_PER_REASON = 12;

/** 구분 목록에서 먼저 고르는 기준 (analyze.ts closenessInTier 와 같은 규칙) */
const TIER_PICK_RULE: Record<"상향" | "적정" | "안정", string> = {
  상향: "적정 구간에 더 가까운",
  적정: "적정 구간 가운데에 더 가까운",
  안정: "안정 하한에 더 가까운",
};

/** "기준컷보다 만점 대비 2.1% 높은" (수식어) */
const gapAdjective = (gap: number | null): string => {
  if (gap === null) return "기준컷과 견준";
  const size = signedGap(gap).replace(/^[+−±]/, "");
  return gap >= 0
    ? `기준컷보다 만점 대비 ${size}% 높은`
    : `기준컷보다 만점 대비 ${size}% 낮은`;
};

/** 목록에 넣지 않은 이유 한 문장 */
export const describeNotListedReason = (entry: NotListedEntry): string => {
  const position = gapAdjective(entry.gapRatio);
  switch (entry.reason) {
    case "ineligible":
      return entry.ineligibleReason ?? "응시 과목 조건으로 지원할 수 없습니다.";
    case "belowRange":
      return `${position} 곳으로, 소신 구간(${signed(SNIPING_MIN_GAP)}% 이상)보다 아래라 넣지 않았습니다.`;
    case "aboveRange":
      return `${position} 곳으로, 안정 상한(${signed(GAP_BANDS.안정상한)}%)보다 여유가 커 성적보다 크게 낮은 곳이라 넣지 않았습니다.`;
    case "snipingRegrouped":
      return `${position} 소신 구간이지만, 과거 입결의 모집군이 2027과 달라 실측 비율을 붙일 수 없어 소신 후보로 담지 않았습니다.`;
    case "snipingSameUniversity":
      return `${position} 소신 구간이지만, 같은 대학의 다른 모집단위가 소신 후보에 있어 대학당 한 곳만 담았습니다.`;
    case "snipingListFull":
      return `${position} 소신 구간이지만, 소신 후보는 ${SNIPING_SIZE}곳까지 담아 먼저 고른 곳이 있었습니다.`;
    case "sameUniversityListed":
      return `${position} ${entry.tier} 구간이지만, 같은 대학의 다른 모집단위가 ${entry.tier} 목록에 있어 대학당 한 곳만 담았습니다.`;
    case "tierListFull": {
      const rule =
        entry.tier === "상향" || entry.tier === "적정" || entry.tier === "안정"
          ? TIER_PICK_RULE[entry.tier]
          : "구간 안 위치가 더 맞는";
      return `${position} ${entry.tier} 구간이지만, ${entry.tier} 목록은 ${RECOMMENDATION_SIZE}곳까지 담고 희망 학과에 더 가까운 곳, ${rule} 곳을 먼저 골라 들지 않았습니다.`;
    }
  }
};

export const composeNotListedRows = (
  entries: NotListedEntry[]
): NotListedRow[] =>
  entries.map((entry) => ({
    university: entry.university,
    department: entry.department,
    group: entry.group,
    reason: describeNotListedReason(entry),
  }));

const NOT_COMPARED_REASON_TEXT: Record<NotComparedReason, string> = {
  newUnit: "2027 신설 모집단위라 비교할 입결이 없습니다.",
  maxScoreUnpublished:
    "환산에 필요한 최고점이나 환산 만점이 원문에 없어 내 환산점수를 만들지 않았습니다.",
  formulaUnsupported:
    "대학 환산식에 원문 자료만으로 정확히 계산할 수 없는 규칙이 있어 내 환산점수를 만들지 않았습니다.",
  noComparableResults:
    "공개 입결이 대학 환산점수가 아니거나 2027 환산식과 같은 기준으로 맞출 수 없어, 같은 기준으로 비교하지 않았습니다.",
  noPublicResults: "공개된 입결이 없어 비교할 기준컷이 없습니다.",
  suneungWeightLow:
    "전형 총점에서 수능 비율이 80% 미만이라 수능 성적만으로 위치를 판정하지 않았습니다.",
  quotaUnpublished: "2027 모집인원이 원문에 없거나 0명입니다.",
};

/** 반영방식이 바뀌어 같은 기준 입결이 없는 곳은 따로 밝힌다 */
const FORMULA_CHANGED_TEXT =
  "2027 반영방식이 바뀌어, 이전 학년도 환산점수 입결을 같은 기준으로 쓸 수 없습니다.";

const NOT_COMPARED_ORDER: string[] = [
  NOT_COMPARED_REASON_TEXT.newUnit,
  FORMULA_CHANGED_TEXT,
  NOT_COMPARED_REASON_TEXT.maxScoreUnpublished,
  NOT_COMPARED_REASON_TEXT.formulaUnsupported,
  NOT_COMPARED_REASON_TEXT.noComparableResults,
  NOT_COMPARED_REASON_TEXT.noPublicResults,
  NOT_COMPARED_REASON_TEXT.suneungWeightLow,
  NOT_COMPARED_REASON_TEXT.quotaUnpublished,
];

/** "대학 학과(군)" 표기 */
export const formatNotComparedUnit = (entry: NotComparedEntry): string =>
  `${entry.university} ${entry.department}(${entry.group}군)`;

export const composeNotComparedGroups = (
  entries: NotComparedEntry[]
): NotComparedGroup[] => {
  const byReason = new Map<string, string[]>();
  for (const entry of entries) {
    const reason =
      entry.reason === "noComparableResults" &&
      (entry.formulaChangedYears?.length ?? 0) > 0
        ? FORMULA_CHANGED_TEXT
        : NOT_COMPARED_REASON_TEXT[entry.reason];
    const units = byReason.get(reason) ?? [];
    const label = formatNotComparedUnit(entry);
    if (!units.includes(label)) units.push(label);
    byReason.set(reason, units);
  }
  return [...byReason.entries()]
    .sort(
      ([a], [b]) =>
        NOT_COMPARED_ORDER.indexOf(a) - NOT_COMPARED_ORDER.indexOf(b)
    )
    .map(([reason, units]) => ({
      reason,
      units: units.slice(0, NOT_COMPARED_NAMES_PER_REASON),
      ...(units.length > NOT_COMPARED_NAMES_PER_REASON
        ? { moreCount: units.length - NOT_COMPARED_NAMES_PER_REASON }
        : {}),
    }));
};
