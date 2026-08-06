import { preprocess } from "../preprocessor";
import type { RecordData } from "../preprocessor";
import type { StudentInfo } from "../../types";

const baseStudentInfo: StudentInfo = {
  name: "홍길동",
  grade: 3,
  isGraduate: false,
  track: "문과",
  schoolType: "일반고",
  hasMockExamData: false,
};

const recordDataUpToGrade3Sem1: RecordData = {
  generalSubjects: [
    {
      year: 3,
      semester: 1,
      category: "국어",
      subject: "화법과 작문",
      credits: 4,
      rawScore: 90,
      average: 75,
      standardDeviation: 10,
      achievement: "A",
      studentCount: 200,
      gradeRank: 10,
    },
  ] as RecordData["generalSubjects"],
};

describe("3학년 1학기까지 데이터가 있을 때 현재 시점 판단 (날짜 기준)", () => {
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

  it("6월(1학기 기말고사 전)이면 '2학기 진행 중'으로 보고 이수 전략 조언을 유지한다", () => {
    mockCurrentDate("2026-06-15T00:00:00+09:00");

    const result = preprocess(
      recordDataUpToGrade3Sem1,
      baseStudentInfo,
      "standard"
    );

    expect(result.texts.studentProfileText).toContain("3학년 2학기 진행 중");
    expect(result.texts.studentProfileText).toContain("이수 전략은");
  });

  it("7월(1학기 기말고사 후)이면 '생기부 최종 확정'으로 보고 미래형 이수 조언을 넣지 않는다", () => {
    mockCurrentDate("2026-07-15T00:00:00+09:00");

    const result = preprocess(
      recordDataUpToGrade3Sem1,
      baseStudentInfo,
      "standard"
    );

    expect(result.texts.studentProfileText).toContain("생기부 최종 확정");
    expect(result.texts.studentProfileText).not.toContain("2학기 진행 중");
    expect(result.texts.studentProfileText).not.toContain("이수 전략은");
    expect(result.texts.studentProfileText).toContain("면접 준비");
    expect(result.texts.studentProfileText).toContain("정시 지원 전략");
  });

  it("9월(생기부 마감 후)이면 '생기부 최종 확정'으로 보고 미래형 이수 조언을 넣지 않는다", () => {
    mockCurrentDate("2026-09-10T00:00:00+09:00");

    const result = preprocess(
      recordDataUpToGrade3Sem1,
      baseStudentInfo,
      "standard"
    );

    expect(result.texts.studentProfileText).toContain("생기부 최종 확정");
    expect(result.texts.studentProfileText).not.toContain("2학기 진행 중");
    expect(result.texts.studentProfileText).not.toContain("이수 전략은");
    expect(result.texts.studentProfileText).toContain("면접 준비");
    expect(result.texts.studentProfileText).toContain("정시 지원 전략");
  });
});
