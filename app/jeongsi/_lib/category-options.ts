// ============================================================
// 희망 계열 선택지 (서버 전용 — 시행계획 JSON 을 fs 로 읽는다)
// ============================================================

import { loadAdmissionPlans } from "@/libs/jeongsi/data";

/**
 * 희망 계열 선택지 = 2027 시행계획에 실제로 있는 표준 카테고리.
 *
 * 수시용 DEPARTMENT_CATEGORY_MAP 전체(390종)를 쓰면 정시 모집단위가 없는
 * 계열(미술·태권도 등)이 목록에 섞여, 고르는 순간 빈 리포트가 된다.
 * 시행계획 데이터를 바꾸면 목록도 따라 바뀐다.
 */
export const loadCategoryOptions = async (): Promise<string[]> => {
  const plans = await loadAdmissionPlans();
  return Array.from(new Set(plans.map((plan) => plan.category))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
};
