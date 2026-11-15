import { buildTaskQueue } from "../wave-state";

describe("buildTaskQueue - 추천 대학(admissionStrategy) 제공 조건", () => {
  it("premium 플랜은 학년과 무관하게 admissionStrategy를 큐에 포함한다", () => {
    // Arrange & Act
    const queue = buildTaskQueue("premium");

    // Assert
    expect(queue).toContain("admissionStrategy");
  });

  it("졸업생 여부와 무관하게 premium 플랜에 admissionStrategy가 포함된다", () => {
    // Arrange & Act
    const normalQueue = buildTaskQueue("premium", false);
    const graduateQueue = buildTaskQueue("premium", true);

    // Assert
    expect(normalQueue).toContain("admissionStrategy");
    expect(graduateQueue).toContain("admissionStrategy");
  });

  it("폐기된 directionGuide는 어떤 플랜에서도 큐에 들어가지 않는다", () => {
    // Arrange
    const plans = ["lite", "standard", "premium"] as const;

    // Act & Assert
    for (const plan of plans) {
      expect(buildTaskQueue(plan)).not.toContain("directionGuide");
      expect(buildTaskQueue(plan, true)).not.toContain("directionGuide");
    }
  });

  it("졸업생은 실행 로드맵(actionRoadmap)을 제외하되 admissionStrategy는 유지한다", () => {
    // Arrange & Act
    const queue = buildTaskQueue("premium", true);

    // Assert
    expect(queue).not.toContain("actionRoadmap");
    expect(queue).toContain("admissionStrategy");
  });
});
