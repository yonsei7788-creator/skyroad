import {
  assignChanceMeanings,
  assignRecommendationOpenings,
  assignRotatingTopics,
  buildAreaSummaryLine,
  buildCombinationPrompt,
  composeCombinationStrategy,
  composeFullyDistinctSentence,
  composeOverlapSentence,
  composeRecommendationComment,
  composeTrendLead,
  isFullyDistinct,
  buildRecommendationPrompt,
  buildScoreAnalysisPrompt,
  buildUniversityMatchPrompt,
  buildRepairPrompt,
} from "../prompts";
import { buildJeongsiSystemPrefix } from "../system-prompt";
import type { AreaScoreRow } from "../../report-types";

const rows: AreaScoreRow[] = [
  {
    area: "korean",
    label: "국어",
    subjectName: "언어와매체",
    standardScore: 131,
    percentile: 93,
    grade: null,
    rank: 2,
    deviation: -0.7,
  },
  {
    area: "math",
    label: "수학",
    subjectName: "미적분",
    standardScore: 138,
    percentile: 97,
    grade: null,
    rank: 1,
    deviation: 3.3,
  },
  {
    area: "english",
    label: "영어",
    subjectName: null,
    standardScore: null,
    percentile: 89,
    grade: 2,
    rank: 4,
    deviation: -4.7,
  },
  {
    area: "inquiry",
    label: "탐구",
    subjectName: "물리학I·지구과학I",
    standardScore: 134,
    percentile: 92.5,
    grade: null,
    rank: 3,
    deviation: -1.2,
  },
];

const fact = (value: string, meaning: string) => ({ value, meaning });

const SCORE_FACTS = [
  fact("국·수·탐 평균 백분위 93.7점", "판단 하나입니다."),
  fact("수학 백분위 97점", "판단 둘입니다."),
  fact("수학 비중이 높은 대학", "판단 셋입니다."),
];

describe("buildScoreAnalysisPrompt", () => {
  it("확정값 전제와 영역별 수치를 프롬프트에 그대로 싣는다", () => {
    // Arrange / Act
    const prompt = buildScoreAnalysisPrompt({
      areaLevels: { korean: "상위 약 4%" },
      rows,
      overallFacts: SCORE_FACTS,
      averagePercentile: 93.7,
      totalStandardScore: 403,
      strengthAreas: ["math"],
      weaknessAreas: ["english"],
    });

    // Assert: 재계산 방지 전제
    expect(prompt).toContain("아래 수치는 이미 확정된 값입니다");
    expect(prompt).toContain("계산을 마친 확정값");

    // Assert: 수치가 주어진 자리수 그대로 들어간다
    expect(prompt).toContain(
      "| 수학 | 미적분 | 138 | 97 | - | - | 1순위 | +3.3 |"
    );
    // 응시자 중 위치는 백분위 정의로 정해진 값을 그대로 싣는다
    expect(prompt).toContain("상위 약 4%");
    expect(prompt).toContain("| 영어 | - | - | 89 | - | 2 | 4순위 | -4.7 |");
    expect(prompt).toContain("국·수·탐 평균 백분위: 93.7");
    expect(prompt).toContain("국·수·탐 표준점수 합: 403");
    expect(prompt).toContain("코드가 판정한 강점 영역: 수학");
    expect(prompt).toContain("코드가 판정한 약점 영역: 영어");
    // 총평은 문장마다 코드가 판정한 재료로 쓴다
    expect(prompt).toContain(
      "- 1문장 — 인용할 값: 국·수·탐 평균 백분위 93.7점 / 판단: 판단 하나입니다."
    );
    expect(prompt).toContain("## 문장 재료를 쓰는 방법");
  });

  it("해설 필드마다 문장 수와 글자 수 상한을 지정한다", () => {
    // Arrange / Act
    const prompt = buildScoreAnalysisPrompt({
      areaLevels: { korean: "상위 약 4%" },
      rows,
      overallFacts: SCORE_FACTS,
      averagePercentile: 93.7,
      totalStandardScore: 403,
      strengthAreas: [],
      weaknessAreas: [],
    });

    // Assert
    expect(prompt).toContain("overallComment — 문장 3개, 합계 300자 이내");
    expect(prompt).toContain("strengthComment — 문장 2개, 합계 200자 이내");
    expect(prompt).toContain("weaknessComment — 문장 2개, 합계 200자 이내");
    expect(prompt).toContain("지정된 영역 없음");
  });

  it("파트의 서술 관점과 다른 파트가 다루는 범위를 싣는다", () => {
    // Arrange / Act
    const prompt = buildScoreAnalysisPrompt({
      areaLevels: { korean: "상위 약 4%" },
      rows,
      overallFacts: SCORE_FACTS,
      averagePercentile: 93.7,
      totalStandardScore: 403,
      strengthAreas: ["math"],
      weaknessAreas: ["english"],
    });

    // Assert
    expect(prompt).toContain("## 서술 관점: 입시 컨설턴트");
    expect(prompt).toContain("합격 가능성과 기준컷 격차는 PART 3·5가 다룹니다");
    expect(prompt).toContain("반영방식은 반영비율 기준으로 말합니다");
  });
});

describe("buildAreaSummaryLine", () => {
  it("표준점수가 없는 영역은 등급으로 요약한다", () => {
    // Arrange / Act
    const summary = buildAreaSummaryLine(rows);

    // Assert
    expect(summary).toBe(
      "국어 표준점수 131·백분위 93 / 수학 표준점수 138·백분위 97 / 영어 2등급 / 탐구 표준점수 134·백분위 92.5"
    );
  });
});

describe("buildUniversityMatchPrompt", () => {
  const item = {
    university: "가대학교",
    department: "컴퓨터공학부",
    group: "가" as const,
    ratioSummary: "국30·수35·영10·탐25",
    metricSummary: "국어 표준점수 / 수학 표준점수 / 탐구 변환표준점수 2과목",
    advantageScore: 88,
  };

  it("항목마다 두 문장의 재료(값·판단)만 싣는다", () => {
    // Arrange / Act
    const prompt = buildUniversityMatchPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      strengthAreas: ["math"],
      weaknessAreas: ["english"],
      selection: { notices: [], blockedByRestrictions: false },
      items: [item],
      facts: [
        [fact("수학 35%", "판단 A입니다."), fact("영어 10%", "판단 B입니다.")],
      ],
    });

    // Assert
    expect(prompt).toContain("- index 0: 가대학교 컴퓨터공학부 (가군)");
    expect(prompt).toContain(
      "  - 1문장 — 인용할 값: 수학 35% / 판단: 판단 A입니다."
    );
    expect(prompt).toContain(
      "  - 2문장 — 인용할 값: 영어 10% / 판단: 판단 B입니다."
    );
    // 재료 밖의 원시 값과 내부 점수는 싣지 않는다
    expect(prompt).not.toContain("반영비율: 국어 30%");
    expect(prompt).not.toContain("88");
    expect(prompt).toContain(
      "items[].reason — 문장 2개, 항목마다 합계 120자 이내"
    );
    expect(prompt).toContain("items 는 위 목록과 같은 1개를 채우고");
  });

  it("총평 자리에 문장별 글자 수 상한을 싣는다", () => {
    // Arrange / Act
    const prompt = buildUniversityMatchPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      strengthAreas: ["math"],
      weaknessAreas: ["inquiry"],
      selection: { notices: [], blockedByRestrictions: false },
      items: [],
      facts: [],
    });

    // Assert
    expect(prompt).toContain('"1문장 (80자 이내)');
    expect(prompt).toContain('"3문장 (90자 이내)');
  });
});

describe("buildRecommendationPrompt", () => {
  it("격차는 코드 문구로 싣고 대학명·환산점수는 싣지 않는다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: { notices: [], blockedByRestrictions: false },
      items: [
        {
          tier: "안정",
          university: "세종대학교",
          department: "컴퓨터공학과",
          group: "나",
          quota: 17,
          convertedScore: 751.232,
          referenceCut: 77.1,
          gapRatio: 10.866,
          cutComparison: null,
          percentileGap: 10.866,
          chance: "보통",
        },
        {
          tier: "상향",
          university: "서울대학교",
          department: "경영대학",
          group: "나",
          quota: 60,
          convertedScore: 401.3,
          referenceCut: 96.1,
          gapRatio: -1.167,
          cutComparison: {
            metric: "percentile",
            studentValue: 94.933,
            referenceCut: 96.1,
            previousYear: { year: 2026, cut: 96 },
          },
          suneungWeight: 80,
          percentileGap: -1.167,
          chance: "낮음",
        },
      ],
    });

    // Assert: 격차는 코드가 쓴 문구로 담는다
    expect(prompt).toContain(
      "| 0 | 안정 | 나군 | 기준컷을 10.9백분위점 넘겨 |"
    );
    expect(prompt).toContain(
      "| 1 | 상향 | 나군 | 기준컷에 1.2백분위점 모자라 |"
    );
    expect(prompt).not.toContain("세종대학교");
    expect(prompt).not.toContain("751.2");
  });

  it("컷 흐름과 같은 구분 안 위치를 코멘트 첫머리 구절로 배정한다", () => {
    // Arrange
    const base = {
      tier: "안정" as const,
      department: "컴퓨터공학과",
      group: "가" as const,
      quota: 20,
      convertedScore: 700,
      referenceCut: 90,
      gapRatio: 1,
      chance: "높음" as const,
    };

    // Act
    const openings = assignRecommendationOpenings([
      {
        ...base,
        university: "가대학교",
        percentileGap: 4.2,
        cutTrend: "2025 89 → 2026 90, 상승",
      },
      { ...base, university: "나대학교", percentileGap: 12.2 },
    ]);

    // Assert
    expect(openings).toEqual([
      "컷 흐름이 상승(2025 89 → 2026 90)인 곳으로",
      "안정 2곳 중 여유가 가장 큰 곳으로",
    ]);
  });

  it("적정 칸으로 끌어온 항목은 실제 구분부터 밝힌다", () => {
    // Arrange
    const item = {
      tier: "적정" as const,
      substitutedFrom: "안정" as const,
      university: "가대학교",
      department: "자율전공학부",
      group: "가" as const,
      quota: 66,
      convertedScore: 700,
      referenceCut: 90,
      gapRatio: 1.8,
      percentileGap: 1.8,
      chance: "높음" as const,
    };

    // Act
    const [opening] = assignRecommendationOpenings([item]);

    // Assert
    expect(opening).toBe("안정 판정이지만 적정 후보가 부족해 함께 담은 곳으로");
  });

  it("기준컷에 못 미친 곳은 여유 대신 컷과의 거리로 위치를 말한다", () => {
    // Arrange
    const base = {
      tier: "상향" as const,
      department: "컴퓨터공학과",
      group: "가" as const,
      quota: 20,
      convertedScore: 700,
      referenceCut: 90,
      gapRatio: 1,
      chance: "낮음" as const,
    };

    // Act
    const openings = assignRecommendationOpenings([
      { ...base, university: "가대학교", percentileGap: -0.3 },
      { ...base, university: "나대학교", percentileGap: -1.4 },
    ]);

    // Assert
    expect(openings[0]).toBe("상향 2곳 중 기준컷에 가장 가까운 곳으로");
    expect(openings.join(" ")).not.toContain("여유");
  });

  it("코멘트는 첫머리 구절·격차 문구·해석 문구를 코드가 잇는다", () => {
    // Arrange / Act
    const comment = composeRecommendationComment(
      "안정 3곳 중 여유가 가장 작은 곳으로",
      11.04,
      "결과를 비교적 높은 확률로 기대할 수 있는 위치입니다"
    );

    // Assert
    expect(comment).toBe(
      "안정 3곳 중 여유가 가장 작은 곳으로 기준컷을 11.0백분위점 넘겨, 결과를 비교적 높은 확률로 기대할 수 있는 위치입니다."
    );
  });

  it("흐름 판정이 없는 컷 흐름도 구절로 쓴다", () => {
    // Arrange / Act / Assert
    expect(composeTrendLead("2025 89 → 2026 90")).toBe(
      "컷 흐름(2025 89 → 2026 90)을 보인 곳으로"
    );
    expect(composeTrendLead("2026 90")).toBeNull();
  });

  it("코드가 확정한 구분·격차를 표로 싣고 총평만 요청한다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: { notices: [], blockedByRestrictions: false },
      items: [
        {
          tier: "상향",
          university: "가대학교",
          department: "컴퓨터공학부",
          group: "가",
          quota: 24,
          convertedScore: 912.4,
          referenceCut: 920.1,
          gapRatio: -0.84,
          percentileGap: -1.3,
          chance: "낮음",
        },
        {
          tier: "안정",
          university: "다대학교",
          department: "정보통신공학과",
          group: "다",
          quota: 31,
          convertedScore: 898.7,
          referenceCut: null,
          gapRatio: null,
          percentileGap: null,
          chance: "높음",
        },
      ],
    });

    // Assert
    expect(prompt).toContain(
      "| 0 | 상향 | 가군 | 기준컷에 1.3백분위점 모자라 |"
    );
    expect(prompt).toContain(
      "| 1 | 안정 | 다군 | 공개 기준컷이 없어 반영방식과 모집 규모로 판단한 구분으로 |"
    );
    expect(prompt).toContain(
      "- 3문장 — 인용할 값: 수학 비중이 높은 대학 / 판단: 판단 셋입니다."
    );
    // 대학별 코멘트는 코드가 쓰므로 요청하지 않는다
    expect(prompt).not.toContain("items[].comment");
  });
});

describe("buildCombinationPrompt", () => {
  it("다른 조합에 없는 칸만 달라지는 칸으로 표시한다", () => {
    // Arrange
    const slot = (
      group: "가" | "나" | "다",
      university: string
    ): {
      group: "가" | "나" | "다";
      university: string;
      department: string;
      tier: "적정";
      chance: "보통";
    } => ({
      group,
      university,
      department: "컴퓨터공학과",
      tier: "적정",
      chance: "보통",
    });

    // Act
    const prompt = buildCombinationPrompt({
      risk: "균형",
      allocationFact: {
        value: "모든 조합이 상향 1장, 적정 1장, 안정 1장",
        meaning: "판정 문장입니다.",
      },
      selection: { notices: [], blockedByRestrictions: false },
      combinations: [
        {
          id: "a",
          label: "희망 우선형",
          slots: [slot("가", "가대학교"), slot("다", "다대학교")],
        },
        {
          id: "b",
          label: "대학 우선형",
          slots: [slot("가", "가대학교"), slot("다", "라대학교")],
        },
        {
          id: "c",
          label: "합격 여유형",
          slots: [slot("가", "마대학교"), slot("다", "바대학교")],
        },
      ],
    });

    // Assert
    expect(prompt).toContain(
      "  - 다른 조합과 달라지는 칸: 다군 다대학교 컴퓨터공학과 (적정)"
    );
    expect(prompt).toContain(
      "  - 다른 조합과 달라지는 칸: 두 칸 모두 — 이 조합의 해석 문장은 코드가 쓰므로 difference는 빈 문자열로 둡니다"
    );
  });

  it("조합의 군별 배치를 코드 구성 결과로 제시한다", () => {
    // Arrange / Act
    const prompt = buildCombinationPrompt({
      risk: "공격",
      allocationFact: {
        value: "모든 조합이 상향 1장, 적정 1장, 안정 1장",
        meaning: "판정 문장입니다.",
      },
      selection: { notices: [], blockedByRestrictions: false },
      combinations: [
        {
          id: "combo-1",
          label: "균형 조합",
          slots: [
            {
              group: "가",
              university: "가대학교",
              department: "컴퓨터공학부",
              tier: "상향",
              chance: "낮음",
            },
          ],
        },
      ],
    });

    // Assert
    expect(prompt).toContain("- index 0: 균형 조합");
    expect(prompt).toContain(
      "  - 가군: 가대학교 컴퓨터공학부 (상향 / 합격 가능성 낮음)"
    );
    expect(prompt).toContain(
      "items[].difference — 각 1문장, 항목마다 90자 이내"
    );
    // 기본 배분과 같은 조합은 코드가 판정해 재료로 준다
    expect(prompt).toContain(
      "  - 인용할 값: 모든 조합이 상향 1장, 적정 1장, 안정 1장 / 판단: 판정 문장입니다."
    );
  });
});

describe("buildRepairPrompt", () => {
  it("원래 프롬프트 뒤에 다시 쓸 칸과 갖출 모양, 고친 칸만 담는 JSON 형식을 붙인다", () => {
    // Arrange
    const entries = [
      {
        target: { field: "overallComment" },
        text: "총평입니다.",
        problems: ["문장 3개로 씁니다"],
        sentences: 3,
      },
      {
        target: { field: "reason", index: 2 },
        text: "긴 해설입니다.",
        problems: ["120자 이내로 씁니다"],
        sentences: 2,
      },
    ];

    // Act
    const prompt = buildRepairPrompt("## 작업\n원래 프롬프트", entries);

    // Assert
    expect(prompt.startsWith("## 작업\n원래 프롬프트")).toBe(true);
    expect(prompt).toContain("- items index 2 (reason)");
    // 이전 문장은 싣지 않는다(낮은 모델은 보여 준 문장을 따라 쓴다)
    expect(prompt).not.toContain("긴 해설입니다.");
    expect(prompt).toContain("  - 120자 이내로 씁니다");
    expect(prompt).toContain('  "overallComment": ["1문장", "2문장", "3문장"]');
    expect(prompt).toContain(
      '    { "index": 2, "reason": ["1문장", "2문장"] }'
    );
  });
});

describe("buildJeongsiSystemPrefix", () => {
  it("지원 성향별 해설 기준을 prefix 에 담는다", () => {
    // Arrange / Act
    const prefix = buildJeongsiSystemPrefix({
      target: "컴퓨터공학과",
      targetKind: "department",
      region: "서울",
      risk: "안정",
    });

    // Assert
    expect(prefix).toContain("희망 학과: 컴퓨터공학과");
    expect(prefix).toContain("희망 지역: 서울");
    expect(prefix).toContain("지원 성향: 안정");
    expect(prefix).toContain("적정 2장·안정 1장의 배분");
  });

  it("계열 단위 희망은 계열로 표기한다", () => {
    // Arrange / Act
    const prefix = buildJeongsiSystemPrefix({
      target: "공학계열",
      targetKind: "field",
      region: "전국",
      risk: "공격",
    });

    // Assert
    expect(prefix).toContain("희망 계열: 공학계열");
    expect(prefix).toContain("상향 2장·적정 1장의 배분");
  });
});

describe("합격 난이도 해석 가드", () => {
  it("PART 3 은 격차를 코드가 쓴 문구로 주고 환산 총점 대비 %는 싣지 않는다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: { notices: [], blockedByRestrictions: false },
      items: [
        {
          tier: "적정",
          university: "나대학교",
          department: "소프트웨어학과",
          group: "나",
          quota: 18,
          convertedScore: 905.2,
          referenceCut: 901.3,
          gapRatio: 0.43,
          percentileGap: 0.7,
          chance: "보통",
        },
      ],
    });

    // Assert
    expect(prompt).toContain("격차 문구");
    expect(prompt).toContain("기준컷을 0.7백분위점 넘겨");
    expect(prompt).not.toContain("0.43%");
  });
});

describe("후보 선정 사실 주입", () => {
  it("notices 가 있으면 프롬프트에 사실로 싣는다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: {
        notices: ["같은 계열그룹까지 넓혀 비교했습니다."],
        blockedByRestrictions: false,
      },
      items: [],
    });

    // Assert
    expect(prompt).toContain("## 후보 선정 과정에서 알아야 할 사실");
    expect(prompt).toContain("- 같은 계열그룹까지 넓혀 비교했습니다.");
    expect(prompt).toContain("화면에 안내 문구로 그대로 표시됩니다");
  });

  it("지원 불가 상태면 그 사실을 가장 먼저 서술하도록 지정한다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: {
        notices: [
          "희망하신 의예과은(는) 수능 선택과목 제한으로 지원할 수 있는 모집단위가 없습니다.",
        ],
        blockedByRestrictions: true,
      },
      items: [],
    });

    // Assert: 사실·사유를 먼저 쓰고, 멈출 자리를 지정한다
    expect(prompt).toContain(
      "해설은 위 사실과 그 사유를 가장 먼저 서술하고, 어떤 응시 과목 조건이 지원을 막고 있는지까지 설명한 뒤 마무리합니다."
    );
    expect(prompt).toContain(
      "서술 범위는 위 안내 문구에 적힌 내용까지로 둡니다."
    );
    expect(prompt).toContain(
      "지원 가능 대학 목록이 비어 있습니다. 아래 사실을 근거로 지원 전략 총평 1개만 작성합니다."
    );
    // PART 3 은 총평만 요청하므로 항목 배열을 요구하지 않는다
    expect(prompt).not.toContain('"items"');
  });

  it("notices 가 비면 선정 사실 블록을 넣지 않는다", () => {
    // Arrange / Act
    const prompt = buildRecommendationPrompt({
      areaSummary: buildAreaSummaryLine(rows),
      overallFacts: SCORE_FACTS,
      risk: "균형",
      selection: { notices: [], blockedByRestrictions: false },
      items: [],
    });

    // Assert
    expect(prompt).not.toContain("후보 선정 과정에서 알아야 할 사실");
  });
});

describe("assignRotatingTopics", () => {
  it("항목마다 소재를 돌려 배정하고 바로 앞 항목과 겹치지 않게 한다", () => {
    // Arrange
    const candidates = [
      ["컷", "위치", "모집군"],
      ["컷", "위치", "모집군"],
      [null, "위치", "모집군"],
      ["컷", "위치", "모집군"],
    ];

    // Act
    const topics = assignRotatingTopics(candidates);

    // Assert
    expect(topics).toEqual(["컷", "위치", "모집군", "컷"]);
  });

  it("쓸 수 없는 소재는 건너뛴다", () => {
    // Arrange & Act
    const topics = assignRotatingTopics([
      [null, "위치"],
      [null, "위치"],
    ]);

    // Assert
    expect(topics).toEqual(["위치", "위치"]);
  });
});

describe("assignChanceMeanings", () => {
  it("같은 라벨이 이어지면 정해진 해석 문구를 번갈아 배정한다", () => {
    // Arrange
    const items = [
      { chance: "높음" as const },
      { chance: "높음" as const },
      { chance: "보통" as const },
    ];

    // Act
    const meanings = assignChanceMeanings(items);

    // Assert
    expect(meanings).toEqual([
      "비교적 높은 확률로 결과를 기대할 수 있는 라인입니다",
      "결과를 비교적 높은 확률로 기대할 수 있는 위치입니다",
      "당해 지원자 분포에 따라 결과가 갈리는 구조입니다",
    ]);
  });
});

describe("composeCombinationStrategy", () => {
  it("엔진이 더한 대안 조합도 선정 기준과 맞바꿈 문장으로 감싼다", () => {
    // Act
    const strategy = composeCombinationStrategy(
      "희망 우선형 대안",
      "세 칸 모두 다른 조합과 겹치지 않습니다."
    );

    // Assert: 기준 + 차이 + 맞바꿈의 세 문장
    expect(
      strategy.startsWith(
        "앞선 조합에 쓰인 대학을 빼고 희망 우선형 기준으로 다시 고른 조합입니다."
      )
    ).toBe(true);
    expect(strategy).toContain(
      "앞선 조합과 다른 대학으로 비교할 선택지를 얻는 대신"
    );
  });

  it("라벨 중간에 지원처 없음 설명이 있어도 정해진 문장을 찾는다", () => {
    // Act
    const strategy = composeCombinationStrategy(
      "희망 우선형 (나·다군 지원처 없음) 대안",
      "가군 안정 원서에 가대학교를 두었습니다."
    );

    // Assert
    expect(strategy).toBe(
      "앞선 조합에 쓰인 대학을 빼고 희망 우선형 기준으로 다시 고른 조합입니다. 가군 안정 원서에 가대학교를 두었습니다. 앞선 조합과 다른 대학으로 비교할 선택지를 얻는 대신, 희망 우선형에서 먼저 고른 대학은 빠진 선택입니다."
    );
  });

  it("정해진 선정 기준과 맞바꿈 문장 사이에 해석 문장을 넣는다", () => {
    // Arrange & Act
    const strategy = composeCombinationStrategy(
      "합격 여유형",
      "다군 안정 원서에 서경대학교 미래융합학부를 두어 결과를 받쳐 줍니다."
    );

    // Assert
    expect(strategy).toBe(
      "기준컷 대비 여유가 큰 곳을 먼저 고른 조합입니다. 다군 안정 원서에 서경대학교 미래융합학부를 두어 결과를 받쳐 줍니다. 합격 안정성을 얻는 대신, 대학·학과 선호는 덜 따지는 선택입니다."
    );
  });

  it("빈 군 표시가 붙은 라벨도 정해진 문장을 붙인다", () => {
    // Arrange & Act
    const strategy = composeCombinationStrategy(
      "합격 여유형 (다군 지원처 없음)",
      "해석입니다."
    );

    // Assert
    expect(strategy).toBe(
      "기준컷 대비 여유가 큰 곳을 먼저 고른 조합입니다. 해석입니다. 합격 안정성을 얻는 대신, 대학·학과 선호는 덜 따지는 선택입니다."
    );
  });

  it("정해진 문장이 없는 라벨은 해석 문장만 쓴다", () => {
    // Arrange & Act & Assert
    expect(composeCombinationStrategy("기타 조합", "해석입니다.")).toBe(
      "해석입니다."
    );
  });
});

describe("isFullyDistinct", () => {
  it("모든 칸이 다른 조합에 없을 때만 참이다", () => {
    // Arrange
    const slot = (university: string) => ({
      group: "가" as const,
      university,
      department: "컴퓨터공학과",
      tier: "적정" as const,
      chance: "보통" as const,
    });
    const shared = {
      id: "a",
      label: "희망 우선형",
      slots: [slot("가대학교"), { ...slot("나대학교"), group: "나" as const }],
    };
    const partly = {
      id: "b",
      label: "대학 우선형",
      slots: [slot("가대학교"), { ...slot("라대학교"), group: "나" as const }],
    };
    const unique = {
      id: "c",
      label: "합격 여유형",
      slots: [slot("마대학교"), { ...slot("바대학교"), group: "나" as const }],
    };
    const all = [shared, partly, unique];

    // Act & Assert
    expect(isFullyDistinct(unique, all)).toBe(true);
    expect(isFullyDistinct(partly, all)).toBe(false);
  });
});

describe("composeFullyDistinctSentence", () => {
  it("지원처가 없는 군이 있으면 칸 수를 그대로 적는다", () => {
    // Arrange / Act
    const twoSlots = composeFullyDistinctSentence(
      "희망 우선형 (다군 지원처 없음)",
      2
    );
    const threeSlots = composeFullyDistinctSentence("합격 여유형", 3);

    // Assert
    expect(twoSlots).toBe(
      "두 칸 모두 다른 조합과 겹치지 않아, 희망 우선형 기준만으로 고른 별도의 선택지입니다."
    );
    expect(threeSlots).toBe(
      "세 칸 모두 다른 조합과 겹치지 않아, 합격 여유형 기준만으로 고른 별도의 선택지입니다."
    );
  });
});

describe("composeOverlapSentence", () => {
  it("이 조합에만 있는 칸이 없으면 가장 비슷한 조합과 다른 칸을 짚는다", () => {
    // Arrange
    const slot = (group: "가" | "나" | "다", university: string) => ({
      group,
      tier: "안정" as const,
      chance: "높음" as const,
      university,
      department: "전자공학과",
    });
    const combos = [
      {
        id: "1",
        label: "대학 우선형",
        slots: [slot("가", "A대학교"), slot("다", "B대학교")],
      },
      {
        id: "2",
        label: "합격 여유형",
        slots: [slot("가", "A대학교"), slot("다", "C대학교")],
      },
      {
        id: "3",
        label: "희망 우선형",
        slots: [slot("가", "D대학교"), slot("다", "B대학교")],
      },
      {
        id: "4",
        label: "반영방식 우선형",
        slots: [slot("가", "D대학교"), slot("다", "C대학교")],
      },
    ];

    // Act
    const sentence = composeOverlapSentence(combos[0], combos);

    // Assert
    expect(sentence).toBe(
      "합격 여유형과 비교하면 다군(B대학교 전자공학과) 칸만 다르고, 나머지 칸은 같습니다."
    );
  });
});
