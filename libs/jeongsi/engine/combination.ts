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
export type RecommendableTier = Exclude<AdmissionTier, "지원불가">;

/**
 * 생성 조합 수. 정시 리포트 템플릿(입시_분석_기능_정보/report_template.png)
 * 의 "실제 원서접수 가능한 최적 조합 3~5개" 를 따른다(specs/013 §4.5).
 * 후보가 모자라면 3개보다 적을 수 있다 — 억지로 채우지 않는다.
 */
export const MIN_COMBINATIONS = 3;
export const MAX_COMBINATIONS = 5;

/** 안정 성향의 안정 슬롯 기준 (σ 배수). 일반 안정(+2.0σ)보다 엄격 */
export const SAFE_SLOT_MIN_SIGMA = 2.5;

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
  /** 백분위 환산 격차. 슬롯 제약 판정에 쓴다 */
  percentileGap: number | null;
  /** 해당 모집단위의 컷 변동성 */
  sigma: number;
  /**
   * 대학 서열 대리지표 — 그 대학 전체 모집단위 컷의 중앙값(백분위 축).
   * 모집단위 컷은 학과 인기도가 섞여 서열 지표로 쓸 수 없다.
   */
  prestige: number;
}

type SlotFilter = (candidate: CombinationCandidate) => boolean;

const chanceIn =
  (...allowed: PassChance[]): SlotFilter =>
  (candidate) =>
    allowed.includes(candidate.evaluation.chance);

const gapAtLeastSigma =
  (multiple: number): SlotFilter =>
  (candidate) =>
    candidate.percentileGap !== null &&
    candidate.percentileGap >= multiple * candidate.sigma;

const every =
  (...filters: SlotFilter[]): SlotFilter =>
  (candidate) =>
    filters.every((filter) => filter(candidate));

/** 성향별 tier 구성과 슬롯 제약 (specs/013 §4.2) */
export interface RiskPlan {
  /** 세 장의 tier 구성 (multiset) */
  tiers: RecommendableTier[];
  /** tier 별 추가 제약 */
  slotFilter: Partial<Record<RecommendableTier, SlotFilter>>;
}

export const RISK_TIER_MATRIX: Record<RiskAppetite, RiskPlan> = {
  // 3장 중 2장을 안정에 쓰는 것은 과잉. 대신 안정 슬롯 기준을 높였다.
  안정: {
    tiers: ["적정", "적정", "안정"],
    slotFilter: {
      안정: every(chanceIn("높음"), gapAtLeastSigma(SAFE_SLOT_MIN_SIGMA)),
    },
  },
  // 정시 지원의 교과서적 배분.
  균형: {
    tiers: ["상향", "적정", "안정"],
    slotFilter: { 상향: chanceIn("높음", "보통", "낮음") },
  },
  // 안전판 없는 공격은 전원 불합격 확률이 10%를 넘는다.
  공격: {
    tiers: ["상향", "상향", "적정"],
    slotFilter: { 적정: chanceIn("높음") },
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
  (b.percentileGap ?? -Infinity) - (a.percentileGap ?? -Infinity);

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
  key: string;
}

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

    if (!picked) {
      continue;
    }

    const { plan: pickedPlan } = picked.evaluation;
    slots[pickedPlan.group] = picked.evaluation;
    usedGroups.add(pickedPlan.group);
    usedUniversities.add(pickedPlan.university);
  }

  const emptyGroups = GROUPS.filter((group) => slots[group] === null);
  const key = GROUPS.map((group) => slots[group]?.plan.id ?? "-").join("|");

  return { slots, emptyGroups, key };
};

/** 비운 군을 라벨에 명시한다 (AI 전략 문장이 사유를 쓸 근거) */
const labelFor = (axis: CombinationAxis, empty: AdmissionGroup[]): string => {
  if (empty.length === 0) {
    return axis.label;
  }
  return `${axis.label} (${empty.join("·")}군 지원처 없음)`;
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
    if (assignment.emptyGroups.length === GROUPS.length) {
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
    tryPush(assignment, labelFor(axis, assignment.emptyGroups));
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
    const alternativeLabel = `${labelFor(primaryAxis, alternative.emptyGroups)} 대안`;
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
    }));
};
