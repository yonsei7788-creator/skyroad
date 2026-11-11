// ============================================================
// 어드민 정시 리포트 수정 — 수정 가능한 필드 정의와 병합
//
// 숫자(점수·컷·격차·모집인원 등)는 원천 입결과 엔진이 계산한 값이라
// 어드민에서도 고치지 않는다. 고칠 수 있는 것은 사람이 읽는 문장
// (총평·해설·이유·전략·안내)뿐이다.
//
// 저장할 때는 클라이언트가 보낸 content 를 그대로 쓰지 않는다.
// DB 에 있는 content 를 기준으로, 여기 정의된 문장 필드만 옮겨 담는다.
// 그래서 요청에 숫자가 바뀌어 와도 저장되지 않는다.
// ============================================================

import type { JeongsiReportContent, JeongsiSection } from "./report-types";

export type FieldPath = (string | number)[];

export interface EditableField {
  /** content 루트 기준 경로 (예: ["sections", 0, "overallComment"]) */
  path: FieldPath;
  /** 편집 화면에 보이는 이름 */
  label: string;
  /** 같은 묶음끼리 모아 보여줄 때 쓰는 제목 */
  group: string;
  value: string;
}

const LETTER_OFFSET = 65;

const letterOf = (index: number): string =>
  String.fromCharCode(LETTER_OFFSET + index);

/** 섹션 하나에서 수정할 수 있는 문장 필드 목록 */
export const listEditableFields = (
  section: JeongsiSection,
  sectionIndex: number
): EditableField[] => {
  const base: FieldPath = ["sections", sectionIndex];
  const field = (
    path: FieldPath,
    label: string,
    group: string,
    value: string
  ): EditableField => ({ path: [...base, ...path], label, group, value });

  switch (section.sectionId) {
    case "jeongsiScoreAnalysis":
      return [
        field(
          ["strengthComment"],
          "강점 해설",
          "강점·약점",
          section.strengthComment
        ),
        field(
          ["weaknessComment"],
          "약점 해설",
          "강점·약점",
          section.weaknessComment
        ),
        field(
          ["overallComment"],
          "컨설턴트 해석",
          "총평",
          section.overallComment
        ),
      ];

    case "jeongsiUniversityMatch":
      return [
        ...section.items.map((item, index) =>
          field(
            ["items", index, "reason"],
            `${index + 1}. ${item.university} ${item.department}`,
            "대학별 유리한 이유",
            item.reason
          )
        ),
        field(
          ["overallComment"],
          "반영방식 총평",
          "총평",
          section.overallComment
        ),
      ];

    case "jeongsiRecommendation":
      return [
        ...section.notices.map((notice, index) =>
          field(
            ["notices", index],
            `안내 ${index + 1}`,
            "먼저 확인하세요",
            notice
          )
        ),
        ...section.groups.flatMap((group, groupIndex) =>
          group.items.map((item, itemIndex) =>
            field(
              ["groups", groupIndex, "items", itemIndex, "comment"],
              `${item.university} ${item.department}`,
              `${group.tier} 코멘트`,
              item.comment
            )
          )
        ),
        field(["overallComment"], "지원 전략", "총평", section.overallComment),
      ];

    case "jeongsiCombination":
      return [
        ...section.combinations.map((combination, index) =>
          field(
            ["combinations", index, "strategy"],
            `${letterOf(index)} ${combination.label}`,
            "조합별 전략",
            combination.strategy
          )
        ),
        field(
          ["overallComment"],
          "조합 선택 가이드",
          "총평",
          section.overallComment
        ),
      ];

    case "jeongsiUniversityDetail":
      return section.items.map((item, index) =>
        field(
          ["items", index, "reason"],
          `${String(index + 1).padStart(2, "0")}. ${item.university} ${item.department}`,
          "대학별 추천 이유",
          item.reason
        )
      );

    default:
      return [];
  }
};

/** 리포트 전체의 수정 가능 필드 */
export const listAllEditableFields = (
  content: JeongsiReportContent
): EditableField[] =>
  content.sections.flatMap((section, index) =>
    listEditableFields(section, index)
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** 경로의 값을 읽는다. 중간에 끊기면 undefined */
export const getAtPath = (root: unknown, path: FieldPath): unknown =>
  path.reduce<unknown>((node, key) => {
    if (Array.isArray(node) && typeof key === "number") return node[key];
    if (isRecord(node) && typeof key === "string") return node[key];
    return undefined;
  }, root);

/** 경로에 값을 쓴 새 객체를 돌려준다. 원본은 건드리지 않는다 */
export const setAtPath = <T>(root: T, path: FieldPath, value: unknown): T => {
  const next = structuredClone(root);
  const parent = getAtPath(next, path.slice(0, -1));
  const key = path[path.length - 1];

  if (Array.isArray(parent) && typeof key === "number") {
    parent[key] = value;
  } else if (isRecord(parent) && typeof key === "string") {
    parent[key] = value;
  } else {
    throw new Error(`경로를 찾을 수 없습니다: ${path.join(".")}`);
  }
  return next;
};

export class JeongsiEditError extends Error {
  readonly fieldLabel: string;

  constructor(message: string, fieldLabel: string) {
    super(message);
    this.name = "JeongsiEditError";
    this.fieldLabel = fieldLabel;
  }
}

/**
 * 저장된 content 에 수정본의 문장 필드만 옮겨 담는다.
 *
 * - 섹션 구성(순서·sectionId)이 저장본과 다르면 거부한다.
 * - 문장 필드가 문자열이 아니거나 비어 있으면 거부한다.
 * - 그 밖의 필드는 수정본에서 무엇이 오든 저장본 값을 유지한다.
 */
export const mergeEditableFields = (
  stored: JeongsiReportContent,
  edited: unknown
): JeongsiReportContent => {
  const editedSections = isRecord(edited) ? edited.sections : undefined;
  if (!Array.isArray(editedSections)) {
    throw new JeongsiEditError("리포트 구성이 올바르지 않습니다.", "sections");
  }

  const sameLayout =
    editedSections.length === stored.sections.length &&
    stored.sections.every(
      (section, index) =>
        isRecord(editedSections[index]) &&
        editedSections[index].sectionId === section.sectionId
    );
  if (!sameLayout) {
    throw new JeongsiEditError(
      "섹션 구성이 저장된 리포트와 다릅니다. 새로고침 후 다시 수정해 주세요.",
      "sections"
    );
  }

  return listAllEditableFields(stored).reduce<JeongsiReportContent>(
    (merged, field) => {
      const value = getAtPath(edited, field.path);
      if (typeof value !== "string") {
        throw new JeongsiEditError(
          `「${field.label}」 값이 올바르지 않습니다.`,
          field.label
        );
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        throw new JeongsiEditError(
          `「${field.label}」 문구가 비어 있습니다.`,
          field.label
        );
      }
      return trimmed === field.value
        ? merged
        : setAtPath(merged, field.path, trimmed);
    },
    stored
  );
};
