import type { Viewport } from "next";

import { ReportScaler } from "@/app/report/_components/ReportScaler";

/**
 * 정시 리포트 열람 전용 레이아웃.
 *
 * JeongsiReport 는 A4 고정폭 페이지를 쌓는 구조라, 생기부 리포트와 같은
 * 스케일링이 필요하다. /jeongsi(입력 폼)와 /jeongsi/generating 에는
 * 적용되면 안 되므로 [id] 세그먼트에만 둔다.
 */
export const viewport: Viewport = {
  width: 980,
  initialScale: 0.4,
  maximumScale: 2,
  userScalable: true,
  themeColor: "#2563eb",
};

const JeongsiReportLayout = ({ children }: { children: React.ReactNode }) => {
  return <ReportScaler>{children}</ReportScaler>;
};

export default JeongsiReportLayout;
