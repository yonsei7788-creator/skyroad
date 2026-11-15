// ============================================================
// PART 4 대표 조합의 칸별 선택 이유 (specs/014 D3)
//
// 대표 조합은 엔진이 규칙으로 고른다(combination.ts markRecommendedCombination).
// 이 파일은 "왜 이 세 곳인지"를 코드가 계산한 값으로만 쓴다 — 구분·격차·
// 희망 학과 일치·같은 군 같은 구분 후보와의 비교. 모델은 이 문장에 관여하지 않는다.
// ============================================================

import {
  FIT_EXACT,
  FIT_PARTIAL,
  FIT_SAME_CATEGORY,
  calcDepartmentFit,
} from "../engine/analyze.ts";
import { RISK_TIER_MATRIX } from "../engine/combination.ts";
import type {
  AdmissionGroup,
  GroupCombination,
  JeongsiAnalysis,
  PlanEvaluation,
} from "../types.ts";

import { formatSignedGap, gapValueOf } from "./cut-format.ts";

const GROUPS: AdmissionGroup[] = ["가", "나", "다"];

/** 구분이 원서 세 장 안에서 맡는 역할 */
const TIER_ROLE: Record<"상향" | "적정" | "안정", string> = {
  상향: "한 단계 위를 노리는 원서",
  적정: "합격을 목표로 하는 원서",
  안정: "합격을 받쳐 주는 원서",
};

const fitPhrase = (fit: number): string => {
  if (fit >= FIT_EXACT) return "희망 학과와 같은 학과";
  if (fit >= FIT_SAME_CATEGORY) return "희망 학과와 같은 분야";
  if (fit >= FIT_PARTIAL) return "희망 학과명이 들어간 모집단위";
  return "희망 학과와 같은 계열의 모집단위";
};

/**
 * 같은 군·같은 구분의 다른 추천 후보와 견준 이 원서의 위치.
 * 목록(PART 3)에 있는 후보끼리만 견준다.
 */
const comparePosition = (
  slot: PlanEvaluation,
  recommended: PlanEvaluation[]
): string => {
  const peers = recommended.filter(
    (evaluation) =>
      evaluation.plan.group === slot.plan.group &&
      evaluation.tier === slot.tier &&
      evaluation.plan.id !== slot.plan.id
  );
  if (peers.length === 0) {
    return `추천 목록에서 ${slot.plan.group}군 ${slot.tier} 후보는 이곳뿐입니다`;
  }
  return `추천 목록의 ${slot.plan.group}군 ${slot.tier} 후보 ${peers.length + 1}곳 중 이곳을 골랐습니다`;
};

/** 대표 조합 한 칸의 선택 이유. 칸마다 수치가 달라 문장이 겹치지 않는다 */
const composeSlotReason = (
  slot: PlanEvaluation,
  analysis: JeongsiAnalysis,
  recommended: PlanEvaluation[]
): string => {
  const gap = gapValueOf(slot);
  const tier = slot.tier as "상향" | "적정" | "안정";
  const fit = calcDepartmentFit(slot.plan, analysis.input.preference);
  const rate =
    slot.historicalPassRate === null
      ? ""
      : `, 같은 여유였던 곳이 다음 해 컷을 넘은 비율은 ${Math.round(slot.historicalPassRate * 100)}%`;
  const gapText = gap
    ? `기준컷 대비 ${formatSignedGap(gap)}${rate}입니다`
    : `합격 가능성 ${slot.chance}입니다`;
  return `${TIER_ROLE[tier]}로, ${gapText}. ${slot.plan.university}는 ${fitPhrase(fit)}이며, ${comparePosition(slot, recommended)}.`;
};

/** 대표 조합의 칸별 선택 이유. 대표 조합이 아니면 빈 배열 */
export const composeRecommendedSlotReasons = (
  combination: GroupCombination,
  analysis: JeongsiAnalysis
): { group: AdmissionGroup; reason: string }[] => {
  if (!combination.recommended) return [];
  const recommended = (["상향", "적정", "안정"] as const).flatMap(
    (tier) => analysis.recommendations[tier]
  );
  return GROUPS.flatMap((group) => {
    const slot = combination[group];
    return slot
      ? [{ group, reason: composeSlotReason(slot, analysis, recommended) }]
      : [];
  });
};

/**
 * 대표 조합을 고른 이유. 규칙(성향 배분 + 희망 일치)을 그대로 밝힌다.
 */
export const composeRecommendedCombinationNote = (
  combination: GroupCombination,
  risk: JeongsiAnalysis["input"]["preference"]["risk"]
): string => {
  const rule = `${risk} 성향의 기본 배분(${RISK_TIER_MATRIX[risk].tiers.join(", ")})`;
  if (combination.matchesRiskAllocation) {
    return `${rule}을 지키는 조합 중 세 원서가 희망 학과에 가장 가깝고, 같으면 안정 원서의 여유가 큰 조합을 대표로 골랐습니다.`;
  }
  const capped = GROUPS.map((group) => combination[group]).some(
    (slot) => slot?.safeCapped
  );
  return capped
    ? `${rule}을 그대로 채울 안정 후보가 없어, 기준컷 대비 여유는 안정 구간이지만 근거가 부족해 적정으로 표시한 곳을 안정 원서 자리에 넣었습니다. 그 가운데 희망 학과에 가장 가까운 조합을 대표로 골랐습니다.`
    : `${rule}을 모두 지키는 조합이 없어, 원서를 가장 많이 채운 조합 중 구분 구성이 기본 배분에 가장 가깝고, 그다음 희망 학과에 가장 가까운 조합을 대표로 골랐습니다.`;
};
