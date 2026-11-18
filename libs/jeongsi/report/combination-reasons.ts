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
import {
  COMPETITION_SURGE_RATIO,
  FINAL_QUOTA_SIGNAL_RATIO,
  isSmallQuota,
} from "../engine/classify.ts";
import { RISK_TIER_MATRIX } from "../engine/combination.ts";
import type {
  AdmissionGroup,
  GroupCombination,
  JeongsiAnalysis,
  PlanEvaluation,
  SafeCapReason,
} from "../types.ts";

import { formatSignedGap, gapValueOf } from "./cut-format.ts";
import { composeFactors } from "./explanations.ts";
import { describePastGroups, describeSafeCapReasons } from "./safe-cap.ts";

type SlotTier = "상향" | "적정" | "안정" | "소신";

const GROUPS: AdmissionGroup[] = ["가", "나", "다"];

/** 구분이 원서 세 장 안에서 맡는 역할 */
const TIER_ROLE: Record<"상향" | "적정" | "안정" | "소신", string> = {
  상향: "한 단계 위를 노리는 상향 원서",
  적정: "합격을 목표로 하는 적정 원서",
  안정: "합격을 받쳐 주는 안정 원서",
  소신: "합격 가능성은 매우 낮지만 도전하는 소신 원서",
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

const fmt = (value: number): string => (Math.round(value * 10) / 10).toFixed(1);

const fmtTrim = (value: number): string => String(Math.round(value * 10) / 10);

/** 마지막 한글 글자에 받침이 있는지 (괄호 안 글자 포함, 읽는 대로) */
const endsWithJongseong = (word: string): boolean => {
  const hangul = [...word].reverse().find((char) => {
    const code = char.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });
  return hangul ? (hangul.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
};

/** 첫 문장: 격차와 실측 비율로 이 구분에 배치한 이유 (예시의 "…보다 2.8점 높고 … 적정 지원으로 선정") */
const describePlacement = (slot: PlanEvaluation, tier: SlotTier): string => {
  const name = `${slot.plan.university} ${slot.plan.department}`;
  const subject = `${name}${endsWithJongseong(name) ? "은" : "는"}`;
  const gap = gapValueOf(slot);
  const rate = slot.historicalPassRate;
  const position =
    gap === null
      ? `합격 가능성이 ${slot.chance}이라`
      : (() => {
          const rounded = Math.round(gap.points * 10) / 10;
          const head =
            rounded === 0
              ? "내 환산점수가 기준컷과 같은 수준이고"
              : `내 환산점수가 기준컷보다 ${fmt(Math.abs(gap.points))}점 ${rounded > 0 ? "높" : "낮"}${rounded > 0 && (tier === "상향" || tier === "소신") ? "지만" : "고"}`;
          return rate === null || rate === undefined
            ? `${head} ${formatSignedGap(gap)} 격차라`
            : `${head} 같은 여유였던 곳이 다음 해 컷을 넘은 비율이 ${Math.round(rate * 100)}%라`;
        })();
  // 안정 구간인데 근거가 부족해 적정으로 둔 곳은 그 이유를 같은 문장에 밝힌다
  const capReason = slot.safeCapped ? describeSafeCapReasons(slot) : null;
  if (capReason && gap !== null) {
    const measured =
      rate === null || rate === undefined
        ? ""
        : ` 같은 여유였던 곳이 다음 해 컷을 넘은 비율은 ${Math.round(rate * 100)}%였습니다.`;
    return `${subject} 내 환산점수가 기준컷보다 ${fmt(Math.abs(gap.points))}점 높아 격차만 보면 안정 구간이지만, ${capReason}이라 ${TIER_ROLE[tier]}로 배치했습니다.${measured}`;
  }
  return `${subject} ${position} ${TIER_ROLE[tier]}로 배치했습니다.`;
};

/** 두 학년도 70%컷 중 높은 쪽보다도 높은지 (예시의 "가장 높았던 연도의 70% 컷보다도 5.1점 높아") */
const describeAboveHigherCut = (
  slot: PlanEvaluation,
  tier: SlotTier
): string | null => {
  if (tier !== "적정" && tier !== "안정") return null;
  const cuts = slot.cutHistory.filter(
    (entry): entry is { year: 2025 | 2026; cut: number } =>
      entry.cut !== null && slot.resultYears.includes(entry.year as 2025 | 2026)
  );
  if (cuts.length < 2) return null;
  const [higher] = [...cuts].sort((a, b) => b.cut - a.cut);
  const margin = slot.convertedScore - higher.cut;
  if (margin <= 0.05) return null;
  return `두 학년도 70%컷 중 높았던 ${higher.year} 컷 ${fmt(higher.cut)}점보다도 ${fmt(margin)}점 높습니다.`;
};

/**
 * 이 원서의 개별 변수 (원문 값이 있을 때만). 판정에 실측 근거가 있는 것부터 고른다.
 * 소수 모집 → 모집군 변경 → 최종 모집인원 증가 → 경쟁률 급등 → 반영방식 변경 → 모집인원 보정.
 */
const describeKeyVariables = (slot: PlanEvaluation): string[] => {
  const { plan } = slot;
  const variables: string[] = [];
  // 배치 문장의 안정 제한 사유로 이미 밝힌 것은 되풀이하지 않는다
  const statedInCap = (reason: SafeCapReason): boolean =>
    slot.safeCapped && slot.safeCapReasons.includes(reason);
  if (isSmallQuota(plan.quota) && !statedInCap("소수 모집")) {
    variables.push(
      `${plan.department} 모집인원이 ${plan.quota}명이라 컷이 해마다 크게 움직일 수 있습니다.`
    );
  }
  const regrouped = describePastGroups(slot.pastGroups);
  if (regrouped && !statedInCap("모집군 변경")) {
    variables.push(`${regrouped}이라 함께 지원하는 대학이 달라질 수 있습니다.`);
  }
  const final = slot.finalQuotaChange;
  if (final && final.ratio >= FINAL_QUOTA_SIGNAL_RATIO) {
    variables.push(
      `2027 최종 모집인원이 ${final.previousYear} ${final.previousQuota}명에서 ${final.finalQuota}명으로 늘었습니다.`
    );
  }
  const competitions = plan.recentCompetitions ?? [];
  const previous = competitions.find((entry) => entry.year === 2025);
  const latest = competitions.find((entry) => entry.year === 2026);
  if (
    previous?.competitionRate !== undefined &&
    previous.competitionRate > 0 &&
    latest?.competitionRate !== undefined &&
    latest.competitionRate / previous.competitionRate >= COMPETITION_SURGE_RATIO
  ) {
    const rise = `경쟁률이 2025 ${fmtTrim(previous.competitionRate)}대 1에서 2026 ${fmtTrim(latest.competitionRate)}대 1로 올랐`;
    variables.push(
      latest.additionalPassRate !== undefined
        ? `${rise}고, 2026 충원율은 ${fmtTrim(latest.additionalPassRate)}%였습니다.`
        : `${rise}습니다.`
    );
  }
  const changed = plan.formulaChangedYears ?? [];
  if (changed.length > 0) {
    const latestCut = slot.cutHistory.find(
      (entry) => entry.year === 2026 && slot.resultYears.includes(2026)
    )?.cut;
    variables.push(
      latestCut === null || latestCut === undefined
        ? `${changed.join(", ")} 입결은 2027과 반영방식이 달라 판정에 쓰지 않았습니다.`
        : `${changed.join(", ")} 입결은 2027과 반영방식이 달라, 기준컷은 2026 70%컷 ${fmt(latestCut)}점을 바탕으로 정했습니다.`
    );
  }
  const quota = slot.quotaChange;
  if (quota && Math.abs(quota.cutAdjustment) >= 0.05) {
    const more = quota.currentQuota > quota.pastAverageQuota;
    variables.push(
      `2027 모집인원 ${quota.currentQuota}명이 입결 학년도 평균(${fmtTrim(quota.pastAverageQuota)}명)보다 ${more ? "많아" : "적어"} 기준컷을 ${fmt(Math.abs(quota.cutAdjustment))}점 ${more ? "낮춰" : "높여"} 잡았습니다.`
    );
  }
  return variables.slice(0, SLOT_VARIABLE_COUNT);
};

/**
 * 불리하게 작용한 성적. 구분을 바꾸지 않는 손실은 격차에 이미 들어 있다는 점을 그 원서의
 * 격차로 밝혀, 손실과 배치가 따로 노는 문장으로 읽히지 않게 한다.
 */
const describeUnfavorable = (text: string, slot: PlanEvaluation): string => {
  if (text.includes("이 차이가 없었다면") || slot.gapPoints === null) {
    return `다만 ${text}`;
  }
  const rounded = Math.round(slot.gapPoints * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "±";
  return `다만 ${text} ${slot.plan.university}의 기준컷 대비 ${sign}${fmt(Math.abs(rounded))}점은 이 손실까지 반영한 값입니다.`;
};

/** 원서별 이유에 싣는 변수 수 */
export const SLOT_VARIABLE_COUNT = 2;

/**
 * 대표 조합 한 칸의 선택 이유 (사용자 예시 형식, 2026-11-18).
 *   1. 격차와 실측 비율로 이 구분에 배치한 이유
 *   2. 유리하게 작용한 성적 (반영비율)
 *   3. 적정·안정이면 두 학년도 중 높은 컷보다도 높은지
 *   4. 불리하게 작용한 성적 (구분이 바뀌는 것부터)
 *   5. 이 원서의 개별 변수 (최대 SLOT_VARIABLE_COUNT 개)
 *   6. 희망 학과와의 관계와 목록 안 위치
 * 모두 엔진 값과 원문 값으로 쓴다(PART 5 판정 설명과 같은 판정).
 */
const composeSlotReason = (
  slot: PlanEvaluation,
  analysis: JeongsiAnalysis,
  recommended: PlanEvaluation[]
): string => {
  const tier = slot.tier as SlotTier;
  const fit = calcDepartmentFit(slot.plan, analysis.input.preference);
  const factors = composeFactors(slot, analysis);
  const byPoints = (effect: "유리" | "불리") =>
    factors
      .filter((factor) => factor.effect === effect && (factor.points ?? 0) > 0)
      .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const [favorable] = byPoints("유리");
  // 구분을 바꾸는 손실을 먼저, 그다음 큰 손실
  const unfavorable =
    byPoints("불리").find((factor) =>
      factor.text.includes("이 차이가 없었다면")
    ) ?? byPoints("불리")[0];
  return [
    describePlacement(slot, tier),
    // 같은 환산식을 쓰는 원서끼리 같은 문장이 되지 않게 대학 이름을 앞에 둔다
    favorable ? `${slot.plan.university} 환산식에서는 ${favorable.text}` : null,
    describeAboveHigherCut(slot, tier),
    unfavorable ? describeUnfavorable(unfavorable.text, slot) : null,
    ...describeKeyVariables(slot),
    `${slot.plan.university}는 ${fitPhrase(fit)}이며, ${comparePosition(slot, recommended)}.`,
  ]
    .filter((sentence): sentence is string => sentence !== null)
    .join(" ");
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
      ? [
          {
            group,
            reason: composeSlotReason(slot, analysis, recommended),
          },
        ]
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
