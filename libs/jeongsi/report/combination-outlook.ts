// ============================================================
// PART 4 대표 조합의 실익, 위험, 원서 교체 효과
//
// "왜 이 세 곳인가"(combination-reasons.ts)에 더해 다음을 코드가 엔진 값으로 쓴다.
//   - 세 원서 구성과 전체 불합격 위험: 합격 가능성이 보통 이상인 원서가 몇 장인지
//   - 원서별 얻는 것과 감수할 위험: 구분의 역할, 실측 비율, 소수 모집 같은 개별 변수
//   - 원서를 바꾸면: 같은 군의 다른 목록 후보로 바꿀 때 구성과 위험이 어떻게 달라지는지
//
// 원서끼리 합격이 서로 독립이라고 가정해 확률을 곱하지 않는다(근거 없는 확률). 구성은
// 장수와 구분으로만 말하고, 비율은 cut-movement 실측 값만 인용한다.
// ============================================================

import type {
  CombinationOutlook,
  CombinationSwapOption,
} from "../report-types.ts";
import type {
  AdmissionGroup,
  AdmissionTier,
  GroupCombination,
  JeongsiAnalysis,
  PlanEvaluation,
} from "../types.ts";

const GROUPS: AdmissionGroup[] = ["가", "나", "다"];

type SlotTier = Exclude<AdmissionTier, "지원불가">;

const TIER_ORDER: SlotTier[] = ["상향", "적정", "안정", "소신"];

const TIER_RANK: Record<SlotTier, number> = {
  소신: 0,
  상향: 1,
  적정: 2,
  안정: 3,
};

/** 합격 가능성이 보통 이상인 구분 */
const isSteady = (tier: SlotTier): boolean =>
  tier === "적정" || tier === "안정";

/** 군마다 바꿔 볼 후보 수 */
export const SWAP_OPTIONS_PER_GROUP = 3;

const asSlotTier = (tier: AdmissionTier): SlotTier | null =>
  tier === "지원불가" ? null : tier;

/** "상향 1장, 적정 1장, 안정 1장" (0장인 구분은 뺀다) */
export const describeComposition = (tiers: SlotTier[]): string =>
  TIER_ORDER.map((tier) => [tier, tiers.filter((t) => t === tier).length])
    .filter(([, count]) => (count as number) > 0)
    .map(([tier, count]) => `${tier} ${count}장`)
    .join(", ");

/** 구성 전체의 위험 한 문장 */
const describeOverallRisk = (tiers: SlotTier[]): string => {
  const steady = tiers.filter(isSteady).length;
  if (tiers.length === 0) return "채운 원서가 없습니다.";
  if (steady === 0) {
    return "합격 가능성이 보통 이상인 원서가 없어, 모든 원서가 70%컷에 못 미칠 수 있는 구성입니다.";
  }
  const reaching = tiers.filter((tier) => !isSteady(tier)).length;
  if (reaching === 0) {
    return `합격 가능성이 보통 이상인 원서만 ${steady}장이라, 한 단계 위를 노리는 원서는 없습니다.`;
  }
  const reachingText =
    reaching === 1 ? "위를 노리는 원서가" : `위를 노리는 ${reaching}장이 모두`;
  return `합격 가능성이 보통 이상인 원서가 ${steady}장이라, ${reachingText} 어렵더라도 보통 이상인 원서로 합격을 노립니다.`;
};

/** 원서 한 장이 주는 것 */
const GAIN: Record<SlotTier, string> = {
  상향: "성적보다 기준컷이 높은 대학에 도전합니다.",
  적정: "성적과 기준컷이 비슷한 대학에서 합격을 노립니다.",
  안정: "기준컷보다 여유 있는 곳으로 전체 불합격 위험을 줄입니다.",
  소신: "합격 가능성은 매우 낮지만 기준컷이 성적보다 높은 대학에 도전합니다.",
};

/** "합격 가능성이 ○○," 의 연결형 */
const CHANCE_ADVERB: Record<PlanEvaluation["chance"], string> = {
  높음: "높고",
  보통: "보통이고",
  낮음: "낮아",
  매우낮음: "매우 낮아",
};

const fmtPoints = (value: number): string =>
  (Math.round(value * 10) / 10).toFixed(1);

/**
 * 원서 한 장이 감수하는 위험. 실측 비율과 개별 변수(소수 모집, 모집군 변경 등)는 칸별 선택
 * 이유(slotReasons)에 있으므로 되풀이하지 않고, 그 원서가 어렵게 될 때 받쳐 주는 원서(상향, 소신)나
 * 여유가 사라지는 컷 상승 폭(적정, 안정)을 쓴다.
 */
const describeSlotRisk = (
  slot: PlanEvaluation,
  tier: SlotTier,
  others: { group: AdmissionGroup; slot: PlanEvaluation; tier: SlotTier }[]
): string => {
  const parts: string[] = [];
  if (tier === "상향" || tier === "소신") {
    const [backup] = [...others]
      .filter((other) => isSteady(other.tier))
      .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]);
    parts.push(
      backup
        ? `합격 가능성이 ${CHANCE_ADVERB[slot.chance]}, 이 원서가 어렵게 되면 ${backup.group}군 ${backup.slot.plan.university}(${backup.tier})가 받쳐 줍니다.`
        : `합격 가능성이 ${CHANCE_ADVERB[slot.chance]}, 받쳐 줄 합격 가능성 보통 이상 원서가 이 조합에 없습니다.`
    );
  } else if (slot.gapPoints !== null && slot.gapPoints >= 0) {
    parts.push(
      `2027 70%컷이 기준컷보다 ${fmtPoints(slot.gapPoints)}점 넘게 오르면 내 점수가 70%컷 아래가 됩니다.`
    );
  }
  return parts.join(" ");
};

/** 같은 군의 후보로 바꿨을 때 달라지는 점 */
const describeSwapEffect = (
  group: AdmissionGroup,
  current: PlanEvaluation,
  next: PlanEvaluation,
  tiersBefore: SlotTier[],
  tiersAfter: SlotTier[]
): string => {
  const currentTier = asSlotTier(current.tier);
  const nextTier = asSlotTier(next.tier);
  const head = `바꾸면 ${describeComposition(tiersAfter)}이 됩니다.`;
  if (!currentTier || !nextTier) return head;
  const before = tiersBefore.filter(isSteady).length;
  const after = tiersAfter.filter(isSteady).length;
  const steadyChange =
    after === 0
      ? "합격 가능성이 보통 이상인 원서가 없어져, 모든 원서가 70%컷에 못 미칠 수 있습니다."
      : after < before
        ? `합격 가능성이 보통 이상인 원서가 ${before}장에서 ${after}장으로 줄어듭니다.`
        : after > before
          ? `합격 가능성이 보통 이상인 원서가 ${before}장에서 ${after}장으로 늘어납니다.`
          : `합격 가능성이 보통 이상인 원서는 ${after}장 그대로입니다.`;
  if (TIER_RANK[nextTier] < TIER_RANK[currentTier]) {
    return `${head} ${group}군 원서의 기준컷 대비 여유가 줄어 더 어려운 곳을 노리게 되고, ${steadyChange}`;
  }
  if (TIER_RANK[nextTier] > TIER_RANK[currentTier]) {
    return `${head} ${group}군 원서의 기준컷 대비 여유가 커져 한 단계 위를 노리는 기회는 줄고, ${steadyChange}`;
  }
  return `${head} 구분은 같은 ${nextTier}이고, 기준컷 대비 격차가 만점 대비 ${formatGap(current.gapRatio)}에서 ${formatGap(next.gapRatio)}로 바뀝니다.`;
};

const formatGap = (gap: number | null): string => {
  if (gap === null) return "없음";
  const rounded = Math.round(gap * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `${sign}${String(Math.abs(rounded))}%`;
};

/**
 * 대표 조합의 실익, 위험, 원서 교체 효과. 대표 조합이 아니면 null.
 * 바꿀 후보는 같은 군의 PART 3 목록(소신 포함)에서, 조합의 다른 칸과 같은 대학은 빼고,
 * 구분이 다른 후보를 먼저 고른다.
 */
export const composeCombinationOutlook = (
  combination: GroupCombination,
  analysis: JeongsiAnalysis
): CombinationOutlook | null => {
  if (!combination.recommended) return null;
  const listed: PlanEvaluation[] = [
    ...(["상향", "적정", "안정"] as const).flatMap(
      (tier) => analysis.recommendations[tier]
    ),
    ...(analysis.sniping ?? []),
  ];
  const filled = GROUPS.flatMap((group) => {
    const slot = combination[group];
    const tier = slot ? asSlotTier(slot.tier) : null;
    return slot && tier ? [{ group, slot, tier }] : [];
  });
  const tiers = filled.map(({ tier }) => tier);

  // 빈 군은 원서가 줄어든 것이라 전체 위험과 함께 밝힌다
  const emptyGroups = GROUPS.filter(
    (group) => !filled.some((entry) => entry.group === group)
  );
  const emptyNote =
    emptyGroups.length > 0
      ? ` ${emptyGroups.map((group) => `${group}군`).join(", ")}은 추천 목록에 후보가 없어 원서가 ${filled.length}장입니다.`
      : "";
  const summary = `${describeComposition(tiers)}입니다.${emptyNote} ${describeOverallRisk(tiers)}`;
  const slots = filled.map(({ group, slot, tier }) => ({
    group,
    gain: GAIN[tier],
    risk: describeSlotRisk(
      slot,
      tier,
      filled.filter((entry) => entry.group !== group)
    ),
  }));

  const swaps = filled.map(({ group, slot, tier }) => {
    const otherUniversities = new Set(
      filled
        .filter((entry) => entry.group !== group)
        .map((entry) => entry.slot.plan.university)
    );
    const candidates = listed
      .filter(
        (evaluation) =>
          evaluation.plan.group === group &&
          evaluation.plan.id !== slot.plan.id &&
          !otherUniversities.has(evaluation.plan.university) &&
          asSlotTier(evaluation.tier) !== null
      )
      .sort(
        (a, b) =>
          Number(asSlotTier(a.tier) === tier) -
            Number(asSlotTier(b.tier) === tier) ||
          TIER_RANK[asSlotTier(a.tier) as SlotTier] -
            TIER_RANK[asSlotTier(b.tier) as SlotTier] ||
          a.plan.id.localeCompare(b.plan.id)
      );
    // 구분마다 한 곳씩 먼저 보여 준다
    const seenTiers = new Set<SlotTier>();
    const picked: PlanEvaluation[] = [];
    for (const candidate of candidates) {
      const candidateTier = asSlotTier(candidate.tier) as SlotTier;
      if (seenTiers.has(candidateTier)) continue;
      seenTiers.add(candidateTier);
      picked.push(candidate);
      if (picked.length >= SWAP_OPTIONS_PER_GROUP) break;
    }
    const options: CombinationSwapOption[] = picked.map((next) => {
      const nextTier = asSlotTier(next.tier) as SlotTier;
      const tiersAfter = filled.map((entry) =>
        entry.group === group ? nextTier : entry.tier
      );
      return {
        unitKey: next.plan.id,
        university: next.plan.university,
        department: next.plan.department,
        tier: nextTier,
        text: describeSwapEffect(group, slot, next, tiers, tiersAfter),
      };
    });
    return options.length > 0
      ? { group, options }
      : {
          group,
          options,
          note: `${group}군에는 이 원서 말고 목록에 다른 후보가 없습니다.`,
        };
  });

  return { summary, slots, swaps };
};
