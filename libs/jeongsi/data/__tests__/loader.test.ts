import {
  clearJeongsiDataCache,
  loadAdmissionPlans,
  loadAdmissionResultIndex,
  loadAdmissionResults,
  resetJeongsiDataSource,
  setJeongsiDataSource,
  validateAdmissionPlans,
  validateAdmissionResults,
} from "..";
import { logger } from "@/libs/logger";

describe("실제 JSON 데이터 로드", () => {
  beforeEach(() => {
    resetJeongsiDataSource();
  });

  afterAll(() => {
    resetJeongsiDataSource();
  });

  it("시행계획을 불러오고 타입 스키마를 만족한다", async () => {
    // Arrange & Act
    const plans = await loadAdmissionPlans();

    // Assert
    expect(plans.length).toBeGreaterThan(0);
    expect(validateAdmissionPlans(plans).errors).toEqual([]);
  });

  it("모든 시행계획에 공개 입결이 있다 — 근거 없는 대학은 노출하지 않는다", async () => {
    // Arrange & Act
    const plans = await loadAdmissionPlans();
    const index = await loadAdmissionResultIndex();

    // Assert
    const withoutResults = plans
      .filter((plan) => !index.has(plan.id))
      .map((plan) => plan.id);
    expect(withoutResults).toEqual([]);
  });

  it("입결을 불러오고 타입 스키마를 만족한다", async () => {
    // Arrange & Act
    const results = await loadAdmissionResults();

    // Assert
    expect(results.length).toBeGreaterThan(0);
    expect(validateAdmissionResults(results).errors).toEqual([]);
  });

  it("경고 없이 JSON 파일에서 직접 읽는다", async () => {
    // Arrange
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});

    // Act
    const plans = await loadAdmissionPlans();

    // Assert
    expect(plans.length).toBeGreaterThan(0);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("입결 인덱스는 planKey 별로 최신 학년도를 앞에 둔다", async () => {
    // Arrange & Act
    const index = await loadAdmissionResultIndex();
    const [bucket] = [...index.values()];

    // Assert
    expect(index.size).toBeGreaterThan(0);
    const years = bucket.map((entry) => entry.admissionYear);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("두 번째 호출은 캐시를 재사용한다", async () => {
    // Arrange & Act
    const first = await loadAdmissionPlans();
    const second = await loadAdmissionPlans();

    // Assert
    expect(second).toBe(first);
  });
});

describe("데이터 출처 교체", () => {
  afterEach(() => {
    resetJeongsiDataSource();
  });

  it("교체한 공급자의 데이터를 쓴다", async () => {
    // Arrange
    setJeongsiDataSource({
      readAdmissionPlans: async () => [],
      readAdmissionResults: async () => [],
    });

    // Act
    const plans = await loadAdmissionPlans();

    // Assert
    expect(plans).toEqual([]);
  });

  it("배열을 감싼 객체도 평탄화한다", async () => {
    // Arrange
    setJeongsiDataSource({
      readAdmissionPlans: async () => ({ plans: [{ id: "래퍼" }] }),
      readAdmissionResults: async () => [],
    });

    // Act
    const plans = await loadAdmissionPlans();

    // Assert
    expect(plans).toHaveLength(1);
  });

  it("데이터를 읽지 못하면 빈 배열로 폴백한다", async () => {
    // Arrange
    setJeongsiDataSource({
      readAdmissionPlans: async () => {
        throw new Error("파일 없음");
      },
      readAdmissionResults: async () => [],
    });

    // Act
    const plans = await loadAdmissionPlans();

    // Assert
    expect(plans).toEqual([]);
  });

  it("캐시를 비우면 공급자를 다시 호출한다", async () => {
    // Arrange
    let callCount = 0;
    setJeongsiDataSource({
      readAdmissionPlans: async () => {
        callCount += 1;
        return [];
      },
      readAdmissionResults: async () => [],
    });

    // Act
    await loadAdmissionPlans();
    clearJeongsiDataCache();
    await loadAdmissionPlans();

    // Assert
    expect(callCount).toBe(2);
  });
});

describe("데이터 품질 경고", () => {
  afterEach(() => {
    resetJeongsiDataSource();
  });

  it("컷이 하나도 없는 입결 레코드를 경고한다", async () => {
    // Arrange
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
    setJeongsiDataSource({
      readAdmissionPlans: async () => [],
      readAdmissionResults: async () => [
        {
          planKey: "컷없는대학교-컴퓨터공학과-가",
          admissionYear: 2026,
          university: "컷없는대학교",
          department: "컴퓨터공학과",
          group: "가",
          quota: 20,
          competitionRate: 3.1,
        },
      ],
    });

    // Act
    await loadAdmissionResults();

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      "컷이 없는 입결 레코드가 있어 분류에 쓸 수 없습니다.",
      expect.objectContaining({ count: 1 })
    );
    warnSpy.mockRestore();
  });

  it("실제 입결 데이터에는 컷 없는 레코드가 없다", async () => {
    // Arrange
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});

    // Act
    await loadAdmissionResults();

    // Assert
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
