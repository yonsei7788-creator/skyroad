import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/libs/store/auth-provider";

import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://skyroadedu.net"),
  title: {
    default: "SKYROAD - AI 기반 생활기록부 분석 서비스",
    template: "%s | SKYROAD",
  },
  description:
    "AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
  keywords: [
    "수시컨설팅",
    "생기부컨설팅",
    "생기부 분석",
    "생활기록부 분석",
    "입시 컨설팅",
    "대입 컨설팅",
    "학생부 분석",
    "AI 생활기록부",
    "AI 입시",
    "학생부종합전형",
    "생기부 리포트",
    "수시 준비",
  ],
  verification: {
    other: {
      "naver-site-verification": "606e4f1a9b0f7659ebf697a760b75a3c5d7dab7c",
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SKYROAD - AI 생기부 분석 | 수시컨설팅 · 생기부컨설팅",
    description:
      "AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "SKYROAD",
  },
  twitter: {
    card: "summary_large_image",
    title: "SKYROAD - AI 생기부 분석 | 수시컨설팅 · 생기부컨설팅",
    description:
      "AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "SKYROAD",
      url: "https://skyroadedu.net",
      description:
        "AI + 입시 컨설턴트 이중 검증 생활기록부 분석 서비스. 수시컨설팅·생기부컨설팅 전문.",
    },
    {
      "@type": "Service",
      name: "SKYROAD 생기부 분석 · 수시컨설팅",
      provider: {
        "@type": "Organization",
        name: "SKYROAD",
      },
      description:
        "AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 제공합니다.",
      areaServed: "KR",
      serviceType: "수시컨설팅, 생기부컨설팅, 생활기록부 분석",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
