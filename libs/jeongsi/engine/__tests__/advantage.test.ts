import { calcAdvantageScore } from "../advantage";
import {
  baseScore,
  convertedStandardFormula,
  gradeTable,
  makePlan,
  standardFormula,
} from "./fixtures";

import type { AdvantageContext } from "../advantage";
import type { ConversionFormula, SuneungScore } from "../../types";

/** 영어 손실 평균 0 = 영어 보정을 끈 기준 맥락 */
const noEnglishContext: AdvantageContext = { averageEnglishLoss: 0 };

const withRatios = (
  formula: ConversionFormula,
  ratios: ConversionFormula["ratios"]
): ConversionFormula => ({ ...formula, ratios });

describe("calcAdvantageScore - 기본 점수", () => {
  it("손으로 계산한 유리도와 일치한다", () => {
    // Arrange
    // 영어는 원문에 백분위가 없어 국·수·탐으로만 본다
    // 백분위 국93 수96 탐92.5 → 평균 93.833
    // 편차 -0.833 / +2.167 / -1.333
    // 국·수·탐 안 비중 (30·35·25 / 90) − 1/3 → 0 / +0.0556 / −0.0556
    // raw = 0 + 0.1204 + 0.0741 = 0.1944
    // scale = max(2.167, 1.333, 0.5) = 2.167
    // base = 50 + 50 x (0.1944 / 2.167) = 54.5 → 54
    const plan = makePlan({ formula: standardFormula });

    // Act
    const result = calcAdvantageScore(baseScore, plan, noEnglishContext);

    // Assert
    expect(result).toBe(54);
  });

  it("비중을 추정치로 역산한 대학은 비중으로 유불리를 매기지 않고 기준점이다", () => {
    // Arrange
    const plan = makePlan({
      formula: standardFormula,
      areaSharesEstimated: true,
    });

    // Act
    const result = calcAdvantageScore(baseScore, plan, noEnglishContext);

    // Assert
    expect(result).toBe(50);
  });

  it("균등 반영(모두 25%) 대학은 정확히 50점이다", () => {
    // Arrange
    const plan = makePlan({
      formula: withRatios(standardFormula, {
        korean: 25,
        math: 25,
        english: 25,
        inquiry: 25,
      }),
    });

    // Act
    const result = calcAdvantageScore(baseScore, plan, noEnglishContext);

    // Assert
    expect(result).toBe(50);
  });

  it("네 영역 백분위가 모두 같은 학생은 어떤 대학이든 50점이다", () => {
    // Arrange
    // 영어 1등급의 환산 백분위(98)에 국·수·탐을 맞춘 완전 균일 학생.
    // 편차가 모두 0이고, 1등급은 어느 대학에서도 영어 손실이 0이라
    // 보정까지 전부 꺼진다.
    const flatScore: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 135, percentile: 98 },
      math: { elective: "미적분", standardScore: 140, percentile: 98 },
      english: { grade: 1 },
      inquiry1: { subject: "물리학I", standardScore: 70, percentile: 98 },
      inquiry2: { subject: "화학I", standardScore: 70, percentile: 98 },
    };
    const plans = [
      makePlan({
        formula: withRatios(standardFormula, {
          korean: 50,
          math: 20,
          english: 10,
          inquiry: 20,
        }),
      }),
      makePlan({
        formula: withRatios(standardFormula, {
          korean: 10,
          math: 50,
          english: 20,
          inquiry: 20,
        }),
      }),
    ];

    // Act
    const scores = plans.map((plan) =>
      calcAdvantageScore(flatScore, plan, noEnglishContext)
    );

    // Assert
    expect(scores).toEqual([50, 50]);
  });

  it("강점 영역 비중이 큰 대학이 더 높은 점수를 받는다", () => {
    // Arrange
    // 수학 99 / 국어 88 학생
    const mathStrong: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 120, percentile: 88 },
      math: { elective: "미적분", standardScore: 148, percentile: 99 },
    };
    const mathHeavy = makePlan({
      formula: withRatios(standardFormula, {
        korean: 20,
        math: 45,
        english: 10,
        inquiry: 25,
      }),
    });
    const koreanHeavy = makePlan({
      formula: withRatios(standardFormula, {
        korean: 45,
        math: 20,
        english: 10,
        inquiry: 25,
      }),
    });

    // Act
    const mathScore = calcAdvantageScore(
      mathStrong,
      mathHeavy,
      noEnglishContext
    );
    const koreanScore = calcAdvantageScore(
      mathStrong,
      koreanHeavy,
      noEnglishContext
    );

    // Assert
    expect(mathScore).toBeGreaterThan(koreanScore);
  });
});

describe("calcAdvantageScore - 영어 영향력 보정", () => {
  const lowPenalty: ConversionFormula = {
    ...convertedStandardFormula,
    english: {
      type: "subtract",
      penaltyByGrade: gradeTable({ 2: 1, 3: 3, 4: 6 }),
    },
  };
  const highPenalty: ConversionFormula = {
    ...convertedStandardFormula,
    english: {
      type: "subtract",
      penaltyByGrade: gradeTable({ 2: 8, 3: 20, 4: 35 }),
    },
  };

  it("영어 3등급 학생에게 감점이 작은 대학이 더 유리하다", () => {
    // Arrange
    const english3: SuneungScore = { ...baseScore, english: { grade: 3 } };
    // 두 대학의 평균 손실 = (0.3% + 2.0%) / 2 = 1.15%
    const context: AdvantageContext = { averageEnglishLoss: 1.15 };

    // Act
    const low = calcAdvantageScore(
      english3,
      makePlan({ formula: lowPenalty }),
      context
    );
    const high = calcAdvantageScore(
      english3,
      makePlan({ formula: highPenalty }),
      context
    );

    // Assert
    expect(low).toBeGreaterThan(high);
  });

  it("영어 1등급이면 보정이 자동으로 꺼진다", () => {
    // Arrange
    // 1등급은 모든 대학에서 손실 0 → 평균도 0 → 보정 0
    const context: AdvantageContext = { averageEnglishLoss: 0 };

    // Act
    const low = calcAdvantageScore(
      baseScore,
      makePlan({ formula: lowPenalty }),
      context
    );
    const high = calcAdvantageScore(
      baseScore,
      makePlan({ formula: highPenalty }),
      context
    );

    // Assert
    expect(low).toBe(high);
  });
});

describe("calcAdvantageScore - 탐구·지표 보정", () => {
  it("탐구 편차가 큰 학생에게 1과목 반영 대학이 유리하다", () => {
    // Arrange
    // 탐구 99 / 61 → 편차 38 → min(38,16)/16 x 8 = +8 만점
    // 국·수·탐 비중을 같게 두어 기본 점수(50)는 같고 보정만 갈리게 한다
    const skewedInquiry: SuneungScore = {
      ...baseScore,
      inquiry1: { subject: "물리학I", standardScore: 72, percentile: 99 },
      inquiry2: { subject: "화학I", standardScore: 58, percentile: 61 },
    };
    const evenFormula = withRatios(standardFormula, {
      korean: 30,
      math: 30,
      english: 10,
      inquiry: 30,
    });
    const onePlan = makePlan({
      formula: { ...evenFormula, inquiryCount: 1 },
    });
    const twoPlan = makePlan({
      formula: { ...evenFormula, inquiryCount: 2 },
    });

    // Act
    const one = calcAdvantageScore(skewedInquiry, onePlan, noEnglishContext);
    const two = calcAdvantageScore(skewedInquiry, twoPlan, noEnglishContext);

    // Assert
    expect(one).toBeGreaterThan(two);
  });

  it("탐구 편차가 없으면 1과목 반영 보정이 0이다", () => {
    // Arrange
    const evenInquiry: SuneungScore = {
      ...baseScore,
      inquiry1: { subject: "물리학I", standardScore: 70, percentile: 95 },
      inquiry2: { subject: "화학I", standardScore: 70, percentile: 95 },
    };

    // Act
    const one = calcAdvantageScore(
      evenInquiry,
      makePlan({ formula: { ...standardFormula, inquiryCount: 1 } }),
      noEnglishContext
    );
    const two = calcAdvantageScore(
      evenInquiry,
      makePlan({ formula: { ...standardFormula, inquiryCount: 2 } }),
      noEnglishContext
    );

    // Assert
    expect(one).toBe(two);
  });

  it("탐구 백분위가 높으면 변환표준점수 대학이 유리하다", () => {
    // Arrange
    const converted = makePlan({ formula: convertedStandardFormula });
    const percentileBased = makePlan({
      formula: {
        ...convertedStandardFormula,
        metric: {
          korean: "percentile",
          math: "percentile",
          inquiry: "percentile",
        },
      },
    });

    // Act
    const convertedScore = calcAdvantageScore(
      baseScore,
      converted,
      noEnglishContext
    );
    const plainScore = calcAdvantageScore(
      baseScore,
      percentileBased,
      noEnglishContext
    );

    // Assert
    // 탐구 평균 백분위 92.5 < 중심 94 → 음의 보정
    expect(convertedScore).toBeLessThan(plainScore);
  });
});

describe("calcAdvantageScore - 가산점 보정", () => {
  it("가산값에 비례해 보정하므로 큰 가산이 더 유리하다", () => {
    // Arrange
    const small = makePlan({
      formula: {
        ...standardFormula,
        bonus: { mathElective: { 미적분: { type: "percent", value: 2 } } },
      },
    });
    const large = makePlan({
      formula: {
        ...standardFormula,
        bonus: { mathElective: { 미적분: { type: "percent", value: 5 } } },
      },
    });

    // Act
    const smallScore = calcAdvantageScore(baseScore, small, noEnglishContext);
    const largeScore = calcAdvantageScore(baseScore, large, noEnglishContext);

    // Assert
    expect(largeScore).toBeGreaterThan(smallScore);
  });

  it("확률과통계 응시자는 미적·기하 가산 대학에서 음의 보정을 받는다", () => {
    // Arrange
    const statsScore: SuneungScore = {
      ...baseScore,
      math: { elective: "확률과통계", standardScore: 140, percentile: 96 },
    };
    const withBonus = makePlan({
      formula: {
        ...standardFormula,
        bonus: {
          mathElective: {
            미적분: { type: "percent", value: 5 },
            기하: { type: "percent", value: 5 },
          },
        },
      },
    });
    const withoutBonus = makePlan({ formula: standardFormula });

    // Act
    const penalized = calcAdvantageScore(
      statsScore,
      withBonus,
      noEnglishContext
    );
    const neutral = calcAdvantageScore(
      statsScore,
      withoutBonus,
      noEnglishContext
    );

    // Assert
    expect(penalized).toBeLessThan(neutral);
  });

  it("가산점이 반영비율 신호를 압도하지 않는다", () => {
    // Arrange
    // 수학 강점 학생에게, 가산은 있지만 수학 비중이 낮은 대학보다
    // 가산이 없어도 수학 비중이 높은 대학이 더 유리해야 한다.
    const mathStrong: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 115, percentile: 80 },
      math: { elective: "미적분", standardScore: 148, percentile: 99 },
    };
    const bonusButMathLight = makePlan({
      formula: {
        ...withRatios(standardFormula, {
          korean: 45,
          math: 15,
          english: 15,
          inquiry: 25,
        }),
        bonus: {
          mathElective: { 미적분: { type: "percent", value: 5 } },
          scienceInquiry: { type: "percent", value: 5, appliesTo: "each" },
        },
      },
    });
    const noBonusMathHeavy = makePlan({
      formula: withRatios(standardFormula, {
        korean: 15,
        math: 45,
        english: 15,
        inquiry: 25,
      }),
    });

    // Act
    const bonusScore = calcAdvantageScore(
      mathStrong,
      bonusButMathLight,
      noEnglishContext
    );
    const ratioScore = calcAdvantageScore(
      mathStrong,
      noBonusMathHeavy,
      noEnglishContext
    );

    // Assert
    expect(ratioScore).toBeGreaterThan(bonusScore);
  });

  it("0~100 범위를 벗어나지 않는다", () => {
    // Arrange
    const extreme: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 90, percentile: 20 },
      math: { elective: "미적분", standardScore: 150, percentile: 100 },
      english: { grade: 9 },
      inquiry1: { subject: "물리학I", standardScore: 50, percentile: 20 },
      inquiry2: { subject: "화학I", standardScore: 50, percentile: 20 },
    };
    const mathOnly = makePlan({
      formula: withRatios(standardFormula, {
        korean: 0,
        math: 100,
        english: 0,
        inquiry: 0,
      }),
    });
    const koreanOnly = makePlan({
      formula: withRatios(standardFormula, {
        korean: 100,
        math: 0,
        english: 0,
        inquiry: 0,
      }),
    });

    // Act
    const high = calcAdvantageScore(extreme, mathOnly, noEnglishContext);
    const low = calcAdvantageScore(extreme, koreanOnly, noEnglishContext);

    // Assert
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeGreaterThan(low);
  });
});

describe("calcAdvantageScore - 상위 영역 선택", () => {
  it("학생의 우수 영역에 큰 비율이 배정된 것으로 본다", () => {
    // Arrange
    // 백분위 국93 수96 → 수학이 우수 영역 (편차 국 -0.833 / 수 +2.167 / 탐 -1.333)
    // 고정 (국45·수35·탐10 / 90): raw = 0.2778 → 50 + 50 x (0.2778 / 2.167) = 56.4 → 56
    // 선택 (수45·국35·탐10 / 90): raw = 0.6111 → 50 + 50 x (0.6111 / 2.167) = 64.1 → 64
    const ratios = { korean: 45, math: 35, english: 10, inquiry: 10 };
    const fixedPlan = makePlan({
      formula: withRatios(standardFormula, ratios),
    });
    const selectionPlan = makePlan({
      formula: {
        ...withRatios(standardFormula, ratios),
        selection: {
          areas: ["korean", "math"],
          rankRatios: [45, 35],
          rankBasis: "standard",
        },
      },
    });

    // Act
    const fixed = calcAdvantageScore(baseScore, fixedPlan, noEnglishContext);
    const selected = calcAdvantageScore(
      baseScore,
      selectionPlan,
      noEnglishContext
    );

    // Assert
    expect(fixed).toBe(56);
    expect(selected).toBe(64);
  });
});
