import type { Metadata } from "next";

import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ReviewSlider } from "../_components/ReviewSlider";
import { AboutHeroSection } from "./_components/AboutHeroSection";
import { ProblemSection } from "./_components/ProblemSection";
import { SolutionSection } from "./_components/SolutionSection";
import { DifferenceSection } from "./_components/DifferenceSection";
import { TargetSection } from "./_components/TargetSection";
import { AboutCtaSection } from "./_components/AboutCtaSection";

export const metadata: Metadata = {
  title: "서비스 소개 · 수시컨설팅 · 생기부컨설팅",
  description:
    "SKYROAD는 자체 개발 고도화 AI 정밀 분석 + 입시 컨설턴트 2차 검수로 생활기록부를 진단합니다. 기존 수시컨설팅·생기부컨설팅 대비 합리적인 가격으로 전문가 수준의 분석 리포트를 제공합니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <AboutHeroSection />
        <ProblemSection />
        <SolutionSection />
        <DifferenceSection />
        <ReviewSlider />
        <TargetSection />
        <AboutCtaSection />
      </main>
      <Footer />
    </>
  );
}
