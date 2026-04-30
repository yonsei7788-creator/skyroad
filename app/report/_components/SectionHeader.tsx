import styles from "./report.module.css";

interface SectionHeaderProps {
  number: number;
  title: string;
  subtitle?: string;
  /** 노란색 형광펜 효과 적용 (기본값: true). false를 명시해야 미적용 */
  highlighted?: boolean;
}

export const SectionHeader = ({
  number,
  title,
  subtitle,
  highlighted = true,
}: SectionHeaderProps) => {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionNumber}>
        {String(number).padStart(2, "0")}
      </span>
      <div className={styles.sectionTitleGroup}>
        <span
          className={`${styles.sectionTitle}${highlighted ? ` ${styles.markerYellowTitle}` : ""}`}
        >
          {title}
        </span>
        {subtitle && <span className={styles.sectionSubtitle}>{subtitle}</span>}
      </div>
    </div>
  );
};
