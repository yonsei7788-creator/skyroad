import { diagnoseScore } from "../diagnose";
import { baseScore } from "./fixtures";

import type { AreaStanding, ScoreArea, SuneungScore } from "../../types";

const findArea = (areas: AreaStanding[], area: ScoreArea) =>
  areas.find((standing) => standing.area === area);

describe("diagnoseScore", () => {
  it("손으로 계산한 영역별 편차·순위와 일치한다", () => {
    // Arrange
    // 백분위: 국93 / 수96 / 탐92.5 (영어는 원문에 등급만 있어 제외)
    // 국·수·탐 평균 = 281.5 / 3 = 93.833
    // 편차: 국 -0.833 / 수 +2.167 / 탐 -1.333

    // Act
    const result = diagnoseScore(baseScore);

    // Assert
    expect(findArea(result.areas, "korean")?.deviation).toBe(-0.833);
    expect(findArea(result.areas, "math")?.deviation).toBe(2.167);
    expect(findArea(result.areas, "inquiry")?.deviation).toBe(-1.333);
    expect(findArea(result.areas, "math")?.rank).toBe(1);
    expect(findArea(result.areas, "korean")?.rank).toBe(2);
    expect(findArea(result.areas, "inquiry")?.rank).toBe(3);
  });

  it("영어는 등급을 백분위로 바꾸지 않아 백분위·순위·편차가 없다", () => {
    // Arrange & Act
    const english = findArea(diagnoseScore(baseScore).areas, "english");

    // Assert
    expect(english?.percentile).toBeNull();
    expect(english?.rank).toBeNull();
    expect(english?.deviation).toBeNull();
  });

  it("국·수·탐 평균 백분위와 표준점수 합을 계산한다", () => {
    // Arrange
    // 평균 백분위 = (93 + 96 + 92.5) / 3 = 93.833
    // 표준점수 합 = 130 + 140 + 70 + 66 = 406

    // Act
    const result = diagnoseScore(baseScore);

    // Assert
    expect(result.averagePercentile).toBe(93.833);
    expect(result.totalStandardScore).toBe(406);
  });

  it("영어는 표준점수가 없으므로 null 이다", () => {
    // Arrange & Act
    const result = diagnoseScore(baseScore);

    // Assert
    expect(findArea(result.areas, "english")).toBeDefined();
    expect(
      result.areas.find((standing) => standing.area === "english")
        ?.standardScore
    ).toBeNull();
  });

  it("편차가 기준을 넘는 영역을 강점·약점으로 잡는다", () => {
    // Arrange
    // 국75 / 수99 / 탐68 → 국·수·탐 평균 80.667
    // 편차: 국 -5.667 / 수 +18.333 / 탐 -12.667
    const skewedScore: SuneungScore = {
      ...baseScore,
      korean: { elective: "언어와매체", standardScore: 112, percentile: 75 },
      math: { elective: "미적분", standardScore: 148, percentile: 99 },
      english: { grade: 3 },
      inquiry1: { subject: "물리학I", standardScore: 62, percentile: 70 },
      inquiry2: { subject: "화학I", standardScore: 60, percentile: 66 },
    };

    // Act
    const result = diagnoseScore(skewedScore);

    // Assert
    expect(result.strengths).toEqual(["math"]);
    // 더 낮은 영역(탐 -12.667)이 대표 약점으로 앞에 온다
    expect(result.weaknesses).toEqual(["inquiry", "korean"]);
  });

  it("강점·약점이 여럿이면 편차가 큰 영역부터 둔다", () => {
    // Arrange
    // 국70 / 수60 / 탐95 → 국·수·탐 평균 75
    // 편차: 국 -5 / 수 -15 / 탐 +20
    const score: SuneungScore = {
      ...baseScore,
      korean: { elective: "화법과작문", standardScore: 110, percentile: 70 },
      math: { elective: "확률과통계", standardScore: 102, percentile: 60 },
      english: { grade: 1 },
      inquiry1: { subject: "세계지리", standardScore: 68, percentile: 96 },
      inquiry2: { subject: "사회문화", standardScore: 67, percentile: 94 },
    };

    // Act
    const result = diagnoseScore(score);

    // Assert: 수학 60점이 국어 70점보다 앞선다. 영어 1등급은 강점에 들지 않는다
    expect(result.weaknesses).toEqual(["math", "korean"]);
    expect(result.strengths).toEqual(["inquiry"]);
  });

  it("편차가 작으면 최상위·최하위 영역 하나씩을 대표로 둔다", () => {
    // Arrange & Act
    const result = diagnoseScore(baseScore);

    // Assert
    expect(result.strengths).toEqual(["math"]);
    expect(result.weaknesses).toEqual(["inquiry"]);
  });
});
