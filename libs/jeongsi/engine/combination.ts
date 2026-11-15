// ============================================================
// PART 4 — 가·나·다군 지원 조합 생성
//
// 매트릭스는 "세 장에 어떤 tier 를 몇 개 섞는가"(multiset)만
// 규정하고, 군 배정은 희망 학과가 어느 군에 있는지로 결정한다.
// 군은 대칭이 아니다 — 다군 모집단위는 전체의 11.5% 뿐이고
// 서울대·연고대·서성한은 다군 모집이 아예 없다(specs/013 §4.1).
//
// 🔴 폴백은 안정 방향으로만 1단계. 상향 방향 완화는 금지한다.
//    빈 슬롯을 채우려고 적정 자리에 상향을 넣으면 사용자가 고른
//    성향보다 위험한 조합이 된다. 비우는 것이 정직하다(§4.4).
// ============================================================

import type {
  AdmissionGroup,
  AdmissionTier,
  GroupCombination,
  PassChance,
  PlanEvaluation,
  RiskAppetite,
} from "../types";

/** 추천 가능한 분류 (지원불가 제외) */
/** 추천 목록(PART 3)의 세 구분. 스나이핑은 별도 목록이다 */
export type RecommendableTier = Exclude<AdmissionTier, "지원불가" | "소신">;

/**
 * 생성 조합 수. 정시 리포트 템플릿(입시_분석_기능_정보/report_template.png)
 * 의 "실제 원서접수 가능한 최적 조합 3~5개" 를 따른다(specs/013 §4.5).
 * 후보가 모자라면 3개보다 적을 수 있다 — 억지로 채우지 않는다.
 */
export const MIN_COMBINATIONS = 3;
export const MAX_COMBINATIONS = 5;

const GROUPS: readonly AdmissionGroup[] = ["가", "나", "다"];

/** tier 배정 우선순위. 가장 올라가고 싶은 카드부터 희망 학과를 배치 */
const TIER_PRIORITY: RecommendableTier[] = ["상향", "적정", "안정"];

/** 안정 방향으로 1단계 완화. 상향 방향 완화는 없다 */
const RELAXED_TIER: Partial<Record<RecommendableTier, RecommendableTier>> = {
  상향: "적정",
  적정: "안정",
};

/** 조합 생성 후보 */
export interface CombinationCandidate {
  evaluation: PlanEvaluation;
  /** 희망 학과 적합도 (높을수록 적합) */
  fit: number;
  /** 판정 격차 (PlanEvaluation.gapRatio 와 같은 값) */
  gapRatio: number | null;
  /**
   * 대학 서열 대리지표 — 그 대학 전체 모집단위 격차 중앙값의 부호 반전.
   * 모집단위 컷은 학과 인기도가 섞여 서열 지표로 쓸 수 없다.
   */
  prestige: number;
}

type SlotFilter = (candidate: CombinationCandidate) => boolean;

const chanceIn =
  (...allowed: PassChance[]): SlotFilter =>
  (candidate) =>
    allowed.includes(candidate.evaluation.chance);

/** 성향별 tier 구성과 슬롯 제약 (specs/013 §4.2) */
export interface RiskPlan {
  /** 세 장의 tier 구성 (multiset) */
  tiers: RecommendableTier[];
  /** tier 별 추가 제약 */
  slotFilter: Partial<Record<RecommendableTier, SlotFilter>>;
}

export const RISK_TIER_MATRIX: Record<RiskAppetite, RiskPlan> = {
  // 3장 중 2장을 안정에 쓰는 것은 과잉이다. 적정 두 장 + 안정 한 장.
  안정: {
    tiers: ["적정", "적정", "안정"],
    slotFilter: {},
  },
  // 정시 지원의 교과서적 배분.
  균형: {
    tiers: ["상향", "적정", "안정"],
    slotFilter: { 상향: chanceIn("높음", "보통", "낮음") },
  },
  // 안전판 없는 공격은 전원 불합격 확률이 10%를 넘는다.
  // 합격 가능성은 구분을 따르므로(적정 = 보통) 적정 칸에 가능성 조건을 두지 않는다.
  // 예전 "적정 중 높음만" 조건은 가능성이 구분과 같아진 뒤(2026-11-14) 채울 수 없어
  // 공격 성향 조합의 적정 칸이 늘 비었다(2026-11-15 검수에서 발견).
  공격: {
    tiers: ["상향", "상향", "적정"],
    slotFilter: {},
  },
};

/** 조합 간 차별화 축 (specs/013 §4.5) */
interface CombinationAxis {
  label: string;
  compare: (a: CombinationCandidate, b: CombinationCandidate) => number;
}

const byAdvantage = (
  a: CombinationCandidate,
  b: CombinationCandidate
): number => b.evaluation.advantageScore - a.evaluation.advantageScore;

const byFit = (a: CombinationCandidate, b: CombinationCandidate): number =>
  b.fit - a.fit;

/** 대학 서열 내림차순 (specs/013 §4.5 — 대학 단위 컷 중앙값) */
const byPrestige = (a: CombinationCandidate, b: CombinationCandidate): number =>
  b.prestige - a.prestige;

/** 같은 tier 안에서 기준컷 대비 여유가 큰 쪽 우선 */
const bySafety = (a: CombinationCandidate, b: CombinationCandidate): number =>
  (b.gapRatio ?? -Infinity) - (a.gapRatio ?? -Infinity);

const byId = (a: CombinationCandidate, b: CombinationCandidate): number =>
  a.evaluation.plan.id.localeCompare(b.evaluation.plan.id);

const chain =
  (
    ...comparators: ((
      a: CombinationCandidate,
      b: CombinationCandidate
    ) => number)[]
  ) =>
  (a: CombinationCandidate, b: CombinationCandidate): number => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };

const COMBINATION_AXES: CombinationAxis[] = [
  { label: "희망 우선형", compare: chain(byFit, byAdvantage, byId) },
  { label: "반영방식 우선형", compare: chain(byAdvantage, byFit, byId) },
  { label: "대학 우선형", compare: chain(byPrestige, byFit, byId) },
  { label: "합격 여유형", compare: chain(bySafety, byFit, byId) },
];

const isSelectable = (candidate: CombinationCandidate): boolean =>
  candidate.evaluation.eligible && candidate.evaluation.tier !== "지원불가";

interface Assignment {
  slots: Record<AdmissionGroup, PlanEvaluation | null>;
  /** 채우지 못한 군 */
  emptyGroups: AdmissionGroup[];
  /** 빈 군 중 목록에 그 군 후보가 있지만 모두 이미 쓴 대학이라 비운 군 */
  exhaustedGroups: AdmissionGroup[];
  key: string;
}

/**
 * 성향 배분으로 못 채운 군에 넣을 후보의 우선순위. 아직 못 채운 구분 중 가장
 * 앞선 것(없으면 적정)에 구분이 가까운 곳, 거리가 같으면 안전한 쪽, 그다음 축 순서.
 */
const byNearestTier =
  (target: RecommendableTier, axis: CombinationAxis) =>
  (a: CombinationCandidate, b: CombinationCandidate): number => {
    const distance = (candidate: CombinationCandidate): number =>
      Math.abs(
        TIER_PRIORITY.indexOf(candidate.evaluation.tier as RecommendableTier) -
          TIER_PRIORITY.indexOf(target)
      );
    return (
      distance(a) - distance(b) ||
      TIER_PRIORITY.indexOf(b.evaluation.tier as RecommendableTier) -
        TIER_PRIORITY.indexOf(a.evaluation.tier as RecommendableTier) ||
      axis.compare(a, b)
    );
  };

/**
 * 한 축으로 조합 하나를 만든다.
 *
 * 상향 → 적정 → 안정 순으로, 적합도 최상위 모집단위를 고르고 그
 * 모집단위의 군을 해당 슬롯의 군으로 확정한다. 남은 군에 나머지
 * tier 를 배정한다.
 */
const assign = (
  candidates: CombinationCandidate[],
  risk: RiskAppetite,
  axis: CombinationAxis,
  excludedUniversities: Set<string> = new Set()
): Assignment => {
  const plan = RISK_TIER_MATRIX[risk];
  const slots: Record<AdmissionGroup, PlanEvaluation | null> = {
    가: null,
    나: null,
    다: null,
  };
  const usedGroups = new Set<AdmissionGroup>();
  const usedUniversities = new Set<string>(excludedUniversities);
  const unfilledTiers: RecommendableTier[] = [];

  // 요구 tier 를 우선순위 순으로 처리 (중복 tier 는 각각 한 번씩)
  const ordered = [...plan.tiers].sort(
    (a, b) => TIER_PRIORITY.indexOf(a) - TIER_PRIORITY.indexOf(b)
  );

  for (const requestedTier of ordered) {
    const tierChain: RecommendableTier[] = [requestedTier];
    const relaxed = RELAXED_TIER[requestedTier];
    if (relaxed) {
      tierChain.push(relaxed);
    }

    let picked: CombinationCandidate | undefined;

    for (const tier of tierChain) {
      const filter = plan.slotFilter[tier] ?? (() => true);
      const pool = candidates
        .filter(
          (candidate) =>
            isSelectable(candidate) &&
            candidate.evaluation.tier === tier &&
            !usedGroups.has(candidate.evaluation.plan.group) &&
            !usedUniversities.has(candidate.evaluation.plan.university) &&
            filter(candidate)
        )
        .sort(axis.compare);

      [picked] = pool;
      if (picked) {
        break;
      }
    }

    // 안정 칸이 비면 격차가 안정 구간인데 입결이 1개년이라 적정으로 낮춘 곳을
    // 쓴다(구분은 적정 그대로 보인다). 격차로는 안정과 같은 여유라 성향보다
    // 위험해지지 않는다.
    if (!picked && requestedTier === "안정") {
      [picked] = candidates
        .filter(
          (candidate) =>
            isSelectable(candidate) &&
            candidate.evaluation.safeCapped &&
            !usedGroups.has(candidate.evaluation.plan.group) &&
            !usedUniversities.has(candidate.evaluation.plan.university)
        )
        .sort(axis.compare);
    }

    if (!picked) {
      unfilledTiers.push(requestedTier);
      continue;
    }

    const { plan: pickedPlan } = picked.evaluation;
    slots[pickedPlan.group] = picked.evaluation;
    usedGroups.add(pickedPlan.group);
    usedUniversities.add(pickedPlan.university);
  }

  // 성향 배분에 맞는 구분이 없어 빈 군도, 목록에 그 군 후보가 있으면 채운다.
  // 목록에 있는 군을 "지원처 없음"으로 비우면 리포트 안에서 모순이다
  // (2026-11-15 검수: 컴공 학생 대표 조합이 나군을 비웠는데 목록에 중앙대 나군 적정).
  // 구분은 그대로 보이고, 배분과 다르면 matchesRiskAllocation 이 false 가 된다.
  // 대안 조합(앞 조합 대학을 뺀 것)은 채우지 않는다. 남은 대학으로 억지로 채우면
  // 안정 성향 학생에게 상향 3장 대안이 생겼다. 대안의 빈 군은 "남은 후보 없음"이다.
  const [fillTarget = "적정"] = unfilledTiers;
  // 성향 배분으로 한 칸도 못 채웠으면 채우지 않는다 — 배분과 무관한 후보만으로
  // 조합을 새로 만들면 성향보다 위험한 조합이 된다(예: 안정 성향에 상향뿐).
  const fillsEmptyGroups =
    excludedUniversities.size === 0 &&
    GROUPS.some((group) => slots[group] !== null);
  for (const group of GROUPS) {
    if (!fillsEmptyGroups || slots[group] !== null) {
      continue;
    }
    const [filler] = candidates
      .filter(
        (candidate) =>
          isSelectable(candidate) &&
          candidate.evaluation.plan.group === group &&
          !usedUniversities.has(candidate.evaluation.plan.university) &&
          // 그 구분 칸에 성향이 거는 조건(예: 균형 상향은 매우낮음 제외)도 지킨다
          (
            plan.slotFilter[candidate.evaluation.tier as RecommendableTier] ??
            (() => true)
          )(candidate)
      )
      .sort(byNearestTier(fillTarget, axis));
    if (!filler) {
      continue;
    }
    slots[group] = filler.evaluation;
    usedGroups.add(group);
    usedUniversities.add(filler.evaluation.plan.university);
  }

  const emptyGroups = GROUPS.filter((group) => slots[group] === null);
  const exhaustedGroups = emptyGroups.filter((group) =>
    candidates.some(
      (candidate) =>
        isSelectable(candidate) && candidate.evaluation.plan.group === group
    )
  );
  const key = GROUPS.map((group) => slots[group]?.plan.id ?? "-").join("|");

  return { slots, emptyGroups, exhaustedGroups, key };
};

/**
 * 비운 군을 라벨에 명시한다 (AI 전략 문장이 사유를 쓸 근거).
 * 목록에 그 군 후보가 아예 없으면 "지원처 없음", 있지만 모두 이미 쓴 대학이면
 * "남은 후보 없음"이라 쓴다 — 목록에 그 군 대학이 보이는데 "지원처 없음"이면 모순이다.
 */
const labelFor = (axis: CombinationAxis, assignment: Assignment): string => {
  const notes: string[] = [];
  const none = assignment.emptyGroups.filter(
    (group) => !assignment.exhaustedGroups.includes(group)
  );
  if (none.length > 0) {
    notes.push(`${none.join("·")}군 지원처 없음`);
  }
  if (assignment.exhaustedGroups.length > 0) {
    notes.push(`${assignment.exhaustedGroups.join("·")}군 남은 후보 없음`);
  }
  return notes.length === 0
    ? axis.label
    : `${axis.label} (${notes.join(", ")})`;
};

/**
 * 지원 성향에 맞는 가·나·다군 조합 3~5개.
 *
 * 후보가 모자라면 슬롯을 null 로 비운 채 반환한다. 상위권 학생이
 * 다군을 채우지 못하는 것은 정상이다.
 */
export const buildCombinations = (
  candidates: CombinationCandidate[],
  risk: RiskAppetite
): GroupCombination[] => {
  const seenKeys = new Set<string>();
  const accepted: { assignment: Assignment; label: string }[] = [];

  const tryPush = (assignment: Assignment, label: string): boolean => {
    // 원서가 한 장뿐인 것은 조합이 아니다. 첫 조합만 예외로 남긴다(후보가 그것뿐일 때).
    const filled = GROUPS.length - assignment.emptyGroups.length;
    if (filled === 0 || (filled < 2 && accepted.length > 0)) {
      return false;
    }
    if (seenKeys.has(assignment.key)) {
      return false;
    }

    seenKeys.add(assignment.key);
    accepted.push({ assignment, label });
    return true;
  };

  for (const axis of COMBINATION_AXES) {
    if (accepted.length >= MAX_COMBINATIONS) {
      break;
    }
    const assignment = assign(candidates, risk, axis);
    tryPush(assignment, labelFor(axis, assignment));
  }

  // 축이 서로 같은 결과를 내면 조합이 3개보다 적을 수 있다. 그때는 앞선
  // 조합에 쓰인 대학을 빼고 다시 만들어 비교할 대안을 제시한다.
  const [primaryAxis] = COMBINATION_AXES;
  while (accepted.length < MIN_COMBINATIONS) {
    const usedUniversities = new Set(
      accepted.flatMap(({ assignment }) =>
        GROUPS.map((group) => assignment.slots[group]?.plan.university).filter(
          (university): university is string => Boolean(university)
        )
      )
    );
    const alternative = assign(candidates, risk, primaryAxis, usedUniversities);
    const alternativeLabel = `${labelFor(primaryAxis, alternative)} 대안`;
    if (!tryPush(alternative, alternativeLabel)) {
      break;
    }
  }

  return accepted
    .slice(0, MAX_COMBINATIONS)
    .map(({ assignment, label }, index) => ({
      id: `jeongsi-combo-${index + 1}`,
      label,
      가: assignment.slots.가,
      나: assignment.slots.나,
      다: assignment.slots.다,
      recommended: false,
      matchesRiskAllocation: false,
    }));
};

const tierMultisetKey = (tiers: RecommendableTier[]): string =>
  [...tiers].sort().join("|");

/** 조합의 세 칸이 성향의 기본 배분과 정확히 같은지 */
const matchesAllocation = (
  combination: GroupCombination,
  risk: RiskAppetite
): boolean => {
  const tiers = GROUPS.map((group) => combination[group])
    .filter((slot): slot is PlanEvaluation => slot !== null)
    .map((slot) => slot.tier as RecommendableTier);
  return (
    tiers.length === RISK_TIER_MATRIX[risk].tiers.length &&
    tierMultisetKey(tiers) === tierMultisetKey(RISK_TIER_MATRIX[risk].tiers)
  );
};

/**
 * 조합의 구분 구성이 성향 배분에서 얼마나 먼지. 두 구성을 안전한 순으로 줄 세워
 * 같은 자리끼리 구분 단계 차이(상향↔적정 1, 상향↔안정 2)를 더한다.
 * 칸 수가 다르면 비교하지 않는다(대표 조합 후보는 칸 수가 같은 것끼리다).
 */
const allocationDistance = (
  combination: GroupCombination,
  risk: RiskAppetite
): number => {
  const indexOf = (tier: RecommendableTier): number =>
    TIER_PRIORITY.indexOf(tier);
  const actual = GROUPS.map((group) => combination[group])
    .filter((slot): slot is PlanEvaluation => slot !== null)
    .map((slot) => indexOf(slot.tier as RecommendableTier))
    .sort((a, b) => b - a);
  const wanted = RISK_TIER_MATRIX[risk].tiers
    .map(indexOf)
    .sort((a, b) => b - a);
  return actual.reduce(
    (total, value, index) => total + Math.abs(value - (wanted[index] ?? value)),
    0
  );
};

/**
 * 대표 조합 하나를 고른다 (사용자 결정 2026-11-14, specs/014 D3).
 *
 * 성향의 기본 배분을 지키는 조합 중 세 원서의 희망 학과 일치도 합이 가장 큰
 * 조합, 같으면 안정 원서의 여유(판정 격차)가 큰 조합, 그래도 같으면 앞 순서.
 * 기본 배분을 지키는 조합이 없으면 채운 칸이 가장 많은 조합 중 구분 구성이 기본
 * 배분에 가장 가까운 조합을 같은 기준으로 고르고 matchesRiskAllocation 을 false 로
 * 둔다(리포트가 그 사실을 밝힌다).
 */
export const markRecommendedCombination = (
  combinations: GroupCombination[],
  candidates: CombinationCandidate[],
  risk: RiskAppetite
): GroupCombination[] => {
  if (combinations.length === 0) {
    return combinations;
  }
  const fitOf = new Map(
    candidates.map((candidate) => [candidate.evaluation.plan.id, candidate.fit])
  );
  const slotsOf = (combination: GroupCombination): PlanEvaluation[] =>
    GROUPS.map((group) => combination[group]).filter(
      (slot): slot is PlanEvaluation => slot !== null
    );
  const fitSum = (combination: GroupCombination): number =>
    slotsOf(combination).reduce(
      (total, slot) => total + (fitOf.get(slot.plan.id) ?? 0),
      0
    );
  const safeMargin = (combination: GroupCombination): number =>
    Math.max(
      -Infinity,
      ...slotsOf(combination)
        .filter((slot) => slot.tier === "안정")
        .map((slot) => slot.gapRatio ?? -Infinity)
    );

  const matching = combinations.filter((combination) =>
    matchesAllocation(combination, risk)
  );
  const pool =
    matching.length > 0
      ? matching
      : combinations.filter(
          (combination) =>
            slotsOf(combination).length ===
            Math.max(...combinations.map((item) => slotsOf(item).length))
        );
  // 배분을 지키는 조합이 없으면 구분 구성이 배분에 가장 가까운 조합을 먼저 본다.
  // 희망 일치만 보면 안정 성향 학생에게 상향 3장 조합이 대표가 됐다
  // (2026-11-15 검수: 약학 희망 · 안정 → 동덕여대·전북대·제주대 약학 상향 3장).
  const [best] = [...pool].sort(
    (a, b) =>
      allocationDistance(a, risk) - allocationDistance(b, risk) ||
      fitSum(b) - fitSum(a) ||
      safeMargin(b) - safeMargin(a) ||
      combinations.indexOf(a) - combinations.indexOf(b)
  );

  return combinations.map((combination) => ({
    ...combination,
    recommended: combination.id === best.id,
    matchesRiskAllocation: matchesAllocation(combination, risk),
  }));
};

/** 공격 성향에서 상향 한 칸을 스나이핑으로 바꾼 조합의 라벨 */
export const SNIPING_COMBINATION_LABEL = "소신 포함형";

/**
 * 공격 성향이면 대표 조합(없으면 첫 조합)의 상향 칸 하나를 스나이핑 후보로 바꾼
 * 조합을 하나 더 붙인다(사용자 결정 2026-11-15, specs/014 마지막 피드백).
 *
 * 적정(안전판) 칸은 바꾸지 않는다. 그 군 칸이 비어 있으면 채운다. 같은 대학이
 * 다른 칸에 있으면 그 후보는 건너뛴다. 대표 조합 표시는 바꾸지 않는다.
 */
export const addSnipingCombination = (
  combinations: GroupCombination[],
  sniping: PlanEvaluation[],
  risk: RiskAppetite
): GroupCombination[] => {
  if (risk !== "공격" || sniping.length === 0 || combinations.length === 0) {
    return combinations;
  }
  const base =
    combinations.find((combination) => combination.recommended) ??
    combinations[0];
  for (const target of sniping) {
    const { group, university } = target.plan;
    const current = base[group];
    if (current && current.tier !== "상향") {
      continue;
    }
    const duplicated = GROUPS.some(
      (other) => other !== group && base[other]?.plan.university === university
    );
    if (duplicated) {
      continue;
    }
    return [
      ...combinations,
      {
        ...base,
        [group]: target,
        id: `jeongsi-combo-${combinations.length + 1}`,
        label: SNIPING_COMBINATION_LABEL,
        recommended: false,
        matchesRiskAllocation: false,
      },
    ];
  }
  return combinations;
};
