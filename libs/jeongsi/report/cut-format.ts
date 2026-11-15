// ============================================================
// 입결 컷 표기 — 프롬프트와 렌더러가 같은 단위 표현을 쓰도록 모은다.
//
// 실데이터 입결은 대부분 국·수·탐 평균 백분위, 일부만 대학 환산점수다.
// 숫자만 적으면 "환산점수 659 vs 컷 96" 처럼 단위가 다른 값을 비교하게
// 된다. 컷 값에는 항상 단위를 붙이고, 학생 값도 같은 지표로 적는다.
// ============================================================

import type { CutComparison } from "../report-types";
import type { ResultMetric } from "../types";

/** 컷 지표 이름 */
export const CUT_METRIC_LABEL: Record<ResultMetric, string> = {
  percentile: "국어, 수학, 탐구 평균 백분위",
  convertedScore: "대학 환산점수",
};

/** 같은 지표로 본 학생 값의 이름 */
export const STUDENT_CUT_VALUE_LABEL: Record<ResultMetric, string> = {
  percentile: "내 평균 백분위",
  convertedScore: "내 환산점수",
};

/** 단위를 붙인 값. 백분위는 "백분위 96.1", 환산점수는 "566.9점" */
export const formatCutValue = (metric: ResultMetric, value: number): string =>
  metric === "percentile"
    ? `백분위 ${value.toFixed(1)}`
    : `${value.toFixed(1)}점`;

/** 같은 지표의 학생 값. "내 평균 백분위 94.8" / "내 환산점수 911.7점" */
export const formatStudentCutValue = (comparison: CutComparison): string => {
  const label = STUDENT_CUT_VALUE_LABEL[comparison.metric];
  return comparison.metric === "percentile"
    ? `${label} ${comparison.studentValue.toFixed(1)}`
    : `${label} ${formatCutValue(comparison.metric, comparison.studentValue)}`;
};

/** 컷 대비 차이. 백분위는 백분위점, 환산점수는 점 */
export const formatCutDifference = (comparison: CutComparison): string => {
  const diff = comparison.studentValue - comparison.referenceCut;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  const unit = comparison.metric === "percentile" ? "백분위점" : "점";
  return `${sign}${Math.abs(diff).toFixed(1)}${unit}`;
};

// ─── 판정 격차 표기 ───
//
// 판정 격차는 판정 지표의 단위로 말한다(specs/014 B1·D1). 환산점수 입결이면
// "환산점수 12.3점", 백분위 입결이면 "평균 백분위 1.3점"이다. 대학 사이의
// 정렬·구간 판정에는 단위를 맞춘 ratio(만점 대비 % 또는 백분위점)를 쓴다.

/** 모집단위 하나의 판정 격차 */
export interface GapValue {
  /** 판정 격차 (구간 판정 단위: 만점 대비 % 또는 백분위점) */
  ratio: number;
  /** 판정 지표 단위의 차이 (환산점수 점 또는 백분위점) */
  points: number;
  metric: ResultMetric;
}

/** 소수 첫째 자리 반올림 (화면과 같은 자릿수) */
export const roundGapForDisplay = (value: number): number =>
  Math.round(value * 10) / 10;

/** 엔진 평가에서 판정 격차를 꺼낸다. 입결이 없으면 null */
export const gapValueOf = (evaluation: {
  gapRatio: number | null;
  gapPoints: number | null;
  referenceCut: { metric: ResultMetric } | null;
}): GapValue | null =>
  evaluation.gapRatio === null ||
  evaluation.gapPoints === null ||
  evaluation.referenceCut === null
    ? null
    : {
        ratio: evaluation.gapRatio,
        points: evaluation.gapPoints,
        metric: evaluation.referenceCut.metric,
      };

/** 격차 크기 표기. 예) "환산점수 12.3점", "평균 백분위 1.3점" */
export const formatGapAmount = (gap: GapValue): string => {
  const magnitude = Math.abs(roundGapForDisplay(gap.points)).toFixed(1);
  return gap.metric === "percentile"
    ? `평균 백분위 ${magnitude}점`
    : `환산점수 ${magnitude}점`;
};

/** 부호 있는 격차 표기. 예) "환산점수 +12.3점", "평균 백분위 −1.3점" */
export const formatSignedGap = (gap: GapValue): string => {
  const rounded = roundGapForDisplay(gap.points);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  const magnitude = Math.abs(rounded).toFixed(1);
  return gap.metric === "percentile"
    ? `평균 백분위 ${sign}${magnitude}점`
    : `환산점수 ${sign}${magnitude}점`;
};

/** 판정 격차 단위 이름 */
export const GAP_RATIO_UNIT: Record<ResultMetric, string> = {
  percentile: "백분위점",
  convertedScore: "% (만점 대비)",
};
