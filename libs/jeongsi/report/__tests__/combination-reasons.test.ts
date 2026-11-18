import {
  baseScore,
  makeEvaluation,
  makePlan,
  makePreference,
} from "../../engine/__tests__/fixtures";
import { composeRecommendedSlotReasons } from "../combination-reasons";

import type {
  GroupCombination,
  JeongsiAnalysis,
  PlanEvaluation,
} from "../../types";

const analysisOf = (
  slots: PlanEvaluation[],
  englishGrade: 1 | 3 = 1
): JeongsiAnalysis => ({
  input: {
    score: { ...baseScore, english: { grade: englishGrade } },
    preference: makePreference(),
  },
  diagnosis: {
    areas: [],
    averagePercentile: 94,
    totalStandardScore: 0,
    strengths: [],
    weaknesses: [],
  },
  selection: {
    poolStage: 1,
    moderateBandSubstituted: false,
    blockedByRestrictions: false,
  },
  ineligiblePlans: [],
  advantageousPlans: [],
  recommendations: {
    상향: slots.filter((slot) => slot.tier === "상향"),
    적정: slots.filter((slot) => slot.tier === "적정"),
    안정: slots.filter((slot) => slot.tier === "안정"),
  },
  sniping: [],
  combinations: [],
});

const reasonOf = (slot: PlanEvaluation, englishGrade: 1 | 3 = 1): string => {
  const combination: GroupCombination = {
    id: "c1",
    label: "균형 조합",
    가: slot,
    나: null,
    다: null,
    recommended: true,
    matchesRiskAllocation: false,
  };
  const [first] = composeRecommendedSlotReasons(
    combination,
    analysisOf([slot], englishGrade)
  );
  return first.reason;
};

describe("composeRecommendedSlotReasons", () => {
  it("격차와 실측 비율로 그 구분에 배치한 이유를 첫 문장에 쓴다", () => {
    // Arrange — 기준컷 880, 내 점수 900 (+20점), 실측 45%
    const slot = makeEvaluation();

    // Act
    const reason = reasonOf(slot);

    // Assert
    expect(
      reason.startsWith(
        "테스트대학교 컴퓨터공학과는 내 환산점수가 기준컷보다 20.0점 높고 같은 여유였던 곳이 다음 해 컷을 넘은 비율이 45%라 합격을 목표로 하는 적정 원서로 배치했습니다."
      )
    ).toBe(true);
  });

  it("적정, 안정이면 두 학년도 중 높은 70%컷보다도 몇 점 높은지 쓴다", () => {
    // Arrange — 2025 875, 2026 880 → 높은 쪽 880 보다 20점 높다
    const slot = makeEvaluation();

    // Act & Assert
    expect(reasonOf(slot)).toContain(
      "두 학년도 70%컷 중 높았던 2026 컷 880.0점보다도 20.0점 높습니다."
    );
  });

  it("기준컷보다 높은 상향은 '높지만'으로 잇고 높은 컷 비교는 싣지 않는다", () => {
    // Arrange
    const slot = makeEvaluation({
      tier: "상향",
      chance: "낮음",
      convertedScore: 890,
      gapRatio: 1,
      gapPoints: 10,
      historicalPassRate: 0.3,
    });

    // Act
    const reason = reasonOf(slot);

    // Assert
    expect(reason).toContain(
      "기준컷보다 10.0점 높지만 같은 여유였던 곳이 다음 해 컷을 넘은 비율이 30%라 한 단계 위를 노리는 상향 원서로 배치했습니다."
    );
    expect(reason).not.toContain("두 학년도 70%컷");
  });

  it("안정 구간인데 적정이면 제한 사유를 배치 문장에 밝히고 같은 사유를 변수로 되풀이하지 않는다", () => {
    // Arrange
    const slot = makeEvaluation({
      plan: makePlan({ quota: 4 }),
      gapRatio: 4.5,
      gapPoints: 45,
      convertedScore: 925,
      safeCapped: true,
      safeCapReasons: ["소수 모집"],
      historicalPassRate: 0.7,
    });

    // Act
    const reason = reasonOf(slot);

    // Assert
    expect(reason).toContain(
      "기준컷보다 45.0점 높아 격차만 보면 안정 구간이지만, 모집인원이 5명 이하라 합격선이 해마다 크게 움직이는 곳이라 합격을 목표로 하는 적정 원서로 배치했습니다."
    );
    expect(reason).not.toContain("모집인원이 4명이라");
  });

  it("유리한 점수와 불리한 점수를 실제 득실로 쓰고, 큰 손실을 먼저 고른다", () => {
    // Arrange — 영어 3등급 감점 10점(1.0%)이 탐구 반영 손실(9.5점)보다 크다
    const slot = makeEvaluation();

    // Act
    const reason = reasonOf(slot, 3);

    // Assert
    expect(reason).toContain("반영으로 환산점수");
    expect(reason).toMatch(/다만 영어 3등급이라 1등급보다 환산점수 \d+\.\d점/);
    expect(reason).toContain(
      "테스트대학교의 기준컷 대비 +20.0점은 이 손실까지 반영한 값입니다."
    );
    expect(reason).not.toMatch(/강점|약점/);
  });

  it("원문 변수는 실측 근거가 있는 것부터 두 개까지 싣는다", () => {
    // Arrange
    const slot = makeEvaluation({
      plan: makePlan({
        quota: 4,
        formulaChangedYears: [2025],
        recentCompetitions: [
          { year: 2025, competitionRate: 4 },
          { year: 2026, competitionRate: 6, additionalPassRate: 120 },
        ],
      }),
    });

    // Act
    const reason = reasonOf(slot);

    // Assert
    expect(reason).toContain(
      "모집인원이 4명이라 컷이 해마다 크게 움직일 수 있습니다."
    );
    expect(reason).toContain(
      "경쟁률이 2025 4대 1에서 2026 6대 1로 올랐고, 2026 충원율은 120%였습니다."
    );
    expect(reason).not.toContain("반영방식이 달라");
  });
});
