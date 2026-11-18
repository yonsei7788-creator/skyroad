import {
  GAP_BANDS,
  MIN_YEARS_FOR_SAFE,
  UNKNOWN_CUT_CHANCE,
  UNKNOWN_CUT_TIER,
  buildCutHistory,
  chanceFor,
  classifyPlan,
  isWithinRecommendRange,
  pickCompetitionRate,
  pickReferenceMetric,
  SMALL_QUOTA_MAX,
  SNIPING_MIN_GAP,
  isSmallQuota,
  tierForGap,
} from "../classify";
import { makeResult } from "./fixtures";

import type { ClassifyInput } from "../classify";

/** 분류 입력 (만점 1000) */
const convertedInput = (
  overrides: Partial<ClassifyInput> = {}
): ClassifyInput => ({
  convertedScore: 899.167,
  convertedScoreExcludingBonus: 899.167,
  percentileByBasis: {
    simpleAverage: 93.833,
    universityWeighted: 94.028,
  },
  totalScore: 1000,
  quota: 30,
  results: [],
  group: "가",
  ...overrides,
});

describe("tierForGap - 모든 대학 공통 고정 구간", () => {
  it("안정 하한 바로 위는 안정, 바로 아래는 적정이다", () => {
    // Arrange & Act & Assert
    expect(tierForGap(GAP_BANDS.안정하한)).toBe("안정");
    expect(tierForGap(GAP_BANDS.안정하한 - 0.001)).toBe("적정");
  });

  it("적정 하한 바로 위는 적정, 바로 아래는 상향이다", () => {
    // Arrange & Act & Assert
    expect(tierForGap(GAP_BANDS.적정하한)).toBe("적정");
    expect(tierForGap(GAP_BANDS.적정하한 - 0.001)).toBe("상향");
  });

  it("상향 하한 바로 위는 상향, 바로 아래는 소신, 소신 하한 아래는 지원불가다", () => {
    // Arrange & Act & Assert
    expect(tierForGap(GAP_BANDS.상향하한)).toBe("상향");
    expect(tierForGap(GAP_BANDS.상향하한 - 0.001)).toBe("소신");
    expect(tierForGap(SNIPING_MIN_GAP)).toBe("소신");
    expect(tierForGap(SNIPING_MIN_GAP - 0.001)).toBe("지원불가");
    expect(chanceFor("소신")).toBe("매우낮음");
  });

  it("안정 상한을 넘으면 추천 범위 밖이다", () => {
    // Arrange & Act & Assert
    expect(isWithinRecommendRange(GAP_BANDS.안정상한)).toBe(true);
    expect(isWithinRecommendRange(GAP_BANDS.안정상한 + 0.001)).toBe(false);
    expect(isWithinRecommendRange(GAP_BANDS.상향하한 - 0.001)).toBe(false);
  });
});

describe("chanceFor - 구분으로 합격 가능성", () => {
  it("안정 높음, 적정 보통, 상향 낮음, 지원불가 매우낮음이다", () => {
    // Arrange & Act & Assert
    expect(chanceFor("안정")).toBe("높음");
    expect(chanceFor("적정")).toBe("보통");
    expect(chanceFor("상향")).toBe("낮음");
    expect(chanceFor("지원불가")).toBe("매우낮음");
  });
});

describe("classifyPlan - 환산점수 기준 입결", () => {
  const twoYears = [
    makeResult({
      admissionYear: 2025,
      cut70: { metric: "convertedScore", value: 875 },
    }),
    makeResult({
      admissionYear: 2026,
      cut70: { metric: "convertedScore", value: 880 },
    }),
  ];

  it("손으로 계산한 기준컷·격차와 일치한다", () => {
    // Arrange
    // 가중평균 = (880x0.5 + 875x0.3) / 0.8 = 878.125, 모집인원 변화 없음
    // 차이 = 899.167 - 878.125 = 21.042점, 판정 격차 = 21.042 / 1000 x 100 = 2.104%

    // Act
    const result = classifyPlan(convertedInput({ results: twoYears }));

    // Assert
    expect(result.referenceCut).toEqual({
      metric: "convertedScore",
      value: 878.125,
    });
    expect(result.gapPoints).toBe(21.042);
    expect(result.gapRatio).toBe(2.104);
    expect(result.resultYears).toEqual([2025, 2026]);
  });

  it("격차 2.104 는 적정(가능성 보통)이다", () => {
    // Arrange & Act
    const result = classifyPlan(convertedInput({ results: twoYears }));

    // Assert
    expect(result.tier).toBe("적정");
    expect(result.chance).toBe("보통");
  });

  it("2개년 입결이면 안정 구간 격차를 안정으로 분류한다", () => {
    // Arrange
    // 가중평균 = (860x0.5 + 855x0.3) / 0.8 = 858.125 → 격차 (899.167-858.125)/10 = 4.104
    const lowCuts = [
      makeResult({
        admissionYear: 2025,
        cut70: { metric: "convertedScore", value: 855 },
      }),
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 860 },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results: lowCuts }));

    // Assert
    expect(result.gapRatio).toBe(4.104);
    expect(result.tier).toBe("안정");
    expect(result.chance).toBe("높음");
    expect(result.safeCapped).toBe(false);
  });

  it("입결이 1개년이면 안정 구간이어도 적정으로 둔다", () => {
    // Arrange
    // 컷 850 한 해 → 격차 (899.167-850)/1000x100 = 4.917% (안정 구간)
    const oneYear = [
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 850 },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results: oneYear }));

    // Assert
    expect(MIN_YEARS_FOR_SAFE).toBe(2);
    expect(result.gapRatio).toBe(4.917);
    expect(result.tier).toBe("적정");
    expect(result.chance).toBe("보통");
    expect(result.safeCapped).toBe(true);
    expect(result.safeCapReasons).toEqual(["1개년 입결"]);
  });

  it("2025·2026 입결이 같은 군이면 안정으로 둔다", () => {
    // Arrange
    const twoYears = [2025, 2026].map((year) =>
      makeResult({
        admissionYear: year as 2025 | 2026,
        cut70: { metric: "convertedScore", value: 850 },
      })
    );

    // Act
    const result = classifyPlan(convertedInput({ results: twoYears }));

    // Assert
    expect(result.tier).toBe("안정");
    expect(result.safeCapReasons).toEqual([]);
    expect(result.pastGroups).toEqual([]);
  });

  it("입결 학년도의 원문 모집군이 2027 과 다르면 안정 대신 적정으로 두고 그 해를 남긴다", () => {
    // Arrange — 2027 가군, 2026 입결은 다군 모집 때 값
    const results = [
      makeResult({
        admissionYear: 2025,
        group: "가",
        cut70: { metric: "convertedScore", value: 850 },
      }),
      makeResult({
        admissionYear: 2026,
        group: "다",
        cut70: { metric: "convertedScore", value: 850 },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results, group: "가" }));

    // Assert
    expect(result.tier).toBe("적정");
    expect(result.safeCapped).toBe(true);
    expect(result.safeCapReasons).toEqual(["모집군 변경"]);
    expect(result.pastGroups).toEqual([{ year: 2026, group: "다" }]);
  });

  it("모집인원이 소수 모집 기준 이하면 안정 구간이어도 적정으로 둔다", () => {
    // Arrange — 두 해 모두 5명, 2027 도 5명이라 모집인원 보정은 없다
    const results = [2025, 2026].map((year) =>
      makeResult({
        admissionYear: year as 2025 | 2026,
        quota: SMALL_QUOTA_MAX,
        cut70: { metric: "convertedScore", value: 850 },
      })
    );

    // Act
    const result = classifyPlan(
      convertedInput({ results, quota: SMALL_QUOTA_MAX })
    );

    // Assert
    expect(result.gapRatio).toBe(4.917);
    expect(result.tier).toBe("적정");
    expect(result.safeCapped).toBe(true);
    expect(result.safeCapReasons).toEqual(["소수 모집"]);
  });

  it("모집인원이 소수 모집 기준보다 많으면 안정으로 둔다", () => {
    // Arrange
    const quota = SMALL_QUOTA_MAX + 1;
    const results = [2025, 2026].map((year) =>
      makeResult({
        admissionYear: year as 2025 | 2026,
        quota,
        cut70: { metric: "convertedScore", value: 850 },
      })
    );

    // Act
    const result = classifyPlan(convertedInput({ results, quota }));

    // Assert
    expect(isSmallQuota(quota)).toBe(false);
    expect(result.tier).toBe("안정");
    expect(result.safeCapReasons).toEqual([]);
  });

  it("평균 백분위 입결은 격차가 안정 구간이어도 적정으로 둔다", () => {
    // Arrange — 학생 단순평균 93.833, 컷 88 → +5.833 백분위점
    const results = [2025, 2026].map((year) =>
      makeResult({
        admissionYear: year as 2025 | 2026,
        cut70: { metric: "percentile", value: 88 },
      })
    );

    // Act
    const result = classifyPlan(convertedInput({ results }));

    // Assert
    expect(result.gapRatio).toBe(5.833);
    expect(result.tier).toBe("적정");
    expect(result.safeCapReasons).toEqual(["백분위 입결"]);
  });

  it("모집인원이 크게 늘면 기준컷을 낮추고 그 값을 남긴다", () => {
    // Arrange
    // 평균 모집인원 30 → 올해 60 (+100%) → clamp 0.4 x 1.2 = 0.48 (만점의 0.48% = 4.8점)

    // Act
    const expanded = classifyPlan(
      convertedInput({ results: twoYears, quota: 60 })
    );

    // Assert
    expect(expanded.referenceCut?.value).toBe(873.325);
    expect(expanded.quotaChange).toEqual({
      currentQuota: 60,
      pastAverageQuota: 30,
      cutAdjustment: -4.8,
    });
  });

  it("모집인원 변화가 10% 미만이면 보정하지 않는다", () => {
    // Arrange & Act
    const deadZone = classifyPlan(
      convertedInput({ results: twoYears, quota: 32 })
    );

    // Assert
    expect(deadZone.referenceCut?.value).toBe(878.125);
    expect(deadZone.quotaChange?.cutAdjustment).toBe(0);
  });

  it("경쟁률·추가합격은 기준컷 보정에 쓰지 않고 표시용으로 남긴다", () => {
    // Arrange
    const crowded = twoYears.map((entry) => ({
      ...entry,
      competitionRate: 20,
      additionalPassCount: 45,
    }));

    // Act
    const normal = classifyPlan(convertedInput({ results: twoYears }));
    const result = classifyPlan(convertedInput({ results: crowded }));

    // Assert
    expect(result.referenceCut?.value).toBe(normal.referenceCut?.value);
    expect(result.tier).toBe(normal.tier);
    expect(result.competitionRate).toBe(20);
    expect(result.additionalPass).toEqual({ year: 2026, quota: 30, count: 45 });
  });

  it("2024 입결은 쓰지 않는다", () => {
    // Arrange
    const withOld = [
      makeResult({
        admissionYear: 2024,
        cut70: { metric: "convertedScore", value: 700 },
      }),
      ...twoYears,
    ];

    // Act
    const result = classifyPlan(convertedInput({ results: withOld }));

    // Assert
    expect(result.referenceCut?.value).toBe(878.125);
    expect(result.resultYears).toEqual([2025, 2026]);
  });
});

describe("classifyPlan - 백분위 기준 입결", () => {
  it("가중 평균이 아니라 국·수·탐 단순 평균으로 비교한다", () => {
    // Arrange
    // 단순 평균 93.833 vs 컷 93 → 0.833 백분위점
    // 가중 평균(99)을 쓰면 6점으로 과대평가된다
    const results = [
      makeResult({ cut70: { metric: "percentile", value: 93 } }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results }));

    // Assert
    expect(result.gapRatio).toBe(0.833);
    expect(result.gapPoints).toBe(0.833);
    expect(result.tier).toBe("상향");
    expect(result.chance).toBe("낮음");
  });

  it("입결이 밝힌 산출 기준과 같은 방식의 학생 값으로 비교한다", () => {
    // Arrange
    // 같은 컷 93 이라도 기준이 다르면 학생 쪽 값이 달라진다.
    // 단순평균 93.833 / 대학가중(국·수·탐) 94.028
    const simple = [
      makeResult({
        cut70: { metric: "percentile", value: 93, basis: "simpleAverage" },
      }),
    ];
    const weighted = [
      makeResult({
        cut70: {
          metric: "percentile",
          value: 93,
          basis: "universityWeighted",
        },
      }),
    ];

    // Act & Assert
    expect(classifyPlan(convertedInput({ results: simple })).gapRatio).toBe(
      0.833
    );
    expect(classifyPlan(convertedInput({ results: weighted })).gapRatio).toBe(
      1.028
    );
  });

  it("컷이 가산 제외 기준이면 학생 쪽도 가산을 뺀 값으로 비교한다", () => {
    // Arrange
    // 가산 20점을 받은 학생: 포함 899.167 / 제외 879.167
    const bonusStudent = {
      convertedScore: 899.167,
      convertedScoreExcludingBonus: 879.167,
    };
    const included = [
      makeResult({
        cut70: {
          metric: "convertedScore",
          value: 880,
          bonusIncluded: true,
        },
      }),
    ];
    const excluded = [
      makeResult({
        cut70: {
          metric: "convertedScore",
          value: 880,
          bonusIncluded: false,
        },
      }),
    ];

    // Act
    const withBonus = classifyPlan(
      convertedInput({ ...bonusStudent, results: included })
    );
    const withoutBonus = classifyPlan(
      convertedInput({ ...bonusStudent, results: excluded })
    );

    // Assert
    // 포함 기준: (899.167-880)/1000x100 = 1.917%
    expect(withBonus.gapRatio).toBe(1.917);
    // 제외 기준: (879.167-880)/1000x100 = -0.083%
    expect(withoutBonus.gapRatio).toBe(-0.083);
    // 가산 포함으로 비교하면 가산 수혜자만 과대평가된다
    expect(withBonus.gapRatio).toBeGreaterThan(withoutBonus.gapRatio ?? 0);
  });

  it("가산을 못 받는 학생은 컷 기준에 영향받지 않는다", () => {
    // Arrange
    // 확률과통계 응시자처럼 가산이 0인 학생 → 두 값이 같다
    const noBonusStudent = {
      convertedScore: 890,
      convertedScoreExcludingBonus: 890,
    };
    const included = [
      makeResult({
        cut70: { metric: "convertedScore", value: 880, bonusIncluded: true },
      }),
    ];
    const excluded = [
      makeResult({
        cut70: { metric: "convertedScore", value: 880, bonusIncluded: false },
      }),
    ];

    // Act
    const a = classifyPlan(
      convertedInput({ ...noBonusStudent, results: included })
    );
    const b = classifyPlan(
      convertedInput({ ...noBonusStudent, results: excluded })
    );

    // Assert
    expect(a.gapRatio).toBe(b.gapRatio);
    expect(a.tier).toBe(b.tier);
  });

  it("bonusIncluded 미지정이면 가산 포함으로 간주한다", () => {
    // Arrange
    const bonusStudent = {
      convertedScore: 899.167,
      convertedScoreExcludingBonus: 879.167,
    };
    const unspecified = [
      makeResult({ cut70: { metric: "convertedScore", value: 880 } }),
    ];
    const explicitTrue = [
      makeResult({
        cut70: { metric: "convertedScore", value: 880, bonusIncluded: true },
      }),
    ];

    // Act & Assert
    expect(
      classifyPlan(convertedInput({ ...bonusStudent, results: unspecified }))
        .gapRatio
    ).toBe(
      classifyPlan(convertedInput({ ...bonusStudent, results: explicitTrue }))
        .gapRatio
    );
  });

  it("백분위 입결은 가산 포함 여부와 무관하다", () => {
    // Arrange
    // percentile 지표는 환산 전 값이라 가산점 개념이 없다
    const bonusStudent = {
      convertedScore: 899.167,
      convertedScoreExcludingBonus: 879.167,
    };
    const results = [
      makeResult({
        cut70: { metric: "percentile", value: 93, bonusIncluded: false },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ ...bonusStudent, results }));

    // Assert
    expect(result.gapRatio).toBe(0.833);
  });

  it("basis 가 없으면 국·수·탐 단순평균으로 간주한다", () => {
    // Arrange
    const noBasis = [
      makeResult({ cut70: { metric: "percentile", value: 93 } }),
    ];
    const explicitSimple = [
      makeResult({
        cut70: { metric: "percentile", value: 93, basis: "simpleAverage" },
      }),
    ];

    // Act & Assert
    expect(classifyPlan(convertedInput({ results: noBasis })).gapRatio).toBe(
      classifyPlan(convertedInput({ results: explicitSimple })).gapRatio
    );
  });
});

describe("classifyPlan - 70%컷 결측", () => {
  it("70%컷이 없는 해는 50%컷·평균으로 대신하지 않고 결측으로 본다", () => {
    // Arrange: 50%컷만 공시된 해
    const results = [
      makeResult({
        cut70: undefined,
        cut50: { metric: "percentile", value: 93 },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results }));

    // Assert
    expect(result.referenceCut).toBeNull();
    expect(result.gapRatio).toBeNull();
  });
});

describe("classifyPlan - 입결 결측", () => {
  it("입결이 없으면 컷을 추정하지 않는다", () => {
    // Arrange & Act
    const result = classifyPlan(convertedInput({ results: [] }));

    // Assert
    expect(result.tier).toBe(UNKNOWN_CUT_TIER);
    expect(result.chance).toBe(UNKNOWN_CUT_CHANCE);
    expect(result.gapRatio).toBeNull();
    expect(result.referenceCut).toBeNull();
  });

  it("컷 값이 0이면 입결 없음으로 처리한다", () => {
    // Arrange
    const results = [
      makeResult({ cut70: { metric: "convertedScore", value: 0 } }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results }));

    // Assert
    expect(result.referenceCut).toBeNull();
    expect(result.gapRatio).toBeNull();
  });
});

describe("기준 지표·경쟁률·컷 추이", () => {
  it("최신 학년도에 공개된 지표를 기준으로 삼는다", () => {
    // Arrange
    const mixed = [
      makeResult({
        admissionYear: 2024,
        cut70: { metric: "percentile", value: 93 },
      }),
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 880 },
      }),
    ];

    // Act
    const metric = pickReferenceMetric(mixed);
    const result = classifyPlan(convertedInput({ results: mixed }));

    // Assert
    expect(metric).toBe("convertedScore");
    expect(result.cutHistory).toEqual([
      { year: 2025, cut: null },
      { year: 2026, cut: 880 },
    ]);
  });

  it("최신 학년도 경쟁률을 표시용으로 남긴다", () => {
    // Arrange
    const results = [
      makeResult({ admissionYear: 2025, competitionRate: 5.1 }),
      makeResult({ admissionYear: 2026, competitionRate: 3.2 }),
    ];

    // Act & Assert
    expect(pickCompetitionRate(results)).toBe(3.2);
    expect(pickCompetitionRate([])).toBeNull();
  });

  it("학년도별 컷은 입결이 없어도 2025·2026 두 해를 채운다", () => {
    // Arrange & Act
    const history = buildCutHistory([]);

    // Assert
    expect(history.map((entry) => entry.year)).toEqual([2025, 2026]);
    expect(history.every((entry) => entry.cut === null)).toBe(true);
  });
});
