import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { AuthProvider } from "@/libs/store/auth-provider";
import { createClient } from "@/libs/supabase/server";
import { GaDisableAdmin } from "./_components/GaDisableAdmin";

import "./globals.css";

const GA_ID = "G-C61D02N2X0";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.skyroadedu.net"),
  title: {
    default: "SKYROAD.스카이로드 생기부분석 · 수시컨설팅 · 생기부컨설팅",
    template: "%s | SKYROAD",
  },
  description:
    "자체개발 프로그램 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
  keywords: [
    "스카이로드",
    "skyroad",
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
      "naver-site-verification": "decdbb9a0309c21f01cfe1be8adbb221a16ca776",
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SKYROAD.스카이로드 생기부분석 · 수시컨설팅 · 생기부컨설팅",
    description:
      "자체개발 프로그램 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
    type: "website",
    locale: "ko_KR",
    siteName: "SKYROAD",
  },
  twitter: {
    card: "summary_large_image",
    title: "SKYROAD.스카이로드 생기부분석 · 수시컨설팅 · 생기부컨설팅",
    description:
      "자체개발 프로그램 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "SKYROAD",
      url: "https://www.skyroadedu.net/",
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
        "자체개발 프로그램 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 제공합니다.",
      areaServed: "KR",
      serviceType: "수시컨설팅, 생기부컨설팅, 생활기록부 분석",
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProfile: {
    role: string | null;
    onboardingCompleted: boolean;
    hasRecord: boolean;
  } = { role: null, onboardingCompleted: false, hasRecord: false };

  if (user) {
    const [{ data }, { data: recordRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single(),
      supabase
        .from("records")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
    ]);
    if (data) {
      initialProfile = {
        role: data.role ?? null,
        onboardingCompleted: data.onboarding_completed ?? false,
        hasRecord: !!recordRow,
      };
    }
  }

  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider
          initialUser={user ?? undefined}
          initialProfile={initialProfile}
        >
          <GaDisableAdmin />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
