import styles from "./report.module.css";

type BadgeStrategy = "상향" | "안정" | "하향";
type BadgeChance = "very_high" | "high" | "medium" | "low" | "very_low";
type BadgeRating = "excellent" | "good" | "average" | "weak";

interface ReportBadgeProps {
  strategy?: BadgeStrategy;
  chance?: BadgeChance;
  rating?: BadgeRating;
  label?: string;
}

const STRATEGY_CLASS: Record<BadgeStrategy, string> = {
  상향: styles.strategyReach,
  안정: styles.strategyMatch,
  하향: styles.strategySafety,
};

const STRATEGY_LABEL: Record<BadgeStrategy, string> = {
  상향: "상향 지원",
  안정: "안정 지원",
  하향: "하향 지원",
};

const CHANCE_CLASS: Record<BadgeChance, string> = {
  very_high: styles.chanceVeryHigh,
  high: styles.chanceHigh,
  medium: styles.chanceMedium,
  low: styles.chanceLow,
  very_low: styles.chanceVeryLow,
};

const CHANCE_LABEL: Record<BadgeChance, string> = {
  very_high: "합격 가능성 매우 높음",
  high: "합격 가능성 높음",
  medium: "합격 가능성 보통",
  low: "합격 가능성 낮음",
  very_low: "합격 가능성 매우 낮음",
};

const RATING_CLASS: Record<BadgeRating, string> = {
  excellent: styles.ratingExcellent,
  good: styles.ratingGood,
  average: styles.ratingAverage,
  weak: styles.ratingWeak,
};

const RATING_LABEL: Record<BadgeRating, string> = {
  excellent: "우수",
  good: "보통",
  average: "보통",
  weak: "미흡",
};

export const ReportBadge = ({
  strategy,
  chance,
  rating,
  label,
}: ReportBadgeProps) => {
  if (strategy) {
    return (
      <span className={STRATEGY_CLASS[strategy]}>
        {label ?? STRATEGY_LABEL[strategy]}
      </span>
    );
  }

  if (chance) {
    return (
      <span className={CHANCE_CLASS[chance]}>
        {label ?? CHANCE_LABEL[chance]}
      </span>
    );
  }

  if (rating) {
    return (
      <span className={RATING_CLASS[rating]}>
        {label ?? RATING_LABEL[rating]}
      </span>
    );
  }

  return null;
};
