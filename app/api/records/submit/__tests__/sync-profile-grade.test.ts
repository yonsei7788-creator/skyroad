import { shouldSyncProfileGrade } from "../route";

describe("shouldSyncProfileGrade - 생기부 학년으로 입시 정보 학년 동기화", () => {
  it("생기부가 3학년인데 입시 정보가 1학년이면 동기화한다", () => {
    // Arrange & Act
    const result = shouldSyncProfileGrade("high1", "high3");

    // Assert
    expect(result).toBe(true);
  });

  it("생기부 학년과 입시 정보 학년이 같으면 동기화하지 않는다", () => {
    // Arrange & Act & Assert
    expect(shouldSyncProfileGrade("high1", "high1")).toBe(false);
    expect(shouldSyncProfileGrade("high2", "high2")).toBe(false);
    expect(shouldSyncProfileGrade("high3", "high3")).toBe(false);
  });

  it("입시 정보 학년이 비어 있으면 생기부 학년으로 채운다", () => {
    // Arrange & Act & Assert
    expect(shouldSyncProfileGrade(null, "high2")).toBe(true);
    expect(shouldSyncProfileGrade(undefined, "high1")).toBe(true);
  });

  it("졸업생은 생기부가 항상 3학년까지 있으므로 동기화 대상에서 제외한다", () => {
    // Arrange & Act & Assert
    expect(shouldSyncProfileGrade("graduate", "high3")).toBe(false);
    expect(shouldSyncProfileGrade("graduate", "high1")).toBe(false);
  });

  it("생기부 학년이 더 낮아도 생기부 값을 사실로 보고 동기화한다", () => {
    // Arrange & Act
    const result = shouldSyncProfileGrade("high3", "high1");

    // Assert
    expect(result).toBe(true);
  });
});
