import type {
  AdmissionGroup,
  AdmissionTier,
  PassChance,
} from "@/libs/jeongsi/types";

import styles from "./jeongsi-report.module.css";

type RecommendableTier = Exclude<AdmissionTier, "지원불가">;

/**
 * 구분 배지 — 상향 / 적정 / 안정.
 *
 * 수시 리포트의 ReportBadge 는 strategy 로 상향/안정/하향만 받아
 * 정시의 "적정"을 표현할 수 없으므로 정시 전용으로 분리했다.
 * 색상은 기존 --strategy-reach/match/safety 토큰을 그대로 쓴다.
 */
const TIER_CLASS: Record<RecommendableTier, string> = {
  상향: styles.tierReach,
  적정: styles.tierMatch,
  안정: styles.tierSafety,
};

/** 구분별 색상 토큰 — 블록 헤더·조합 슬롯의 CSS 변수 주입에 사용 */
export const TIER_COLOR_VAR: Record<RecommendableTier, string> = {
  상향: "var(--jeongsi-reach)",
  적정: "var(--jeongsi-match)",
  안정: "var(--jeongsi-safety)",
};

export const TIER_BG_VAR: Record<RecommendableTier, string> = {
  상향: "var(--jeongsi-reach-light)",
  적정: "var(--jeongsi-match-light)",
  안정: "var(--jeongsi-safety-light)",
};

/** 구분이 뜻하는 바를 한 줄로 */
export const TIER_HINT: Record<RecommendableTier, string> = {
  상향: "3개년 기준컷보다 내 성적이 낮지만 도전할 가치가 있는 구간",
  적정: "3개년 기준컷과 내 성적이 맞물리는 실질 합격 목표 구간",
  안정: "3개년 기준컷을 안정적으로 상회하는 하한선 확보 구간",
};

interface JeongsiTierBadgeProps {
  tier: RecommendableTier;
}

export const JeongsiTierBadge = ({ tier }: JeongsiTierBadgeProps) => (
  <span className={`${styles.tierBadge} ${TIER_CLASS[tier]}`}>{tier}</span>
);

/** 합격 가능성 배지 — 높음 / 보통 / 낮음 / 매우낮음 */
const CHANCE_CLASS: Record<PassChance, string> = {
  높음: styles.chanceHigh,
  보통: styles.chanceMedium,
  낮음: styles.chanceLow,
  매우낮음: styles.chanceVeryLow,
};

const CHANCE_LABEL: Record<PassChance, string> = {
  높음: "가능성 높음",
  보통: "가능성 보통",
  낮음: "가능성 낮음",
  매우낮음: "가능성 매우 낮음",
};

interface JeongsiChanceBadgeProps {
  chance: PassChance;
}

export const JeongsiChanceBadge = ({ chance }: JeongsiChanceBadgeProps) => (
  <span className={`${styles.chanceBadge} ${CHANCE_CLASS[chance]}`}>
    {CHANCE_LABEL[chance]}
  </span>
);

/** 모집군 칩 — 가군 / 나군 / 다군 */
interface JeongsiGroupChipProps {
  group: AdmissionGroup;
}

export const JeongsiGroupChip = ({ group }: JeongsiGroupChipProps) => (
  <span className={styles.groupChip}>{`${group}군`}</span>
);
