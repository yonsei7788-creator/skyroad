import {
  FIT_EXACT,
  FIT_FIELD_GROUP,
  RECOMMENDATION_SIZE,
} from "../../engine/analyze";
import { SMALL_QUOTA_MAX } from "../../engine/classify";
import {
  baseScore,
  makeEvaluation,
  makePlan,
  makePreference,
} from "../../engine/__tests__/fixtures";
import {
  NOT_COMPARED_NAMES_PER_REASON,
  composeNotComparedGroups,
  composeUnitExplanation,
  describeNotListedReason,
} from "../explanations";

import type {
  JeongsiAnalysis,
  NotComparedEntry,
  PlanEvaluation,
} from "../../types";

const analysisOf = (englishGrade: 1 | 2 = 1): JeongsiAnalysis => ({
  input: {
    score: { ...baseScore, english: { grade: englishGrade } },
    preference: makePreference(),
  },
  diagnosis: {
    areas: [
      {
        area: "korean",
        percentile: 93,
        standardScore: 130,
        rank: 3,
        deviation: -1,
      },
      {
        area: "math",
        percentile: 96,
        standardScore: 140,
        rank: 1,
        deviation: 2,
      },
      {
        area: "inquiry",
        percentile: 92.5,
        standardScore: 68,
        rank: 2,
        deviation: -1.5,
      },
    ],
    averagePercentile: 94,
    totalStandardScore: 338,
    strengths: ["math"],
    weaknesses: ["korean"],
  },
  selection: {
    poolStage: 1,
    moderateBandSubstituted: false,
    blockedByRestrictions: false,
  },
  ineligiblePlans: [],
  advantageousPlans: [],
  recommendations: { 상향: [], 적정: [], 안정: [] },
  sniping: [],
  combinations: [],
});

const fitContext = (fit = FIT_EXACT) => ({
  targetLabel: "컴퓨터공학과",
  fieldLabel: "컴퓨터와 IT 계열",
  fit,
});

const explain = (
  evaluation: PlanEvaluation,
  options: { englishGrade?: 1 | 2 } = {}
) =>
  composeUnitExplanation(
    evaluation,
    analysisOf(options.englishGrade ?? 1),
    fitContext()
  );

describe("composeUnitExplanation — 왜 이 구분인가", () => {
  it("기준컷을 만든 방법과 구간을 원문 컷으로 밝힌다", () => {
    // Arrange
    const evaluation = makeEvaluation();

    // Act
    const { tierReason } = explain(evaluation);

    // Assert
    expect(tierReason[0]).toBe(
      "기준컷 880.0점은 2025 70%컷 875.0점과 2026 70%컷 880.0점을 3:5 비중으로 묶은 값입니다."
    );
    expect(tierReason[1]).toContain(
      "적정 구간(만점 대비 +1.7% 이상 +4.0% 미만)"
    );
  });

  it("기준컷보다 높은데 상향이면 그 이유와 전년도 컷과의 차이를 쓴다", () => {
    // Arrange — 기준컷 880, 내 점수 890, 2026 70%컷 875
    const evaluation = makeEvaluation({
      tier: "상향",
      chance: "낮음",
      convertedScore: 890,
      gapRatio: 1,
      gapPoints: 10,
      historicalPassRate: 0.3,
      latestAdmitCuts: { year: 2026, cut50: null, cut70: 875 },
    });

    // Act
    const text = explain(evaluation).tierReason.join(" ");

    // Assert
    expect(text).toContain(
      "기준컷보다 높아도 상향인 것은 컷이 해마다 움직이기 때문입니다."
    );
    expect(text).toContain("비율은 30%였습니다.");
    expect(text).toContain("2026 70%컷 875.0점보다는 15.0점 높지만");
  });

  it("안정 구간인데 적정이면 안정 제한 사유를 밝히고, 소수 모집 실측임을 적는다", () => {
    // Arrange
    const evaluation = makeEvaluation({
      plan: makePlan({ quota: SMALL_QUOTA_MAX }),
      gapRatio: 4.5,
      gapPoints: 45,
      safeCapped: true,
      safeCapReasons: ["소수 모집"],
      historicalPassRateScope: "smallQuota",
    });

    // Act
    const text = explain(evaluation).tierReason.join(" ");

    // Assert
    expect(text).toContain("격차만 보면 안정 구간");
    expect(text).toContain(`모집인원이 ${SMALL_QUOTA_MAX}명 이하라`);
    expect(text).toContain(
      `모집인원 ${SMALL_QUOTA_MAX}명 이하 모집단위끼리 잰 값`
    );
  });

  it("아주 작은 격차는 둘째 자리까지 써서 0으로 보이지 않게 한다", () => {
    // Arrange
    const evaluation = makeEvaluation({
      tier: "상향",
      gapRatio: 0.03,
      gapPoints: 0.3,
      convertedScore: 880.3,
    });

    // Act
    const text = explain(evaluation).tierReason.join(" ");

    // Assert
    expect(text).toContain("만점 대비 +0.03%");
  });
});

describe("composeUnitExplanation — 유리, 불리 요인", () => {
  it("영어 등급 손실을 점수로 쓰고, 손실이 없으면 한 단계 위였는지 밝힌다", () => {
    // Arrange — 영어 2등급 감점 5점 = 만점 대비 0.5%, 격차 1.6 + 0.5 = 2.1 (적정)
    const evaluation = makeEvaluation({
      tier: "상향",
      gapRatio: 1.6,
      gapPoints: 16,
    });

    // Act
    const { factors } = explain(evaluation, { englishGrade: 2 });

    // Assert
    expect(factors).toContainEqual(
      expect.objectContaining({
        effect: "불리",
        text: "영어 2등급이라 1등급보다 환산점수 5.0점(만점 대비 0.5%) 덜 받습니다. 이 차이가 없었다면 적정 구간입니다.",
      })
    );
  });

  it("반영비율로 더 받고 덜 받는 실제 점수를 쓰고, 강점이나 약점이라는 말은 쓰지 않는다", () => {
    // Arrange — 국어 30%, 수학 35%, 탐구 25% (표준점수 반영)
    const evaluation = makeEvaluation();

    // Act
    const { factors } = explain(evaluation);

    // Assert
    const texts = factors.map((factor) => factor.text);
    expect(factors.map((factor) => factor.effect)).toEqual(["유리", "불리"]);
    expect(texts[0]).toMatch(
      /^국어, 수학, 탐구 성적이 모두 같았을 때와 견주면 (국어|수학|탐구) \d+(\.\d)?% 반영으로 환산점수 \d+\.\d점\(만점 대비 \d+\.\d%\)을 더 받습니다\./
    );
    expect(texts[1]).toMatch(/반영으로 환산점수 \d+\.\d점.*을 덜 받습니다\./);
    texts.forEach((text) => expect(text).not.toMatch(/강점|약점/));
  });
});

describe("composeUnitExplanation — 조건과 변수", () => {
  it("컷 변동 폭이 여유보다 작으면 같은 폭으로 올라도 70%컷 위라고 쓴다", () => {
    // Arrange — 여유 20점, 2025→2026 +5점
    const evaluation = makeEvaluation();

    // Act
    const { conditions } = explain(evaluation);

    // Assert
    expect(conditions).toEqual([
      "2027 70%컷이 기준컷보다 20.0점 넘게 오르지 않으면 내 환산점수가 70%컷 위에 있습니다.",
      "이 모집단위의 70%컷은 2025 875.0점에서 2026 880.0점으로 +5.0점 움직였습니다.",
      "같은 폭(5.0점)만큼 올라도 내 점수가 70%컷 위에 남는 여유입니다.",
    ]);
  });

  it("컷 변동 폭이 여유보다 크면 판정이 달라질 수 있다고 쓴다", () => {
    // Arrange — 여유 3점, 2025→2026 +5점
    const evaluation = makeEvaluation({ gapRatio: 0.3, gapPoints: 3 });

    // Act
    const { conditions } = explain(evaluation);

    // Assert
    expect(conditions[2]).toContain("판정이 달라질 수 있습니다");
  });

  it("2025 입결을 반영방식 변경으로 쓰지 않았으면 변동 폭을 견줄 수 없다고 쓴다", () => {
    // Arrange
    const evaluation = makeEvaluation({
      plan: makePlan({ formulaChangedYears: [2025] }),
      resultYears: [2026],
      cutHistory: [
        { year: 2025, cut: null },
        { year: 2026, cut: 880 },
      ],
    });

    // Act
    const { conditions, variables } = explain(evaluation);

    // Assert
    expect(conditions[1]).toBe(
      "비교할 2025 입결이 없어(아래 반영방식 변경), 이 모집단위의 컷 변동 폭은 견줄 수 없습니다."
    );
    expect(variables).toContain(
      "2027 반영방식이 2025 학년도와 달라, 그해 입결은 기준컷에 쓰지 않았습니다."
    );
  });

  it("소수 모집, 경쟁률 급등과 충원율을 실측 비율과 함께 쓴다", () => {
    // Arrange
    const evaluation = makeEvaluation({
      plan: makePlan({
        quota: 4,
        recentCompetitions: [
          { year: 2025, competitionRate: 4 },
          { year: 2026, competitionRate: 6, additionalPassRate: 120 },
        ],
      }),
    });

    // Act
    const { variables } = explain(evaluation);

    // Assert
    expect(variables[0]).toContain("모집인원 4명");
    expect(variables[1]).toContain(
      "경쟁률은 2025 4대 1, 2026 6대 1, 2026 충원율 120%입니다."
    );
    expect(variables[1]).toContain("19%");
  });
});

describe("composeUnitExplanation — 희망 학과와 다른 분류", () => {
  it("넓혀 담은 곳은 이유와 판정에 넣지 않은 정보를 밝힌다", () => {
    // Arrange
    const evaluation = makeEvaluation({
      plan: makePlan({
        department: "데이터과학과",
        category: "데이터사이언스",
      }),
    });

    // Act
    const result = composeUnitExplanation(
      evaluation,
      analysisOf(),
      fitContext(FIT_FIELD_GROUP)
    );

    // Assert
    expect(result.fitNote).toContain(
      "희망 학과(컴퓨터공학과)와 다른 분류인 데이터사이언스입니다."
    );
    expect(result.fitNote).toContain("컴퓨터와 IT 계열까지 넓혀 담았습니다");
    expect(result.fitNote).toContain("교육과정과 입학 후 전공 선택 제도");
  });

  it("같은 분류면 다른 분류 설명을 싣지 않는다", () => {
    // Arrange & Act
    const result = explain(makeEvaluation());

    // Assert
    expect(result.fitNote).toBeUndefined();
  });
});

describe("describeNotListedReason", () => {
  it("구분 목록이 찬 곳은 목록 크기와 고르는 기준을 쓴다", () => {
    // Arrange & Act
    const reason = describeNotListedReason({
      unitKey: "가대학교-컴퓨터공학과-가",
      university: "가대학교",
      department: "컴퓨터공학과",
      group: "가",
      reason: "tierListFull",
      tier: "적정",
      gapRatio: 2.4,
    });

    // Assert
    expect(reason).toBe(
      `기준컷보다 만점 대비 2.4% 높은 적정 구간이지만, 적정 목록은 ${RECOMMENDATION_SIZE}곳까지 담고 희망 학과에 더 가까운 곳, 적정 구간 가운데에 더 가까운 곳을 먼저 골라 들지 않았습니다.`
    );
  });
});

describe("composeNotComparedGroups", () => {
  const entry = (
    university: string,
    overrides: Partial<NotComparedEntry> = {}
  ): NotComparedEntry => ({
    university,
    department: "컴퓨터공학과",
    group: "가",
    reason: "formulaUnsupported",
    ...overrides,
  });

  it("사유별로 묶고, 많으면 이름 수를 줄이고 나머지 수를 남긴다", () => {
    // Arrange
    const entries = Array.from(
      { length: NOT_COMPARED_NAMES_PER_REASON + 2 },
      (_, index) => entry(`대학${index}`)
    );

    // Act
    const [group] = composeNotComparedGroups(entries);

    // Assert
    expect(group.units).toHaveLength(NOT_COMPARED_NAMES_PER_REASON);
    expect(group.moreCount).toBe(2);
    expect(group.units[0]).toBe("대학0 컴퓨터공학과(가군)");
  });

  it("반영방식이 바뀐 곳과 신설 모집단위는 따로 묶어 앞에 둔다", () => {
    // Arrange
    const entries = [
      entry("가대학교"),
      entry("나대학교", {
        reason: "noComparableResults",
        formulaChangedYears: [2025],
      }),
      entry("다대학교", { reason: "newUnit" }),
    ];

    // Act
    const groups = composeNotComparedGroups(entries);

    // Assert
    expect(groups.map((group) => group.units[0])).toEqual([
      "다대학교 컴퓨터공학과(가군)",
      "나대학교 컴퓨터공학과(가군)",
      "가대학교 컴퓨터공학과(가군)",
    ]);
    expect(groups[1].reason).toContain("2027 반영방식이 바뀌어");
  });
});
