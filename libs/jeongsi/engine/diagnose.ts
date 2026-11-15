// ============================================================
// PART 1 — 성적 종합 분석 (ScoreDiagnosis)
//
// 국어·수학·탐구의 백분위로 순위와 편차를 구하고 강점·약점 영역을
// 판정한다. 영어는 원문에 등급만 있어 백분위·순위·편차를 만들지 않는다
// (등급을 백분위로 바꾸는 표는 원문 값이 아니다 — 사용자 결정 2026-11-05).
// AI 는 이 수치를 받아 문장만 쓴다.
// ============================================================

import { roundTo3 } from "./convert-score";

import type {
  AreaStanding,
  ScoreArea,
  ScoreDiagnosis,
  SuneungScore,
} from "../types";

/**
 * 강점·약점 판정 기준 (국·수·탐 평균 백분위 대비 편차, 단위: 백분위).
 * 수능 백분위는 상위권에서 1~2점 차이가 크므로, 영역 간 전략적
 * 차이로 볼 만한 최소 폭을 5로 둔다.
 */
export const STRENGTH_DEVIATION = 5;
export const WEAKNESS_DEVIATION = -5;

/** 화면·프롬프트 표기용 영역명 */
export const AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

interface AreaInput {
  area: ScoreArea;
  /** 영어는 원문에 백분위가 없어 null */
  percentile: number | null;
  standardScore: number | null;
}

/** 백분위가 있는 영역의 판정 결과 */
type ScoredStanding = AreaStanding & {
  percentile: number;
  deviation: number;
};

const average = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

/** 백분위가 같으면 같은 순위를 준다 (1이 가장 강함) */
const rankOf = (percentile: number, allPercentiles: number[]): number =>
  allPercentiles.filter((value) => value > percentile).length + 1;

/** 네 영역의 백분위·표준점수를 같은 형태로 모은다 */
const collectAreas = (score: SuneungScore): AreaInput[] => {
  const inquiryPercentile = average([
    score.inquiry1.percentile,
    score.inquiry2.percentile,
  ]);
  const inquiryStandard = average([
    score.inquiry1.standardScore,
    score.inquiry2.standardScore,
  ]);

  return [
    {
      area: "korean",
      percentile: score.korean.percentile,
      standardScore: score.korean.standardScore,
    },
    {
      area: "math",
      percentile: score.math.percentile,
      standardScore: score.math.standardScore,
    },
    {
      // 영어는 원문에 등급만 있다. 백분위를 만들지 않는다.
      area: "english",
      percentile: null,
      standardScore: null,
    },
    {
      area: "inquiry",
      percentile: roundTo3(inquiryPercentile),
      standardScore: roundTo3(inquiryStandard),
    },
  ];
};

/** 편차 기준을 넘지 못하면 최상위/최하위 영역 하나를 대표로 둔다 */
const pickStrengths = (standings: ScoredStanding[]): ScoreArea[] => {
  // 리포트는 첫 영역을 대표 강점으로 쓰므로 편차가 큰 순으로 둔다
  const picked = standings
    .filter((standing) => standing.deviation >= STRENGTH_DEVIATION)
    .sort((a, b) => b.deviation - a.deviation)
    .map((standing) => standing.area);
  if (picked.length > 0) {
    return picked;
  }

  const [best] = [...standings].sort((a, b) => b.percentile - a.percentile);
  return best ? [best.area] : [];
};

const pickWeaknesses = (standings: ScoredStanding[]): ScoreArea[] => {
  // 리포트는 첫 영역을 대표 약점으로 쓰므로 편차가 작은(더 낮은) 순으로 둔다.
  // 영역 순서 그대로 두면 수학 52점보다 국어 66점이 대표 약점이 됐다(실측).
  const picked = standings
    .filter((standing) => standing.deviation <= WEAKNESS_DEVIATION)
    .sort((a, b) => a.deviation - b.deviation)
    .map((standing) => standing.area);
  if (picked.length > 0) {
    return picked;
  }

  const [worst] = [...standings].sort((a, b) => a.percentile - b.percentile);
  return worst ? [worst.area] : [];
};

/**
 * 성적 진단 산출.
 *
 * - AreaStanding.deviation 은 "국·수·탐 평균 백분위"(= averagePercentile)
 *   대비 편차다. 영어는 백분위가 없어 순위·편차가 null 이다.
 */
export const diagnoseScore = (score: SuneungScore): ScoreDiagnosis => {
  const inputs = collectAreas(score);
  const scoredPercentiles = inputs.flatMap((input) =>
    input.percentile === null ? [] : [input.percentile]
  );
  const scoredMean = average(scoredPercentiles);

  const areas: AreaStanding[] = inputs.map((input) =>
    input.percentile === null
      ? { ...input, rank: null, deviation: null }
      : {
          ...input,
          rank: rankOf(input.percentile, scoredPercentiles),
          deviation: roundTo3(input.percentile - scoredMean),
        }
  );
  const scored = areas.filter(
    (standing): standing is ScoredStanding => standing.percentile !== null
  );

  const inquiryPercentiles = [
    score.inquiry1.percentile,
    score.inquiry2.percentile,
  ];
  const averagePercentile = roundTo3(
    average([
      score.korean.percentile,
      score.math.percentile,
      average(inquiryPercentiles),
    ])
  );

  const totalStandardScore = roundTo3(
    score.korean.standardScore +
      score.math.standardScore +
      score.inquiry1.standardScore +
      score.inquiry2.standardScore
  );

  return {
    areas,
    averagePercentile,
    totalStandardScore,
    strengths: pickStrengths(scored),
    weaknesses: pickWeaknesses(scored),
  };
};
