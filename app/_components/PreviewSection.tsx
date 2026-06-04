import { BadgeCheck } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./PreviewSection.module.css";

const STRENGTHS = [
  { label: "탐구 활동 일관성", score: 92 },
  { label: "진로 연계성", score: 88 },
  { label: "학업 역량 표현", score: 85 },
];

const WEAKNESSES = [
  { label: "교과 연계 심화", score: 62 },
  { label: "리더십/협업 활동", score: 58 },
];

const STRATEGIES = [
  { label: "학종 전략 적합도", score: 82 },
  { label: "정시 전략 적합도", score: 55 },
];

const TAGS = [
  "생명과학 탐구",
  "학종 유리",
  "세특 보강 필요",
  "진로 일관성 우수",
  "교과 심화 부족",
];

const ScoreBar = ({
  score,
  variant,
}: {
  score: number;
  variant: "primary" | "warning" | "neutral";
}) => {
  const variantClass = {
    primary: styles.scoreBarPrimary,
    warning: styles.scoreBarWarning,
    neutral: styles.scoreBarNeutral,
  };

  return (
    <div className={styles.scoreBarOuter}>
      <div className={styles.scoreBarTrack}>
        <div
          className={`${styles.scoreBarFill} ${variantClass[variant]}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={styles.scoreValue}>{score}%</span>
    </div>
  );
};

export const PreviewSection = () => {
  return (
    <section id="preview" className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Preview</p>
          <h2 className={styles.sectionTitle}>
            빅데이터 분석 + 전문가 검수, 이런 리포트가 완성됩니다
          </h2>
          <p className={styles.sectionSubtitle}>
            실제 분석 결과의 일부를 미리 확인해보세요
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardHeaderLabel}>Sample Report</p>
                  <h3 className={styles.cardHeaderTitle}>종합 분석 결과</h3>
                </div>
                <div className={styles.statusBadges}>
                  <div className={styles.statusBadge}>
                    <span className={styles.statusDot} />
                    AI 분석 완료
                  </div>
                  <div
                    className={`${styles.statusBadge} ${styles.statusBadgeVerified}`}
                  >
                    <BadgeCheck size={14} />
                    전문가 검수 완료
                  </div>
                </div>
              </div>

              <div className={styles.cardBody}>
                {/* Left Column */}
                <div className={styles.cardCol}>
                  <div>
                    <h4 className={styles.groupHeading}>
                      <span
                        className={`${styles.groupIcon} ${styles.groupIconSuccess}`}
                      >
                        S
                      </span>
                      강점 영역
                    </h4>
                    <div className={styles.scoreList}>
                      {STRENGTHS.map((item) => (
                        <div key={item.label}>
                          <p className={styles.scoreLabel}>{item.label}</p>
                          <ScoreBar score={item.score} variant="primary" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className={styles.groupHeading}>
                      <span
                        className={`${styles.groupIcon} ${styles.groupIconWarning}`}
                      >
                        W
                      </span>
                      개선 필요 영역
                    </h4>
                    <div className={styles.scoreList}>
                      {WEAKNESSES.map((item) => (
                        <div key={item.label}>
                          <p className={styles.scoreLabel}>{item.label}</p>
                          <ScoreBar score={item.score} variant="warning" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className={styles.cardCol}>
                  <div>
                    <h4 className={styles.groupHeading}>
                      <span
                        className={`${styles.groupIcon} ${styles.groupIconPrimary}`}
                      >
                        R
                      </span>
                      추천 전략
                    </h4>
                    <div className={styles.scoreList}>
                      {STRATEGIES.map((item) => (
                        <div key={item.label}>
                          <p className={styles.scoreLabel}>{item.label}</p>
                          <ScoreBar
                            score={item.score}
                            variant={item.score >= 70 ? "primary" : "neutral"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.insightBox}>
                    <h4 className={styles.insightTitle}>AI 분석 인사이트</h4>
                    <p className={styles.insightText}>
                      &ldquo;생명과학 분야의 탐구 활동이 일관되게 이어지고 있어
                      학생부종합전형에 강점이 있습니다. 2학년 세특에서 교과 연계
                      심화 탐구를 보강하면 상위권 대학 지원 경쟁력이 크게
                      높아집니다.&rdquo;
                    </p>
                  </div>

                  <div className={styles.expertBox}>
                    <h4 className={styles.expertTitle}>
                      <BadgeCheck size={16} />
                      전문가 검수 코멘트
                    </h4>
                    <p className={styles.expertText}>
                      &ldquo;AI 분석 결과를 검토한 결과, 생명과학 탐구 일관성
                      평가가 정확합니다. 다만 2학년 세특의 교과 연계 심화는 보통
                      수준으로 조정하였습니다.&rdquo;
                    </p>
                  </div>

                  <div>
                    <h4 className={styles.tagsTitle}>핵심 키워드</h4>
                    <div className={styles.tagsList}>
                      {TAGS.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className={styles.footnote}>
              * 위 내용은 이해를 돕기 위한 샘플 데이터이며 실제 분석 결과와 다를
              수 있습니다
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
