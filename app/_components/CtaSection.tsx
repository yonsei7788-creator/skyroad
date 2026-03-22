import { Check, Zap } from "lucide-react";

import { CtaButton } from "./CtaButton";
import { FadeIn } from "./FadeIn";
import styles from "./CtaSection.module.css";

const SUB_ITEMS = [
  "간편 회원가입 후 바로 이용",
  "72시간 내 리포트 전달",
  "전임 컨설턴트 검수 포함",
];

export const CtaSection = () => {
  return (
    <section id="cta" className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <div className={styles.card}>
            <h2 className={styles.headline}>
              내 생기부, AI + 전문가가
              <br />
              72시간 안에 분석해드립니다
            </h2>
            <p className={styles.subtext}>
              대학이 보는 기준을 반영한 실전형 분석입니다. 전임 컨설턴트가 직접
              검수한 리포트를 받아보세요.
            </p>

            <CtaButton className={styles.ctaButton}>
              <Zap size={20} />
              지금 바로 분석 시작하기
            </CtaButton>

            <div className={styles.subInfo}>
              {SUB_ITEMS.map((text) => (
                <span key={text} className={styles.subInfoItem}>
                  <Check size={16} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
