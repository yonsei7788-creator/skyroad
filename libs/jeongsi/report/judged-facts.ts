// ============================================================
// 정시 리포트 해설용 판정 문구 (코드 판정)
//
// 설계 원칙 (수시 admissionPrediction 과 같은 방식):
// - 프롬프트에는 문장에 쓸 값 하나와 그 값이 이 학생에게 갖는 의미만 넘긴다.
//   수시는 대학별 원시 수치 대신 코드가 판정한 라벨과 해석이 담긴 문장 틀을
//   넘긴다. 정시도 원시 수치를 통째로 넘겼더니 모델이 쓰지 말아야 할 값을
//   집어 들었다(실측: 모든 등급이 같은 한국사 가산점을 "부담 상쇄"로 서술,
//   약점인 탐구를 "강점"으로 서술).
// - 의미(판정)는 컨설턴트 해석까지 담은 완결된 문장이다. 모델은 이 판정을
//   자연스러운 문장으로 풀고, 모델 문장이 규칙을 어기면 판정 문장이 그대로
//   폴백이 된다. 폴백도 해석을 담는다.
// - 판정 문장은 변수 뒤에 조사가 붙지 않게 쓴다("<영역>의 …", 숫자 뒤에는 "점").
// ============================================================

import { resolveAreaShares } from "../engine/convert-score.ts";
import type {
  ConversionFormula,
  GradeScoreTable,
  PlanEvaluation,
  RiskAppetite,
  ScoreArea,
  SuneungGrade,
  SuneungScore,
} from "../types.ts";

import { formatCardAllocation, parseSimpleRatio } from "./commentary-guards.ts";
import { JEONGSI_CHANCE_PHRASES } from "./system-prompt.ts";
import type { AreaScoreRow } from "../report-types.ts";
import type { AreaRatioFact } from "./prompts.ts";

/** 문장 하나의 재료. value 를 근거로 인용하고 meaning 을 판단으로 쓴다 */
export interface JudgedFact {
  /** 문장에 인용할 값. 예) "수학 가중치 120" */
  value: string;
  /** 이 학생에게 그 값이 갖는 의미 (코드 판정, 완결된 문장) */
  meaning: string;
  /** 폴백 문장. 없으면 "<값> 기준으로, <의미>" */
  sentence?: string;
  /** 같은 판정이 앞 항목에 이미 나왔을 때 쓰는 같은 뜻의 다른 문장 */
  alternate?: { meaning: string; sentence: string };
  /**
   * 같은 뜻의 문장을 더 둔다. 같은 판정이 세 곳 이상에 나오면 두 표현이
   * 바닥나 반복 문장이 빠졌다(실측: 고려대 의예과 해설이 1문장).
   * 반복을 바꿀 때만 쓴다.
   */
  extraSentences?: string[];
}

const AREA_LABEL: Record<ScoreArea, string> = {
  korean: "국어",
  math: "수학",
  english: "영어",
  inquiry: "탐구",
};

const AREA_SHORT: Record<ScoreArea, string> = {
  korean: "국",
  math: "수",
  english: "영",
  inquiry: "탐",
};

const SCORED_AREAS: ScoreArea[] = ["korean", "math", "inquiry"];

/** 영역명 뒤 조사. 폴백 문장은 코드가 쓰므로 조사를 표로 정한다 */
const OBJECT_PARTICLE: Record<string, string> = {
  국어: "를",
  수학: "을",
  영어: "를",
  탐구: "를",
};
const TOPIC_PARTICLE: Record<string, string> = {
  국어: "는",
  수학: "은",
  영어: "는",
  탐구: "는",
};

/** "+3%" 뒤는 "는", "+5점" 뒤는 "은" */
const topicAfterAmount = (value: string) => (value.endsWith("%") ? "는" : "은");

const SCIENCE_SUBJECTS = new Set([
  "물리학I",
  "화학I",
  "생명과학I",
  "지구과학I",
  "물리학II",
  "화학II",
  "생명과학II",
  "지구과학II",
]);

/** 화면·프롬프트 표와 같은 반올림(소수 첫째 자리). toFixed 는 -3.75 를 -3.8 로 올려 표(-3.7)와 어긋났다 */
const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/** 판정 문장을 그대로 쓰는 폴백 문장. 예) "수학 가중치 120 기준으로, …" */
export const composeFactSentence = (fact: JudgedFact): string =>
  fact.sentence ?? `${fact.value} 기준으로, ${fact.meaning}`;

/** 학생 맥락. 강점·약점 영역과 영역별 성적 */
export interface StudentContext {
  score: SuneungScore;
  rows: AreaScoreRow[];
  strengths: ScoreArea[];
  weaknesses: ScoreArea[];
}

const percentileOf = (context: StudentContext, area: ScoreArea) =>
  context.rows.find((row) => row.area === area)?.percentile ?? null;

const standardOf = (context: StudentContext, area: ScoreArea) =>
  context.rows.find((row) => row.area === area)?.standardScore ?? null;

type ScoredArea = Exclude<ScoreArea, "english">;

/** 백분위가 있는 첫 영역. 강점·약점은 국·수·탐에서만 나오지만 타입으로도 좁힌다 */
const firstScored = (areas: ScoreArea[]): ScoredArea | undefined =>
  areas.find((area): area is ScoredArea => area !== "english");

// ─── PART 5 대학별 상세: 소재 하나의 판정 ───

/** 영역 비중 표기. 단순 비율이면 %, 가중치 대학이면 가중치, 그 밖에는 이 학생에게 적용된 비중 */
const describeAreaWeight = (
  area: ScoreArea,
  ratioSummary: string,
  resolvedPercent: number
): string => {
  const label = AREA_LABEL[area];
  const simple = parseSimpleRatio(ratioSummary)?.get(label);
  if (simple !== undefined) return `${label} ${formatNumber(simple)}%`;
  const weighted = new RegExp(`${AREA_SHORT[area]}(\\d+(?:\\.\\d+)?)`).exec(
    ratioSummary
  );
  if (weighted && ratioSummary.includes("가중")) {
    return `${label} 가중치 ${weighted[1]}`;
  }
  return `${label} 비중 ${formatNumber(resolvedPercent)}%`;
};

const isUniqueMax = (value: number, others: number[]) =>
  others.every((other) => value > other);
const isUniqueMin = (value: number, others: number[]) =>
  others.every((other) => value < other);

/** 반영비율 판정. 강점이 가장 크게, 또는 약점이 가장 작게·크게 반영될 때만 의미가 있다 */
const judgeRatio = (
  evaluation: PlanEvaluation,
  ratioSummary: string,
  context: StudentContext
): JudgedFact | null => {
  // 비중이 원문에 없는 대학(가중치 공시 + 표준점수 반영)은 비중으로 판정하지 않는다
  const ratios = resolveAreaShares(context.score, evaluation.plan);
  if (!ratios) return null;
  const strength = firstScored(context.strengths);
  const weakness = firstScored(context.weaknesses);
  const othersOf = (area: ScoreArea) =>
    SCORED_AREAS.filter((other) => other !== area).map(
      (other) => ratios[other]
    );

  if (strength && isUniqueMax(ratios[strength], othersOf(strength))) {
    const percentile = percentileOf(context, strength);
    const value = describeAreaWeight(strength, ratioSummary, ratios[strength]);
    return {
      value,
      meaning: `강점 영역인 ${AREA_LABEL[strength]}의 비중이 국어·수학·탐구 중 가장 커, 백분위 ${percentile ?? "-"}점의 강점이 환산점수에서 유리하게 작용합니다.`,
      sentence: `${value} 반영으로 국어·수학·탐구 중 강점인 ${AREA_LABEL[strength]}의 비중이 가장 커, 환산점수에서 유리하게 작용합니다.`,
      // 같은 비율의 대학이 둘이면 같은 문장이 된다(실측: 동국대·광운대 수학 35%)
      alternate: {
        meaning: `국어·수학·탐구 가운데 ${value} 반영이 가장 커, 강점이 환산점수를 끌어올립니다.`,
        sentence: `국어·수학·탐구 가운데 ${value} 반영이 가장 커, 강점인 ${AREA_LABEL[strength]}${SUBJECT_PARTICLE[AREA_LABEL[strength]]} 환산점수를 끌어올립니다.`,
      },
    };
  }
  if (!weakness) return null;
  if (ratios[weakness] === 0) {
    return {
      value: `${AREA_LABEL[weakness]} 0%`,
      meaning: `이 학생 성적 기준으로 약점 영역인 ${AREA_LABEL[weakness]}의 반영이 빠져, 약점에서 생기는 환산 손실이 없습니다.`,
      sentence: `이 학생 성적 기준으로 약점인 ${AREA_LABEL[weakness]} 영역이 반영에서 빠져, 환산 손실이 없습니다.`,
      alternate: {
        meaning: `약점인 ${AREA_LABEL[weakness]} 영역을 반영하지 않아, 약점에서 잃는 점수가 없습니다.`,
        sentence: `약점인 ${AREA_LABEL[weakness]} 영역을 반영하지 않아, 약점에서 잃는 점수가 없습니다.`,
      },
    };
  }
  if (isUniqueMin(ratios[weakness], othersOf(weakness))) {
    const value = describeAreaWeight(weakness, ratioSummary, ratios[weakness]);
    return {
      value,
      meaning: `약점 영역인 ${AREA_LABEL[weakness]}의 비중이 국어·수학·탐구 중 가장 작아, 환산 손실이 줄어듭니다.`,
      sentence: `${value} 반영으로 국어·수학·탐구 중 약점인 ${AREA_LABEL[weakness]}의 비중이 가장 작아, 환산 손실이 줄어듭니다.`,
      alternate: {
        meaning: `국어·수학·탐구 가운데 약점을 가장 적게 반영해, 환산 손실이 줄어듭니다.`,
        sentence: `국어·수학·탐구 가운데 약점인 ${AREA_LABEL[weakness]}${OBJECT_PARTICLE[AREA_LABEL[weakness]]} 가장 적게(${value}) 반영해, 환산 손실이 줄어듭니다.`,
      },
    };
  }
  if (isUniqueMax(ratios[weakness], othersOf(weakness))) {
    const value = describeAreaWeight(weakness, ratioSummary, ratios[weakness]);
    return {
      value,
      meaning: `약점 영역인 ${AREA_LABEL[weakness]}의 비중이 국어·수학·탐구 중 가장 커, 환산 손실이 생길 수 있는 점을 함께 살필 부분입니다.`,
      sentence: `${value} 반영으로 국어·수학·탐구 중 약점인 ${AREA_LABEL[weakness]}의 비중이 가장 커, 환산 손실을 함께 살필 부분입니다.`,
      alternate: {
        meaning: `국어·수학·탐구 가운데 약점을 가장 크게 반영해, 환산 손실을 함께 살필 부분입니다.`,
        sentence: `국어·수학·탐구 가운데 약점인 ${AREA_LABEL[weakness]}${OBJECT_PARTICLE[AREA_LABEL[weakness]]} 가장 크게(${value}) 반영해, 환산 손실을 함께 살필 부분입니다.`,
      },
    };
  }
  return null;
};

/**
 * 약점 비중이 국어·수학·탐구 중 중간이면 손실이 크지 않다는 판정.
 * 강점이 영어인 학생은 다른 소재 후보가 적어 같은 문장이 5곳에 반복됐다
 * (실측). 정보가 적은 소재라 다른 소재가 모두 쓰인 뒤에 고른다.
 */
const judgeMiddleWeakness = (
  evaluation: PlanEvaluation,
  ratioSummary: string,
  context: StudentContext
): JudgedFact | null => {
  const weakness = firstScored(context.weaknesses);
  if (!weakness) return null;
  // 비중이 원문에 없는 대학(가중치 공시 + 표준점수 반영)은 비중으로 판정하지 않는다
  const ratios = resolveAreaShares(context.score, evaluation.plan);
  if (!ratios) return null;
  const others = SCORED_AREAS.filter((area) => area !== weakness).map(
    (area) => ratios[area]
  );
  const between =
    ratios[weakness] > Math.min(...others) &&
    ratios[weakness] < Math.max(...others);
  if (!between) return null;
  const value = describeAreaWeight(weakness, ratioSummary, ratios[weakness]);
  return {
    value,
    meaning: `약점 영역인 ${AREA_LABEL[weakness]}의 비중이 국어·수학·탐구 중 중간이라, 환산 손실은 크지 않습니다.`,
    sentence: `${value} 반영으로 약점인 ${AREA_LABEL[weakness]}의 비중이 국어·수학·탐구 중 중간이라, 환산 손실은 크지 않습니다.`,
    alternate: {
      meaning: `약점 반영이 국어·수학·탐구 가운데 중간이라, 손실이 크지 않습니다.`,
      sentence: `약점인 ${AREA_LABEL[weakness]} 반영(${value})이 국어·수학·탐구 가운데 중간이라, 손실이 크지 않습니다.`,
    },
  };
};

/** 등급별 점수표에서 학생 등급이 1등급보다 잃는 점수 */
const lossFromTable = (
  policy: ConversionFormula["english"] | ConversionFormula["history"],
  grade: SuneungGrade
): { loss: number; label: string } => {
  if (policy.type === "subtract") {
    const table: GradeScoreTable = policy.penaltyByGrade;
    return {
      loss: table[grade] - table[1],
      label: `${grade}등급 감점 ${formatNumber(table[grade])}점`,
    };
  }
  const table: GradeScoreTable = policy.scoreByGrade;
  return {
    loss: table[1] - table[grade],
    label: `${grade}등급 ${formatNumber(table[grade])}점(1등급 ${formatNumber(table[1])}점)`,
  };
};

/**
 * 등급 손실을 백분위점으로 환산한다. 엔진이 격차를 백분위점으로 바꿀 때와 같은
 * 식(환산 총점 대비 % ÷ 백분위 1점당 변화율)이라, 같은 대학의 기준컷 대비
 * 격차와 바로 견줄 수 있다. 만점이 대학마다 달라 점수 그대로는 비교할 수 없다.
 */
const lossInPercentile = (
  loss: number,
  evaluation: PlanEvaluation
): number | null => {
  const { totalScore } = evaluation.plan.formula;
  // 표준점수 반영 대학은 민감도를 원문만으로 구할 수 없어(null) 환산하지 않는다
  const { sensitivity } = evaluation;
  if (totalScore <= 0 || sensitivity === null || sensitivity <= 0) return null;
  return ((loss / totalScore) * 100) / sensitivity;
};

/**
 * 영어·한국사 등급 손실의 판정. 손실을 이 대학의 기준컷 대비 격차와 견줘,
 * 격차보다 작으면 지원 판단을 바꾸지 않는 손실, 격차만큼 크면 결과를 가를 수
 * 있는 손실로 본다.
 */
const judgeGradeLoss = (
  subject: "영어" | "한국사",
  policy: ConversionFormula["english"] | ConversionFormula["history"],
  grade: SuneungGrade,
  evaluation: PlanEvaluation,
  variant: number
): JudgedFact | null => {
  const { loss, label } = lossFromTable(policy, grade);
  if (loss <= 0) {
    if (subject === "한국사") return null;
    // 1등급과 점수 차이가 없는 등급
    return {
      value: grade === 1 ? "영어 1등급" : `영어 ${label}`,
      meaning:
        grade === 1
          ? "영어에서 잃는 점수가 없어, 다른 영역의 점수가 그대로 경쟁력이 됩니다."
          : `영어 ${grade}등급도 1등급과 점수 차이가 없어, 영어 부담 없이 다른 영역으로 승부할 수 있습니다.`,
      sentence:
        grade === 1
          ? "영어 1등급이라 잃는 점수가 없어, 다른 영역의 점수가 그대로 경쟁력이 됩니다."
          : `영어 ${grade}등급도 1등급과 점수 차이가 없어, 영어 부담 없이 다른 영역으로 승부합니다.`,
    };
  }
  const percentile = lossInPercentile(loss, evaluation);
  if (percentile === null) return null;
  const gap = evaluation.percentileGap;
  const small = gap === null ? percentile < 1 : percentile < Math.abs(gap);
  const amount = `백분위 약 ${formatNumber(percentile)}점`;
  const head = `${subject} ${grade}등급 손실`;
  // 같은 판정이 여러 대학에 이어지면 문장 틀이 반복된다(실측: 9곳 중 5곳이
  // "…지원 판단을 바꿀 정도는 아닙니다"). 같은 뜻의 두 문장을 번갈아 쓴다.
  const phrasings = small
    ? [
        {
          meaning: `${head}은 ${amount} 상당으로 기준컷과의 격차보다 작아, 지원 판단을 바꿀 정도는 아닙니다.`,
          sentence: `${head}은 ${amount} 상당으로 격차보다 작아, 지원 판단을 바꿀 정도는 아닙니다.`,
        },
        {
          meaning: `${head}이 ${amount} 상당에 그쳐, 이 대학에서는 ${subject}보다 다른 영역이 결과를 좌우합니다.`,
          sentence: `${head}이 ${amount} 상당에 그쳐, 결과는 다른 영역이 좌우합니다.`,
        },
      ]
    : [
        {
          meaning: `${head}이 ${amount} 상당으로 기준컷과의 격차만큼 커, ${subject} 등급이 결과를 가를 수 있는 대학입니다.`,
          sentence: `${head}이 ${amount} 상당으로 격차만큼 커, ${subject} 등급이 결과를 가를 수 있습니다.`,
        },
        {
          meaning: `${head}이 ${amount} 상당으로 기준컷과의 격차에 맞먹어, 다른 영역에서 그만큼 만회해야 하는 구조입니다.`,
          sentence: `${head}이 ${amount} 상당으로 격차에 맞먹어, 다른 영역에서 만회해야 합니다.`,
        },
      ];
  return {
    value: `${subject} ${grade}등급 ${policy.type === "subtract" ? "감점" : "손실"} ${formatNumber(loss)}점(${amount} 상당)`,
    ...phrasings[variant % phrasings.length],
  };
};

const formatBonus = (rule: { type: "percent" | "point"; value: number }) =>
  rule.type === "percent"
    ? `+${formatNumber(rule.value)}%`
    : `+${formatNumber(rule.value)}점`;

/** 가산점 판정. 학생에게 실제로 적용되는 가산만 다룬다 */
const judgeBonus = (
  evaluation: PlanEvaluation,
  context: StudentContext
): JudgedFact | null => {
  const { bonus } = evaluation.plan.formula;
  if (!bonus) return null;
  const roleOf = (area: ScoreArea) =>
    context.strengths.includes(area)
      ? "강점"
      : context.weaknesses.includes(area)
        ? "약점"
        : null;

  const science = bonus.scienceInquiry;
  const scienceCount = [context.score.inquiry1, context.score.inquiry2].filter(
    (inquiry) => SCIENCE_SUBJECTS.has(inquiry.subject)
  ).length;
  if (science && scienceCount >= (science.minCount ?? 1)) {
    const role = roleOf("inquiry");
    const value = `과탐 ${science.appliesTo === "each" ? "과목별" : "합산"} 가산 ${formatBonus(science)}`;
    const subject = `${value}${topicAfterAmount(value)}`;
    return {
      value,
      sentence:
        role === "약점"
          ? `${subject} 약점인 탐구의 환산점수를 보완해 줍니다.`
          : role === "강점"
            ? `${subject} 강점인 탐구의 유리함을 한층 키웁니다.`
            : `${subject} 같은 성적의 사탐 응시자보다 탐구 환산점수를 높여 줍니다.`,
      meaning:
        role === "약점"
          ? "과탐 응시자에게 붙는 가산이 약점 영역인 탐구의 환산점수를 보완해 줍니다."
          : role === "강점"
            ? "과탐 응시자에게 붙는 가산이 강점 영역인 탐구의 유리함을 한층 키웁니다."
            : "과탐 응시자에게 붙는 가산이 탐구 환산점수에 더해져, 같은 성적의 사탐 응시자보다 유리합니다.",
    };
  }

  const { elective } = context.score.math;
  const math = bonus.mathElective?.[elective];
  if (math) {
    const role = roleOf("math");
    const value = `수학 ${elective} 가산 ${formatBonus(math)}`;
    const subject = `${value}${topicAfterAmount(value)}`;
    return {
      value,
      sentence:
        role === "강점"
          ? `${subject} 강점인 수학의 유리함을 한층 키웁니다.`
          : role === "약점"
            ? `${subject} 약점인 수학의 환산점수를 보완해 줍니다.`
            : `${subject} 같은 성적의 다른 선택과목 응시자보다 수학 환산점수를 높여 줍니다.`,
      meaning:
        role === "강점"
          ? "강점 영역인 수학에 선택과목 가산이 더해져, 유리함이 한층 커집니다."
          : role === "약점"
            ? "선택과목 가산이 약점 영역인 수학의 환산점수를 보완해 줍니다."
            : "선택과목 가산이 수학 환산점수에 더해져, 같은 성적의 다른 선택과목 응시자보다 유리합니다.",
    };
  }
  return null;
};

/** 활용지표 판정. 강점 영역을 표준점수로 반영할 때 의미가 있다 */
const judgeMetric = (
  evaluation: PlanEvaluation,
  context: StudentContext
): JudgedFact | null => {
  const strength = firstScored(context.strengths);
  if (!strength) return null;
  const { metric } = evaluation.plan.formula;
  const used = strength === "inquiry" ? metric.inquiry : metric[strength];
  const standard = standardOf(context, strength);
  if (used !== "standard" || standard === null) return null;
  return {
    value: `${AREA_LABEL[strength]} 표준점수 반영`,
    meaning: `강점 영역인 ${AREA_LABEL[strength]}의 표준점수 ${formatNumber(standard)}점이 그대로 반영되어, 같은 백분위 지원자 사이에서도 점수 차이가 드러납니다.`,
    sentence: `${AREA_LABEL[strength]} 표준점수 반영으로 ${formatNumber(standard)}점이 그대로 들어가, 같은 백분위 지원자 사이에서도 점수 차이가 드러납니다.`,
  };
};

/** 판정할 소재가 하나도 없을 때의 소재 */
const PERCENTILE_FACT: JudgedFact = {
  value: "기준컷 대비 격차",
  meaning:
    "반영방식에서 이 학생에게 따로 짚을 유불리가 없어, 이 대학은 기준컷과의 격차를 중심으로 판단합니다.",
  sentence:
    "반영방식에서 따로 짚을 유불리가 없어, 이 대학은 기준컷과의 격차를 중심으로 판단합니다.",
  alternate: {
    meaning:
      "이 대학은 반영방식보다 기준컷과의 격차를 보고 판단하는 편이 합리적입니다.",
    sentence:
      "이 대학은 반영방식보다 기준컷과의 격차를 보고 판단하는 편이 합리적입니다.",
  },
};

/**
 * PART 5 1문장 후보 판정. 순서가 소재 종류(used 의 칸)다.
 * variants 는 종류별 표현 번호로, 같은 판정을 다른 문장으로 쓸 때 쓴다.
 */
const judgeDetailCandidates = (
  evaluation: PlanEvaluation,
  ratioSummary: string,
  context: StudentContext,
  variants: number[]
): (JudgedFact | null)[] => {
  const { formula } = evaluation.plan;
  return [
    judgeRatio(evaluation, ratioSummary, context),
    judgeBonus(evaluation, context),
    judgeGradeLoss(
      "영어",
      formula.english,
      context.score.english.grade,
      evaluation,
      variants[2]
    ),
    judgeGradeLoss(
      "한국사",
      formula.history,
      context.score.history.grade,
      evaluation,
      variants[3]
    ),
    judgeMetric(evaluation, context),
    judgeMiddleWeakness(evaluation, ratioSummary, context),
  ];
};

/**
 * 같은 문장 반복을 바꿀 때 쓰는 PART 5 항목별 판정.
 * 이 학생에게 의미가 있는 모든 소재를 두 가지 표현으로 담는다.
 */
export const listDetailFacts = (
  evaluations: PlanEvaluation[],
  ratioSummaries: string[],
  context: StudentContext
): JudgedFact[][] =>
  evaluations.map((evaluation, index) => {
    const facts = [0, 1].flatMap((variant) =>
      judgeDetailCandidates(
        evaluation,
        ratioSummaries[index],
        context,
        Array(6).fill(variant)
      ).filter((fact): fact is JudgedFact => fact !== null)
    );
    return [...facts, PERCENTILE_FACT];
  });

/**
 * PART 5 항목마다 1문장 소재 하나를 고른다. 이 학생에게 의미가 있는 소재만
 * 후보로 두고, 이웃 항목과 같은 종류가 겹치지 않게 돌려 고른다.
 */
export const assignDetailFacts = (
  evaluations: PlanEvaluation[],
  ratioSummaries: string[],
  context: StudentContext
): JudgedFact[] => {
  // 소재 종류별 사용 횟수. 7곳 중 3곳이 같은 소재를 받아 같은 문장이
  // 반복됐다(실측). 덜 쓴 종류를 먼저 고르고, 같으면 항목마다 시작점을 돌린다.
  const used = [0, 0, 0, 0, 0, 0];
  /** 정보가 적어 다른 소재가 모두 쓰인 뒤에 고르는 소재 종류 */
  const LOW_INFORMATION_KIND = 5;
  // 판정 문장이 같은 소재는 한 번만 쓴다. 영어 1등급이면 "영어에서 잃는
  // 점수가 없다"가 9곳 중 6곳에 반복됐다(실측).
  const usedSentences = new Set<string>();
  let previousKind = -1;
  return evaluations.map((evaluation, index) => {
    const candidates = judgeDetailCandidates(
      evaluation,
      ratioSummaries[index],
      context,
      used
    );
    const order = candidates
      .map((fact, kind) => ({
        fact,
        kind,
        rotation: (kind - index + candidates.length) % candidates.length,
      }))
      .filter(
        (
          entry
        ): entry is { fact: JudgedFact; kind: number; rotation: number } =>
          entry.fact !== null
      )
      .sort(
        (a, b) =>
          Number(usedSentences.has(composeFactSentence(a.fact))) -
            Number(usedSentences.has(composeFactSentence(b.fact))) ||
          Number(a.kind === LOW_INFORMATION_KIND) -
            Number(b.kind === LOW_INFORMATION_KIND) ||
          Number(a.kind === previousKind) - Number(b.kind === previousKind) ||
          used[a.kind] - used[b.kind] ||
          a.rotation - b.rotation
      );
    const [chosen] = order;
    if (!chosen) {
      previousKind = -1;
      return PERCENTILE_FACT;
    }
    used[chosen.kind] += 1;
    usedSentences.add(composeFactSentence(chosen.fact));
    previousKind = chosen.kind;
    return chosen.fact;
  });
};

// ─── PART 2 유리한 대학: 두 문장의 판정 ───

/**
 * 강점 영역의 성적 표기. 영어는 등급으로 반영되므로 등급으로 쓴다.
 * 판정 대상 영역의 값을 써야 한다(실측: 영어 강점에 국어 백분위 84를 씀).
 */
const describeAreaScore = (
  context: StudentContext,
  label: string
): string | null => {
  const area = (Object.keys(AREA_LABEL) as ScoreArea[]).find(
    (key) => AREA_LABEL[key] === label
  );
  if (!area) return null;
  if (area === "english") return `${context.score.english.grade}등급`;
  const percentile = percentileOf(context, area);
  return percentile === null ? null : `백분위 ${formatNumber(percentile)}점`;
};

const strengthFactOf = (
  fact: AreaRatioFact,
  score: string | null
): JudgedFact => {
  const { label } = fact;
  const value = `${label} ${formatNumber(fact.value)}%`;
  // 목록에서 이 영역을 반영하는 대학이 이곳뿐이면 비교 대상이 없다.
  // "목록 대학과 같다"로 쓰면 사실과 반대다(실측).
  if (fact.position === null) {
    const only = `목록에서 ${label}${OBJECT_PARTICLE[label]} 반영하는 대학은 이곳뿐이라, 강점인 ${label}의 점수가 환산에 들어가는 점이 다른 대학과 다릅니다.`;
    return {
      value,
      meaning: only,
      sentence: only,
      alternate: {
        meaning: `${label}${OBJECT_PARTICLE[label]} ${value.slice(label.length + 1)} 반영하는 유일한 대학이라, 강점이 환산 결과에 직접 반영됩니다.`,
        sentence: `${label}${OBJECT_PARTICLE[label]} ${value.slice(label.length + 1)} 반영하는 유일한 대학이라, 강점이 환산 결과에 직접 반영됩니다.`,
      },
    };
  }
  switch (fact.position) {
    case "가장 높음":
      return {
        value,
        meaning: score
          ? `목록 대학 중 ${label} 비중이 가장 커, 강점 영역의 ${score}이 환산점수를 가장 크게 끌어올립니다.`
          : `목록 대학 중 ${label} 비중이 가장 커, 강점 영역이 환산점수를 가장 크게 끌어올립니다.`,
        sentence: `${label}${OBJECT_PARTICLE[label]} ${value.slice(label.length + 1)} 반영해 목록 중 비중이 가장 크므로, 강점인 ${label}${score ? ` ${score}이` : "의 점수가"} 가장 크게 반영됩니다.`,
        alternate: {
          meaning: `${label} 비중이 목록에서 가장 높은 축이라, 강점인 ${label}의 점수가 환산 결과를 끌어올리는 구조입니다.`,
          sentence: `${value} 반영으로 목록에서 비중이 가장 높은 축이라, 강점인 ${label} 점수가 환산 결과를 끌어올립니다.`,
        },
      };
    case "가장 낮음":
      return {
        value,
        meaning: `${label} 비중은 목록 대학 중 가장 작아, 강점의 효과는 다른 대학보다 작은 편입니다.`,
        sentence: `${label} 비중은 ${value.slice(label.length + 1)}로 목록 중 가장 작아, 강점의 효과는 다른 대학보다 작은 편입니다.`,
        alternate: {
          meaning: `${label} 비중이 목록에서 가장 낮은 축이라, 강점보다는 다른 반영 요소를 보고 고를 대학입니다.`,
          sentence: `${value} 반영으로 목록에서 비중이 가장 낮은 축이라, 강점보다는 다른 요소를 보고 고를 대학입니다.`,
        },
      };
    case "중간":
      return {
        value,
        meaning: `${label} 비중은 목록 대학 중 중간 수준이라, 강점의 효과도 중간 정도로 나타납니다.`,
        sentence: `${label} 비중은 ${value.slice(label.length + 1)}로 목록 중 중간 수준이라, 강점의 효과도 중간 정도입니다.`,
        alternate: {
          meaning: `${label} 비중이 목록 중간이라, 강점이 환산 결과에 주는 효과도 무난한 수준입니다.`,
          sentence: `${value} 반영으로 비중이 목록 중간이라, 강점의 효과도 무난한 수준입니다.`,
        },
      };
    default:
      return {
        value,
        meaning: `${label} 비중이 같은 영역을 반영하는 목록 대학과 같아, 강점의 효과는 다른 대학과 비슷합니다.`,
        sentence: `${label} 비중은 ${value.slice(label.length + 1)}로 같은 영역을 반영하는 목록 대학과 같아, 강점의 효과도 비슷합니다.`,
        alternate: {
          meaning: `${label} 비중이 같은 영역을 반영하는 목록 대학과 같아, 이 점에서는 대학 간 유불리 차이가 없습니다.`,
          sentence: `${value} 반영으로 같은 영역을 반영하는 목록 대학과 같아, 이 점에서는 대학 간 차이가 없습니다.`,
        },
      };
  }
};

const weaknessFactOf = (fact: AreaRatioFact): JudgedFact => {
  const { label } = fact;
  const value = `${label} ${formatNumber(fact.value)}%`;
  const percent = value.slice(label.length + 1);
  if (fact.value === 0) {
    const meaning = `이 학생 성적 기준으로 ${label} 영역이 반영에서 빠져, 약점에서 생기는 손실이 없습니다.`;
    const alternate = `약점인 ${label} 영역을 반영하지 않는 구조라, 다른 영역의 점수만으로 승부할 수 있습니다.`;
    return {
      value,
      meaning,
      sentence: meaning,
      alternate: { meaning: alternate, sentence: alternate },
    };
  }
  // 목록에서 약점 영역을 반영하는 대학이 이곳뿐이면, 다른 대학보다 손실이
  // 생기는 곳이다. "목록 대학과 같다"로 쓰면 사실과 반대다(실측: 서울여대
  // 수학 15%, 다른 대학은 모두 0%).
  if (fact.position === null) {
    const only = `목록에서 약점인 ${label}${OBJECT_PARTICLE[label]} 반영하는 대학은 이곳뿐이라(${percent}), 다른 대학보다 환산 손실이 생기는 점을 함께 살필 부분입니다.`;
    const alternate = `약점인 ${label}${OBJECT_PARTICLE[label]} ${percent} 반영하는 유일한 대학이라, 다른 영역에서 손실을 메워야 합니다.`;
    return {
      value,
      meaning: only,
      sentence: only,
      alternate: { meaning: alternate, sentence: alternate },
    };
  }
  switch (fact.position) {
    case "가장 낮음":
      return {
        value,
        meaning: `목록 대학 중 ${label} 비중이 가장 작아, 약점 영역의 환산 손실이 가장 적습니다.`,
        sentence: `약점인 ${label}${TOPIC_PARTICLE[label]} ${percent}만 반영되어 목록 중 비중이 가장 작고, 환산 손실도 가장 적습니다.`,
        alternate: {
          meaning: `약점인 ${label} 비중이 목록에서 가장 낮은 축이라, 환산 손실 걱정이 적은 대학입니다.`,
          sentence: `약점인 ${label} 비중이 ${percent}로 목록에서 가장 낮은 축이라, 환산 손실 걱정이 적은 대학입니다.`,
        },
      };
    case "가장 높음":
      return {
        value,
        meaning: `목록 대학 중 ${label} 비중이 가장 커, 약점 영역의 환산 손실이 다른 대학보다 큰 점을 함께 살필 부분입니다.`,
        sentence: `약점인 ${label} 비중이 ${percent}로 목록 중 가장 커, 환산 손실을 함께 살필 부분입니다.`,
        alternate: {
          meaning: `약점인 ${label} 비중이 목록에서 가장 높은 축이라, 다른 영역에서 손실을 메워야 하는 구조입니다.`,
          sentence: `약점인 ${label} 비중이 ${percent}로 목록에서 가장 높은 축이라, 다른 영역에서 손실을 메워야 합니다.`,
        },
      };
    case "중간":
      return {
        value,
        meaning: `${label} 비중이 목록 대학 중 중간 수준이라, 약점 영역의 손실은 크지 않습니다.`,
        sentence: `약점인 ${label} 비중은 ${percent}로 목록 중 중간 수준이라, 손실은 크지 않습니다.`,
        alternate: {
          meaning: `약점인 ${label} 비중이 목록 중간 수준이라, 손실이 결과를 좌우할 정도는 아닙니다.`,
          sentence: `약점인 ${label} 비중 ${percent}는 목록 중간 수준이라, 손실이 결과를 좌우할 정도는 아닙니다.`,
        },
      };
    default:
      return {
        value,
        meaning: `${label} 비중이 같은 영역을 반영하는 목록 대학과 같아, 약점 영역의 영향도 비슷합니다.`,
        sentence: `약점인 ${label} 비중은 ${percent}로 같은 영역을 반영하는 목록 대학과 같아, 영향도 비슷합니다.`,
        alternate: {
          meaning: `약점인 ${label} 비중이 같은 영역을 반영하는 목록 대학과 같아, 이 점에서는 대학 간 차이가 없습니다.`,
          sentence: `약점인 ${label} 비중이 ${percent}로 같은 영역을 반영하는 목록 대학과 같아, 이 점에서는 대학 간 차이가 없습니다.`,
        },
      };
  }
};

export interface MatchFactInput {
  university: string;
  metricSummary: string;
  /** 가중치 대학("국100·수120·탐100 … 가중합")의 강점 판정에 쓴다 */
  ratioSummary?: string;
  strength?: AreaRatioFact;
  weakness?: AreaRatioFact;
}

const SUBJECT_PARTICLE: Record<string, string> = {
  국어: "가",
  수학: "이",
  영어: "가",
  탐구: "가",
};

/**
 * 가중치로 반영하는 대학의 강점 판정. 비율 표기가 아니라 강점·약점 비중
 * 판정이 없으면 두 문장이 모두 활용지표 판정이 되어 같은 뜻이 반복됐다
 * (실측: 고려대 의예과 "표준점수가 그대로 환산에 들어가" 두 번).
 */
const judgeMatchWeight = (
  ratioSummary: string | undefined,
  strengthLabel: string | null,
  metricSummary: string
): JudgedFact => {
  const weights = new Map(
    [...(ratioSummary ?? "").matchAll(/([국수탐])(\d+(?:\.\d+)?)/g)].map(
      ([, short, value]) => [short, Number(value)]
    )
  );
  const short = strengthLabel?.[0];
  const own = short ? weights.get(short) : undefined;
  // 가중치는 같은 지표(척도)끼리만 견줄 수 있다. 국·수 표준점수와 탐구
  // 변환표준점수는 만점이 달라, 가중치 숫자만으로 어느 쪽이 환산점수에 더
  // 크게 들어가는지 말할 수 없다(만점은 원문에 없다).
  const ownMetric = strengthLabel
    ? metricOfArea(metricSummary, strengthLabel)
    : null;
  const others = [...weights.entries()].filter(
    ([key]) =>
      key !== short &&
      metricOfArea(metricSummary, AREA_BY_SHORT_LABEL[key]) === ownMetric
  );
  if (
    strengthLabel &&
    own !== undefined &&
    others.length > 0 &&
    others.every(([, value]) => value < own)
  ) {
    const compared = others.map(([key]) => AREA_BY_SHORT_LABEL[key]).join("·");
    const meaning = `${strengthLabel} 가중치 ${formatNumber(own)}${topicAfterAmount(String(own))} 같은 ${ownMetric ?? "지표"}로 반영하는 ${compared}보다 커, 강점인 ${strengthLabel}${SUBJECT_PARTICLE[strengthLabel]} 환산점수에 더 크게 들어갑니다.`;
    return {
      value: `${strengthLabel} 가중치 ${formatNumber(own)}`,
      meaning,
      sentence: meaning,
    };
  }
  const meaning =
    "영역별 가중치로 환산하는 대학이라, 비중 비교보다 기준컷과의 격차를 중심으로 판단합니다.";
  return { value: "반영 구조", meaning, sentence: meaning };
};

const AREA_BY_SHORT_LABEL: Record<string, string> = {
  국: "국어",
  수: "수학",
  탐: "탐구",
};

/** 활용지표 표기("국어 표준점수 / 수학 표준점수 / 탐구 변환표준점수 2과목")에서 영역의 지표 */
const metricOfArea = (metricSummary: string, label: string): string | null =>
  new RegExp(`${label} (변환표준점수|표준점수|백분위)`).exec(
    metricSummary
  )?.[1] ?? null;

/** 강점 영역이 표준점수가 아닐 때, 그 영역의 실제 지표로 쓰는 판정 */
const metricFactOf = (
  metricSummary: string,
  strengthLabel: string | null
): JudgedFact => {
  const allPercentile = ["국어", "수학", "탐구"].every(
    (label) => metricOfArea(metricSummary, label) === "백분위"
  );
  if (allPercentile) {
    return {
      value: metricSummary,
      meaning:
        "백분위로 반영해, 영역 간 표준점수 차이보다 백분위 순위가 환산점수를 좌우합니다.",
      sentence:
        "영역을 백분위로 반영해, 표준점수 차이보다 백분위 순위가 환산점수를 좌우합니다.",
      alternate: {
        meaning:
          "백분위 기준으로 환산해, 영역별 표준점수 분포의 영향을 덜 받는 구조입니다.",
        sentence:
          "백분위 기준으로 환산해, 영역별 표준점수 분포의 영향을 덜 받는 구조입니다.",
      },
      extraSentences: [
        "백분위로 환산하는 대학이라, 표준점수 분포보다 영역별 백분위가 결과를 정합니다.",
        "환산에 백분위를 쓰므로, 과목 난이도에 따른 표준점수 차이는 결과에 남지 않습니다.",
      ],
    };
  }
  // 영역마다 지표가 다르다. "백분위로 반영"이라 쓰면 표준점수 대학에 틀린 말이다.
  const ownMetric = strengthLabel
    ? metricOfArea(metricSummary, strengthLabel)
    : null;
  const meaning =
    strengthLabel && ownMetric === "변환표준점수"
      ? `강점인 ${strengthLabel}${TOPIC_PARTICLE[strengthLabel]} 대학 변환표준점수로 반영되어, 백분위에 따라 정해진 점수가 환산에 들어갑니다.`
      : strengthLabel && ownMetric === "백분위"
        ? `강점인 ${strengthLabel}${TOPIC_PARTICLE[strengthLabel]} 백분위로 반영되어, 백분위 순위대로 환산에 들어갑니다.`
        : "국어·수학·탐구를 영역마다 다른 지표로 반영해, 지표별 점수가 그대로 환산에 들어갑니다.";
  return { value: metricSummary, meaning, sentence: meaning };
};

// ─── PART 5 원서 운용 조언 ───

export interface DetailAdviceInput {
  tier: "상향" | "적정" | "안정";
  chance: string;
  group: "가" | "나" | "다";
}

const OTHER_GROUPS: Record<DetailAdviceInput["group"], string> = {
  가: "나·다",
  나: "가·다",
  다: "가·나",
};

/** 구분·합격 가능성별 조언 문장. 코드가 이미 판정한 구분과 모집군만 쓴다 */
const detailAdviceSentences = ({
  tier,
  chance,
  group,
}: DetailAdviceInput): string[] => {
  const others = OTHER_GROUPS[group];
  if (tier === "상향") {
    return chance === "매우낮음"
      ? [
          `${group}군에 둔다면 사실상 도전 원서이므로, 나머지 ${others}군은 합격 여유가 있는 곳으로 채워야 합니다.`,
          `${group}군 도전 카드로만 검토하고, ${others}군 원서로 결과를 확실히 받쳐 두는 편이 안전합니다.`,
          `${group}군에 쓰더라도 결과를 기대하기보다 도전의 의미가 크므로, ${others}군 원서의 안정성을 먼저 확보해야 합니다.`,
        ]
      : [
          `${group}군 상향 원서로 둔다면, 나머지 ${others}군에는 적정·안정 원서를 두어 결과를 받쳐야 합니다.`,
          `${group}군에서 도전해 볼 만한 원서로, ${others}군은 합격 여유가 있는 곳으로 고르는 편이 안전합니다.`,
          `${group}군 상향 카드로 검토할 수 있으며, 이때 ${others}군 중 한 곳 이상은 안정 원서로 두는 편이 합리적입니다.`,
        ];
  }
  if (tier === "적정") {
    return chance === "높음"
      ? [
          `${group}군의 주력 원서로 검토할 만한 위치입니다.`,
          `${group}군에서 합격 가능성을 챙기는 축으로 둘 만한 원서입니다.`,
          `${group}군 원서로 두면 원서 세 장의 중심을 잡아 주는 역할을 합니다.`,
        ]
      : [
          `${group}군 적정 원서로 두되, 같은 군의 다른 후보와 기준컷 여유를 비교해 고르는 편이 좋습니다.`,
          `${group}군에 둘 수 있는 원서지만 결과가 당해 경쟁에 따라 갈릴 수 있어, ${others}군에 안정 원서를 함께 두는 편이 좋습니다.`,
          `${group}군 적정 후보로 검토하되, 원서 접수 직전의 경쟁률 흐름을 함께 보고 확정하는 편이 좋습니다.`,
        ];
  }
  return [
    `${group}군 안정 원서로 두면, ${others}군에서 상향을 시도할 여지가 생깁니다.`,
    `${group}군에서 결과를 받쳐 주는 원서로, 세 장 중 한 장을 안정적으로 두고 싶을 때 적합합니다.`,
    `${group}군 안정 카드로 쓰면 원서 전체의 위험을 낮춰 줍니다.`,
    `${group}군에 두면 다른 군 원서를 과감하게 고를 수 있게 받쳐 주는 원서입니다.`,
    `${group}군 안정 후보 중 하나로, 같은 군의 다른 안정 후보와 희망 학과·대학 선호를 비교해 고르면 됩니다.`,
  ];
};

/**
 * PART 5 추천 이유의 마지막 문장: 이 원서를 어떻게 쓰면 되는지의 조언.
 * 같은 구분·모집군이 이어져도 문장이 겹치지 않게 표현을 돌려 쓴다.
 */
export const composeDetailAdvice = (items: DetailAdviceInput[]): string[] => {
  const used = new Map<string, number>();
  const written = new Set<string>();
  return items.map((item) => {
    const sentences = detailAdviceSentences(item);
    const key = `${item.tier}|${item.chance}`;
    const order = used.get(key) ?? 0;
    used.set(key, order + 1);
    // 같은 군·구분이 여러 곳이면 돌려 쓰다 같은 문장이 되어 지워졌다(실측:
    // 가군 안정 4곳). 이미 쓴 문장은 건너뛴다.
    const rotated = [
      ...sentences.slice(order % sentences.length),
      ...sentences.slice(0, order % sentences.length),
    ];
    const sentence =
      rotated.find((candidate) => !written.has(candidate)) ?? rotated[0];
    written.add(sentence);
    return sentence;
  });
};

// ─── PART 2 컨설턴트 판단 문장 ───

export type MatchVerdict = "유리" | "주의" | "중립";

/**
 * 반영방식이 이 학생에게 어떤 후보인지의 판정. 코드가 이미 판정한 강점·약점
 * 비중의 목록 안 위치만으로 정한다(새 수치·추정 없음).
 * - 주의: 약점 비중이 목록에서 가장 크거나, 목록에서 약점을 반영하는 대학이 이곳뿐
 * - 유리: 강점 비중이 목록에서 가장 크거나, 약점이 빠지거나 가장 작게 반영됨
 * - 중립: 그 밖(가중치 공시 대학처럼 비중을 견줄 수 없는 경우 포함)
 */
export const classifyMatchVerdict = (item: MatchFactInput): MatchVerdict => {
  const { strength, weakness } = item;
  const weaknessHeavy =
    weakness !== undefined &&
    weakness.value > 0 &&
    (weakness.position === "가장 높음" || weakness.position === null);
  if (weaknessHeavy) return "주의";
  const favorable =
    strength?.position === "가장 높음" ||
    (weakness !== undefined &&
      (weakness.value === 0 || weakness.position === "가장 낮음"));
  return favorable ? "유리" : "중립";
};

const MATCH_VERDICT_SENTENCES: Record<MatchVerdict, string[]> = {
  유리: [
    "반영방식만 놓고 보면 이 학생에게 유리한 구조라, 합격선이 비슷한 후보 사이에서는 먼저 검토할 대학입니다.",
    "같은 성적이 더 높게 환산되는 구조라, 기준컷이 비슷한 대학과 견줄 때 우선순위를 높여 볼 만합니다.",
    "강점은 살고 약점은 덜 드러나는 반영이라, 원서 후보를 좁힐 때 앞쪽에 둘 대학입니다.",
    "이 학생의 성적 구조와 잘 맞는 반영방식이라, 지원 후보로 적극 검토할 만합니다.",
  ],
  주의: [
    "약점이 상대적으로 크게 반영되는 구조라, 기준컷 여유가 충분할 때 원서로 검토하는 편이 안전합니다.",
    "반영방식에서 손실이 생길 수 있어, 합격선이 비슷한 다른 대학과 비교해 신중히 고를 대학입니다.",
  ],
  중립: [
    "반영방식에서 생기는 유불리는 크지 않아, 기준컷과의 격차를 보고 판단할 대학입니다.",
    "반영 구조의 차이가 작아, 합격 가능성을 기준으로 원서 여부를 정하는 편이 합리적입니다.",
    "반영방식보다는 기준컷 여유와 모집군 배치를 함께 보고 고를 대학입니다.",
    "반영방식이 결과를 크게 바꾸지 않는 대학이라, 다른 원서와의 군 배치를 먼저 따져 볼 대학입니다.",
  ],
};

/**
 * PART 2 항목마다 붙는 컨설턴트 판단 문장. 같은 판정이 이어져도 문장이
 * 겹치지 않게 판정별로 표현을 돌려 쓴다.
 */
export const composeMatchVerdicts = (items: MatchFactInput[]): string[] => {
  const used: Record<MatchVerdict, number> = { 유리: 0, 주의: 0, 중립: 0 };
  return items.map((item) => {
    const verdict = classifyMatchVerdict(item);
    const sentences = MATCH_VERDICT_SENTENCES[verdict];
    const sentence = sentences[used[verdict] % sentences.length];
    used[verdict] += 1;
    return sentence;
  });
};

/** PART 2 항목별 두 문장 판정과, 그 항목에 쓸 수 있는 판정 전체 */
const judgeMatchItems = (
  items: MatchFactInput[],
  context: StudentContext
): { pairs: [JudgedFact, JudgedFact][]; pools: JudgedFact[][] } => {
  const strengthArea = firstScored(context.strengths);
  const strengthLabel = strengthArea ? AREA_LABEL[strengthArea] : null;
  const pools: JudgedFact[][] = [];

  const pairs = items.map((item): [JudgedFact, JudgedFact] => {
    const usesStandard =
      strengthLabel !== null &&
      item.metricSummary.includes(`${strengthLabel} 표준점수`);
    const metricFact: JudgedFact = usesStandard
      ? {
          value: item.metricSummary,
          meaning: `강점 영역인 ${strengthLabel}의 표준점수를 그대로 반영해, 같은 백분위 지원자 사이에서도 강점이 점수 차이로 드러납니다.`,
          sentence: `강점인 ${strengthLabel}${OBJECT_PARTICLE[strengthLabel]} 표준점수로 반영해, 같은 백분위 지원자 사이에서도 강점이 점수 차이로 드러납니다.`,
          alternate: {
            meaning: `강점인 ${strengthLabel}의 표준점수가 그대로 환산에 들어가, 세밀한 점수 차까지 반영되는 구조입니다.`,
            sentence: `강점인 ${strengthLabel}의 표준점수가 그대로 환산에 들어가, 세밀한 점수 차까지 반영되는 구조입니다.`,
          },
          extraSentences: [
            `${strengthLabel} 표준점수가 환산에 그대로 쓰여, 백분위가 같은 지원자와도 ${strengthLabel} 점수 차이로 갈립니다.`,
            `표준점수로 환산하는 대학이라, 강점인 ${strengthLabel}의 높은 점수가 깎이지 않고 반영됩니다.`,
          ],
        }
      : metricFactOf(item.metricSummary, strengthLabel);
    const strengthFact = item.strength
      ? strengthFactOf(
          item.strength,
          describeAreaScore(context, item.strength.label)
        )
      : null;
    const weaknessFact = item.weakness ? weaknessFactOf(item.weakness) : null;

    const leadsWithStrength = item.strength?.position === "가장 높음";
    const leadsWithWeakness =
      !leadsWithStrength &&
      item.weakness !== undefined &&
      (item.weakness.value === 0 || item.weakness.position === "가장 낮음");
    const first = leadsWithStrength
      ? strengthFact
      : leadsWithWeakness
        ? weaknessFact
        : metricFact;
    const rest = leadsWithStrength
      ? (weaknessFact ?? metricFact)
      : leadsWithWeakness
        ? (strengthFact ?? metricFact)
        : (weaknessFact ?? strengthFact ?? metricFact);

    const lead = first ?? metricFact;
    // 강점·약점 판정이 없으면 두 문장이 같은 판정이 된다. 2문장은 가중치나
    // 기준컷 격차 판정으로 바꾼다.
    const second =
      rest.value === lead.value
        ? judgeMatchWeight(item.ratioSummary, strengthLabel, item.metricSummary)
        : rest;
    pools.push(
      [strengthFact, weaknessFact, metricFact, second].filter(
        (fact, index, list): fact is JudgedFact =>
          fact !== null && list.indexOf(fact) === index
      )
    );
    return [lead, second];
  });
  return { pairs, pools };
};

/**
 * 같은 문장 반복을 바꿀 때 쓰는 PART 2 항목별 판정.
 * 강점·약점·활용지표 판정 모두다(다른 표현은 각 판정의 alternate).
 */
export const listMatchFacts = (
  items: MatchFactInput[],
  context: StudentContext
): JudgedFact[][] => judgeMatchItems(items, context).pools;

/**
 * PART 2 항목마다 두 문장의 판정.
 * 1문장은 이 대학이 목록에 오른 이유(강점 비중이 가장 큼 → 약점 비중이 가장
 * 작거나 빠짐 → 활용지표), 2문장은 반대쪽 영역의 판정이다. 반영 구조가 앞
 * 항목과 같으면 2문장은 두 대학 사이의 선택 기준으로 쓴다(같은 문장 반복 방지).
 */
export const assignMatchFacts = (
  items: MatchFactInput[],
  context: StudentContext
): [JudgedFact, JudgedFact][] => {
  const { pairs } = judgeMatchItems(items, context);

  // 쓰는 재료가 앞 항목과 같으면(반영비율이 같은 대학) 같은 문장이 나온다
  // (실측: 국민대·건국대). 2문장은 가장 가까운 앞 대학과의 선택 기준으로 바꾼다.
  // 가장 가까운 대학을 가리켜야 세 곳 이상이 같아도 문장이 겹치지 않는다.
  const keyOf = ([first, second]: [JudgedFact, JudgedFact]) =>
    `${first.value}|${second.value}`;
  const choiceBetween = (twin: string, condition: string): JudgedFact => ({
    value: `${twin}와 같은 ${condition}`,
    meaning: `${twin}와 ${condition}이 같아, 둘 중에서는 모집군과 합격 가능성으로 원서를 고르는 편이 합리적입니다.`,
    sentence: `${twin}와 ${condition}이 같아, 둘 중에서는 모집군과 합격 가능성으로 원서를 고르는 편이 합리적입니다.`,
  });
  const nearestBefore = (
    index: number,
    matches: (other: number) => boolean
  ) => {
    for (let other = index - 1; other >= 0; other -= 1) {
      if (matches(other)) return other;
    }
    return -1;
  };
  const twinned = pairs.map((pair, index): [JudgedFact, JudgedFact] => {
    const twinIndex = nearestBefore(
      index,
      (other) => keyOf(pairs[other]) === keyOf(pair)
    );
    if (twinIndex < 0) return pair;
    return [pair[0], choiceBetween(items[twinIndex].university, "반영비율")];
  });

  // 한 문장만 같아도 반복이 된다(실측: "국어는 반영하지 않아 …"가 4곳).
  // 두 번째부터는 같은 뜻의 다른 문장을 준다. 그래도 똑같은 문장이 나오면
  // 리포트에 담기 전에 코드가 다른 판정 문장으로 바꾼다(ensureUniqueSentences).
  const seen = new Set<string>();
  return twinned.map(
    (pair) =>
      pair.map((fact) => {
        const key = `${fact.value}|${fact.meaning}`;
        if (!seen.has(key)) {
          seen.add(key);
          return fact;
        }
        return fact.alternate ? { value: fact.value, ...fact.alternate } : fact;
      }) as [JudgedFact, JudgedFact]
  );
};

// ─── PART 1 성적 총평: 세 문장의 판정 ───

/** 영역 간 백분위 차이가 이 값 이상이면 반영방식에 따라 환산 결과가 크게 갈린다고 본다 */
const WIDE_SPREAD = 5;

/**
 * 백분위가 뜻하는 응시자 중 위치. 백분위는 "그 점수보다 낮은 응시자의 비율"이라
 * 상위 몇 %인지는 원문 값만으로 정해진다(추정 아님). 영어는 백분위가 없어 null.
 * 탐구는 두 과목의 평균 백분위가 실제 위치가 아니므로 과목별로 적는다.
 */
export const describeAreaLevel = (
  score: SuneungScore,
  area: ScoreArea
): string | null => {
  const top = (percentile: number) =>
    `상위 약 ${formatNumber(100 - percentile)}%`;
  if (area === "korean") return top(score.korean.percentile);
  if (area === "math") return top(score.math.percentile);
  if (area === "inquiry") {
    return `${score.inquiry1.subject} ${top(score.inquiry1.percentile)} · ${score.inquiry2.subject} ${top(score.inquiry2.percentile)}`;
  }
  return null;
};

/** 국어·수학·탐구 두 과목 중 가장 낮은 백분위. "모두 상위 N% 안" 판정의 근거 */
const lowestPercentile = (score: SuneungScore): number =>
  Math.min(
    score.korean.percentile,
    score.math.percentile,
    score.inquiry1.percentile,
    score.inquiry2.percentile
  );

const WITH_PARTICLE: Record<string, string> = {
  국어: "와",
  수학: "과",
  영어: "와",
  탐구: "와",
};

export const judgeScoreOverall = (
  context: StudentContext,
  averagePercentile: number,
  totalStandardScore: number
): JudgedFact[] => {
  // 백분위가 있는 국어·수학·탐구로 판정한다. 영어는 원문에 등급만 있다
  // (등급을 백분위로 바꾼 값은 쓰지 않는다 — 사용자 결정 2026-11-05).
  // 문장 순서는 리포트 구성(PART 1 = 현재 성적 수준 + 영역별 강점·약점)을 따른다:
  // 1문장 성적 수준 → 2문장 영역 간 구조 → 3문장 지원에서의 의미.
  const ranked = context.rows
    .filter(
      (row): row is AreaScoreRow & { percentile: number } =>
        row.percentile !== null
    )
    .sort((a, b) => b.percentile - a.percentile);
  const spread =
    ranked.length > 0
      ? Math.round(
          (ranked[0].percentile - ranked[ranked.length - 1].percentile) * 10
        ) / 10
      : 0;
  const wide = spread >= WIDE_SPREAD;
  const strength = context.strengths[0] ?? ranked[0]?.area;
  const weakness = context.weaknesses[0] ?? ranked[ranked.length - 1]?.area;
  const deviationOf = (area: ScoreArea) => {
    const deviation = context.rows.find(
      (item) => item.area === area
    )?.deviation;
    return deviation === null || deviation === undefined
      ? "-"
      : `${deviation > 0 ? "+" : ""}${formatNumber(deviation)}점`;
  };
  const describe = (area: ScoreArea) =>
    `${AREA_LABEL[area]} 백분위 ${percentileOf(context, area) ?? "-"}점(평균 대비 ${deviationOf(area)})`;
  const averageValue = `국·수·탐 평균 백분위 ${formatNumber(averagePercentile)}점, 표준점수 합 ${formatNumber(totalStandardScore)}점`;
  const lowest = lowestPercentile(context.score);
  const englishGrade = context.score.english.grade;

  const levelMeaning = `국어·수학·탐구 모두 응시자 상위 약 ${formatNumber(100 - lowest)}% 안(백분위 ${formatNumber(lowest)} 이상)에 드는 성적이며, 영어는 ${englishGrade}등급입니다.`;
  const first: JudgedFact = {
    value: averageValue,
    meaning: levelMeaning,
    sentence: `${averageValue}으로, ${levelMeaning}`,
  };
  const spreadTail = wide
    ? `${formatNumber(spread)}점으로 커, 강점과 약점이 뚜렷한 구조입니다.`
    : `${formatNumber(spread)}점으로 작아, 강점과 약점의 차이가 크지 않은 고른 구조입니다.`;
  const spreadMeaning = `영역 간 백분위 차이가 ${spreadTail}`;
  if (!strength || !weakness || strength === weakness) {
    return [
      first,
      {
        value: `영역 간 백분위 차이 ${formatNumber(spread)}점`,
        meaning: spreadMeaning,
        sentence: `국어·수학·탐구의 백분위 차이가 ${spreadTail}`,
      },
      {
        value: "기준컷 대비 격차",
        meaning:
          "특정 영역에 기대지 않는 성적이라, 원서 후보는 반영방식보다 기준컷과의 격차를 기준으로 먼저 좁히는 편이 합리적입니다.",
        sentence:
          "특정 영역에 기대지 않는 성적이라, 원서 후보는 반영방식보다 기준컷과의 격차를 기준으로 먼저 좁히는 편이 합리적입니다.",
      },
    ];
  }
  return [
    first,
    {
      value: `${describe(strength)}, ${describe(weakness)}`,
      meaning: `강점은 ${AREA_LABEL[strength]}, 약점은 ${AREA_LABEL[weakness]}이며, ${spreadMeaning}`,
      sentence: `강점인 ${AREA_LABEL[strength]}(평균 대비 ${deviationOf(strength)})${WITH_PARTICLE[AREA_LABEL[strength]]} 약점인 ${AREA_LABEL[weakness]}(평균 대비 ${deviationOf(weakness)})의 백분위 차이가 ${spreadTail}`,
    },
    // 영역 차이가 작으면 3문장도 같은 방향(격차가 먼저, 반영비율은 보조)으로
    // 맺는다. 차이가 작다고 판정한 뒤 "반영비율로 좁히라"고 맺어 어긋났다(실측).
    wide
      ? {
          value: `${AREA_LABEL[strength]} 비중이 높고 ${AREA_LABEL[weakness]} 비중이 낮은 대학`,
          meaning:
            "이런 대학에서 같은 성적이 더 높게 환산되므로, 원서 후보를 이 기준으로 먼저 좁히는 편이 합리적입니다.",
          sentence: `${AREA_LABEL[strength]} 비중이 높고 ${AREA_LABEL[weakness]} 비중이 낮은 대학일수록 같은 성적이 더 높게 환산되므로, 원서 후보를 이 기준으로 먼저 좁히는 편이 합리적입니다.`,
        }
      : {
          value: "기준컷 대비 격차",
          meaning: `반영방식보다 기준컷과의 격차가 지원 판단을 좌우하므로, 원서 후보는 격차로 먼저 좁히고 ${AREA_LABEL[strength]} 비중은 비슷한 후보 사이에서 고르는 기준으로 쓰는 편이 합리적입니다.`,
          sentence: `반영방식보다 기준컷과의 격차가 지원 판단을 좌우하므로, 원서 후보는 격차로 먼저 좁히고 ${AREA_LABEL[strength]} 비중은 비슷한 후보 사이에서 고르는 기준으로 쓰는 편이 합리적입니다.`,
        },
  ];
};

// ─── PART 3 지원 전략 총평: 세 문장의 판정 ───

const RISK_ALLOCATION_MEANING: Record<RiskAppetite, string> = {
  안정: "결과를 받쳐 줄 원서를 두 장 이상 확보해, 한 곳의 결과에 흔들리지 않는 구조를 만드는 배분입니다.",
  균형: "세 장의 성격을 군마다 다르게 두어, 도전과 안정 사이의 균형을 잡는 배분입니다.",
  공격: "적정 한 장이 상향 두 장의 결과를 받쳐 주는 구조라, 적정 원서를 어느 군에 두느냐가 핵심입니다.",
};

export interface RecommendationOverallInput {
  /** "상향 1곳, 적정 3곳, 안정 3곳" */
  tierCounts: string;
  /** 구분별 곳 수 */
  counts: { 상향: number; 적정: number; 안정: number };
  /** "상향 -1.3백분위점, 적정 …" (없으면 빈 문자열) */
  gapRanges: string;
  /** "상향 1장, 적정 1장, 안정 1장" */
  allocation: string;
  risk: RiskAppetite;
  /** 신중히 볼 대학. 예) "고려대학교 컴퓨터학과(-1.3백분위점)" */
  cautions: string[];
  /** 신중히 볼 대학을 이름으로 적는 수. 나머지는 "외 N곳" */
  listedCautions?: number;
}

export const judgeRecommendationOverall = (
  input: RecommendationOverallInput
): JudgedFact[] => {
  const tiers = (["상향", "적정", "안정"] as const).map((tier) => ({
    tier,
    count: input.counts[tier],
  }));
  const empty = tiers.find(({ count }) => count === 0);
  const single = tiers.find(({ count }) => count === 1);
  const spreadMeaning = empty
    ? `${empty.tier} 선택지가 없어, 그 자리는 다른 구분의 원서로 채워야 하는 구성입니다.`
    : single
      ? `${single.tier}은 1곳뿐이라 그 자리는 선택의 폭이 좁고, 나머지 구분에서 원서를 고를 여지가 큰 구성입니다.`
      : "세 구분에 선택지가 고루 있어, 성향에 맞춰 원서를 배분하기 수월한 구성입니다.";

  const shown = input.listedCautions ?? 2;
  const listed =
    input.cautions.length > shown
      ? `${input.cautions.slice(0, shown).join(", ")} 외 ${input.cautions.length - shown}곳`
      : input.cautions.join(", ");
  const reachLabel = JEONGSI_CHANCE_PHRASES.매우낮음.label;

  const noCautionMeaning =
    "목록의 모든 대학이 기준컷 이상이라, 배분 안에서 희망 학과와 대학 선호로 고르는 편이 합리적입니다.";
  const cautionMeaning =
    "기준컷에 못 미치거나 합격 가능성이 낮은 곳이라, 원서로 둘 때는 나머지 두 장으로 결과를 받쳐 두는 편이 합리적입니다.";
  return [
    {
      value: input.gapRanges
        ? `${input.tierCounts} (기준컷 대비 격차 ${input.gapRanges})`
        : input.tierCounts,
      meaning: spreadMeaning,
      sentence: `지원 가능 대학은 ${input.tierCounts}으로, ${spreadMeaning}`,
    },
    {
      value: `${input.risk} 성향의 기본 배분 ${input.allocation}`,
      meaning: RISK_ALLOCATION_MEANING[input.risk],
      sentence: `${input.risk} 성향의 기본 배분은 ${input.allocation}으로, ${RISK_ALLOCATION_MEANING[input.risk]}`,
    },
    input.cautions.length === 0
      ? {
          value: `'${reachLabel}' 0곳`,
          meaning: noCautionMeaning,
          sentence: noCautionMeaning,
        }
      : {
          value: listed,
          meaning: cautionMeaning,
          sentence: `신중히 볼 곳은 ${listed}이며, ${cautionMeaning}`,
        },
  ];
};

// ─── PART 4 조합 총평: 기본 배분과 같은 조합 ───

export interface CombinationAllocationInput {
  label: string;
  tiers: string[];
}

const ALLOCATION_TIERS = ["상향", "적정", "안정"] as const;

/** "(다군 지원처 없음)" 같은 꼬리를 뗀 조합 라벨 */
export const coreCombinationLabel = (label: string): string =>
  label.replace(/\s*\(.*\)$/, "");

const describeAllocation = (tiers: string[]): string =>
  ALLOCATION_TIERS.flatMap((tier) => {
    const count = tiers.filter((item) => item === tier).length;
    return count > 0 ? [`${tier} ${count}장`] : [];
  }).join(", ");

/**
 * 성향의 기본 배분과 칸 구성이 같은 조합. 모델에 조합의 칸을 세게 했더니
 * 5명 중 4명에게 틀린 조합을 지목했다(실측: 네 조합 모두 같은데 둘만 지목).
 */
export const findAllocationMatches = (
  combinations: CombinationAllocationInput[],
  risk: RiskAppetite
): string[] => {
  const allocation = formatCardAllocation(risk);
  return combinations
    .filter(
      (combination) => describeAllocation(combination.tiers) === allocation
    )
    .map((combination) => coreCombinationLabel(combination.label));
};

/** PART 4 총평 2문장의 판정: 기본 배분과 같은 조합이 무엇인지 */
export const judgeCombinationAllocation = (
  combinations: CombinationAllocationInput[],
  risk: RiskAppetite
): JudgedFact => {
  const allocation = formatCardAllocation(risk);
  const matches = findAllocationMatches(combinations, risk);
  if (combinations.length > 0 && matches.length === combinations.length) {
    const meaning = `${combinations.length}개 조합 모두 기본 배분(${allocation})과 같아, 배분보다 무엇을 앞세울지로 조합을 고르면 됩니다.`;
    return { value: `모든 조합이 ${allocation}`, meaning, sentence: meaning };
  }
  if (matches.length > 0) {
    const meaning = `기본 배분(${allocation})과 같은 조합은 ${matches.join("·")}이라, 성향을 그대로 따르려면 이 조합부터 살피는 편이 합리적입니다.`;
    return {
      value: `${allocation}과 같은 조합: ${matches.join("·")}`,
      meaning,
      sentence: meaning,
    };
  }
  // 칸 수를 "N장"으로 쓰면 합이 3장이 아니어서 배분 가드가 성향 배분으로
  // 바꿔 버린다. 구분 이름으로만 말한다.
  const patterns = [
    ...new Set(
      combinations.map((combination) =>
        ALLOCATION_TIERS.filter((tier) =>
          combination.tiers.includes(tier)
        ).join("·")
      )
    ),
  ];
  const meaning =
    patterns.length === 1 && patterns[0]
      ? `기본 배분(${allocation})과 같은 조합은 없고 모든 조합이 ${patterns[0]} 원서로 구성되어, 성향보다 지원 가능한 원서 안에서 고르는 구성입니다.`
      : `기본 배분(${allocation})과 같은 조합은 없어, 조합마다 구분 구성이 다른 점을 보고 고르는 편이 합리적입니다.`;
  return {
    value: `${allocation}과 같은 조합 없음`,
    meaning,
    sentence: meaning,
  };
};
