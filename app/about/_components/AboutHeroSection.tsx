"use client";

import { ArrowRight, Brain, UserCheck, FileText } from "lucide-react";

import { CtaButton } from "../../_components/CtaButton";
import { FadeIn } from "../../_components/FadeIn";
import styles from "./AboutHeroSection.module.css";

export const AboutHeroSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.gradientBlob} />
      <div className={styles.gradientBlobSecondary} />

      <div className={styles.container}>
        <div className={styles.content}>
          <FadeIn>
            <span className={styles.badge}>About SKYROAD</span>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className={styles.headline}>
              {"내 생기부,\n이대로 괜찮을까?"}
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className={styles.description}>
              {
                "SKYROAD는 AI 정밀 분석과 입시 전문가 검수를 결합하여,\n생활기록부의 숨겨진 강점과 보완점을 찾아드립니다."
              }
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            <CtaButton className={styles.ctaButton}>
              분석 시작하기
              <ArrowRight size={18} />
            </CtaButton>
          </FadeIn>
        </div>

        <FadeIn delay={0.2} direction="right">
          <div className={styles.visualCard}>
            <p className={styles.visualTitle}>분석 프로세스</p>
            <div className={styles.steps}>
              {/* Step 1 */}
              <div className={styles.stepRow}>
                <div className={styles.stepIndicator}>
                  <div
                    className={`${styles.stepNumber} ${styles.stepNumberPrimary}`}
                  >
                    1
                  </div>
                  <div className={styles.stepConnector} />
                </div>
                <div className={styles.stepContent}>
                  <div
                    className={`${styles.stepIcon} ${styles.stepIconPrimary}`}
                  >
                    <Brain size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>AI 분석</h3>
                  <p className={styles.stepDesc}>
                    생기부 전체를 문장 단위로 정밀 분석하여 강점과 보완점을
                    파악합니다.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={styles.stepRow}>
                <div className={styles.stepIndicator}>
                  <div
                    className={`${styles.stepNumber} ${styles.stepNumberPurple}`}
                  >
                    2
                  </div>
                  <div className={styles.stepConnector} />
                </div>
                <div className={styles.stepContent}>
                  <div
                    className={`${styles.stepIcon} ${styles.stepIconPurple}`}
                  >
                    <UserCheck size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>전문가 검수</h3>
                  <p className={styles.stepDesc}>
                    입시 전문가가 AI 분석 결과를 한 줄 한 줄 직접 검수하고
                    보완합니다.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={styles.stepRow}>
                <div className={styles.stepIndicator}>
                  <div
                    className={`${styles.stepNumber} ${styles.stepNumberGreen}`}
                  >
                    3
                  </div>
                </div>
                <div className={styles.stepContent}>
                  <div className={`${styles.stepIcon} ${styles.stepIconGreen}`}>
                    <FileText size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>리포트 전달</h3>
                  <p className={styles.stepDesc}>
                    72시간 내에 맞춤형 분석 리포트를 전달해 드립니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
