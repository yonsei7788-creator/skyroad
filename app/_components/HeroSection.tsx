import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import { CtaButton } from "./CtaButton";
import { FadeIn } from "./FadeIn";
import styles from "./HeroSection.module.css";

const MOCK_SCORES = [
  { label: "탐구 활동 일관성", score: 92, color: "#6366f1" },
  { label: "진로 연계성", score: 88, color: "#8b5cf6" },
  { label: "학업 역량 표현", score: 85, color: "#a78bfa" },
  { label: "교과 연계 심화", score: 62, color: "#f59e0b" },
];

const TRUST_BADGES = [
  { icon: Shield, label: "AI 정밀 분석" },
  { icon: UserCheck, label: "전임 컨설턴트 검수 포함" },
  { icon: Clock, label: "48시간 내 전달" },
];

export const HeroSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.bgGlow} />
      <div className={styles.container}>
        {/* Left: Text Content */}
        <div className={styles.textBlock}>
          <FadeIn delay={0} direction="up">
            <div className={styles.badge}>
              <ShieldCheck size={14} className={styles.badgeIcon} />
              <span>AI + 입시 전문 컨설턴트 이중 검증 시스템</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1} direction="up">
            <h1 className={styles.headline}>
              생기부 분석,
              <br />
              AI만으로는 부족합니다
            </h1>
          </FadeIn>

          <FadeIn delay={0.2} direction="up">
            <p className={styles.subtext}>
              &ldquo;이 생기부로 어디까지 갈 수 있을까?&rdquo;
              <br />
              <strong className={styles.subtextHighlight}>
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

          <FadeIn delay={0.3} direction="up">
            <CtaButton className={styles.ctaButton}>
              <span>생기부 진단 시작하기</span>
              <ArrowRight size={18} />
            </CtaButton>
          </FadeIn>

          <FadeIn delay={0.4} direction="up">
            <div className={styles.trustBadges}>
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className={styles.trustBadge}>
                  <Icon size={16} className={styles.trustBadgeIcon} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Right: Product Preview */}
        <FadeIn delay={0.5} direction="up" distance={50}>
          <div className={styles.previewWrapper}>
            <div className={styles.previewCard}>
              {/* Step indicator */}
              <div className={styles.stepIndicator}>
                <div className={styles.stepItem}>
                  <div className={styles.stepIconAi}>
                    <Bot size={14} />
                  </div>
                  <span className={styles.stepLabel}>AI 분석</span>
                </div>
                <div className={styles.stepArrow}>
                  <ArrowRight size={14} />
                </div>
                <div className={styles.stepItem}>
                  <div className={styles.stepIconExpert}>
                    <UserCheck size={14} />
                  </div>
                  <span className={styles.stepLabel}>전문가 검수</span>
                </div>
                <div className={styles.stepBadgeComplete}>
                  <CheckCircle2 size={12} />
                  완료
                </div>
              </div>

              <div className={styles.analysisHeader}>
                <div className={styles.analysisHeaderLeft}>
                  <BarChart3 size={16} />
                  <span>종합 분석 결과</span>
                </div>
                <div className={styles.analysisBadge}>
                  <CheckCircle2 size={12} />
                  검수 완료
                </div>
              </div>

              <div className={styles.scoreSection}>
                <div className={styles.totalScore}>
                  <svg viewBox="0 0 100 100" className={styles.scoreRing}>
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="8"
                      strokeDasharray="221"
                      strokeDashoffset="44"
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className={styles.scoreCenter}>
                    <span className={styles.scoreNum}>258.89</span>
                    <span className={styles.scoreTotal}>/300점</span>
                  </div>
                </div>

                <div className={styles.barList}>
                  {MOCK_SCORES.map((item) => (
                    <div key={item.label} className={styles.barItem}>
                      <div className={styles.barMeta}>
                        <span className={styles.barLabel}>{item.label}</span>
                        <span className={styles.barValue}>{item.score}%</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${item.score}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
