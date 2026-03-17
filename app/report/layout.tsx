import type { Viewport } from "next";

import { ReportScaler } from "./_components/ReportScaler";

/**
 * 리포트 전용 레이아웃
 *
 * 서버에서는 width=980으로 초기 렌더링 (CSS 미디어 쿼리 PC 기준 동작).
 * 클라이언트에서 ReportScaler가 디바이스 너비에 맞게 initial-scale을 동적 설정.
 */
export const viewport: Viewport = {
  width: 980,
  themeColor: "#2563eb",
};

const ReportLayout = ({ children }: { children: React.ReactNode }) => {
  return <ReportScaler>{children}</ReportScaler>;
};

export default ReportLayout;
