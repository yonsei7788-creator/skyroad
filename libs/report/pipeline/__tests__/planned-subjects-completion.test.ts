import {
  isPlannedTreatedAsCompleted,
  matchRecommendedCourses,
} from "../preprocessor";
import { removeMisstatedMissingCourses } from "../postprocessor";
import type { RecordData } from "../preprocessor";

const physics1: NonNullable<RecordData["generalSubjects"]>[number] = {
  year: 2,
  semester: 1,
  category: "과학",
  subject: "물리학Ⅰ",
  credits: 4,
  rawScore: 90,
  average: 70,
  standardDeviation: 12,
  achievement: "A",
  studentCount: 200,
  gradeRank: 2,
};

describe("isPlannedTreatedAsCompleted", () => {
  it("졸업생은 수강 예정 과목을 이수 완료로 취급한다", () => {
    // Arrange & Act
    const result = isPlannedTreatedAsCompleted(true, 0, new Date("2026-03-02"));

    // Assert
    expect(result).toBe(true);
  });

  it("생기부가 확정된 3학년(7월 이후)은 이수 완료로 취급한다", () => {
    // Arrange & Act
    const result = isPlannedTreatedAsCompleted(
      false,
      3,
      new Date("2026-08-31")
    );

    // Assert
    expect(result).toBe(true);
  });

  it("확정 전 3학년(7월 이전)은 이수 예정으로 유지한다", () => {
    // Arrange & Act
    const result = isPlannedTreatedAsCompleted(
      false,
      3,
      new Date("2026-05-10")
    );

    // Assert
    expect(result).toBe(false);
  });

  it("1·2학년은 이수 예정으로 유지한다", () => {
    // Arrange & Act
    const result = isPlannedTreatedAsCompleted(
      false,
      2,
      new Date("2026-08-31")
    );

    // Assert
    expect(result).toBe(false);
  });
});

describe("matchRecommendedCourses — 수강 예정 과목 처리", () => {
  it("생기부 확정 3학년의 수강 예정 과목(물리학2)을 이수로 분류한다", () => {
    // Arrange
    const plannedSubjects = "물리학1, 물리학2";

    // Act
    const result = matchRecommendedCourses(
      [physics1],
      [],
      "공학",
      3,
      "2015",
      plannedSubjects,
      /* plannedAsCompleted */ true
    );

    // Assert
    expect(result.takenCourses).toContain("물리학Ⅱ");
    expect(result.plannedCourses).toHaveLength(0);
    expect(result.missingCourses).not.toContain("물리학Ⅱ");
  });

  it("확정 전 학생의 수강 예정 과목은 미이수가 아닌 이수 예정으로 분류한다", () => {
    // Arrange
    const plannedSubjects = "물리학2";

    // Act
    const result = matchRecommendedCourses(
      [physics1],
      [],
      "공학",
      2,
      "2015",
      plannedSubjects,
      /* plannedAsCompleted */ false
    );

    // Assert
    expect(result.takenCourses).toContain("물리학Ⅰ");
    expect(result.plannedCourses).toContain("물리학Ⅱ");
    expect(result.missingCourses).not.toContain("물리학Ⅱ");
  });

  it("전각 쉼표로 구분해 입력한 수강 예정 과목도 인식한다", () => {
    // Arrange
    const plannedSubjects = "물리학1，물리학2";

    // Act
    const result = matchRecommendedCourses(
      [physics1],
      [],
      "공학",
      2,
      "2015",
      plannedSubjects,
      /* plannedAsCompleted */ false
    );

    // Assert
    expect(result.plannedCourses).toContain("물리학Ⅱ");
    expect(result.missingCourses).not.toContain("물리학Ⅱ");
  });

  it.each(["물리학2", "물리학 2", "물리학II", "물리학 II", "물리 2"])(
    "아라비아 숫자·영문 표기 '%s'를 로마숫자 권장과목(물리학Ⅱ)과 매칭한다",
    (planned) => {
      // Arrange & Act
      const result = matchRecommendedCourses(
        [physics1],
        [],
        "공학",
        2,
        "2015",
        planned,
        /* plannedAsCompleted */ false
      );

      // Assert
      expect(result.plannedCourses).toContain("물리학Ⅱ");
      expect(result.missingCourses).not.toContain("물리학Ⅱ");
    }
  );

  it("매칭 결과는 권장과목 표기를 사용하고 학생 입력 문자열은 그대로 둔다", () => {
    // Arrange
    const plannedSubjects = "물리학2";

    // Act
    const result = matchRecommendedCourses(
      [physics1],
      [],
      "공학",
      2,
      "2015",
      plannedSubjects,
      /* plannedAsCompleted */ false
    );

    // Assert
    expect(plannedSubjects).toBe("물리학2");
    expect(result.plannedCourses).toEqual(["물리학Ⅱ"]);
  });
});

describe("removeMisstatedMissingCourses", () => {
  it("이수 확정 과목을 미이수로 서술한 문장을 제거한다", () => {
    // Arrange
    const text =
      "물리학Ⅱ 미이수로 심화 학습 공백이 있습니다. 화학Ⅱ 미이수는 보완이 필요합니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe("화학Ⅱ 미이수는 보완이 필요합니다.");
  });

  it("나열된 과목 중 이수 확정 과목만 문장에서 제거한다", () => {
    // Arrange
    const text = "물리학Ⅱ·화학Ⅱ 미이수는 학종 평가에서 약점입니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe("화학Ⅱ 미이수는 학종 평가에서 약점입니다.");
  });

  it("'이수하지 않았다' 서술도 교정 대상으로 인식한다", () => {
    // Arrange
    const text = "물리학Ⅱ를 이수하지 않아 공백이 있습니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe("");
  });

  it("물리학Ⅱ가 이수 확정이어도 물리학Ⅰ 서술은 건드리지 않는다", () => {
    // Arrange
    const text = "물리학Ⅰ 미이수는 보완이 필요합니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe(text);
  });

  it("미이수 서술이 없는 문장은 그대로 유지한다", () => {
    // Arrange
    const text = "물리학Ⅱ 이수로 전공 적합성이 잘 드러납니다.";

    // Act
    const result = removeMisstatedMissingCourses(text, ["물리학Ⅱ"]);

    // Assert
    expect(result).toBe(text);
  });
});
