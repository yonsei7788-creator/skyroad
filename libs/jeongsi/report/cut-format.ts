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
  percentile: "국·수·탐 평균 백분위",
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
