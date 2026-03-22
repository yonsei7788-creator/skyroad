import { Bot, Check, ShieldCheck, X } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./DualVerificationSection.module.css";

const AI_ONLY_ITEMS = [
  "키워드 기반 단순 매칭",
  "할루시네이션 검증 없음",
  "일반적인 대학 추천",
  "정확도 편차가 큰 결과",
];

const SKYROAD_ITEMS = [
  "문장 맥락 + 교과 연계 + 성장 서사 정밀 판단",
  "전임 컨설턴트가 사실관계, 해석 오류 직접 수정",
  "최신 입시 데이터 기반 맞춤 전략",
  "이중 검수로 일관된 분석 품질 보장",
];

export const DualVerificationSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Why SKYROAD</p>
          <h2 className={styles.sectionTitle}>
            왜 자체개발 고도화 AI + 전문가인가?
          </h2>
          <p className={styles.sectionSubtitle}>
            자체 개발된 고도화 AI는 방대한 데이터를 빠짐없이 분석하고, 전문가는
            사람만이 할 수 있는 판단을 더합니다
          </p>
        </FadeIn>

        <div className={styles.grid}>
          {/* AI Only Card */}
          <FadeIn delay={0.1} direction="left">
            <div className={styles.cardNeutral}>
              <div className={styles.cardHeader}>
                <div className={styles.iconCircleNeutral}>
                  <Bot size={24} />
                </div>
                <h3 className={styles.cardTitle}>AI만 사용하는 서비스</h3>
              </div>
              <ul className={styles.itemList}>
                {AI_ONLY_ITEMS.map((text) => (
                  <li key={text} className={styles.item}>
                    <div className={styles.iconX}>
                      <X size={14} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* SKYROAD Card */}
          <FadeIn delay={0.2} direction="right">
            <div className={styles.cardPrimary}>
              <div className={styles.recommendBadge}>추천</div>
              <div className={styles.cardHeader}>
                <div className={styles.iconCirclePrimary}>
                  <ShieldCheck size={24} />
                </div>
                <h3 className={styles.cardTitlePrimary}>SKYROAD</h3>
              </div>
              <ul className={styles.itemList}>
                {SKYROAD_ITEMS.map((text) => (
                  <li key={text} className={styles.item}>
                    <div className={styles.iconCheck}>
                      <Check size={14} />
                    </div>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
