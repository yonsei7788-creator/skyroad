// ============================================================
// 대학별 수능 환산점수 계산
//
// ConversionFormula(데이터)를 해석해 학생의 환산점수를 만든다.
// 계산 순서는 libs/jeongsi/types.ts 의 ConversionFormula JSDoc 과
// 동일하다:
//   1. (선택과목 제한은 eligibility.ts 가 선행 처리)
//   2. 영역별 지표값 추출
//   2-1. 상위 영역 선택이 있으면 순위별 반영비율 확정 (resolveAreaRatios)
//   3. 정규화: 지표값 / 기준만점 x 반영비율 x 총점
//   4. 가산점 (수학 선택, 과탐)
//   5. 영어 (비율 포함 / 가산 / 감산)
//   6. 한국사 (가산 / 감산)
// ============================================================

import type {
  AreaRatios,
  ConversionFormula,
  JeongsiAdmissionPlan,
  PercentileBasis,
  InquirySubject,
  ScienceInquirySubject,
  ScoreArea,
  SuneungGrade,
  SuneungScore,
} from "../types";

/** 소수점 셋째 자리 반올림. 부동소수점 누적 오차를 끊는다 */
export const roundTo3 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

/** 과학탐구 과목 집합. 가산점·응시제한 판정의 단일 출처 */
const SCIENCE_INQUIRY_SUBJECTS: readonly ScienceInquirySubject[] = [
  "물리학I",
  "화학I",
  "생명과학I",
  "지구과학I",
  "물리학II",
  "화학II",
  "생명과학II",
  "지구과학II",
];

/** 과학탐구 과목인지 판정 */
export const isScienceInquiry = (
  subject: InquirySubject
): subject is ScienceInquirySubject =>
  SCIENCE_INQUIRY_SUBJECTS.includes(subject as ScienceInquirySubject);

/** 탐구 반영에 실제로 사용된 과목 정보 */
export interface InquiryUsage {
  /** 환산에 사용된 과목 (inquiryCount 가 1이면 상위 1과목) */
  subjects: InquirySubject[];
  /** 사용 과목의 지표값 평균 */
  metricAverage: number;
  /** 사용 과목의 백분위 평균 */
  percentileAverage: number;
  /** 사용 과목 중 과학탐구 과목 수 */
  scienceCount: number;
}

/** 영역별 환산 기여 점수 */
export type AreaScoreMap = Record<ScoreArea, number>;

/** 환산 결과 상세 */
export interface ScoreConversion {
  /** 최종 환산점수 (가산·영어·한국사 반영 후) */
  convertedScore: number;
  /** 영역별 기여 점수 (영어는 반영방식에 따라 0 일 수 있음) */
  areaScores: AreaScoreMap;
  /** 가산점 가감분 */
  bonusAdjustment: number;
  /** 영어 가감분 (ratioIncluded 는 areaScores.english 에 포함) */
  englishAdjustment: number;
  /** 한국사 가감분 */
  historyAdjustment: number;
  /** 탐구 반영 상세 */
  inquiryUsage: InquiryUsage;
}

/**
 * 백분위 → 변환표준점수.
 * 표에 정확히 일치하는 키가 없으면 인접 두 점 사이를 선형보간한다.
 * (대학 공개표는 보통 1 백분위 단위이므로 보간은 예외 경로다)
 */
export const toConvertedStandard = (
  table: Record<number, number>,
  percentile: number
): number => {
  const exact = table[percentile];
  if (exact !== undefined) {
    return exact;
  }

  const keys = Object.keys(table)
    .map(Number)
    .filter((key) => Number.isFinite(key))
    .sort((a, b) => a - b);

  // 빈 표면 원문 값이 없다. 백분위로 대신하지 않는다.
  if (keys.length === 0) {
    return Number.NaN;
  }

  const [firstKey] = keys;
  const lastKey = keys[keys.length - 1];
  if (percentile <= firstKey) {
    return table[firstKey];
  }
  if (percentile >= lastKey) {
    return table[lastKey];
  }

  const upperIndex = keys.findIndex((key) => key > percentile);
  const lower = keys[upperIndex - 1];
  const upper = keys[upperIndex];
  const ratio = (percentile - lower) / (upper - lower);
  return table[lower] + (table[upper] - table[lower]) * ratio;
};

/**
 * 응시 과목에 맞는 변환표준점수표. 사탐·과탐 열이 같으면 공통 표, 다르면
 * 과목 계열의 열이다. 원문에 그 열이 "해당없음"이면 null — 이 과목은 이 대학
 * 환산식으로 계산할 수 없다(다른 열이나 백분위로 대신하지 않는다).
 */
export const convertedTableFor = (
  formula: ConversionFormula,
  subject: InquirySubject
): Record<number, number> | null => {
  if (formula.convertedStandardTable) {
    return formula.convertedStandardTable;
  }
  const byTrack = formula.convertedStandardTableByTrack;
  if (!byTrack) {
    return null;
  }
  return isScienceInquiry(subject) ? byTrack.science : byTrack.social;
};

/**
 * 변환표준점수 환산식에서 반영할 수 있는 탐구 과목이 모자라는지.
 * 변표에 응시 과목의 열이 없으면 그 과목은 반영할 수 없다.
 */
export const lacksConvertibleInquiry = (
  score: SuneungScore,
  formula: ConversionFormula
): boolean => {
  if (formula.metric.inquiry !== "convertedStandard") {
    return false;
  }
  const convertible = [score.inquiry1, score.inquiry2].filter(
    (entry) => convertedTableFor(formula, entry.subject) !== null
  ).length;
  return convertible < formula.inquiryCount;
};

/** 탐구 2과목 중 실제 반영 과목을 고른다 */
export const resolveInquiryUsage = (
  score: SuneungScore,
  formula: ConversionFormula
): InquiryUsage => {
  const metricOf = (
    subject: InquirySubject,
    percentile: number,
    standardScore: number
  ): number | null => {
    if (formula.metric.inquiry === "standard") {
      return standardScore;
    }
    if (formula.metric.inquiry === "percentile") {
      return percentile;
    }
    const table = convertedTableFor(formula, subject);
    return table ? toConvertedStandard(table, percentile) : null;
  };

  // 변표에 열이 없는 과목은 후보에서 뺀다(값을 만들지 않는다).
  // 반영할 과목이 모자라는 학생은 analyze 가 지원 불가로 분류한다.
  const candidates = [score.inquiry1, score.inquiry2].flatMap((entry) => {
    const metricValue = metricOf(
      entry.subject,
      entry.percentile,
      entry.standardScore
    );
    return metricValue === null
      ? []
      : [
          {
            subject: entry.subject,
            percentile: entry.percentile,
            metricValue,
          },
        ];
  });

  // 상위 과목 우선. 지표값이 같으면 백분위로 결정해 순서를 고정한다.
  const sorted = [...candidates].sort(
    (a, b) => b.metricValue - a.metricValue || b.percentile - a.percentile
  );
  const used = formula.inquiryCount === 1 ? sorted.slice(0, 1) : sorted;

  const sum = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0);

  return {
    subjects: used.map((entry) => entry.subject),
    metricAverage: sum(used.map((entry) => entry.metricValue)) / used.length,
    percentileAverage: sum(used.map((entry) => entry.percentile)) / used.length,
    scienceCount: used.filter((entry) => isScienceInquiry(entry.subject))
      .length,
  };
};

/**
 * 상위 영역 선택의 순위 비교값.
 * 영어는 표준점수·백분위가 없어 대학의 영어 점수표(원문)로 비교한다.
 */
const selectionRankValue = (
  area: ScoreArea,
  score: SuneungScore,
  formula: ConversionFormula,
  usage: InquiryUsage
): number => {
  const basis = formula.selection?.rankBasis ?? "areaScore";
  const { baseMax, metric } = formula;

  if (area === "english") {
    // 영어 점수표가 없으면 비교할 원문 값이 없어 선택 순위에서 뺀다.
    // 변환기는 이런 규칙을 만들지 않는다(현재 데이터 0건).
    if (formula.english.type !== "ratioIncluded") {
      return Number.NEGATIVE_INFINITY;
    }
    const table = formula.english.scoreByGrade;
    const max = Math.max(...Object.values(table));
    if (max <= 0) {
      return 0;
    }
    const share = table[score.english.grade] / max;
    return basis === "areaScore" ? share : share * 100;
  }

  if (area === "inquiry") {
    if (basis === "percentile") {
      return usage.percentileAverage;
    }
    return basis === "areaScore"
      ? usage.metricAverage / baseMax.inquiry
      : usage.metricAverage;
  }

  const entry = score[area];
  if (basis === "percentile") {
    return entry.percentile;
  }
  const metricValue =
    metric[area] === "standard" ? entry.standardScore : entry.percentile;
  return basis === "areaScore" ? metricValue / baseMax[area] : metricValue;
};

/**
 * 학생에게 실제로 적용되는 영역별 반영비율.
 *
 * 상위 영역 선택 규칙이 있으면 대상 영역을 rankBasis 로 줄 세워
 * 순위별 비율을 준다. 비교값이 같으면 areas 순서를 따른다 — 같은
 * 기준으로 환산하는 대학은 어느 쪽에 줘도 환산점수가 같다.
 * 규칙이 없으면 formula.ratios 그대로다.
 */
export const resolveAreaRatios = (
  score: SuneungScore,
  formula: ConversionFormula,
  usage: InquiryUsage = resolveInquiryUsage(score, formula)
): AreaRatios => {
  const { selection } = formula;
  if (!selection) {
    return formula.ratios;
  }

  const ranked = selection.areas
    .map((area, order) => ({
      area,
      order,
      value: selectionRankValue(area, score, formula, usage),
    }))
    .sort((a, b) => b.value - a.value || a.order - b.order);

  const ratios: AreaRatios = { ...formula.ratios };
  ranked.forEach(({ area }, rank) => {
    ratios[area] = selection.rankRatios[rank] ?? 0;
  });
  return ratios;
};

/**
 * 분석·해설에 쓰는 영역 비중. 비중을 원문에 없는 최고점 추정치로 역산한
 * 대학(plan.areaSharesEstimated)은 null 이다. 환산점수 계산은 이 함수가 아니라
 * resolveAreaRatios 를 쓴다(그쪽은 추정치가 상쇄돼 결과가 정확하다).
 */
export const resolveAreaShares = (
  score: SuneungScore,
  plan: Pick<JeongsiAdmissionPlan, "formula" | "areaSharesEstimated">
): AreaRatios | null =>
  plan.areaSharesEstimated ? null : resolveAreaRatios(score, plan.formula);

/** 영역 정규화 점수: 지표값 / 기준만점 x 반영비율 x 총점 */
const normalize = (
  metricValue: number,
  baseMax: number,
  ratio: number,
  totalScore: number
): number => {
  if (baseMax <= 0) {
    return 0;
  }
  return (metricValue / baseMax) * (ratio / 100) * totalScore;
};

/**
 * 영어 비율 포함(ratioIncluded) 점수.
 *
 * scoreByGrade 가 "이미 환산된 점수"로 기술되었는지 "100점 기준 테이블"로
 * 기술되었는지를 데이터만으로는 알 수 없다. 그래서 표의 최댓값을 기준으로
 * 자기정규화한다. 표가 이미 최종 점수면 최댓값이 ratio x 총점과 같아
 * 결과가 동일하고, 100점 기준이면 올바르게 축소된다.
 */
const englishRatioScore = (
  scoreByGrade: Record<SuneungGrade, number>,
  grade: SuneungGrade,
  ratio: number,
  totalScore: number
): number => {
  const values = Object.values(scoreByGrade);
  const max = Math.max(...values);
  if (max <= 0) {
    return 0;
  }
  return (scoreByGrade[grade] / max) * (ratio / 100) * totalScore;
};

/** 수학 선택과목 가산점 */
const mathBonus = (
  formula: ConversionFormula,
  score: SuneungScore,
  mathAreaScore: number
): number => {
  const rule = formula.bonus?.mathElective?.[score.math.elective];
  if (!rule) {
    return 0;
  }
  if (rule.type === "percent") {
    return mathAreaScore * (rule.value / 100);
  }
  return rule.value;
};

/**
 * 과탐 응시 가산점.
 * - appliesTo "each": 반영된 과탐 과목 하나하나에 적용 (탐구 영역
 *   점수를 반영 과목 수로 나눈 몫이 과목당 기여분)
 * - appliesTo "total": 반영 과목 중 과탐이 하나 이상이면 탐구 영역
 *   총점에 1회 적용
 */
const scienceBonus = (
  formula: ConversionFormula,
  usage: InquiryUsage,
  inquiryAreaScore: number
): number => {
  const rule = formula.bonus?.scienceInquiry;
  if (!rule || usage.scienceCount < (rule.minCount ?? 1)) {
    return 0;
  }

  if (rule.appliesTo === "total") {
    return rule.type === "percent"
      ? inquiryAreaScore * (rule.value / 100)
      : rule.value;
  }

  const perSubject = inquiryAreaScore / usage.subjects.length;
  return rule.type === "percent"
    ? perSubject * (rule.value / 100) * usage.scienceCount
    : rule.value * usage.scienceCount;
};

/** 민감도 하한. 0 나눗셈과 비정상 증폭을 막는다 */
export const SENSITIVITY_MIN = 0.1;

/**
 * 국·수·탐 단순 평균 백분위.
 *
 * 공개 백분위 입결(대학어디가 공시 등)은 거의 전부 국·수·탐 단순
 * 평균이므로, 백분위 입결과 비교할 때는 이 값을 쓴다
 * (specs/013 §6.2 — weightedPercentile 을 쓰면 강점 있는 학생이
 * 체계적으로 과대평가된다).
 */
export const calcSimpleAveragePercentile = (score: SuneungScore): number => {
  const inquiryAverage =
    (score.inquiry1.percentile + score.inquiry2.percentile) / 2;
  return roundTo3(
    (score.korean.percentile + score.math.percentile + inquiryAverage) / 3
  );
};

/**
 * 백분위 입결의 산출 기준별 학생 지표.
 *
 * 공개 백분위 입결은 대학마다 기준이 다를 수 있어(ResultCut.basis),
 * 입결이 밝힌 기준과 같은 방식으로 계산한 학생 값과 비교해야 한다.
 * 기준이 없으면 국·수·탐 단순평균으로 간주한다.
 */
export const calcPercentileByBasis = (
  score: SuneungScore,
  plan: Pick<JeongsiAdmissionPlan, "formula" | "areaSharesEstimated">
): Record<PercentileBasis, number | null> => ({
  simpleAverage: calcSimpleAveragePercentile(score),
  universityWeighted: calcWeightedPercentile(score, plan),
});

/** 국·수·탐 백분위만 1점씩 올린(또는 내린) 가상 성적. 표준점수는 그대로 둔다 */
const shiftPercentiles = (
  score: SuneungScore,
  direction: 1 | -1
): SuneungScore => {
  const shift = <T extends { percentile: number }>(entry: T): T => ({
    ...entry,
    percentile: entry.percentile + direction,
  });
  return {
    ...score,
    korean: shift(score.korean),
    math: shift(score.math),
    inquiry1: shift(score.inquiry1),
    inquiry2: shift(score.inquiry2),
  };
};

/** 표준점수를 반영하는 영역이 있는지 (반영비율 0 인 영역은 상위 영역 선택 대상일 때만) */
const usesStandardScore = (formula: ConversionFormula): boolean =>
  (["korean", "math", "inquiry"] as const).some(
    (area) =>
      formula.metric[area] === "standard" &&
      (formula.ratios[area] > 0 ||
        (formula.selection?.areas.includes(area) ?? false))
  );

/**
 * 환산점수의 백분위 민감도 (단위: 환산 총점 대비 % / 백분위점).
 *
 * 백분위만 1점 움직였을 때의 환산점수 변화로 구한다. 백분위·변환표준점수
 * (원문 표를 백분위로 찾음)로 환산하는 대학은 원문 값만으로 정확하다.
 * 표준점수를 반영하는 대학은 백분위 1점이 표준점수 몇 점인지 원문에 없어
 * 계산하지 않고 null 이다(이전의 기울기 추정표는 폐기 — 사용자 결정 2026-11-05).
 *
 * 이 값으로 환산점수 격차를 백분위점 격차로 되돌린다(specs/013 §1.2).
 */
export const calcSensitivity = (
  score: SuneungScore,
  formula: ConversionFormula
): number | null => {
  if (usesStandardScore(formula)) {
    return null;
  }
  // 백분위가 상한(100)이면 전진차분을 쓸 수 없어 후진차분으로 바꾼다.
  const atCap =
    score.korean.percentile >= 100 ||
    score.math.percentile >= 100 ||
    score.inquiry1.percentile >= 100 ||
    score.inquiry2.percentile >= 100;
  const direction: 1 | -1 = atCap ? -1 : 1;

  const base = convertScore(score, formula).convertedScore;
  const shifted = convertScore(
    shiftPercentiles(score, direction),
    formula
  ).convertedScore;

  const delta = ((shifted - base) * direction) / formula.totalScore;
  return roundTo3(Math.max(delta * 100, SENSITIVITY_MIN));
};

/**
 * 영어 1등급 대비 현재 등급의 손실 (환산 총점 대비 %).
 * 유리도의 영어 영향력 보정에 쓴다(specs/013 §5.3).
 */
export const calcEnglishLoss = (
  formula: ConversionFormula,
  grade: SuneungGrade,
  /** 상위 영역 선택 대학은 학생별 영어 비율 (resolveAreaRatios) */
  englishRatio = formula.ratios.english
): number => {
  const { english, totalScore } = formula;
  if (english.type === "subtract") {
    const { penaltyByGrade } = english;
    return roundTo3(
      ((penaltyByGrade[grade] - penaltyByGrade[1]) / totalScore) * 100
    );
  }

  const { scoreByGrade } = english;
  // ratioIncluded 는 표 최댓값 기준으로 자기정규화된 점수를 쓴다.
  const scale =
    english.type === "ratioIncluded"
      ? ((englishRatio / 100) * totalScore) /
        Math.max(...Object.values(scoreByGrade), 1)
      : 1;
  return roundTo3(
    (((scoreByGrade[1] - scoreByGrade[grade]) * scale) / totalScore) * 100
  );
};

/**
 * 대학 반영비율로 가중한 국·수·탐 평균 백분위.
 * 영어는 원문에 백분위가 없어 넣지 않는다.
 * ⚠️ 백분위 입결과의 비교에는 쓰지 않는다(그쪽은 국·수·탐 단순
 * 평균이 기준 — calcSimpleAveragePercentile). 유리도·표시용이다.
 */
export const calcWeightedPercentile = (
  score: SuneungScore,
  plan: Pick<JeongsiAdmissionPlan, "formula" | "areaSharesEstimated">
): number | null => {
  // 비중을 추정치로 역산한 대학은 가중할 비중이 원문에 없다
  if (plan.areaSharesEstimated) {
    return null;
  }
  const { formula } = plan;
  const usage = resolveInquiryUsage(score, formula);
  const ratios = resolveAreaRatios(score, formula, usage);
  // 영어는 원문에 백분위가 없어 국·수·탐 비율로만 가중한다
  const ratioSum = ratios.korean + ratios.math + ratios.inquiry;
  if (ratioSum <= 0) {
    return 0;
  }

  const weighted =
    score.korean.percentile * ratios.korean +
    score.math.percentile * ratios.math +
    usage.percentileAverage * ratios.inquiry;

  return roundTo3(weighted / ratioSum);
};

/** 학생 성적을 특정 대학 환산식으로 환산한다 */
export const convertScore = (
  score: SuneungScore,
  formula: ConversionFormula
): ScoreConversion => {
  const { metric, baseMax, totalScore } = formula;

  // 2. 영역별 지표값 추출
  const koreanMetric =
    metric.korean === "standard"
      ? score.korean.standardScore
      : score.korean.percentile;
  const mathMetric =
    metric.math === "standard"
      ? score.math.standardScore
      : score.math.percentile;
  const inquiryUsage = resolveInquiryUsage(score, formula);
  const ratios = resolveAreaRatios(score, formula, inquiryUsage);

  // 3. 정규화
  const koreanScore = normalize(
    koreanMetric,
    baseMax.korean,
    ratios.korean,
    totalScore
  );
  const mathScore = normalize(
    mathMetric,
    baseMax.math,
    ratios.math,
    totalScore
  );
  const inquiryScore = normalize(
    inquiryUsage.metricAverage,
    baseMax.inquiry,
    ratios.inquiry,
    totalScore
  );

  // 4. 가산점
  const bonusAdjustment =
    mathBonus(formula, score, mathScore) +
    scienceBonus(formula, inquiryUsage, inquiryScore);

  // 5. 영어
  const englishAreaScore =
    formula.english.type === "ratioIncluded"
      ? englishRatioScore(
          formula.english.scoreByGrade,
          score.english.grade,
          ratios.english,
          totalScore
        )
      : 0;

  let englishAdjustment = 0;
  if (formula.english.type === "add") {
    englishAdjustment = formula.english.scoreByGrade[score.english.grade];
  }
  if (formula.english.type === "subtract") {
    englishAdjustment = -formula.english.penaltyByGrade[score.english.grade];
  }

  // 6. 한국사
  const historyAdjustment =
    formula.history.type === "add"
      ? formula.history.scoreByGrade[score.history.grade]
      : -formula.history.penaltyByGrade[score.history.grade];

  const convertedScore =
    koreanScore +
    mathScore +
    inquiryScore +
    englishAreaScore +
    bonusAdjustment +
    englishAdjustment +
    historyAdjustment;

  return {
    convertedScore: roundTo3(convertedScore),
    areaScores: {
      korean: roundTo3(koreanScore),
      math: roundTo3(mathScore),
      english: roundTo3(englishAreaScore),
      inquiry: roundTo3(inquiryScore),
    },
    bonusAdjustment: roundTo3(bonusAdjustment),
    englishAdjustment: roundTo3(englishAdjustment),
    historyAdjustment: roundTo3(historyAdjustment),
    inquiryUsage,
  };
};
