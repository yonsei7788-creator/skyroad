// ============================================================
// 대학별 실제 점수 설명 (specs/014 D1·D2)
//
// "국어 강점·수학 약점" 같은 영역 서술 대신, 대학 환산식을 내 성적에 그대로
// 적용했을 때 몇 점을 받는지와 그 점수가 어디서 갈리는지를 실제 점수로 쓴다.
// 모든 값은 환산식 계산 결과(ScoreBreakdown)에서 바로 나온다. 추정이 없다.
//
// 영역 구성 득실: 각 영역에서 받은 점수 − (그 영역 만점 × 전체 득점률).
//   모든 영역 성적이 같았을 때와 비교해 반영비율 때문에 더 받거나 덜 받는 점수다.
//   합은 0 이다(반영비율이 점수를 영역 사이에서 옮길 뿐이다).
// ============================================================

import type { ScoreBreakdown, UnitJudgement } from "../report-types.ts";
import type { ScoreArea } from "../types.ts";

const AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

/** 만점 대비 이 비율(%) 미만의 득실은 문장에서 다루지 않는다 */
const MEANINGFUL_PERCENT = 0.1;

const round1 = (value: number): number => Math.round(value * 10) / 10;

const formatPoint = (value: number): string => {
  const rounded = round1(Math.abs(value));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const formatSigned = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : "±"}${formatPoint(value)}`;

const percentOfMax = (points: number, totalScore: number): number =>
  totalScore > 0 ? (points / totalScore) * 100 : 0;

export interface AreaEffect {
  area: ScoreArea;
  ratio: number;
  /** 반영비율 때문에 더 받거나(+) 덜 받는(−) 점수 */
  points: number;
  /** 같은 값의 만점 대비 % */
  percent: number;
}

/** 영역 구성 득실 */
export const computeAreaEffects = (breakdown: ScoreBreakdown): AreaEffect[] => {
  // 영어는 등급 점수표로 환산돼 백분위·표준점수 영역과 득점률을 같은 잣대로 견줄 수
  // 없다(3등급인데 "영어 반영으로 더 받는다"가 나왔다). 영어는 별도 문장으로 다룬다.
  const areas = breakdown.areas.filter((area) => area.area !== "english");
  const earned = areas.reduce((sum, area) => sum + area.earned, 0);
  const max = areas.reduce((sum, area) => sum + area.max, 0);
  if (max <= 0) return [];
  const rate = earned / max;
  return areas.map((area) => {
    const points = area.earned - area.max * rate;
    return {
      area: area.area,
      ratio: area.ratio,
      points,
      percent: percentOfMax(points, breakdown.totalScore),
    };
  });
};

/** 득실이 가장 큰 영역(+)과 가장 작은 영역(−). 의미 없는 크기는 뺀다 */
const pickExtremeEffects = (
  effects: AreaEffect[]
): { gain: AreaEffect | null; loss: AreaEffect | null } => {
  const meaningful = effects.filter(
    (effect) => Math.abs(effect.percent) >= MEANINGFUL_PERCENT
  );
  const sorted = [...meaningful].sort((a, b) => b.points - a.points);
  const gain = sorted.find((effect) => effect.points > 0) ?? null;
  const loss =
    [...sorted].reverse().find((effect) => effect.points < 0) ?? null;
  return { gain, loss };
};

/**
 * 반영비율 때문에 더 받거나 덜 받는 점수 한 문장.
 * PART 2 대학별 설명과 PART 5 추천 이유 첫 문장이 같이 쓴다.
 */
export const composeAreaEffectSentence = (
  breakdown: ScoreBreakdown,
  variant = 0
): string => {
  const { gain, loss } = pickExtremeEffects(computeAreaEffects(breakdown));
  const label = (effect: AreaEffect) =>
    `${AREA_LABEL[effect.area]} ${formatPoint(effect.ratio)}% 반영`;
  if (gain && loss) {
    const forms = [
      `국어, 수학, 탐구 성적이 모두 같았을 때와 견주면 ${label(gain)}으로 ${formatPoint(gain.points)}점을 더 받고, ${label(loss)}으로 ${formatPoint(loss.points)}점을 덜 받습니다.`,
      `${label(gain)}에서 ${formatPoint(gain.points)}점을 더 얻고 ${label(loss)}에서 ${formatPoint(loss.points)}점을 덜 얻는 환산 구조입니다.`,
      `이 대학 환산식에서는 ${label(gain)}이 ${formatPoint(gain.points)}점을 보태고 ${label(loss)}이 ${formatPoint(loss.points)}점을 깎습니다.`,
    ];
    return forms[variant % forms.length];
  }
  const effect = gain ?? loss;
  if (effect) {
    const direction = effect.points > 0 ? "더" : "덜";
    const forms = [
      `국어, 수학, 탐구 성적이 모두 같았을 때와 견주면 ${label(effect)}으로 ${formatPoint(effect.points)}점을 ${direction} 받습니다.`,
      `${label(effect)}에서 ${formatPoint(effect.points)}점을 ${direction} 얻는 환산 구조입니다.`,
    ];
    return forms[variant % forms.length];
  }
  const forms = [
    "영역별 반영비율로 더 받거나 덜 받는 점수가 거의 없어, 영역 구성이 점수를 크게 바꾸지 않는 대학입니다.",
    "반영비율에 따른 영역별 득실이 거의 없는 환산 구조입니다.",
  ];
  return forms[variant % forms.length];
};

export interface ScoreReasonInput {
  university: string;
  breakdown: ScoreBreakdown;
  judgement?: UnitJudgement;
}

/** 목록에서 이 대학의 영어 손실 순위 문구 */
const englishRankPhrase = (
  index: number,
  items: ScoreReasonInput[]
): string | null => {
  const losses = items.map((item) =>
    item.breakdown.englishVsFirstGrade === null
      ? null
      : percentOfMax(
          -item.breakdown.englishVsFirstGrade,
          item.breakdown.totalScore
        )
  );
  const own = losses[index];
  const comparable = losses.filter((loss): loss is number => loss !== null);
  if (own === null || comparable.length < 2) return null;
  const max = Math.max(...comparable);
  const min = Math.min(...comparable);
  if (max - min < MEANINGFUL_PERCENT) return null;
  if (own === max) return "목록에서 영어로 잃는 점수가 가장 큰 대학입니다";
  if (own === min) return "목록에서 영어로 잃는 점수가 가장 작은 대학입니다";
  return null;
};

/**
 * PART 2 대학별 설명. 세 문장 모두 환산식 계산값으로 쓴다.
 *  1. 내 환산점수와 기준컷 대비 차이
 *  2. 반영비율 때문에 더 받거나 덜 받는 점수 (영역 구성 득실)
 *  3. 영어 등급으로 달라지는 점수와 목록 안 비교
 */
export const composeScoreReason = (
  index: number,
  items: ScoreReasonInput[],
  englishGrade: number
): string => {
  const { breakdown, judgement } = items[index];
  const total = breakdown.totalScore;
  const sentences: string[] = [];

  const head = `이 대학 환산식으로 내 점수는 ${formatPoint(breakdown.convertedScore)}점(만점 ${formatPoint(total)}점)입니다`;
  if (judgement) {
    const gap = judgement.gapPoints;
    const unit = judgement.metric === "percentile" ? "평균 백분위" : "환산점수";
    sentences.push(
      `${head}. 기준컷과 비교하면 ${unit} ${formatSigned(gap)}점으로 ${judgement.tier}에 해당합니다.`
    );
  } else {
    sentences.push(`${head}.`);
  }

  sentences.push(composeAreaEffectSentence(breakdown));

  const english = breakdown.englishVsFirstGrade;
  if (english === null) {
    sentences.push("영어 등급은 이 대학 환산점수에 반영되지 않습니다.");
  } else if (Math.abs(english) < 0.05) {
    sentences.push(
      `영어 ${englishGrade}등급도 1등급과 같은 점수로 환산됩니다.`
    );
  } else {
    const rank = englishRankPhrase(index, items);
    const base = `영어 ${englishGrade}등급이라 1등급보다 ${formatPoint(english)}점 낮게 환산`;
    sentences.push(rank ? `${base}되며, ${rank}.` : `${base}됩니다.`);
  }

  return sentences.join(" ");
};

const splitSentenceList = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

/**
 * 목록 전체의 대학별 설명. 한 섹션 안에서 같은 문장이 되풀이되면(같은 영어 감점,
 * 득실이 없는 대학 등) 대학 이름을 넣은 다른 표현으로 바꿔 모든 문장을 서로 다르게 한다.
 */
export const composeScoreReasons = (
  items: ScoreReasonInput[],
  englishGrade: number
): string[] => {
  const used = new Set<string>();
  const verdicts = composeGainVerdicts(items);
  return items.map((item, index) => {
    // 목록 전체에 해당하는 판단(예: 득실이 모두 비슷함)은 처음 한 번만 쓴다
    const verdict = used.has(verdicts[index]) ? [] : [verdicts[index]];
    const sentences = [
      ...splitSentenceList(composeScoreReason(index, items, englishGrade)),
      ...verdict,
    ].map((sentence) => {
      if (!used.has(sentence)) return sentence;
      const body = sentence.replace(
        /^국어, 수학, 탐구 성적이 모두 같았을 때와 견주면 /,
        ""
      );
      const named = `${item.university}도 ${body}`;
      return used.has(named) ? `${item.university}에서는 ${body}` : named;
    });
    sentences.forEach((sentence) => used.add(sentence));
    return sentences.join(" ");
  });
};

/** 반영비율로 더 받는 가장 큰 점수 (만점 대비 %) */
const maxGainPercent = (breakdown: ScoreBreakdown): number =>
  Math.max(0, ...computeAreaEffects(breakdown).map((effect) => effect.percent));

/**
 * 목록 안에서 견준 판단 문장. "강점이 산다" 같은 영역 서술 대신, 반영비율로
 * 더 받는 점수(만점 대비 %)를 목록 대학끼리 비교한다.
 */
export const composeGainVerdicts = (items: ScoreReasonInput[]): string[] => {
  const gains = items.map((item) => maxGainPercent(item.breakdown));
  const max = Math.max(...gains);
  const min = Math.min(...gains);
  return gains.map((gain) => {
    if (items.length < 2 || max - min < MEANINGFUL_PERCENT) {
      return "반영비율로 생기는 득실이 목록 대학끼리 비슷해, 기준컷 대비 차이로 고르는 편이 합리적입니다.";
    }
    if (gain === max) {
      return "반영비율로 더 받는 점수가 목록에서 가장 커, 같은 성적이 가장 유리하게 환산되는 대학입니다.";
    }
    if (gain === min) {
      return "반영비율로 더 받는 점수가 목록에서 가장 작아, 반영방식보다 기준컷 대비 차이를 보고 고를 대학입니다.";
    }
    return "반영비율로 더 받는 점수는 목록 중간 수준이라, 기준컷 대비 차이와 함께 판단할 대학입니다.";
  });
};

/**
 * PART 2 총평 — 목록 대학끼리 실제 점수로 견준다(모델을 부르지 않는다).
 * 모델 총평은 "A·B 가 유리… 다만 A 는 손실"처럼 한 문단 안에서 엇갈렸다(실측).
 */
export const composeMatchOverall = (
  items: ScoreReasonInput[],
  englishGrade: number
): string => {
  const sentences: string[] = [];
  const gains = items.map((item) => ({
    university: item.university,
    points: Math.max(
      0,
      ...computeAreaEffects(item.breakdown).map((effect) => effect.points)
    ),
    percent: maxGainPercent(item.breakdown),
  }));
  const sortedGains = [...gains].sort((a, b) => b.percent - a.percent);
  const [bestGain] = sortedGains;
  const worstGain = sortedGains[sortedGains.length - 1];
  if (
    items.length >= 2 &&
    bestGain.percent - worstGain.percent >= MEANINGFUL_PERCENT
  ) {
    sentences.push(
      `목록 ${items.length}곳 중 반영비율로 더 받는 점수가 가장 큰 곳은 ${bestGain.university}(${formatPoint(bestGain.points)}점)이고, 가장 작은 곳은 ${worstGain.university}(${formatPoint(worstGain.points)}점)입니다.`
    );
  } else {
    sentences.push(
      `목록 ${items.length}곳은 반영비율로 더 받거나 덜 받는 점수가 서로 비슷합니다.`
    );
  }

  const english = items
    .filter((item) => item.breakdown.englishVsFirstGrade !== null)
    .map((item) => ({
      university: item.university,
      loss: -(item.breakdown.englishVsFirstGrade ?? 0),
      percent: percentOfMax(
        -(item.breakdown.englishVsFirstGrade ?? 0),
        item.breakdown.totalScore
      ),
    }))
    .sort((a, b) => b.percent - a.percent);
  if (
    english.length >= 2 &&
    english[0].percent - english[english.length - 1].percent >=
      MEANINGFUL_PERCENT
  ) {
    const [most] = english;
    const least = english[english.length - 1];
    sentences.push(
      `영어 ${englishGrade}등급으로 1등급보다 낮게 환산되는 점수는 ${most.university}가 ${formatPoint(most.loss)}점으로 가장 크고, ${least.university}가 ${formatPoint(least.loss)}점으로 가장 작습니다.`
    );
  } else if (englishGrade === 1) {
    sentences.push(
      "영어 1등급이라 목록 대학 모두에서 영어로 잃는 점수가 없습니다."
    );
  } else {
    sentences.push(
      `영어 ${englishGrade}등급으로 달라지는 점수는 목록 대학 사이에 큰 차이가 없습니다.`
    );
  }
  sentences.push(
    "이 득실은 기준컷 대비 차이(PART 3)와 함께 보고, 기준컷 대비 차이가 비슷한 대학 사이에서 고르는 기준으로 쓰는 편이 합리적입니다."
  );
  return sentences.join(" ");
};
