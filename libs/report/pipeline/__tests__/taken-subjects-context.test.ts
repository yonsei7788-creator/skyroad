import { preprocess } from "../preprocessor";
import { buildSystemPromptPrefix } from "../../prompts/system";
import { buildSubjectAnalysisPrompt } from "../../prompts/sections/subject-analysis";
import type { RecordData } from "../preprocessor";
import type { StudentInfo } from "../../types";

const generalSubject = (
  year: number,
  subject: string,
  category: string
): NonNullable<RecordData["generalSubjects"]>[number] => ({
  year,
  semester: 1,
  category,
  subject,
  credits: 4,
  rawScore: 90,
  average: 70,
  standardDeviation: 12,
  achievement: "A",
  studentCount: 200,
  gradeRank: 2,
});

const studentInfo: StudentInfo = {
  name: "홍길동",
  grade: 3,
  isGraduate: false,
  track: "이과",
  schoolType: "일반고",
  hasMockExamData: false,
  targetDepartment: "컴퓨터공학과",
};

describe("preprocess — 이수 사실 정답 텍스트", () => {
  it("비주요 과목과 세특 전용 과목까지 담은 전체 이수 목록을 만든다", () => {
    // Arrange: 「정보」는 비주요 과목이라 평가 대상 목록에서는 제외되고,
    // 「미적분」은 성적 행 없이 세특에만 존재한다
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(1, "통합과학", "과학"),
        generalSubject(2, "정보", "기술·가정"),
      ] as RecordData["generalSubjects"],
      subjectEvaluations: [
        { year: 2, subject: "미적분", evaluation: "미적분 세특 내용" },
      ] as RecordData["subjectEvaluations"],
    };

    // Act
    const { texts } = preprocess(recordData, studentInfo, "standard");

    // Assert
    expect(texts.allTakenSubjectsByYearText).toContain("통합과학");
    expect(texts.allTakenSubjectsByYearText).toContain("정보");
    expect(texts.allTakenSubjectsByYearText).toContain("미적분");
  });

  it("평가 대상 목록에는 비주요 과목이 빠져 있어 이수 판정에 쓸 수 없다", () => {
    // Arrange
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(1, "통합과학", "과학"),
        generalSubject(2, "정보", "기술·가정"),
      ] as RecordData["generalSubjects"],
    };

    // Act
    const { texts } = preprocess(recordData, studentInfo, "standard");

    // Assert: 두 목록의 역할이 다르다는 것이 이 변경의 전제.
    // 평가 대상 목록의 "N학년 이수 완료" 줄에는 비주요 과목이 들어가지 않는다.
    const completedYearLines = texts.completedSubjectsByYearText
      .split("\n")
      .filter((line) => /^- \d학년 이수 완료:/.test(line))
      .join("\n");
    expect(completedYearLines).not.toContain("정보");
    expect(texts.allTakenSubjectsByYearText).toContain("정보");
  });

  it("분석 범위를 벗어난 학년의 과목은 담지 않는다", () => {
    // Arrange: 고2 학생인데 3학년 행이 섞여 있는 기록
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(2, "화학Ⅰ", "과학"),
        generalSubject(3, "화학Ⅱ", "과학"),
      ] as RecordData["generalSubjects"],
    };

    // Act
    const { texts, data } = preprocess(
      recordData,
      { ...studentInfo, grade: 2 },
      "standard"
    );

    // Assert: 표·후처리가 보는 범위와 어긋나면 안 된다
    expect(texts.allTakenSubjectsByYearText).toContain("화학Ⅰ");
    expect(texts.allTakenSubjectsByYearText).not.toContain("화학Ⅱ");
    expect(data.allTakenSubjects).not.toContain("화학Ⅱ");
  });

  it("학년이 비어 있는 과목도 '학년 미상'으로 남긴다", () => {
    // Arrange: 목록에서 빠지면 "이수하지 않았다"로 읽히므로 버리지 않는다
    const recordData: RecordData = {
      generalSubjects: [
        generalSubject(1, "통합사회", "사회"),
      ] as RecordData["generalSubjects"],
      careerSubjects: [
        {
          year: 0,
          semester: 0,
          category: "수학",
          subject: "경제 수학",
          credits: null,
          rawScore: null,
          average: null,
          achievement: "A",
          studentCount: null,
          achievementDistribution: "",
        },
      ] as RecordData["careerSubjects"],
    };

    // Act
    const { texts } = preprocess(recordData, studentInfo, "standard");

    // Assert
    expect(texts.allTakenSubjectsByYearText).toContain("학년 미상");
    expect(texts.allTakenSubjectsByYearText).toContain("경제 수학");
  });
});

describe("buildSystemPromptPrefix — 모든 섹션 공통 이수 정답", () => {
  it("이수 목록을 주입하면 읽는 방법 블록이 함께 붙는다", () => {
    // Arrange
    const taken =
      "## 이 학생이 이수한 과목 (학년별 전체 목록)\n- 2학년: 미적분";

    // Act
    const prefix = buildSystemPromptPrefix("premium", { takenSubjects: taken });

    // Assert
    expect(prefix).toContain("- 2학년: 미적분");
    expect(prefix).toContain("위 목록을 읽는 방법");
  });

  it("이수 목록이 없으면 블록을 붙이지 않는다", () => {
    // Act
    const prefix = buildSystemPromptPrefix("premium", {});

    // Assert
    expect(prefix).not.toContain("위 목록을 읽는 방법");
  });
});

describe("buildSubjectAnalysisPrompt — 공유 목록 참조", () => {
  it("섹션 프롬프트는 목록을 다시 싣지 않고 이름으로 참조한다", () => {
    // Arrange & Act: 이 섹션은 학년별로 분할 호출되어 해당 학년 세특만 본다
    const prompt = buildSubjectAnalysisPrompt(
      {
        subjectData: "[2학년 화학Ⅰ]\n세특 내용",
        studentProfile: "프로필",
        studentGrade: 3,
        targetYear: 2,
      },
      "premium"
    );

    // Assert
    expect(prompt).toContain('"이 학생이 이수한 과목" 목록에 있는 과목을 사용');
    expect(prompt).not.toContain("학년별 전체 목록");
  });
});
