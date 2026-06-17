import {
  buildCompetencyAxes,
  buildCompetencyHighlights,
} from "../competency-axes";

describe("buildCompetencyAxes", () => {
  // 실제 프롬프트 스키마와 동일한 하위항목 구조
  const makeScores = (overrides?: {
    achievement?: number;
    courseAch?: number;
    inquiry?: number;
    careerExplore?: number;
    careerTotal?: number;
    communityTotal?: number;
  }) => {
    const o = {
      achievement: 30, // 학업성취도 /35
      courseAch: 28, // 교과성취도 /35
      inquiry: 30, // 탐구력 /40
      careerExplore: 30, // 진로탐색 /40
      careerTotal: 78,
      communityTotal: 65,
      ...overrides,
    };
    return [
      {
        category: "academic",
        score: 82,
        subcategories: [
          { name: "학업성취도", score: o.achievement, maxScore: 35 },
          { name: "학업태도", score: 22, maxScore: 25 },
          { name: "탐구력", score: o.inquiry, maxScore: 40 },
        ],
      },
      {
        category: "career",
        score: o.careerTotal,
        subcategories: [
          { name: "교과이수노력", score: 20, maxScore: 25 },
          { name: "교과성취도", score: o.courseAch, maxScore: 35 },
          { name: "진로탐색", score: o.careerExplore, maxScore: 40 },
        ],
      },
      {
        category: "community",
        score: o.communityTotal,
        subcategories: [
          { name: "나눔과배려", score: 16, maxScore: 25 },
          { name: "소통및협업", score: 17, maxScore: 25 },
          { name: "리더십", score: 16, maxScore: 25 },
          { name: "성실성", score: 16, maxScore: 25 },
        ],
      },
    ];
  };

  it("5개 축을 정의된 순서로 산출한다", () => {
    // Act
    const axes = buildCompetencyAxes(makeScores(), 68);

    // Assert
    expect(axes.map((a) => a.key)).toEqual([
      "naesin",
      "setuk",
      "majorFit",
      "extracurricular",
      "growth",
    ]);
  });

  it("내신·세특은 하위항목 합을 100점 만점으로 정규화한다", () => {
    // Arrange: 내신 = (30+28)/(35+35)=82.857→83, 세특 = (30+30)/80=75
    // Act
    const axes = buildCompetencyAxes(makeScores(), 68);
    const naesin = axes.find((a) => a.key === "naesin");
    const setuk = axes.find((a) => a.key === "setuk");

    // Assert
    expect(naesin?.score).toBe(83);
    expect(setuk?.score).toBe(75);
  });

  it("전공적합성·비교과는 역량 총점을, 성장성은 growthScore를 그대로 쓴다", () => {
    // Act
    const axes = buildCompetencyAxes(makeScores(), 68);

    // Assert
    expect(axes.find((a) => a.key === "majorFit")?.score).toBe(78);
    expect(axes.find((a) => a.key === "extracurricular")?.score).toBe(65);
    expect(axes.find((a) => a.key === "growth")?.score).toBe(68);
  });

  it("최고 축을 강점, 최저 축을 보완으로 표시한다", () => {
    // Arrange: 내신 83(최고), 비교과 65(최저)
    // Act
    const axes = buildCompetencyAxes(makeScores(), 68);
    const strength = axes.find((a) => a.isStrength);
    const weakness = axes.find((a) => a.isWeakness);

    // Assert
    expect(strength?.key).toBe("naesin");
    expect(weakness?.key).toBe("extracurricular");
  });

  it("모든 축이 동점이면 강·약점을 표시하지 않는다", () => {
    // Arrange: 모든 축이 70이 되도록 구성
    const scores = [
      {
        category: "academic",
        score: 70,
        subcategories: [
          { name: "학업성취도", score: 24.5, maxScore: 35 }, // 70%
          { name: "탐구력", score: 28, maxScore: 40 }, // 70%
        ],
      },
      {
        category: "career",
        score: 70,
        subcategories: [
          { name: "교과성취도", score: 24.5, maxScore: 35 },
          { name: "진로탐색", score: 28, maxScore: 40 },
        ],
      },
      { category: "community", score: 70, subcategories: [] },
    ];

    // Act
    const axes = buildCompetencyAxes(scores, 70);

    // Assert
    expect(axes.every((a) => a.score === 70)).toBe(true);
    expect(axes.some((a) => a.isStrength)).toBe(false);
    expect(axes.some((a) => a.isWeakness)).toBe(false);
  });

  it("하위항목이 없으면 해당 축을 0으로 떨어뜨리되 예외를 던지지 않는다", () => {
    // Arrange
    const scores = [
      { category: "academic", score: 0, subcategories: [] },
      { category: "career", score: 0, subcategories: [] },
      { category: "community", score: 0, subcategories: [] },
    ];

    // Act
    const axes = buildCompetencyAxes(scores, 0);

    // Assert
    expect(axes.find((a) => a.key === "naesin")?.score).toBe(0);
    expect(axes.find((a) => a.key === "setuk")?.score).toBe(0);
  });
});

describe("buildCompetencyHighlights", () => {
  const scores = [
    {
      category: "academic",
      label: "학업역량",
      score: 90,
      subcategories: [
        {
          name: "학업성취도",
          score: 35,
          maxScore: 35,
          comment: "내신 평균 1.2등급, 전과목 1등급. 감점 사유 없음.",
        },
        {
          name: "탐구력",
          score: 22,
          maxScore: 40,
          comment: "탐구가 단발적이고 산출물이 부족해 -18점.",
        },
      ],
    },
    {
      category: "career",
      label: "진로역량",
      score: 70,
      subcategories: [
        {
          name: "교과이수노력",
          score: 12,
          maxScore: 25,
          comment: "핵심 권장과목 절반 미이수로 -13점.",
        },
      ],
    },
    {
      category: "community",
      label: "공동체역량",
      score: 80,
      subcategories: [
        {
          name: "성실성",
          score: 24,
          maxScore: 25,
          comment: "재학 기간 개근. 일부 지각으로 -1점.",
        },
      ],
    },
  ];

  it("감점액(gap)이 큰 순으로 보완 항목을 뽑고 향상 여지를 계산한다", () => {
    // Act
    const { improvements } = buildCompetencyHighlights(scores);

    // Assert: 탐구력(-18) > 교과이수노력(-13) > 성실성(-1)
    expect(improvements.map((it) => it.name)).toEqual([
      "탐구력",
      "교과이수노력",
      "성실성",
    ]);
    expect(improvements[0].gap).toBe(18);
    expect(improvements[0].reason).toContain("산출물이 부족");
    expect(improvements[0].categoryLabel).toBe("학업역량");
  });

  it("충족률이 높은 순으로 강점 항목을 뽑는다", () => {
    // Act
    const { strengths } = buildCompetencyHighlights(scores);

    // Assert: 학업성취도(100%)가 1순위
    expect(strengths[0].name).toBe("학업성취도");
    expect(strengths[0].gap).toBe(0);
  });

  it("limit으로 항목 수를 제한한다", () => {
    // Act
    const { strengths, improvements } = buildCompetencyHighlights(scores, 1);

    // Assert
    expect(strengths).toHaveLength(1);
    expect(improvements).toHaveLength(1);
  });

  it("감점이 전혀 없으면 보완 항목은 비어 있다", () => {
    // Arrange
    const perfect = [
      {
        category: "academic",
        label: "학업역량",
        score: 35,
        subcategories: [
          { name: "학업성취도", score: 35, maxScore: 35, comment: "만점." },
        ],
      },
    ];

    // Act
    const { improvements } = buildCompetencyHighlights(perfect);

    // Assert
    expect(improvements).toHaveLength(0);
  });
});
