"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

import { FadeIn } from "../../_components/FadeIn";
import styles from "./ReviewSection.module.css";

interface Review {
  name: string;
  grade: string;
  stars: number;
  text: string;
}

const REVIEWS: Review[] = [
  {
    name: "김○현",
    grade: "고3",
    stars: 5,
    text: "세특 분석이 정말 꼼꼼해서 놀랐어요. 제가 미처 몰랐던 강점을 짚어줘서 자소서 쓸 때 큰 도움이 됐습니다.",
  },
  {
    name: "이○서",
    grade: "고2",
    stars: 5,
    text: "생기부 분석이 이렇게 체계적일 수 있다는 걸 처음 알았어요. 학기 시작 전에 받아서 방향을 잡을 수 있었습니다.",
  },
  {
    name: "박○민",
    grade: "고3",
    stars: 4,
    text: "72시간 안에 리포트가 온다고 해서 반신반의했는데, 정말로 이틀 만에 상세한 분석 결과를 받았습니다.",
  },
  {
    name: "최○윤",
    grade: "고3",
    stars: 5,
    text: "전공 적합성 분석이 가장 유용했어요. 어떤 활동이 부족한지 명확하게 알 수 있었습니다.",
  },
  {
    name: "정○아",
    grade: "고2",
    stars: 5,
    text: "담임 선생님도 리포트를 보시고 놀라셨어요. 객관적인 분석 자료로 상담할 때 활용하기 좋았습니다.",
  },
  {
    name: "한○준",
    grade: "고3",
    stars: 4,
    text: "수시/정시 전략 비교가 특히 도움됐습니다. 어디에 집중해야 할지 감이 잡혔어요.",
  },
];

const renderStars = (count: number): string => {
  return "★".repeat(count) + "☆".repeat(5 - count);
};

export const ReviewSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <h2 className={styles.sectionTitle}>실제 이용자 후기</h2>
          <p className={styles.sectionSubtitle}>
            스카이로드를 먼저 경험한 학생들의 솔직한 이야기
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className={styles.sliderWrapper} ref={scrollRef}>
            <div className={styles.slider}>
              {REVIEWS.map((review, index) => (
                <motion.div
                  key={index}
                  className={styles.card}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.cardStars}>
                    {renderStars(review.stars)}
                  </div>
                  <p className={styles.cardText}>{review.text}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardName}>{review.name}</span>
                    <span className={styles.cardGrade}>{review.grade}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
