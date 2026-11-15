import { Check, Star } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./ReviewSection.module.css";

interface Review {
  name: string;
  grade: string;
  rating: number;
  text: string;
  plan: string;
  highlight: string;
}

const MOCK_REVIEWS: Review[] = [
  {
    name: "김○○",
    grade: "고3",
    rating: 5,
    text: "AI 분석만 해주는 곳은 많은데, 여기는 전문가가 직접 검수까지 해줘서 결과가 확실히 달랐어요. 세특 부족한 부분을 정확히 짚어줘서 2학기 활동 계획을 바로 세웠습니다. 컨설팅 50만원 아꼈어요.",
    plan: "Standard",
    highlight: "세특 분석의 정확도",
  },
  {
    name: "이○○",
    grade: "고2",
    rating: 5,
    text: "솔직히 반신반의했는데 리포트를 받고 깜짝 놀랐어요. 내 생기부의 강점과 약점을 이렇게 명확하게 분석해줄 줄은 몰랐습니다. 탐구 주제 추천도 실제로 활용 가능한 수준이에요.",
    plan: "Lite",
    highlight: "Lite 플랜도 기대 이상의 퀄리티",
  },
  {
    name: "박○○",
    grade: "재수생",
    rating: 4,
    text: "대학 지원 조합이 특히 도움이 됐습니다. 재수하면서 어디를 지원해야 할지 막막했는데, 합격 가능성까지 분석해줘서 전략을 확실하게 잡을 수 있었어요.",
    plan: "Standard",
    highlight: "대학 지원 전략",
  },
  {
    name: "최○○",
    grade: "학부모",
    rating: 5,
    text: "학원이나 과외 선생님한테 물어봐도 괜찮다는 말뿐이었는데, 여기는 AI가 데이터로 분석하고 전문가가 직접 검수해주니까 근거 있는 결과를 받을 수 있었어요. 프리미엄 리포트는 정말 대형 컨설팅 수준이었습니다.",
    plan: "Premium",
    highlight: "전문가 검수의 신뢰감",
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className={styles.stars} aria-label={`${rating}점`} role="img">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < rating ? "currentColor" : "none"}
        strokeWidth={1.5}
        className={i < rating ? styles.starFilled : styles.starEmpty}
      />
    ))}
  </div>
);

export const ReviewSection = () => {
  return (
    <section id="reviews" className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Reviews</p>
          <h2 className={styles.sectionTitle}>이용자 후기</h2>
          <p className={styles.sectionSubtitle}>
            자체 개발 고도화 AI 분석 + 전문가 검수 리포트를 받아본 분들의
            후기입니다
          </p>
        </FadeIn>

        <div className={styles.cardsGrid}>
          {MOCK_REVIEWS.map((review, index) => (
            <FadeIn key={review.name} delay={index * 0.1}>
              <div className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>{review.name.charAt(0)}</div>
                    <div>
                      <p className={styles.userName}>
                        {review.name}{" "}
                        <span className={styles.userGrade}>
                          · {review.grade}
                        </span>
                      </p>
                      <StarRating rating={review.rating} />
                    </div>
                  </div>
                  <span className={styles.planBadge}>{review.plan}</span>
                </div>

                <p className={styles.reviewText}>&ldquo;{review.text}&rdquo;</p>

                <div className={styles.highlight}>
                  <Check size={16} className={styles.highlightIcon} />
                  {review.highlight}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <p className={styles.footnote}>
          * 위 후기는 서비스 이해를 위한 샘플 데이터입니다
        </p>
      </div>
    </section>
  );
};
