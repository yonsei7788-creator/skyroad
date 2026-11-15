import styles from "./report.module.css";

interface ReportActionItemProps {
  title: string;
  items: string[];
  variant?: "default" | "accent" | "weakness";
}

const VARIANT_CLASS = {
  default: styles.card,
  accent: styles.cardAccent,
  weakness: styles.calloutWeakness,
};

export const ReportActionItem = ({
  title,
  items,
  variant = "default",
}: ReportActionItemProps) => {
  return (
    <div className={VARIANT_CLASS[variant]}>
      <div className={`${styles.cardTitle} ${styles.mb8}`}>{title}</div>
      <ul className={styles.list}>
        {items.map((item, idx) => (
          <li key={`item-${idx}`} className={styles.listItem}>
            {String(item)}
          </li>
        ))}
      </ul>
    </div>
  );
};
