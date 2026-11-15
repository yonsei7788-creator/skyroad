import { postprocess } from "../postprocessor";
import { preprocess } from "../preprocessor";
import type { RecordData } from "../preprocessor";
import type { ReportSection, StudentInfo } from "../../types";

/**
 * 생기부가 확정된 학생(졸업생 / 3학년 1학기 마감)에게 "성적을 올려라",
 * "세특에 탐구를 추가해라" 같은 생기부 개선 조언이 나가지 않는지 검증한다.
 *
 * 이 문구들은 AI가 아니라 후처리의 결정적 템플릿이 만들어내므로, 프롬프트가
 * 아닌 postprocess 출력으로 검증해야 재발을 잡을 수 있다.
 */

const baseStudentInfo: StudentInfo = {
  name: "홍길동",
  grade: 3,
  isGraduate: false,
  track: "이과",
  schoolType: "일반고",
  hasMockExamData: false,
};

const recordDataUpToGrade3Sem1: RecordData = {
  generalSubjects: [
    {
      year: 3,
      semester: 1,
      category: "수학",
      subject: "미적분",
      credits: 4,
      rawScore: 70,
      average: 65,
      standardDeviation: 12,
      achievement: "B",
      studentCount: 200,
      gradeRank: 5,
    },
  ] as RecordData["generalSubjects"],
};

/** 학업/진로/공동체 3개 역량 모두 감점이 있는 competencyScore 섹션 */
const buildCompetencyScoreSection = (): ReportSection =>
  ({
    sectionId: "competencyScore",
    title: "역량 점수",
    totalScore: 295,
    growthScore: 70,
    growthGrade: "B",
    growthComment: "성장 추이 코멘트",
    interpretation: "총점 해석",
    scores: [
      {
        label: "학업역량",
        category: "academic",
        grade: "B",
        score: 64,
        maxScore: 100,
        gradeComment: "AI가 작성한 원본 코멘트",
        subcategories: [
          { name: "학업성취도", score: 23, maxScore: 35, comment: "-" },
          { name: "학업태도", score: 18, maxScore: 25, comment: "-" },
          { name: "탐구력", score: 23, maxScore: 40, comment: "-" },
        ],
      },
      {
        label: "진로역량",
        category: "career",
        grade: "S",
        score: 87,
        maxScore: 100,
        gradeComment: "AI가 작성한 원본 코멘트",
        subcategories: [
          { name: "교과이수노력", score: 25, maxScore: 25, comment: "-" },
          { name: "교과성취도", score: 22, maxScore: 35, comment: "-" },
          { name: "진로탐색활동", score: 40, maxScore: 40, comment: "-" },
        ],
      },
      {
        label: "공동체역량",
        category: "community",
        grade: "B",
        score: 74,
        maxScore: 100,
        gradeComment: "AI가 작성한 원본 코멘트",
        subcategories: [
          { name: "나눔과배려", score: 17, maxScore: 25, comment: "-" },
          { name: "소통및협업", score: 17, maxScore: 25, comment: "-" },
          { name: "리더십", score: 17, maxScore: 25, comment: "-" },
          { name: "성실성", score: 23, maxScore: 25, comment: "-" },
        ],
      },
    ],
  }) as unknown as ReportSection;

const runPostprocess = (studentInfo: StudentInfo, record: RecordData) => {
  const { data } = preprocess(record, studentInfo, "premium");
  const result = postprocess(
    [buildCompetencyScoreSection()],
    data,
    studentInfo,
    "premium",
    "test-report"
  );
  const section = result.content.sections.find(
    (s) => (s as { sectionId?: string }).sectionId === "competencyScore"
  ) as unknown as {
    scores: { label: string; gradeComment: string }[];
  };
  return section.scores;
};

describe("생기부 확정 학생의 역량 점수 코멘트", () => {
  const realDate = Date;

  afterEach(() => {
    global.Date = realDate;
  });

  const mockCurrentDate = (isoDate: string) => {
    class MockDate extends realDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(isoDate);
          return;
        }
        // @ts-expect-error - passthrough to real Date constructor
        super(...args);
      }
      static now() {
        return new realDate(isoDate).getTime();
      }
    }
    // @ts-expect-error - test-only global override
    global.Date = MockDate;
  };

  it("3학년 1학기 마감 후에는 gradeComment에 생기부 개선 조언이 들어가지 않는다", () => {
    mockCurrentDate("2026-08-30T00:00:00+09:00");

    const scores = runPostprocess(baseStudentInfo, recordDataUpToGrade3Sem1);
    const comments = scores.map((s) => s.gradeComment).join("\n");

    // 실제 리포트에서 관찰된 문구들
    expect(comments).not.toContain("성취도를 끌어올린다면");
    expect(comments).not.toContain("탐구 사례를 추가한다면");
    expect(comments).not.toContain("활동 사례를 남긴다면");
    // 개선 조언 템플릿의 공통 마무리
    expect(comments).not.toContain("더욱 높일 수 있을 것으로 판단됩니다");
    // 지금 실행 가능한 대응으로 대체되어야 한다
    expect(comments).toContain("면접");
  });

  it("졸업생도 동일하게 생기부 개선 조언 없이 실행 가능한 대응으로 마무리된다", () => {
    mockCurrentDate("2026-03-10T00:00:00+09:00");

    const scores = runPostprocess(
      { ...baseStudentInfo, isGraduate: true },
      recordDataUpToGrade3Sem1
    );
    const comments = scores.map((s) => s.gradeComment).join("\n");

    expect(comments).not.toContain("더욱 높일 수 있을 것으로 판단됩니다");
    expect(comments).toContain("면접");
  });

  it("생기부가 아직 마감되지 않은 학생에게는 기존의 개선 방향 제안을 유지한다", () => {
    mockCurrentDate("2026-06-15T00:00:00+09:00");

    const scores = runPostprocess(baseStudentInfo, recordDataUpToGrade3Sem1);
    const comments = scores.map((s) => s.gradeComment).join("\n");

    expect(comments).toContain("더욱 높일 수 있을 것으로 판단됩니다");
  });
});

describe("생기부 확정 판정값(isRecordClosed)", () => {
  const realDate = Date;

  afterEach(() => {
    global.Date = realDate;
  });

  const mockCurrentDate = (isoDate: string) => {
    class MockDate extends realDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(isoDate);
          return;
        }
        // @ts-expect-error - passthrough to real Date constructor
        super(...args);
      }
      static now() {
        return new realDate(isoDate).getTime();
      }
    }
    // @ts-expect-error - test-only global override
    global.Date = MockDate;
  };

  it("3학년 1학기 마감 후에는 true, 마감 전에는 false", () => {
    mockCurrentDate("2026-08-30T00:00:00+09:00");
    expect(
      preprocess(recordDataUpToGrade3Sem1, baseStudentInfo, "premium").data
        .isRecordClosed
    ).toBe(true);

    mockCurrentDate("2026-06-15T00:00:00+09:00");
    expect(
      preprocess(recordDataUpToGrade3Sem1, baseStudentInfo, "premium").data
        .isRecordClosed
    ).toBe(false);
  });

  it("졸업생은 시점과 무관하게 true", () => {
    mockCurrentDate("2026-03-10T00:00:00+09:00");
    expect(
      preprocess(
        recordDataUpToGrade3Sem1,
        { ...baseStudentInfo, isGraduate: true },
        "premium"
      ).data.isRecordClosed
    ).toBe(true);
  });
});
