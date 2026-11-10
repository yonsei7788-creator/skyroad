import {
  CHANCE_FLOOR_POINTS,
  CHANCE_THRESHOLDS,
  SIGMA_MAX,
  TIER_THRESHOLDS,
  UNKNOWN_CUT_CHANCE,
  UNKNOWN_CUT_TIER,
  buildCutHistory,
  chanceFor,
  classifyByPercentileGap,
  classifyPlan,
  pickCompetitionRate,
  pickReferenceMetric,
  sigmaMinByQuota,
} from "../classify";
import { makeResult } from "./fixtures";

import type { ClassifyInput } from "../classify";

/** 환산점수 기준 분류 입력. sensitivity 는 주입값이다 */
const convertedInput = (
  overrides: Partial<ClassifyInput> = {}
): ClassifyInput => ({
  convertedScore: 899.167,
  convertedScoreExcludingBonus: 899.167,
  percentileByBasis: {
    simpleAverage: 93.833,
    universityWeighted: 94.028,
  },
  sensitivity: 1.179,
  totalScore: 1000,
  quota: 30,
  results: [],
  ...overrides,
});

describe("sigmaMinByQuota", () => {
  it("모집인원이 적을수록 컷 변동성 하한이 커진다", () => {
    // Arrange & Act & Assert
    expect(sigmaMinByQuota(10)).toBe(1.5);
    expect(sigmaMinByQuota(15)).toBe(1.5);
    expect(sigmaMinByQuota(16)).toBe(1.0);
    expect(sigmaMinByQuota(40)).toBe(1.0);
    expect(sigmaMinByQuota(41)).toBe(0.7);
    expect(sigmaMinByQuota(300)).toBe(0.7);
  });
});

describe("classifyByPercentileGap - 분류 경계값", () => {
  const sigma = 0.8;

  it("안정 임계값(+2.0σ) 바로 위는 안정, 바로 아래는 적정이다", () => {
    // Arrange
    const boundary = TIER_THRESHOLDS.안정 * sigma;

    // Act & Assert
    expect(classifyByPercentileGap(boundary, sigma)).toBe("안정");
    expect(classifyByPercentileGap(boundary - 0.001, sigma)).toBe("적정");
  });

  it("적정 임계값(-0.4σ) 바로 위는 적정, 바로 아래는 상향이다", () => {
    // Arrange
    const boundary = TIER_THRESHOLDS.적정 * sigma;

    // Act & Assert
    expect(classifyByPercentileGap(boundary, sigma)).toBe("적정");
    expect(classifyByPercentileGap(boundary - 0.001, sigma)).toBe("상향");
  });

  it("상향 임계값(-2.2σ) 바로 위는 상향, 바로 아래는 지원불가다", () => {
    // Arrange
    const boundary = TIER_THRESHOLDS.상향 * sigma;

    // Act & Assert
    expect(classifyByPercentileGap(boundary, sigma)).toBe("상향");
    expect(classifyByPercentileGap(boundary - 0.001, sigma)).toBe("지원불가");
  });

  it("σ 가 커지면 같은 격차도 더 보수적으로 분류된다", () => {
    // Arrange
    // 모집인원 10명(σ=1.2)과 100명(σ=0.5)의 같은 +1.0 백분위점 격차
    const gap = 1.0;

    // Act
    const smallQuota = classifyByPercentileGap(gap, 1.2);
    const largeQuota = classifyByPercentileGap(gap, 0.5);

    // Assert
    expect(smallQuota).toBe("적정");
    expect(largeQuota).toBe("안정");
  });
});

describe("chanceFor - tier 내부 2분할", () => {
  const sigma = 0.8;

  it("적정은 +0.8σ 기준으로 높음·보통이 갈린다", () => {
    // Arrange
    const boundary = CHANCE_THRESHOLDS.적정상단 * sigma;

    // Act & Assert
    expect(chanceFor("적정", boundary, sigma)).toBe("높음");
    expect(chanceFor("적정", boundary - 0.001, sigma)).toBe("보통");
  });

  it("상향은 -1.6σ 기준으로 낮음·매우낮음이 갈린다", () => {
    // Arrange
    const wideSigma = 1.5;
    const boundary = CHANCE_THRESHOLDS.상향상단 * wideSigma;

    // Act & Assert
    expect(chanceFor("상향", boundary, wideSigma)).toBe("낮음");
    expect(chanceFor("상향", boundary - 0.001, wideSigma)).toBe("매우낮음");
  });

  it("σ 가 작아도 -1.5 백분위점까지는 낮음이다", () => {
    // Arrange: σ 0.7 이면 -1.6σ 는 -1.12 라 절대 하한이 적용된다
    const narrowSigma = 0.7;

    // Act & Assert
    expect(chanceFor("상향", CHANCE_FLOOR_POINTS, narrowSigma)).toBe("낮음");
    expect(chanceFor("상향", CHANCE_FLOOR_POINTS - 0.001, narrowSigma)).toBe(
      "매우낮음"
    );
  });

  it("컷이 크게 튄 소규모 모집단위도 σ 는 상한을 넘지 않는다", () => {
    // Arrange: 66.66 → 83 처럼 한 해 튄 입결, 백분위 지표
    const metric = "percentile" as const;
    const results = [
      makeResult({ admissionYear: 2024, cut70: { metric, value: 66.66 } }),
      makeResult({ admissionYear: 2026, cut70: { metric, value: 83 } }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ quota: 8, results }));

    // Assert
    expect(result.sigma).toBe(SIGMA_MAX);
    expect(result.tier).toBe("안정");
  });

  it("안정은 항상 높음, 지원불가는 항상 매우낮음이다", () => {
    // Arrange & Act & Assert
    expect(chanceFor("안정", 10, sigma)).toBe("높음");
    expect(chanceFor("지원불가", -10, sigma)).toBe("매우낮음");
  });
});

describe("classifyPlan - 환산점수 기준 입결", () => {
  const threeYears = [
    makeResult({
      admissionYear: 2024,
      cut70: { metric: "convertedScore", value: 870 },
    }),
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
    // 가중평균 = 880x0.5 + 875x0.3 + 870x0.2 = 876.5
    // 1 백분위점 = 1.179 x 1000 / 100 = 11.79점
    // 추세 = (880-870)/2 = 5점 = 0.424 백분위점 → x0.5 = 0.212 → +2.5점
    // 모집인원 변화 없음(30 → 30) → 보정 0
    // refCut = 876.5 + 2.5 = 879.0
    // gapRatio = (899.167 - 879.0) / 1000 x 100 = 2.017%
    // percentileGap = 2.017 / 1.179 = 1.711 백분위점

    // Act
    const result = classifyPlan(convertedInput({ results: threeYears }));

    // Assert
    expect(result.referenceCut).toEqual({
      metric: "convertedScore",
      value: 879,
    });
    expect(result.gapRatio).toBe(2.017);
    expect(result.percentileGap).toBe(1.711);
  });

  it("σ 하한이 적용되고 적정 상단으로 분류된다", () => {
    // Arrange
    // 3개년 컷 표본표준편차 = 5점 = 0.424 백분위점 < σ_min(30명) = 1.0
    // 안정 경계 = 2.0 x 1.0 = 2.0 > 1.711 → 적정
    // 적정 상단 경계 = 0.8 x 1.0 = 0.8 ≤ 1.711 → 높음

    // Act
    const result = classifyPlan(convertedInput({ results: threeYears }));

    // Assert
    expect(result.sigma).toBe(1.0);
    expect(result.tier).toBe("적정");
    expect(result.chance).toBe("높음");
  });

  it("컷이 충분히 낮으면 안정으로 분류된다", () => {
    // Arrange
    // 컷 860 → 격차 (899.167-860)/1000x100 = 3.917% → 3.322 백분위점
    // 안정 경계 2.0 ≤ 3.322
    const lowCut = [
      makeResult({
        admissionYear: 2026,
        cut70: { metric: "convertedScore", value: 860 },
      }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results: lowCut }));

    // Assert
    expect(result.tier).toBe("안정");
    expect(result.chance).toBe("높음");
  });

  it("모집인원이 크게 늘면 기준컷을 낮춘다", () => {
    // Arrange
    // 3개년 평균 모집인원 30 → 올해 60 (변화 +100%)
    // clamp(1.0, ±0.4) x 1.2 = 0.48 백분위점 = 5.659점 하락

    // Act
    const base = classifyPlan(convertedInput({ results: threeYears }));
    const expanded = classifyPlan(
      convertedInput({ results: threeYears, quota: 60 })
    );

    // Assert
    expect(base.referenceCut?.value).toBe(879);
    expect(expanded.referenceCut?.value).toBe(873.341);
  });

  it("모집인원 변화가 10% 미만이면 보정하지 않는다", () => {
    // Arrange & Act
    const deadZone = classifyPlan(
      convertedInput({ results: threeYears, quota: 32 })
    );

    // Assert
    expect(deadZone.referenceCut?.value).toBe(879);
  });

  it("경쟁률은 기준컷 보정에 쓰지 않는다", () => {
    // Arrange
    const highCompetition = threeYears.map((entry) => ({
      ...entry,
      competitionRate: 20,
    }));

    // Act
    const normal = classifyPlan(convertedInput({ results: threeYears }));
    const crowded = classifyPlan(convertedInput({ results: highCompetition }));

    // Assert
    expect(crowded.referenceCut?.value).toBe(normal.referenceCut?.value);
    expect(crowded.tier).toBe(normal.tier);
    expect(crowded.competitionRate).toBe(20);
  });

  it("2개년 이하면 추세 보정을 끈다", () => {
    // Arrange
    const twoYears = threeYears.filter((entry) => entry.admissionYear !== 2025);

    // Act
    const result = classifyPlan(convertedInput({ results: twoYears }));

    // Assert
    // 가중평균 = (880x0.5 + 870x0.2) / 0.7 = 877.143, 추세 보정 없음
    expect(result.referenceCut?.value).toBe(877.143);
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
    expect(result.percentileGap).toBe(0.833);
  });

  it("백분위 입결은 민감도로 나누지 않는다", () => {
    // Arrange
    // 민감도를 바꿔도 percentileGap 이 변하지 않아야 한다
    const results = [
      makeResult({ cut70: { metric: "percentile", value: 93 } }),
    ];

    // Act
    const low = classifyPlan(convertedInput({ results, sensitivity: 0.75 }));
    const high = classifyPlan(convertedInput({ results, sensitivity: 1.58 }));

    // Assert
    expect(low.percentileGap).toBe(high.percentileGap);
    expect(low.percentileGap).toBe(0.833);
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

  it("단일 연도면 σ 는 하한값을 쓴다", () => {
    // Arrange
    const results = [
      makeResult({ quota: 12, cut70: { metric: "percentile", value: 93 } }),
    ];

    // Act
    const result = classifyPlan(convertedInput({ results, quota: 12 }));

    // Assert
    expect(result.sigma).toBe(1.5);
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
    expect(result.percentileGap).toBeNull();
  });
});

describe("classifyPlan - 입결 결측", () => {
  it("입결이 없으면 컷을 추정하지 않는다", () => {
    // Arrange & Act
    const result = classifyPlan(convertedInput({ results: [] }));

    // Assert
    expect(result.tier).toBe(UNKNOWN_CUT_TIER);
    expect(result.chance).toBe(UNKNOWN_CUT_CHANCE);
    expect(result.percentileGap).toBeNull();
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
      { year: 2024, cut: null },
      { year: 2025, cut: null },
      { year: 2026, cut: 880 },
    ]);
  });

  it("최신 학년도 경쟁률을 표시용으로 남긴다", () => {
    // Arrange
    const results = [
      makeResult({ admissionYear: 2024, competitionRate: 5.1 }),
      makeResult({ admissionYear: 2026, competitionRate: 3.2 }),
    ];

    // Act & Assert
    expect(pickCompetitionRate(results)).toBe(3.2);
    expect(pickCompetitionRate([])).toBeNull();
  });

  it("컷 추이는 입결이 없어도 항상 3개년을 채운다", () => {
    // Arrange & Act
    const history = buildCutHistory([]);

    // Assert
    expect(history.map((entry) => entry.year)).toEqual([2024, 2025, 2026]);
    expect(history.every((entry) => entry.cut === null)).toBe(true);
  });
});
