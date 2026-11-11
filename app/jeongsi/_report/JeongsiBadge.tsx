import type {
  AdmissionGroup,
  AdmissionTier,
  PassChance,
} from "@/libs/jeongsi/types";

import styles from "./jeongsi-report.module.css";

export type RecommendableTier = Exclude<AdmissionTier, "지원불가">;

const TIER_TOKEN: Record<RecommendableTier, string> = {
  상향: "reach",
  적정: "match",
  안정: "safety",
};

/**
 * 구분 색을 CSS 변수로 주입하는 style.
 * 요소 안에서 --tone-fg / --tone-bg / --tone-border / --tone-bar 를 쓴다.
 */
export const toneStyleOf = (tier: RecommendableTier): React.CSSProperties => {
  const token = TIER_TOKEN[tier];
  return {
    "--tone-fg": `var(--tier-${token}-fg)`,
    "--tone-bg": `var(--tier-${token}-bg)`,
    "--tone-border": `var(--tier-${token}-border)`,
    "--tone-bar": `var(--tier-${token}-bar)`,
  } as React.CSSProperties;
};

/** 상향 → 적정 → 안정 순서를 항상 고정한다 */
export const TIER_ORDER: RecommendableTier[] = ["상향", "적정", "안정"];

interface JeongsiTierBadgeProps {
  tier: RecommendableTier;
}

/** 구분 배지 — 상향 / 적정 / 안정 */
export const JeongsiTierBadge = ({ tier }: JeongsiTierBadgeProps) => (
  <span className={styles.tonePill} style={toneStyleOf(tier)}>
    {tier}
  </span>
);

interface JeongsiChanceBadgeProps {
  chance: PassChance;
  tier: RecommendableTier;
}

/** 합격 가능성 배지 — 구분 색 외곽선 */
export const JeongsiChanceBadge = ({
  chance,
  tier,
}: JeongsiChanceBadgeProps) => (
  <span className={styles.toneOutlinePill} style={toneStyleOf(tier)}>
    합격 가능성 {chance}
  </span>
);

interface JeongsiGroupChipProps {
  group: AdmissionGroup;
}

/** 모집군 칩 — 가군 / 나군 / 다군 */
export const JeongsiGroupChip = ({ group }: JeongsiGroupChipProps) => (
  <span className={styles.pill}>{`${group}군`}</span>
);
