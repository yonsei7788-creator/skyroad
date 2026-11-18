import {
  baseScore,
  makeEvaluation,
  makePlan,
  makePreference,
} from "../../engine/__tests__/fixtures";
import {
  composeCombinationOutlook,
  describeComposition,
} from "../combination-outlook";

import type {
  AdmissionGroup,
  AdmissionTier,
  GroupCombination,
  JeongsiAnalysis,
  PlanEvaluation,
} from "../../types";

const CHANCE: Record<AdmissionTier, PlanEvaluation["chance"]> = {
  안정: "높음",
  적정: "보통",
  상향: "낮음",
  소신: "매우낮음",
  지원불가: "매우낮음",
};

const unit = (
  university: string,
  group: AdmissionGroup,
  tier: AdmissionTier,
  gap: number
): PlanEvaluation =>
  makeEvaluation({
    plan: makePlan({
      id: `${university}-컴퓨터공학과-${group}`,
      university,
      group,
    }),
    tier,
    chance: CHANCE[tier],
    gapRatio: gap,
    gapPoints: gap * 10,
  });

const reach = unit("가대학교", "가", "상향", 1);
const match = unit("나대학교", "나", "적정", 2.5);
const safe = unit("다대학교", "다", "안정", 5);
const otherReach = unit("라대학교", "나", "상향", 0.5);

const combinationOf = (recommended: boolean): GroupCombination => ({
  id: "c1",
  label: "균형 조합",
  가: reach,
  나: match,
  다: safe,
  recommended,
  matchesRiskAllocation: true,
});

const analysisOf = (combination: GroupCombination): JeongsiAnalysis => ({
  input: { score: baseScore, preference: makePreference() },
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
    상향: [reach, otherReach],
    적정: [match],
    안정: [safe],
  },
  sniping: [],
  combinations: [combination],
});

describe("composeCombinationOutlook", () => {
  it("대표 조합이 아니면 만들지 않는다", () => {
    // Arrange
    const combination = combinationOf(false);

    // Act & Assert
    expect(
      composeCombinationOutlook(combination, analysisOf(combination))
    ).toBeNull();
  });

  it("구성과 전체 위험을 장수로 말한다", () => {
    // Arrange
    const combination = combinationOf(true);

    // Act
    const outlook = composeCombinationOutlook(
      combination,
      analysisOf(combination)
    );

    // Assert
    expect(outlook?.summary).toBe(
      "상향 1장, 적정 1장, 안정 1장입니다. 합격 가능성이 보통 이상인 원서가 2장이라, 위를 노리는 원서가 어렵더라도 보통 이상인 원서로 합격을 노립니다."
    );
  });

  it("빈 군이 있으면 원서 장수가 줄었다고 밝힌다", () => {
    // Arrange
    const combination = { ...combinationOf(true), 나: null };

    // Act
    const outlook = composeCombinationOutlook(
      combination,
      analysisOf(combination)
    );

    // Assert
    expect(outlook?.summary).toContain(
      "나군은 추천 목록에 후보가 없어 원서가 2장입니다."
    );
  });

  it("상향 원서의 위험은 받쳐 주는 원서로, 적정 원서는 여유가 사라지는 컷 상승 폭으로 쓴다", () => {
    // Arrange
    const combination = combinationOf(true);

    // Act
    const outlook = composeCombinationOutlook(
      combination,
      analysisOf(combination)
    );

    // Assert
    const riskOf = (group: AdmissionGroup) =>
      outlook?.slots.find((slot) => slot.group === group)?.risk;
    expect(riskOf("가")).toBe(
      "합격 가능성이 낮아, 이 원서가 어렵게 되면 다군 다대학교(안정)가 받쳐 줍니다."
    );
    expect(riskOf("나")).toBe(
      "2027 70%컷이 기준컷보다 25.0점 넘게 오르면 내 점수가 70%컷 아래가 됩니다."
    );
  });

  it("같은 군의 다른 후보로 바꿀 때 구성과 보통 이상 원서 수의 변화를 쓴다", () => {
    // Arrange
    const combination = combinationOf(true);

    // Act
    const outlook = composeCombinationOutlook(
      combination,
      analysisOf(combination)
    );

    // Assert
    const swap = outlook?.swaps.find((entry) => entry.group === "나");
    expect(swap?.options).toHaveLength(1);
    expect(swap?.options[0].university).toBe("라대학교");
    expect(swap?.options[0].text).toBe(
      "바꾸면 상향 2장, 안정 1장이 됩니다. 나군 원서의 기준컷 대비 여유가 줄어 더 어려운 곳을 노리게 되고, 합격 가능성이 보통 이상인 원서가 2장에서 1장으로 줄어듭니다."
    );
    const empty = outlook?.swaps.find((entry) => entry.group === "다");
    expect(empty?.note).toBe(
      "다군에는 이 원서 말고 목록에 다른 후보가 없습니다."
    );
  });
});

describe("describeComposition", () => {
  it("0장인 구분은 빼고 상향, 적정, 안정, 소신 순으로 쓴다", () => {
    // Arrange & Act & Assert
    expect(describeComposition(["소신", "적정", "적정"])).toBe(
      "적정 2장, 소신 1장"
    );
  });
});
