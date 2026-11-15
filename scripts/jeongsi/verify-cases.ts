/**
 * 정시 리포트 검수 — 성적·희망·지원 자격이 다른 학생 사례로 엔진과 리포트를
 * 만들고, 페이지 간 일관성·판정 기준·추천 범위·지원 자격을 코드로 대조한다
 * (specs/014 G1).
 *
 * AI 해설은 부르지 않는다(폴백 문장). 수치·구성 검증용이다.
 *
 * Usage: npx tsx scripts/jeongsi/verify-cases.ts [--verbose]
 * 위반이 하나라도 있으면 exit code 1.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeJeongsi } from "../../libs/jeongsi/engine/analyze.ts";
import {
  GAP_BANDS,
  MIN_YEARS_FOR_SAFE,
  SNIPING_MIN_GAP,
  chanceFor,
  tierForGap,
} from "../../libs/jeongsi/engine/classify.ts";
import { SNIPING_SIZE } from "../../libs/jeongsi/engine/analyze.ts";
import { SNIPING_COMBINATION_LABEL } from "../../libs/jeongsi/engine/combination.ts";
import {
  checkEligibility,
  isWomensUniversity,
} from "../../libs/jeongsi/engine/eligibility.ts";
import { findReportInconsistencies } from "../../libs/jeongsi/report/consistency.ts";
import { findOverclaims } from "../../libs/jeongsi/report/commentary-guards.ts";
import {
  collectProtectedNames,
  hasStrayInterpunct,
} from "../../libs/jeongsi/report/interpunct.ts";
import { buildJeongsiReport } from "../../libs/jeongsi/report/build.ts";

import type { JeongsiReportContent } from "../../libs/jeongsi/report-types.ts";
import type {
  JeongsiAnalysis,
  JeongsiInput,
  JeongsiResultEntry,
  PlanEvaluation,
  SuneungScore,
} from "../../libs/jeongsi/types.ts";

/** 엔진 로더를 거치지 않고 읽은 입결 (원문 군 대조용) */
const resultIndexForCheck = (() => {
  const file = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../libs/jeongsi/data/admission-results.json"
  );
  const entries = JSON.parse(
    readFileSync(file, "utf-8")
  ) as JeongsiResultEntry[];
  const index = new Map<string, JeongsiResultEntry[]>();
  for (const entry of entries) {
    index.set(entry.planKey, [...(index.get(entry.planKey) ?? []), entry]);
  }
  return index;
})();

interface VerifyCase {
  label: string;
  input: JeongsiInput;
}

const score = (partial: Omit<SuneungScore, "examYear">): SuneungScore => ({
  examYear: 2026,
  ...partial,
});

export const VERIFY_CASES: VerifyCase[] = [
  {
    label: "상위권 이과 · 컴퓨터공학 · 서울 · 균형",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 131, percentile: 96 },
        math: { elective: "미적분", standardScore: 137, percentile: 98 },
        english: { grade: 2 },
        inquiry1: { subject: "물리학I", standardScore: 68, percentile: 93 },
        inquiry2: { subject: "지구과학I", standardScore: 65, percentile: 88 },
        history: { grade: 2 },
      }),
      preference: {
        target: "컴퓨터공학과",
        targetKind: "department",
        region: "서울",
        risk: "균형",
      },
    },
  },
  {
    label: "중위권 문과 · 경영 · 전국 · 안정",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 118, percentile: 82 },
        math: { elective: "확률과통계", standardScore: 120, percentile: 84 },
        english: { grade: 3 },
        inquiry1: { subject: "사회문화", standardScore: 62, percentile: 85 },
        inquiry2: { subject: "생활과윤리", standardScore: 60, percentile: 80 },
        history: { grade: 3 },
      }),
      preference: {
        target: "경영학과",
        targetKind: "department",
        region: "전국",
        risk: "안정",
      },
    },
  },
  {
    label: "의약 최상위 · 의예 · 전국 · 공격",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 139, percentile: 99 },
        math: { elective: "미적분", standardScore: 145, percentile: 100 },
        english: { grade: 1 },
        inquiry1: { subject: "화학I", standardScore: 72, percentile: 99 },
        inquiry2: { subject: "생명과학I", standardScore: 71, percentile: 98 },
        history: { grade: 1 },
      }),
      preference: {
        target: "의예과",
        targetKind: "department",
        region: "전국",
        risk: "공격",
      },
    },
  },
  {
    label: "국어 강·수학 약 문과 · 경영 · 수도권 · 균형",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 131, percentile: 96 },
        math: { elective: "확률과통계", standardScore: 118, percentile: 80 },
        english: { grade: 2 },
        inquiry1: { subject: "사회문화", standardScore: 66, percentile: 94 },
        inquiry2: { subject: "생활과윤리", standardScore: 63, percentile: 86 },
        history: { grade: 2 },
      }),
      preference: {
        target: "경영학과",
        targetKind: "department",
        region: "수도권",
        risk: "균형",
      },
    },
  },
  {
    label: "하위권 이과 · 전자공학 · 전국 · 균형",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 104, percentile: 62 },
        math: { elective: "미적분", standardScore: 112, percentile: 70 },
        english: { grade: 4 },
        inquiry1: { subject: "물리학I", standardScore: 55, percentile: 64 },
        inquiry2: { subject: "화학I", standardScore: 53, percentile: 60 },
        history: { grade: 4 },
      }),
      preference: {
        target: "전자공학과",
        targetKind: "department",
        region: "전국",
        risk: "균형",
      },
    },
  },
  {
    label: "확통·사탐 학생의 컴퓨터공학 희망 · 수도권 · 균형 (선택과목 제한)",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 124, percentile: 90 },
        math: { elective: "확률과통계", standardScore: 126, percentile: 90 },
        english: { grade: 2 },
        inquiry1: { subject: "사회문화", standardScore: 64, percentile: 90 },
        inquiry2: { subject: "한국지리", standardScore: 63, percentile: 88 },
        history: { grade: 2 },
      }),
      preference: {
        target: "컴퓨터공학과",
        targetKind: "department",
        region: "수도권",
        risk: "균형",
      },
    },
  },
  {
    label: "상위권 문과 영어 4등급 · 경영 · 서울 · 공격",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 133, percentile: 97 },
        math: { elective: "확률과통계", standardScore: 132, percentile: 96 },
        english: { grade: 4 },
        inquiry1: { subject: "경제", standardScore: 67, percentile: 96 },
        inquiry2: { subject: "사회문화", standardScore: 66, percentile: 94 },
        history: { grade: 3 },
      }),
      preference: {
        target: "경영학과",
        targetKind: "department",
        region: "서울",
        risk: "공격",
      },
    },
  },
  {
    label: "중위권 자연 · 간호 · 전국 · 안정",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 115, percentile: 78 },
        math: { elective: "미적분", standardScore: 121, percentile: 82 },
        english: { grade: 3 },
        inquiry1: { subject: "생명과학I", standardScore: 60, percentile: 80 },
        inquiry2: { subject: "화학I", standardScore: 58, percentile: 76 },
        history: { grade: 3 },
      }),
      preference: {
        target: "간호학과",
        targetKind: "department",
        region: "전국",
        risk: "안정",
      },
    },
  },
  {
    label: "중상위 이과 · 기계공학 · 수도권 · 공격",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 122, percentile: 88 },
        math: { elective: "기하", standardScore: 128, percentile: 91 },
        english: { grade: 2 },
        inquiry1: { subject: "물리학I", standardScore: 64, percentile: 89 },
        inquiry2: { subject: "지구과학I", standardScore: 62, percentile: 86 },
        history: { grade: 2 },
      }),
      preference: {
        target: "기계공학과",
        targetKind: "department",
        region: "수도권",
        risk: "공격",
      },
    },
  },
  {
    label: "상위권 인문 · 국어국문 · 서울 · 안정",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 135, percentile: 98 },
        math: { elective: "확률과통계", standardScore: 128, percentile: 92 },
        english: { grade: 1 },
        inquiry1: { subject: "동아시아사", standardScore: 66, percentile: 95 },
        inquiry2: { subject: "윤리와사상", standardScore: 65, percentile: 93 },
        history: { grade: 1 },
      }),
      preference: {
        target: "국어국문학과",
        targetKind: "department",
        region: "서울",
        risk: "안정",
      },
    },
  },
  {
    label: "국어교육 희망 · 수도권 · 균형 (교육 계열)",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 128, percentile: 94 },
        math: { elective: "확률과통계", standardScore: 124, percentile: 88 },
        english: { grade: 2 },
        inquiry1: { subject: "윤리와사상", standardScore: 64, percentile: 90 },
        inquiry2: { subject: "사회문화", standardScore: 63, percentile: 88 },
        history: { grade: 2 },
      }),
      preference: {
        target: "국어교육과",
        targetKind: "department",
        region: "수도권",
        risk: "균형",
      },
    },
  },
  {
    label: "상위권 인문 · 경제 · 서울 · 균형",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 132, percentile: 96 },
        math: { elective: "확률과통계", standardScore: 134, percentile: 97 },
        english: { grade: 1 },
        inquiry1: { subject: "경제", standardScore: 68, percentile: 97 },
        inquiry2: { subject: "사회문화", standardScore: 66, percentile: 94 },
        history: { grade: 1 },
      }),
      preference: {
        target: "경제학과",
        targetKind: "department",
        region: "서울",
        risk: "균형",
      },
    },
  },
  {
    label: "중위권 자연 · 화학공학 · 수도권 · 안정",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 117, percentile: 80 },
        math: { elective: "미적분", standardScore: 124, percentile: 86 },
        english: { grade: 3 },
        inquiry1: { subject: "화학I", standardScore: 61, percentile: 83 },
        inquiry2: { subject: "생명과학I", standardScore: 60, percentile: 80 },
        history: { grade: 3 },
      }),
      preference: {
        target: "화학공학과",
        targetKind: "department",
        region: "수도권",
        risk: "안정",
      },
    },
  },
  {
    label: "하위권 문과 · 사회복지 · 전국 · 균형",
    input: {
      score: score({
        korean: { elective: "화법과작문", standardScore: 100, percentile: 55 },
        math: { elective: "확률과통계", standardScore: 98, percentile: 52 },
        english: { grade: 5 },
        inquiry1: { subject: "생활과윤리", standardScore: 50, percentile: 55 },
        inquiry2: { subject: "한국지리", standardScore: 49, percentile: 52 },
        history: { grade: 5 },
      }),
      preference: {
        target: "사회복지학과",
        targetKind: "department",
        region: "전국",
        risk: "균형",
      },
    },
  },
  {
    label: "미적분·사탐 혼합 · 경영 · 전국 · 공격 (계열 판정 없음)",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 125, percentile: 91 },
        math: { elective: "미적분", standardScore: 130, percentile: 93 },
        english: { grade: 2 },
        inquiry1: { subject: "사회문화", standardScore: 64, percentile: 90 },
        inquiry2: { subject: "생활과윤리", standardScore: 63, percentile: 89 },
        history: { grade: 2 },
      }),
      preference: {
        target: "경영학과",
        targetKind: "department",
        region: "전국",
        risk: "공격",
      },
    },
  },
  {
    label: "약학 희망 상위권 자연 · 전국 · 안정",
    input: {
      score: score({
        korean: { elective: "언어와매체", standardScore: 133, percentile: 97 },
        math: { elective: "미적분", standardScore: 140, percentile: 98 },
        english: { grade: 1 },
        inquiry1: { subject: "화학I", standardScore: 69, percentile: 96 },
        inquiry2: { subject: "생명과학I", standardScore: 68, percentile: 95 },
        history: { grade: 1 },
      }),
      preference: {
        target: "약학과",
        targetKind: "department",
        region: "전국",
        risk: "안정",
      },
    },
  },
];

type Violation = string;

const describe = (evaluation: PlanEvaluation): string =>
  `${evaluation.plan.university} ${evaluation.plan.department}(${evaluation.plan.group})`;

/** 엔진 산출물의 판정 기준·범위·자격·목록 포함 관계 */
/**
 * 스나이핑 (마지막 피드백): 구간·판정 조건·실측 비율·추천 목록과의 분리·조합 위치.
 * 엔진 플래그 대신 격차·입결 원문 군을 다시 본다.
 */
export const checkSniping = (analysis: JeongsiAnalysis): Violation[] => {
  const violations: Violation[] = [];
  const recommendedIds = new Set(
    (["상향", "적정", "안정"] as const).flatMap((tier) =>
      analysis.recommendations[tier].map((item) => item.plan.id)
    )
  );
  if (analysis.sniping.length > SNIPING_SIZE) {
    violations.push(
      `[S] 스나이핑 ${analysis.sniping.length}곳 (최대 ${SNIPING_SIZE})`
    );
  }
  const universities = analysis.sniping.map((item) => item.plan.university);
  if (new Set(universities).size !== universities.length) {
    violations.push("[S] 스나이핑에 같은 대학이 두 번");
  }
  for (const evaluation of analysis.sniping) {
    const label = describe(evaluation);
    const gap = evaluation.gapRatio;
    if (gap === null || gap < SNIPING_MIN_GAP || gap >= GAP_BANDS.상향하한) {
      violations.push(`[S] ${label}: 스나이핑 구간 밖 격차 ${gap}`);
    }
    if (evaluation.tier !== "스나이핑" || evaluation.chance !== "매우낮음") {
      violations.push(`[S] ${label}: 구분·가능성이 스나이핑이 아님`);
    }
    if (evaluation.referenceCut?.metric !== "convertedScore") {
      violations.push(`[S] ${label}: 환산점수 입결이 아님`);
    }
    const regrouped = evaluation.resultYears.some((year) => {
      const entry = resultIndexForCheck
        .get(evaluation.plan.id)
        ?.find((item) => item.admissionYear === year);
      return entry !== undefined && entry.group !== evaluation.plan.group;
    });
    if (regrouped) {
      violations.push(`[S] ${label}: 과거 모집군이 다른 입결`);
    }
    const rate = evaluation.historicalPassRate;
    if (rate === null || rate < 0.02 || rate > 0.12) {
      violations.push(`[S] ${label}: 실측 통과율 ${rate}`);
    }
    if (recommendedIds.has(evaluation.plan.id)) {
      violations.push(`[S] ${label}: 추천 목록과 겹침`);
    }
    if (
      !evaluation.eligible ||
      !checkEligibility(analysis.input.score, evaluation.plan.restrictions)
        .eligible
    ) {
      violations.push(`[E1] ${label}: 지원 자격 불충족`);
    }
  }
  const snipingCombinations = analysis.combinations.filter((combination) =>
    (["가", "나", "다"] as const).some(
      (group) => combination[group]?.tier === "스나이핑"
    )
  );
  const { risk } = analysis.input.preference;
  if (risk !== "공격" && snipingCombinations.length > 0) {
    violations.push(`[S] ${risk} 성향인데 스나이핑 조합이 있음`);
  }
  if (snipingCombinations.length > 1) {
    violations.push("[S] 스나이핑 조합이 둘 이상");
  }
  for (const combination of snipingCombinations) {
    if (
      combination.label !== SNIPING_COMBINATION_LABEL ||
      combination.recommended
    ) {
      violations.push(
        `[S] 「${combination.label}」: 스나이핑 칸이 있는 조합의 라벨·추천 표시`
      );
    }
  }
  return violations;
};

const checkAnalysis = (analysis: JeongsiAnalysis): Violation[] => {
  const violations: Violation[] = [];
  const recommended = (["상향", "적정", "안정"] as const).flatMap(
    (tier) => analysis.recommendations[tier]
  );
  const recommendedIds = new Set(recommended.map((item) => item.plan.id));

  for (const evaluation of recommended) {
    const label = describe(evaluation);
    const gap = evaluation.gapRatio;
    if (gap === null) {
      violations.push(`[B2] ${label}: 판정 격차 없음`);
      continue;
    }
    if (!evaluation.withinRecommendRange) {
      violations.push(`[C1] ${label}: 추천 범위 밖 격차 ${gap}`);
    }
    const bandTier = tierForGap(gap);
    // 안정 제한 사유를 엔진 플래그가 아니라 입결 학년도·지표·원문 군에서 다시 구한다
    const regrouped = evaluation.resultYears.filter((year) => {
      const entry = resultIndexForCheck
        .get(evaluation.plan.id)
        ?.find((item) => item.admissionYear === year);
      return entry !== undefined && entry.group !== evaluation.plan.group;
    });
    const mustCap =
      evaluation.resultYears.length < MIN_YEARS_FOR_SAFE ||
      evaluation.referenceCut?.metric === "percentile" ||
      regrouped.length > 0;
    if (
      regrouped.length !== evaluation.pastGroups.length ||
      regrouped.some(
        (year, index) => evaluation.pastGroups[index]?.year !== year
      )
    ) {
      violations.push(`[A3] ${label}: 원문 모집군 변경 학년도 표기가 다름`);
    }
    const expectedTier = bandTier === "안정" && mustCap ? "적정" : bandTier;
    if (evaluation.tier !== expectedTier) {
      violations.push(
        `[B2] ${label}: 구분 ${evaluation.tier} ≠ 구간 기준 ${expectedTier} (격차 ${gap})`
      );
    }
    if (evaluation.chance !== chanceFor(evaluation.tier, gap)) {
      violations.push(`[B2] ${label}: 합격 가능성이 구간 기준과 다름`);
    }
    if (evaluation.tier === "안정" && mustCap) {
      violations.push(`[B4] ${label}: 안정 제한 사유가 있는데 안정`);
    }
    const eligibility = checkEligibility(
      analysis.input.score,
      evaluation.plan.restrictions
    );
    if (!evaluation.eligible || !eligibility.eligible) {
      violations.push(`[E1] ${label}: 지원 자격 불충족`);
    }
    if (gap < GAP_BANDS.상향하한 || gap > GAP_BANDS.안정상한) {
      violations.push(`[C1] ${label}: 격차 ${gap} 가 추천 범위를 벗어남`);
    }
  }

  for (const evaluation of analysis.advantageousPlans) {
    if (!recommendedIds.has(evaluation.plan.id)) {
      violations.push(
        `[A1] PART 2 ${describe(evaluation)}: PART 3 목록에 없음`
      );
    }
  }
  // PART 3 은 상향·적정·안정 목록과 스나이핑 칸이다(PART 2 는 앞 셋에서만)
  const part3Ids = new Set([
    ...recommendedIds,
    ...analysis.sniping.map((item) => item.plan.id),
  ]);
  for (const combination of analysis.combinations) {
    for (const group of ["가", "나", "다"] as const) {
      const slot = combination[group];
      if (!slot) continue;
      if (!part3Ids.has(slot.plan.id)) {
        violations.push(
          `[A1] 조합 "${combination.label}" ${describe(slot)}: PART 3 목록에 없음`
        );
      }
      if (slot.plan.group !== group) {
        violations.push(`[A3] 조합 ${describe(slot)} 이 ${group}군 칸에 있음`);
      }
    }
    // [A4] 빈 군 표시가 목록과 맞는지. "지원처 없음"이면 목록에 그 군이 없어야 하고,
    // 대안이 아닌 조합은 목록에 남은 그 군 후보(다른 대학)가 있으면 비우지 않는다.
    const usedUniversities = new Set(
      (["가", "나", "다"] as const)
        .map((group) => combination[group]?.plan.university)
        .filter((university): university is string => Boolean(university))
    );
    const noneGroups =
      combination.label
        .match(/([가나다](?:·[가나다])*)군 지원처 없음/)?.[1]
        .split("·") ?? [];
    for (const group of ["가", "나", "다"] as const) {
      if (combination[group]) continue;
      const listed = recommended.filter((item) => item.plan.group === group);
      if (noneGroups.includes(group) && listed.length > 0) {
        violations.push(
          `[A4] 조합 "${combination.label}": ${group}군 지원처 없음인데 목록에 ${listed.length}곳`
        );
      }
      const remaining = listed.filter(
        (item) => !usedUniversities.has(item.plan.university)
      );
      if (!/대안$/.test(combination.label) && remaining.length > 0) {
        violations.push(
          `[A4] 조합 "${combination.label}": ${group}군을 비웠는데 남은 후보 ${remaining.map(describe).join(", ")}`
        );
      }
    }
  }
  const recommendedCount = analysis.combinations.filter(
    (combination) => combination.recommended
  ).length;
  if (analysis.combinations.length > 0 && recommendedCount !== 1) {
    violations.push(`[D3] 대표 조합 수 ${recommendedCount}`);
  }
  return violations;
};

/** 리포트 문장 감사 (F1·D1): 사실과 다른 표현, 영역 서술 반복, 섹션 안 중복 문장 */
const BANNED_ANYWHERE = [/3개년/, /최근 3년/, /백분위점 (넘겨|모자라)/];
const AREA_ROLE_OUTSIDE_PART1 = /(강점|약점)(인|이|은|영역|의)/;

export const auditText = (content: JeongsiReportContent): Violation[] => {
  const violations: Violation[] = [];
  // [F2] 가운데 점으로 잇는 말투는 쓰지 않는다(원문 대학·학과 고유명만 예외)
  const protectedNames = collectProtectedNames(content);
  const walk = (value: unknown, path: string, key?: string): void => {
    if (typeof value === "string") {
      if (
        key !== "university" &&
        key !== "department" &&
        hasStrayInterpunct(value, protectedNames)
      ) {
        violations.push(`[F2] ${path}: 가운데 점 — ${value.slice(0, 80)}`);
      }
      // [F3] 합격을 보장하는 듯한 단정 표현(수시 admissionPrediction 과 같은 기준)
      if (findOverclaims(value).length > 0) {
        violations.push(`[F3] ${path}: 단정 표현 — ${value.slice(0, 100)}`);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) {
        walk(child, `${path}.${childKey}`, childKey);
      }
    }
  };
  walk(content.sections, "sections");
  const sentencesOf = (text: string): string[] =>
    text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  for (const section of content.sections) {
    const texts: string[] = [];
    if (section.sectionId === "jeongsiUniversityMatch") {
      texts.push(...section.items.map((item) => item.reason));
    }
    if (section.sectionId === "jeongsiRecommendation") {
      texts.push(
        ...section.groups.flatMap((group) =>
          group.items.map((item) => item.comment)
        ),
        ...section.notices
      );
    }
    if (section.sectionId === "jeongsiUniversityDetail") {
      texts.push(...section.items.map((item) => item.reason));
    }
    if (section.sectionId === "jeongsiCombination") {
      texts.push(
        ...section.combinations.flatMap((combo) =>
          (combo.slotReasons ?? []).map((slot) => slot.reason)
        )
      );
    }
    const sentences = texts.flatMap(sentencesOf);
    for (const sentence of sentences) {
      if (BANNED_ANYWHERE.some((pattern) => pattern.test(sentence))) {
        violations.push(`[F1] ${section.sectionId}: 금지 표현 — ${sentence}`);
      }
      if (AREA_ROLE_OUTSIDE_PART1.test(sentence)) {
        violations.push(
          `[D1] ${section.sectionId}: 영역 강점·약점 서술 — ${sentence}`
        );
      }
    }
    const seen = new Set<string>();
    for (const sentence of sentences) {
      if (seen.has(sentence)) {
        violations.push(
          `[D1] ${section.sectionId}: 같은 문장 반복 — ${sentence}`
        );
      }
      seen.add(sentence);
    }
  }
  return violations;
};

/** 실측 통과율이 구분과 맞는지 (B2) */
export const checkPassRates = (analysis: JeongsiAnalysis): Violation[] =>
  (["상향", "적정", "안정"] as const).flatMap((tier) =>
    analysis.recommendations[tier].flatMap((evaluation) => {
      const rate = evaluation.historicalPassRate;
      // 실측은 환산점수 입결에서만 쟀다. 백분위 입결에 비율이 붙으면 근거 없는 수치다
      if (evaluation.referenceCut?.metric === "percentile") {
        return rate === null
          ? []
          : [`[B2] ${describe(evaluation)}: 백분위 입결인데 실측 비율 표시`];
      }
      if (rate === null)
        return [`[B2] ${describe(evaluation)}: 실측 통과율 없음`];
      const [low, high] =
        evaluation.tier === "안정"
          ? [0.72, 1]
          : evaluation.tier === "적정"
            ? [0.37, evaluation.safeCapped ? 1 : 0.78]
            : [0.07, 0.43];
      return rate < low || rate > high
        ? [
            `[B2] ${describe(evaluation)}: ${evaluation.tier}인데 실측 ${Math.round(rate * 100)}%`,
          ]
        : [];
    })
  );

/** 남학생 입력에 여자대학교가 목록·스나이핑·조합 어디에든 나오는지 (E2) */
export const checkGender = (analysis: JeongsiAnalysis): Violation[] => {
  if (analysis.input.gender !== "male") {
    return [];
  }
  const shown = [
    ...(["상향", "적정", "안정"] as const).flatMap(
      (tier) => analysis.recommendations[tier]
    ),
    ...analysis.sniping,
    ...analysis.advantageousPlans,
    ...analysis.combinations.flatMap((combination) =>
      (["가", "나", "다"] as const)
        .map((group) => combination[group])
        .filter((slot): slot is PlanEvaluation => slot !== null)
    ),
  ];
  return shown
    .filter((evaluation) => isWomensUniversity(evaluation.plan.university))
    .map((evaluation) => `[E2] 남학생에게 ${describe(evaluation)} 추천`);
};

const formatRow = (evaluation: PlanEvaluation): string => {
  const unit =
    evaluation.referenceCut?.metric === "convertedScore" ? "%만점" : "백분위점";
  return `    ${evaluation.tier} ${evaluation.chance.padEnd(2)} ${describe(evaluation).padEnd(40)} 격차 ${String(evaluation.gapRatio).padStart(7)} ${unit} 입결 ${evaluation.resultYears.join("·") || "-"}${evaluation.safeCapped ? ` (${evaluation.safeCapReasons.join("·")}→적정)` : ""}${evaluation.pastGroups.length ? ` [과거 ${evaluation.pastGroups.map((item) => `${item.year} ${item.group}군`).join("·")}]` : ""}`;
};

const main = async (): Promise<void> => {
  const verbose = process.argv.includes("--verbose");
  let total = 0;

  for (const [index, verifyCase] of VERIFY_CASES.entries()) {
    const analysis = await analyzeJeongsi(verifyCase.input);
    const content = await buildJeongsiReport(analysis, {
      reportId: `verify-${index + 1}`,
    });
    // 성별은 남학생으로 한 번 더 돌려 여자대학교 제외를 확인한다(사례 입력은 그대로)
    const maleAnalysis = await analyzeJeongsi({
      ...verifyCase.input,
      gender: "male",
    });
    const violations = [
      ...checkGender(maleAnalysis),
      ...checkAnalysis(maleAnalysis),
      ...checkAnalysis(analysis),
      ...checkPassRates(analysis),
      ...checkSniping(analysis),
      ...auditText(content),
      ...findReportInconsistencies(content, analysis).map(
        (problem) => `[A2] ${problem}`
      ),
    ];
    total += violations.length;

    console.log(`\n■ ${verifyCase.label} — 위반 ${violations.length}건`);
    if (verbose) {
      for (const tier of ["상향", "적정", "안정"] as const) {
        for (const evaluation of analysis.recommendations[tier]) {
          console.log(formatRow(evaluation));
        }
      }
      for (const evaluation of analysis.sniping) {
        console.log(
          `${formatRow(evaluation)} 실측 ${Math.round((evaluation.historicalPassRate ?? 0) * 100)}%`
        );
      }
      for (const combination of analysis.combinations) {
        const slots = (["가", "나", "다"] as const)
          .map((group) => {
            const slot = combination[group];
            return slot
              ? `${group}:${slot.plan.university} ${slot.plan.department}(${slot.tier})`
              : `${group}:-`;
          })
          .join(" / ");
        console.log(
          `    ${combination.recommended ? "★" : " "} ${combination.label}: ${slots}`
        );
      }
    }
    for (const violation of violations) {
      console.log(`    ✗ ${violation}`);
    }
  }

  console.log(`\n총 위반 ${total}건 (사례 ${VERIFY_CASES.length}명)`);
  if (total > 0) {
    process.exitCode = 1;
  }
};

if (process.argv[1]?.endsWith("verify-cases.ts")) void main();
