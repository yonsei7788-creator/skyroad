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
  matchesRegion,
} from "../analyze";
import { MAX_COMBINATIONS } from "../combination";
import { baseScore, makePlan, makePreference, makeResult } from "./fixtures";

import type {
  JeongsiAdmissionPlan,
  JeongsiInput,
  JeongsiResultEntry,
  PlanEvaluation,
} from "../../types";

// 기준 학생(baseScore)의 국·수·탐 평균 백분위 93.833, σ 하한(모집인원 30명) = 1.0
// 표준점수 환산식은 민감도를 원문만으로 구할 수 없어(환산점수 입결 비교 불가)
// 입결은 백분위 컷으로 둔다. 아래 "기준 점수"는 예전 환산점수 표기를 그대로
// 쓰고, 같은 격차의 백분위 컷으로 바꾼다(환산 899.167, 1 백분위점 = 10.01점).
//   870 → +2.91 백분위점 → 안정
//   893 → +0.62 백분위점 → 적정
//   908 → -0.88 백분위점 → 상향
//   950 → -5.08 백분위점 → 지원불가
const STUDENT_PERCENTILE = 93.833;
const toPercentileCut = (points: number): number =>
  Math.round((STUDENT_PERCENTILE - (899.167 - points) / 10.01) * 1000) / 1000;
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
    cut70: { metric: "percentile", value: toPercentileCut(value) },
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

const useFixtureData = (
  planData: JeongsiAdmissionPlan[] = plans,
  resultData: JeongsiResultEntry[] = results
): void => {
  setJeongsiDataSource({
    readAdmissionPlans: async () => planData,
    readAdmissionResults: async () => resultData,
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

describe("matchesRegion", () => {
  it("희망 지역이 서울이면 서울만 통과한다", () => {
    // Arrange & Act & Assert
    expect(matchesRegion("서울", "서울")).toBe(true);
    expect(matchesRegion("수도권", "서울")).toBe(false);
  });

  it("희망 지역이 수도권이면 서울과 수도권이 통과한다", () => {
    // Arrange & Act & Assert
    expect(matchesRegion("서울", "수도권")).toBe(true);
    expect(matchesRegion("수도권", "수도권")).toBe(true);
    expect(matchesRegion("지방", "수도권")).toBe(false);
  });

  it("희망 지역이 전국이면 모두 통과한다", () => {
    // Arrange & Act & Assert
    expect(matchesRegion("지방", "전국")).toBe(true);
  });
});

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

  it("희망 지역이 서울이면 지방·수도권 대학을 제외한다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput({ region: "서울" }));

    // Assert
    const recommended = universitiesOf(
      allRecommended(analysis.recommendations)
    );
    expect(recommended).not.toContain("지방대학교");
    expect(recommended).not.toContain("안정대학교");
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
    expect(withCut.cutHistory).toHaveLength(3);
    expect(withCut.referenceCut?.metric).toBe("percentile");
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

describe("collectCandidatePlans - 후보 풀 단계 확대", () => {
  it("밴드가 찼으면(1단계 종료) 확대하지 않는다", () => {
    // Arrange
    const target = makePlan({
      id: "목표대학교-컴퓨터공학과-가",
      university: "목표대학교",
      region: "서울",
    });
    const otherField = makePlan({
      id: "기계대학교-기계공학과-가",
      university: "기계대학교",
      department: "기계공학과",
      category: "기계공학",
      region: "서울",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, otherField],
      makePreference(),
      stopAtStage1
    );

    // Assert
    expect(pool.plans.map((entry) => entry.plan.university)).toEqual([
      "목표대학교",
    ]);
    expect(pool.stage).toBe(1);
  });

  it("후보가 부족하면 같은 계열그룹까지 넓힌다", () => {
    // Arrange
    const target = makePlan({
      id: "목표대학교-컴퓨터공학과-가",
      university: "목표대학교",
      region: "서울",
    });
    const sameGroup = makePlan({
      id: "AI대학교-인공지능학과-나",
      university: "AI대학교",
      department: "인공지능학과",
      category: "인공지능",
      region: "서울",
      group: "나",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, sameGroup],
      makePreference(),
      expandAll
    );

    // Assert
    expect(pool.plans.map((entry) => entry.plan.university)).toEqual([
      "목표대학교",
      "AI대학교",
    ]);
    // 확대된 후보는 적합도가 낮아 희망 학과보다 아래로 정렬된다
    expect(pool.plans[0].fit).toBeGreaterThan(pool.plans[1].fit);
    expect(pool.stage).toBe(2);
  });

  it("그래도 부족해도 계열그룹 밖의 같은 대계열 학과는 넣지 않는다", () => {
    // 대계열 확대(3단계)는 없앴다: 전자공학 희망 학생에게 식품영양학과·수학과가
    // 적정 추천으로 나갔다(2026-11-08 실측).
    // Arrange
    const target = makePlan({
      id: "목표대학교-컴퓨터공학과-가",
      university: "목표대학교",
      region: "서울",
    });
    const sameBroadField = makePlan({
      id: "기계대학교-기계공학과-나",
      university: "기계대학교",
      department: "기계공학과",
      category: "기계공학",
      region: "서울",
      group: "나",
    });
    const otherBroadField = makePlan({
      id: "인문대학교-철학과-다",
      university: "인문대학교",
      department: "철학과",
      category: "철학",
      region: "서울",
      group: "다",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, sameBroadField, otherBroadField],
      makePreference(),
      expandAll
    );

    // Assert
    const universities = pool.plans.map((entry) => entry.plan.university);
    expect(universities).not.toContain("기계대학교");
    expect(universities).not.toContain("인문대학교");
    expect(pool.stage).toBe(2);
  });

  it("의약 지망생에게 간호·생명 모집단위를 섞지 않는다", () => {
    // Arrange
    const medical = makePlan({
      id: "의대-의예과-가",
      university: "의대",
      department: "의예과",
      category: "의학",
      region: "서울",
    });
    const pharmacy = makePlan({
      id: "약대-약학과-나",
      university: "약대",
      department: "약학과",
      category: "약학",
      region: "서울",
      group: "나",
    });
    const nursing = makePlan({
      id: "간호대-간호학과-다",
      university: "간호대",
      department: "간호학과",
      category: "간호학",
      region: "서울",
      group: "다",
    });
    const nonMedical = makePlan({
      id: "생명대-생명과학과-다",
      university: "생명대",
      department: "생명과학과",
      category: "생명과학",
      region: "서울",
      group: "다",
    });

    // Act
    const pool = collectCandidatePlans(
      [medical, pharmacy, nursing, nonMedical],
      makePreference({ target: "의예과", targetKind: "department" }),
      expandAll
    );

    // Assert
    const universities = pool.plans.map((entry) => entry.plan.university);
    expect(universities).toContain("의대");
    // 치·한·수의·약은 의대 지망생의 실제 하향 선택지다
    expect(universities).toContain("약대");
    // 간호는 컷이 7 백분위점 아래라 별도 트랙이다
    expect(universities).not.toContain("간호대");
    expect(universities).not.toContain("생명대");
  });

  it("비의약 지망생에게 의약 모집단위를 섞지 않는다", () => {
    // Arrange
    const target = makePlan({
      id: "생명대-생명과학과-가",
      university: "생명대",
      department: "생명과학과",
      category: "생명과학",
      region: "서울",
    });
    const medical = makePlan({
      id: "의대-의예과-나",
      university: "의대",
      department: "의예과",
      category: "의학",
      region: "서울",
      group: "나",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, medical],
      makePreference({ target: "생명과학과", targetKind: "department" }),
      expandAll
    );

    // Assert
    expect(pool.plans.map((entry) => entry.plan.university)).toEqual([
      "생명대",
    ]);
  });

  it("계열그룹까지만 넓히고 같은 대계열의 다른 그룹은 넣지 않는다", () => {
    // Arrange
    const target = makePlan({
      id: "목표대학교-컴퓨터공학과-가",
      university: "목표대학교",
      region: "서울",
    });
    const sameGroup = makePlan({
      id: "AI대학교-인공지능학과-나",
      university: "AI대학교",
      department: "인공지능학과",
      category: "인공지능",
      region: "서울",
      group: "나",
    });
    const sameBroadField = makePlan({
      id: "기계대학교-기계공학과-다",
      university: "기계대학교",
      department: "기계공학과",
      category: "기계공학",
      region: "서울",
      group: "다",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, sameGroup, sameBroadField],
      makePreference(),
      () => false
    );

    // Assert
    const universities = pool.plans.map((entry) => entry.plan.university);
    expect(universities).toContain("AI대학교");
    expect(universities).not.toContain("기계대학교");
  });

  it("보건 지망생은 대계열까지 넓히지 않는다", () => {
    // Arrange
    // 간호 지망생 상향에 전자공학과가 들어오는 것을 막는다.
    // Stage 2(보건 + 화학·생명)까지만 본다.
    const nursing = makePlan({
      id: "간호대-간호학과-가",
      university: "간호대",
      department: "간호학과",
      category: "간호학",
      region: "서울",
    });
    const companion = makePlan({
      id: "화학대-화학공학과-나",
      university: "화학대",
      department: "화학공학과",
      category: "화학공학",
      region: "서울",
      group: "나",
    });
    const unrelated = makePlan({
      id: "전자대-전자공학과-다",
      university: "전자대",
      department: "전자공학과",
      category: "전자공학",
      region: "서울",
      group: "다",
    });

    // Act
    const pool = collectCandidatePlans(
      [nursing, companion, unrelated],
      makePreference({ target: "간호학과", targetKind: "department" }),
      expandAll
    );

    // Assert
    const universities = pool.plans.map((entry) => entry.plan.university);
    expect(universities).toContain("간호대");
    // 화학·생명은 companion 이라 Stage 2 에서 허용된다
    expect(universities).toContain("화학대");
    expect(universities).not.toContain("전자대");
    // 면허 트랙이라 3단계로 가지 않는다
    expect(pool.stage).toBe(2);
  });

  it("교육학 지망생은 사범(교육) 계열 안에서만 넓힌다", () => {
    // Arrange
    const education = makePlan({
      id: "교육대-교육학과-가",
      university: "교육대",
      department: "교육학과",
      category: "교육학",
      region: "서울",
    });
    const sameGroup = makePlan({
      id: "사범대-국어교육과-나",
      university: "사범대",
      department: "국어교육과",
      category: "국어교육",
      region: "서울",
      group: "나",
    });
    // 교원자격 트랙이라 같은 인문 대계열의 어문 계열도 섞지 않는다
    const humanities = makePlan({
      id: "국문대-국어국문학과-나",
      university: "국문대",
      department: "국어국문학과",
      category: "국어국문학",
      region: "서울",
      group: "나",
    });
    const otherBroadField = makePlan({
      id: "경영대-경영학과-다",
      university: "경영대",
      department: "경영학과",
      category: "경영학",
      region: "서울",
      group: "다",
    });

    // Act
    const pool = collectCandidatePlans(
      [education, sameGroup, humanities, otherBroadField],
      makePreference({ target: "교육학과", targetKind: "department" }),
      expandAll
    );

    // Assert
    const universities = pool.plans.map((entry) => entry.plan.university);
    expect(universities).toContain("사범대");
    expect(universities).not.toContain("국문대");
    // 경상은 같은 인문 대계열이지만 Stage 3 이므로 제외된다
    expect(universities).not.toContain("경영대");
  });

  it("희망 지역을 벗어난 모집단위는 확대 대상에서도 빠진다", () => {
    // Arrange
    const target = makePlan({
      id: "목표대학교-컴퓨터공학과-가",
      university: "목표대학교",
      region: "서울",
    });
    const localSameGroup = makePlan({
      id: "지방AI대학교-인공지능학과-나",
      university: "지방AI대학교",
      department: "인공지능학과",
      category: "인공지능",
      region: "지방",
      group: "나",
    });

    // Act
    const pool = collectCandidatePlans(
      [target, localSameGroup],
      makePreference({ region: "서울" }),
      expandAll
    );

    // Assert
    expect(pool.plans.map((entry) => entry.plan.university)).toEqual([
      "목표대학교",
    ]);
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
    const cuts = [866, 870, 874, 878];
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
    expect(analysis.recommendations.안정).toHaveLength(3);
    expect(analysis.recommendations.적정).toHaveLength(1);
    const [substituted] = analysis.recommendations.적정;
    // 적정 밴드 경계에 가장 가까운(컷이 가장 높은) 곳이 끌려온다
    expect(substituted.plan.university).toBe("안정878대학교");
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

  it("밴드에서 1.5σ 넘게 떨어진 항목은 끌어오지 않는다", async () => {
    // Arrange
    // 컷 855 → 격차 4.4σ, 적정 상한(2.0σ)에서 2.4σ 떨어져 상한 초과
    const farOnly = [
      makePlan({
        id: "아주안정대학교-컴퓨터공학과-가",
        university: "아주안정대학교",
        region: "서울",
        group: "가",
      }),
    ];
    useFixtureData(farOnly, [
      cutOf("아주안정대학교-컴퓨터공학과-가", "아주안정대학교", "가", 855),
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
        [cutOf("A-컴퓨터공학과-가", "A대학교", "가", 870)]
      ),
      classifyForStudent(
        baseScore,
        makePlan({
          id: "A-컴퓨터공학부-나",
          university: "A대학교",
          group: "나",
        }),
        [cutOf("A-컴퓨터공학부-나", "A대학교", "나", 870)]
      ),
      classifyForStudent(
        baseScore,
        makePlan({
          id: "B-컴퓨터공학과-다",
          university: "B대학교",
          group: "다",
        }),
        [cutOf("B-컴퓨터공학과-다", "B대학교", "다", 870)]
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

  it("희망 계열에 지원 가능한 모집단위가 하나라도 있으면 정상 분석한다", async () => {
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
      makePlan({
        id: "약대-약학과-나",
        university: "약대",
        department: "약학과",
        category: "약학",
        region: "서울",
        group: "나",
      }),
    ];
    useFixtureData(plansWithOpenMedical, [
      cutOf("의대-의예과-가", "의대", "가", 870),
      cutOf("약대-약학과-나", "약대", "나", 870),
    ]);

    // Act
    const analysis = await analyzeJeongsi(socialTrackInput());

    // Assert
    const recommended = universitiesOf(
      allRecommended(analysis.recommendations)
    );
    expect(recommended).toContain("약대");
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

  it("희망 학과는 전멸이지만 같은 계열그룹에 지원처가 있으면 추천한다", async () => {
    // Arrange
    // 의예과만 과탐 필수, 수의예과는 제한 없음 → 전멸이 아니다.
    // 이 경계는 샘플 데이터로는 재현되지 않으므로 픽스처로 고정한다.
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
    expect(recommended).toContain("수의대");
    expect(recommended).not.toContain("의대");
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
    // 안정 4개 → 3개는 안정 버킷, 남은 1개가 적정으로 대체 투입
    const cuts = [866, 870, 874, 878];
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

  it("분류 근거(percentileGap·민감도·σ)를 평가에 싣는다", async () => {
    // Arrange & Act
    const analysis = await analyzeJeongsi(makeInput());

    // Assert
    const [stable] = analysis.recommendations.안정;
    expect(stable.percentileGap).not.toBeNull();
    // 표준점수 환산식은 백분위 1점의 표준점수 변화가 원문에 없어 민감도가 없다
    expect(stable.sensitivity).toBeNull();
    expect(stable.cutVolatility).toBeGreaterThan(0);
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
