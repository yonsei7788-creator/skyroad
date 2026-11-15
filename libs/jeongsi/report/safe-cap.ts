/**
 * 안정 제한 사유 문구 (specs/014 3차 검토).
 *
 * 격차가 안정 구간이어도 근거가 부족하면 적정으로 둔다. 그 사유를 엔진 값에서
 * 그대로 만든다 — 학년도·원문 모집군만 쓰고 추정하지 않는다.
 */

import type { AdmissionGroup, SafeCapReason } from "../types";

export interface SafeCapSource {
  safeCapReasons?: SafeCapReason[];
  pastGroups?: { year: number; group: AdmissionGroup }[];
  resultYears: number[];
}

/** "2025·2026 입결은 나군 모집 때 값" (군이 같으면 묶는다) */
export const describePastGroups = (
  pastGroups: { year: number; group: AdmissionGroup }[]
): string | null => {
  if (pastGroups.length === 0) {
    return null;
  }
  const byGroup = new Map<AdmissionGroup, number[]>();
  for (const { year, group } of pastGroups) {
    byGroup.set(group, [...(byGroup.get(group) ?? []), year]);
  }
  return [...byGroup.entries()]
    .map(([group, years]) => `${years.join(", ")} 입결은 ${group}군 모집 때 값`)
    .join(", ");
};

/** 사유 하나를 짧은 구로 */
const describeReason = (
  reason: SafeCapReason,
  source: SafeCapSource
): string => {
  if (reason === "1개년 입결") {
    return `입결이 ${source.resultYears.join(", ")} 한 해뿐`;
  }
  if (reason === "모집군 변경") {
    return describePastGroups(source.pastGroups ?? []) ?? "모집군이 바뀐 곳";
  }
  return "대학 환산점수 입결이 없어 평균 백분위로 비교한 곳";
};

/** 해당하는 사유를 모두 이은 구. 사유가 없으면 null */
export const describeSafeCapReasons = (
  source: SafeCapSource
): string | null => {
  const reasons = source.safeCapReasons ?? [];
  if (reasons.length === 0) {
    return null;
  }
  // 사유를 "~이고, ~" 로 잇는다. 끝말은 "뿐·값·곳" 이라 뒤에 "이라"가 붙는다.
  return reasons.map((reason) => describeReason(reason, source)).join("이고, ");
};
