// ============================================================
// 표준점수 ↔ 백분위 정합성 점검
//
// 수능 표준점수는 영역별로 정해진 평균·표준편차를 갖는 정규분포에
// 가깝다. 표준점수로부터 기대 백분위를 추정해 실제 입력 백분위와
// 크게 어긋나면 입력 실수로 보고 "경고"를 띄운다. (차단하지 않음)
// ============================================================

import {
  INQUIRY_SCORE_DISTRIBUTION,
  MAIN_SCORE_DISTRIBUTION,
  SCORE_MISMATCH_WARNING_THRESHOLD,
} from "./options";

/** 표준정규분포 누적분포함수 (Abramowitz & Stegun 26.2.17 근사) */
const calculateNormalCdf = (z: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const density = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const tail =
    density *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - tail : tail;
};

type ScoreAreaKind = "main" | "inquiry";

/** 표준점수로부터 기대 백분위(0~100)를 추정한다 */
export const estimatePercentile = (
  standardScore: number,
  kind: ScoreAreaKind
): number => {
  const { mean, deviation } =
    kind === "main" ? MAIN_SCORE_DISTRIBUTION : INQUIRY_SCORE_DISTRIBUTION;
  return calculateNormalCdf((standardScore - mean) / deviation) * 100;
};

/**
 * 표준점수와 백분위가 심하게 어긋나는지 판정한다.
 * 어긋나면 사용자에게 보여줄 경고 문구를, 정상이면 null 을 반환한다.
 */
export const checkScoreConsistency = (
  label: string,
  standardScore: number,
  percentile: number,
  kind: ScoreAreaKind
): string | null => {
  const expected = estimatePercentile(standardScore, kind);
  const gap = Math.abs(expected - percentile);

  if (gap < SCORE_MISMATCH_WARNING_THRESHOLD) {
    return null;
  }

  return `${label} 표준점수 ${standardScore}점은 보통 백분위 ${Math.round(
    expected
  )} 안팎입니다. 입력하신 백분위 ${percentile}과(와) 차이가 커요. 성적표를 한 번 더 확인해주세요.`;
};
