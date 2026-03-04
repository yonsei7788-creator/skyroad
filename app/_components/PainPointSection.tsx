import { AlertTriangle, HelpCircle, Shield, Target } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./PainPointSection.module.css";

const PAIN_POINTS = [
  {
    icon: HelpCircle,
    title: "내 생기부, 객관적으로 어느 수준일까?",
    description:
      "선생님 말씀만으로는 판단이 어렵고, 비교 기준이 없어 불안합니다.",
    colorClass: "iconPrimary",
  },
  {
    icon: AlertTriangle,
    title: "남은 시간, 지금 방향이 맞는지 확신하시나요?",
    description:
      "무엇을 더 해야 할지가 아니라, 지금 반드시 해야 할 것부터 정확히 아는 것이 중요합니다.",
    colorClass: "iconOrange",
  },
  {
    icon: Target,
    title: "같은 생기부인데, 왜 지원 전략에 따라 결과가 달라질까요?",
    description:
      "우리 아이에게 가장 유리한 전형과 대학을 전략적으로 선택하고 계신가요?",
    colorClass: "iconGreen",
  },
  {
    icon: Shield,
    title: "왜 비슷한 학생인데 결과는 다를까요?",
    description:
      "결과를 바꾸는 건 스펙이 아니라 '전략'입니다. 지금 전략이 제대로 세워져 있는지 확인해보세요.",
    colorClass: "iconPurple",
  },
] as const;

export const PainPointSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <FadeIn>
          <p className={styles.sectionLabel}>Pain Points</p>
          <h2 className={styles.sectionTitle}>
            혹시 이런 고민, 하고 계신가요?
          </h2>
        </FadeIn>

        <div className={styles.grid}>
          {PAIN_POINTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <FadeIn key={item.title} delay={index * 0.1}>
                <div className={styles.card}>
                  <div
                    className={`${styles.iconCircle} ${styles[item.colorClass]}`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardDescription}>{item.description}</p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};
