// ============================================================
// 가운데 점(·) 정리
//
// "국어·수학·탐구", "희망 학과·대학 선호"처럼 가운데 점으로 잇는 말투를
// 리포트에서 쓰지 않는다(사용자 결정 2026-11-15). 코드 문장은 쉼표나 "와/과"로
// 쓰고, 모델 문장에 남은 점은 저장 직전에 쉼표로 바꾼다.
// 원문 고유명(예: "기계·로봇·자동차공학부")에 든 점은 원문 표기라 그대로 둔다.
// ============================================================

import type { JeongsiReportContent } from "../report-types.ts";

const INTERPUNCT = "·";

/** "가·나·다군" → "가군, 나군, 다군" */
const GROUP_SERIES = /[가나다](?:·[가나다])+군/g;

/** 보호할 이름을 자리표시자로 바꾸는 표지(본문에 나오지 않는 문자) */
const MARK = "\u0000";

/**
 * 고유명 밖의 가운데 점을 쉼표로 바꾼다.
 * protectedNames 는 길이가 긴 것부터 가린다(짧은 이름이 긴 이름 일부일 수 있다).
 */
export const removeInterpuncts = (
  text: string,
  protectedNames: readonly string[]
): string => {
  if (!text.includes(INTERPUNCT)) {
    return text;
  }
  const kept: string[] = [];
  let masked = text;
  for (const name of protectedNames) {
    if (!masked.includes(name)) {
      continue;
    }
    masked = masked.split(name).join(`${MARK}${kept.length}${MARK}`);
    kept.push(name);
  }
  const replaced = masked
    .replace(GROUP_SERIES, (series) =>
      series
        .slice(0, -1)
        .split(INTERPUNCT)
        .map((group) => `${group}군`)
        .join(", ")
    )
    .replace(/\s*·\s*/g, ", ");
  return replaced.replace(
    new RegExp(`${MARK}(\\d+)${MARK}`, "g"),
    (_match, index: string) => kept[Number(index)]
  );
};

/** 고유명 밖에 가운데 점이 남았는지 (검사용) */
export const hasStrayInterpunct = (
  text: string,
  protectedNames: readonly string[]
): boolean => {
  let rest = text;
  for (const name of protectedNames) {
    rest = rest.split(name).join("");
  }
  return rest.includes(INTERPUNCT);
};

/** 리포트에 나오는 대학명·학과명 중 가운데 점이 든 것 (긴 것부터) */
export const collectProtectedNames = (
  content: JeongsiReportContent,
  extraNames: readonly string[] = []
): string[] => {
  const names = new Set<string>(extraNames);
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === "university" || key === "department") &&
        typeof child === "string"
      ) {
        names.add(child);
      } else {
        visit(child);
      }
    }
  };
  visit(content.sections);
  return [...names]
    .filter((name) => name.includes(INTERPUNCT))
    .sort((a, b) => b.length - a.length);
};

/** 리포트 본문(sections)의 모든 문자열에서 고유명 밖 가운데 점을 쉼표로 바꾼다 */
export const removeInterpunctsFromContent = (
  content: JeongsiReportContent,
  extraNames: readonly string[] = []
): JeongsiReportContent => {
  const protectedNames = collectProtectedNames(content, extraNames);
  const visit = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") {
      // 대학명·학과명 필드는 원문 표기 그대로 둔다
      return key === "university" || key === "department"
        ? value
        : removeInterpuncts(value, protectedNames);
    }
    if (Array.isArray(value)) {
      return value.map((item) => visit(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([childKey, child]) => [
          childKey,
          visit(child, childKey),
        ])
      );
    }
    return value;
  };
  return {
    ...content,
    sections: visit(content.sections) as JeongsiReportContent["sections"],
  };
};
