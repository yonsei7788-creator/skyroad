// ============================================================
// 상향 / 적정 / 안정 / 지원불가 분류 + 합격 가능성 라벨
//
// 분류 척도는 "백분위 환산 격차(percentileGap)" 다.
// 환산 총점 대비 비율(gapRatio)은 민감도가 대학마다 2배 이상
// 차이나서 공통 임계값을 적용할 수 없다(specs/013 §1.1).
// gapRatio 는 저장·표시용으로만 남긴다.
//
// 임계값·가중치는 전부 이 파일 상단 상수로 모아둔다.
// 근거: specs/013-jeongsi-domain-rules.md
// ============================================================

import { roundTo3 } from "./convert-score";

import type {
  AdmissionTier,
  JeongsiResultEntry,
  PassChance,
  PercentileBasis,
  ResultCut,
  ResultMetric,
  ResultYear,
} from "../types";

/**
 * tier 경계 — percentileGap 을 컷 변동성 σ 의 배수로 비교한다.
 * (specs/013 §1.2 ④)
 */
export const TIER_THRESHOLDS = {
  /** 이 배수 이상이면 안정. 정규 근사 상방 꼬리 약 2.3% */
  안정: 2.0,
  /** 이 배수 이상이면 적정. 70%컷은 충원 포함 실질 합격선이므로 소폭 하회까지 포함 */
  적정: -0.4,
  /** 이 배수 이상이면 상향, 미만은 지원불가 */
  상향: -2.2,
} as const;

/**
 * tier 내부를 한 번 더 쪼개는 chance 경계 (σ 배수).
 * 1:1 대응은 chance 가 tier 의 동어반복이 되어 쓰지 않는다
 * (specs/013 §2).
 */
export const CHANCE_THRESHOLDS = {
  /** 적정 중 이 배수 이상이면 높음(65~85%), 미만은 보통(40~65%) */
  적정상단: 0.8,
  /**
   * 상향 중 이 배수 이상이면 낮음(20~40%), 미만은 매우낮음(8~20%).
   * 1 백분위점 부족은 정시 실무의 전형적 소신지원이므로 낮음이 맞다.
   */
  상향상단: -1.6,
} as const;

/**
 * 상향 낮음의 절대 하한 (백분위점).
 * σ 하한이 0.7 인 대규모 모집단위는 −1.6σ 가 −1.12 라, 같은 1.2점
 * 부족이 모집인원에 따라 낮음·매우낮음으로 갈린다. 이 격차까지는
 * σ 와 무관하게 낮음으로 본다.
 */
export const CHANCE_FLOOR_POINTS = -1.5;

/**
 * 컷 변동성 하한 σ_min (백분위점).
 *
 * 모집인원이 적을수록 70%컷이 한두 명의 지원 여부로 요동친다.
 * σ_min 은 컷 변동성만이 아니라 예측 전체의 불확실성(기준컷 자체가
 * 3개년 가중평균+보정 추정치, 지원자 풀 변화)을 담으므로, 컷이
 * 안정적인 대규모 모집단위에도 0.7 하한을 둔다.
 *
 * 하한이 너무 낮으면 밴드 폭이 인접 대학 간 컷 간격(평균 0.93
 * 백분위점)보다 좁아져 대학 사이에 끼고 아무것도 못 잡는다
 * (specs/013 §1.2 ③ 실측).
 */
export const SIGMA_MIN_BY_QUOTA = [
  { maxQuota: 15, sigma: 1.5 },
  { maxQuota: 40, sigma: 1.0 },
  { maxQuota: Infinity, sigma: 0.7 },
] as const;

/**
 * 컷 변동성 상한 σ_max (백분위점).
 * 소규모 모집단위는 한 해 튄 값으로 σ 가 11 을 넘기도 한다(66→83).
 * 그대로 쓰면 +17 백분위점 여유도 적정이 되어 다른 대학의 +8 안정과
 * 순서가 뒤집힌다. 상한 3.0 이면 +6 이상은 어디서나 안정이다.
 */
export const SIGMA_MAX = 3.0;

/** 3개년 입결 가중치. 최근 연도가 지원자 풀 면에서 가장 유사하다 */
export const RESULT_YEAR_WEIGHTS: Record<ResultYear, number> = {
  2026: 0.5,
  2025: 0.3,
  2024: 0.2,
};

/** 컷 추이를 만들 학년도 (오래된 순) */
export const RESULT_YEARS: ResultYear[] = [2024, 2025, 2026];

/** 추세 보정: 연평균 변화의 절반만, ±0.5 백분위점 상한 */
export const TREND_CLAMP = 1.0;
export const TREND_FACTOR = 0.5;

/** 모집인원 보정: ±10% 데드존, 최대 ∓0.48 백분위점 */
export const QUOTA_DEAD_ZONE = 0.1;
export const QUOTA_CLAMP = 0.4;
export const QUOTA_FACTOR = 1.2;

/** 기본 백분위 산출 기준은 국·수·탐 단순평균이다 (specs/013 §6.2) */
const DEFAULT_PERCENTILE_BASIS: PercentileBasis = "simpleAverage";

/**
 * 비교 기준 컷. 70%컷이 실질 합격선이다. 70%컷이 없는 해에 50%컷·평균을
 * 보정해 대신 쓰지 않는다(원문에 없는 값은 만들지 않는다 — 사용자 결정
 * 2026-11-04). 그 해는 결측으로 본다.
 */
const CUT_PRIORITY = ["cut70"] as const;

type CutKind = (typeof CUT_PRIORITY)[number];

/** 추정조차 불가능할 때의 분류 (specs/013 §6.1 4번) */
export const UNKNOWN_CUT_TIER: AdmissionTier = "적정";
export const UNKNOWN_CUT_CHANCE: PassChance = "보통";

/** 분류 입력 */
export interface ClassifyInput {
  /** 대학 환산식 적용 결과 (가산점 포함) */
  convertedScore: number;
  /**
   * 가산점을 제외한 환산점수.
   * 입결 컷이 가산 제외 기준(`ResultCut.bonusIncluded === false`)일 때
   * 비교값으로 쓴다. 가산 포함 점수로 비교하면 미적분·과탐 응시자만
   * 선택적으로 과대평가되는 차별적 편향이 생긴다(specs/013 §6.2-b).
   */
  convertedScoreExcludingBonus: number;
  /**
   * 백분위 입결 산출 기준별 학생 지표.
   * 입결이 밝힌 basis 와 같은 방식으로 계산한 값을 비교에 쓴다.
   */
  percentileByBasis: Record<PercentileBasis, number | null>;
  /**
   * 환산점수의 백분위 민감도 (% / 백분위점).
   * 표준점수 반영 대학은 원문만으로 계산할 수 없어 null 이다.
   */
  sensitivity: number | null;
  /** 대학 환산 총점 만점 */
  totalScore: number;
  /** 올해 모집인원 */
  quota: number;
  /** 해당 모집단위의 입결 목록 (연도 무순) */
  results: JeongsiResultEntry[];
}

/** 분류 결과 */
export interface ClassifyResult {
  referenceCut: ResultCut | null;
  /** 전년도 경쟁률. 입결이 없으면 null */
  competitionRate: number | null;
  /** 최근 3개년 컷 추이 */
  cutHistory: { year: ResultYear; cut: number | null }[];
  /** 컷 대비 격차 (환산점수 기준은 총점 대비 %, 백분위 기준은 백분위점) */
  gapRatio: number | null;
  /** 백분위점으로 환산한 격차. 분류의 실제 근거 */
  percentileGap: number | null;
  /** 적용된 컷 변동성 (백분위점) */
  sigma: number;
  tier: AdmissionTier;
  chance: PassChance;
}

/** 모집인원 기반 σ 하한 */
export const sigmaMinByQuota = (quota: number): number =>
  SIGMA_MIN_BY_QUOTA.find((rule) => quota <= rule.maxQuota)?.sigma ??
  SIGMA_MIN_BY_QUOTA[SIGMA_MIN_BY_QUOTA.length - 1].sigma;

/** 1 백분위점이 몇 점(해당 지표 단위)인지 */
const pointsPerPercentile = (
  metric: ResultMetric,
  sensitivity: number,
  totalScore: number
): number => (metric === "percentile" ? 1 : (sensitivity * totalScore) / 100);

/** 입결 1건에서 지표가 맞는 컷을 우선순위대로 뽑는다 */
const pickCutEntry = (
  entry: JeongsiResultEntry,
  metric?: ResultMetric
): { kind: CutKind; cut: ResultCut } | null => {
  for (const kind of CUT_PRIORITY) {
    const cut = entry[kind];
    if (!cut || !Number.isFinite(cut.value) || cut.value <= 0) {
      continue;
    }
    if (metric && cut.metric !== metric) {
      continue;
    }
    return { kind, cut };
  }
  return null;
};

/** 최신 학년도 우선으로 정렬한 입결 */
const byLatestYear = (results: JeongsiResultEntry[]): JeongsiResultEntry[] =>
  [...results].sort((a, b) => b.admissionYear - a.admissionYear);

/**
 * 비교 기준 지표.
 * 최신 학년도에 공개된 컷의 지표를 따른다. 입결마다 지표가 섞여
 * 있어도 한 모집단위 안에서는 하나로 통일한다.
 */
export const pickReferenceMetric = (
  results: JeongsiResultEntry[]
): ResultMetric | null => {
  for (const entry of byLatestYear(results)) {
    const picked = pickCutEntry(entry);
    if (picked) {
      return picked.cut.metric;
    }
  }
  return null;
};

/**
 * 비교 기준이 되는 백분위 산출 기준.
 * 기준 지표와 같은 컷에서 가져온다. 미지정이면 국·수·탐 단순평균.
 */
export const pickReferenceBasis = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): PercentileBasis => {
  for (const entry of byLatestYear(results)) {
    const picked = pickCutEntry(entry, metric);
    if (picked) {
      return picked.cut.basis ?? DEFAULT_PERCENTILE_BASIS;
    }
  }
  return DEFAULT_PERCENTILE_BASIS;
};

/**
 * 기준 컷이 가산점을 포함한 값인지.
 * 미지정이면 포함(true)으로 간주한다 — 공개 입결은 통상 최종 환산
 * 점수 기준이다. percentile 지표 입결은 환산 전 값이라 무관하다.
 */
export const pickReferenceBonusIncluded = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): boolean => {
  for (const entry of byLatestYear(results)) {
    const picked = pickCutEntry(entry, metric);
    if (picked) {
      return picked.cut.bonusIncluded !== false;
    }
  }
  return true;
};

/** 최신 학년도 경쟁률. 없으면 null */
export const pickCompetitionRate = (
  results: JeongsiResultEntry[]
): number | null => {
  const [latest] = byLatestYear(results);
  const rate = latest?.competitionRate;
  if (rate === undefined || !Number.isFinite(rate)) {
    return null;
  }
  return rate;
};

/**
 * 최근 3개년 컷 추이.
 *
 * - 2024·2025·2026 세 해를 항상 원소로 넣는다(길이가 들쭉날쭉하면
 *   차트가 깨진다).
 * - metric 을 주면 그 지표의 컷만 싣는다. 기준과 다른 지표는 같은
 *   축에 올릴 수 없으므로 null 로 둔다.
 */
export const buildCutHistory = (
  results: JeongsiResultEntry[],
  metric?: ResultMetric
): { year: ResultYear; cut: number | null }[] =>
  RESULT_YEARS.map((year) => {
    const entry = results.find((item) => item.admissionYear === year);
    if (!entry) {
      return { year, cut: null };
    }
    return { year, cut: pickCutEntry(entry, metric)?.cut.value ?? null };
  });

interface YearCut {
  year: ResultYear;
  /** 대체 컷 보정을 반영한 값 (기준 지표 단위) */
  value: number;
  kind: CutKind;
}

/** 연도별 기준 컷. cut70 이 아니면 보정해서 낮춘다 */
const collectYearCuts = (
  results: JeongsiResultEntry[],
  metric: ResultMetric,
  unitPerPercentile: number
): YearCut[] => {
  const collected: YearCut[] = [];

  for (const year of RESULT_YEARS) {
    const entry = results.find((item) => item.admissionYear === year);
    if (!entry) {
      continue;
    }

    const picked = pickCutEntry(entry, metric);
    if (!picked) {
      continue;
    }

    collected.push({ year, value: picked.cut.value, kind: picked.kind });
  }

  return collected;
};

/** 3개년 가중평균 (결측 연도는 가중치 재정규화) */
const weightedBaseCut = (yearCuts: YearCut[]): number => {
  const weightSum = yearCuts.reduce(
    (total, item) => total + RESULT_YEAR_WEIGHTS[item.year],
    0
  );
  if (weightSum <= 0) {
    return 0;
  }

  const valueSum = yearCuts.reduce(
    (total, item) => total + item.value * RESULT_YEAR_WEIGHTS[item.year],
    0
  );
  return valueSum / weightSum;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * 추세 보정 (백분위점).
 * 3개년이 모두 있을 때만, 연평균 변화의 절반을 ±0.5점 상한으로 반영.
 * 평균회귀 가능성이 있으므로 저보정이 과보정보다 안전하다.
 */
const trendAdjustment = (
  yearCuts: YearCut[],
  unitPerPercentile: number
): number => {
  if (yearCuts.length < RESULT_YEARS.length) {
    return 0;
  }

  const oldest = yearCuts.find((item) => item.year === 2024);
  const latest = yearCuts.find((item) => item.year === 2026);
  if (!oldest || !latest) {
    return 0;
  }

  const trendInPoints =
    (latest.value - oldest.value) / 2 / Math.max(unitPerPercentile, 1e-9);
  return clamp(trendInPoints, -TREND_CLAMP, TREND_CLAMP) * TREND_FACTOR;
};

/**
 * 모집인원 보정 (백분위점).
 * 모집인원이 늘면 합격선이 내려간다. 효과는 작고, 수시 이월로 매년
 * 10% 내외 흔들리므로 데드존을 둔다.
 */
const quotaAdjustment = (
  quota: number,
  results: JeongsiResultEntry[]
): number => {
  const quotas = results
    .map((entry) => entry.quota)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (quotas.length === 0) {
    return 0;
  }

  const avgQuota =
    quotas.reduce((total, value) => total + value, 0) / quotas.length;
  if (avgQuota <= 0) {
    return 0;
  }

  const change = (quota - avgQuota) / avgQuota;
  if (Math.abs(change) < QUOTA_DEAD_ZONE) {
    return 0;
  }

  return -clamp(change, -QUOTA_CLAMP, QUOTA_CLAMP) * QUOTA_FACTOR;
};

/** 3개년 컷의 표본표준편차 (백분위점). 2개년 이상일 때만 */
const observedSigma = (
  yearCuts: YearCut[],
  unitPerPercentile: number
): number | null => {
  if (yearCuts.length < 2) {
    return null;
  }

  const points = yearCuts.map(
    (item) => item.value / Math.max(unitPerPercentile, 1e-9)
  );
  const mean =
    points.reduce((total, value) => total + value, 0) / points.length;
  const variance =
    points.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (points.length - 1);
  return Math.sqrt(variance);
};

/** percentileGap 과 σ 로 tier 를 결정한다 */
export const classifyByPercentileGap = (
  percentileGap: number,
  sigma: number
): AdmissionTier => {
  if (percentileGap >= TIER_THRESHOLDS.안정 * sigma) {
    return "안정";
  }
  if (percentileGap >= TIER_THRESHOLDS.적정 * sigma) {
    return "적정";
  }
  if (percentileGap >= TIER_THRESHOLDS.상향 * sigma) {
    return "상향";
  }
  return "지원불가";
};

/** tier 내부를 percentileGap 으로 쪼개 chance 를 정한다 */
export const chanceFor = (
  tier: AdmissionTier,
  percentileGap: number,
  sigma: number
): PassChance => {
  if (tier === "안정") {
    return "높음";
  }
  if (tier === "지원불가") {
    return "매우낮음";
  }
  if (tier === "적정") {
    return percentileGap >= CHANCE_THRESHOLDS.적정상단 * sigma
      ? "높음"
      : "보통";
  }
  return percentileGap >=
    Math.min(CHANCE_THRESHOLDS.상향상단 * sigma, CHANCE_FLOOR_POINTS)
    ? "낮음"
    : "매우낮음";
};

/** 입결이 전혀 없을 때의 결과. 컷을 추정하지 않는다 */
const classifyWithoutResults = (input: ClassifyInput): ClassifyResult => {
  const sigma = sigmaMinByQuota(input.quota);
  const base = {
    referenceCut: null,
    competitionRate: null,
    cutHistory: buildCutHistory([]),
    gapRatio: null,
    sigma,
  };

  // 입결이 없으면 추정 컷을 만들지 않는다. analyze 는 이런 모집단위를
  // 후보에 넣지 않는다.
  return {
    ...base,
    percentileGap: null,
    tier: UNKNOWN_CUT_TIER,
    chance: UNKNOWN_CUT_CHANCE,
  };
};

/**
 * 입결 대비 학생 위치를 분류한다.
 *
 * 흐름(specs/013 §3.4):
 *   1. 기준 지표 결정 → 연도별 컷 수집(대체 컷은 보정)
 *   2. 3개년 가중평균 → baseCut
 *   3. 추세 보정 → 4. 모집인원 보정 → refCut 확정
 *   5. gapRatio / percentileGap 산출
 *   6. σ 산출 → tier / chance
 */
export const classifyPlan = (input: ClassifyInput): ClassifyResult => {
  const metric = pickReferenceMetric(input.results);
  if (!metric) {
    return classifyWithoutResults(input);
  }

  // 환산점수 입결을 백분위점 격차로 바꾸려면 민감도가 필요하다. 민감도를
  // 원문만으로 구할 수 없는 대학(표준점수 반영)은 비교할 수 없는 컷이다.
  // 현재 데이터에서 환산점수 입결로 분류하는 모집단위는 모두 백분위 기반이라 0건.
  if (metric === "convertedScore" && input.sensitivity === null) {
    return classifyWithoutResults(input);
  }
  const sensitivity = input.sensitivity ?? 0;
  const unitPerPercentile = pointsPerPercentile(
    metric,
    sensitivity,
    input.totalScore
  );
  const yearCuts = collectYearCuts(input.results, metric, unitPerPercentile);
  if (yearCuts.length === 0) {
    return classifyWithoutResults(input);
  }

  const baseCut = weightedBaseCut(yearCuts);
  const adjustmentInPoints =
    trendAdjustment(yearCuts, unitPerPercentile) +
    quotaAdjustment(input.quota, input.results);
  const refCutValue = baseCut + adjustmentInPoints * unitPerPercentile;

  // 백분위 입결은 입결이 밝힌 산출 기준과 같은 방식의 학생 값과 비교한다.
  const basis = pickReferenceBasis(input.results, metric);
  // 환산점수 입결은 컷의 가산 포함 여부에 맞춘 학생 값과 비교한다.
  const bonusIncluded = pickReferenceBonusIncluded(input.results, metric);
  const studentValue =
    metric === "percentile"
      ? input.percentileByBasis[basis]
      : bonusIncluded
        ? input.convertedScore
        : input.convertedScoreExcludingBonus;
  // 입결이 밝힌 기준의 학생 값을 원문만으로 구할 수 없으면 비교하지 않는다
  if (studentValue === null) {
    return classifyWithoutResults(input);
  }

  // 환산점수 기준은 총점 대비 %, 백분위 기준은 백분위점 차이.
  const gapRatio =
    metric === "percentile"
      ? roundTo3(studentValue - refCutValue)
      : roundTo3(((studentValue - refCutValue) / input.totalScore) * 100);

  // 백분위 입결은 gapRatio 가 이미 백분위점 단위다. 다시 민감도로
  // 나누면 격차가 과대평가된다(specs/013 §1.2 ②).
  const percentileGap =
    metric === "percentile"
      ? gapRatio
      : roundTo3(gapRatio / Math.max(sensitivity, 1e-9));

  const sigma = Math.min(
    Math.max(
      observedSigma(yearCuts, unitPerPercentile) ?? 0,
      sigmaMinByQuota(input.quota)
    ),
    SIGMA_MAX
  );
  const tier = classifyByPercentileGap(percentileGap, sigma);
  const rawChance = chanceFor(tier, percentileGap, sigma);

  return {
    referenceCut: { metric, value: roundTo3(refCutValue) },
    competitionRate: pickCompetitionRate(input.results),
    cutHistory: buildCutHistory(input.results, metric),
    gapRatio,
    percentileGap,
    sigma: roundTo3(sigma),
    tier,
    chance: rawChance,
  };
};
