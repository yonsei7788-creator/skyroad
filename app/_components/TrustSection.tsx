import { Clock, FileText, ShieldCheck, Star } from "lucide-react";

import { FadeIn } from "./FadeIn";
import styles from "./TrustSection.module.css";

const STATS = [
  {
    icon: FileText,
    value: "1,800+",
    label: "누적 컨설팅 건수",
    colorClass: "blue" as const,
  },
  {
    icon: Star,
    value: "4.99/5.0",
    label: "평균 만족도",
    colorClass: "amber" as const,
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "전문가 검수율",
    colorClass: "green" as const,
  },
  {
    icon: Clock,
    value: "45시간",
    label: "평균 리포트 전달",
    colorClass: "purple" as const,
  },
];

const COLOR_MAP = {
  blue: styles.iconBgBlue,
  amber: styles.iconBgAmber,
  green: styles.iconBgGreen,
  purple: styles.iconBgPurple,
};

export const TrustSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {STATS.map(({ icon: Icon, value, label, colorClass }, index) => (
            <FadeIn key={label} delay={index * 0.1}>
              <div className={styles.card}>
                <div
                  className={`${styles.iconCircle} ${COLOR_MAP[colorClass]}`}
                >
                  <Icon size={22} />
                </div>
                <p className={styles.value}>{value}</p>
                <p className={styles.label}>{label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
