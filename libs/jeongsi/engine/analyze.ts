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

import { loadAdmissionPlans, loadAdmissionResultIndex } from "../data";
import { calcAdvantageScore } from "./advantage";
import { TIER_THRESHOLDS, classifyPlan } from "./classify";
import { buildCombinations } from "./combination";
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
  resolveApplicantTrack,
} from "./eligibility";
import {
  expandableCategories,
  isMedicalCategory,
  matchesNeutralPlanField,
  NEUTRAL_GROUP,
  findFieldGroup,
} from "./field-groups";

import type { AdvantageContext } from "./advantage";
import type { CombinationCandidate } from "./combination";
import type {
  AdmissionTier,
  JeongsiAdmissionPlan,
  JeongsiAnalysis,
  JeongsiInput,
  JeongsiPreference,
  JeongsiResultEntry,
  PlanEvaluation,
  PreferredRegion,
  SuneungScore,
  UniversityRegion,
} from "../types";

/** PART 2 에 노출할 유리한 대학 수 */
export const ADVANTAGE_LIST_SIZE = 5;

/** PART 3 구분별 추천 수 */
export const RECOMMENDATION_SIZE = 3;

/** 희망 학과 적합도 점수 */
export const FIT_EXACT = 3;
export const FIT_SAME_CATEGORY = 2;
export const FIT_PARTIAL = 1;
export const FIT_NONE = 0;

/**
 * 근접 대체 거리 상한 (σ 배수).
 * 적정 밴드 경계(−0.4σ / +2.0σ)에서 이보다 멀면 끌어오지 않는다.
 * 상한이 없으면 +7.9σ 짜리까지 "가장 가까운 항목"으로 들어온다
 * (specs/013 §6.1-d 실측).
 */
export const SUBSTITUTE_MAX_DISTANCE_SIGMA = 1.5;

/** 계열그룹 확대 항목의 적합도. 희망 학과 일치 항목보다 항상 낮다 */
export const FIT_FIELD_GROUP = 0.5;

/** 추천 대상 분류 (지원불가 제외) */
const RECOMMENDATION_TIERS: Exclude<AdmissionTier, "지원불가">[] = [
  "상향",
  "적정",
  "안정",
];

const REGION_ALLOWANCE: Record<PreferredRegion, UniversityRegion[]> = {
  서울: ["서울"],
  수도권: ["서울", "수도권"],
  전국: ["서울", "수도권", "지방"],
};

/** 희망 지역 조건 통과 여부 */
export const matchesRegion = (
  region: UniversityRegion,
  preferred: PreferredRegion
): boolean => REGION_ALLOWANCE[preferred].includes(region);

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
  plan: JeongsiAdmissionPlan,
  preference: JeongsiPreference
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
 * 모든 컷을 "학생 백분위 기준 절대 위치"로 환산해 비교한다.
 *   impliedCutPercentile = 학생 국·수·탐 평균 백분위 − percentileGap
 * 환산점수 입결은 대학마다 척도가 달라 값을 직접 비교할 수 없으므로,
 * 학생을 기준점으로 삼아 백분위 축에 올린다.
 */
const createCutEstimator = (
  score: SuneungScore,
  plans: JeongsiAdmissionPlan[],
  resultIndex: Map<string, JeongsiResultEntry[]>
): {
  universityPrestige: (university: string) => number;
} => {
  const simpleAveragePercentile = calcSimpleAveragePercentile(score);
  const impliedCache = new Map<string, number | null>();

  /** 해당 모집단위 입결이 가리키는 컷의 백분위 위치 */
  const impliedCutPercentile = (plan: JeongsiAdmissionPlan): number | null => {
    const cached = impliedCache.get(plan.id);
    if (cached !== undefined) {
      return cached;
    }

    const results = findResults(resultIndex, plan);
    let implied: number | null = null;

    if (results.length > 0) {
      const conversion = convertScore(score, plan.formula);
      const classification = classifyPlan({
        convertedScore: conversion.convertedScore,
        convertedScoreExcludingBonus: roundTo3(
          conversion.convertedScore - conversion.bonusAdjustment
        ),
        percentileByBasis: calcPercentileByBasis(score, plan),
        sensitivity: calcSensitivity(score, plan.formula),
        totalScore: plan.formula.totalScore,
        quota: plan.quota,
        results,
      });
      implied =
        classification.percentileGap === null
          ? null
          : simpleAveragePercentile - classification.percentileGap;
    }

    impliedCache.set(plan.id, implied);
    return implied;
  };

  const impliedCutsOf = (candidates: JeongsiAdmissionPlan[]): number[] =>
    candidates
      .map(impliedCutPercentile)
      .filter((value): value is number => value !== null);

  /**
   * 대학 서열 대리지표 — 그 대학 전체 모집단위 컷의 중앙값.
   *
   * 모집단위 단위 컷은 학과 인기도가 섞여 있어(지방대 의예과가 서울
   * 상위권 인문보다 높다) 서열 지표로 쓸 수 없다. 대학 단위로
   * 집계해야 서울대 > 연·고대 > 서성한 순서가 나온다(specs/013 §4.5).
   */
  const prestigeCache = new Map<string, number>();
  const universityPrestige = (university: string): number => {
    const cached = prestigeCache.get(university);
    if (cached !== undefined) {
      return cached;
    }

    const cuts = impliedCutsOf(
      plans.filter((plan) => plan.university === university)
    );
    const value = median(cuts) ?? 0;
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
  tier: AdmissionTier;
  chance: PlanEvaluation["chance"];
  /** 분류 근거. 타입 계약에 아직 필드가 없어 엔진 내부로만 전달 */
  percentileGap: number | null;
  sigma: number;
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
    sensitivity,
    totalScore: plan.formula.totalScore,
    quota: plan.quota,
    results,
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
    tier: eligibility.eligible ? classification.tier : "지원불가",
    chance: eligibility.eligible ? classification.chance : "매우낮음",
    percentileGap: classification.percentileGap,
    sigma: classification.sigma,
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
  percentileGap: classification.percentileGap,
  sensitivity: classification.sensitivity,
  // 격차 산출이 불가능했으면 σ 를 분류에 쓰지 않았으므로 null 이다.
  cutVolatility:
    classification.percentileGap === null ? null : classification.sigma,
  tier: classification.tier,
  chance: classification.chance,
  // 지원 자체가 불가능한 대학의 반영방식 유리도는 의미가 없다(§5.4).
  advantageScore: classification.eligible
    ? calcAdvantageScore(score, classification.plan, context)
    : 0,
});

/** 모집단위 하나에 대한 평가 결과 + 분류 근거 */
export interface PlanAssessment {
  evaluation: PlanEvaluation;
  percentileGap: number | null;
  sigma: number;
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
    percentileGap: classification.percentileGap,
    sigma: classification.sigma,
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
    if (!classification.eligible || classification.tier === "지원불가") {
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
 * 1. 희망 학과·카테고리 일치 → 세 밴드(상향·적정·안정)가 모두
 *    찼으면 종료
 * 2. 같은 계열그룹(+계열무관) 추가 → 여기서 끝낸다
 *
 * 대계열(인문/자연) 전체로 넓히는 3단계는 없앴다(2026-11-08). 적정 칸을
 * 채우려고 넓혔더니 전자공학 희망 학생에게 식품영양학과·수학과가 적정
 * 추천으로 나갔다(실측). 희망과 무관한 학과로 칸을 채우기보다, 적정이
 * 비면 비었다고 안내한다(buildRecommendationNotices).
 *
 * 종료 조건을 "후보 개수"로 두면 안 된다. 같은 19개라도 컷이 18
 * 백분위점에 퍼져 있으면 밴드당 1.8개고 3점에 몰려 있으면 한
 * 밴드에 다 들어간다 — 개수는 이 차이를 구분하지 못한다. 또 실데이터
 * 규모(모집단위 10배)가 되면 임계값을 다시 조정해야 한다.
 *
 * 2단계에서 적정만 보는 이유: 적정은 세 성향 조합이 모두 요구하는
 * 유일한 필수 밴드다. 상향·안정은 비어도 되며(§6.1-d), 최상위권의
 * 구조적 빈 상향을 이유로 대계열까지 넓히면 희망과 무관한 학과가
 * 섞인다.
 *
 * 확대는 후보 풀에만 적용하고, 적합도 정렬로 희망 학과를 계속
 * 상위에 둔다. 의약·보건은 양방향 모두 섞지 않는다.
 */
export interface CandidatePool {
  plans: MatchedPlan[];
  /** 어디까지 넓혔는지 (1 일치 / 2 계열그룹) */
  stage: 1 | 2;
}

export const collectCandidatePlans = (
  plans: JeongsiAdmissionPlan[],
  preference: JeongsiPreference,
  /** 1단계 뒤 종료 여부 (세 밴드가 모두 찼는가) */
  shouldStop: (matched: MatchedPlan[]) => boolean
): CandidatePool => {
  const inRegion = plans.filter((plan) =>
    matchesRegion(plan.region, preference.region)
  );

  const matched: MatchedPlan[] = [];
  const taken = new Set<string>();

  for (const plan of inRegion) {
    const fit = calcDepartmentFit(plan, preference);
    if (fit === FIT_NONE) {
      continue;
    }
    matched.push({ plan, fit });
    taken.add(plan.id);
  }

  const targetCategory = toCategory(preference.target);
  const targetIsMedical = isMedicalCategory(targetCategory);

  /** 의약·보건은 비의약과 섞지 않는다 (양방향) */
  const crossesMedicalBoundary = (plan: JeongsiAdmissionPlan): boolean =>
    isMedicalCategory(plan.category) !== targetIsMedical;

  const addAll = (
    predicate: (plan: JeongsiAdmissionPlan) => boolean,
    fit: number
  ): void => {
    for (const plan of inRegion) {
      if (taken.has(plan.id) || crossesMedicalBoundary(plan)) {
        continue;
      }
      if (!predicate(plan)) {
        continue;
      }
      matched.push({ plan, fit });
      taken.add(plan.id);
    }
  };

  if (shouldStop(matched)) {
    return { plans: matched, stage: 1 };
  }

  const groupCategories = expandableCategories(targetCategory);
  addAll(
    (plan) =>
      groupCategories.has(plan.category) &&
      (findFieldGroup(plan.category) !== NEUTRAL_GROUP ||
        matchesNeutralPlanField(plan.department, targetCategory)),
    FIT_FIELD_GROUP
  );

  return { plans: matched, stage: 2 };
};

/**
 * 희망 학과·계열이 분석 후보를 하나라도 만드는지.
 *
 * 입력 폼이 제출 전에 "추천이 통째로 빌 입력"(예: 학과 분류에 없는
 * 줄임말 "컴공")을 걸러내는 용도다. 실제 분석과 같은 후보 수집 규칙
 * (적합도 → 계열그룹 → 대계열 확대)을 쓰되, 지역은 전국으로 본다 —
 * 지역 조건 때문에 비는 것은 학생이 바꿀 수 있는 선택이라 막지 않는다.
 * 성적·선택과목은 보지 않는다.
 */
export const countTargetCandidates = (
  plans: JeongsiAdmissionPlan[],
  preference: Pick<JeongsiPreference, "target" | "targetKind">
): number =>
  collectCandidatePlans(
    plans,
    { ...preference, region: "전국", risk: "균형" },
    (matched) => matched.length > 0
  ).plans.length;

/** 기준컷이 있는 모집단위인지 (70%컷이 없으면 referenceCut 이 null) */
const hasPublishedCut = (candidate: CombinationCandidate): number =>
  candidate.evaluation.referenceCut === null ? 0 : 1;

/**
 * 추천 정렬. 희망 적합도가 같으면 기준컷이 있는 모집단위를 먼저 둔다
 * (specs/013 §6.1-f). 기준컷이 없으면 리포트의 "전년도 컷" 항목이 빈다.
 */
const byRecommendation = (
  a: CombinationCandidate,
  b: CombinationCandidate
): number =>
  b.fit - a.fit ||
  hasPublishedCut(b) - hasPublishedCut(a) ||
  (b.percentileGap ?? -Infinity) - (a.percentileGap ?? -Infinity) ||
  b.evaluation.advantageScore - a.evaluation.advantageScore ||
  a.evaluation.plan.id.localeCompare(b.evaluation.plan.id);

/**
 * 적정 밴드까지의 거리 (백분위점).
 * 상향은 적정 하한(−0.4σ)까지, 안정은 적정 상한(+2.0σ)까지의 거리.
 */
const distanceToModerateBand = (candidate: CombinationCandidate): number => {
  const gap = candidate.percentileGap;
  if (gap === null) {
    return Infinity;
  }

  const lower = TIER_THRESHOLDS.적정 * candidate.sigma;
  const upper = TIER_THRESHOLDS.안정 * candidate.sigma;
  if (gap < lower) {
    return lower - gap;
  }
  if (gap > upper) {
    return gap - upper;
  }
  return 0;
};

/**
 * 분류별 추천 — 같은 대학은 한 분류에 한 번만.
 *
 * 적정이 비면 가장 가까운 항목(상향 상단 / 안정 하단)을 끌어와
 * 채운다. 세 성향 조합 모두 적정 슬롯을 포함하므로 비울 수 없다.
 * 상향·안정이 비는 것은 정보이므로 빈 배열 그대로 둔다
 * (억지로 채우면 지원불가를 상향으로 승격시키게 된다 — §6.1-d).
 */
const pickRecommendations = (
  candidates: CombinationCandidate[]
): {
  picked: Record<"상향" | "적정" | "안정", PlanEvaluation[]>;
  substituted: boolean;
} => {
  const picked: Record<"상향" | "적정" | "안정", PlanEvaluation[]> = {
    상향: [],
    적정: [],
    안정: [],
  };
  const sorted = [...candidates].sort(byRecommendation);

  for (const tier of RECOMMENDATION_TIERS) {
    const seenUniversities = new Set<string>();

    for (const candidate of sorted) {
      if (picked[tier].length >= RECOMMENDATION_SIZE) {
        break;
      }
      if (candidate.evaluation.tier !== tier) {
        continue;
      }
      if (seenUniversities.has(candidate.evaluation.plan.university)) {
        continue;
      }

      seenUniversities.add(candidate.evaluation.plan.university);
      picked[tier].push(candidate.evaluation);
    }
  }

  // 적정은 세 성향 조합이 모두 요구하므로 3개까지 보충한다.
  // 단, 밴드 경계에서 1.5σ 넘게 떨어진 항목은 끌어오지 않고 비운다.
  let substituted = false;
  if (picked.적정.length < RECOMMENDATION_SIZE) {
    // 🔴 세 밴드 전체에서 이미 선정된 모집단위를 제외한다.
    // 적정 버킷만 보면 안정 버킷에 담긴 모집단위를 근접 대체로 다시
    // 끌어와, 학생이 PART 3 에서 같은 학과를 두 섹션에서 본다.
    // 대학이 아니라 plan.id 단위로 제외한다 — 같은 대학의 다른
    // 학과·군이 서로 다른 밴드에 오는 것은 정상이다.
    const alreadyPicked = new Set(
      RECOMMENDATION_TIERS.flatMap((tier) =>
        picked[tier].map((evaluation) => evaluation.plan.id)
      )
    );
    const seenUniversities = new Set(
      picked.적정.map((evaluation) => evaluation.plan.university)
    );
    const nearest = [...candidates]
      .filter(
        (candidate) =>
          candidate.percentileGap !== null &&
          !alreadyPicked.has(candidate.evaluation.plan.id) &&
          distanceToModerateBand(candidate) <=
            SUBSTITUTE_MAX_DISTANCE_SIGMA * candidate.sigma
      )
      .sort(
        (a, b) =>
          distanceToModerateBand(a) - distanceToModerateBand(b) ||
          byRecommendation(a, b)
      );

    for (const candidate of nearest) {
      if (picked.적정.length >= RECOMMENDATION_SIZE) {
        break;
      }
      if (seenUniversities.has(candidate.evaluation.plan.university)) {
        continue;
      }

      seenUniversities.add(candidate.evaluation.plan.university);
      picked.적정.push(candidate.evaluation);
      substituted = true;
    }
  }

  return { picked, substituted };
};

/**
 * PART 2 유리한 대학 — 대학당 한 곳, 희망 범위 우선.
 * 같은 대학은 학과가 달라도 반영식이 같아 유리도가 같으므로, 묶지
 * 않으면 상위 5개가 한 대학의 모집단위로 채워진다.
 */
const pickAdvantageousPlans = (
  applicable: CombinationCandidate[]
): PlanEvaluation[] => {
  const desired = applicable.filter(
    (candidate) => candidate.fit >= FIT_FIELD_GROUP
  );
  const seenUniversities = new Set<string>();

  return [...(desired.length > 0 ? desired : applicable)]
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

  const { score, preference } = input;
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
  const studentPlans = excludeOtherTrackSplits(
    plans.filter(
      (plan) =>
        findResults(resultIndex, plan).length > 0 &&
        classificationOf(plan).percentileGap !== null
    ),
    resolveApplicantTrack(score)
  );

  // 희망 조건 필터 — 지역 + 학과 적합도, 밴드가 안 차면 계열까지 확대
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

  const candidates: CombinationCandidate[] = matched.map((entry) => {
    const classification = classificationOf(entry.plan);

    return {
      evaluation: toEvaluation(score, classification, context),
      fit: entry.fit,
      percentileGap: classification.percentileGap,
      sigma: classification.sigma,
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
      combinations: [],
    };
  }

  // 후보는 희망 학과와 같은 계열그룹까지만 모은다(대계열 확대 없음).
  const applicable = candidates.filter(
    (candidate) =>
      candidate.evaluation.eligible && candidate.evaluation.tier !== "지원불가"
  );

  const advantageousPlans = pickAdvantageousPlans(applicable);

  const { picked, substituted } = pickRecommendations(applicable);

  return {
    input,
    diagnosis,
    selection: {
      poolStage: pool.stage,
      moderateBandSubstituted: substituted,
      blockedByRestrictions: false,
    },
    ineligiblePlans,
    advantageousPlans,
    recommendations: picked,
    combinations: buildCombinations(applicable, preference.risk),
  };
};
