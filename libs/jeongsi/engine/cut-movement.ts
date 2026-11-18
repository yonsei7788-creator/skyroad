// ============================================================
// 다음 해 컷 이동 실측 (specs/014 B2)
//
// 2025 입결 한 해로 만든 기준컷(모집인원 보정 포함)과 2026 실제 70% 컷을, 두 해
// 모두 환산점수 입결이 있고 2025·2026·2027 모집군이 같은 모집단위에서 견준다.
// 만점 대비 % 로 잰 "다음 해 컷 − 기준컷" 분포다.
//
// 이 분포로 "기준컷 대비 격차가 g 인 학생이 다음 해 컷을 넘은 비율"을 구한다.
// 원문 입결만 쓰고 추정값을 만들지 않는다. 판정 구간(GAP_BANDS)도 이 분포에서 정했다.
// ============================================================

import { isSmallQuota, quotaAdjustmentInGap } from "./classify";

import type { JeongsiAdmissionPlan, JeongsiResultEntry } from "../types";

const FROM_YEAR = 2025;
const TO_YEAR = 2026;

export interface CutMovement {
  /** 다음 해 컷 − 기준컷 (격차 단위), 오름차순 */
  deltas: number[];
  fromYear: number;
  toYear: number;
}

/** 실측 분포. 두 해 모두 같은 지표의 70% 컷이 있는 모집단위만 쓴다 */
export const buildCutMovement = (
  plans: JeongsiAdmissionPlan[],
  resultsOf: (plan: JeongsiAdmissionPlan) => JeongsiResultEntry[],
  /**
   * 표본 범위. smallQuota 는 다음 해(2026) 모집인원이 SMALL_QUOTA_MAX 이하인 곳만,
   * regularQuota 는 그 밖만 잰다. 판정하는 해(2027)의 모집인원으로 고르는 것과 같은 기준이다.
   */
  scope: "all" | "smallQuota" | "regularQuota" = "all"
): CutMovement => {
  const deltas = plans.flatMap((plan) => {
    const results = resultsOf(plan);
    const from = results.find((entry) => entry.admissionYear === FROM_YEAR);
    const to = results.find((entry) => entry.admissionYear === TO_YEAR);
    if (!from?.cut70 || !to?.cut70) return [];
    if (scope === "smallQuota" && !isSmallQuota(to.quota)) return [];
    if (scope === "regularQuota" && isSmallQuota(to.quota)) return [];
    if (from.cut70.metric !== to.cut70.metric) return [];
    // 백분위 입결은 두 해를 비교할 수 있는 곳이 16곳뿐이라 따로 잴 수 없고,
    // 환산점수와 섞으면 환산점수 모집단위의 비율이 흐려진다.
    if (from.cut70.metric !== "convertedScore") return [];
    // 모집군이 바뀐 해의 컷 이동은 군 변경 효과가 섞여 같은 분포로 볼 수 없다.
    if (from.group !== to.group || to.group !== plan.group) return [];
    if (from.cut70.value <= 0 || to.cut70.value <= 0) return [];

    const unitPerGap = plan.formula.totalScore / 100;
    const reference =
      from.cut70.value +
      quotaAdjustmentInGap(to.quota, from.quota) * unitPerGap;
    return [(to.cut70.value - reference) / unitPerGap];
  });

  return {
    deltas: deltas.sort((a, b) => a - b),
    fromYear: FROM_YEAR,
    toYear: TO_YEAR,
  };
};

/**
 * 기준컷 대비 격차가 gap 인 학생이 다음 해 컷을 넘은 비율 (0~1).
 * 실측 표본이 없으면 null.
 */
export const passRateFor = (
  movement: CutMovement,
  gap: number
): number | null => {
  if (movement.deltas.length === 0) return null;
  const passed = movement.deltas.filter((delta) => delta <= gap).length;
  return Math.round((passed / movement.deltas.length) * 1000) / 1000;
};
