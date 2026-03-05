import styles from "./report.module.css";

interface ReportProgressProps {
  label: string;
  value: number;
  max?: number;
  variant?: "default" | "strength" | "weakness" | "trendUp" | "trendDown";
}

const FILL_CLASS = {
  default: styles.progressFill,
  strength: styles.progressFillStrength,
  weakness: styles.progressFillWeakness,
  trendUp: styles.progressFillTrendUp,
  trendDown: styles.progressFillTrendDown,
};

export const ReportProgress = ({
  label,
  value,
  max = 100,
  variant = "default",
}: ReportProgressProps) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={styles.progressRow}>
      <span className={styles.progressLabel}>{label}</span>
      <div className={`${styles.progressBar} ${styles.flexOne}`}>
        <div className={FILL_CLASS[variant]} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.progressValue}>{value}%</span>
    </div>
  );
};

/* -- Comparison Bar -- */
interface ComparisonBarProps {
  myValue: number;
  rangeStart: number;
  rangeEnd: number;
  myLabel?: string;
  rangeLabel?: string;
  max?: number;
}

export const ReportComparisonBar = ({
  myValue,
  rangeStart,
  rangeEnd,
  myLabel = "내 점수",
  rangeLabel = "합격 구간",
  max = 100,
}: ComparisonBarProps) => {
  const toPct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));

  return (
    <div style={{ paddingTop: 22, paddingBottom: 22 }}>
      <div className={styles.comparisonBar}>
        <div
          className={styles.comparisonRange}
          style={{
            left: `${toPct(rangeStart)}%`,
            width: `${toPct(rangeEnd) - toPct(rangeStart)}%`,
          }}
        />
        <div
          className={styles.comparisonMarker}
          style={{ left: `${toPct(myValue)}%` }}
        />
        {/* 범위 라벨: 바 위 */}
        <div
          className={styles.comparisonLabelTop}
          style={{ left: `${toPct((rangeStart + rangeEnd) / 2)}%` }}
        >
          {rangeLabel}
        </div>
        {/* 값 라벨: 바 아래 */}
        <div
          className={styles.comparisonLabel}
          style={{ left: `${toPct(myValue)}%` }}
        >
          {myLabel}
        </div>
      </div>
    </div>
  );
};
