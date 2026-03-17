"use client";

import { useEffect } from "react";

const DESKTOP_WIDTH = 980;

/**
 * 모바일에서 PC 레이아웃을 축소 표시하는 래퍼.
 *
 * 디바이스 너비가 DESKTOP_WIDTH 미만이면 viewport meta 태그를 동적으로 조정하여
 * 브라우저가 자동으로 PC 레이아웃을 축소 렌더링한다.
 * - viewport width=980 → CSS 미디어 쿼리가 PC 기준으로 동작
 * - initial-scale = deviceWidth / 980 → 화면에 딱 맞게 축소
 */
export const ReportScaler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const deviceWidth = window.screen.width;
    if (deviceWidth >= DESKTOP_WIDTH) return;

    const scale = deviceWidth / DESKTOP_WIDTH;
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        `width=${DESKTOP_WIDTH}, initial-scale=${scale}, maximum-scale=2, user-scalable=yes`
      );
    }

    // cleanup: 다른 페이지로 이동 시 원래 viewport 복원
    return () => {
      if (meta) {
        meta.setAttribute("content", "width=device-width, initial-scale=1");
      }
    };
  }, []);

  return <>{children}</>;
};
