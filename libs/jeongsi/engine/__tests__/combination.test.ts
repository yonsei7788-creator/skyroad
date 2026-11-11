import {
  MAX_COMBINATIONS,
  MIN_COMBINATIONS,
  RISK_TIER_MATRIX,
  buildCombinations,
} from "../combination";
import { makePlan } from "./fixtures";

import type { CombinationCandidate } from "../combination";
import type {
  AdmissionGroup,
  AdmissionTier,
  GroupCombination,
  PassChance,
  PlanEvaluation,
} from "../../types";

interface CandidateSpec {
  university: string;
  group: AdmissionGroup;
  tier: AdmissionTier;
  chance?: PassChance;
  /** σ 배수. 안정 슬롯 제약(+2.5σ) 검증용 */
  gapSigmaMultiple?: number;
  fit?: number;
  advantageScore?: number;
  prestige?: number;
  eligible?: boolean;
}

const SIGMA = 0.8;

const CHANCE_BY_TIER: Record<AdmissionTier, PassChance> = {
  안정: "높음",
  적정: "보통",
  상향: "낮음",
  지원불가: "매우낮음",
};

const makeCandidate = (spec: CandidateSpec): CombinationCandidate => {
  const multiple = spec.gapSigmaMultiple ?? (spec.tier === "안정" ? 3 : 0);
  const evaluation: PlanEvaluation = {
    plan: makePlan({
      id: `${spec.university}-컴퓨터공학과-${spec.group}`,
      university: spec.university,
      group: spec.group,
    }),
    eligible: spec.eligible ?? true,
    convertedScore: 900,
    weightedPercentile: 94,
    simpleAveragePercentile: 93.833,
    referenceCut: { metric: "convertedScore", value: 880 },
    competitionRate: 4.2,
    cutHistory: [
      { year: 2024, cut: 870 },
      { year: 2025, cut: 875 },
      { year: 2026, cut: 880 },
    ],
    gapRatio: 2,
    percentileGap: multiple * SIGMA,
    sensitivity: 1.001,
    cutVolatility: SIGMA,
    tier: spec.tier,
    chance: spec.chance ?? CHANCE_BY_TIER[spec.tier],
    advantageScore: spec.advantageScore ?? 50,
  };

  return {
    evaluation,
    fit: spec.fit ?? 3,
    percentileGap: multiple * SIGMA,
    sigma: SIGMA,
    prestige: spec.prestige ?? 90,
  };
};

const slotsOf = (
  combination: GroupCombination
): { group: AdmissionGroup; evaluation: PlanEvaluation }[] =>
  (["가", "나", "다"] as AdmissionGroup[])
    .map((group) => ({ group, evaluation: combination[group] }))
    .filter(
      (slot): slot is { group: AdmissionGroup; evaluation: PlanEvaluation } =>
        slot.evaluation !== null
    );

const tiersOf = (combination: GroupCombination): AdmissionTier[] =>
  slotsOf(combination)
    .map((slot) => slot.evaluation.tier)
    .sort();

/** 군마다 상향·적정·안정 후보가 고르게 있는 후보군 */
const fullCandidateSet = (): CombinationCandidate[] => {
  const tiers: AdmissionTier[] = ["상향", "적정", "안정"];
  const groups: AdmissionGroup[] = ["가", "나", "다"];

  return groups.flatMap((group, groupIndex) =>
    tiers.flatMap((tier, tierIndex) =>
      [1, 2].map((index) =>
        makeCandidate({
          university: `${tier}${group}대학교${index}`,
          group,
          tier,
          fit: 3 - index * 0.5,
          advantageScore: 50 + groupIndex * 3 + tierIndex * 2 + index,
        })
      )
    )
  );
};

describe("buildCombinations - 성향별 tier 구성", () => {
  it("균형 성향은 상향·적정·안정을 한 장씩 섞는다", () => {
    // Arrange
    const candidates = fullCandidateSet();

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(tiersOf(first)).toEqual([...RISK_TIER_MATRIX.균형.tiers].sort());
  });

  it("안정 성향은 적정 2장 + 안정 1장이다", () => {
    // Arrange
    const candidates = fullCandidateSet();

    // Act
    const [first] = buildCombinations(candidates, "안정");

    // Assert
    expect(tiersOf(first)).toEqual(["안정", "적정", "적정"]);
  });

  it("공격 성향은 상향 2장 + 적정 1장이다", () => {
    // Arrange
    const candidates = fullCandidateSet().map((candidate) =>
      candidate.evaluation.tier === "적정"
        ? {
            ...candidate,
            evaluation: { ...candidate.evaluation, chance: "높음" as const },
          }
        : candidate
    );

    // Act
    const [first] = buildCombinations(candidates, "공격");

    // Assert
    expect(tiersOf(first)).toEqual(["상향", "상향", "적정"]);
  });

  it("한 군에 한 장씩만 배정한다", () => {
    // Arrange
    const candidates = fullCandidateSet();

    // Act
    const combinations = buildCombinations(candidates, "균형");

    // Assert
    combinations.forEach((combination) => {
      const groups = slotsOf(combination).map((slot) => slot.group);
      expect(new Set(groups).size).toBe(groups.length);
    });
  });
});

describe("buildCombinations - 슬롯 제약", () => {
  it("안정 성향의 안정 슬롯은 +2.5σ 미만을 쓰지 않는다", () => {
    // Arrange
    // 안정 후보가 +2.0σ(일반 안정 기준은 통과) 뿐인 상황
    const candidates = [
      makeCandidate({
        university: "안정대학교",
        group: "다",
        tier: "안정",
        gapSigmaMultiple: 2.0,
      }),
      makeCandidate({ university: "적정가대학교", group: "가", tier: "적정" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "안정");

    // Assert
    expect(first.다).toBeNull();
    expect(tiersOf(first)).toEqual(["적정", "적정"]);
  });

  it("안정 슬롯 기준을 넘는 후보는 배정된다", () => {
    // Arrange
    const candidates = [
      makeCandidate({
        university: "안정대학교",
        group: "다",
        tier: "안정",
        gapSigmaMultiple: 2.6,
      }),
      makeCandidate({ university: "적정가대학교", group: "가", tier: "적정" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "안정");

    // Assert
    expect(first.다?.plan.university).toBe("안정대학교");
  });

  it("공격 성향의 적정 슬롯은 합격 가능성 높음만 쓴다", () => {
    // Arrange
    const candidates = [
      makeCandidate({ university: "상향가대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "상향나대학교", group: "나", tier: "상향" }),
      makeCandidate({
        university: "적정다대학교",
        group: "다",
        tier: "적정",
        chance: "보통",
      }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "공격");

    // Assert
    // 적정 하단(보통)은 안전판이 못 되므로 비운다
    expect(first.다).toBeNull();
  });

  it("균형 성향의 상향 슬롯은 매우낮음을 쓰지 않는다", () => {
    // Arrange
    const candidates = [
      makeCandidate({
        university: "무리한대학교",
        group: "가",
        tier: "상향",
        chance: "매우낮음",
      }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(
      slotsOf(first).map((slot) => slot.evaluation.plan.university)
    ).not.toContain("무리한대학교");
  });
});

describe("buildCombinations - 폴백", () => {
  it("요구 tier 가 없으면 안정 방향으로만 1단계 완화한다", () => {
    // Arrange
    // 균형 성향의 상향 슬롯 자리에 적정만 있는 상황
    const candidates = [
      makeCandidate({ university: "적정가대학교", group: "가", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(first.가?.plan.university).toBe("적정가대학교");
    expect(first.가?.tier).toBe("적정");
  });

  it("상향 방향으로는 완화하지 않는다", () => {
    // Arrange
    // 안정 성향(적정·적정·안정)에 상향 후보만 있는 상황
    const candidates = [
      makeCandidate({ university: "상향가대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "상향나대학교", group: "나", tier: "상향" }),
    ];

    // Act
    const combinations = buildCombinations(candidates, "안정");

    // Assert
    // 빈 조합은 만들지 않는다 — 성향보다 위험한 조합을 주지 않는다
    expect(combinations).toEqual([]);
  });

  it("채우지 못한 군을 라벨에 명시한다", () => {
    // Arrange
    const candidates = [
      makeCandidate({ university: "상향가대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(first.다).toBeNull();
    expect(first.label).toContain("다군");
  });
});

describe("buildCombinations - 조합 구성", () => {
  it("같은 대학이 한 조합에 두 번 들어가지 않는다", () => {
    // Arrange
    const candidates = [
      makeCandidate({ university: "중복대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "중복대학교", group: "나", tier: "적정" }),
      makeCandidate({
        university: "중복대학교",
        group: "다",
        tier: "안정",
        gapSigmaMultiple: 3,
      }),
      makeCandidate({
        university: "다른대학교",
        group: "나",
        tier: "적정",
        fit: 2,
      }),
      makeCandidate({
        university: "또다른대학교",
        group: "다",
        tier: "안정",
        fit: 2,
        gapSigmaMultiple: 3,
      }),
    ];

    // Act
    const combinations = buildCombinations(candidates, "균형");

    // Assert
    combinations.forEach((combination) => {
      const universities = slotsOf(combination).map(
        (slot) => slot.evaluation.plan.university
      );
      expect(new Set(universities).size).toBe(universities.length);
    });
  });

  it("최대 MAX_COMBINATIONS 개까지 서로 다른 조합을 만든다", () => {
    // Arrange
    const candidates = fullCandidateSet();

    // Act
    const combinations = buildCombinations(candidates, "균형");

    // Assert
    expect(combinations.length).toBeGreaterThanOrEqual(1);
    expect(combinations.length).toBeLessThanOrEqual(MAX_COMBINATIONS);
    const keys = combinations.map((combination) =>
      slotsOf(combination)
        .map((slot) => slot.evaluation.plan.id)
        .join("|")
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("지원불가·부적격 후보는 조합에 들어가지 않는다", () => {
    // Arrange
    const candidates = [
      makeCandidate({
        university: "지원불가대학교",
        group: "가",
        tier: "지원불가",
      }),
      makeCandidate({
        university: "부적격대학교",
        group: "나",
        tier: "적정",
        eligible: false,
      }),
      makeCandidate({ university: "정상대학교", group: "다", tier: "적정" }),
    ];

    // Act
    const combinations = buildCombinations(candidates, "균형");

    // Assert
    const universities = combinations.flatMap((combination) =>
      slotsOf(combination).map((slot) => slot.evaluation.plan.university)
    );
    expect(universities).toEqual(["정상대학교"]);
  });

  it("축이 같은 결과를 내면 다른 대학으로 대안 조합을 만든다", () => {
    // Arrange
    // 적합도·유리도·격차가 모두 같아 세 축이 같은 1순위를 고르는 상황
    const twinPool = (["가", "나", "다"] as AdmissionGroup[]).flatMap(
      (group, index) =>
        [1, 2, 3].map((serial) =>
          makeCandidate({
            university: `${group}군대학교${serial}`,
            group,
            tier: (["상향", "적정", "안정"] as AdmissionTier[])[index],
            gapSigmaMultiple: index === 2 ? 3 : 0,
          })
        )
    );

    // Act
    const combinations = buildCombinations(twinPool, "균형");

    // Assert
    expect(combinations.length).toBeGreaterThanOrEqual(MIN_COMBINATIONS);
    const [first, second] = combinations;
    const firstUniversities = slotsOf(first).map(
      (slot) => slot.evaluation.plan.university
    );
    const secondUniversities = slotsOf(second).map(
      (slot) => slot.evaluation.plan.university
    );
    // 대안 조합은 앞선 조합에 쓰인 대학을 다시 쓰지 않는다
    expect(
      secondUniversities.some((university) =>
        firstUniversities.includes(university)
      )
    ).toBe(false);
    expect(second.label).toContain("대안");
  });

  it("후보가 없으면 빈 배열을 반환한다", () => {
    // Arrange & Act
    const combinations = buildCombinations([], "균형");

    // Assert
    expect(combinations).toEqual([]);
  });
});
