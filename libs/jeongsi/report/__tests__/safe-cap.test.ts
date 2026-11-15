import { describeSafeCapReasons } from "../safe-cap";

describe("describeSafeCapReasons", () => {
  it("공개 입결이 적은 곳은 입결 연도 수를 세지 않고 사유를 쓴다", () => {
    // Arrange & Act
    const reason = describeSafeCapReasons({
      safeCapReasons: ["1개년 입결"],
      resultYears: [2026],
    });

    // Assert
    expect(reason).toBe("공개 입결이 적은 곳");
  });

  it("여러 사유는 이고로 잇고 원문 모집군 학년도를 밝힌다", () => {
    // Arrange & Act
    const reason = describeSafeCapReasons({
      safeCapReasons: ["1개년 입결", "모집군 변경"],
      pastGroups: [{ year: 2026, group: "다" }],
      resultYears: [2026],
    });

    // Assert
    expect(reason).toBe("공개 입결이 적은 곳이고, 2026 입결은 다군 모집 때 값");
  });

  it("사유가 없으면 null 을 돌려준다", () => {
    // Arrange & Act & Assert
    expect(
      describeSafeCapReasons({ safeCapReasons: [], resultYears: [2025, 2026] })
    ).toBeNull();
  });
});
