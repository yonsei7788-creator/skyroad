import {
  FIELD_GROUPS,
  blocksBroadFieldExpansion,
  expandableCategories,
  findFieldGroup,
  isMedicalCategory,
  matchesNeutralPlanField,
  toBroadField,
} from "../field-groups";
import {
  loadAdmissionPlans,
  resetJeongsiDataSource,
} from "@/libs/jeongsi/data";

describe("findFieldGroup", () => {
  it("category 가 속한 계열그룹을 찾는다", () => {
    // Arrange & Act & Assert
    expect(findFieldGroup("경영학")).toBe("경상");
    expect(findFieldGroup("컴퓨터공학")).toBe("컴퓨터·IT");
    expect(findFieldGroup("의학")).toBe("의약");
    expect(findFieldGroup("간호학")).toBe("보건");
    expect(findFieldGroup("자유전공")).toBe("계열무관");
  });

  it("매핑에 없는 category 는 null 이다", () => {
    // Arrange & Act & Assert
    expect(findFieldGroup("존재하지않는학과")).toBeNull();
  });
});

describe("toBroadField", () => {
  it("공학·자연 계열그룹은 자연으로 판정한다", () => {
    // Arrange & Act & Assert
    expect(toBroadField("컴퓨터공학")).toBe("자연");
    expect(toBroadField("기계공학")).toBe("자연");
    expect(toBroadField("수학")).toBe("자연");
    expect(toBroadField("의학")).toBe("자연");
    expect(toBroadField("간호학")).toBe("자연");
  });

  it("경상·사회·인문 계열그룹은 인문으로 판정한다", () => {
    // Arrange & Act & Assert
    expect(toBroadField("경영학")).toBe("인문");
    expect(toBroadField("심리학")).toBe("인문");
    expect(toBroadField("철학")).toBe("인문");
  });

  it("자유전공·공학계열은 판정 불가다", () => {
    // Arrange & Act & Assert
    expect(toBroadField("자유전공")).toBeNull();
    expect(toBroadField("공학계열")).toBeNull();
  });

  it("교육·예체능·디자인은 판정 불가다", () => {
    // Arrange & Act & Assert
    // 국어교육(인문)과 과학교육(자연)이 한 그룹이라 대계열을 두지 않는다
    expect(toBroadField("국어교육")).toBeNull();
    expect(toBroadField("과학교육")).toBeNull();
    expect(toBroadField("디자인")).toBeNull();
  });
});

describe("expandableCategories", () => {
  it("같은 계열그룹과 계열무관을 함께 묶는다", () => {
    // Arrange & Act
    const expanded = expandableCategories("경영학");

    // Assert
    expect(expanded.has("경제학")).toBe(true);
    expect(expanded.has("행정학")).toBe(true);
    expect(expanded.has("자유전공")).toBe(true);
    expect(expanded.has("컴퓨터공학")).toBe(false);
  });

  it("의약은 다른 그룹을 섞지 않는다", () => {
    // Arrange & Act
    const expanded = expandableCategories("의학");

    // Assert
    expect(expanded.has("약학")).toBe(true);
    expect(expanded.has("수의학")).toBe(true);
    // 간호학은 컷 분포가 7 백분위점 아래라 의약과 섞지 않는다
    expect(expanded.has("간호학")).toBe(false);
    // 계열무관조차 섞지 않는다 — 컷이 극단적으로 높아 밴드가 왜곡된다
    expect(expanded.has("자유전공")).toBe(false);
    expect(expanded.size).toBe(FIELD_GROUPS["의약"].length);
  });

  it("보건과 화학·생명은 양방향으로 확대를 허용한다", () => {
    // Arrange & Act
    const fromNursing = expandableCategories("간호학");
    const fromBio = expandableCategories("생명과학");

    // Assert
    expect(fromNursing.has("생명과학")).toBe(true);
    expect(fromBio.has("간호학")).toBe(true);
    // 보건은 의약과 섞이지 않는다
    expect(fromNursing.has("의학")).toBe(false);
    expect(fromBio.has("의학")).toBe(false);
  });

  it("교육 계열은 사범 안에서만 확대하고 어문 계열을 섞지 않는다", () => {
    // Arrange & Act
    const expanded = expandableCategories("국어교육");

    // Assert
    expect(expanded.has("교육학")).toBe(true);
    expect(expanded.has("초등교육")).toBe(true);
    // 교원자격 트랙이라 국어국문학으로 넓히지 않는다 (specs/013 §6.1-b)
    expect(expanded.has("국어국문학")).toBe(false);
  });

  it("매핑에 없는 category 는 자기 자신만 남긴다", () => {
    // Arrange & Act
    const expanded = expandableCategories("존재하지않는학과");

    // Assert
    expect([...expanded]).toEqual(["존재하지않는학과"]);
  });
});

describe("isMedicalCategory", () => {
  it("의약 계열만 판별하고 보건은 제외한다", () => {
    // Arrange & Act & Assert
    expect(isMedicalCategory("의학")).toBe(true);
    expect(isMedicalCategory("약학")).toBe(true);
    // 간호학은 의약이 아니다 — 컷 분포가 겹치지 않는다
    expect(isMedicalCategory("간호학")).toBe(false);
    expect(isMedicalCategory("생명과학")).toBe(false);
  });
});

describe("blocksBroadFieldExpansion", () => {
  it("면허·자격 연계 트랙은 대계열 확대를 금지한다", () => {
    // Arrange & Act & Assert
    expect(blocksBroadFieldExpansion("의학")).toBe(true);
    expect(blocksBroadFieldExpansion("약학")).toBe(true);
    expect(blocksBroadFieldExpansion("간호학")).toBe(true);
    expect(blocksBroadFieldExpansion("교육학")).toBe(true);
    expect(blocksBroadFieldExpansion("국어교육")).toBe(true);
    expect(blocksBroadFieldExpansion("초등교육")).toBe(true);
    expect(blocksBroadFieldExpansion("한약학")).toBe(true);
  });

  it("일반 계열은 대계열 확대를 허용한다", () => {
    // Arrange & Act & Assert
    expect(blocksBroadFieldExpansion("컴퓨터공학")).toBe(false);
    expect(blocksBroadFieldExpansion("경영학")).toBe(false);
    expect(blocksBroadFieldExpansion("생명과학")).toBe(false);
    expect(blocksBroadFieldExpansion("철학")).toBe(false);
  });
});

describe("FIELD_GROUPS — 실데이터 커버리지", () => {
  it("한 category 는 한 그룹에만 속한다", () => {
    // Arrange
    const categories = Object.values(FIELD_GROUPS).flat();

    // Act
    const unique = new Set(categories);

    // Assert
    expect(unique.size).toBe(categories.length);
  });

  it("시행계획의 모든 category 가 계열그룹에 속한다", async () => {
    // Arrange
    resetJeongsiDataSource();
    const plans = await loadAdmissionPlans();

    // Act
    const missing = [
      ...new Set(
        plans
          .map((plan) => plan.category)
          .filter((category) => findFieldGroup(category) === null)
      ),
    ];

    // Assert — 실패하면 specs/013 §6.1-b 그룹 표에 먼저 넣고 코드를 맞춘다
    expect(plans.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

describe("matchesNeutralPlanField", () => {
  it("이름에 계열이 드러난 계열무관 모집단위는 같은 대계열에만 맞다", () => {
    // Arrange & Act & Assert
    expect(matchesNeutralPlanField("인문계열", "컴퓨터공학")).toBe(false);
    expect(matchesNeutralPlanField("인문계열", "철학")).toBe(true);
    expect(matchesNeutralPlanField("자유전공학부(자연)", "경영학")).toBe(false);
    expect(matchesNeutralPlanField("AI기반자유전공학부", "컴퓨터공학")).toBe(
      true
    );
  });

  it("계열이 드러나지 않으면 양쪽 모두 허용한다", () => {
    // Arrange & Act & Assert
    expect(matchesNeutralPlanField("자유전공학부", "컴퓨터공학")).toBe(true);
    expect(matchesNeutralPlanField("자유전공학부", "철학")).toBe(true);
  });
});
