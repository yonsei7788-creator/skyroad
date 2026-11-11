// ============================================================
// 반영방식 유리도 (advantageScore, 0~100)
//
// "이 대학의 반영방식이 내 성적 구조에 유리한가" 만 측정한다.
// 🔴 합격 가능성(tier·chance)은 섞지 않는다. 섞으면 PART 2 가
//    PART 3 의 중복이 된다. 지원불가·부적격은 목록 필터로만 제외.
//
// 산출식 (specs/013-jeongsi-domain-rules.md §5):
//   base = 50 + 50 × (Σ(dev_k × rdev_k) / scale)
//     k      = 국어·수학·탐구 (영어는 원문에 백분위가 없어 뺀다 — 2026-11-05)
//     dev_k  = 영역 백분위 − 국·수·탐 평균     (Σdev = 0)
//     rdev_k = 반영비율 / 국·수·탐 비율 합 − 1/3 (균등 배분 기준)
//     scale  = max(|max dev|, |min dev|, 0.5)
//   → 균등 반영 대학은 정확히 50점, raw/scale ∈ [-1, +1]
//   advantageScore = clamp(round(base + Σ보정), 0, 100)
// ============================================================

import {
  calcEnglishLoss,
  isScienceInquiry,
  resolveAreaRatios,
  resolveAreaShares,
  resolveInquiryUsage,
} from "./convert-score";

import type { JeongsiAdmissionPlan, ScoreArea, SuneungScore } from "../types";

/** 편차가 0일 때의 기준점 (균등 반영 대학) */
export const ADVANTAGE_BASE = 50;

/** 정규화 게인. raw/scale ∈ [-1,+1] 이므로 0~100 전 구간을 쓴다 */
export const ADVANTAGE_GAIN = 50;

/** scale 하한. 전 영역이 균일한 학생은 모든 대학이 50 근처가 맞다 */
export const ADVANTAGE_SCALE_MIN = 0.5;

/** 영어 영향력 보정 범위와 게인 */
export const ENGLISH_ADJ_LIMIT = 10;
export const ENGLISH_ADJ_GAIN = 8;

/** 탐구 1과목 반영 보정 (0 ~ +8). diff 16 백분위점에서 만점 */
export const INQUIRY_COUNT_ADJ_LIMIT = 8;
export const INQUIRY_DIFF_FULL = 16;

/** 변환표준점수 보정 (±4). 백분위 94 를 중심으로 6점 폭 */
export const CONVERTED_ADJ_LIMIT = 4;
export const CONVERTED_ADJ_CENTER = 94;
export const CONVERTED_ADJ_SPAN = 6;

/** 가산점 보정 (±8). 항목별 상한 5 */
export const BONUS_ADJ_LIMIT = 8;
export const BONUS_ITEM_LIMIT = 5;
/** 과탐 가산은 환산점수에 이미 반영되므로 유리도에서는 할인 */
export const BONUS_SCIENCE_FACTOR = 0.6;
/** 가산 대상이 아닌 선택과목의 상대적 불이익 계수 */
export const BONUS_PENALTY_FACTOR = 0.8;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * 학생의 영역별 백분위. 탐구는 대학의 반영 과목 수를 따른다.
 * 영어는 원문에 백분위가 없어 넣지 않는다. 영어의 유리·불리는
 * 등급별 감점·점수표(원문)로 따로 본다(englishAdjustment).
 */
const areaPercentiles = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan
): Record<ScoredArea, number> => {
  const usage = resolveInquiryUsage(score, plan.formula);
  return {
    korean: score.korean.percentile,
    math: score.math.percentile,
    inquiry: usage.percentileAverage,
  };
};

type ScoredArea = Exclude<ScoreArea, "english">;
const AREAS: ScoredArea[] = ["korean", "math", "inquiry"];

/** 기본 점수 — 국·수·탐 편차와 국·수·탐 안 비율 비중의 내적 정규화 */
const calcBase = (score: SuneungScore, plan: JeongsiAdmissionPlan): number => {
  const percentiles = areaPercentiles(score, plan);
  // 상위 영역 선택 대학은 학생의 영역 순위에 따른 실제 비율로 본다.
  // 비중이 원문에 없는 대학(가중치 공시 + 표준점수 반영)은 기준점에 둔다.
  const ratios = resolveAreaShares(score, plan);
  if (!ratios) {
    return ADVANTAGE_BASE;
  }
  const ratioSum = ratios.korean + ratios.math + ratios.inquiry;
  if (ratioSum <= 0) {
    return ADVANTAGE_BASE;
  }
  const evenShare = 1 / AREAS.length;

  const mean =
    AREAS.reduce((total, area) => total + percentiles[area], 0) / AREAS.length;
  const deviations = AREAS.map((area) => percentiles[area] - mean);

  const raw = AREAS.reduce(
    (total, area, index) =>
      total + deviations[index] * (ratios[area] / ratioSum - evenShare),
    0
  );
  const scale = Math.max(
    Math.abs(Math.max(...deviations)),
    Math.abs(Math.min(...deviations)),
    ADVANTAGE_SCALE_MIN
  );

  return ADVANTAGE_BASE + ADVANTAGE_GAIN * (raw / scale);
};

/**
 * 영어 영향력 보정 (±10).
 * 영어 1등급이면 모든 대학의 loss 가 0 이라 보정이 자동으로 꺼진다.
 */
const englishAdjustment = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan,
  averageEnglishLoss: number
): number => {
  const loss = calcEnglishLoss(
    plan.formula,
    score.english.grade,
    resolveAreaRatios(score, plan.formula).english
  );
  return clamp(
    (averageEnglishLoss - loss) * ENGLISH_ADJ_GAIN,
    -ENGLISH_ADJ_LIMIT,
    ENGLISH_ADJ_LIMIT
  );
};

/**
 * 탐구 반영 과목 수 보정 (0 ~ +8).
 * 탐구 편차가 큰 학생에게 1과목 반영은 낮은 과목을 버릴 수 있는 이득.
 */
const inquiryCountAdjustment = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan
): number => {
  if (plan.formula.inquiryCount !== 1) {
    return 0;
  }

  const diff = Math.abs(score.inquiry1.percentile - score.inquiry2.percentile);
  return (
    (Math.min(diff, INQUIRY_DIFF_FULL) / INQUIRY_DIFF_FULL) *
    INQUIRY_COUNT_ADJ_LIMIT
  );
};

/**
 * 변환표준점수 보정 (±4).
 * 변환표는 백분위 상단의 기울기가 커서 탐구 고득점자에게 유리하다.
 */
const convertedStandardAdjustment = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan
): number => {
  if (plan.formula.metric.inquiry !== "convertedStandard") {
    return 0;
  }

  const { percentileAverage } = resolveInquiryUsage(score, plan.formula);
  return clamp(
    ((percentileAverage - CONVERTED_ADJ_CENTER) / CONVERTED_ADJ_SPAN) *
      CONVERTED_ADJ_LIMIT,
    -CONVERTED_ADJ_LIMIT,
    CONVERTED_ADJ_LIMIT
  );
};

/**
 * 가산점 보정 (±8).
 *
 * 가산값에 비례시킨다. flat 보정을 쓰면 가산 보유 대학이 반영비율
 * 신호 전체를 압도해 추천 목록이 가산 보유 대학으로 쏠린다
 * (specs/013 §5.3 — 실측으로 확인된 문제).
 * 가산 대상이 아닌 선택과목 응시자에게는 음의 보정을 준다.
 */
const bonusAdjustment = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan
): number => {
  const { bonus } = plan.formula;
  if (!bonus) {
    return 0;
  }

  let adjustment = 0;

  const mathBonusTable = bonus.mathElective;
  if (mathBonusTable) {
    const myRule = mathBonusTable[score.math.elective];
    if (myRule) {
      adjustment += Math.min(myRule.value, BONUS_ITEM_LIMIT);
    } else {
      // 가산 대상이 아닌 선택과목 → 상대적 불이익
      const offered = Object.values(mathBonusTable)
        .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule))
        .map((rule) => rule.value);
      const best = offered.length > 0 ? Math.max(...offered) : 0;
      adjustment -= Math.min(best * BONUS_PENALTY_FACTOR, BONUS_ITEM_LIMIT);
    }
  }

  const scienceRule = bonus.scienceInquiry;
  if (scienceRule) {
    const usage = resolveInquiryUsage(score, plan.formula);
    const scienceCount = usage.subjects.filter(isScienceInquiry).length;
    if (scienceCount >= (scienceRule.minCount ?? 1)) {
      const multiplier = scienceRule.appliesTo === "each" ? scienceCount : 1;
      adjustment += Math.min(
        scienceRule.value * multiplier * BONUS_SCIENCE_FACTOR,
        BONUS_ITEM_LIMIT
      );
    }
  }

  return clamp(adjustment, -BONUS_ADJ_LIMIT, BONUS_ADJ_LIMIT);
};

/** 유리도 산출에 필요한 후보 집단 통계 */
export interface AdvantageContext {
  /** 후보 대학 전체의 영어 손실 평균 (환산 총점 대비 %) */
  averageEnglishLoss: number;
}

/**
 * 반영방식 유리도 (0~100).
 * 선택과목 제한 위반(eligible=false)이면 호출부가 0 을 넣는다
 * (지원 자체가 불가능한 대학의 유리도는 의미가 없다 — §5.4).
 */
export const calcAdvantageScore = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan,
  context: AdvantageContext
): number => {
  const total =
    calcBase(score, plan) +
    englishAdjustment(score, plan, context.averageEnglishLoss) +
    inquiryCountAdjustment(score, plan) +
    convertedStandardAdjustment(score, plan) +
    bonusAdjustment(score, plan);

  return clamp(Math.round(total), 0, 100);
};
