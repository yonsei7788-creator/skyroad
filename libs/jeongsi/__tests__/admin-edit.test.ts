import {
  JeongsiEditError,
  getAtPath,
  listAllEditableFields,
  mergeEditableFields,
  setAtPath,
} from "../admin-edit";
import { JEONGSI_MOCK_REPORT } from "../mock-data";
import type { JeongsiReportContent } from "../report-types";

const cloneReport = (): JeongsiReportContent =>
  structuredClone(JEONGSI_MOCK_REPORT);

describe("listAllEditableFields", () => {
  it("문장 필드만 고르고 숫자 필드는 넣지 않는다", () => {
    // Arrange
    const content = cloneReport();

    // Act
    const fields = listAllEditableFields(content);

    // Assert
    expect(fields.length).toBeGreaterThan(0);
    fields.forEach((field) => {
      expect(typeof getAtPath(content, field.path)).toBe("string");
    });
    const keys = fields.map((field) => String(field.path.at(-1)));
    expect(keys).not.toContain("convertedScore");
    expect(keys).not.toContain("referenceCut");
    expect(keys).not.toContain("averagePercentile");
  });
});

describe("mergeEditableFields", () => {
  it("수정한 문장을 저장본에 반영한다", () => {
    // Arrange
    const stored = cloneReport();
    const [field] = listAllEditableFields(stored);
    const edited = setAtPath(stored, field.path, "  새 문장입니다.  ");

    // Act
    const merged = mergeEditableFields(stored, edited);

    // Assert
    expect(getAtPath(merged, field.path)).toBe("새 문장입니다.");
  });

  it("요청에 숫자가 바뀌어 와도 저장본 숫자를 유지한다", () => {
    // Arrange
    const stored = cloneReport();
    const index = stored.sections.findIndex(
      (section) => section.sectionId === "jeongsiScoreAnalysis"
    );
    const path = ["sections", index, "averagePercentile"];
    const edited = setAtPath(stored, path, 1);

    // Act
    const merged = mergeEditableFields(stored, edited);

    // Assert
    expect(getAtPath(merged, path)).toBe(getAtPath(stored, path));
  });

  it("비어 있는 문장은 거부한다", () => {
    // Arrange
    const stored = cloneReport();
    const [field] = listAllEditableFields(stored);
    const edited = setAtPath(stored, field.path, "   ");

    // Act & Assert
    expect(() => mergeEditableFields(stored, edited)).toThrow(JeongsiEditError);
  });

  it("섹션 구성이 다르면 거부한다", () => {
    // Arrange
    const stored = cloneReport();
    const edited = { ...cloneReport(), sections: stored.sections.slice(1) };

    // Act & Assert
    expect(() => mergeEditableFields(stored, edited)).toThrow(JeongsiEditError);
  });

  it("원본 객체를 바꾸지 않는다", () => {
    // Arrange
    const stored = cloneReport();
    const snapshot = structuredClone(stored);
    const [field] = listAllEditableFields(stored);
    const edited = setAtPath(stored, field.path, "바뀐 문장");

    // Act
    mergeEditableFields(stored, edited);

    // Assert
    expect(stored).toEqual(snapshot);
  });
});
