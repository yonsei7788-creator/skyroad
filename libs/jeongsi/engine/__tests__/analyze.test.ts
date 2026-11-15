import {
  clearJeongsiDataCache,
  resetJeongsiDataSource,
  setJeongsiDataSource,
} from "../../data";
import {
  analyzeJeongsi,
  calcDepartmentFit,
  classifyForStudent,
  collectCandidatePlans,
  countFilledBands,
  snipingSignalRank,
} from "../analyze";
import { MAX_COMBINATIONS } from "../combination";
import { baseScore, makePlan, makePreference, makeResult } from "./fixtures";

import type {
  JeongsiAdmissionPlan,
  JeongsiInput,
  JeongsiResultEntry,
  PlanEvaluation,
} from "../../types";

// 기준 학생(baseScore)의 국·수·탐 평균 백분위 93.833.
// 표준점수 환산식은 민감도를 원문만으로 구할 수 없어(환산점수 입결 비교 불가)
// 입결은 백분위 컷으로 둔다. 아래 "기준 점수"는 예전 환산점수 표기를 그대로
// 쓰고, 같은 격차에 2.0 을 더한 백분위 컷으로 바꾼다(판정 구간이 실측 기반으로
// 올라간 만큼 픽스처의 구분이 그대로 유지되게).
//   870 → +4.91 → 안정 / 893 → +2.62 → 적정 / 908 → +1.12 → 상향 / 950 → -3.08 → 지원불가
const STUDENT_PERCENTILE = 93.833;
const FIXTURE_GAP_SHIFT = 2.0;
const toPercentileCut = (points: number): number =>
  Math.round(
    (STUDENT_PERCENTILE - (899.167 - points) / 10.01 - FIXTURE_GAP_SHIFT) * 1000
  ) / 1000;
// 안정은 환산점수 입결만 될 수 있다(백분위 입결은 실측 근거가 없어 적정까지).
// 그래서 구분 픽스처는 환산점수 컷(만점 1000)으로 둔다: 같은 격차에 2.0 을 더한 컷.
const toConvertedCut = (points: number): number =>
  Math.round((points - FIXTURE_GAP_SHIFT * 10) * 1000) / 1000;
const plans: JeongsiAdmissionPlan[] = [
  makePlan({
    id: "상향대학교-컴퓨터공학과-가",
    university: "상향대학교",
    region: "서울",
    group: "가",
  }),
  makePlan({
    id: "적정대학교-컴퓨터공학부-나",
    university: "적정대학교",
    department: "컴퓨터공학부",
    region: "서울",
    group: "나",
  }),
  makePlan({
    id: "안정대학교-컴퓨터공학과-다",
    university: "안정대학교",
    region: "수도권",
    group: "다",
  }),
  makePlan({
    id: "지방대학교-컴퓨터공학과-가",
    university: "지방대학교",
    region: "지방",
    group: "가",
  }),
  makePlan({
    id: "제한대학교-컴퓨터공학과-가",
    university: "제한대학교",
    region: "서울",
    group: "가",
    restrictions: { math: ["확률과통계"] },
  }),
  makePlan({
    id: "타학과대학교-국어국문학과-가",
    university: "타학과대학교",
    department: "국어국문학과",
    category: "국어국문학",
    region: "서울",
    group: "가",
  }),
  // 신설 모집단위 — 입결 없음. 같은 대학의 다른 모집단위 컷으로 추정한다
  makePlan({
    id: "신설대학교-컴퓨터공학과-나",
    university: "신설대학교",
    region: "서울",
    group: "나",
  }),
  // 추정 근거가 되는 같은 대학 모집단위. 학과가 달라 후보에는 안 들어간다
  makePlan({
    id: "신설대학교-기계공학과-가",
    university: "신설대학교",
    department: "기계공학과",
    category: "기계공학",
    region: "서울",
    group: "가",
  }),
];

const cutOf = (
  planKey: string,
  university: string,
  group: JeongsiResultEntry["group"],
  value: number
): JeongsiResultEntry =>
  makeResult({
    planKey,
    university,
    group,
    cut70: { metric: "convertedScore", value: toConvertedCut(value) },
  });

const results: JeongsiResultEntry[] = [
  cutOf("상향대학교-컴퓨터공학과-가", "상향대학교", "가", 908),
  cutOf("적정대학교-컴퓨터공학부-나", "적정대학교", "나", 893),
  cutOf("안정대학교-컴퓨터공학과-다", "안정대학교", "다", 870),
  cutOf("지방대학교-컴퓨터공학과-가", "지방대학교", "가", 870),
  cutOf("제한대학교-컴퓨터공학과-가", "제한대학교", "가", 870),
  cutOf("타학과대학교-국어국문학과-가", "타학과대학교", "가", 870),
  cutOf("신설대학교-기계공학과-가", "신설대학교", "가", 893),
];

/** 같은 컷의 2025·2026 입결 (1개년이면 안정으로 매기지 않으므로) */
const twoYears = (entry: JeongsiResultEntry): JeongsiResultEntry[] => [
  { ...entry, admissionYear: 2025 },
  entry,
];

const useFixtureData = (
  planData: JeongsiAdmissionPlan[] = plans,
  resultData: JeongsiResultEntry[] = results
): void => {
  // 입결이 1개년이면 안정으로 매기지 않으므로(specs/014 B4), 단년 입결 픽스처는
  // 같은 컷의 2025 입결을 함께 둬 2개년으로 만든다.
  const twoYearData = resultData.flatMap((entry) =>
    entry.admissionYear === 2026 &&
    !resultData.some(
      (other) => other.planKey === entry.planKey && other.admissionYear === 2025
    )
      ? [entry, { ...entry, admissionYear: 2025 as const }]
      : [entry]
  );
  setJeongsiDataSource({
    readAdmissionPlans: async () => planData,
    readAdmissionResults: async () => twoYearData,
  });
};

const makeInput = (
  overrides: Partial<JeongsiInput["preference"]> = {}
): JeongsiInput => ({
  score: baseScore,
  preference: makePreference(overrides),
});

const universitiesOf = (evaluations: PlanEvaluation[]): string[] =>
  evaluations.map((evaluation) => evaluation.plan.university);

const allRecommended = (
  recommendations: Record<string, PlanEvaluation[]>
): PlanEvaluation[] => [
  ...recommendations.상향,
  ...recommendations.적정,
  ...recommendations.안정,
];

describe("calcDepartmentFit", () => {
  it("학과명이 정확히 같으면 가장 높은 적합도를 준다", () => {
    // Arrange
    const plan = makePlan({ department: "컴퓨터공학과" });

    // Act & Assert
    expect(calcDepartmentFit(plan, makePreference())).toBe(3);
  });

  it("같은 표준 카테고리면 적합도를 인정한다", () => {
    // Arrange
    const plan = makePlan({
      department: "컴퓨터공학부",
      category: "컴퓨터공학",
    });

    // Act & Assert
    expect(calcDepartmentFit(plan, makePreference())).toBe(2);
  });

  it("무관한 학과는 적합도 0으로 제외한다", () => {
    // Arrange
    const plan = makePlan({
      department: "국어국문학과",
      category: "국어국문학",
    });

    // Act & Assert
    expect(calcDepartmentFit(plan, makePreference())).toBe(0);
  });

  it("계열 단위 희망이면 카테고리로 비교한다", () => {
    // Arrange
    const plan = makePlan({ category: "컴퓨터공학" });
    const preference = makePreference({
      target: "컴퓨터공학",
      targetKind: "field",
    });

    // Act & Assert
    expect(calcDepartmentFit(plan, preference)).toBe(3);
  });
});

describe("analyzeJeongsi", () => {
  beforeEach(() => {
    clearJeongsiDataCache();
    useFixtureData();
  });

  afterEach(() => {
    resetJeongsiDataSource();
  });

  it("성적 진단과 입력을 함께 반환한다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.input.score).toEqual(baseScore);
    expect(analysis.diagnosis.averagePercentile).toBe(93.833);
    expect(analysis.diagnosis.areas).toHaveLength(4);
  });

  describe("여자대학교", () => {
    const womensPlan = makePlan({
      id: "가나여자대학교-컴퓨터공학과-나",
      university: "가나여자대학교",
      region: "서울",
      group: "나",
    });
    const womensCut = cutOf(
      "가나여자대학교-컴퓨터공학과-나",
      "가나여자대학교",
      "나",
      893
    );
    beforeEach(() => {
      clearJeongsiDataCache();
      useFixtureData([...plans, womensPlan], [...results, womensCut]);
    });

    const analysisFor = async (
      gender: JeongsiInput["gender"]
    ): Promise<string[]> => {
      const analysis = await analyzeJeongsi({ ...makeInput(), gender });
      return [
        ...allRecommended(analysis.recommendations),
        ...analysis.sniping,
        ...analysis.combinations.flatMap((combination) =>
          [combination.가, combination.나, combination.다].filter(
            (slot): slot is PlanEvaluation => slot !== null
          )
        ),
      ].map((evaluation) => evaluation.plan.university);
    };

    it("남학생이면 여자대학교를 목록·소신·조합 어디에도 넣지 않는다", async () => {
      // Arrange & Act
      const universities = await analysisFor("male");

      // Assert
      expect(universities).not.toContain("가나여자대학교");
    });

    it("여학생이면 여자대학교도 추천한다", async () => {
      // Arrange & Act
      const universities = await analysisFor("female");

      // Assert
      expect(universities).toContain("가나여자대학교");
    });

    it("성별이 없는 예전 입력은 여자대학교를 빼지 않는다", async () => {
      // Arrange & Act
      const universities = await analysisFor(undefined);

      // Assert
      expect(universities).toContain("가나여자대학교");
    });
  });

  it("입결 대비 위치로 상향·적정·안정을 분류한다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(universitiesOf(analysis.recommendations.상향)).toContain(
      "상향대학교"
    );
    expect(universitiesOf(analysis.recommendations.적정)).toContain(
      "적정대학교"
    );
    expect(universitiesOf(analysis.recommendations.안정)).toContain(
      "안정대학교"
    );
  });

  it("컷이 크게 높은 모집단위는 추천에서 제외한다", async () => {
    // Arrange
    const tooHigh = [
      ...results,
      cutOf("무리대학교-컴퓨터공학과-다", "무리대학교", "다", 950),
    ];
    useFixtureData(
      [
        ...plans,
        makePlan({
          id: "무리대학교-컴퓨터공학과-다",
          university: "무리대학교",
          region: "서울",
          group: "다",
        }),
      ],
      tooHigh
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(
      universitiesOf(allRecommended(analysis.recommendations))
    ).not.toContain("무리대학교");
  });

  it("예전 입력에 희망 지역이 있어도 모든 지역 대학을 본다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput({ region: "서울" }));

    // Assert
    const recommended = universitiesOf(
      allRecommended(analysis.recommendations)
    );
    expect(recommended).toContain("지방대학교");
  });

  it("희망 학과와 무관한 모집단위는 분석 대상에서 빠진다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const everyEvaluation = [
      ...analysis.advantageousPlans,
      ...allRecommended(analysis.recommendations),
    ];
    expect(universitiesOf(everyEvaluation)).not.toContain("타학과대학교");
  });

  it("선택과목 제한에 걸린 대학은 추천·유리도 목록에서 모두 뺀다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const everyEvaluation = [
      ...analysis.advantageousPlans,
      ...allRecommended(analysis.recommendations),
    ];
    expect(universitiesOf(everyEvaluation)).not.toContain("제한대학교");
  });

  it("입결이 없는 모집단위는 컷을 추정하지 않고 후보에서 뺀다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert: 원문에 없는 컷을 다른 학과 컷으로 만들어 분류하지 않는다
    const newUnit = allRecommended(analysis.recommendations).find(
      (evaluation) => evaluation.plan.id === "신설대학교-컴퓨터공학과-나"
    );
    expect(newUnit).toBeUndefined();
  });

  it("입결이 있는 모집단위는 경쟁률과 컷 추이를 채운다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const [withCut] = analysis.recommendations.안정;
    expect(withCut.competitionRate).toBe(4.2);
    expect(withCut.cutHistory).toHaveLength(2);
    expect(withCut.referenceCut?.metric).toBe("convertedScore");
  });

  it("구분별 추천은 3개를 넘지 않고 같은 대학이 중복되지 않는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    (["상향", "적정", "안정"] as const).forEach((tier) => {
      const universities = universitiesOf(analysis.recommendations[tier]);
      expect(universities.length).toBeLessThanOrEqual(3);
      expect(new Set(universities).size).toBe(universities.length);
    });
  });

  it("유리한 대학은 유리도 내림차순이고 지원불가를 담지 않는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const scores = analysis.advantageousPlans.map(
      (evaluation) => evaluation.advantageScore
    );
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    analysis.advantageousPlans.forEach((evaluation) => {
      expect(evaluation.tier).not.toBe("지원불가");
      expect(evaluation.eligible).toBe(true);
    });
  });

  it("유리한 대학은 대학당 한 곳만 싣는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const universities = analysis.advantageousPlans.map(
      (evaluation) => evaluation.plan.university
    );
    expect(new Set(universities).size).toBe(universities.length);
  });

  it("지원 성향에 맞는 가·나·다군 조합을 만든다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput({ risk: "균형" }));

    // Assert
    expect(analysis.combinations.length).toBeGreaterThan(0);
    expect(analysis.combinations.length).toBeLessThanOrEqual(MAX_COMBINATIONS);
    analysis.combinations.forEach((combination) => {
      const slots = [combination.가, combination.나, combination.다].filter(
        (slot): slot is PlanEvaluation => slot !== null
      );
      const universities = slots.map((slot) => slot.plan.university);
      expect(new Set(universities).size).toBe(universities.length);
    });
  });

  it("데이터가 비어 있어도 빈 결과를 돌려준다", async () => {
    // Arrange
    useFixtureData([], []);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.advantageousPlans).toEqual([]);
    expect(analysis.recommendations.적정).toEqual([]);
    expect(analysis.combinations).toEqual([]);
    expect(analysis.diagnosis.areas).toHaveLength(4);
  });

  it("입결이 하나도 없으면 크래시 없이 분석을 끝낸다", async () => {
    // Arrange
    useFixtureData(plans, []);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(
      allRecommended(analysis.recommendations).length
    ).toBeGreaterThanOrEqual(0);
    allRecommended(analysis.recommendations).forEach((evaluation) => {
      expect(evaluation.referenceCut).toBeNull();
    });
  });
});

/** 1단계에서 종료 */
const stopAtStage1 = (): boolean => true;

/** 끝까지 확대 */
const expandAll = (): boolean => false;

describe("collectCandidatePlans - 후보 범위", () => {
  const exact = makePlan({ id: "가-컴퓨터공학과", university: "가대학교" });
  const sameCategory = makePlan({
    id: "나-컴퓨터공학부",
    university: "나대학교",
    department: "컴퓨터공학부",
    category: "컴퓨터공학",
  });
  const fieldGroup = makePlan({
    id: "다-소프트웨어학과",
    university: "다대학교",
    department: "소프트웨어학과",
    category: "소프트웨어공학",
  });
  const partial = makePlan({
    id: "라-컴퓨터공학과융합전공",
    university: "라대학교",
    department: "컴퓨터공학과융합전공",
    category: "융합전공",
  });
  const stop = () => true;
  const keepGoing = () => false;

  it("밴드가 찼으면 희망 학과와 이름이 같거나 같은 분류인 곳만 담는다", () => {
    // Arrange & Act
    const pool = collectCandidatePlans(
      [exact, sameCategory, fieldGroup, partial],
      makePreference(),
      stop
    );

    // Assert
    expect(pool.plans.map(({ plan }) => plan.id)).toEqual([
      "가-컴퓨터공학과",
      "나-컴퓨터공학부",
    ]);
    expect(pool.stage).toBe(1);
  });

  it("밴드가 안 차면 같은 계열로 넓히고, 이름 일부만 겹치는 학과는 담지 않는다", () => {
    // Arrange & Act
    const pool = collectCandidatePlans(
      [exact, fieldGroup, partial],
      makePreference(),
      keepGoing
    );

    // Assert
    expect(pool.plans.map(({ plan }) => plan.id)).toEqual([
      "가-컴퓨터공학과",
      "다-소프트웨어학과",
    ]);
    expect(pool.stage).toBe(2);
    expect(
      pool.plans.find(({ plan }) => plan.id === "다-소프트웨어학과")?.fit
    ).toBeLessThan(
      pool.plans.find(({ plan }) => plan.id === "가-컴퓨터공학과")?.fit ?? 0
    );
  });

  it("의약은 학과마다 따로 봐, 약학 희망에 의예과와 수의예과를 넣지 않는다", () => {
    // Arrange
    const pharmacy = makePlan({
      id: "약대-약학과",
      university: "약대",
      department: "약학과",
      category: "약학",
    });
    const medicine = makePlan({
      id: "의대-의예과",
      university: "의대",
      department: "의예과",
      category: "의학",
    });
    const veterinary = makePlan({
      id: "수의대-수의예과",
      university: "수의대",
      department: "수의예과",
      category: "수의학",
    });

    // Act
    const pool = collectCandidatePlans(
      [pharmacy, medicine, veterinary],
      makePreference({ target: "약학과" }),
      keepGoing
    );

    // Assert
    expect(pool.plans.map(({ plan }) => plan.id)).toEqual(["약대-약학과"]);
    // 넓혀 담은 곳이 없으니 확대 단계(2)로 기록하지 않는다(확대 안내가 나가지 않게)
    expect(pool.stage).toBe(1);
  });

  it("교육 계열이 아닌 희망에는 같은 분류라도 사범계열(○○교육과)을 담지 않는다", () => {
    // Arrange: 컴퓨터교육과는 분류가 컴퓨터공학이다
    const teacher = makePlan({
      id: "마-컴퓨터교육과",
      university: "마대학교",
      department: "컴퓨터교육과",
      category: "컴퓨터공학",
    });

    // Act
    const pool = collectCandidatePlans(
      [exact, teacher],
      makePreference(),
      stop
    );

    // Assert
    expect(pool.plans.map(({ plan }) => plan.id)).toEqual(["가-컴퓨터공학과"]);
  });

  it("희망 지역 없이 모든 지역의 모집단위를 본다", () => {
    // Arrange
    const local = {
      ...exact,
      id: "지방-컴퓨터공학과",
      region: "지방" as const,
    };

    // Act
    const pool = collectCandidatePlans(
      [exact, local],
      makePreference({ region: "서울" }),
      stop
    );

    // Assert
    expect(pool.plans.map(({ plan }) => plan.id)).toContain(
      "지방-컴퓨터공학과"
    );
  });
});

describe("analyzeJeongsi - 빈 밴드 처리", () => {
  afterEach(() => {
    resetJeongsiDataSource();
  });

  /**
   * 안정 4개(컷 866~878) 만 있는 상황.
   * 안정 버킷이 3개를 채우고 남은 1개가 적정으로 끌려온다.
   * (이미 다른 밴드에 선정된 모집단위는 끌어오지 않는다)
   */
  const stableOverflow = (): {
    plans: JeongsiAdmissionPlan[];
    results: JeongsiResultEntry[];
  } => {
    const cuts = [875, 876, 877, 878, 879];
    return {
      plans: cuts.map((cut) =>
        makePlan({
          id: `안정${cut}대학교-컴퓨터공학과-가`,
          university: `안정${cut}대학교`,
          region: "서울",
          group: "가",
        })
      ),
      results: cuts.map((cut) =>
        cutOf(`안정${cut}대학교-컴퓨터공학과-가`, `안정${cut}대학교`, "가", cut)
      ),
    };
  };

  it("적정이 비면 다른 밴드에 남은 모집단위를 끌어와 채운다", async () => {
    // Arrange
    const { plans: overflowPlans, results: overflowResults } = stableOverflow();
    useFixtureData(overflowPlans, overflowResults);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    // 안정은 안정 하한에 가까운(격차가 작은) 네 곳을 담고, 남은 한 곳을 적정 칸에 끌어온다
    expect(analysis.recommendations.안정).toHaveLength(4);
    expect(analysis.recommendations.적정).toHaveLength(1);
    const [substituted] = analysis.recommendations.적정;
    expect(substituted.plan.university).toBe("안정875대학교");
    // 끌어온 항목의 tier 는 덮어쓰지 않는다 (거짓 정보가 되므로)
    expect(substituted.tier).toBe("안정");
  });

  it("같은 모집단위가 두 밴드에 동시에 들어가지 않는다", async () => {
    // Arrange
    const { plans: overflowPlans, results: overflowResults } = stableOverflow();
    useFixtureData(overflowPlans, overflowResults);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const ids = allRecommended(analysis.recommendations).map(
      (evaluation) => evaluation.plan.id
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("끌어올 후보가 모두 다른 밴드에 이미 있으면 적정을 비운다", async () => {
    // Arrange
    // 안정 1개뿐 → 안정 버킷에 이미 노출되므로 중복 제시하지 않는다
    useFixtureData(
      [
        makePlan({
          id: "안정하나대학교-컴퓨터공학과-가",
          university: "안정하나대학교",
          region: "서울",
          group: "가",
        }),
      ],
      [cutOf("안정하나대학교-컴퓨터공학과-가", "안정하나대학교", "가", 870)]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.recommendations.안정).toHaveLength(1);
    expect(analysis.recommendations.적정).toEqual([]);
    // 대체가 실제로 일어나지 않았으므로 false.
    // 리포트 문구가 "가장 가까운 곳을 담았습니다"(대체 발생)와
    // "적정으로 분류되는 곳이 없습니다"(빈 상태)를 구분하는 근거다.
    expect(analysis.selection.moderateBandSubstituted).toBe(false);
  });

  it("적정 구간에서 1.0 넘게 떨어진 항목은 끌어오지 않는다", async () => {
    // Arrange
    // 컷 862 → 격차 3.71, 적정 구간 상한(+1.5)에서 2.21 떨어져 대체 거리 초과
    const farOnly = [
      makePlan({
        id: "아주안정대학교-컴퓨터공학과-가",
        university: "아주안정대학교",
        region: "서울",
        group: "가",
      }),
    ];
    useFixtureData(farOnly, [
      cutOf("아주안정대학교-컴퓨터공학과-가", "아주안정대학교", "가", 862),
    ]);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.recommendations.적정).toEqual([]);
    expect(analysis.recommendations.안정.length).toBeGreaterThan(0);
  });

  it("상향이 비면 빈 배열 그대로 둔다", async () => {
    // Arrange
    // 안정 하나만 있는 상황 — 상향을 억지로 만들지 않는다
    const onlySafe = [
      makePlan({
        id: "안정만대학교-컴퓨터공학과-가",
        university: "안정만대학교",
        region: "서울",
        group: "가",
      }),
    ];
    useFixtureData(onlySafe, [
      cutOf("안정만대학교-컴퓨터공학과-가", "안정만대학교", "가", 860),
    ]);

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.recommendations.상향).toEqual([]);
    expect(analysis.recommendations.안정.length).toBeGreaterThan(0);
  });
});

describe("countFilledBands", () => {
  it("밴드별로 서로 다른 대학 수를 센다", () => {
    // Arrange
    // 같은 대학이 여러 모집단위로 들어와도 추천은 한 번만 담으므로
    // 대학 수로 세야 실제 채움 가능성과 일치한다.
    const classifications = [
      classifyForStudent(
        baseScore,
        makePlan({ id: "A-컴퓨터공학과-가", university: "A대학교" }),
        twoYears(cutOf("A-컴퓨터공학과-가", "A대학교", "가", 870))
      ),
      classifyForStudent(
        baseScore,
        makePlan({
          id: "A-컴퓨터공학부-나",
          university: "A대학교",
          group: "나",
        }),
        twoYears(cutOf("A-컴퓨터공학부-나", "A대학교", "나", 870))
      ),
      classifyForStudent(
        baseScore,
        makePlan({
          id: "B-컴퓨터공학과-다",
          university: "B대학교",
          group: "다",
        }),
        twoYears(cutOf("B-컴퓨터공학과-다", "B대학교", "다", 870))
      ),
    ];

    // Act
    const counts = countFilledBands(classifications);

    // Assert
    expect(counts.안정).toBe(2);
  });

  it("부적격·지원불가는 세지 않는다", () => {
    // Arrange
    const classifications = [
      classifyForStudent(
        baseScore,
        makePlan({
          id: "제한-컴퓨터공학과-가",
          university: "제한대학교",
          restrictions: { math: ["확률과통계"] },
        }),
        [cutOf("제한-컴퓨터공학과-가", "제한대학교", "가", 870)]
      ),
      classifyForStudent(
        baseScore,
        makePlan({
          id: "불가-컴퓨터공학과-나",
          university: "불가대학교",
          group: "나",
        }),
        [cutOf("불가-컴퓨터공학과-나", "불가대학교", "나", 950)]
      ),
    ];

    // Act
    const counts = countFilledBands(classifications);

    // Assert
    expect(counts).toEqual({ 상향: 0, 적정: 0, 안정: 0 });
  });
});

describe("analyzeJeongsi - 희망 계열 전멸 (선택과목 제한)", () => {
  afterEach(() => {
    resetJeongsiDataSource();
  });

  /** 확률과통계 + 사회탐구 응시자 */
  const socialTrackInput = (): JeongsiInput => ({
    score: {
      ...baseScore,
      math: { elective: "확률과통계", standardScore: 128, percentile: 88 },
      inquiry1: { subject: "생활과윤리", standardScore: 68, percentile: 93 },
      inquiry2: { subject: "사회문화", standardScore: 65, percentile: 89 },
    },
    preference: makePreference({ target: "의예과", targetKind: "department" }),
  });

  it("희망 계열이 전부 제한에 걸리면 다른 계열로 대체하지 않는다", async () => {
    // Arrange
    // 의약 모집단위는 전부 과탐·미적 제한 → 사탐·확통 응시자는 0개.
    // 간호·생명과학이 있어도 대체 추천하지 않는다.
    const plansWithMedical = [
      makePlan({
        id: "의대-의예과-가",
        university: "의대",
        department: "의예과",
        category: "의학",
        region: "서울",
        restrictions: { math: ["미적분", "기하"], inquiry: "과탐필수" },
      }),
      makePlan({
        id: "간호대-간호학과-나",
        university: "간호대",
        department: "간호학과",
        category: "간호학",
        region: "서울",
        group: "나",
      }),
    ];
    useFixtureData(plansWithMedical, [
      cutOf("의대-의예과-가", "의대", "가", 870),
      cutOf("간호대-간호학과-나", "간호대", "나", 870),
    ]);

    // Act
    const analysis = await analyzeJeongsi(socialTrackInput());

    // Assert
    expect(analysis.recommendations.상향).toEqual([]);
    expect(analysis.recommendations.적정).toEqual([]);
    expect(analysis.recommendations.안정).toEqual([]);
    expect(analysis.combinations).toEqual([]);
    expect(analysis.advantageousPlans).toEqual([]);
    // 진단은 그대로 제공한다 — 성적 분석 자체는 유효하다
    expect(analysis.diagnosis.areas).toHaveLength(4);
    // 왜 비었는지 설명할 근거를 함께 싣는다
    expect(analysis.selection.blockedByRestrictions).toBe(true);
    expect(
      analysis.ineligiblePlans.map((evaluation) => evaluation.plan.university)
    ).toContain("의대");
    expect(analysis.ineligiblePlans[0].ineligibleReason).toContain("수학");
  });

  it("희망 학과와 같은 분류에 지원 가능한 모집단위가 하나라도 있으면 정상 분석한다", async () => {
    // Arrange
    const plansWithOpenMedical = [
      makePlan({
        id: "의대-의예과-가",
        university: "의대",
        department: "의예과",
        category: "의학",
        region: "서울",
        restrictions: { math: ["미적분", "기하"], inquiry: "과탐필수" },
      }),
      // 같은 분류(의학)인데 선택과목 제한이 없는 모집단위
      makePlan({
        id: "열린의대-의예과-나",
        university: "열린의대",
        department: "의예과",
        category: "의학",
        region: "서울",
        group: "나",
      }),
    ];
    useFixtureData(plansWithOpenMedical, [
      cutOf("의대-의예과-가", "의대", "가", 870),
      cutOf("열린의대-의예과-나", "열린의대", "나", 870),
    ]);

    // Act
    const analysis = await analyzeJeongsi(socialTrackInput());

    // Assert
    const recommended = universitiesOf(
      allRecommended(analysis.recommendations)
    );
    expect(recommended).toContain("열린의대");
    expect(recommended).not.toContain("의대");
  });
});

describe("analyzeJeongsi - 전멸 판정 범위 경계", () => {
  afterEach(() => {
    resetJeongsiDataSource();
  });

  /** 확률과통계 + 사회탐구 응시자 */
  const socialTrack = (target: string): JeongsiInput => ({
    score: {
      ...baseScore,
      math: { elective: "확률과통계", standardScore: 128, percentile: 88 },
      inquiry1: { subject: "생활과윤리", standardScore: 68, percentile: 93 },
      inquiry2: { subject: "사회문화", standardScore: 65, percentile: 89 },
    },
    preference: makePreference({ target, targetKind: "department" }),
  });

  it("희망 학과가 모두 막히면 같은 계열그룹 학과로 대신 추천하지 않고 지원 불가로 안내한다", async () => {
    // Arrange
    // 의예과만 과탐 필수, 수의예과는 제한 없음. 후보는 희망 학과와 같은 분류까지라
    // (사용자 결정 2026-11-15) 수의예과는 후보가 아니다 → 희망 학과 전멸.
    useFixtureData(
      [
        makePlan({
          id: "의대-의예과-가",
          university: "의대",
          department: "의예과",
          category: "의학",
          region: "서울",
          restrictions: { inquiry: "과탐필수" },
        }),
        makePlan({
          id: "수의대-수의예과-나",
          university: "수의대",
          department: "수의예과",
          category: "수의학",
          region: "서울",
          group: "나",
        }),
      ],
      [
        // 사탐·확통 학생의 환산점수는 866.5 → 컷 860 이면 적정권
        cutOf("의대-의예과-가", "의대", "가", 860),
        cutOf("수의대-수의예과-나", "수의대", "나", 860),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(socialTrack("의예과"));

    // Assert
    const recommended = universitiesOf(
      allRecommended(analysis.recommendations)
    );
    expect(recommended).not.toContain("수의대");
    expect(recommended).not.toContain("의대");
    expect(analysis.selection.blockedByRestrictions).toBe(true);
  });

  it("계열그룹까지 전멸이면 대계열에 지원처가 있어도 비운다", async () => {
    // Arrange
    // 컴퓨터IT 그룹 전부 과탐 필수, 기계공학(대계열 확대분)은 제한 없음.
    // Stage 3 지원처를 끌어오는 것은 "다른 계열로 대체" 이므로 금지.
    useFixtureData(
      [
        makePlan({
          id: "컴공대-컴퓨터공학과-가",
          university: "컴공대",
          region: "서울",
          restrictions: { inquiry: "과탐필수" },
        }),
        makePlan({
          id: "AI대-인공지능학과-나",
          university: "AI대",
          department: "인공지능학과",
          category: "인공지능",
          region: "서울",
          group: "나",
          restrictions: { inquiry: "과탐필수" },
        }),
        makePlan({
          id: "기계대-기계공학과-다",
          university: "기계대",
          department: "기계공학과",
          category: "기계공학",
          region: "서울",
          group: "다",
        }),
      ],
      [
        cutOf("컴공대-컴퓨터공학과-가", "컴공대", "가", 893),
        cutOf("AI대-인공지능학과-나", "AI대", "나", 893),
        cutOf("기계대-기계공학과-다", "기계대", "다", 893),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(socialTrack("컴퓨터공학과"));

    // Assert
    expect(allRecommended(analysis.recommendations)).toEqual([]);
    expect(analysis.combinations).toEqual([]);
    expect(analysis.advantageousPlans).toEqual([]);
  });
});

describe("analyzeJeongsi - selection 메타정보", () => {
  beforeEach(() => {
    clearJeongsiDataCache();
    useFixtureData();
  });

  afterEach(() => {
    resetJeongsiDataSource();
  });

  it("후보 풀을 넓힌 단계를 보고한다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect([1, 2, 3]).toContain(analysis.selection.poolStage);
    expect(analysis.selection.blockedByRestrictions).toBe(false);
  });

  it("적정 밴드를 대체했으면 표시한다", async () => {
    // Arrange
    // 안정 5개 → 4개는 안정 버킷, 남은 1개가 적정으로 대체 투입
    const cuts = [875, 876, 877, 878, 879];
    useFixtureData(
      cuts.map((cut) =>
        makePlan({
          id: `안정${cut}대학교-컴퓨터공학과-가`,
          university: `안정${cut}대학교`,
          region: "서울",
          group: "가",
        })
      ),
      cuts.map((cut) =>
        cutOf(`안정${cut}대학교-컴퓨터공학과-가`, `안정${cut}대학교`, "가", cut)
      )
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.selection.moderateBandSubstituted).toBe(true);
  });

  it("정상적으로 적정이 찼으면 대체 표시를 하지 않는다", async () => {
    // Arrange
    useFixtureData(
      [
        makePlan({
          id: "적정대학교-컴퓨터공학과-가",
          university: "적정대학교",
          region: "서울",
          group: "가",
        }),
      ],
      [cutOf("적정대학교-컴퓨터공학과-가", "적정대학교", "가", 893)]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.recommendations.적정).toHaveLength(1);
    expect(analysis.selection.moderateBandSubstituted).toBe(false);
  });

  it("제한에 걸린 모집단위를 사유와 함께 싣는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const restricted = analysis.ineligiblePlans.find(
      (evaluation) => evaluation.plan.university === "제한대학교"
    );
    expect(restricted).toBeDefined();
    expect(restricted?.eligible).toBe(false);
    expect(restricted?.ineligibleReason).toContain("확률과통계");
    // 지원 불가이므로 유리도는 0 이다
    expect(restricted?.advantageScore).toBe(0);
  });

  it("판정 근거(격차·입결 학년도·민감도)를 평가에 싣는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const [stable] = analysis.recommendations.안정;
    expect(stable.gapRatio).not.toBeNull();
    expect(stable.gapPoints).not.toBeNull();
    expect(stable.resultYears).toEqual([2025, 2026]);
    expect(stable.withinRecommendRange).toBe(true);
    // 표준점수 환산식은 백분위 1점의 표준점수 변화가 원문에 없어 민감도가 없다
    expect(stable.sensitivity).toBeNull();
    expect(stable.simpleAveragePercentile).toBe(93.833);
  });

  it("입결이 없는 모집단위만 있으면 추천이 비어 있다", async () => {
    // Arrange
    useFixtureData(
      [
        makePlan({
          id: "신설단독대학교-컴퓨터공학과-가",
          university: "신설단독대학교",
          region: "서울",
          group: "가",
        }),
      ],
      []
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(allRecommended(analysis.recommendations)).toEqual([]);
  });
});

describe("analyzeJeongsi - 소신", () => {
  afterEach(() => {
    resetJeongsiDataSource();
    clearJeongsiDataCache();
  });

  // 환산점수 컷 909.2 → 격차 (899.167 − 909.2)/10 = −1.0 (스나이핑 구간)
  const snipingPlan = (
    id: string,
    university: string,
    group: "가" | "나" | "다"
  ) => makePlan({ id, university, region: "서울", group });
  const convertedCut = (
    planKey: string,
    university: string,
    group: "가" | "나" | "다",
    value: number
  ): JeongsiResultEntry =>
    makeResult({
      planKey,
      university,
      group,
      cut70: { metric: "convertedScore", value },
    });

  it("추천 범위 바로 아래 환산점수 입결 모집단위를 소신으로 고르고 추천 목록에는 넣지 않는다", async () => {
    // Arrange
    useFixtureData(
      [...plans, snipingPlan("스나대학교-컴퓨터공학과-가", "스나대학교", "가")],
      [
        ...results,
        convertedCut("스나대학교-컴퓨터공학과-가", "스나대학교", "가", 909.2),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(universitiesOf(analysis.sniping)).toEqual(["스나대학교"]);
    const [picked] = analysis.sniping;
    expect(picked.tier).toBe("소신");
    expect(picked.chance).toBe("매우낮음");
    expect(picked.historicalPassRate).not.toBeNull();
    expect(
      universitiesOf(allRecommended(analysis.recommendations))
    ).not.toContain("스나대학교");
  });

  it("평균 백분위 입결만 있는 모집단위는 추천과 소신 어디에도 넣지 않는다 (모든 추천은 환산점수 기준)", async () => {
    // Arrange: 적정 구간 격차의 백분위 입결만 있는 모집단위
    const percentilePlan = snipingPlan(
      "백분위대학교-컴퓨터공학과-나",
      "백분위대학교",
      "나"
    );
    useFixtureData(
      [...plans, percentilePlan],
      [
        ...results,
        makeResult({
          planKey: percentilePlan.id,
          university: "백분위대학교",
          group: "나",
          cut70: { metric: "percentile", value: toPercentileCut(893) },
        }),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const shown = [
      ...allRecommended(analysis.recommendations),
      ...analysis.sniping,
    ];
    expect(universitiesOf(shown)).not.toContain("백분위대학교");
    expect(
      shown.every(
        (evaluation) => evaluation.referenceCut?.metric === "convertedScore"
      )
    ).toBe(true);
  });

  it("전년 경쟁률이 크게 오르고 충원이 많았던 곳을 먼저 소신으로 고른다 (실측 신호 순서)", async () => {
    // Arrange: 격차와 적합도가 같은 세 곳. 신호가 없으면 id 순서로 "가무신호"가 뽑힌다
    const withCompetitions = (
      id: string,
      university: string,
      recentCompetitions: JeongsiAdmissionPlan["recentCompetitions"]
    ) => ({ ...snipingPlan(id, university, "가"), recentCompetitions });
    const signalPlans = [
      withCompetitions("가무신호대학교-컴퓨터공학과-가", "가무신호대학교", [
        { year: 2025, competitionRate: 5, additionalPassRate: 150 },
        { year: 2026, competitionRate: 5, additionalPassRate: 150 },
      ]),
      withCompetitions("나급등대학교-컴퓨터공학과-가", "나급등대학교", [
        { year: 2025, competitionRate: 4, additionalPassRate: 50 },
        { year: 2026, competitionRate: 6, additionalPassRate: 50 },
      ]),
      withCompetitions("다충원대학교-컴퓨터공학과-가", "다충원대학교", [
        { year: 2025, competitionRate: 4, additionalPassRate: 120 },
        { year: 2026, competitionRate: 6, additionalPassRate: 120 },
      ]),
    ];
    useFixtureData(
      [...plans, ...signalPlans],
      [
        ...results,
        ...signalPlans.map((plan) =>
          convertedCut(plan.id, plan.university, "가", 909.2)
        ),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const picked = universitiesOf(analysis.sniping);
    expect(picked).toHaveLength(2);
    expect(picked).toEqual(
      expect.arrayContaining(["다충원대학교", "나급등대학교"])
    );
    expect(picked).not.toContain("가무신호대학교");
    const rankOf = (university: string) =>
      snipingSignalRank(
        analysis.sniping.find(
          (evaluation) => evaluation.plan.university === university
        ) as PlanEvaluation
      );
    expect(rankOf("다충원대학교")).toBe(1);
    expect(rankOf("나급등대학교")).toBe(2);
  });

  it("희망 학과와 같은 분류가 아닌 모집단위는 소신으로 고르지 않는다", async () => {
    // Arrange
    // 학과명에 희망 학과가 들어 있을 뿐 분류가 다른 곳(적합도 FIT_PARTIAL)
    const partialPlan = makePlan({
      id: "부분대학교-컴퓨터공학과융합전공-가",
      university: "부분대학교",
      department: "컴퓨터공학과융합전공",
      category: "융합전공",
      region: "서울",
      group: "가",
    });
    useFixtureData(
      [...plans, partialPlan],
      [
        ...results,
        convertedCut(
          "부분대학교-컴퓨터공학과융합전공-가",
          "부분대학교",
          "가",
          909.2
        ),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(universitiesOf(analysis.sniping)).not.toContain("부분대학교");
  });

  it("백분위 입결이나 과거 모집군이 다른 곳은 소신으로 고르지 않는다", async () => {
    // Arrange
    const percentileCut = makeResult({
      planKey: "백분위대학교-컴퓨터공학과-가",
      university: "백분위대학교",
      group: "가",
      cut70: { metric: "percentile", value: 94.8 },
    });
    useFixtureData(
      [
        ...plans,
        snipingPlan("백분위대학교-컴퓨터공학과-가", "백분위대학교", "가"),
        snipingPlan("군변경대학교-컴퓨터공학과-가", "군변경대학교", "가"),
      ],
      [
        ...results,
        percentileCut,
        { ...percentileCut, admissionYear: 2025 },
        convertedCut(
          "군변경대학교-컴퓨터공학과-가",
          "군변경대학교",
          "다",
          909.2
        ),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    expect(analysis.sniping).toEqual([]);
  });

  it("공격 성향이면 소신을 넣은 조합을 하나 더 보인다", async () => {
    // Arrange
    useFixtureData(
      [...plans, snipingPlan("스나대학교-컴퓨터공학과-가", "스나대학교", "가")],
      [
        ...results,
        convertedCut("스나대학교-컴퓨터공학과-가", "스나대학교", "가", 909.2),
      ]
    );

    // Act
    const analysis = await analyzeJeongsi(makeInput({ risk: "공격" }));

    // Assert
    const withSniping = analysis.combinations.filter((combination) =>
      (["가", "나", "다"] as const).some(
        (group) => combination[group]?.tier === "소신"
      )
    );
    expect(withSniping).toHaveLength(1);
    expect(withSniping[0].recommended).toBe(false);
  });
});
