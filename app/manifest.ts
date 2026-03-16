import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SKYROAD - AI 기반 생활기록부 분석 서비스",
    short_name: "SKYROAD",
    description:
      "입시 전문가 수준의 생기부 정밀 분석 리포트를 72시간 안에 받아보세요.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
