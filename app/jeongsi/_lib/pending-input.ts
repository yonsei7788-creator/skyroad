// ============================================================
// 입력 폼 → 생성 페이지 사이의 JeongsiInput 전달
//
// 정시 리포트는 주문(orderId)이 없으므로 쿼리스트링으로 넘길 식별자가
// 없다. 입력 전체를 sessionStorage 에 담아 /jeongsi/generating 이
// 꺼내 쓰고, 꺼내는 즉시 비운다. (새로고침 시 중복 생성 방지)
// ============================================================

import type { JeongsiInput } from "@/libs/jeongsi/types";

const PENDING_INPUT_KEY = "jeongsi:pending-input";

export const savePendingInput = (input: JeongsiInput): void => {
  try {
    sessionStorage.setItem(PENDING_INPUT_KEY, JSON.stringify(input));
  } catch {
    // 사파리 프라이빗 모드 등에서 저장이 막힐 수 있다 — 무시
  }
};

export const takePendingInput = (): JeongsiInput | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_INPUT_KEY);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(PENDING_INPUT_KEY);
    return JSON.parse(raw) as JeongsiInput;
  } catch {
    return null;
  }
};
