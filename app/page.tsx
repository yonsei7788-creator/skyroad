import type { Metadata } from "next";

import { Header } from "./_components/Header";
import { HeroSection } from "./_components/HeroSection";
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
  title: "SKYROAD - AI + 전문가 생기부 분석 서비스",
  description:
    "AI 분석과 전문가 검수를 결합한 생활기록부 정밀 분석 리포트를 48시간 안에 받아보세요. 합리적인 가격의 대입 컨설팅 서비스.",
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
