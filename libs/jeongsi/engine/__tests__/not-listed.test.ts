import {
  FIT_EXACT,
  FIT_FIELD_GROUP,
  collectNotCompared,
  collectNotListed,
} from "../analyze";
import { makeEvaluation, makePlan, makePreference } from "./fixtures";

import type { CombinationCandidate, RecommendableTier } from "../combination";
import type {
  AdmissionGroup,
  AdmissionTier,
  ExcludedUnit,
  PlanEvaluation,
} from "../../types";

interface Spec {
  university: string;
  group?: AdmissionGroup;
  tier: AdmissionTier;
  gap: number;
  fit?: number;
  eligible?: boolean;
  pastGroups?: PlanEvaluation["pastGroups"];
}

const candidateOf = (spec: Spec): CombinationCandidate => {
  const group = spec.group ?? "가";
  const evaluation = makeEvaluation({
    plan: makePlan({
      id: `${spec.university}-컴퓨터공학과-${group}`,
      university: spec.university,
      group,
    }),
    tier: spec.tier,
    gapRatio: spec.gap,
    gapPoints: spec.gap * 10,
    eligible: spec.eligible ?? true,
    pastGroups: spec.pastGroups ?? [],
    ...(spec.eligible === false
      ? { ineligibleReason: "수학 확률과통계 응시자는 지원할 수 없습니다." }
      : {}),
  });
  return {
    evaluation,
    fit: spec.fit ?? FIT_EXACT,
    gapRatio: spec.gap,
    prestige: 0,
  };
};

const emptyPicked = (): Record<RecommendableTier, CombinationCandidate[]> => ({
  상향: [],
  적정: [],
  안정: [],
});

describe("collectNotListed", () => {
  it("같은 구분에 같은 대학이 있으면 대학당 한 곳이라 뺐다고 적는다", () => {
    // Arrange
    const listed = candidateOf({
      university: "가대학교",
      tier: "적정",
      gap: 2.5,
    });
    const sibling = candidateOf({
      university: "가대학교",
      group: "나",
      tier: "적정",
      gap: 2.8,
    });
    const picked = { ...emptyPicked(), 적정: [listed] };

    // Act
    const result = collectNotListed([listed, sibling], picked, []);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("sameUniversityListed");
    expect(result[0].unitKey).toBe(sibling.evaluation.plan.id);
  });

  it("범위 안인데 같은 대학이 없으면 구분 목록이 찬 것으로 적는다", () => {
    // Arrange
    const other = candidateOf({ university: "나대학교", tier: "상향", gap: 1 });

    // Act
    const [entry] = collectNotListed([other], emptyPicked(), []);

    // Assert
    expect(entry.reason).toBe("tierListFull");
  });

  it("범위 밖은 위아래를 나누고 추천 범위에 가까운 곳부터 싣는다", () => {
    // Arrange
    const far = candidateOf({ university: "다대학교", tier: "안정", gap: 12 });
    const near = candidateOf({ university: "라대학교", tier: "안정", gap: 7 });
    const below = candidateOf({
      university: "마대학교",
      tier: "지원불가",
      gap: -3,
    });

    // Act
    const result = collectNotListed([far, below, near], emptyPicked(), []);

    // Assert
    expect(result.map((entry) => entry.reason)).toEqual([
      "aboveRange",
      "belowRange",
      "aboveRange",
    ]);
    expect(result[0].university).toBe("라대학교");
  });

  it("소신 구간은 모집군 변경, 같은 대학, 목록 참을 나눈다", () => {
    // Arrange
    const regrouped = candidateOf({
      university: "바대학교",
      tier: "소신",
      gap: -1,
      pastGroups: [{ year: 2026, group: "다" }],
    });
    const sameUniversity = candidateOf({
      university: "사대학교",
      group: "나",
      tier: "소신",
      gap: -1,
    });
    const full = candidateOf({ university: "아대학교", tier: "소신", gap: -1 });
    const pickedSniping = candidateOf({
      university: "사대학교",
      tier: "소신",
      gap: -0.8,
    }).evaluation;

    // Act
    const result = collectNotListed(
      [regrouped, sameUniversity, full],
      emptyPicked(),
      [pickedSniping]
    );

    // Assert
    const reasonOf = (university: string) =>
      result.find((entry) => entry.university === university)?.reason;
    expect(reasonOf("바대학교")).toBe("snipingRegrouped");
    expect(reasonOf("사대학교")).toBe("snipingSameUniversity");
    expect(reasonOf("아대학교")).toBe("snipingListFull");
  });

  it("지원 자격이 없으면 엔진 사유를 남기고, 넓혀 담은 계열은 싣지 않는다", () => {
    // Arrange
    const ineligible = candidateOf({
      university: "자대학교",
      tier: "지원불가",
      gap: 2,
      eligible: false,
    });
    const widened = candidateOf({
      university: "차대학교",
      tier: "적정",
      gap: 2,
      fit: FIT_FIELD_GROUP,
    });

    // Act
    const result = collectNotListed([ineligible, widened], emptyPicked(), []);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe("ineligible");
    expect(result[0].ineligibleReason).toContain("확률과통계");
  });
});

describe("collectNotCompared", () => {
  const excluded = (overrides: Partial<ExcludedUnit>): ExcludedUnit => ({
    university: "카대학교",
    department: "컴퓨터공학과",
    category: "컴퓨터공학",
    group: "가",
    reason: "maxScoreUnpublished",
    ...overrides,
  });

  it("희망 학과와 같은 분류의 제외 모집단위를 원문 사유와 함께 모은다", () => {
    // Arrange
    const units = [
      excluded({}),
      excluded({
        university: "타대학교",
        department: "국어국문학과",
        category: "국어국문학",
      }),
    ];

    // Act
    const result = collectNotCompared({
      plans: [],
      excludedUnits: units,
      comparedPlanIds: new Set(),
      isComparable: () => true,
      preference: makePreference(),
      gender: undefined,
      track: null,
    });

    // Assert
    expect(result).toEqual([
      {
        university: "카대학교",
        department: "컴퓨터공학과",
        group: "가",
        reason: "maxScoreUnpublished",
      },
    ]);
  });

  it("남학생이면 여자대학교를, 교육 계열이 아니면 사범계열을 싣지 않는다", () => {
    // Arrange
    const units = [
      excluded({ university: "파여자대학교" }),
      excluded({ department: "컴퓨터교육과" }),
    ];

    // Act
    const result = collectNotCompared({
      plans: [],
      excludedUnits: units,
      comparedPlanIds: new Set(),
      isComparable: () => true,
      preference: makePreference(),
      gender: "male",
      track: null,
    });

    // Assert
    expect(result).toEqual([]);
  });

  it("엔진 데이터에 있어도 같은 기준 입결이 없으면 바뀐 환산식 학년도와 함께 싣는다", () => {
    // Arrange
    const plan = makePlan({
      id: "하대학교-컴퓨터공학과-나",
      university: "하대학교",
      group: "나",
      formulaChangedYears: [2025],
    });

    // Act
    const result = collectNotCompared({
      plans: [plan],
      excludedUnits: [],
      comparedPlanIds: new Set(),
      isComparable: () => false,
      preference: makePreference(),
      gender: undefined,
      track: null,
    });

    // Assert
    expect(result).toEqual([
      {
        university: "하대학교",
        department: "컴퓨터공학과",
        group: "나",
        reason: "noComparableResults",
        formulaChangedYears: [2025],
      },
    ]);
  });
});
