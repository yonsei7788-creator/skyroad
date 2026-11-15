import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SKYROAD.스카이로드 생기부분석 · 수시컨설팅 · 생기부컨설팅",
    short_name: "SKYROAD",
    description:
      "자체개발 프로그램 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
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
