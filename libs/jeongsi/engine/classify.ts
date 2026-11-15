// ============================================================
// 상향 / 적정 / 안정 / 지원불가 분류 + 합격 가능성 라벨
//
// 판정 척도는 "판정 격차(gapRatio)" 하나다 (specs/014 B2, 사용자 결정 2026-11-14).
//   - 환산점수 입결: (내 환산점수 − 기준컷) ÷ 만점 × 100  → 만점 대비 %
//   - 백분위 입결:   내 국·수·탐 평균 백분위 − 기준컷       → 백분위점
// 모든 대학에 같은 고정 구간(GAP_BANDS)을 적용한다. 대학마다 다른 변동성(σ)
// 배수를 쓰던 방식은 같은 격차가 대학마다 다른 구분이 되어 설명할 수 없었다.
//
// 임계값은 전부 이 파일 상단 상수로 모아둔다.
// ============================================================

import { roundTo3 } from "./convert-score";

import type {
  AdmissionGroup,
  AdmissionTier,
  JeongsiResultEntry,
  PassChance,
  PercentileBasis,
  ResultCut,
  ResultMetric,
  ResultYear,
  SafeCapReason,
} from "../types";

/**
 * 판정 구간 (판정 격차 단위). 모든 대학에 같다.
 *
 * 실측으로 정했다(사용자 결정 2026-11-14, specs/014 B2). 2025 입결로 만든 기준컷과
 * 2026 실제 70% 컷을, 환산점수 입결이 있고 모집군이 바뀌지 않은 모집단위 302곳에서
 * 견줘(cut-movement.ts, 2026-11-15 재측정), 기준컷 대비
 * 격차가 g 인 학생이 다음 해 컷을 넘은 비율이
 *   상향하한 10%, 적정하한 40%, 안정하한 75%, 안정상한 90% 가 되는 격차다.
 * 상향하한 미만은 지원불가, 안정상한 초과는 성적보다 크게 낮은 곳이라 추천하지 않는다.
 * 데이터를 다시 만들면 classify.test 의 실측 대조 테스트가 이 값을 다시 확인한다.
 */
export const GAP_BANDS = {
  상향하한: -0.4,
  적정하한: 1.7,
  안정하한: 4.0,
  안정상한: 6.3,
} as const;

/**
 * 스나이핑 구간 하한 (판정 격차). 상향하한 미만 ~ 이 값 이상이 스나이핑이다
 * (specs/014 마지막 피드백, 사용자 결정 2026-11-15). 실측(cut-movement) 통과율은
 * 이 구간에서 4~10% 다(SNIPING_PASS_RATE_MIN ~ 상향하한). 합격 가능성이 낮다는
 * 사실을 그대로 밝히고 싣는다.
 */
export const SNIPING_MIN_GAP = -2.0;

/** 스나이핑 하한의 실측 통과율. cut-movement.test 가 데이터와 대조한다 */
export const SNIPING_PASS_RATE_MIN = 0.04;

/**
 * 스나이핑 신호: 2027 최종 모집인원(수시 이월 반영)이 최신 입결 학년도 모집인원보다
 * 이 비율 이상 늘었는지. 2025→2026 실측에서 최종 모집인원이 20% 이상 늘어난 곳(53곳)은
 * 기준컷 −1.0 학생의 다음 해 컷 통과가 23%로, 나머지(4%)보다 높았다.
 * 2027 최종 모집인원은 원문이 "발표전"이면 없어 신호도 없다.
 */
export const FINAL_QUOTA_SIGNAL_RATIO = 0.2;

/** 위 실측의 통과율 (기준컷 −1.0 학생): 신호가 있는 곳 / 나머지 */
export const FINAL_QUOTA_SIGNAL_PASS_RATES = {
  gap: -1.0,
  withSignal: 0.23,
  withoutSignal: 0.04,
} as const;

/**
 * 경쟁률·충원 신호 (2026-11-15 실측, specs/014). 2024→2025 경쟁률 변화와 2025 충원율로
 * 2025→2026 컷 이동을 견줬다(환산점수·같은 군 277곳, 기준컷 −1.0 학생 통과율):
 *   - 경쟁률 30% 이상 상승 + 충원율 100% 이상: 19% (43곳)
 *   - 경쟁률 30% 이상 상승 + 충원율 100% 미만: 7% (41곳)
 *   - 그 외: 4% (193곳)
 * 충원율만 따로 보면 구간별 5~9%로 차이가 없어 단독 신호로 쓰지 않는다.
 * 2027 판단에는 같은 방식으로 2025→2026 경쟁률 변화와 2026 충원율을 쓴다.
 */
export const COMPETITION_SURGE_RATIO = 1.3;
export const FILL_RATE_SIGNAL = 100;

/** 구간 경계가 뜻하는 다음 해 컷 통과 실측 비율 */
export const GAP_BAND_PASS_RATES = {
  상향하한: 0.1,
  적정하한: 0.4,
  안정하한: 0.75,
  안정상한: 0.9,
} as const;

/**
 * 안정으로 매기려면 필요한 입결 학년도 수.
 * 1개년이면 격차가 안정 구간이어도 적정으로 둔다
 * (사용자 결정 2026-11-14: 전년도 하나로 안정이라 단정하지 않는다).
 */
export const MIN_YEARS_FOR_SAFE = 2;

/**
 * 안정으로 매기지 않는 사유 (specs/014 3차 검토).
 * - 1개년 입결: 전년도 하나로 안정이라 단정하지 않는다.
 * - 모집군 변경: 기준컷에 쓴 입결 중 2027 과 다른 군에서 모집한 해가 있다.
 *   군이 바뀌면 경쟁 대학이 달라져 컷을 그대로 옮길 수 없다.
 * - 백분위 입결: 판정 구간의 실측 통과율은 환산점수 입결 모집단위에서 잰 값이다.
 *   백분위 입결로 두 해를 비교할 수 있는 곳은 16곳뿐이라 같은 비율을 쓸 근거가 없다.
 */
export type { SafeCapReason } from "../types";

/** 기준컷에 쓴 입결 중 2027 과 모집군이 다른 학년도 (원문 군) */
export interface PastGroup {
  year: ResultYear;
  group: AdmissionGroup;
}

/**
 * 입결 학년도와 가중치. 2024 입결은 쓸 수 없다 — 백분위 입결은 탐구 처리가
 * 원문에 "미공개"이고, 2024 환산식은 원문에 없어 환산점수 입결이 같은 척도인지
 * 확인할 수 없다(specs/014 B4).
 */
export const RESULT_YEARS: ResultYear[] = [2025, 2026];
export const RESULT_YEAR_WEIGHTS: Record<ResultYear, number> = {
  2026: 0.5,
  2025: 0.3,
  2024: 0.2,
};

/**
 * 모집인원 보정: 과거 평균 대비 ±10% 이내는 무시, 최대 ∓0.48 (판정 격차 단위).
 * 모집인원이 늘면 합격선이 내려가므로 기준컷을 낮춘다.
 */
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

/** 입결이 없을 때의 값. analyze 는 이런 모집단위를 후보에 넣지 않는다 */
export const UNKNOWN_CUT_TIER: AdmissionTier = "적정";
export const UNKNOWN_CUT_CHANCE: PassChance = "보통";

/** 분류 입력 */
export interface ClassifyInput {
  /** 대학 환산식 적용 결과 (가산점 포함) */
  convertedScore: number;
  /**
   * 가산점을 제외한 환산점수.
   * 입결 컷이 가산 제외 기준(`ResultCut.bonusIncluded === false`)일 때 쓴다.
   */
  convertedScoreExcludingBonus: number;
  /** 백분위 입결 산출 기준별 학생 지표 */
  percentileByBasis: Record<PercentileBasis, number | null>;
  /** 대학 환산 총점 만점 */
  totalScore: number;
  /** 올해 모집인원 */
  quota: number;
  /** 해당 모집단위의 입결 목록 (연도 무순) */
  results: JeongsiResultEntry[];
  /** 2027 모집군. 입결 학년도의 원문 군과 비교한다 */
  group: AdmissionGroup;
  /** 2027 최종 모집인원 (원문 "발표전"이면 undefined) */
  finalQuota?: number;
}

/** 2027 최종 모집인원과 최신 입결 학년도 모집인원 (스나이핑 신호) */
export interface FinalQuotaChange {
  previousYear: ResultYear;
  previousQuota: number;
  finalQuota: number;
  /** (최종 − 이전) ÷ 이전 */
  ratio: number;
}

/** 모집인원 변화와 기준컷 보정값 (화면 표시용) */
export interface QuotaChange {
  /** 2027 모집인원 */
  currentQuota: number;
  /** 입결 학년도 모집인원 평균 */
  pastAverageQuota: number;
  /** 기준컷에 더한 값 (판정 지표 단위). 0 이면 보정 없음 */
  cutAdjustment: number;
}

/** 최신 입결 학년도의 충원 현황 (표시용, 판정에 쓰지 않는다) */
export interface AdditionalPass {
  year: ResultYear;
  quota: number;
  /** 추가합격 인원 */
  count: number;
}

/**
 * 최신 입결 학년도의 합격자 컷 (판정 지표 단위, 원문 값).
 * 학생 값이 합격자 분포의 어디쯤인지 보여 주는 데 쓴다. 50% 컷은 원문에 없으면 null.
 */
export interface LatestAdmitCuts {
  year: ResultYear;
  cut50: number | null;
  cut70: number;
}

/** 분류 결과 */
export interface ClassifyResult {
  referenceCut: ResultCut | null;
  /** 최신 학년도 경쟁률. 입결이 없으면 null */
  competitionRate: number | null;
  /** 학년도별 70%컷 (RESULT_YEARS 순). 없는 해는 null */
  cutHistory: { year: ResultYear; cut: number | null }[];
  /** 판정 격차. 환산점수 입결이면 만점 대비 %, 백분위 입결이면 백분위점 */
  gapRatio: number | null;
  /** 판정 지표 단위의 차이 (환산점수 점 또는 백분위점) */
  gapPoints: number | null;
  /** 기준컷 산출에 쓴 학년도 */
  resultYears: ResultYear[];
  quotaChange: QuotaChange | null;
  additionalPass: AdditionalPass | null;
  /** 격차는 안정 구간이지만 safeCapReasons 때문에 적정으로 낮췄는지 */
  safeCapped: boolean;
  /** 안정으로 매기지 않는 사유 (격차와 무관하게 해당하면 모두 담는다) */
  safeCapReasons: SafeCapReason[];
  /** 기준컷에 쓴 입결 중 2027 과 모집군이 다른 학년도 */
  pastGroups: PastGroup[];
  /** 2027 최종 모집인원 변화. 최종 인원이 아직 없으면 null */
  finalQuotaChange: FinalQuotaChange | null;
  /** 추천 범위(상향하한 ~ 안정상한) 안인지 */
  withinRecommendRange: boolean;
  /** 판정 지표로 본 학생 값 (기준컷과 같은 척도) */
  studentValue: number | null;
  /** 최신 입결 학년도 합격자 50%·70% 컷 */
  latestAdmitCuts: LatestAdmitCuts | null;
  tier: AdmissionTier;
  chance: PassChance;
}

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

/** 쓸 수 있는 학년도의 입결만, 최신 학년도 우선으로 */
const usableByLatestYear = (
  results: JeongsiResultEntry[]
): JeongsiResultEntry[] =>
  results
    .filter((entry) => RESULT_YEARS.includes(entry.admissionYear))
    .sort((a, b) => b.admissionYear - a.admissionYear);

/**
 * 비교 기준 지표.
 * 최신 학년도에 공개된 컷의 지표를 따른다. 한 모집단위 안에서는 하나로 통일한다.
 */
export const pickReferenceMetric = (
  results: JeongsiResultEntry[]
): ResultMetric | null => {
  for (const entry of usableByLatestYear(results)) {
    const picked = pickCutEntry(entry);
    if (picked) {
      return picked.cut.metric;
    }
  }
  return null;
};

/** 비교 기준이 되는 백분위 산출 기준. 미지정이면 국·수·탐 단순평균 */
export const pickReferenceBasis = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): PercentileBasis => {
  for (const entry of usableByLatestYear(results)) {
    const picked = pickCutEntry(entry, metric);
    if (picked) {
      return picked.cut.basis ?? DEFAULT_PERCENTILE_BASIS;
    }
  }
  return DEFAULT_PERCENTILE_BASIS;
};

/**
 * 기준 컷이 가산점을 포함한 값인지.
 * 미지정이면 포함(true)으로 간주한다 — 공개 입결은 통상 최종 환산 점수 기준이다.
 */
export const pickReferenceBonusIncluded = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): boolean => {
  for (const entry of usableByLatestYear(results)) {
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
  const [latest] = usableByLatestYear(results);
  const rate = latest?.competitionRate;
  if (rate === undefined || !Number.isFinite(rate)) {
    return null;
  }
  return rate;
};

/**
 * 학년도별 70%컷. RESULT_YEARS 의 해를 항상 원소로 넣는다.
 * metric 을 주면 그 지표의 컷만 싣고, 다른 지표의 컷은 같은 축에 올릴 수 없어 null 로 둔다.
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
  value: number;
}

/** 연도별 기준 컷 (기준 지표의 70%컷만) */
const collectYearCuts = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): YearCut[] =>
  RESULT_YEARS.flatMap((year) => {
    const entry = results.find((item) => item.admissionYear === year);
    const picked = entry ? pickCutEntry(entry, metric) : null;
    return picked ? [{ year, value: picked.cut.value }] : [];
  });

/** 학년도 가중평균 (결측 연도는 가중치 재정규화) */
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
 * 모집인원 보정 (판정 격차 단위).
 * 모집인원이 늘면 합격선이 내려간다. 효과는 작고, 수시 이월로 매년
 * 10% 내외 흔들리므로 데드존을 둔다.
 */
export const quotaAdjustmentInGap = (
  quota: number,
  pastAverageQuota: number
): number => {
  if (pastAverageQuota <= 0) {
    return 0;
  }
  const change = (quota - pastAverageQuota) / pastAverageQuota;
  if (Math.abs(change) < QUOTA_DEAD_ZONE) {
    return 0;
  }
  return -clamp(change, -QUOTA_CLAMP, QUOTA_CLAMP) * QUOTA_FACTOR;
};

/** 입결 학년도 모집인원 평균. 없으면 null */
const averagePastQuota = (results: JeongsiResultEntry[]): number | null => {
  const quotas = results
    .filter((entry) => RESULT_YEARS.includes(entry.admissionYear))
    .map((entry) => entry.quota)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (quotas.length === 0) {
    return null;
  }
  return quotas.reduce((total, value) => total + value, 0) / quotas.length;
};

/** 최신 입결 학년도의 추가합격 인원 */
const pickAdditionalPass = (
  results: JeongsiResultEntry[]
): AdditionalPass | null => {
  const [latest] = usableByLatestYear(results);
  if (!latest || latest.additionalPassCount === undefined) {
    return null;
  }
  return {
    year: latest.admissionYear,
    quota: latest.quota,
    count: latest.additionalPassCount,
  };
};

/** 최신 입결 학년도의 50%·70% 컷 (같은 지표만) */
const pickLatestAdmitCuts = (
  results: JeongsiResultEntry[],
  metric: ResultMetric
): LatestAdmitCuts | null => {
  for (const entry of usableByLatestYear(results)) {
    const picked = pickCutEntry(entry, metric);
    if (!picked) continue;
    const cut50 =
      entry.cut50 &&
      entry.cut50.metric === metric &&
      Number.isFinite(entry.cut50.value) &&
      entry.cut50.value > 0
        ? entry.cut50.value
        : null;
    return { year: entry.admissionYear, cut50, cut70: picked.cut.value };
  }
  return null;
};

/** 판정 격차로 구분을 정한다 (입결 학년도 수 제한 전) */
export const tierForGap = (gap: number): AdmissionTier => {
  if (gap >= GAP_BANDS.안정하한) {
    return "안정";
  }
  if (gap >= GAP_BANDS.적정하한) {
    return "적정";
  }
  if (gap >= GAP_BANDS.상향하한) {
    return "상향";
  }
  if (gap >= SNIPING_MIN_GAP) {
    return "소신";
  }
  return "지원불가";
};

/**
 * 구분으로 합격 가능성을 정한다. 구간이 실측 통과율로 정해져 있어
 * 안정 높음(75% 이상), 적정 보통(40~75%), 상향 낮음(10~40%),
 * 스나이핑 매우낮음(약 4~10%) 이다.
 */
export const chanceFor = (tier: AdmissionTier): PassChance => {
  if (tier === "안정") {
    return "높음";
  }
  if (tier === "적정") {
    return "보통";
  }
  if (tier === "상향") {
    return "낮음";
  }
  return "매우낮음";
};

/** 추천 범위(상향하한 ~ 안정상한) 안인지 */
export const isWithinRecommendRange = (gap: number): boolean =>
  gap >= GAP_BANDS.상향하한 && gap <= GAP_BANDS.안정상한;

/** 기준컷에 쓴 학년도 중 원문 모집군이 2027 군과 다른 해 */
const collectPastGroups = (
  results: JeongsiResultEntry[],
  usedYears: ResultYear[],
  currentGroup: AdmissionGroup
): PastGroup[] =>
  usedYears.flatMap((year) => {
    const entry = results.find((item) => item.admissionYear === year);
    return entry && entry.group !== currentGroup
      ? [{ year, group: entry.group }]
      : [];
  });

/** 최신 입결 학년도 모집인원 대비 2027 최종 모집인원 */
const pickFinalQuotaChange = (
  results: JeongsiResultEntry[],
  finalQuota: number | undefined
): FinalQuotaChange | null => {
  if (finalQuota === undefined) {
    return null;
  }
  const [latest] = [...results]
    .filter((entry) => RESULT_YEARS.includes(entry.admissionYear))
    .sort((a, b) => b.admissionYear - a.admissionYear);
  if (!latest || latest.quota <= 0) {
    return null;
  }
  return {
    previousYear: latest.admissionYear,
    previousQuota: latest.quota,
    finalQuota,
    ratio: roundTo3((finalQuota - latest.quota) / latest.quota),
  };
};

/** 입결이 없을 때의 결과. 컷을 추정하지 않는다 */
const classifyWithoutResults = (): ClassifyResult => ({
  referenceCut: null,
  competitionRate: null,
  cutHistory: buildCutHistory([]),
  gapRatio: null,
  gapPoints: null,
  resultYears: [],
  quotaChange: null,
  additionalPass: null,
  safeCapped: false,
  safeCapReasons: [],
  pastGroups: [],
  finalQuotaChange: null,
  withinRecommendRange: false,
  studentValue: null,
  latestAdmitCuts: null,
  tier: UNKNOWN_CUT_TIER,
  chance: UNKNOWN_CUT_CHANCE,
});

/**
 * 입결 대비 학생 위치를 분류한다.
 *
 *   1. 기준 지표 결정(최신 학년도 컷의 지표) → 학년도별 70%컷 수집
 *   2. 학년도 가중평균 + 모집인원 보정 → 기준컷
 *   3. 같은 지표의 학생 값과 비교 → 판정 격차
 *   4. 고정 구간으로 구분·합격 가능성. 안정 제한 사유(SafeCapReason)가
 *      있으면 안정 대신 적정
 */
export const classifyPlan = (input: ClassifyInput): ClassifyResult => {
  const metric = pickReferenceMetric(input.results);
  if (!metric) {
    return classifyWithoutResults();
  }
  const yearCuts = collectYearCuts(input.results, metric);
  if (yearCuts.length === 0) {
    return classifyWithoutResults();
  }

  // 판정 격차 1 의 지표 단위 크기 (백분위 1점, 또는 만점의 1%)
  const unitPerGap = metric === "percentile" ? 1 : input.totalScore / 100;

  const pastAverageQuota = averagePastQuota(input.results);
  const cutAdjustment =
    pastAverageQuota === null
      ? 0
      : quotaAdjustmentInGap(input.quota, pastAverageQuota) * unitPerGap;
  const refCutValue = weightedBaseCut(yearCuts) + cutAdjustment;

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
  if (studentValue === null) {
    return classifyWithoutResults();
  }

  const gapPoints = roundTo3(studentValue - refCutValue);
  const gapRatio = roundTo3(gapPoints / unitPerGap);

  const usedYears = yearCuts.map((item) => item.year);
  const pastGroups = collectPastGroups(input.results, usedYears, input.group);
  const safeCapReasons: SafeCapReason[] = [
    ...(yearCuts.length < MIN_YEARS_FOR_SAFE ? ["1개년 입결" as const] : []),
    ...(pastGroups.length > 0 ? ["모집군 변경" as const] : []),
    ...(metric === "percentile" ? ["백분위 입결" as const] : []),
  ];
  const bandTier = tierForGap(gapRatio);
  const safeCapped = bandTier === "안정" && safeCapReasons.length > 0;
  const tier: AdmissionTier = safeCapped ? "적정" : bandTier;

  return {
    referenceCut: { metric, value: roundTo3(refCutValue) },
    competitionRate: pickCompetitionRate(input.results),
    cutHistory: buildCutHistory(input.results, metric),
    gapRatio,
    gapPoints,
    resultYears: usedYears,
    quotaChange:
      pastAverageQuota === null
        ? null
        : {
            currentQuota: input.quota,
            pastAverageQuota: roundTo3(pastAverageQuota),
            cutAdjustment: roundTo3(cutAdjustment),
          },
    additionalPass: pickAdditionalPass(input.results),
    safeCapped,
    safeCapReasons,
    pastGroups,
    finalQuotaChange: pickFinalQuotaChange(input.results, input.finalQuota),
    withinRecommendRange: isWithinRecommendRange(gapRatio),
    studentValue: roundTo3(studentValue),
    latestAdmitCuts: pickLatestAdmitCuts(input.results, metric),
    tier,
    chance: chanceFor(tier),
  };
};
