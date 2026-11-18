// ============================================================
// 정시 분석 오케스트레이션
//
// JeongsiInput → JeongsiAnalysis 단일 진입점.
// 흐름: 데이터 로드 → 성적 진단 → 희망조건 필터 → 모집단위별
// (제한 판정 → 환산 → 민감도 → 입결 분류 → 유리도) → 추천·조합.
// AI 는 이 결과물에 문장만 덧붙인다.
// ============================================================

import {
  DEPARTMENT_CATEGORY_MAP,
  getCategoryForDepartment,
} from "@/libs/report/constants/department-category-map";

import {
  loadAdmissionPlans,
  loadAdmissionResultIndex,
  loadExcludedUnits,
} from "../data";
import { calcAdvantageScore } from "./advantage";
import {
  COMPETITION_SURGE_RATIO,
  FILL_RATE_SIGNAL,
  FINAL_QUOTA_SIGNAL_RATIO,
  GAP_BANDS,
  SNIPING_MIN_GAP,
  classifyPlan,
  isSmallQuota,
} from "./classify";
import {
  addSnipingCombination,
  buildCombinations,
  markRecommendedCombination,
} from "./combination";
import { buildCutMovement, passRateFor } from "./cut-movement";
import {
  calcEnglishLoss,
  calcPercentileByBasis,
  calcSensitivity,
  lacksConvertibleInquiry,
  calcSimpleAveragePercentile,
  calcWeightedPercentile,
  convertScore,
  resolveAreaRatios,
  roundTo3,
} from "./convert-score";
import { diagnoseScore } from "./diagnose";
import {
  checkEligibility,
  excludeOtherTrackSplits,
  excludeWomensUniversities,
  resolveApplicantTrack,
} from "./eligibility";
import {
  expandableCategories,
  findFieldGroup,
  isMedicalCategory,
  matchesNeutralPlanField,
  NEUTRAL_GROUP,
} from "./field-groups";

import type { AdvantageContext } from "./advantage";
import type { CombinationCandidate, RecommendableTier } from "./combination";
import type {
  AdmissionGroup,
  AdmissionTier,
  JeongsiAdmissionPlan,
  JeongsiAnalysis,
  JeongsiInput,
  JeongsiPreference,
  JeongsiResultEntry,
  ExcludedUnit,
  NotComparedEntry,
  NotListedEntry,
  NotListedReason,
  PlanEvaluation,
  StudentGender,
  SuneungScore,
} from "../types";

/** PART 2 에 노출할 유리한 대학 수 */
export const ADVANTAGE_LIST_SIZE = 5;

/**
 * PART 3 구분별 추천 수 (상한). PART 3 목록이 리포트 전체의 대학 목록이다 —
 * 원서 조합(PART 4)·상세(PART 5)·유리한 대학(PART 2)은 이 목록 안에서만 고른다.
 */
export const RECOMMENDATION_SIZE = 4;

/** 스나이핑 후보 수 (specs/014 마지막 피드백) */
export const SNIPING_SIZE = 2;

/** 희망 학과 적합도 점수 */
export const FIT_EXACT = 3;
export const FIT_SAME_CATEGORY = 2;
export const FIT_PARTIAL = 1;
export const FIT_NONE = 0;

/**
 * 근접 대체 거리 상한 (판정 격차 단위).
 * 적정 구간 경계에서 이보다 멀면 적정 칸을 채우려고 끌어오지 않는다.
 */
export const SUBSTITUTE_MAX_DISTANCE = 1.0;

/** 계열그룹 확대 항목의 적합도. 희망 학과 일치 항목보다 항상 낮다 */
export const FIT_FIELD_GROUP = 0.5;

/** 추천 대상 분류 (지원불가 제외) */
const RECOMMENDATION_TIERS: RecommendableTier[] = ["상향", "적정", "안정"];

/** 표준 카테고리로 정규화. 매핑에 없으면 입력값을 그대로 쓴다 */
const toCategory = (name: string): string =>
  getCategoryForDepartment(name) ?? name;

/** 표준 카테고리 집합. 2278개 매핑을 매번 훑지 않도록 1회만 만든다 */
let knownCategories: Set<string> | null = null;

const isKnownCategory = (name: string): boolean => {
  if (!knownCategories) {
    knownCategories = new Set(Object.values(DEPARTMENT_CATEGORY_MAP));
  }
  return knownCategories.has(name);
};

/**
 * 희망 학과·계열 적합도.
 * DEPARTMENT_CATEGORY_MAP 을 읽기 전용으로 재사용해 학과명을 표준
 * 카테고리로 정규화한 뒤 비교한다. 0 이면 분석 대상에서 제외된다.
 */
export const calcDepartmentFit = (
  plan: Pick<JeongsiAdmissionPlan, "department" | "category">,
  preference: Pick<JeongsiPreference, "target" | "targetKind">
): number => {
  const { target, targetKind } = preference;
  const planCategory = plan.category || toCategory(plan.department);

  if (targetKind === "field") {
    if (planCategory === target) {
      return FIT_EXACT;
    }
    if (isKnownCategory(target) && toCategory(plan.department) === target) {
      return FIT_SAME_CATEGORY;
    }
    if (planCategory.includes(target) || plan.department.includes(target)) {
      return FIT_PARTIAL;
    }
    return FIT_NONE;
  }

  if (plan.department === target) {
    return FIT_EXACT;
  }

  const targetCategory = toCategory(target);
  if (
    planCategory === targetCategory ||
    toCategory(plan.department) === targetCategory
  ) {
    return FIT_SAME_CATEGORY;
  }

  if (plan.department.includes(target) || target.includes(plan.department)) {
    return FIT_PARTIAL;
  }

  return FIT_NONE;
};

/**
 * 모집단위에 대응하는 입결을 찾는다.
 * 1차로 planKey(= plan.id), 없으면 "대학-학과-군" 조합으로 찾는다.
 */
export const findResults = (
  resultIndex: Map<string, JeongsiResultEntry[]>,
  plan: JeongsiAdmissionPlan
): JeongsiResultEntry[] => {
  const byId = resultIndex.get(plan.id);
  if (byId) {
    return byId;
  }

  const composed = `${plan.university}-${plan.department}-${plan.group}`;
  return resultIndex.get(composed) ?? [];
};

const median = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const average = (values: number[]): number | null =>
  values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;

/**
 * 대학 서열 대리지표 계산기. 입결이 없는 모집단위의 컷은 추정하지 않는다
 * (원문 데이터에 없는 값은 만들지 않는다 — 사용자 결정 2026-11-04).
 *
 * 이 학생 기준 판정 격차의 부호를 뒤집은 값(−gapRatio)을 쓴다. 기준컷이 높은
 * 대학일수록 격차가 작으므로 값이 커진다. "대학 우선형" 조합의 정렬에만 쓴다.
 */
const createCutEstimator = (
  score: SuneungScore,
  plans: JeongsiAdmissionPlan[],
  resultIndex: Map<string, JeongsiResultEntry[]>
): {
  universityPrestige: (university: string) => number;
} => {
  const gapCache = new Map<string, number | null>();

  const gapOf = (plan: JeongsiAdmissionPlan): number | null => {
    const cached = gapCache.get(plan.id);
    if (cached !== undefined) {
      return cached;
    }
    const results = findResults(resultIndex, plan);
    let gap: number | null = null;
    if (results.length > 0) {
      const conversion = convertScore(score, plan.formula);
      gap = classifyPlan({
        convertedScore: conversion.convertedScore,
        convertedScoreExcludingBonus: roundTo3(
          conversion.convertedScore - conversion.bonusAdjustment
        ),
        percentileByBasis: calcPercentileByBasis(score, plan),
        totalScore: plan.formula.totalScore,
        quota: plan.quota,
        results,
        group: plan.group,
        finalQuota: plan.finalQuota,
      }).gapRatio;
    }
    gapCache.set(plan.id, gap);
    return gap;
  };

  /**
   * 대학 서열 대리지표 — 그 대학 전체 모집단위 격차의 중앙값(부호 반전).
   * 모집단위 단위 값은 학과 인기도가 섞여 서열 지표로 쓸 수 없어 대학 단위로 모은다.
   */
  const prestigeCache = new Map<string, number>();
  const universityPrestige = (university: string): number => {
    const cached = prestigeCache.get(university);
    if (cached !== undefined) {
      return cached;
    }
    const gaps = plans
      .filter((plan) => plan.university === university)
      .map(gapOf)
      .filter((value): value is number => value !== null);
    const middle = median(gaps);
    const value = middle === null ? 0 : -middle;
    prestigeCache.set(university, value);
    return value;
  };

  return { universityPrestige };
};

/**
 * 유리도를 뺀 분류 결과.
 *
 * 유리도는 후보 집단 평균(영어 손실)이 필요해 풀이 확정된 뒤에야
 * 계산할 수 있다. 반면 후보 풀 확대 여부는 "밴드가 찼는가"로
 * 판단하므로 분류가 먼저 필요하다. 그래서 두 단계를 나눈다.
 */
export interface PlanClassification {
  plan: JeongsiAdmissionPlan;
  eligible: boolean;
  ineligibleReason?: string;
  convertedScore: number;
  weightedPercentile: number | null;
  simpleAveragePercentile: number;
  referenceCut: PlanEvaluation["referenceCut"];
  competitionRate: number | null;
  cutHistory: PlanEvaluation["cutHistory"];
  gapRatio: number | null;
  gapPoints: number | null;
  resultYears: PlanEvaluation["resultYears"];
  quotaChange: PlanEvaluation["quotaChange"];
  additionalPass: PlanEvaluation["additionalPass"];
  safeCapped: boolean;
  safeCapReasons: PlanEvaluation["safeCapReasons"];
  pastGroups: PlanEvaluation["pastGroups"];
  finalQuotaChange: PlanEvaluation["finalQuotaChange"];
  withinRecommendRange: boolean;
  latestAdmitCuts: PlanEvaluation["latestAdmitCuts"];
  tier: AdmissionTier;
  chance: PlanEvaluation["chance"];
  sensitivity: number | null;
}

/**
 * 모집단위 하나를 분류한다 (유리도 제외).
 * 선택과목 제한에 걸려도 환산점수·입결 비교는 계산해두고(리포트가
 * 왜 못 쓰는지 보여줄 수 있도록) 분류만 지원불가로 고정한다.
 */
export const classifyForStudent = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan,
  results: JeongsiResultEntry[]
): PlanClassification => {
  // 변표에 응시 과목의 열이 없으면(원문 "해당없음") 그 과목은 환산할 수 없다.
  const eligibility = lacksConvertibleInquiry(score, plan.formula)
    ? {
        eligible: false,
        reason:
          "응시한 탐구 과목이 이 대학 변환표준점수표에 없어 환산할 수 없습니다",
      }
    : checkEligibility(score, plan.restrictions);
  const conversion = convertScore(score, plan.formula);
  const sensitivity = calcSensitivity(score, plan.formula);
  const simpleAveragePercentile = calcSimpleAveragePercentile(score);
  const classification = classifyPlan({
    convertedScore: conversion.convertedScore,
    convertedScoreExcludingBonus: roundTo3(
      conversion.convertedScore - conversion.bonusAdjustment
    ),
    percentileByBasis: calcPercentileByBasis(score, plan),
    totalScore: plan.formula.totalScore,
    quota: plan.quota,
    results,
    group: plan.group,
    finalQuota: plan.finalQuota,
  });

  return {
    plan,
    eligible: eligibility.eligible,
    ineligibleReason: eligibility.reason,
    convertedScore: conversion.convertedScore,
    weightedPercentile: calcWeightedPercentile(score, plan),
    simpleAveragePercentile,
    referenceCut: classification.referenceCut,
    competitionRate: classification.competitionRate,
    cutHistory: classification.cutHistory,
    gapRatio: classification.gapRatio,
    gapPoints: classification.gapPoints,
    resultYears: classification.resultYears,
    quotaChange: classification.quotaChange,
    additionalPass: classification.additionalPass,
    safeCapped: classification.safeCapped,
    safeCapReasons: classification.safeCapReasons,
    pastGroups: classification.pastGroups,
    finalQuotaChange: classification.finalQuotaChange,
    withinRecommendRange: classification.withinRecommendRange,
    latestAdmitCuts: classification.latestAdmitCuts,
    tier: eligibility.eligible ? classification.tier : "지원불가",
    chance: eligibility.eligible ? classification.chance : "매우낮음",
    sensitivity,
  };
};

/** 분류 결과에 유리도를 붙여 최종 평가로 만든다 */
export const toEvaluation = (
  score: SuneungScore,
  classification: PlanClassification,
  context: AdvantageContext
): PlanEvaluation => ({
  plan: classification.plan,
  eligible: classification.eligible,
  ineligibleReason: classification.ineligibleReason,
  convertedScore: classification.convertedScore,
  weightedPercentile: classification.weightedPercentile,
  simpleAveragePercentile: classification.simpleAveragePercentile,
  referenceCut: classification.referenceCut,
  competitionRate: classification.competitionRate,
  cutHistory: classification.cutHistory,
  gapRatio: classification.gapRatio,
  gapPoints: classification.gapPoints,
  resultYears: classification.resultYears,
  quotaChange: classification.quotaChange,
  additionalPass: classification.additionalPass,
  safeCapped: classification.safeCapped,
  safeCapReasons: classification.safeCapReasons,
  pastGroups: classification.pastGroups,
  finalQuotaChange: classification.finalQuotaChange,
  withinRecommendRange: classification.withinRecommendRange,
  sensitivity: classification.sensitivity,
  historicalPassRate: null,
  latestAdmitCuts: classification.latestAdmitCuts,
  tier: classification.tier,
  chance: classification.chance,
  // 지원 자체가 불가능한 대학의 반영방식 유리도는 의미가 없다(§5.4).
  advantageScore: classification.eligible
    ? calcAdvantageScore(score, classification.plan, context)
    : 0,
});

/** 모집단위 하나에 대한 평가 결과 */
export interface PlanAssessment {
  evaluation: PlanEvaluation;
  sensitivity: number | null;
}

/**
 * 분류 + 유리도를 한 번에 (단일 모집단위 평가용).
 *
 * ⚠️ 프로덕션 경로는 이 함수를 쓰지 않는다 — analyzeJeongsi 는
 * classifyForStudent(분류) + toEvaluation(유리도 부착)을 따로 호출해
 * 후보 풀 확대 판단을 그 사이에 끼운다. 이 함수는 도메인 규칙
 * 검증 스크립트의 진입점으로 유지하는 것이므로 "죽은 export" 로
 * 보고 삭제하지 말 것.
 */
export const assessPlan = (
  score: SuneungScore,
  plan: JeongsiAdmissionPlan,
  results: JeongsiResultEntry[],
  context: AdvantageContext
): PlanAssessment => {
  const classification = classifyForStudent(score, plan, results);

  return {
    evaluation: toEvaluation(score, classification, context),
    sensitivity: classification.sensitivity,
  };
};

/**
 * 밴드별로 추천 가능한 "서로 다른 대학" 수.
 * 추천 목록이 같은 대학을 한 분류에 한 번만 담으므로, 밴드가
 * 찼는지는 대학 수로 세야 실제 채움 가능성과 일치한다.
 */
export const countFilledBands = (
  classifications: PlanClassification[]
): Record<"상향" | "적정" | "안정", number> => {
  const universitiesByTier: Record<"상향" | "적정" | "안정", Set<string>> = {
    상향: new Set(),
    적정: new Set(),
    안정: new Set(),
  };

  for (const classification of classifications) {
    if (
      !classification.eligible ||
      classification.tier === "지원불가" ||
      classification.tier === "소신" ||
      !classification.withinRecommendRange
    ) {
      continue;
    }
    universitiesByTier[classification.tier].add(classification.plan.university);
  }

  return {
    상향: universitiesByTier.상향.size,
    적정: universitiesByTier.적정.size,
    안정: universitiesByTier.안정.size,
  };
};

interface MatchedPlan {
  plan: JeongsiAdmissionPlan;
  fit: number;
}

/**
 * 후보 풀 단계 확대 (specs/013 §6.1-b).
 *
 * 1. 희망 학과와 이름이 같거나(FIT_EXACT) 같은 분류(FIT_SAME_CATEGORY)인 모집단위.
 *    세 밴드(상향·적정·안정)가 모두 찼으면 여기서 끝낸다.
 * 2. 같은 계열(+계열무관)로 넓힌다(사용자 결정 2026-11-15 "범위를 좀 더 넓혀").
 *    의약은 학과(분류)마다 따로 봐 약학 희망에 의예·수의예가 섞이지 않는다.
 * 대계열(인문/자연) 전체로 넓히지 않는다(2026-11-08: 전자공학 희망에 식품영양학과·수학과).
 * 이름 일부만 겹치는 곳(FIT_PARTIAL)은 쓰지 않는다. 칸이 비면 비었다고 안내한다.
 */
export interface CandidatePool {
  plans: MatchedPlan[];
  /** 어디까지 넓혔는지 (1 희망 학과·같은 분류 / 2 같은 계열) */
  stage: 1 | 2;
}

export const collectCandidatePlans = (
  plans: JeongsiAdmissionPlan[],
  preference: Pick<JeongsiPreference, "target" | "targetKind">,
  /** 1단계 뒤 종료 여부 (세 밴드가 모두 찼는가) */
  shouldStop: (matched: MatchedPlan[]) => boolean
): CandidatePool => {
  // 희망 지역은 입력에서 뺐다(사용자 결정 2026-11-15). 모든 지역의 대학을 본다.
  const matched: MatchedPlan[] = [];
  const taken = new Set<string>();

  const targetCategory = toCategory(preference.target);
  /**
   * 사범계열(○○교육과)은 교원 자격 트랙이라 희망 학과가 교육 계열일 때만 담는다
   * (specs/014 G1). 학과 분류가 교과로 묶여 있어(컴퓨터교육과 → 컴퓨터공학) 1단계에서도
   * 걸러야 한다 — 컴공 희망 학생의 대표 조합에 컴퓨터교육과가 들어갔다(2026-11-15 실측).
   */
  const targetIsEducation = findFieldGroup(targetCategory) === "교육";
  const isTeacherTrack = (plan: JeongsiAdmissionPlan): boolean =>
    !targetIsEducation && /교육과$|교육학과$|교육학부$/.test(plan.department);

  // 1단계: 희망 학과와 이름이 같거나 같은 분류인 모집단위. 이름 일부만 겹치는 곳
  // (FIT_PARTIAL)은 쓰지 않는다("화학" → "화학공학" 같은 오매칭, 수시와 같은 기준).
  for (const plan of plans) {
    const fit = calcDepartmentFit(plan, preference);
    if (fit < FIT_SAME_CATEGORY || isTeacherTrack(plan)) {
      continue;
    }
    matched.push({ plan, fit });
    taken.add(plan.id);
  }

  if (shouldStop(matched)) {
    return { plans: matched, stage: 1 };
  }

  // 2단계: 같은 계열로 넓힌다(사용자 결정 2026-11-15 "범위를 좀 더 넓혀"). 의약은
  // 학과마다 따로 보므로(expandableCategories) 약학 희망에 의예·수의예가 섞이지 않는다.
  const targetIsMedical = isMedicalCategory(targetCategory);
  const groupCategories = expandableCategories(targetCategory);
  for (const plan of plans) {
    if (taken.has(plan.id)) continue;
    // 의약·보건은 비의약과 섞지 않는다 (양방향)
    if (isMedicalCategory(plan.category) !== targetIsMedical) continue;
    if (isTeacherTrack(plan)) continue;
    if (!groupCategories.has(plan.category)) continue;
    if (
      findFieldGroup(plan.category) === NEUTRAL_GROUP &&
      !matchesNeutralPlanField(plan.department, targetCategory)
    ) {
      continue;
    }
    matched.push({ plan, fit: FIT_FIELD_GROUP });
    taken.add(plan.id);
  }
  // 실제로 넓혀 담은 곳이 있을 때만 2단계다. 의약처럼 넓힐 곳이 없으면 1단계로 둬
  // "○○ 계열까지 함께 비교했습니다" 안내가 사실과 다르게 나가지 않게 한다.
  const widened = matched.some(({ fit }) => fit === FIT_FIELD_GROUP);
  return { plans: matched, stage: widened ? 2 : 1 };
};

/**
 * 희망 학과·계열이 분석 후보를 하나라도 만드는지.
 *
 * 입력 폼이 제출 전에 "추천이 통째로 빌 입력"(예: 학과 분류에 없는
 * 줄임말 "컴공")을 걸러내는 용도다. 실제 분석과 같은 후보 수집 규칙
 * (희망 학과·같은 분류, 비면 같은 계열)을 쓴다. 성적·선택과목은 보지 않는다.
 */
export const countTargetCandidates = (
  plans: JeongsiAdmissionPlan[],
  preference: Pick<JeongsiPreference, "target" | "targetKind">
): number =>
  collectCandidatePlans(plans, preference, (matched) => matched.length > 0)
    .plans.length;

/** 적정 구간에서 가장 먼저 고르는 격차 — 적정 구간의 가운데 (실측 통과율 약 60%) */
const MODERATE_TARGET_GAP = (GAP_BANDS.적정하한 + GAP_BANDS.안정하한) / 2;

/**
 * 구분 안에서 고르는 순서 (specs/014 C1). 희망 적합도가 먼저이고,
 * 같으면 학생 성적을 최대한 살리는 쪽을 먼저 둔다.
 *   - 상향: 적정에 가장 가까운 곳(격차가 큰 쪽)
 *   - 적정: 합격 가능성이 높음으로 바뀌는 지점(+0.5)에 가까운 곳
 *   - 안정: 안정 하한에 가장 가까운 곳(격차가 작은 쪽). 여유가 큰 곳부터 고르면
 *     합격선이 크게 낮은 대학이 추천됐다(피드백: 강서대).
 */
const closenessInTier = (tier: RecommendableTier, gap: number): number => {
  if (tier === "상향") return -gap;
  if (tier === "적정") return Math.abs(gap - MODERATE_TARGET_GAP);
  return gap;
};

const byRecommendationIn =
  (tier: RecommendableTier) =>
  (a: CombinationCandidate, b: CombinationCandidate): number =>
    b.fit - a.fit ||
    closenessInTier(tier, a.gapRatio ?? Infinity) -
      closenessInTier(tier, b.gapRatio ?? Infinity) ||
    b.evaluation.advantageScore - a.evaluation.advantageScore ||
    a.evaluation.plan.id.localeCompare(b.evaluation.plan.id);

/** 적정 구간까지의 거리 (판정 격차 단위) */
const distanceToModerateBand = (candidate: CombinationCandidate): number => {
  const gap = candidate.gapRatio;
  if (gap === null) {
    return Infinity;
  }
  if (gap < GAP_BANDS.적정하한) {
    return GAP_BANDS.적정하한 - gap;
  }
  if (gap >= GAP_BANDS.안정하한) {
    return gap - GAP_BANDS.안정하한;
  }
  return 0;
};

const GROUP_ORDER: AdmissionGroup[] = ["가", "나", "다"];

/**
 * 한 구분에서 RECOMMENDATION_SIZE 곳을 고른다. 같은 대학은 한 번만.
 *
 * 원서 조합이 이 목록 안에서만 만들어지므로 군이 한쪽에 몰리면 조합을
 * 짤 수 없다. 그래서 먼저 군마다 가장 앞선 한 곳씩 담고(가·나·다), 남은
 * 자리를 순서대로 채운다.
 */
const pickWithinTier = (
  sorted: CombinationCandidate[],
  excludedPlanIds: Set<string>
): CombinationCandidate[] => {
  const picked: CombinationCandidate[] = [];
  const seenUniversities = new Set<string>();
  const take = (candidate: CombinationCandidate): void => {
    picked.push(candidate);
    seenUniversities.add(candidate.evaluation.plan.university);
  };
  const available = (candidate: CombinationCandidate): boolean =>
    !excludedPlanIds.has(candidate.evaluation.plan.id) &&
    !seenUniversities.has(candidate.evaluation.plan.university) &&
    !picked.includes(candidate);

  for (const group of GROUP_ORDER) {
    if (picked.length >= RECOMMENDATION_SIZE) break;
    const first = sorted.find(
      (candidate) =>
        candidate.evaluation.plan.group === group && available(candidate)
    );
    if (first) take(first);
  }
  for (const candidate of sorted) {
    if (picked.length >= RECOMMENDATION_SIZE) break;
    if (available(candidate)) take(candidate);
  }

  // 화면 순서는 고른 순서가 아니라 구분 안 정렬 순서를 따른다
  return sorted.filter((candidate) => picked.includes(candidate));
};

/**
 * 분류별 추천. 추천 범위(상향하한 ~ 안정상한) 밖은 넣지 않는다.
 *
 * 적정이 비면 적정 구간 가까이(SUBSTITUTE_MAX_DISTANCE 이내)에 있는 상향·안정
 * 항목으로 채운다. 그 항목의 구분은 바꾸지 않는다 — 리포트는 실제 구분을 함께
 * 보인다. 상향·안정이 비는 것은 정보이므로 그대로 둔다.
 */
const pickRecommendations = (
  candidates: CombinationCandidate[]
): {
  picked: Record<RecommendableTier, CombinationCandidate[]>;
  substituted: boolean;
} => {
  const inRange = candidates.filter(
    (candidate) => candidate.evaluation.withinRecommendRange
  );
  const picked: Record<RecommendableTier, CombinationCandidate[]> = {
    상향: [],
    적정: [],
    안정: [],
  };

  for (const tier of RECOMMENDATION_TIERS) {
    const sorted = inRange
      .filter((candidate) => candidate.evaluation.tier === tier)
      .sort(byRecommendationIn(tier));
    picked[tier] = pickWithinTier(sorted, new Set());
  }

  let substituted = false;
  if (picked.적정.length < RECOMMENDATION_SIZE) {
    // 세 구분 전체에서 이미 고른 모집단위는 다시 담지 않는다(같은 학과가 두 칸에 나오지 않게)
    const alreadyPicked = new Set(
      RECOMMENDATION_TIERS.flatMap((tier) =>
        picked[tier].map((candidate) => candidate.evaluation.plan.id)
      )
    );
    const nearest = inRange
      .filter(
        (candidate) =>
          candidate.gapRatio !== null &&
          !alreadyPicked.has(candidate.evaluation.plan.id) &&
          distanceToModerateBand(candidate) <= SUBSTITUTE_MAX_DISTANCE
      )
      .sort(
        (a, b) =>
          distanceToModerateBand(a) - distanceToModerateBand(b) ||
          byRecommendationIn("적정")(a, b)
      );
    const seenUniversities = new Set(
      picked.적정.map((candidate) => candidate.evaluation.plan.university)
    );
    for (const candidate of nearest) {
      if (picked.적정.length >= RECOMMENDATION_SIZE) break;
      if (seenUniversities.has(candidate.evaluation.plan.university)) continue;
      seenUniversities.add(candidate.evaluation.plan.university);
      picked.적정.push(candidate);
      substituted = true;
    }
  }

  return { picked, substituted };
};

/** 2027 최종 모집인원이 신호만큼 늘었는지 (최종 인원이 아직 없으면 false) */
/**
 * 소신(스나이핑) 후보의 우선순위 신호. 숫자가 작을수록 먼저 고른다.
 * 실측 통과율 순서(classify.ts): 최종 모집인원 증가 23% > 경쟁률 급등+충원 많음 19% >
 * 경쟁률 급등 7~13% > 그 외 4%. 원문 값이 없는 신호는 없는 것으로 본다(추정하지 않음).
 */
export const snipingSignalRank = (evaluation: PlanEvaluation): number => {
  if (hasFinalQuotaSignal(evaluation)) return 0;
  const competitions = evaluation.plan.recentCompetitions ?? [];
  const previous = competitions.find((entry) => entry.year === 2025);
  const latest = competitions.find((entry) => entry.year === 2026);
  const surged =
    previous?.competitionRate !== undefined &&
    previous.competitionRate > 0 &&
    latest?.competitionRate !== undefined &&
    latest.competitionRate / previous.competitionRate >=
      COMPETITION_SURGE_RATIO;
  if (!surged) return 3;
  return latest?.additionalPassRate !== undefined &&
    latest.additionalPassRate >= FILL_RATE_SIGNAL
    ? 1
    : 2;
};

const hasFinalQuotaSignal = (evaluation: PlanEvaluation): boolean =>
  evaluation.finalQuotaChange !== null &&
  evaluation.finalQuotaChange.ratio >= FINAL_QUOTA_SIGNAL_RATIO;

/**
 * 스나이핑 후보 — 추천 범위 바로 아래(SNIPING_MIN_GAP ~ 상향하한) 모집단위.
 *
 * 실측 통과율을 함께 보여야 하므로 환산점수 입결로 판정했고 모집군이 바뀌지
 * 않은(실측 표본과 같은 조건) 곳만 쓴다. 순서: 실측 신호(snipingSignalRank: 최종 모집인원 증가 →
 * 경쟁률 급등과 충원 많음 → 경쟁률 급등) →
 * 희망 학과 적합도 → 기준컷에 가까운 곳. 대학당 한 곳, 추천 목록과 겹치지 않게.
 *
 * 희망 학과와 같은 분류(FIT_SAME_CATEGORY 이상)만 고른다. 수시 추천의 유사학과도
 * 같은 분류까지다. 계열그룹으로 넓히면 약학 희망 학생에게 의예·치의예가
 * 스나이핑으로 나왔다(사용자 결정 2026-11-15). 같은 분류에 없으면 비운다.
 */
const pickSniping = (
  candidates: CombinationCandidate[],
  recommended: CombinationCandidate[]
): CombinationCandidate[] => {
  const recommendedIds = new Set(
    recommended.map((candidate) => candidate.evaluation.plan.id)
  );
  const sorted = candidates
    .filter(
      ({ evaluation }) =>
        evaluation.eligible &&
        evaluation.tier === "소신" &&
        evaluation.referenceCut?.metric === "convertedScore" &&
        evaluation.pastGroups.length === 0 &&
        evaluation.historicalPassRate !== null &&
        !recommendedIds.has(evaluation.plan.id)
    )
    .filter((candidate) => candidate.fit >= FIT_SAME_CATEGORY)
    .sort(
      (a, b) =>
        snipingSignalRank(a.evaluation) - snipingSignalRank(b.evaluation) ||
        b.fit - a.fit ||
        (b.gapRatio ?? -Infinity) - (a.gapRatio ?? -Infinity) ||
        a.evaluation.plan.id.localeCompare(b.evaluation.plan.id)
    );
  const picked: CombinationCandidate[] = [];
  const seenUniversities = new Set<string>();
  for (const candidate of sorted) {
    if (picked.length >= SNIPING_SIZE) break;
    if (seenUniversities.has(candidate.evaluation.plan.university)) continue;
    seenUniversities.add(candidate.evaluation.plan.university);
    picked.push(candidate);
  }
  return picked;
};

/**
 * PART 2 유리한 대학 — 추천 목록(PART 3) 안에서, 대학당 한 곳.
 * 리포트에 나오는 대학이 모두 PART 3 에서 분석되도록 목록 밖에서 고르지 않는다.
 */
const pickAdvantageousPlans = (
  recommended: CombinationCandidate[]
): PlanEvaluation[] => {
  const seenUniversities = new Set<string>();
  return [...recommended]
    .sort(
      (a, b) =>
        b.evaluation.advantageScore - a.evaluation.advantageScore ||
        b.fit - a.fit ||
        a.evaluation.plan.id.localeCompare(b.evaluation.plan.id)
    )
    .filter(({ evaluation: { plan } }) => {
      if (seenUniversities.has(plan.university)) {
        return false;
      }
      seenUniversities.add(plan.university);
      return true;
    })
    .slice(0, ADVANTAGE_LIST_SIZE)
    .map((candidate) => candidate.evaluation);
};

// ─── 목록에 넣지 않은 곳과 비교하지 못한 곳 ───

/** PART 3 "목록에 넣지 않은 곳"에 싣는 최대 수 */
export const NOT_LISTED_SIZE = 10;

/** 추천 범위까지의 거리 (판정 격차 단위). 범위 안이면 0 */
const distanceToRecommendRange = (gap: number): number => {
  if (gap < GAP_BANDS.상향하한) return GAP_BANDS.상향하한 - gap;
  if (gap > GAP_BANDS.안정상한) return gap - GAP_BANDS.안정상한;
  return 0;
};

const NOT_LISTED_ORDER: Record<NotListedReason, number> = {
  sameUniversityListed: 0,
  tierListFull: 0,
  snipingRegrouped: 1,
  snipingSameUniversity: 1,
  snipingListFull: 1,
  aboveRange: 2,
  belowRange: 2,
  ineligible: 3,
};

/**
 * 희망 학과와 같은 분류(FIT_SAME_CATEGORY 이상)로 비교했지만 목록에 넣지 않은 곳과 이유.
 * "같은 성적대인데 왜 이 대학은 없나"에 답한다. 이유는 목록을 고른 규칙 그대로다
 * (pickRecommendations·pickSniping). 추천 범위에 가까운 곳부터 NOT_LISTED_SIZE 곳.
 */
export const collectNotListed = (
  candidates: CombinationCandidate[],
  picked: Record<RecommendableTier, CombinationCandidate[]>,
  sniping: PlanEvaluation[]
): NotListedEntry[] => {
  const listedIds = new Set([
    ...RECOMMENDATION_TIERS.flatMap((tier) =>
      picked[tier].map((candidate) => candidate.evaluation.plan.id)
    ),
    ...sniping.map((evaluation) => evaluation.plan.id),
  ]);
  const reasonOf = (
    candidate: CombinationCandidate
  ): NotListedReason | null => {
    const { evaluation } = candidate;
    const gap = candidate.gapRatio;
    if (!evaluation.eligible) return "ineligible";
    if (gap === null) return null;
    if (gap < SNIPING_MIN_GAP) return "belowRange";
    if (gap < GAP_BANDS.상향하한) {
      if (evaluation.pastGroups.length > 0) return "snipingRegrouped";
      return sniping.some(
        (other) => other.plan.university === evaluation.plan.university
      )
        ? "snipingSameUniversity"
        : "snipingListFull";
    }
    if (gap > GAP_BANDS.안정상한) return "aboveRange";
    const { tier } = evaluation;
    if (tier !== "상향" && tier !== "적정" && tier !== "안정") return null;
    const sameUniversity = picked[tier].some(
      (other) => other.evaluation.plan.university === evaluation.plan.university
    );
    return sameUniversity ? "sameUniversityListed" : "tierListFull";
  };
  return candidates
    .filter(
      (candidate) =>
        candidate.fit >= FIT_SAME_CATEGORY &&
        !listedIds.has(candidate.evaluation.plan.id)
    )
    .flatMap((candidate) => {
      const reason = reasonOf(candidate);
      if (!reason) return [];
      const { evaluation } = candidate;
      const entry: NotListedEntry = {
        unitKey: evaluation.plan.id,
        university: evaluation.plan.university,
        department: evaluation.plan.department,
        group: evaluation.plan.group,
        reason,
        tier: evaluation.tier,
        gapRatio: candidate.gapRatio,
        ...(reason === "ineligible" && evaluation.ineligibleReason
          ? { ineligibleReason: evaluation.ineligibleReason }
          : {}),
      };
      return [entry];
    })
    .sort(
      (a, b) =>
        NOT_LISTED_ORDER[a.reason] - NOT_LISTED_ORDER[b.reason] ||
        distanceToRecommendRange(a.gapRatio ?? Infinity) -
          distanceToRecommendRange(b.gapRatio ?? Infinity) ||
        a.unitKey.localeCompare(b.unitKey)
    )
    .slice(0, NOT_LISTED_SIZE);
};

const WOMENS_UNIVERSITY = /여자대학교$/;
const TEACHER_TRACK = /교육과$|교육학과$|교육학부$/;

/**
 * 희망 학과와 같은 분류인데 같은 기준(대학 환산점수 vs 그 대학 환산점수 입결)으로 비교하지
 * 못한 곳과 원문 사유. 엔진 데이터에 들어오지 못한 곳(빌드 스크립트가 사유를 남긴 일반전형)과,
 * 엔진 데이터에는 있지만 이 학생 값과 같은 기준의 입결이 없는 곳을 모은다.
 * 남학생이면 여자대학교는 지원 자격이 없어 싣지 않는다. 교원 자격 트랙은 후보 수집과 같은
 * 기준으로 뺀다.
 */
export const collectNotCompared = ({
  plans,
  excludedUnits,
  comparedPlanIds,
  isComparable,
  preference,
  gender,
  track,
}: {
  plans: JeongsiAdmissionPlan[];
  excludedUnits: ExcludedUnit[];
  comparedPlanIds: Set<string>;
  isComparable: (plan: JeongsiAdmissionPlan) => boolean;
  preference: Pick<JeongsiPreference, "target" | "targetKind">;
  gender: StudentGender | undefined;
  track: ReturnType<typeof resolveApplicantTrack>;
}): NotComparedEntry[] => {
  const targetIsEducation =
    findFieldGroup(toCategory(preference.target)) === "교육";
  const inScope = (unit: {
    university: string;
    department: string;
    category: string;
  }): boolean =>
    calcDepartmentFit(unit, preference) >= FIT_SAME_CATEGORY &&
    !(gender === "male" && WOMENS_UNIVERSITY.test(unit.university)) &&
    !(!targetIsEducation && TEACHER_TRACK.test(unit.department));

  const fromPlans: NotComparedEntry[] = excludeOtherTrackSplits(
    plans.filter(inScope),
    track
  )
    .filter((plan) => !comparedPlanIds.has(plan.id) && !isComparable(plan))
    .map((plan) => ({
      university: plan.campus
        ? `${plan.university}(${plan.campus})`
        : plan.university,
      department: plan.department,
      group: plan.group,
      reason: "noComparableResults" as const,
      ...(plan.formulaChangedYears
        ? { formulaChangedYears: plan.formulaChangedYears }
        : {}),
    }));
  const fromExcluded: NotComparedEntry[] = excludedUnits
    .filter(inScope)
    .map((unit) => ({
      university: unit.campus
        ? `${unit.university}(${unit.campus})`
        : unit.university,
      department: unit.department,
      group: unit.group,
      reason: unit.reason,
    }));
  return [...fromPlans, ...fromExcluded].sort(
    (a, b) =>
      a.reason.localeCompare(b.reason) ||
      a.university.localeCompare(b.university) ||
      a.department.localeCompare(b.department)
  );
};

/** 비어 있는 분석 결과 (지원 가능한 모집단위가 없을 때) */
const emptyRecommendations = (): Record<
  "상향" | "적정" | "안정",
  PlanEvaluation[]
> => ({ 상향: [], 적정: [], 안정: [] });

/** 정시 분석 전체 수행 */
export const analyzeJeongsi = async (
  input: JeongsiInput
): Promise<JeongsiAnalysis> => {
  const [plans, resultIndex] = await Promise.all([
    loadAdmissionPlans(),
    loadAdmissionResultIndex(),
  ]);

  const { score, preference, gender } = input;
  const diagnosis = diagnoseScore(score);

  const { universityPrestige } = createCutEstimator(score, plans, resultIndex);

  // 분류는 유리도보다 먼저 필요하다 — 후보 풀 확대 여부를
  // "밴드가 찼는가"로 판단하기 때문이다. 모집단위별로 1회만 계산.
  const classificationCache = new Map<string, PlanClassification>();
  const classificationOf = (plan: JeongsiAdmissionPlan): PlanClassification => {
    const cached = classificationCache.get(plan.id);
    if (cached) {
      return cached;
    }

    const results = findResults(resultIndex, plan);
    const classification = classifyForStudent(score, plan, results);
    classificationCache.set(plan.id, classification);
    return classification;
  };

  // 같은 학과의 인문·자연 분리 모집은 학생 계열에 맞는 단위만 후보로 둔다
  // 입결이 없거나, 있어도 이 학생 값과 원문만으로 비교할 수 없는 모집단위
  // (예: 표준점수 반영 대학의 환산점수 입결 — 민감도가 원문에 없음)는
  // 후보에서 뺀다. 기준컷 없이 구분을 매기면 추측이다(실측: 기본값 "적정"이
  // 붙은 40곳이 "공개 기준컷이 없어 … 판단한 구분"으로 추천됨).
  // 남학생이면 여자대학교는 지원 자격이 없어 후보에 넣지 않는다.
  // 모든 추천은 같은 기준(학생의 대학별 환산점수 vs 그 대학 환산점수 입결)으로 판단한다
  // (사용자 결정 2026-11-15). 평균 백분위 입결은 영어와 반영비율이 빠진 값이라 대학마다
  // 기준이 달라져(영어 4등급 학생에게 연세대가 고려대보다 쉽게 나옴) 후보에서 뺀다.
  const studentPlans = excludeOtherTrackSplits(
    excludeWomensUniversities(plans, gender).filter(
      (plan) =>
        findResults(resultIndex, plan).length > 0 &&
        classificationOf(plan).gapRatio !== null &&
        classificationOf(plan).referenceCut?.metric === "convertedScore"
    ),
    resolveApplicantTrack(score)
  );

  // 희망 조건 필터 — 희망 학과·같은 분류, 밴드가 안 차면 같은 계열(의약은 학과별)
  const pool = collectCandidatePlans(studentPlans, preference, (staged) => {
    const counts = countFilledBands(
      staged.map((entry) => classificationOf(entry.plan))
    );
    return RECOMMENDATION_TIERS.every(
      (tier) => counts[tier] >= RECOMMENDATION_SIZE
    );
  });
  const matched = pool.plans;

  // 영어 영향력 보정의 기준이 되는 후보 집단 평균
  const averageEnglishLoss =
    average(
      matched.map((entry) =>
        calcEnglishLoss(
          entry.plan.formula,
          score.english.grade,
          resolveAreaRatios(score, entry.plan.formula).english
        )
      )
    ) ?? 0;
  const context: AdvantageContext = { averageEnglishLoss };

  // 다음 해 컷 이동 실측 — 학생과 무관한 데이터 통계라 분석마다 한 번 만든다.
  // 소수 모집 모집단위는 컷이 더 크게 움직여(classify.ts SMALL_QUOTA_MAX) 소수 모집끼리 잰다.
  const resultsOfPlan = (plan: JeongsiAdmissionPlan): JeongsiResultEntry[] =>
    findResults(resultIndex, plan);
  const movement = buildCutMovement(plans, resultsOfPlan);
  const smallQuotaMovement = buildCutMovement(
    plans,
    resultsOfPlan,
    "smallQuota"
  );

  const candidates: CombinationCandidate[] = matched.map((entry) => {
    const classification = classificationOf(entry.plan);
    const evaluation = toEvaluation(score, classification, context);

    const smallQuota = isSmallQuota(entry.plan.quota);
    const historicalPassRate =
      evaluation.gapRatio === null ||
      evaluation.referenceCut?.metric !== "convertedScore"
        ? null
        : passRateFor(
            smallQuota ? smallQuotaMovement : movement,
            evaluation.gapRatio
          );
    return {
      evaluation: {
        ...evaluation,
        historicalPassRate,
        ...(historicalPassRate === null
          ? {}
          : {
              historicalPassRateScope: smallQuota
                ? ("smallQuota" as const)
                : ("all" as const),
            }),
      },
      fit: entry.fit,
      gapRatio: classification.gapRatio,
      prestige: universityPrestige(entry.plan.university),
    };
  });

  /**
   * 희망 계열이 선택과목 제한으로 전멸한 경우 (specs/013 §6.1-e).
   *
   * 문과 선택과목으로 의대를 희망하는 식의 케이스다. 이때 학생에게
   * 가장 중요한 정보는 "응시 과목 때문에 지원 자체가 불가능하다"
   * 이므로, 다른 대계열로 대체해 추천하지 않는다. 간호·생명과학을
   * 대신 제시하는 것은 질문에 답하지 않는 것이다.
   *
   * 판정 범위는 "희망 학과 일치 + 같은 계열그룹"까지다. 의대 지망생의
   * 치·한·수의·약처럼 같은 계열그룹 안의 모집단위는 실제 하향
   * 선택지이므로 그중 지원 가능한 곳이 있으면 전멸이 아니다.
   * 대계열(3단계) 확대분은 범위에서 제외한다 — 거기까지 끌어오는 것이
   * 금지된 "다른 계열로 대체" 다.
   */
  const desiredScope = candidates.filter(
    (_candidate, index) => matched[index].fit >= FIT_FIELD_GROUP
  );
  const desiredScopeAllIneligible =
    desiredScope.length > 0 &&
    desiredScope.every((candidate) => !candidate.evaluation.eligible);

  /**
   * 제한에 걸린 모집단위 — "왜 이 대학이 목록에 없는지" 설명 근거.
   * 적합도 높은 순으로 싣는다.
   */
  const ineligiblePlans = [...candidates]
    .filter((candidate) => !candidate.evaluation.eligible)
    .sort(
      (a, b) =>
        b.fit - a.fit ||
        a.evaluation.plan.id.localeCompare(b.evaluation.plan.id)
    )
    .map((candidate) => candidate.evaluation);

  if (desiredScopeAllIneligible) {
    return {
      input,
      diagnosis,
      selection: {
        poolStage: pool.stage,
        moderateBandSubstituted: false,
        blockedByRestrictions: true,
      },
      ineligiblePlans,
      advantageousPlans: [],
      recommendations: emptyRecommendations(),
      sniping: [],
      combinations: [],
    };
  }

  // 후보는 희망 학과와 같은 계열그룹까지만 모은다(대계열 확대 없음).
  const applicable = candidates.filter(
    (candidate) =>
      candidate.evaluation.eligible && candidate.evaluation.tier !== "지원불가"
  );

  const { picked, substituted } = pickRecommendations(applicable);

  // PART 3 목록이 리포트의 대학 목록이다. 유리한 대학(PART 2)·원서 조합(PART 4)·
  // 상세(PART 5)는 모두 이 안에서만 고른다(specs/014 A1).
  const recommended = RECOMMENDATION_TIERS.flatMap((tier) => picked[tier]);
  const advantageousPlans = pickAdvantageousPlans(recommended);
  const sniping = pickSniping(applicable, recommended).map(
    (candidate) => candidate.evaluation
  );
  const notListed = collectNotListed(candidates, picked, sniping);
  const notCompared = collectNotCompared({
    plans,
    excludedUnits: await loadExcludedUnits(),
    comparedPlanIds: new Set(studentPlans.map((plan) => plan.id)),
    isComparable: (plan) =>
      findResults(resultIndex, plan).length > 0 &&
      classificationOf(plan).gapRatio !== null &&
      classificationOf(plan).referenceCut?.metric === "convertedScore",
    preference,
    gender,
    track: resolveApplicantTrack(score),
  });
  const combinations = addSnipingCombination(
    markRecommendedCombination(
      buildCombinations(recommended, preference.risk),
      recommended,
      preference.risk
    ),
    sniping,
    preference.risk
  );

  return {
    input,
    diagnosis,
    selection: {
      poolStage: pool.stage,
      moderateBandSubstituted: substituted,
      blockedByRestrictions: false,
      outOfRange: {
        tooHigh: candidates.filter(
          (candidate) =>
            candidate.evaluation.eligible &&
            candidate.gapRatio !== null &&
            candidate.gapRatio < GAP_BANDS.상향하한
        ).length,
        tooLow: candidates.filter(
          (candidate) =>
            candidate.evaluation.eligible &&
            candidate.gapRatio !== null &&
            candidate.gapRatio > GAP_BANDS.안정상한
        ).length,
      },
    },
    ineligiblePlans,
    advantageousPlans,
    recommendations: {
      상향: picked.상향.map((candidate) => candidate.evaluation),
      적정: picked.적정.map((candidate) => candidate.evaluation),
      안정: picked.안정.map((candidate) => candidate.evaluation),
    },
    sniping,
    combinations,
    notListed,
    notCompared,
  };
};
