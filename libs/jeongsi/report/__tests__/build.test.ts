import {
  describeCutDirection,
  findReversedBurden,
  composeAreaCommentFallback,
  findEnglishPercentile,
  findWrongAverageScope,
  findUnsupportedSoleClaim,
  buildJeongsiReport,
  buildRecommendationNotices,
  composeSnipingNotice,
  findWrongSlotTier,
  formatRatioSummary,
  withTopicParticle,
  type JeongsiBuildProgress,
  type JeongsiGeminiClient,
} from "../build";
import { splitSentences } from "../commentary-validation";
import { SINGLE_COMBINATION_SENTENCE } from "../prompts";
import type { RecommendationPromptEntry } from "../prompts";
import { JEONGSI_COMMENTARY_FALLBACK } from "../schemas";
import { JEONGSI_SECTION_ORDER } from "../../report-types";
import type {
  JeongsiCombinationSection,
  JeongsiRecommendationSection,
  JeongsiScoreAnalysisSection,
  JeongsiUniversityDetailSection,
  JeongsiUniversityMatchSection,
} from "../../report-types";
import type {
  ConversionFormula,
  GradeScoreTable,
  JeongsiAdmissionPlan,
  JeongsiAnalysis,
  PlanEvaluation,
} from "../../types";

// ─── 픽스처 (engine 미완성 상태이므로 타입만 보고 직접 구성) ───

const gradeTable = (top: number, step: number): GradeScoreTable => ({
  1: top,
  2: top - step,
  3: top - step * 2,
  4: top - step * 3,
  5: top - step * 4,
  6: top - step * 5,
  7: top - step * 6,
  8: top - step * 7,
  9: top - step * 8,
});

const formula: ConversionFormula = {
  formulaVersion: 1,
  totalScore: 1000,
  ratios: { korean: 30, math: 35, english: 10, inquiry: 25 },
  metric: {
    korean: "standard",
    math: "standard",
    inquiry: "convertedStandard",
  },
  inquiryCount: 2,
  english: { type: "ratioIncluded", scoreByGrade: gradeTable(100, 2) },
  history: { type: "subtract", penaltyByGrade: gradeTable(0, -1) },
  bonus: { mathElective: { 미적분: { type: "percent", value: 5 } } },
  baseMax: { korean: 150, math: 150, inquiry: 70 },
};

const createPlan = (
  university: string,
  department: string,
  group: JeongsiAdmissionPlan["group"]
): JeongsiAdmissionPlan => ({
  id: `${university}-${department}-${group}`,
  admissionYear: 2027,
  university,
  campus: undefined,
  department,
  category: "공학",
  region: "서울",
  group,
  quota: 24,
  formula,
  restrictions: { math: ["미적분", "기하"], inquiry: "과탐1과목이상" },
});

const createEvaluation = (
  plan: JeongsiAdmissionPlan,
  convertedScore: number,
  cut: number,
  percentileGap: number,
  tier: PlanEvaluation["tier"],
  chance: PlanEvaluation["chance"],
  advantageScore: number,
  history: PlanEvaluation["cutHistory"] = [],
  competitionRate: number | null = null
): PlanEvaluation => ({
  plan,
  eligible: true,
  convertedScore,
  weightedPercentile: 94.2,
  simpleAveragePercentile: 93.7,
  referenceCut: { metric: "convertedScore", value: cut },
  competitionRate,
  cutHistory: history,
  // 판정 격차 (환산점수 입결이라 만점 대비 %). 지표 단위 차이는 환산점수 점이다.
  gapRatio: percentileGap,
  gapPoints: Math.round((convertedScore - cut) * 1000) / 1000,
  resultYears: history.length > 0 ? history.map((entry) => entry.year) : [2026],
  quotaChange: null,
  additionalPass: null,
  safeCapped: false,
  safeCapReasons: [],
  pastGroups: [],
  finalQuotaChange: null,
  withinRecommendRange: true,
  historicalPassRate: null,
  latestAdmitCuts: null,
  sensitivity: 9.1,
  tier,
  chance,
  advantageScore,
});

const 상향Plan = createPlan("가대학교", "컴퓨터공학부", "가");
const 적정Plan = createPlan("나대학교", "소프트웨어학과", "나");
const 안정Plan = createPlan("다대학교", "정보통신공학과", "다");

// 엔진이 최신 학년도 우선으로 담아 주더라도 리포트는 연도 순으로 싣는다.
const 상향Eval = createEvaluation(
  상향Plan,
  912.4,
  920.1,
  -0.84,
  "상향",
  "낮음",
  88,
  [
    { year: 2026, cut: 920.1 },
    { year: 2024, cut: 915.2 },
  ],
  5.3
);
const 적정Eval = createEvaluation(
  적정Plan,
  905.2,
  901.3,
  0.43,
  "적정",
  "보통",
  76
);
const 안정Eval = createEvaluation(
  안정Plan,
  898.7,
  880.5,
  2.07,
  "안정",
  "높음",
  64
);

const analysis: JeongsiAnalysis = {
  input: {
    score: {
      examYear: 2026,
      korean: { elective: "언어와매체", standardScore: 131, percentile: 93 },
      math: { elective: "미적분", standardScore: 138, percentile: 97 },
      english: { grade: 2 },
      inquiry1: { subject: "물리학I", standardScore: 66, percentile: 91 },
      inquiry2: { subject: "지구과학I", standardScore: 68, percentile: 94 },
      history: { grade: 3 },
    },
    preference: {
      target: "컴퓨터공학과",
      targetKind: "department",
      region: "서울",
      risk: "균형",
    },
  },
  diagnosis: {
    areas: [
      {
        area: "inquiry",
        percentile: 92.5,
        standardScore: 134,
        rank: 3,
        deviation: -1.2,
      },
      {
        area: "math",
        percentile: 97,
        standardScore: 138,
        rank: 1,
        deviation: 3.3,
      },
      {
        area: "english",
        percentile: 89,
        standardScore: null,
        rank: 4,
        deviation: -4.7,
      },
      {
        area: "korean",
        percentile: 93,
        standardScore: 131,
        rank: 2,
        deviation: -0.7,
      },
    ],
    averagePercentile: 93.7,
    totalStandardScore: 403,
    strengths: ["math"],
    weaknesses: ["english"],
  },
  selection: {
    poolStage: 1,
    moderateBandSubstituted: false,
    blockedByRestrictions: false,
  },
  ineligiblePlans: [],
  advantageousPlans: [상향Eval, 적정Eval],
  recommendations: {
    상향: [상향Eval],
    적정: [적정Eval],
    안정: [안정Eval],
  },
  sniping: [],
  combinations: [
    {
      id: "combo-balanced",
      label: "균형 조합",
      가: 상향Eval,
      나: 적정Eval,
      다: 안정Eval,
      recommended: true,
      matchesRiskAllocation: true,
    },
  ],
};

const createClient = (
  handler: (prompt: string) => Promise<unknown>
): JeongsiGeminiClient =>
  ({
    call: async <T>(options: { prompt: string }) => {
      const data = (await handler(options.prompt)) as T;
      return { data, tokensUsed: { input: 0, output: 0 } };
    },
  }) as JeongsiGeminiClient;

const findSection = <T extends { sectionId: string }>(
  sections: { sectionId: string }[],
  sectionId: T["sectionId"]
): T => sections.find((section) => section.sectionId === sectionId) as T;

describe("buildJeongsiReport — AI 호출 전면 실패", () => {
  it("모든 해설 호출이 실패해도 5개 섹션이 담긴 리포트를 반환한다", async () => {
    // Arrange: 모든 Gemini 호출이 503으로 소진된 상황
    const client = createClient(() =>
      Promise.reject(new Error("503 model overloaded"))
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-1",
      createdAt: "2026-10-12T00:00:00.000Z",
    });

    // Assert
    expect(content.sections.map((section) => section.sectionId)).toEqual(
      JEONGSI_SECTION_ORDER
    );
    expect(content.meta).toEqual({
      reportId: "report-1",
      input: analysis.input,
      createdAt: "2026-10-12T00:00:00.000Z",
      version: 2,
    });
  });

  it("해설 필드는 폴백 문구로 채우고 수치는 코드 계산값을 유지한다", async () => {
    // Arrange
    const client = createClient(() => Promise.reject(new Error("timeout")));

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-2",
    });

    // Assert: 해설은 폴백
    const score = findSection<JeongsiScoreAnalysisSection>(
      content.sections,
      "jeongsiScoreAnalysis"
    );
    // 총평 폴백도 코드가 판정한 해석 문장으로 채운다
    expect(score.overallComment).toContain(
      "국어, 수학, 탐구 평균 백분위 93.7점, 표준점수 합 403점으로, 국어, 수학, 탐구 모두 응시자 상위 약 9% 안"
    );
    // 강점·약점 폴백도 그 영역의 실제 성적으로 쓴다(안내문 대신)
    expect(score.strengthComment).toBe(
      "수학 백분위 97점(상위 약 3%)은 국어, 수학, 탐구 중 1순위로, 평균 대비 +3.3점 앞선 강점입니다. 수학 반영비율이 높은 대학에서 환산점수가 유리하게 잡히므로, 수학 비중이 큰 대학을 원서 후보로 먼저 살피는 편이 합리적입니다."
    );
    expect(score.weaknessComment).not.toBe(
      JEONGSI_COMMENTARY_FALLBACK.scoreWeakness
    );

    // Assert: 수치는 엔진 산출물 그대로
    expect(score.averagePercentile).toBe(93.7);
    expect(score.totalStandardScore).toBe(403);
    expect(score.rows.map((row) => row.area)).toEqual([
      "korean",
      "math",
      "english",
      "inquiry",
    ]);
    expect(score.rows[1]).toEqual({
      area: "math",
      label: "수학",
      subjectName: "미적분",
      standardScore: 138,
      percentile: 97,
      grade: null,
      rank: 1,
      deviation: 3.3,
    });
    expect(score.rows[2].grade).toBe(2);
    expect(score.rows[3].subjectName).toBe("물리학I, 지구과학I");

    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    expect(recommendation.groups.map((group) => group.tier)).toEqual([
      "상향",
      "적정",
      "안정",
    ]);
    expect(recommendation.groups[0].items[0]).toMatchObject({
      university: "가대학교",
      department: "컴퓨터공학부",
      group: "가",
      quota: 24,
      convertedScore: 912.4,
      referenceCut: 920.1,
      gapRatio: -0.84,
      // 학생 값 = 기준컷 + gapRatio × 만점 / 100 (엔진이 실제로 비교한 값)
      cutComparison: {
        metric: "convertedScore",
        studentValue: 911.7,
        referenceCut: 920.1,
        previousYear: { year: 2026, cut: 920.1 },
      },
      chance: "낮음",
      // 코멘트는 코드가 첫머리 구절·격차·정해진 해석 문구로 잇는다
      comment:
        "컷 흐름이 상승(2024 915.2 → 2026 920.1)인 곳으로 기준컷에 환산점수 7.7점 모자라, 단순 지원만으로는 결과를 기대하기 쉽지 않은 수준입니다.",
    });
    // 판정 근거는 PART 5 와 같은 값을 싣는다
    expect(recommendation.groups[0].items[0].judgement).toMatchObject({
      unitKey: 상향Plan.id,
      tier: "상향",
      chance: "낮음",
      metric: "convertedScore",
      referenceCut: 920.1,
      gapPoints: -7.7,
    });
  });
});

describe("buildJeongsiReport — AI 응답 반영", () => {
  const respondBySection = (prompt: string): Record<string, unknown> | null => {
    if (prompt.includes("해설 3개(총평, 강점, 약점)")) {
      return {
        overallComment: ["총평 1입니다.", "총평 2입니다.", "총평 3입니다."],
        strengthComment: ["강점 1입니다.", "강점 2입니다."],
        weaknessComment: ["약점 1입니다.", "약점 2입니다."],
      };
    }
    if (prompt.includes("반영방식이 유리한 대학")) {
      return {
        overallComment: [
          "반영방식 1입니다.",
          "반영방식 2입니다.",
          "반영방식 3입니다.",
        ],
        items: [
          {
            index: 1,
            reason: ["두 번째 대학 해설입니다.", "탐구 부담이 작습니다."],
          },
          {
            index: 0,
            reason: ["첫 번째 대학 해설입니다.", "수학 비율이 높습니다."],
          },
        ],
      };
    }
    if (prompt.includes("지원 가능 대학")) {
      return {
        overallComment: ["전략 1입니다.", "전략 2입니다.", "전략 3입니다."],
        items: [
          {
            index: 2,
            comment:
              "안정 코멘트로, 비교적 높은 확률로 결과를 기대할 수 있는 라인입니다.",
          },
        ],
      };
    }
    if (prompt.includes("지원 조합")) {
      return {
        overallComment: "조합 가이드입니다.",
        items: [{ index: 0, strategy: "조합 전략입니다." }],
      };
    }
    return { items: [{ index: 0, reason: "상세 추천 이유입니다." }] };
  };

  it("index 순서가 뒤섞여도 항목별 해설을 올바른 항목에 매핑한다", async () => {
    // Arrange
    const client = createClient((prompt) =>
      Promise.resolve(respondBySection(prompt))
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-3",
    });

    // Assert
    const match = findSection<JeongsiUniversityMatchSection>(
      content.sections,
      "jeongsiUniversityMatch"
    );
    // PART 2 총평은 모델 응답이 아니라 코드가 실제 점수로 쓴다
    expect(match.overallComment).toMatch(/^목록 2곳은/);
    // 대학별 설명은 실제 점수로 코드가 쓰고, 끝에 컨설턴트 판단 문장을 붙인다
    const reasons = match.items.map((item) => item.reason);
    expect(reasons[0]).toMatch(/^이 대학 환산식으로 내 점수는 912\.4점/);
    expect(reasons[1]).toMatch(/^이 대학 환산식으로 내 점수는 905\.2점/);
    // 판단 문장도 영역 서술이 아니라 반영비율 득실의 목록 안 비교로 쓴다
    expect(reasons.join(" ")).toContain("반영비율로");
  });

  it("PART 3 코멘트는 AI 응답과 관계없이 코드가 잇는다", async () => {
    // Arrange: 추천 3건 중 index 2 에 AI 코멘트가 와도 쓰지 않는다
    const client = createClient((prompt) =>
      Promise.resolve(respondBySection(prompt))
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-4",
    });

    // Assert
    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    const comments = recommendation.groups.map(
      (group) => group.items[0].comment
    );
    expect(comments).toEqual([
      "컷 흐름이 상승(2024 915.2 → 2026 920.1)인 곳으로 기준컷에 환산점수 7.7점 모자라, 단순 지원만으로는 결과를 기대하기 쉽지 않은 수준입니다.",
      "나군 적정 원서로 기준컷을 환산점수 3.9점 넘겨, 당해 지원자 분포에 따라 결과가 갈리는 구조입니다.",
      "24명을 뽑는 모집단위로 기준컷을 환산점수 18.2점 넘겨, 비교적 높은 확률로 결과를 기대할 수 있는 라인입니다.",
    ]);
  });

  it("PART 1·3·4 해설을 병렬로 호출하고 PART 2·5 는 호출하지 않는다", async () => {
    // Arrange
    let active = 0;
    let maxActive = 0;
    const client: JeongsiGeminiClient = {
      call: async <T>() => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return { data: null as T, tokensUsed: { input: 0, output: 0 } };
      },
    };

    // Act
    await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-5",
    });

    // Assert: PART 2·5 는 코드가 실제 점수·판정 문장으로 쓰고 모델을 부르지 않는다
    expect(maxActive).toBe(JEONGSI_SECTION_ORDER.length - 2);
  });

  it("진행률 콜백을 파트마다 한 번씩 호출한다", async () => {
    // Arrange
    const events: JeongsiBuildProgress[] = [];
    const client = createClient(() => Promise.resolve(null));

    // Act
    await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-6",
      onProgress: (progress) => events.push(progress),
    });

    // Assert
    expect(events).toHaveLength(JEONGSI_SECTION_ORDER.length);
    expect(events.at(-1)?.percent).toBe(100);
    expect(new Set(events.map((event) => event.sectionId)).size).toBe(
      JEONGSI_SECTION_ORDER.length
    );
  });

  it("호출 실패 파트의 진행률 status 는 fallback 으로 보고한다", async () => {
    // Arrange
    const events: JeongsiBuildProgress[] = [];
    const client = createClient((prompt) =>
      prompt.includes("지원 조합")
        ? Promise.reject(new Error("503"))
        : Promise.resolve(null)
    );

    // Act
    await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-7",
      onProgress: (progress) => events.push(progress),
    });

    // Assert
    const fallbacks = events.filter((event) => event.status === "fallback");
    expect(fallbacks.map((event) => event.sectionId)).toEqual([
      "jeongsiCombination",
    ]);
  });
});

describe("buildJeongsiReport — 해설 검증과 다시 쓰기", () => {
  it("규칙을 어긴 칸만 고칠 점과 함께 다시 요청해 고친 문장을 쓴다", async () => {
    // Arrange: PART 3 총평이 1문장으로 와 규칙(3문장)을 어긴다
    // (PART 2 총평은 모델을 부르지 않고 코드가 실제 점수로 쓴다 — specs/014 D1)
    const repairPrompts: string[] = [];
    const client = createClient((prompt) => {
      if (!prompt.includes("지원 가능 대학")) {
        return Promise.resolve(null);
      }
      if (prompt.includes("## 다시 쓰기")) {
        repairPrompts.push(prompt);
        return Promise.resolve({
          overallComment: [
            "고친 1입니다.",
            "고친 2입니다.",
            "가대학교는 신중히 봅니다.",
          ],
        });
      }
      return Promise.resolve({ overallComment: "짧은 총평입니다." });
    });

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r1",
    });

    // Assert
    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    expect(recommendation.overallComment).toBe(
      "고친 1입니다. 고친 2입니다. 가대학교는 신중히 봅니다."
    );
    const match = findSection<JeongsiUniversityMatchSection>(
      content.sections,
      "jeongsiUniversityMatch"
    );
    expect(match.items[0].reason).toMatch(
      // PART 2 대학별 설명은 AI 문장이 아니라 환산식 실제 점수로 코드가 쓴다(specs/014 D1)
      /^이 대학 환산식으로 내 점수는 912\.4점\(만점 1000점\)입니다\. 기준컷과 비교하면 환산점수 −7\.7점으로 상향에 해당합니다\./
    );
    expect(repairPrompts).toHaveLength(1);
    expect(repairPrompts[0]).toContain("  - 문장 3개로 씁니다");
  });

  it("PART 3 은 AI 총평만 쓰고 AI 코멘트는 코드 문장으로 둔다", async () => {
    // Arrange: AI 가 해석 문구 없는 코멘트를 함께 보낸다
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("지원 가능 대학")
          ? {
              overallComment: [
                "전략 1입니다.",
                "전략 2입니다.",
                "가대학교는 신중히 봅니다.",
              ],
              items: [
                { index: 0, comment: "상향 원서로 도전해 볼 만합니다." },
                { index: 1, comment: "적정 원서로 무난합니다." },
                { index: 2, comment: "안정 원서로 든든합니다." },
              ],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r2",
    });

    // Assert
    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    expect(recommendation.groups[2].items[0].comment).toBe(
      "24명을 뽑는 모집단위로 기준컷을 환산점수 18.2점 넘겨, 비교적 높은 확률로 결과를 기대할 수 있는 라인입니다."
    );
    expect(recommendation.overallComment).toBe(
      "전략 1입니다. 전략 2입니다. 가대학교는 신중히 봅니다."
    );
  });

  it("총평이 문장을 덧붙였으면 앞 문장과 결론 문장을 남긴다", async () => {
    // Arrange: 두 번 모두 4문장
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("지원 가능 대학")
          ? {
              overallComment: [
                "하나입니다.",
                "둘입니다.",
                "셋입니다.",
                "가대학교는 신중히 봅니다.",
              ],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r3",
    });

    // Assert
    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    expect(recommendation.overallComment).toBe(
      "하나입니다. 둘입니다. 가대학교는 신중히 봅니다."
    );
  });

  it("PART 5 추천 이유는 AI 응답과 관계없이 코드 판정 문장과 격차 문장으로 쓴다", async () => {
    // Arrange
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("대학별 상세 분석")
          ? {
              items: [
                { index: 0, reason: "수학을 35% 반영해 강점이 살아납니다." },
              ],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r4",
    });

    // Assert
    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items[0].reason).not.toContain("수학을 35% 반영해");
    // 판정 + 격차·합격 가능성 + 원서 운용 조언
    expect(splitSentences(detail.items[0].reason)).toHaveLength(3);
    expect(detail.items[0].reason).toMatch(
      / 기준컷에 환산점수 7\.7점 모자라, 단순 지원만으로는 결과를 기대하기 쉽지 않은 수준입니다\. 가군 상향 원서로 둔다면, 나머지 나군과 다군에는 적정이나 안정 원서를 두어 결과를 받쳐야 합니다\.$/
    );
  });

  it("한 섹션 안에서 똑같은 문장이 나오면 그 항목의 다른 판정 문장으로 바꾼다", async () => {
    // Arrange: PART 2 두 항목의 해설이 글자까지 같다
    const sameReason = [
      "수학 비율이 높아 유리합니다.",
      "탐구 부담도 작습니다.",
    ];
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("반영방식이 유리한 대학")
          ? {
              overallComment: [
                "총평 1입니다.",
                "총평 2입니다.",
                "총평 3입니다.",
              ],
              items: [
                { index: 0, reason: sameReason },
                { index: 1, reason: sameReason },
              ],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r5",
    });

    // Assert
    const match = findSection<JeongsiUniversityMatchSection>(
      content.sections,
      "jeongsiUniversityMatch"
    );
    const sentences = match.items.flatMap((item) =>
      splitSentences(item.reason)
    );
    // PART 2 설명은 코드가 실제 점수로 쓰고, 대학 사이에 같은 문장을 두지 않는다
    expect(match.items[0].reason).not.toContain(sameReason[0]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("입력과 다른 수치를 쓴 문장은 판정 문장으로 바꾼다", async () => {
    // Arrange: PART 5 해설이 입력에 없는 표준점수를 쓴다
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("대학별 상세 분석")
          ? {
              items: [
                {
                  index: 0,
                  reason: "수학 표준점수 151점이 그대로 반영됩니다.",
                },
              ],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-r6",
    });

    // Assert
    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items[0].reason).not.toContain("151");
    // 판정 + 격차·합격 가능성 + 원서 운용 조언
    expect(splitSentences(detail.items[0].reason)).toHaveLength(3);
  });
});

describe("buildJeongsiReport — PART 4 조합 문장", () => {
  it("조합이 하나뿐이면 다른 조합과 겹치지 않는다고 쓰지 않는다", async () => {
    // Arrange: 픽스처 조합은 1개다
    const client = createClient(() => Promise.resolve(null));

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-single-combo",
    });

    // Assert
    const combination = findSection<JeongsiCombinationSection>(
      content.sections,
      "jeongsiCombination"
    );
    expect(combination.combinations[0].strategy).toContain(
      SINGLE_COMBINATION_SENTENCE
    );
    expect(combination.combinations[0].strategy).not.toContain("겹치지 않아");
  });

  it("기본 배분과 같은 조합이 없으면 성향에 맞춘 조합이라는 총평을 쓰지 않는다", async () => {
    // Arrange: 균형 성향인데 조합이 상향·적정 두 장뿐(안정 없음)
    const unmatched: JeongsiAnalysis = {
      ...analysis,
      combinations: [
        {
          id: "combo-unmatched",
          label: "희망 우선형 (다군 지원처 없음)",
          가: 상향Eval,
          나: 적정Eval,
          다: null,
          recommended: true,
          matchesRiskAllocation: false,
        },
      ],
    };
    const client = createClient((prompt) =>
      Promise.resolve(
        prompt.includes("지원 조합")
          ? {
              overallComment: [
                "정시 원서 구조를 전제로 조합을 고릅니다.",
                "균형 지원 성향에 맞춰 상향과 적정으로 구성한 조합입니다.",
                "희망 학과를 먼저 따지는 편이 좋습니다.",
              ],
              items: [],
            }
          : null
      )
    );

    // Act
    const content = await buildJeongsiReport(unmatched, {
      geminiClient: client,
      reportId: "report-risk-fit",
    });

    // Assert
    const combination = findSection<JeongsiCombinationSection>(
      content.sections,
      "jeongsiCombination"
    );
    expect(combination.overallComment).not.toMatch(/성향에\s*맞/);
    expect(combination.overallComment).toContain("기본 배분");
  });
});

describe("buildJeongsiReport — 코드 계산값 보호", () => {
  it("AI 응답에 수치 필드가 섞여 와도 섹션 수치는 엔진 값을 유지한다", async () => {
    // Arrange: AI 가 환산점수·평균 백분위·행 데이터를 함께 돌려준 상황
    const client = createClient(() =>
      Promise.resolve({
        overallComment: "총평입니다.",
        strengthComment: "강점입니다.",
        weaknessComment: "약점입니다.",
        averagePercentile: 11.1,
        totalStandardScore: 1,
        rows: [],
        items: [
          {
            index: 0,
            reason: ["수학 비율이 높아 유리합니다.", "탐구 부담도 작습니다."],
            convertedScore: 999.9,
            referenceCut: 1,
            gapRatio: 99,
            chance: "높음",
            advantageScore: 100,
          },
        ],
      })
    );

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-8",
    });

    // Assert: 수치는 모두 엔진 산출물
    const score = findSection<JeongsiScoreAnalysisSection>(
      content.sections,
      "jeongsiScoreAnalysis"
    );
    expect(score.averagePercentile).toBe(93.7);
    expect(score.totalStandardScore).toBe(403);
    expect(score.rows).toHaveLength(4);

    const match = findSection<JeongsiUniversityMatchSection>(
      content.sections,
      "jeongsiUniversityMatch"
    );
    expect(match.items[0].advantageScore).toBe(88);
    expect(match.items[0].reason).toMatch(
      // PART 2 대학별 설명은 AI 문장이 아니라 환산식 실제 점수로 코드가 쓴다(specs/014 D1)
      /^이 대학 환산식으로 내 점수는 912\.4점\(만점 1000점\)입니다\. 기준컷과 비교하면 환산점수 −7\.7점으로 상향에 해당합니다\./
    );

    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items[0].convertedScore).toBe(912.4);
    expect(detail.items[0].referenceCut).toBe(920.1);
    expect(detail.items[0].chance).toBe("낮음");
  });

  it("엔진이 담아 준 경쟁률과 컷 추이를 연도 순으로 싣는다", async () => {
    // Arrange
    const client = createClient(() => Promise.resolve(null));

    // Act
    const content = await buildJeongsiReport(analysis, {
      geminiClient: client,
      reportId: "report-9",
    });

    // Assert
    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items[0].competitionRate).toBe(5.3);
    expect(detail.items[0].cutHistory).toEqual([
      { year: 2024, cut: 915.2 },
      { year: 2026, cut: 920.1 },
    ]);
    expect(detail.items[0].totalScore).toBe(1000);
    expect(detail.items[0].ratioSummary).toBe("국30, 수35, 영10, 탐25");
    expect(detail.items[0].bonusSummary).toBe("수학 미적분 +5%");
    expect(detail.items[0].restrictionSummary).toBe(
      "수학 미적분, 기하 중 응시 필수 / 탐구 과탐1과목이상"
    );

    // 입결이 없는 전형은 null 로 남는다
    expect(detail.items[1].competitionRate).toBeNull();
    expect(detail.items[1].cutHistory).toEqual([]);
  });
});

describe("buildJeongsiReport — geminiClient 미주입", () => {
  it("AI 없이도 코드 계산값과 폴백 문구로 리포트를 완성한다", async () => {
    // Arrange: AI 비활성 경로 (geminiClient 를 넘기지 않는다)

    // Act
    const content = await buildJeongsiReport(analysis, {
      reportId: "report-10",
    });

    // Assert
    expect(content.sections.map((section) => section.sectionId)).toEqual(
      JEONGSI_SECTION_ORDER
    );

    const score = findSection<JeongsiScoreAnalysisSection>(
      content.sections,
      "jeongsiScoreAnalysis"
    );
    // 총평 폴백도 코드가 판정한 해석 문장으로 채운다
    expect(score.overallComment).toContain(
      "국어, 수학, 탐구 평균 백분위 93.7점, 표준점수 합 403점으로, 국어, 수학, 탐구 모두 응시자 상위 약 9% 안"
    );
    expect(score.averagePercentile).toBe(93.7);

    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items).toHaveLength(3);
    // 1문장은 판정 문장, 2문장은 코드가 쓴 격차·합격 가능성 문장
    expect(detail.items[0].reason).not.toContain(
      JEONGSI_COMMENTARY_FALLBACK.detailReason
    );
    expect(detail.items[0].reason).toMatch(
      / 기준컷에 환산점수 7\.7점 모자라, 단순 지원만으로는 결과를 기대하기 쉽지 않은 수준입니다\. 가군 상향 원서로 둔다면, 나머지 나군과 다군에는 적정이나 안정 원서를 두어 결과를 받쳐야 합니다\.$/
    );
    expect(detail.items[0].convertedScore).toBe(912.4);
  });

  it("건너뛴 파트는 진행률 status 를 skipped 로 보고하고 제목을 함께 넘긴다", async () => {
    // Arrange
    const events: JeongsiBuildProgress[] = [];

    // Act
    await buildJeongsiReport(analysis, {
      reportId: "report-11",
      onProgress: (progress) => events.push(progress),
    });

    // Assert
    expect(events).toHaveLength(JEONGSI_SECTION_ORDER.length);
    // PART 5 는 모델 없이 코드 문장으로 끝나므로 done 이다
    expect(
      events.every(
        (event) =>
          event.status ===
          (event.sectionId === "jeongsiUniversityDetail" ? "done" : "skipped")
      )
    ).toBe(true);
    expect(events.at(-1)?.percent).toBe(100);
    expect(
      events.find((event) => event.sectionId === "jeongsiCombination")?.title
    ).toBe("군별 지원 조합");
  });
});

describe("buildRecommendationNotices", () => {
  // 학생에게 가공 없이 노출되는 문구다. 눈으로 보면 괄호 중첩·중복·조사
  // 오류가 드러나지 않으므로(specs/013 §8-b.2 실측 202자 사례) 렌더링
  // 결과를 문자열로 고정해 회귀를 막는다.

  const 의약Plan = (
    restrictions: JeongsiAdmissionPlan["restrictions"]
  ): JeongsiAdmissionPlan => ({
    ...createPlan("가대학교", "의예과", "가"),
    category: "의학",
    restrictions,
  });

  const toIneligible = (
    plan: JeongsiAdmissionPlan,
    reason: string
  ): PlanEvaluation => ({
    ...상향Eval,
    plan,
    eligible: false,
    ineligibleReason: reason,
    tier: "지원불가",
    chance: "매우낮음",
  });

  /** 확통+사탐 응시자가 의약을 희망한 경우 (§6.1-e 의 대표 케이스) */
  const blockedAnalysis = (target: string): JeongsiAnalysis => ({
    ...analysis,
    input: {
      score: {
        ...analysis.input.score,
        math: { elective: "확률과통계", standardScore: 120, percentile: 80 },
        inquiry1: { subject: "생활과윤리", standardScore: 60, percentile: 85 },
        inquiry2: { subject: "사회문화", standardScore: 62, percentile: 87 },
      },
      preference: { ...analysis.input.preference, target },
    },
    selection: {
      poolStage: 2,
      moderateBandSubstituted: true,
      blockedByRestrictions: true,
    },
    ineligiblePlans: [
      toIneligible(
        의약Plan({ math: ["미적분", "기하"], inquiry: "과탐필수" }),
        "탐구 2과목 모두 과학탐구를 응시해야 지원할 수 있습니다. (응시 과목: 생활과윤리·사회문화)"
      ),
      toIneligible(
        의약Plan({ math: ["미적분", "기하"], inquiry: "과탐1과목이상" }),
        "수학 확률과통계 응시자는 지원할 수 없습니다. (지원 가능: 미적분·기하)"
      ),
      toIneligible(
        의약Plan({ inquiry: "과탐1과목이상" }),
        "탐구에서 과학탐구를 1과목 이상 응시해야 지원할 수 있습니다. (응시 과목: 생활과윤리·사회문화)"
      ),
    ],
    advantageousPlans: [],
    recommendations: { 상향: [], 적정: [], 안정: [] },
    sniping: [],
    combinations: [],
  });

  it("선정 과정이 평범하면 안내 문구를 만들지 않는다", () => {
    // Arrange / Act
    const notices = buildRecommendationNotices(analysis);

    // Assert
    expect(notices).toEqual([]);
  });

  it("지원 불가 문구는 요건을 수학·탐구 두 차원으로 집계해 한 문장에 담는다", () => {
    // Arrange: 세 모집단위의 사유가 서로 다르고 일부는 중복된다
    const blocked = blockedAnalysis("의예과");

    // Act
    const notices = buildRecommendationNotices(blocked);

    // Assert: 사유 문장을 이어 붙이지 않고 요건으로 집계한다
    expect(notices).toEqual([
      "희망하신 의예과는 정시에서 수능 응시 과목 조건이 있어, 현재 응시 과목(수학 확률과통계, 탐구 생활과윤리, 사회문화)으로는 지원할 수 있는 곳이 없습니다. 이 계열은 미적분 또는 기하와 과학탐구 1~2과목을 요구합니다. 희망 계열을 바꿔 다시 분석해 보세요.",
    ]);
  });

  it("지원 불가 문구에 괄호 중첩·응시 과목 중복·조사 표기가 없다", () => {
    // Arrange
    const [notice] = buildRecommendationNotices(blockedAnalysis("의예과"));

    // Assert: §8-b.1 공통 원칙
    expect(notice).not.toContain("은(는)");
    expect(notice).not.toContain("모집단위");
    expect(notice.match(/\(/g)).toHaveLength(1);
    expect(notice.match(/생활과윤리/g)).toHaveLength(1);
    expect(notice.length).toBeLessThan(180);
    // 재수를 권하는 것으로 읽히는 안내는 넣지 않는다
    expect(notice).not.toContain("다음 수능");
  });

  it("지원 불가일 때는 확대·대체 안내를 함께 내보내지 않는다", () => {
    // Arrange: 전멸이면서 poolStage 2 + 적정 대체까지 켜진 모순 상황
    const blocked = blockedAnalysis("의예과");

    // Act
    const notices = buildRecommendationNotices(blocked);

    // Assert: 지원 불가 문구 하나만
    expect(notices).toHaveLength(1);
    expect(notices[0]).not.toContain("넓혔습니다");
  });

  it("요건이 한 차원뿐이면 그 차원만 서술한다", () => {
    // Arrange: 탐구 제한만 있는 경우
    const blocked = blockedAnalysis("의예과");
    blocked.ineligiblePlans = [
      toIneligible(의약Plan({ inquiry: "과탐필수" }), "사유"),
    ];

    // Act
    const [notice] = buildRecommendationNotices(blocked);

    // Assert
    expect(notice).toContain("이 계열은 과학탐구 2과목을 요구합니다.");
    expect(notice).not.toContain("미적분");
  });

  it("target 이 비정상 입력이면 정규화된 계열명으로 대체한다", () => {
    // Arrange: 공백만 입력된 경우
    const blocked = blockedAnalysis("   ");

    // Act
    const [notice] = buildRecommendationNotices(blocked);

    // Assert: 후보의 표준 카테고리로 대체되고 조사도 받침에 맞는다
    expect(notice.startsWith("희망하신 의학은 정시에서")).toBe(true);
  });

  it("후보를 계열그룹까지 넓히면 계열명과 예시 학과를 밝힌다", () => {
    // Arrange: 철학 지망생의 목록에 사학과가 섞인 상황
    const widened: JeongsiAnalysis = {
      ...analysis,
      input: {
        ...analysis.input,
        preference: { ...analysis.input.preference, target: "철학" },
      },
      selection: {
        poolStage: 2,
        moderateBandSubstituted: true,
        blockedByRestrictions: false,
      },
    };

    // Act
    const notices = buildRecommendationNotices(widened);

    // Assert: 내부 용어 없이 계열명과 예시로 설명한다
    expect(notices).toEqual([
      "희망하신 철학 외에 인문계열(국어국문, 영어영문, 사학 등)까지 함께 비교했습니다. 희망 지역(서울)의 철학만으로는 현재 성적에 맞는 지원처를 고루 찾기 어려워 비교 범위를 넓혔습니다.",
      "현재 성적에 정확히 '적정'으로 분류되는 곳이 많지 않아, 기준컷과의 격차가 적정에 가장 가까운 곳을 함께 담았습니다. 함께 담은 대학의 실제 구분은 코멘트와 대학별 상세 분석에 적었습니다.",
    ]);
    expect(notices.join(" ")).not.toContain("계열그룹");
    expect(notices.join(" ")).not.toContain("부족해");
  });

  it("추천 목록이 비면 확대·대체 안내 대신 비어 있는 이유를 밝힌다", () => {
    // Arrange: 설명할 목록 자체가 없는 상태
    const empty: JeongsiAnalysis = {
      ...analysis,
      selection: {
        poolStage: 2,
        moderateBandSubstituted: true,
        blockedByRestrictions: false,
      },
      recommendations: { 상향: [], 적정: [], 안정: [] },
    };

    // Act
    const notices = buildRecommendationNotices(empty);

    // Assert
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("추천 범위");
    expect(notices[0]).not.toContain("넓혀 비교");
  });
});

describe("buildJeongsiReport — 지원 가능 목록이 비었을 때", () => {
  const blockedAnalysis: JeongsiAnalysis = {
    ...analysis,
    selection: {
      poolStage: 1,
      moderateBandSubstituted: false,
      blockedByRestrictions: true,
    },
    ineligiblePlans: [
      {
        ...상향Eval,
        eligible: false,
        ineligibleReason: "미적분·기하 응시자만 지원 가능",
      },
    ],
    advantageousPlans: [],
    recommendations: { 상향: [], 적정: [], 안정: [] },
    sniping: [],
    combinations: [],
  };

  it("빈 목록이어도 5개 섹션과 안내 문구가 담긴 리포트를 반환한다", async () => {
    // Arrange
    const client = createClient(() => Promise.resolve(null));

    // Act
    const content = await buildJeongsiReport(blockedAnalysis, {
      geminiClient: client,
      reportId: "report-12",
    });

    // Assert
    expect(content.sections.map((section) => section.sectionId)).toEqual(
      JEONGSI_SECTION_ORDER
    );

    const recommendation = findSection<JeongsiRecommendationSection>(
      content.sections,
      "jeongsiRecommendation"
    );
    expect(
      recommendation.groups.every((group) => group.items.length === 0)
    ).toBe(true);
    expect(recommendation.notices).toHaveLength(1);
    expect(recommendation.notices[0]).toContain(
      "현재 응시 과목(수학 미적분, 탐구 물리학I, 지구과학I)으로는 지원할 수 있는 곳이 없습니다"
    );

    const detail = findSection<JeongsiUniversityDetailSection>(
      content.sections,
      "jeongsiUniversityDetail"
    );
    expect(detail.items).toEqual([]);
  });

  it("목록이 빈 파트는 Gemini 를 호출하지 않는다", async () => {
    // Arrange
    const prompts: string[] = [];
    const client = createClient((prompt) => {
      prompts.push(prompt);
      return Promise.resolve(null);
    });

    // Act
    await buildJeongsiReport(blockedAnalysis, {
      geminiClient: client,
      reportId: "report-13",
    });

    // Assert: 성적 분석(PART 1)만 호출된다
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("해설 3개(총평, 강점, 약점)");
  });

  it("목록이 빈 파트의 총평은 비어 있는 이유와 같은 말로 코드가 쓴다", async () => {
    // Arrange: 모델이 없는 목록을 설명하려 해도 쓰이지 않아야 한다
    const client = createClient(() =>
      Promise.resolve({
        overallComment: ["목록 대학들은 모두 유리합니다.", "둘.", "셋."],
      })
    );

    // Act
    const content = await buildJeongsiReport(blockedAnalysis, {
      geminiClient: client,
      reportId: "report-14",
    });

    // Assert
    const overalls = content.sections.flatMap((section) =>
      section.sectionId === "jeongsiScoreAnalysis" ||
      section.sectionId === "jeongsiUniversityDetail"
        ? []
        : [section.overallComment]
    );
    expect(overalls).toHaveLength(3);
    expect(overalls.every((text) => !text.includes("목록 대학들은"))).toBe(
      true
    );
    expect(overalls[0]).toContain("현재 응시 과목 조건으로는");
    expect(overalls[1]).toContain("현재 응시 과목 조건으로는");
  });
});

describe("withTopicParticle", () => {
  it("받침이 있는 학과명에는 '은'을 붙인다", () => {
    // Arrange / Act / Assert
    expect(withTopicParticle("의학")).toBe("의학은");
    expect(withTopicParticle("경영학")).toBe("경영학은");
  });

  it("받침이 없는 학과명에는 '는'을 붙인다", () => {
    // Arrange / Act / Assert
    expect(withTopicParticle("의예과")).toBe("의예과는");
    expect(withTopicParticle("컴퓨터공학부")).toBe("컴퓨터공학부는");
  });

  it("한글 음절로 끝나지 않으면 '는'으로 둔다", () => {
    // Arrange: 영문·숫자로 끝나는 학과 표기
    // Act / Assert
    expect(withTopicParticle("AI")).toBe("AI는");
    expect(withTopicParticle("")).toBe("는");
  });
});

describe("formatRatioSummary", () => {
  it("고정 비율 대학은 네 영역 비율을 적는다", () => {
    // Arrange
    const ratios = { korean: 30, math: 35, english: 10, inquiry: 25 };

    // Act
    const result = formatRatioSummary(ratios);

    // Assert
    expect(result).toBe("국30, 수35, 영10, 탐25");
  });

  it("상위 영역 선택 대학은 고정 영역과 순위 규칙을 적는다", () => {
    // Arrange
    const ratios = { korean: 45, math: 30, english: 10, inquiry: 15 };

    // Act
    const result = formatRatioSummary(ratios, {
      areas: ["korean", "math"],
      rankRatios: [45, 30],
      rankBasis: "percentile",
    });

    // Assert
    expect(result).toBe("영10, 탐15 / 국, 수 중 상위순 45, 30");
  });
});

describe("describeCutDirection", () => {
  it("연도별 컷의 흐름을 한 단어로 판정한다", () => {
    // Arrange & Act & Assert
    expect(describeCutDirection([96.22, 94.88, 96])).toBe("하락 후 반등");
    expect(describeCutDirection([92.5, 95])).toBe("상승");
    expect(describeCutDirection([92, 90.5])).toBe("하락");
    expect(describeCutDirection([90.5, 90])).toBe("보합");
    expect(describeCutDirection([95])).toBeNull();
  });
});

describe("findReversedBurden", () => {
  const weakness = {
    label: "탐구",
    value: 25,
    position: "가장 높음",
    range: "20~25%",
  };

  it("약점 비율이 가장 높은데 부담을 줄인다고 쓰면 위반이다", () => {
    // Arrange
    const text =
      "표준점수를 씁니다. 탐구 25% 반영은 목록 대학 중 가장 높아 약점 영역의 부담을 줄여줍니다.";

    // Act & Assert
    expect(findReversedBurden(text, weakness)).toHaveLength(1);
  });

  it("부담이 크다고 쓰거나 위치가 가장 높음이 아니면 위반이 아니다", () => {
    // Arrange
    const text =
      "표준점수를 씁니다. 탐구 25% 반영은 목록 대학 중 가장 높아 약점 영역의 부담이 큽니다.";

    // Act & Assert
    expect(findReversedBurden(text, weakness)).toEqual([]);
    expect(
      findReversedBurden("탐구 10% 반영으로 부담이 적습니다.", {
        ...weakness,
        value: 10,
        position: "가장 낮음",
      })
    ).toEqual([]);
  });
});

describe("composeAreaCommentFallback", () => {
  it("영어 행은 원문에 백분위가 없어 강점·약점 폴백을 만들지 않는다", () => {
    // Arrange
    const row = {
      area: "english" as const,
      label: "영어",
      subjectName: null,
      standardScore: null,
      percentile: null,
      grade: 1,
      rank: null,
      deviation: null,
    };

    // Act
    const text = composeAreaCommentFallback(row, "약점");

    // Assert
    expect(text).toBeNull();
  });
});

describe("findEnglishPercentile", () => {
  it("영어를 백분위·표준점수로 쓰면 위반이다", () => {
    // Act & Assert
    expect(
      findEnglishPercentile("영어 백분위 92.5점은 강점입니다.")
    ).toHaveLength(1);
    expect(
      findEnglishPercentile("영어 영역의 표준점수가 높습니다.")
    ).toHaveLength(1);
    expect(findEnglishPercentile("영어 2등급은 감점이 작습니다.")).toEqual([]);
  });
});

describe("findUnsupportedSoleClaim", () => {
  const fact = (sentence: string) => ({
    value: "값",
    meaning: sentence,
    sentence,
  });

  it("재료에 없는 '유일한 대학' 주장은 위반이다", () => {
    // Act & Assert
    expect(
      findUnsupportedSoleClaim(
        "국어를 0% 반영하는 유일한 대학이라 유리합니다.",
        [fact("약점인 국어 영역을 반영하지 않아, 잃는 점수가 없습니다.")]
      )
    ).toHaveLength(1);
  });

  it("재료가 단독이라고 판정했으면 통과한다", () => {
    // Act & Assert
    expect(
      findUnsupportedSoleClaim("국어를 반영하는 대학은 이곳뿐입니다.", [
        fact(
          "목록에서 국어를 반영하는 대학은 이곳뿐이라, 손실을 살필 부분입니다."
        ),
      ])
    ).toEqual([]);
  });
});

describe("findWrongAverageScope", () => {
  it("국·수·탐 세 영역이 아닌 평균을 기준으로 쓰면 위반이다", () => {
    // Act & Assert
    expect(
      findWrongAverageScope("국어·탐구 평균 대비 1.2점 높아 강점입니다.")
    ).toHaveLength(1);
    expect(
      findWrongAverageScope("국·수·탐 평균 백분위 대비 +1.2점 높습니다.")
    ).toEqual([]);
    expect(
      findWrongAverageScope("국어, 수학, 탐구 평균 대비 1.2점 높습니다.")
    ).toEqual([]);
  });
});

describe("composeSnipingNotice", () => {
  const snipingEvaluation = (
    finalQuotaChange: PlanEvaluation["finalQuotaChange"]
  ): PlanEvaluation => ({
    ...createEvaluation(
      createPlan("스나대학교", "컴퓨터공학과", "가"),
      890,
      900,
      -1,
      "스나이핑",
      "매우낮음",
      40
    ),
    finalQuotaChange,
  });

  it("최종 모집인원이 발표 전이면 그 사실과 발표 후 우선 기준을 밝힌다", () => {
    // Arrange
    const sniping = [snipingEvaluation(null)];

    // Act
    const notice = composeSnipingNotice(sniping);

    // Assert
    expect(notice).toContain("기준컷 대비 −2.0 ~ −0.4");
    expect(notice).toContain("4~10%");
    expect(notice).toContain("아직 발표되지 않아");
    expect(notice).toContain("20% 이상");
  });

  it("최종 모집인원이 20% 이상 늘어난 곳은 이름과 실측 근거를 밝힌다", () => {
    // Arrange
    const sniping = [
      snipingEvaluation({
        previousYear: 2026,
        previousQuota: 20,
        finalQuota: 26,
        ratio: 0.3,
      }),
    ];

    // Act
    const notice = composeSnipingNotice(sniping);

    // Assert
    expect(notice).toContain("스나대학교 컴퓨터공학과는");
    expect(notice).toContain("23%");
  });
});

describe("findWrongSlotTier", () => {
  const item = {
    slots: [
      {
        group: "가" as const,
        university: "가대학교",
        department: "가학과",
        tier: "상향" as const,
        chance: "낮음" as const,
      },
      {
        group: "다" as const,
        university: "다대학교",
        department: "다학과",
        tier: "적정" as const,
        chance: "보통" as const,
      },
    ],
  };

  it("군과 구분을 실제 칸과 다르게 쓰면 잡는다", () => {
    // Arrange & Act
    const problems = findWrongSlotTier(
      item,
      "다군 안정 원서에 다대학교를 배치합니다."
    );

    // Assert
    expect(problems).toEqual(["칸 구분은 실제 구분대로 씁니다: 다군 적정"]);
  });

  it("실제 칸과 같으면 통과한다", () => {
    // Arrange & Act & Assert
    expect(
      findWrongSlotTier(item, "가군 상향 원서로 가대학교를 둡니다.")
    ).toEqual([]);
  });
});

describe("composeAreaCommentFallback - 영역 간 차이가 작을 때", () => {
  it("반영비율로 먼저 고르라 하지 않고 기준컷 대비 차이가 비슷한 곳 사이의 기준으로 쓴다", () => {
    // Arrange
    const row = {
      area: "korean" as const,
      label: "국어",
      percentile: 97,
      deviation: 1,
      rank: 1,
    };

    // Act
    const text = composeAreaCommentFallback(
      row as Parameters<typeof composeAreaCommentFallback>[0],
      "강점",
      undefined,
      2
    );

    // Assert
    expect(text).toContain("영역 간 백분위 차이가 2점으로 작아");
    expect(text).not.toContain("먼저 살피는");
  });
});
