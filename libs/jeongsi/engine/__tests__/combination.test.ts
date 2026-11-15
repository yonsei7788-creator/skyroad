import {
  MAX_COMBINATIONS,
  MIN_COMBINATIONS,
  RISK_TIER_MATRIX,
  SNIPING_COMBINATION_LABEL,
  addSnipingCombination,
  buildCombinations,
  markRecommendedCombination,
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
  /** 판정 격차. 미지정이면 구분의 대표값 */
  gap?: number;
  /** 격차는 안정 구간이지만 입결이 1개년이라 적정으로 낮춘 곳 */
  safeCapped?: boolean;
  fit?: number;
  advantageScore?: number;
  prestige?: number;
  eligible?: boolean;
}

const GAP_BY_TIER: Record<AdmissionTier, number> = {
  안정: 2.5,
  적정: 0.5,
  상향: -1,
  소신: -1.5,
  지원불가: -3,
};

const CHANCE_BY_TIER: Record<AdmissionTier, PassChance> = {
  안정: "높음",
  적정: "보통",
  상향: "낮음",
  소신: "매우낮음",
  지원불가: "매우낮음",
};

const makeCandidate = (spec: CandidateSpec): CombinationCandidate => {
  const gap = spec.gap ?? GAP_BY_TIER[spec.tier];
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
      { year: 2025, cut: 875 },
      { year: 2026, cut: 880 },
    ],
    gapRatio: gap,
    gapPoints: gap * 10,
    resultYears: spec.safeCapped ? [2026] : [2025, 2026],
    quotaChange: null,
    additionalPass: null,
    safeCapped: spec.safeCapped ?? false,
    safeCapReasons: spec.safeCapped ? ["1개년 입결"] : [],
    pastGroups: [],
    finalQuotaChange: null,
    withinRecommendRange: true,
    historicalPassRate: null,
    latestAdmitCuts: null,
    sensitivity: 1.001,
    tier: spec.tier,
    chance: spec.chance ?? CHANCE_BY_TIER[spec.tier],
    advantageScore: spec.advantageScore ?? 50,
  };

  return {
    evaluation,
    fit: spec.fit ?? 3,
    gapRatio: gap,
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
  it("안정 칸이 비면 1개년이라 적정으로 낮춘 곳을 쓰고 구분은 적정 그대로 둔다", () => {
    // Arrange
    const candidates = [
      makeCandidate({
        university: "단년대학교",
        group: "다",
        tier: "적정",
        chance: "높음",
        gap: 2.4,
        safeCapped: true,
      }),
      makeCandidate({ university: "적정가대학교", group: "가", tier: "적정" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "안정");

    // Assert
    expect(first.다?.plan.university).toBe("단년대학교");
    expect(first.다?.tier).toBe("적정");
  });

  it("1개년으로 낮춘 곳이 아니면 적정을 안정으로 바꾸지 않고, 남은 군은 적정 그대로 채운다", () => {
    // Arrange
    const candidates = [
      makeCandidate({ university: "적정가대학교", group: "가", tier: "적정" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
      makeCandidate({ university: "적정다대학교", group: "다", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "안정");

    // Assert
    expect(tiersOf(first)).toEqual(["적정", "적정", "적정"]);
    expect(first.label).toBe("희망 우선형");
  });

  it("공격 성향의 적정 칸은 적정 원서로 채운다 (가능성은 구분을 따라 늘 보통)", () => {
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
    expect(first.다?.plan.university).toBe("적정다대학교");
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

  it("성향 배분으로 못 채운 군도 목록에 그 군 후보가 있으면 채운다", () => {
    // Arrange
    // 균형(상향·적정·안정)인데 안정 후보가 없다. 나군에는 적정 후보가 있다
    const candidates = [
      makeCandidate({ university: "상향가대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "적정다대학교", group: "다", tier: "적정" }),
      makeCandidate({
        university: "적정나대학교",
        group: "나",
        tier: "적정",
        fit: 1,
      }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(first.나?.plan.university).toBe("적정나대학교");
    expect(first.나?.tier).toBe("적정");
    expect(first.label).toBe("희망 우선형");
  });

  it("빈 군에 넣을 후보는 못 채운 구분에 가까운 쪽, 같으면 안전한 쪽을 고른다", () => {
    // Arrange
    // 공격(상향·상향·적정)에 상향이 하나뿐. 나군에 적정·안정이 있으면 적정을 넣는다
    const candidates = [
      makeCandidate({ university: "상향가대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "적정다대학교", group: "다", tier: "적정" }),
      makeCandidate({ university: "안정나대학교", group: "나", tier: "안정" }),
      makeCandidate({ university: "적정나대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "공격");

    // Assert
    expect(first.나?.plan.university).toBe("적정나대학교");
  });

  it("그 군 후보가 모두 이미 쓴 대학이면 비우고 남은 후보 없음으로 표시한다", () => {
    // Arrange
    const candidates = [
      makeCandidate({ university: "같은대학교", group: "가", tier: "상향" }),
      makeCandidate({ university: "적정다대학교", group: "다", tier: "적정" }),
      makeCandidate({ university: "같은대학교", group: "나", tier: "적정" }),
    ];

    // Act
    const [first] = buildCombinations(candidates, "균형");

    // Assert
    expect(first.나).toBeNull();
    expect(first.label).toBe("희망 우선형 (나군 남은 후보 없음)");
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
        gap: 2.5,
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
        gap: 2.5,
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
            gap: [-1, 0.5, 2.5][index],
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

describe("addSnipingCombination - 공격 성향 소신 조합", () => {
  const baseCombination = (): GroupCombination => ({
    id: "jeongsi-combo-1",
    label: "희망 우선형",
    가: makeCandidate({ university: "가상향대", group: "가", tier: "상향" })
      .evaluation,
    나: makeCandidate({ university: "나상향대", group: "나", tier: "상향" })
      .evaluation,
    다: makeCandidate({ university: "다적정대", group: "다", tier: "적정" })
      .evaluation,
    recommended: true,
    matchesRiskAllocation: true,
  });
  const snipe = (group: AdmissionGroup, university: string): PlanEvaluation =>
    makeCandidate({ university, group, tier: "소신", gap: -1.2 }).evaluation;

  it("공격 성향이면 대표 조합의 상향 칸 하나를 소신으로 바꾼 조합을 붙인다", () => {
    // Arrange
    const combinations = [baseCombination()];

    // Act
    const result = addSnipingCombination(
      combinations,
      [snipe("가", "소신대")],
      "공격"
    );

    // Assert
    expect(result).toHaveLength(2);
    const [, added] = result;
    expect(added.label).toBe(SNIPING_COMBINATION_LABEL);
    expect(added.가?.plan.university).toBe("소신대");
    expect(added.나?.plan.university).toBe("나상향대");
    expect(added.recommended).toBe(false);
    expect(result[0].recommended).toBe(true);
  });

  it("적정(안전판) 칸은 바꾸지 않는다", () => {
    // Arrange
    const combinations = [baseCombination()];

    // Act
    const result = addSnipingCombination(
      combinations,
      [snipe("다", "소신대")],
      "공격"
    );

    // Assert
    expect(result).toHaveLength(1);
  });

  it("공격 성향이 아니면 조합을 더하지 않는다", () => {
    // Arrange
    const combinations = [baseCombination()];

    // Act
    const result = addSnipingCombination(
      combinations,
      [snipe("가", "소신대")],
      "균형"
    );

    // Assert
    expect(result).toHaveLength(1);
  });
});

describe("markRecommendedCombination - 배분을 지키는 조합이 없을 때", () => {
  const combinationOf = (
    id: string,
    specs: CandidateSpec[]
  ): GroupCombination => {
    const combination: GroupCombination = {
      id,
      label: id,
      가: null,
      나: null,
      다: null,
      recommended: false,
      matchesRiskAllocation: false,
    };
    for (const spec of specs) {
      combination[spec.group] = makeCandidate(spec).evaluation;
    }
    return combination;
  };

  it("구분 구성이 성향 배분에 가까운 조합을 희망 일치보다 먼저 고른다", () => {
    // Arrange
    // 안정 성향(적정·적정·안정). 희망 일치는 상향 3장이 더 높다
    const reachSpecs: CandidateSpec[] = [
      { university: "상향가대학교", group: "가", tier: "상향", fit: 3 },
      { university: "상향나대학교", group: "나", tier: "상향", fit: 3 },
      { university: "상향다대학교", group: "다", tier: "상향", fit: 3 },
    ];
    const moderateSpecs: CandidateSpec[] = [
      { university: "적정가대학교", group: "가", tier: "적정", fit: 1 },
      { university: "적정나대학교", group: "나", tier: "적정", fit: 1 },
      { university: "적정다대학교", group: "다", tier: "적정", fit: 1 },
    ];
    const combinations = [
      combinationOf("reach", reachSpecs),
      combinationOf("moderate", moderateSpecs),
    ];
    const candidates = [...reachSpecs, ...moderateSpecs].map(makeCandidate);

    // Act
    const marked = markRecommendedCombination(combinations, candidates, "안정");

    // Assert
    expect(marked.find((item) => item.recommended)?.id).toBe("moderate");
    expect(marked.every((item) => !item.matchesRiskAllocation)).toBe(true);
  });
});
