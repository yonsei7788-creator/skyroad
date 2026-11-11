import { loadAdmissionPlans, resetJeongsiDataSource } from "../../data";
import { analyzeJeongsi, countTargetCandidates } from "../analyze";

import type { JeongsiAdmissionPlan, JeongsiInput } from "../../types";

describe("countTargetCandidates — 실데이터 희망 학과 매칭", () => {
  let plans: JeongsiAdmissionPlan[] = [];

  beforeAll(async () => {
    resetJeongsiDataSource();
    plans = await loadAdmissionPlans();
  });

  it("정식 학과명은 모집단위와 매칭된다", () => {
    // Arrange
    const targets = ["컴퓨터공학과", "경영학과", "간호학과", "국어교육과"];

    // Act
    const counts = targets.map((target) =>
      countTargetCandidates(plans, { target, targetKind: "department" })
    );

    // Assert
    counts.forEach((count) => expect(count).toBeGreaterThan(0));
  });

  it("학과 분류에 없는 줄임말은 매칭되지 않는다", () => {
    // Arrange
    const targets = ["컴공", "약대"];

    // Act
    const counts = targets.map((target) =>
      countTargetCandidates(plans, { target, targetKind: "department" })
    );

    // Assert
    expect(counts).toEqual([0, 0]);
  });

  it("시행계획에 있는 모든 계열은 계열로 골랐을 때 후보가 있다", () => {
    // Arrange — 입력 폼의 계열 목록과 같은 출처
    const categories = Array.from(new Set(plans.map((plan) => plan.category)));

    // Act
    const empty = categories.filter(
      (category) =>
        countTargetCandidates(plans, {
          target: category,
          targetKind: "field",
        }) === 0
    );

    // Assert
    expect(empty).toEqual([]);
  });
});

describe("실데이터 추천 범위 회귀", () => {
  const input: JeongsiInput = {
    score: {
      examYear: 2026,
      korean: { elective: "언어와매체", standardScore: 131, percentile: 96 },
      math: { elective: "미적분", standardScore: 137, percentile: 98 },
      english: { grade: 2 },
      history: { grade: 2 },
      inquiry1: {
        subject: "물리학I",
        standardScore: 68,
        percentile: 93,
      },
      inquiry2: {
        subject: "지구과학I",
        standardScore: 65,
        percentile: 88,
      },
    },
    preference: {
      target: "컴퓨터공학과",
      targetKind: "department",
      region: "서울",
      risk: "균형",
    },
  };

  it("서울 컴퓨터공학 지망생의 조합에 무관한 학과가 섞이지 않는다", async () => {
    // Arrange
    resetJeongsiDataSource();

    // Act
    const analysis = await analyzeJeongsi(input);

    // Assert
    const departments = analysis.combinations.flatMap((combination) =>
      (["가", "나", "다"] as const).flatMap((group) =>
        combination[group] ? [combination[group].plan.department] : []
      )
    );
    const recommended = Object.values(analysis.recommendations)
      .flat()
      .map((evaluation) => evaluation.plan.department);
    expect(analysis.selection.poolStage).toBeLessThanOrEqual(2);
    expect(departments.some((name) => name.includes("식품영양"))).toBe(false);
    expect(recommended).not.toContain("인문계열");
  });
});
