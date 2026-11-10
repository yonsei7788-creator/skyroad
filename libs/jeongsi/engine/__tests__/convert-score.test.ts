import {
  calcEnglishLoss,
  calcSensitivity,
  calcSimpleAveragePercentile,
  calcWeightedPercentile,
  convertScore,
  convertedTableFor,
  isScienceInquiry,
  lacksConvertibleInquiry,
  resolveAreaRatios,
  resolveInquiryUsage,
  roundTo3,
  toConvertedStandard,
} from "../convert-score";
import {
  baseScore,
  convertedStandardFormula,
  gradeTable,
  percentileFormula,
  standardFormula,
} from "./fixtures";

import type { ConversionFormula, SuneungScore } from "../../types";

describe("convertScore - 표준점수형 환산식", () => {
  it("손으로 계산한 환산점수와 일치한다", () => {
    // Arrange
    // 국어 130/150 x 30% x 1000 = 260
    // 수학 140/150 x 35% x 1000 = 326.666...
    // 탐구 (70+66)/2 = 68 → 68/80 x 25% x 1000 = 212.5
    // 영어 1등급 100/100 x 10% x 1000 = 100
    // 한국사 1등급 감산 0
    // 합계 899.1666... → 899.167
    const expected = 899.167;

    // Act
    const result = convertScore(baseScore, standardFormula);

    // Assert
    expect(result.convertedScore).toBe(expected);
    expect(result.areaScores).toEqual({
      korean: 260,
      math: 326.667,
      english: 100,
      inquiry: 212.5,
    });
  });

  it("손으로 계산한 가중 평균 백분위와 일치한다", () => {
    // Arrange
    // 영어는 원문에 백분위가 없어 국·수·탐 비율로만 가중한다
    // (93x30 + 96x35 + 92.5x25) / 90 = 94.028
    const expected = 94.028;

    // Act
    const result = calcWeightedPercentile(baseScore, {
      formula: standardFormula,
    });

    // Assert
    expect(result).toBe(expected);
  });

  it("비중을 추정치로 역산한 대학은 가중 백분위를 내지 않는다", () => {
    // Act
    const result = calcWeightedPercentile(baseScore, {
      formula: standardFormula,
      areaSharesEstimated: true,
    });

    // Assert
    expect(result).toBeNull();
  });

  it("한국사 3등급이면 감산분이 반영된다", () => {
    // Arrange
    const score: SuneungScore = { ...baseScore, history: { grade: 3 } };

    // Act
    const result = convertScore(score, standardFormula);

    // Assert
    expect(result.historyAdjustment).toBe(-1);
    expect(result.convertedScore).toBe(898.167);
  });

  it("영어 비율포함 방식에서 등급이 낮아지면 영역 점수가 줄어든다", () => {
    // Arrange
    const score: SuneungScore = { ...baseScore, english: { grade: 3 } };

    // Act
    const result = convertScore(score, standardFormula);

    // Assert
    // 3등급 88/100 x 10% x 1000 = 88 → 899.167 - 100 + 88
    expect(result.areaScores.english).toBe(88);
    expect(result.convertedScore).toBe(887.167);
  });

  it("탐구 1과목 반영이면 상위 1과목만 쓴다", () => {
    // Arrange
    const formula: ConversionFormula = {
      ...standardFormula,
      inquiryCount: 1,
    };

    // Act
    const result = convertScore(baseScore, formula);

    // Assert
    // 70/80 x 25% x 1000 = 218.75 → 260 + 326.667 + 218.75 + 100
    expect(result.inquiryUsage.subjects).toEqual(["물리학I"]);
    expect(result.areaScores.inquiry).toBe(218.75);
    expect(result.convertedScore).toBe(905.417);
  });
});

describe("convertScore - 백분위형 환산식", () => {
  it("손으로 계산한 환산점수와 일치한다 (미적분 가산 포함)", () => {
    // Arrange
    // 국어 93 x 30% x 1000 / 100 = 279
    // 수학 96 x 40% x 1000 / 100 = 384
    // 탐구 상위 1과목 95 → 285
    // 미적분 5% 가산 384 x 0.05 = 19.2
    // 영어 가산 10, 한국사 가산 5
    // 합계 982.2
    const expected = 982.2;

    // Act
    const result = convertScore(baseScore, percentileFormula);

    // Assert
    expect(result.convertedScore).toBe(expected);
    expect(result.bonusAdjustment).toBe(19.2);
    expect(result.englishAdjustment).toBe(10);
    expect(result.historyAdjustment).toBe(5);
  });

  it("수학 가산이 point 방식이면 정액으로 더한다", () => {
    // Arrange
    const formula: ConversionFormula = {
      ...percentileFormula,
      bonus: { mathElective: { 미적분: { type: "point", value: 10 } } },
    };

    // Act
    const result = convertScore(baseScore, formula);

    // Assert
    expect(result.bonusAdjustment).toBe(10);
    expect(result.convertedScore).toBe(973);
  });

  it("가산 대상이 아닌 선택과목은 가산을 받지 않는다", () => {
    // Arrange
    const score: SuneungScore = {
      ...baseScore,
      math: { elective: "확률과통계", standardScore: 140, percentile: 96 },
    };

    // Act
    const result = convertScore(score, percentileFormula);

    // Assert
    expect(result.bonusAdjustment).toBe(0);
    expect(result.convertedScore).toBe(963);
  });

  it("영어를 가산으로 쓰는 대학도 가중 백분위가 과소평가되지 않는다", () => {
    // Arrange
    // 반영비율 합(100)으로 나누므로 영어 비중 0이어도 정상
    // (93x30 + 96x40 + 95x30) / 100 = 94.8
    const expected = 94.8;

    // Act
    const result = calcWeightedPercentile(baseScore, {
      formula: percentileFormula,
    });

    // Assert
    expect(result).toBe(expected);
  });
});

describe("convertScore - 변환표준점수형 환산식", () => {
  it("백분위를 변환표준점수로 바꿔 환산한다", () => {
    // Arrange
    // 백분위 95 → 68, 90 → 64 / 평균 66
    // 탐구 66/70 x 30% x 1000 = 282.857...
    // 국어 279 + 수학 384 → 945.857
    const expected = 945.857;

    // Act
    const result = convertScore(baseScore, convertedStandardFormula);

    // Assert
    expect(result.convertedScore).toBe(expected);
    expect(result.areaScores.inquiry).toBe(282.857);
  });

  it("영어 감산 방식이면 등급에 따라 점수가 깎인다", () => {
    // Arrange
    const score: SuneungScore = { ...baseScore, english: { grade: 3 } };

    // Act
    const result = convertScore(score, convertedStandardFormula);

    // Assert
    expect(result.englishAdjustment).toBe(-5);
    expect(result.convertedScore).toBe(940.857);
  });
});

describe("convertScore - 과탐 가산점", () => {
  const totalBonusFormula: ConversionFormula = {
    ...standardFormula,
    bonus: {
      scienceInquiry: { type: "percent", value: 3, appliesTo: "total" },
    },
  };
  const eachBonusFormula: ConversionFormula = {
    ...standardFormula,
    bonus: {
      scienceInquiry: { type: "percent", value: 3, appliesTo: "each" },
    },
  };

  it("total 방식은 탐구 영역 총점에 1회 적용한다", () => {
    // Arrange
    // 212.5 x 3% = 6.375

    // Act
    const result = convertScore(baseScore, totalBonusFormula);

    // Assert
    expect(result.bonusAdjustment).toBe(6.375);
    expect(result.convertedScore).toBe(905.542);
  });

  it("each 방식은 반영된 과탐 과목 수만큼 적용한다", () => {
    // Arrange
    const mixedScore: SuneungScore = {
      ...baseScore,
      inquiry2: { subject: "사회문화", standardScore: 66, percentile: 90 },
    };

    // Act
    const bothScience = convertScore(baseScore, eachBonusFormula);
    const oneScience = convertScore(mixedScore, eachBonusFormula);

    // Assert
    expect(bothScience.bonusAdjustment).toBe(6.375);
    expect(oneScience.bonusAdjustment).toBe(3.188);
  });

  it("사탐만 응시하면 과탐 가산을 받지 않는다", () => {
    // Arrange
    const socialOnly: SuneungScore = {
      ...baseScore,
      inquiry1: { subject: "생활과윤리", standardScore: 70, percentile: 95 },
      inquiry2: { subject: "사회문화", standardScore: 66, percentile: 90 },
    };

    // Act
    const result = convertScore(socialOnly, eachBonusFormula);

    // Assert
    expect(result.bonusAdjustment).toBe(0);
  });
});

describe("toConvertedStandard", () => {
  const table = { 100: 72, 95: 68, 90: 64 };

  it("표에 있는 백분위는 그대로 대응한다", () => {
    // Arrange & Act
    const result = toConvertedStandard(table, 95);

    // Assert
    expect(result).toBe(68);
  });

  it("표에 없는 백분위는 인접 두 점을 선형보간한다", () => {
    // Arrange
    // 90(64) ~ 95(68) 사이의 92 → 64 + 4 x 0.4 = 65.6

    // Act
    const result = toConvertedStandard(table, 92);

    // Assert
    expect(result).toBeCloseTo(65.6, 6);
  });

  it("표 범위를 벗어나면 양 끝값으로 고정한다", () => {
    // Arrange & Act
    const below = toConvertedStandard(table, 80);
    const above = toConvertedStandard(table, 100);

    // Assert
    expect(below).toBe(64);
    expect(above).toBe(72);
  });
});

describe("보조 함수", () => {
  it("과학탐구 과목을 판별한다", () => {
    // Arrange & Act & Assert
    expect(isScienceInquiry("물리학I")).toBe(true);
    expect(isScienceInquiry("생활과윤리")).toBe(false);
  });

  it("소수점 셋째 자리에서 반올림한다", () => {
    // Arrange & Act & Assert
    expect(roundTo3(1.23456)).toBe(1.235);
    expect(roundTo3(0.1 + 0.2)).toBe(0.3);
  });

  it("지표값이 같으면 백분위가 높은 탐구 과목을 상위로 본다", () => {
    // Arrange
    const tiedScore: SuneungScore = {
      ...baseScore,
      inquiry1: { subject: "화학I", standardScore: 70, percentile: 92 },
      inquiry2: { subject: "물리학I", standardScore: 70, percentile: 96 },
    };
    const formula: ConversionFormula = {
      ...standardFormula,
      inquiryCount: 1,
    };

    // Act
    const usage = resolveInquiryUsage(tiedScore, formula);

    // Assert
    expect(usage.subjects).toEqual(["물리학I"]);
  });

  it("영어 비율포함 테이블이 전부 0이면 영어 점수는 0이다", () => {
    // Arrange
    const formula: ConversionFormula = {
      ...standardFormula,
      english: { type: "ratioIncluded", scoreByGrade: gradeTable({}) },
    };

    // Act
    const result = convertScore(baseScore, formula);

    // Assert
    expect(result.areaScores.english).toBe(0);
  });
});

describe("calcSimpleAveragePercentile", () => {
  it("국·수·탐 단순 평균을 낸다 (영어 제외)", () => {
    // Arrange
    // (93 + 96 + (95+90)/2) / 3 = 93.833

    // Act
    const result = calcSimpleAveragePercentile(baseScore);

    // Assert
    expect(result).toBe(93.833);
  });

  it("대학 반영비율과 무관하게 같은 값이다", () => {
    // Arrange & Act
    const value = calcSimpleAveragePercentile(baseScore);
    const weightedStandard = calcWeightedPercentile(baseScore, {
      formula: standardFormula,
    });
    const weightedPercentileBased = calcWeightedPercentile(baseScore, {
      formula: percentileFormula,
    });

    // Assert
    expect(weightedStandard).not.toBe(value);
    expect(weightedPercentileBased).not.toBe(value);
  });
});

describe("calcSensitivity", () => {
  it("표준점수를 반영하는 대학은 원문만으로 계산할 수 없어 null 이다", () => {
    // Arrange
    // 백분위 1점이 표준점수 몇 점인지는 원문에 없다(기울기 추정표 폐기)

    // Act
    const result = calcSensitivity(baseScore, standardFormula);

    // Assert
    expect(result).toBeNull();
  });

  it("백분위형 대학의 민감도를 손으로 계산한 값과 일치한다", () => {
    // Arrange
    // 국어 +1 → 3, 수학 +1 → 4, 미적분 5% 가산 증가분 → 0.2
    // 탐구 상위 1과목 +1 → 3 / 합 10.2 → 1.02

    // Act
    const result = calcSensitivity(baseScore, percentileFormula);

    // Assert
    expect(result).toBe(1.02);
  });

  it("변환표준점수형 대학의 민감도를 손으로 계산한 값과 일치한다", () => {
    // Arrange
    // 탐구 백분위 95→96 은 68→68.8, 90→91 은 64→64.8 (보간)
    // 평균 66 → 66.8 → 0.8/70 x 30% x 1000 = 3.429
    // 국어 3 + 수학 4 + 3.429 = 10.429 → 1.043

    // Act
    const result = calcSensitivity(baseScore, convertedStandardFormula);

    // Assert
    expect(result).toBe(1.043);
  });

  it("같은 성적도 대학마다 민감도가 달라 공통 임계값을 쓸 수 없다", () => {
    // Arrange
    // 환산 총점 대비 % 는 민감도로 나눠야 백분위점으로 환산된다.
    // 세 환산식의 민감도가 모두 다르므로 같은 % 격차가 대학마다
    // 다른 백분위점을 뜻한다.

    // Act
    const percentile = calcSensitivity(baseScore, percentileFormula);
    const converted = calcSensitivity(baseScore, convertedStandardFormula);

    // Assert
    expect(percentile).not.toBe(converted);
    expect(percentile).toBeGreaterThan(0);
  });

  it("백분위가 만점이면 후진차분으로 계산해 양수를 유지한다", () => {
    // Arrange
    const perfectScore: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 150, percentile: 100 },
      math: { elective: "미적분", standardScore: 150, percentile: 100 },
      inquiry1: { subject: "물리학I", standardScore: 80, percentile: 100 },
      inquiry2: { subject: "화학I", standardScore: 80, percentile: 100 },
    };

    // Act
    const result = calcSensitivity(perfectScore, percentileFormula);

    // Assert
    expect(result).toBeGreaterThan(0);
  });
});

describe("calcEnglishLoss", () => {
  it("1등급은 손실이 0이다", () => {
    // Arrange & Act & Assert
    expect(calcEnglishLoss(standardFormula, 1)).toBe(0);
    expect(calcEnglishLoss(convertedStandardFormula, 1)).toBe(0);
    expect(calcEnglishLoss(percentileFormula, 1)).toBe(0);
  });

  it("비율포함 대학의 손실을 총점 대비 %로 낸다", () => {
    // Arrange
    // 1등급 100 → 3등급 88, 영어 비율 10% x 1000 = 100점 만점
    // (100 - 88) / 1000 x 100 = 1.2%

    // Act
    const result = calcEnglishLoss(standardFormula, 3);

    // Assert
    expect(result).toBe(1.2);
  });

  it("감산 대학의 손실은 1등급 대비 감점 차이다", () => {
    // Arrange
    // 3등급 감점 5점 - 1등급 감점 0점 = 5 → 0.5%

    // Act
    const result = calcEnglishLoss(convertedStandardFormula, 3);

    // Assert
    expect(result).toBe(0.5);
  });

  it("가산 대학의 손실은 1등급 가산과의 차이다", () => {
    // Arrange
    // 1등급 10점 - 3등급 6점 = 4 → 0.4%

    // Act
    const result = calcEnglishLoss(percentileFormula, 3);

    // Assert
    expect(result).toBe(0.4);
  });
});

describe("convertScore - 상위 영역 선택", () => {
  /** 국·수 중 우수 영역 45%, 다른 영역 35% (성균관대형) */
  const koreanMathRankFormula: ConversionFormula = {
    ...standardFormula,
    ratios: { korean: 45, math: 35, english: 10, inquiry: 10 },
    selection: {
      areas: ["korean", "math"],
      rankRatios: [45, 35],
      rankBasis: "standard",
    },
  };

  /** 국·수·영·탐 중 상위 3개 영역 평균 (교통대형) */
  const topThreeFormula: ConversionFormula = {
    ...percentileFormula,
    ratios: { korean: 100 / 3, math: 100 / 3, english: 100 / 3, inquiry: 0 },
    english: {
      type: "ratioIncluded",
      scoreByGrade: gradeTable({ 1: 100, 2: 95, 3: 90, 4: 85, 5: 80 }),
    },
    bonus: undefined,
    selection: {
      areas: ["korean", "math", "english", "inquiry"],
      rankRatios: [100 / 3, 100 / 3, 100 / 3],
      rankBasis: "percentile",
    },
  };

  it("우수 영역에 큰 비율을 준다", () => {
    // Arrange
    // 수학 140 > 국어 130 → 수학 45%, 국어 35%
    // 수학 140/150 x 45% x 1000 = 420
    // 국어 130/150 x 35% x 1000 = 303.333
    // 영어 1등급 100/100 x 10% x 1000 = 100
    // 탐구 68/80 x 10% x 1000 = 85
    const expected = 908.333;

    // Act
    const result = convertScore(baseScore, koreanMathRankFormula);

    // Assert
    expect(result.convertedScore).toBe(expected);
    expect(result.areaScores.math).toBe(420);
    expect(result.areaScores.korean).toBe(303.333);
  });

  it("국어가 더 높으면 국어가 우수 영역 비율을 받는다", () => {
    // Arrange
    const koreanStrong: SuneungScore = {
      ...baseScore,
      korean: { ...baseScore.korean, standardScore: 145 },
    };

    // Act
    const ratios = resolveAreaRatios(koreanStrong, koreanMathRankFormula);

    // Assert
    expect(ratios.korean).toBe(45);
    expect(ratios.math).toBe(35);
  });

  it("상위 N개 밖의 영역은 반영하지 않는다", () => {
    // Arrange
    // 영어 1등급 100, 수학 96, 탐구 상위 1과목 95, 국어 93 → 국어 제외
    // (100 + 96 + 95) / 3 x 10 = 970, 한국사 1등급 가산 5
    const expected = 975;

    // Act
    const result = convertScore(baseScore, topThreeFormula);

    // Assert
    expect(result.areaScores.korean).toBe(0);
    expect(result.convertedScore).toBe(expected);
  });

  it("규칙이 없으면 환산식의 반영비율을 그대로 쓴다", () => {
    // Arrange & Act
    const ratios = resolveAreaRatios(baseScore, standardFormula);

    // Assert
    expect(ratios).toEqual(standardFormula.ratios);
  });

  it("가중 평균 백분위도 학생에게 적용된 비율로 계산한다", () => {
    // Arrange
    // 반영: 영어 · 수학 96 · 탐구 95, 국어 제외. 영어는 백분위가 없어 빼고 가중
    const expected = roundTo3((96 + 95) / 2);

    // Act
    const result = calcWeightedPercentile(baseScore, {
      formula: topThreeFormula,
    });

    // Assert
    expect(result).toBe(expected);
  });

  it("민감도는 선택된 영역만으로 계산되어 양수를 유지한다", () => {
    // Arrange
    // 상위 3개 영역 중 국·수·탐 두 영역(수학·탐구)이 1점씩 오르면
    // (1 + 1) / 3 x 10 = 6.667 → 총점 대비 0.667%
    const expected = 0.667;

    // Act
    const result = calcSensitivity(baseScore, topThreeFormula);

    // Assert
    expect(result).toBe(expected);
  });

  it("영어 손실은 학생에게 적용된 영어 비율로 계산한다", () => {
    // Arrange
    // 3등급 90/100 → 1등급 대비 10점 x 33.33% x 1000/100 = 33.333 → 3.333%
    const englishRatio = resolveAreaRatios(baseScore, topThreeFormula).english;

    // Act
    const result = calcEnglishLoss(topThreeFormula, 3, englishRatio);

    // Assert
    expect(result).toBe(3.333);
  });
});

describe("사탐·과탐 열이 다른 변환표준점수표", () => {
  /** 과탐 열과 사탐 열의 값이 다른 표 (전북대형) */
  const splitFormula: ConversionFormula = {
    ...convertedStandardFormula,
    convertedStandardTable: undefined,
    convertedStandardTableByTrack: {
      science: { 100: 70, 95: 66, 90: 62 },
      social: { 100: 71, 95: 67, 90: 63 },
    },
  };
  /** 물리학I 95 · 생활과윤리 90 */
  const mixedScore: SuneungScore = {
    ...baseScore,
    inquiry1: { subject: "물리학I", standardScore: 70, percentile: 95 },
    inquiry2: { subject: "생활과윤리", standardScore: 64, percentile: 90 },
  };

  it("과목마다 응시한 과목의 열을 쓴다", () => {
    // Arrange
    // 물리학I(과탐) 95 → 과탐 열 66 / 생활과윤리(사탐) 90 → 사탐 열 63

    // Act
    const usage = resolveInquiryUsage(mixedScore, splitFormula);

    // Assert
    expect(usage.metricAverage).toBe((66 + 63) / 2);
    expect(convertedTableFor(splitFormula, "생활과윤리")).toBe(
      splitFormula.convertedStandardTableByTrack?.social
    );
  });

  it("원문에 열이 없는 과목은 값을 만들지 않고 반영할 수 없다고 판정한다", () => {
    // Arrange: 사탐 열이 "해당없음"인 표 (차의과대형)
    const scienceOnly: ConversionFormula = {
      ...splitFormula,
      convertedStandardTableByTrack: {
        science: { 100: 70, 95: 66, 90: 62 },
        social: null,
      },
    };

    // Act
    const usage = resolveInquiryUsage(mixedScore, scienceOnly);

    // Assert: 2과목 반영인데 환산할 수 있는 과목은 물리학I 하나뿐이다
    expect(convertedTableFor(scienceOnly, "생활과윤리")).toBeNull();
    expect(usage.subjects).toEqual(["물리학I"]);
    expect(lacksConvertibleInquiry(mixedScore, scienceOnly)).toBe(true);
    expect(lacksConvertibleInquiry(mixedScore, splitFormula)).toBe(false);
  });

  it("빈 표는 백분위로 대신하지 않는다", () => {
    // Act & Assert
    expect(toConvertedStandard({}, 95)).toBeNaN();
  });
});
