import { Quote, Sparkles, Star } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./FeaturedReviewSection.module.css";

type FeaturedReview = {
  name: string;
  initial: string;
  context: string;
  date: string;
  rating: number;
  highlight: string;
  body: string;
};

// 핵심 강점(자체 개발 AI + 전임 컨설턴트 2차 검수)을 자연스럽게 드러내는
// 큐레이션 후기. 실제 REVIEWS 데이터에서 발췌·요약.
const FEATURED_REVIEWS: FeaturedReview[] = [
  {
    name: "박**",
    initial: "박",
    context: "삼수생 · 군수 지원",
    date: "2025.07",
    rating: 5,
    highlight: "AI + 전문가 검수",
    body: "<strong>생기부 문단 단위로 장점과 단점</strong>을 끄집어내고, 자소서 방향까지 세심히 분석해 주셨어요. 과기원만 보던 저에게 더 위 대학까지 가능하다는 분석 — 결국 그렇게 됐습니다.",
  },
  {
    name: "이**",
    initial: "이",
    context: "고3 수시 컨설팅",
    date: "2025.11",
    rating: 5,
    highlight: "전임 컨설턴트 정밀 분석",
    body: "성적만 보고 추천이 아니라, 제가 미처 생각하지 못한 <strong>강점과 방향까지 세밀하게 분석</strong>해주셔서 깜짝 놀랐어요. 어떤 전략으로 준비할지 명확해졌습니다.",
  },
  {
    name: "미**",
    initial: "미",
    context: "고3 학부모",
    date: "2025.09",
    rating: 5,
    highlight: "생기부 정밀 진단",
    body: "<strong>생기부 분석이 꼼꼼해서</strong> 객관적으로 점검받을 수 있었습니다. 학원 한 번 안 다닌 아이의 생기부를 자신 있게 정리할 수 있게 도와주셨어요.",
  },
  {
    name: "윤**",
    initial: "윤",
    context: "고3 수시 · 종합/교과",
    date: "2025.08",
    rating: 5,
    highlight: "이중 검수 품질",
    body: "보내주신 자료가 너무 꼼꼼했고, <strong>부족한 점·보완할 점·장점</strong>까지 자세히 알려주셔서 면접 준비에도 큰 도움이 됐어요. 종합·교과 선택 근거까지 명확히 설명해주셨습니다.",
  },
  {
    name: "태**",
    initial: "태",
    context: "고3 수시 첫 컨설팅",
    date: "2025.09",
    rating: 5,
    highlight: "체계적 대학 매칭",
    body: "생기부와 성적을 자세히 분석하시고 <strong>대학·전형을 깔끔하고 구체적으로 정리</strong>해주셨습니다. 담임 선생님 상담 후에도 정리되지 않던 리스트가 한 번에 정리됐어요.",
  },
  {
    name: "김**",
    initial: "김",
    context: "고3 학부모",
    date: "2026.01",
    rating: 5,
    highlight: "체계·꼼꼼한 분석",
    body: "단순한 수치 중심의 상담이 아니라, 아이의 <strong>감정과 가능성을 함께 고려해 방향을 제시</strong>해 주셔서 신뢰가 갔습니다. 대입 전반에 대한 전문적인 시각과 객관적인 분석을 받았어요.",
  },
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className={styles.stars} aria-label={`${rating}점`} role="img">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < rating ? "currentColor" : "none"}
        strokeWidth={1.5}
        className={i < rating ? styles.starFilled : ""}
      />
    ))}
  </div>
);

const ReviewCard = ({ review }: { review: FeaturedReview }) => {
  return (
    <article className={styles.card}>
      <div className={styles.quote} aria-hidden="true">
        <Quote size={16} fill="currentColor" strokeWidth={0} />
      </div>
      <StarRating rating={review.rating} />
      <span className={styles.highlight}>
        <Sparkles size={12} strokeWidth={2.5} />
        {review.highlight}
      </span>
      <p
        className={styles.cardText}
        dangerouslySetInnerHTML={{ __html: review.body }}
      />
      <div className={styles.cardFooter}>
        <div className={styles.author}>
          <span className={styles.avatar} aria-hidden="true">
            {review.initial}
          </span>
          <div className={styles.authorMeta}>
            <span className={styles.name}>{review.name}</span>
            <span className={styles.context}>{review.context}</span>
          </div>
        </div>
        <span className={styles.date}>{review.date}</span>
      </div>
    </article>
  );
};

export const FeaturedReviewSection = () => {
  return (
    <section
      id="reviews"
      className={styles.section}
      aria-labelledby="featured-reviews-title"
    >
      <div className={styles.container}>
        <FadeIn direction="up">
          <div className={styles.eyebrowWrapper}>
            <span className={styles.eyebrow}>
              <Sparkles size={12} strokeWidth={2.5} />
              REAL REVIEWS
            </span>
          </div>
          <h2 id="featured-reviews-title" className={styles.title}>
            선배들의 <span className={styles.titleAccent}>찐후기</span>로 보는
            <br />
            놀라운 분석 경험
          </h2>
          <p className={styles.subtitle}>
            자체 개발 AI 정밀 분석과 전임 컨설턴트의 2차 검수,
            <br />그 차이를 먼저 경험한 분들의 진짜 이야기입니다.
          </p>
        </FadeIn>

        <div className={styles.grid}>
          {FEATURED_REVIEWS.map((review, i) => (
            <FadeIn
              key={`${review.name}-${review.date}`}
              direction="up"
              delay={0.1 + i * 0.05}
            >
              <ReviewCard review={review} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
