import {
  assignDetailFacts,
  assignMatchFacts,
  classifyMatchVerdict,
  composeDetailAdvice,
  composeMatchVerdicts,
  describeAreaLevel,
  composeFactSentence,
  judgeCombinationAllocation,
  judgeRecommendationOverall,
  listMatchFacts,
  judgeScoreOverall,
  type StudentContext,
} from "../judged-facts";
import type { AreaScoreRow } from "../../report-types";
import type {
  ConversionFormula,
  GradeScoreTable,
  PlanEvaluation,
  SuneungScore,
} from "../../types";

// ─── 픽스처 ───

const flat = (value: number): GradeScoreTable => ({
  1: value,
  2: value,
  3: value,
  4: value,
  5: value,
  6: value,
  7: value,
  8: value,
  9: value,
});

const score: SuneungScore = {
  examYear: 2026,
  korean: { elective: "언어와매체", standardScore: 131, percentile: 96 },
  math: { elective: "미적분", standardScore: 137, percentile: 98 },
  english: { grade: 2 },
  inquiry1: { subject: "물리학I", standardScore: 68, percentile: 93 },
  inquiry2: { subject: "지구과학I", standardScore: 65, percentile: 88 },
  history: { grade: 2 },
};

const row = (
  area: AreaScoreRow["area"],
  label: string,
  percentile: number,
  deviation: number,
  standardScore: number | null = null
): AreaScoreRow => ({
  area,
  label,
  subjectName: null,
  standardScore,
  percentile,
  grade: null,
  rank: 1,
  deviation,
});

const context: StudentContext = {
  score,
  rows: [
    row("korean", "국어", 96, 1.8, 131),
    row("math", "수학", 98, 3.8, 137),
    row("english", "영어", 92.5, -1.7),
    row("inquiry", "탐구", 90.5, -3.75, 66.5),
  ],
  strengths: ["math"],
  weaknesses: ["inquiry"],
};

const baseFormula: ConversionFormula = {
  formulaVersion: 1,
  totalScore: 1000,
  ratios: { korean: 30, math: 30, english: 10, inquiry: 30 },
  metric: { korean: "percentile", math: "percentile", inquiry: "percentile" },
  inquiryCount: 2,
  english: { type: "subtract", penaltyByGrade: flat(0) },
  history: { type: "subtract", penaltyByGrade: flat(0) },
  baseMax: { korean: 100, math: 100, inquiry: 100 },
};

const evaluation = (
  formula: Partial<ConversionFormula>,
  percentileGap: number | null = 2
): PlanEvaluation =>
  ({
    plan: { formula: { ...baseFormula, ...formula } },
    percentileGap,
    // 백분위 1점당 환산 총점의 1% — 손실 10점(1000점 만점)이 백분위 1점 상당
    sensitivity: 1,
  }) as unknown as PlanEvaluation;

// ─── PART 1 ───

describe("judgeScoreOverall", () => {
  it("영역 간 차이가 크면 반영비율을 첫 기준으로 맺는다", () => {
    // Arrange / Act
    const facts = judgeScoreOverall(context, 94.8, 401);

    // Assert
    expect(facts[1].meaning).toContain("7.5점으로 커");
    expect(facts[1].value).toBe(
      "수학 백분위 98점(평균 대비 +3.8점), 탐구 백분위 90.5점(평균 대비 -3.7점)"
    );
    expect(facts[2].value).toBe("수학 비중이 높고 탐구 비중이 낮은 대학");
  });

  it("영역 간 차이가 작으면 세 문장 모두 격차를 먼저 보는 방향으로 맺는다", () => {
    // Arrange
    const narrow: StudentContext = {
      ...context,
      rows: [
        row("korean", "국어", 98, 0.2),
        row("math", "수학", 99, 0.9),
        row("english", "영어", 98, 0),
        row("inquiry", "탐구", 97.5, -0.6),
      ],
    };

    // Act
    const facts = judgeScoreOverall(narrow, 98.2, 413);

    // Assert
    expect(facts[1].meaning).toContain("1.5점으로 작아");
    expect(facts[2].meaning).toContain("격차로 먼저 좁히고");
  });

  it("1문장은 현재 성적 수준을 백분위가 뜻하는 위치로 말한다", () => {
    // Arrange / Act: 국96 · 수98 · 탐93·88 → 가장 낮은 백분위 88
    const facts = judgeScoreOverall(context, 94.8, 401);

    // Assert
    expect(facts[0].value).toBe(
      "국·수·탐 평균 백분위 94.8점, 표준점수 합 401점"
    );
    expect(facts[0].meaning).toBe(
      "국어·수학·탐구 모두 응시자 상위 약 12% 안(백분위 88 이상)에 드는 성적이며, 영어는 2등급입니다."
    );
  });
});

describe("describeAreaLevel", () => {
  it("백분위의 정의로 응시자 중 위치를 적고, 탐구는 과목별로 적는다", () => {
    // Act & Assert
    expect(describeAreaLevel(score, "korean")).toBe("상위 약 4%");
    expect(describeAreaLevel(score, "inquiry")).toBe(
      "물리학I 상위 약 7% · 지구과학I 상위 약 12%"
    );
    expect(describeAreaLevel(score, "english")).toBeNull();
  });
});

// ─── PART 2 ───

describe("assignMatchFacts", () => {
  const strength = (value: number, position: string | null) => ({
    label: "수학",
    value,
    position,
    range: "35~40%",
  });
  const weakness = (value: number, position: string | null) => ({
    label: "탐구",
    value,
    position,
    range: "10~25%",
  });

  it("목록에 오른 이유(강점 비중 최대 → 약점 비중 최소 → 활용지표)로 1문장을 고른다", () => {
    // Arrange / Act
    const facts = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary: "국어 표준점수 / 수학 표준점수",
          strength: strength(40, "가장 높음"),
          weakness: weakness(20, "중간"),
        },
        {
          university: "나대학교",
          metricSummary: "국어 표준점수 / 수학 표준점수",
          strength: strength(35, "가장 낮음"),
          weakness: weakness(10, "가장 낮음"),
        },
        {
          university: "다대학교",
          metricSummary: "국어 표준점수 / 수학 표준점수",
          strength: strength(35, "가장 낮음"),
          weakness: weakness(25, "가장 높음"),
        },
      ],
      context
    );

    // Assert
    expect(facts[0][0].value).toBe("수학 40%");
    expect(facts[1][0].value).toBe("탐구 10%");
    expect(facts[2][0].value).toBe("국어 표준점수 / 수학 표준점수");
    // 약점 비중이 가장 큰 대학은 부담 쪽으로 판정한다
    expect(facts[2][1].meaning).toContain("환산 손실이 다른 대학보다 큰");
    expect(composeFactSentence(facts[0][0])).toBe(
      "수학을 40% 반영해 목록 중 비중이 가장 크므로, 강점인 수학 백분위 98점이 가장 크게 반영됩니다."
    );
  });

  it("앞 항목과 쓰는 재료가 같으면 2문장을 두 대학 사이의 선택 기준으로 바꾼다", () => {
    // Arrange
    const item = {
      metricSummary: "국어 표준점수 / 수학 표준점수",
      strength: strength(40, "가장 높음"),
      weakness: weakness(20, "중간"),
    };

    // Act
    const facts = assignMatchFacts(
      [
        { ...item, university: "가대학교" },
        { ...item, university: "나대학교" },
      ],
      context
    );

    // Assert
    expect(facts[1][1].value).toBe("가대학교와 같은 반영비율");
    expect(composeFactSentence(facts[1][1])).toContain(
      "모집군과 합격 가능성으로 원서를 고르는 편이 합리적입니다"
    );
  });
});

describe("assignMatchFacts — 강점 영역의 성적", () => {
  it("영어가 강점이면 다른 영역의 백분위 대신 영어 등급을 쓴다", () => {
    // Arrange: 영어 강점, 국·수·탐 중 첫 강점은 국어(백분위 96)
    const englishContext: StudentContext = {
      ...context,
      strengths: ["english", "korean"],
    };

    // Act
    const [[first]] = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary: "국어 백분위 / 수학 백분위",
          strength: {
            label: "영어",
            value: 80,
            position: "가장 높음",
            range: "40~80%",
          },
        },
      ],
      englishContext
    );

    // Assert
    expect(composeFactSentence(first)).toContain("강점인 영어 2등급이");
    expect(first.meaning).not.toContain("96");
  });
});

describe("assignMatchFacts — 목록에서 그 영역을 반영하는 대학이 하나뿐일 때", () => {
  it("약점 영역을 이 대학만 반영하면 다른 대학과 같다고 쓰지 않고 손실을 짚는다", () => {
    // Arrange: 다른 대학은 모두 탐구 0% — 비교 대상이 없어 position 이 null
    const [[, second]] = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary: "국어 백분위 / 수학 백분위",
          strength: {
            label: "수학",
            value: 40,
            position: "가장 높음",
            range: "35~40%",
          },
          weakness: { label: "탐구", value: 15, position: null, range: null },
        },
      ],
      context
    );

    // Assert
    expect(composeFactSentence(second)).toContain("이곳뿐이라(15%)");
    expect(second.meaning).not.toContain("같아");
  });
});

describe("assignMatchFacts — 강점·약점 비중 판정이 없는 가중치 대학", () => {
  it("두 문장이 같은 판정이 되지 않게 2문장은 가중치 판정으로 쓴다", () => {
    // Act
    const [[first, second]] = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary: "국어 표준점수 / 수학 표준점수",
          ratioSummary: "국100·수120·탐100(탐구 과목별 합) 가중합",
        },
      ],
      context
    );

    // Assert
    expect(first.value).not.toBe(second.value);
    expect(composeFactSentence(second)).toContain("수학 가중치 120은");
  });
});

describe("assignMatchFacts — 지표가 다른 영역끼리는 가중치를 견주지 않는다", () => {
  it("강점과 같은 지표인 영역하고만 가중치를 비교한다", () => {
    // Arrange: 탐구(변환표준점수) 150 은 수학(표준점수)과 척도가 달라 비교에서 뺀다
    const [[, second]] = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary:
            "국어 표준점수 / 수학 표준점수 / 탐구 변환표준점수 2과목",
          ratioSummary: "국90·수100·탐150 가중합",
        },
      ],
      context
    );

    // Assert
    expect(composeFactSentence(second)).toContain(
      "수학 가중치 100은 같은 표준점수로 반영하는 국어보다 커"
    );
  });

  it("영역마다 지표가 다르면 백분위로 반영한다고 쓰지 않는다", () => {
    // Arrange: 강점인 수학은 백분위, 탐구는 변환표준점수
    const [[first]] = assignMatchFacts(
      [
        {
          university: "가대학교",
          metricSummary: "국어 백분위 / 수학 백분위 / 탐구 변환표준점수 2과목",
        },
      ],
      context
    );

    // Assert
    const sentence = composeFactSentence(first);
    expect(sentence).toContain("강점인 수학은 백분위로 반영되어");
    expect(sentence).not.toContain("영역을 백분위로 반영해");
  });
});

describe("assignMatchFacts — 한 문장만 같은 반복", () => {
  it("같은 판정이 두 번째부터 나오면 같은 뜻의 다른 문장으로 주고, 앞 대학 이름은 끌어오지 않는다", () => {
    // Arrange: 약점(탐구)이 빠진 대학이 넷 — 1문장이 모두 약점 0% 판정
    const items = ["가", "나", "다", "라"].map((name, order) => ({
      university: `${name}대학교`,
      metricSummary: "국어 표준점수 / 수학 표준점수",
      strength: {
        label: "수학",
        value: 30 + order,
        position: "중간",
        range: "30~40%",
      },
      weakness: { label: "탐구", value: 0, position: null, range: null },
    }));

    // Act
    const first = assignMatchFacts(items, context).map(([fact]) =>
      composeFactSentence(fact)
    );

    // Assert
    expect(first[0]).toContain("반영에서 빠져");
    expect(first[1]).toContain("반영하지 않는 구조라");
    expect(first.some((sentence) => sentence.includes("대학교와 같은"))).toBe(
      false
    );
  });
});

describe("listMatchFacts", () => {
  it("항목마다 강점·약점·활용지표 판정을 모두 담는다", () => {
    // Arrange
    const items = [
      {
        university: "가대학교",
        metricSummary: "국어 표준점수 / 수학 표준점수",
        strength: {
          label: "수학",
          value: 40,
          position: "가장 높음",
          range: "30~40%",
        },
        weakness: {
          label: "탐구",
          value: 20,
          position: "중간",
          range: "10~25%",
        },
      },
    ];

    // Act
    const [pool] = listMatchFacts(items, context);

    // Assert: 강점·약점·활용지표 판정, 각각 다른 표현을 갖는다
    expect(pool).toHaveLength(3);
    expect(pool.every((fact) => fact.alternate !== undefined)).toBe(true);
  });
});

// ─── PART 3 ───

describe("judgeRecommendationOverall", () => {
  const input = {
    tierCounts: "상향 1곳, 적정 3곳, 안정 3곳",
    counts: { 상향: 1, 적정: 3, 안정: 3 },
    gapRanges: "상향 -1.3백분위점",
    allocation: "상향 1장, 적정 1장, 안정 1장",
    risk: "균형" as const,
    cautions: ["가대학교 컴퓨터학과(-1.3백분위점)"],
  };

  it("구분별 곳 수·성향 배분·신중히 볼 곳을 판정과 함께 세 문장으로 만든다", () => {
    // Arrange / Act
    const facts = judgeRecommendationOverall(input);

    // Assert
    expect(facts[0].meaning).toContain("상향은 1곳뿐이라");
    expect(facts[1].meaning).toContain("도전과 안정 사이의 균형");
    expect(composeFactSentence(facts[2])).toBe(
      "신중히 볼 곳은 가대학교 컴퓨터학과(-1.3백분위점)이며, 기준컷에 못 미치거나 합격 가능성이 낮은 곳이라, 원서로 둘 때는 나머지 두 장으로 결과를 받쳐 두는 편이 합리적입니다."
    );
  });

  it("비어 있는 구분과 신중히 볼 곳이 없는 상태를 판정한다", () => {
    // Arrange / Act
    const facts = judgeRecommendationOverall({
      ...input,
      tierCounts: "적정 3곳, 안정 3곳",
      counts: { 상향: 0, 적정: 3, 안정: 3 },
      cautions: [],
    });

    // Assert
    expect(facts[0].meaning).toContain("상향 선택지가 없어");
    expect(facts[2].meaning).toContain("목록의 모든 대학이 기준컷 이상");
  });
});

// ─── PART 5 ───

describe("assignDetailFacts", () => {
  it("학생에게 실제로 적용되는 가산을 강점·약점 역할과 함께 판정한다", () => {
    // Arrange: 과탐 응시자, 탐구가 약점
    const evaluations = [
      evaluation({
        bonus: {
          scienceInquiry: { type: "percent", value: 3, appliesTo: "each" },
        },
      }),
    ];

    // Act
    const [fact] = assignDetailFacts(evaluations, ["국30·수30·탐30"], context);

    // Assert
    expect(fact.value).toBe("과탐 과목별 가산 +3%");
    expect(composeFactSentence(fact)).toBe(
      "과탐 과목별 가산 +3%는 약점인 탐구의 환산점수를 보완해 줍니다."
    );
  });

  it("비중을 추정치로 역산한 대학은 비중으로 판정하지 않는다", () => {
    // Arrange: 수학 비중이 가장 크게 적혀 있어도 원문에 없는 추정 비중이다
    const flagged = {
      ...evaluation({
        ratios: { korean: 20, math: 50, english: 10, inquiry: 20 },
      }),
    } as PlanEvaluation;
    const estimated = {
      ...flagged,
      plan: { ...flagged.plan, areaSharesEstimated: true },
    } as PlanEvaluation;

    // Act
    const [fact] = assignDetailFacts(
      [estimated],
      ["국100·수120·탐80 가중합"],
      context
    );

    // Assert
    expect(fact.value).not.toContain("수학");
    expect(composeFactSentence(fact)).not.toContain("비중이 가장 커");
  });

  it("민감도가 없는 대학(표준점수 반영)은 등급 손실을 백분위로 환산하지 않는다", () => {
    // Arrange
    const english = {
      type: "subtract" as const,
      penaltyByGrade: { ...flat(0), 2: 5 },
    };
    const noSensitivity = {
      ...evaluation({ english }, 2),
      sensitivity: null,
    } as PlanEvaluation;

    // Act
    const [fact] = assignDetailFacts(
      [noSensitivity],
      ["국30·수30·탐30"],
      context
    );

    // Assert
    expect(fact.value).not.toContain("백분위 약");
  });

  it("영어 등급 손실을 백분위점으로 환산해 그 대학의 격차와 견준다", () => {
    // Arrange: 2등급 감점 5점 = 백분위 0.5점 상당
    const english = {
      type: "subtract" as const,
      penaltyByGrade: { ...flat(0), 2: 5 },
    };

    // Act
    const [small, large] = assignDetailFacts(
      [evaluation({ english }, 2), evaluation({ english }, 0.3)],
      ["국30·수30·탐30", "국30·수30·탐30"],
      context
    );

    // Assert
    expect(small.value).toBe("영어 2등급 감점 5점(백분위 약 0.5점 상당)");
    expect(small.meaning).toContain("격차보다 작아");
    // 큰 손실 판정 (두 문장 틀 중 하나)
    expect(large.meaning).toMatch(
      /결과를 가를 수 있는 대학|만회해야 하는 구조/
    );
  });

  it("같은 판정이 이어지면 같은 뜻의 다른 문장으로 번갈아 쓴다", () => {
    // Arrange: 세 대학 모두 영어 손실만 의미 있는 소재다
    const english = {
      type: "subtract" as const,
      penaltyByGrade: { ...flat(0), 2: 5 },
    };
    const evaluations = [1, 2, 3].map(() => evaluation({ english }, 2));

    // Act
    const facts = assignDetailFacts(
      evaluations,
      ["국30·수30·탐30", "국30·수30·탐30", "국30·수30·탐30"],
      context
    );

    // Assert
    expect(facts[0].meaning).toContain("지원 판단을 바꿀 정도는 아닙니다");
    expect(facts[1].meaning).toContain("다른 영역이 결과를 좌우합니다");
  });

  it("판정 문장이 같은 소재는 다른 소재가 있으면 한 번만 쓴다", () => {
    // Arrange: 두 대학 모두 수학을 가장 크게 반영하고, 둘째 대학만 과탐 가산이 있다
    const ratios = { korean: 25, math: 40, english: 10, inquiry: 25 };
    const evaluations = [
      evaluation({ ratios }),
      evaluation({
        ratios,
        bonus: {
          scienceInquiry: { type: "percent", value: 3, appliesTo: "each" },
        },
      }),
    ];

    // Act
    const facts = assignDetailFacts(
      evaluations,
      ["국25·수40·영10·탐25", "국25·수40·영10·탐25"],
      context
    );

    // Assert
    expect(facts[0].value).toBe("수학 40%");
    expect(facts[1].value).toBe("과탐 과목별 가산 +3%");
  });
});

// ─── PART 4 ───

describe("judgeCombinationAllocation", () => {
  it("모든 조합의 칸 구성이 기본 배분과 같으면 모두 같다고 판정한다", () => {
    // Arrange
    const combinations = ["희망 우선형", "대학 우선형"].map((label) => ({
      label,
      tiers: ["상향", "상향", "적정"],
    }));

    // Act
    const fact = judgeCombinationAllocation(combinations, "공격");

    // Assert
    expect(fact.meaning).toContain(
      "2개 조합 모두 기본 배분(상향 2장, 적정 1장)과 같아"
    );
  });

  it("일부만 같으면 같은 조합만 지목한다", () => {
    // Act
    const fact = judgeCombinationAllocation(
      [
        { label: "희망 우선형", tiers: ["상향", "적정", "안정"] },
        { label: "합격 여유형", tiers: ["적정", "안정", "안정"] },
      ],
      "균형"
    );

    // Assert
    expect(fact.meaning).toContain("같은 조합은 희망 우선형이라");
  });

  it("같은 조합이 없으면 장 수 대신 구분 이름으로 구성을 말한다", () => {
    // Act: 칸이 비어 두 장뿐인 조합 — "N장"을 쓰면 배분 가드가 바꿔 버린다
    const fact = judgeCombinationAllocation(
      [
        { label: "희망 우선형 (다군 지원처 없음)", tiers: ["적정", "안정"] },
        { label: "합격 여유형 (다군 지원처 없음)", tiers: ["적정", "안정"] },
      ],
      "공격"
    );

    // Assert
    expect(fact.meaning).toContain("모든 조합이 적정·안정 원서로 구성되어");
    expect(fact.meaning).not.toContain("1장, 안정");
  });
});

describe("classifyMatchVerdict · composeMatchVerdicts", () => {
  const fact = (label: string, value: number, position: string | null) => ({
    label,
    value,
    position,
    range: null,
  });

  it("강점 비중이 가장 크거나 약점이 빠지면 유리, 약점 비중이 가장 크면 주의로 판정한다", () => {
    // Act & Assert
    expect(
      classifyMatchVerdict({
        university: "가",
        metricSummary: "",
        strength: fact("수학", 40, "가장 높음"),
      })
    ).toBe("유리");
    expect(
      classifyMatchVerdict({
        university: "나",
        metricSummary: "",
        weakness: fact("국어", 0, null),
      })
    ).toBe("유리");
    expect(
      classifyMatchVerdict({
        university: "다",
        metricSummary: "",
        weakness: fact("국어", 15, null),
      })
    ).toBe("주의");
    expect(
      classifyMatchVerdict({
        university: "라",
        metricSummary: "",
        strength: fact("수학", 35, "중간"),
      })
    ).toBe("중립");
  });

  it("같은 판정이 이어져도 판단 문장이 겹치지 않는다", () => {
    // Arrange
    const favorable = {
      university: "가",
      metricSummary: "",
      strength: fact("수학", 40, "가장 높음"),
    };

    // Act
    const sentences = composeMatchVerdicts([favorable, favorable, favorable]);

    // Assert
    expect(new Set(sentences).size).toBe(3);
  });
});

describe("composeDetailAdvice", () => {
  it("같은 군·구분이 표현 수보다 많아도 문장이 겹치지 않는다", () => {
    // Act: 가군 안정 네 곳
    const advice = composeDetailAdvice(
      Array.from({ length: 4 }, () => ({
        tier: "안정" as const,
        chance: "높음",
        group: "가" as const,
      }))
    );

    // Assert
    expect(new Set(advice).size).toBe(4);
  });

  it("구분·모집군에 맞는 원서 운용 조언을 겹치지 않게 쓴다", () => {
    // Act
    const advice = composeDetailAdvice([
      { tier: "상향", chance: "낮음", group: "가" },
      { tier: "안정", chance: "높음", group: "나" },
      { tier: "안정", chance: "높음", group: "나" },
    ]);

    // Assert
    expect(advice[0]).toBe(
      "가군 상향 원서로 둔다면, 나머지 나·다군에는 적정·안정 원서를 두어 결과를 받쳐야 합니다."
    );
    expect(advice[1]).not.toBe(advice[2]);
  });
});
