import {
  hasStrayInterpunct,
  removeInterpuncts,
  removeInterpunctsFromContent,
} from "../interpunct";

import type { JeongsiReportContent } from "../../report-types";

describe("removeInterpuncts", () => {
  it("가운데 점으로 이은 나열을 쉼표로 바꾼다", () => {
    // Arrange & Act
    const result = removeInterpuncts(
      "희망 학과·대학 선호·합격 안정성 중 무엇을 앞세울지 정합니다.",
      []
    );

    // Assert
    expect(result).toBe(
      "희망 학과, 대학 선호, 합격 안정성 중 무엇을 앞세울지 정합니다."
    );
  });

  it("모집군 나열은 군을 각각 붙인다", () => {
    // Arrange & Act & Assert
    expect(removeInterpuncts("가·나·다군에서 한 장씩", [])).toBe(
      "가군, 나군, 다군에서 한 장씩"
    );
  });

  it("앞뒤에 띄어쓰기가 있는 점도 쉼표로 바꾼다", () => {
    // Arrange & Act & Assert
    expect(removeInterpuncts("1등급 0 · 2등급 3 · 3등급 6", [])).toBe(
      "1등급 0, 2등급 3, 3등급 6"
    );
  });

  it("원문 고유명 안의 점은 그대로 둔다", () => {
    // Arrange
    const names = ["기계·로봇·자동차공학부"];

    // Act
    const result = removeInterpuncts(
      "건국대학교 기계·로봇·자동차공학부는 상향·적정 중 상향입니다.",
      names
    );

    // Assert
    expect(result).toBe(
      "건국대학교 기계·로봇·자동차공학부는 상향, 적정 중 상향입니다."
    );
    expect(hasStrayInterpunct(result, names)).toBe(false);
  });
});

describe("removeInterpunctsFromContent", () => {
  it("대학명·학과명 필드는 바꾸지 않고, 문장 속 같은 이름도 보존한다", () => {
    // Arrange
    const content = {
      meta: {
        reportId: "r1",
        input: {},
        createdAt: "2026-11-15",
        version: 1,
      },
      sections: [
        {
          sectionId: "jeongsiUniversityDetail",
          title: "대학별 상세 분석",
          items: [
            {
              university: "건국대학교",
              department: "기계·로봇·자동차공학부",
              reason:
                "기계·로봇·자동차공학부는 국어·수학·탐구 중 수학 비중이 큽니다.",
            },
          ],
        },
      ],
    } as unknown as JeongsiReportContent;

    // Act
    const result = removeInterpunctsFromContent(content);

    // Assert
    const [section] = result.sections as unknown as {
      items: { department: string; reason: string }[];
    }[];
    expect(section.items[0].department).toBe("기계·로봇·자동차공학부");
    expect(section.items[0].reason).toBe(
      "기계·로봇·자동차공학부는 국어, 수학, 탐구 중 수학 비중이 큽니다."
    );
  });
});
