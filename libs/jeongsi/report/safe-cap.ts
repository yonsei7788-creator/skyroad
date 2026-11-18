/**
 * 안정 제한 사유 문구 (specs/014 3차 검토).
 *
 * 격차가 안정 구간이어도 근거가 부족하면 적정으로 둔다. 그 사유를 엔진 값에서
 * 그대로 만든다 — 학년도·원문 모집군만 쓰고 추정하지 않는다.
 */

import { SMALL_QUOTA_MAX } from "../engine/classify";

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
    return "공개 입결이 적은 곳";
  }
  if (reason === "모집군 변경") {
    return describePastGroups(source.pastGroups ?? []) ?? "모집군이 바뀐 곳";
  }
  if (reason === "소수 모집") {
    // 실측: 5명 이하 모집은 다음 해 컷이 더 크게 움직였다(classify.ts SMALL_QUOTA_MAX)
    return `모집인원이 ${SMALL_QUOTA_MAX}명 이하라 합격선이 해마다 크게 움직이는 곳`;
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
  // 사유를 "~이고, ~" 로 잇는다. 끝말은 "값·곳" 이라 뒤에 "이라"가 붙는다.
  // 입결 연도 수("1개년", "한 해뿐")는 리포트에 쓰지 않는다(사용자 결정 2026-11-15).
  return reasons.map((reason) => describeReason(reason, source)).join("이고, ");
};
