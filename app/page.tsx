import type { Metadata } from "next";

import { Header } from "./_components/Header";
import { HeroSection, HeroPreview } from "./_components/HeroSection";
import heroStyles from "./_components/HeroSection.module.css";
import { TrustSection } from "./_components/TrustSection";
import { PainPointSection } from "./_components/PainPointSection";
import { DualVerificationSection } from "./_components/DualVerificationSection";
import { ProcessSection } from "./_components/ProcessSection";
import { ServiceCardSection } from "./_components/ServiceCardSection";
import { PreviewSection } from "./_components/PreviewSection";
import { PricingSection } from "./_components/PricingSection";
import { ReviewSlider } from "./_components/ReviewSlider";
import { FaqSection } from "./_components/FaqSection";
import { CtaSection } from "./_components/CtaSection";
import { Footer } from "./_components/Footer";

export const metadata: Metadata = {
  title: "SKYROAD.스카이로드 생기부분석 · 수시컨설팅 · 생기부컨설팅",
  description:
    "AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생기부를 진단합니다. 수시컨설팅·생기부컨설팅을 72시간 안에 합리적인 가격으로 받아보세요.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CtaSection />
        <div className={heroStyles.mobileOnly}>
          <HeroPreview />
        </div>
        <PainPointSection />
        <DualVerificationSection />
        <ProcessSection />
        <ServiceCardSection />
        <PreviewSection />
        <PricingSection />
        <ReviewSlider />
        <FaqSection />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}
