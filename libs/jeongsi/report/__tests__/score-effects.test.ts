import { composeScoreReasons, computeAreaEffects } from "../score-effects";

import type { ScoreBreakdown } from "../../report-types";

const breakdown = (
  overrides: Partial<ScoreBreakdown> = {}
): ScoreBreakdown => ({
  areas: [
    { area: "korean", ratio: 40, earned: 380, max: 400 },
    { area: "math", ratio: 30, earned: 240, max: 300 },
    { area: "english", ratio: 10, earned: 95, max: 100 },
    { area: "inquiry", ratio: 20, earned: 180, max: 200 },
  ],
  englishVsFirstGrade: -5,
  historyAdjustment: 0,
  bonusAdjustment: 0,
  convertedScore: 895,
  totalScore: 1000,
  ...overrides,
});

describe("computeAreaEffects", () => {
  it("영어를 빼고 국·수·탐 득실을 계산하며 합은 0 이다", () => {
    // Arrange & Act
    const effects = computeAreaEffects(breakdown());

    // Assert
    expect(effects.map((effect) => effect.area)).toEqual([
      "korean",
      "math",
      "inquiry",
    ]);
    const sum = effects.reduce((total, effect) => total + effect.points, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9);
    // 국어 95% 득점 > 전체 89% → 더 받음, 수학 80% → 덜 받음
    expect(effects[0].points).toBeGreaterThan(0);
    expect(effects[1].points).toBeLessThan(0);
  });
});

describe("composeScoreReasons", () => {
  it("실제 점수로 쓰고 대학 사이에 같은 문장을 두지 않는다", () => {
    // Arrange
    const items = [
      { university: "가대학교", breakdown: breakdown() },
      { university: "나대학교", breakdown: breakdown() },
    ];

    // Act
    const reasons = composeScoreReasons(items, 2);

    // Assert
    expect(reasons[0]).toContain("내 점수는 895점(만점 1000점)");
    expect(reasons[0]).toContain("국어 40% 반영으로");
    expect(reasons[0]).toContain("영어 2등급이라 1등급보다 5점 낮게");
    const sentences = reasons.flatMap((reason) =>
      reason.split(/(?<=[.!?])\s+/)
    );
    expect(new Set(sentences).size).toBe(sentences.length);
  });
});
