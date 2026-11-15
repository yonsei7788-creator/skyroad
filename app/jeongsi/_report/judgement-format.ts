import {
  GAP_BANDS,
  GAP_BAND_PASS_RATES,
  SNIPING_MIN_GAP,
  SNIPING_PASS_RATE_MIN,
} from "@/libs/jeongsi/engine/classify";
import {
  describePastGroups,
  describeSafeCapReasons,
} from "@/libs/jeongsi/report/safe-cap";
import type { UnitJudgement } from "@/libs/jeongsi/report-types";
import type { ResultMetric } from "@/libs/jeongsi/types";

/**
 * 판정 근거 표기 — PART 3·5 가 같은 함수로 같은 문자열을 만든다(specs/014 A2).
 */

export const METRIC_NAME: Record<ResultMetric, string> = {
  convertedScore: "환산점수",
  percentile: "평균 백분위",
};

/** 구간 판정 단위 */
export const GAP_UNIT_NAME: Record<ResultMetric, string> = {
  convertedScore: "만점 대비 %",
  percentile: "백분위점",
};

export const formatJudgementValue = (value: number): string => value.toFixed(1);

/** 부호 있는 차이 (지표 단위). 예) "+12.3점" */
export const formatGapPoints = (gapPoints: number): string => {
  const rounded = Math.round(gapPoints * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toFixed(1)}점`;
};

/** 부호 있는 구간 판정 격차. 예) "+1.2" */
export const formatGapRatio = (gapRatio: number): string => {
  const rounded = Math.round(gapRatio * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${Math.abs(rounded).toFixed(1)}`;
};

/**
 * 기준컷에 쓴 입결 학년도와, 2027 과 다른 군에서 모집한 해(원문 군).
 * 예) "2025·2026 입결", "2026 입결 1개년 · 2026 입결은 다군 모집 때 값"
 */
export const formatResultYears = (judgement: UnitJudgement): string => {
  const years =
    judgement.resultYears.length === 1
      ? `${judgement.resultYears[0]} 입결 1개년`
      : `${judgement.resultYears.join(", ")} 입결`;
  const regrouped = describePastGroups(judgement.pastGroups ?? []);
  return regrouped ? `${years}, ${regrouped}` : years;
};

/** 안정 대신 적정으로 둔 사유. 이전 버전 리포트(사유 없음)는 1개년 입결이었다 */
export const formatSafeCapReason = (judgement: UnitJudgement): string =>
  describeSafeCapReasons(judgement) ??
  `입결이 ${judgement.resultYears.join(", ")} 한 해뿐`;

/** 격차 위치 막대의 축 (모든 대학 공통 고정 구간) */
export const GAP_AXIS = {
  min: SNIPING_MIN_GAP,
  max: GAP_BANDS.안정상한,
} as const;

/** 축 위 위치 (0~100%) */
export const toAxisPercent = (gapRatio: number): number => {
  const clamped = Math.min(GAP_AXIS.max, Math.max(GAP_AXIS.min, gapRatio));
  return ((clamped - GAP_AXIS.min) / (GAP_AXIS.max - GAP_AXIS.min)) * 100;
};

/** 구간 경계의 축 위 위치 */
export const BAND_EDGES = {
  상향: toAxisPercent(GAP_BANDS.상향하한),
  적정: toAxisPercent(GAP_BANDS.적정하한),
  안정: toAxisPercent(GAP_BANDS.안정하한),
} as const;

const formatBound = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}`;

const percentOf = (rate: number): string => `${Math.round(rate * 100)}%`;

/** 실측 통과율 표기. 예) "62%" */
export const formatPassRate = (rate: number): string => percentOf(rate);

/** 판정 기준 표 (PART 3·5 공통). 엔진 상수에서 만든다 */
export const JUDGEMENT_CRITERIA: {
  tier: string;
  range: string;
  chance: string;
}[] = [
  {
    tier: "상향",
    range: `${formatBound(GAP_BANDS.상향하한)} 이상 ${formatBound(GAP_BANDS.적정하한)} 미만`,
    chance: `낮음 (실측 ${percentOf(GAP_BAND_PASS_RATES.상향하한)}~${percentOf(GAP_BAND_PASS_RATES.적정하한)})`,
  },
  {
    tier: "적정",
    range: `${formatBound(GAP_BANDS.적정하한)} 이상 ${formatBound(GAP_BANDS.안정하한)} 미만`,
    chance: `보통 (실측 ${percentOf(GAP_BAND_PASS_RATES.적정하한)}~${percentOf(GAP_BAND_PASS_RATES.안정하한)})`,
  },
  {
    tier: "안정",
    range: `${formatBound(GAP_BANDS.안정하한)} 이상 ${formatBound(GAP_BANDS.안정상한)} 이하`,
    chance: `높음 (실측 ${percentOf(GAP_BAND_PASS_RATES.안정하한)}~${percentOf(GAP_BAND_PASS_RATES.안정상한)})`,
  },
  {
    tier: "스나이핑",
    range: `${formatBound(SNIPING_MIN_GAP)} 이상 ${formatBound(GAP_BANDS.상향하한)} 미만`,
    chance: `매우낮음 (실측 ${percentOf(SNIPING_PASS_RATE_MIN)}~${percentOf(GAP_BAND_PASS_RATES.상향하한)})`,
  },
];

/**
 * 최신 학년도 합격자 컷과 견준 내 위치 (원문 50%·70% 컷과의 비교만, 추정 없음).
 * 50% 컷은 합격자 가운데 위치, 70% 컷은 합격자 상위 70% 지점이다.
 */
export const describeAdmitPosition = (
  judgement: UnitJudgement
): { short: string; long: string } | null => {
  const cuts = judgement.latestAdmitCuts;
  if (!cuts) return null;
  const value = judgement.studentValue;
  const cut70 = formatJudgementValue(cuts.cut70);
  const head = `${cuts.year} 최종등록자`;
  if (cuts.cut50 !== null && value >= cuts.cut50) {
    return {
      short: `${cuts.year} 합격자 50% 컷 이상`,
      long: `${head} 50% 컷 ${formatJudgementValue(cuts.cut50)} 이상 — 그해 합격자 가운데보다 위`,
    };
  }
  if (value >= cuts.cut70) {
    return {
      short:
        cuts.cut50 === null
          ? `${cuts.year} 합격자 70% 컷 이상`
          : `${cuts.year} 합격자 50~70% 컷 사이`,
      long:
        cuts.cut50 === null
          ? `${head} 70% 컷 ${cut70} 이상 (50% 컷은 미공개)`
          : `${head} 50% 컷 ${formatJudgementValue(cuts.cut50)}과 70% 컷 ${cut70} 사이`,
    };
  }
  return {
    short: `${cuts.year} 합격자 70% 컷 아래`,
    long: `${head} 70% 컷 ${cut70}보다 ${formatGapPoints(value - cuts.cut70).replace("−", "")} 낮음`,
  };
};
