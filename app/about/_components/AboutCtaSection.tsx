import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FadeIn } from "../../_components/FadeIn";
import styles from "./AboutCtaSection.module.css";

export const AboutCtaSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <div className={styles.inner}>
            <div className={styles.textGroup}>
              <p className={styles.stat}>
                합리적인 가격으로{" "}
                <strong className={styles.statHighlight}>
                  전문가 수준의 분석
                </strong>
                을 받아보세요
              </p>
              <p className={styles.statSub}>
                자체 개발 고도화 AI + 전문가 이중 검수, 72시간 내 리포트 전달
              </p>
            </div>
            <Link href="/pricing" className={styles.ctaButton}>
              이용권 구매하기
              <ArrowRight size={18} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
