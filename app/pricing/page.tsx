import type { Metadata } from "next";

import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { FadeIn } from "../_components/FadeIn";
import { CtaButton } from "../_components/CtaButton";
import { PlanCards } from "./_components/PlanCards";
import { ComparisonTable } from "./_components/ComparisonTable";
import { PricingFaq } from "./_components/PricingFaq";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "이용권",
  description:
    "SKYROAD 생기부 분석 리포트 이용권을 확인하세요. Lite, Standard, Premium 3가지 플랜으로 나에게 맞는 분석을 선택할 수 있습니다.",
  alternates: {
    canonical: "/pricing",
  },
};

const TRUST_STATS = [
  { value: "1,000+", label: "누적 분석" },
  { value: "4.99", label: "만족도" },
  { value: "100%", label: "전문가 검수" },
  { value: "38시간", label: "평균 전달" },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <FadeIn>
              <p className={styles.sectionLabel}>Pricing</p>
              <h1 className={styles.heroTitle}>
                생기부 분석, 딱 맞는 플랜을 골라보세요
              </h1>
              <p className={styles.heroSubtitle}>
                <strong className={styles.heroHighlight}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="#ef4444"
                    style={{
                      display: "inline",
                      verticalAlign: "-2px",
                      marginRight: 4,
                    }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
                  </svg>
                  AI 정밀 분석 + 입시 전문가 2차 검수
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="#ef4444"
                    style={{
                      display: "inline",
                      verticalAlign: "-2px",
                      marginLeft: 4,
                    }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
                  </svg>
                </strong>
              </p>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className={styles.trustBar}>
                {TRUST_STATS.map((stat) => (
                  <div key={stat.label} className={styles.trustItem}>
                    <span className={styles.trustValue}>{stat.value}</span>
                    <span className={styles.trustLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>

        <PlanCards />

        <ComparisonTable />

        <PricingFaq />

        <section className={styles.bottomCta}>
          <div className={styles.container}>
            <FadeIn>
              <p className={styles.bottomCtaTitle}>아직 고민 중이신가요?</p>
              <p className={styles.bottomCtaSubtitle}>
                Standard Report가 가장 많이 선택되는 이유가 있습니다
              </p>
              <CtaButton className={styles.bottomCtaButton} plan="standard">
                Standard Report 선택하기
              </CtaButton>
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
