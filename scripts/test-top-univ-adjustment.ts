/**
 * kdw050201@gmail.com 전체 추천대학 플로우 시뮬레이션
 * 후보군 추출 → 카드 생성 → 비현실적 필터링 → 최종 결과
 *
 * Usage: npx tsx scripts/test-top-univ-adjustment.ts
 */

import { buildUniversityCandidatesText } from "../libs/report/pipeline/preprocessor.ts";
import { findCutoffData } from "../libs/report/constants/admission-cutoff-data.ts";

// ── 학생 데이터 (실제 리포트 기반) ──
const gradingSystem = "9등급제" as const;
const overallAverage = 2.74;
const studentGrade9 = overallAverage;
const targetDept = "반도체기계시스템공학과";
const userTargetUniversity = "중앙대학교";
// majorExploration suggestions
const departmentKeywords = ["반도체공학과", "전자공학과", "화학공학과"];

// ══════════════════════════════════════════════
// 1단계: 후보군 추출 (preprocessor)
// ══════════════════════════════════════════════
console.log("=== 1단계: 후보군 추출 ===\n");

const candidatesText = buildUniversityCandidatesText(
  targetDept,
  gradingSystem,
  overallAverage,
  undefined,
  false,
  departmentKeywords,
  undefined,
  false
);

const candidates = JSON.parse(candidatesText) as {
  university: string;
  department: string;
  cutoffData?: string;
}[];

for (const c of candidates) {
  console.log(`  ${c.university} — ${c.department}`);
}
console.log(`  후보군: ${candidates.length}개\n`);

// ══════════════════════════════════════════════
// 2단계: postprocessor 카드 생성
// ══════════════════════════════════════════════
console.log("=== 2단계: 카드 생성 ===\n");

const gapToChance = (gap: number): string => {
  if (gap > 0.1) return "very_low";
  if (gap >= 0.05) return "low";
  if (gap >= -0.1) return "medium";
  return "high";
};

const CHANCE_LEVELS = ["very_low", "low", "medium", "high"];
const CHANCE_LABELS: Record<string, string> = {
  very_low: "낮음",
  low: "다소 낮음",
  medium: "보통",
  high: "높음",
};

// 학생과 가장 가까운 cutoff를 대표값으로 선택
const closestCutoff = (cuts: number[], grade: number): number | null => {
  if (cuts.length === 0) return null;
  return cuts.reduce((best, g) =>
    Math.abs(g - grade) < Math.abs(best - grade) ? g : best
  );
};

const SPECIAL_KEYWORDS = [
  "기회균형",
  "고른기회",
  "기회균등",
  "농어촌",
  "사회배려",
  "국가보훈",
  "특성화고",
  "계열적합",
];

const cards = candidates.map((cand) => {
  const rawCutoffs = findCutoffData(cand.university, cand.department);
  const cutoffs = rawCutoffs.filter(
    (c) => !SPECIAL_KEYWORDS.some((kw) => c.admissionName.includes(kw))
  );

  const gyogwaCuts = cutoffs
    .filter((c) => c.admissionType === "교과" && c.cutoff50Grade != null)
    .map((c) => c.cutoff50Grade!);
  const gyogwaRep = closestCutoff(gyogwaCuts, studentGrade9);
  const gyogwaChance = gyogwaRep
    ? gapToChance(Math.round((studentGrade9 - gyogwaRep) * 1000) / 1000)
    : "medium";
  const gyogwaType =
    cutoffs.find((c) => c.admissionType === "교과")?.admissionName ??
    "학생부교과";

  const hakjongCuts = cutoffs
    .filter((c) => c.admissionType === "학종" && c.cutoff50Grade != null)
    .map((c) => c.cutoff50Grade!);
  const hakjongRep = closestCutoff(hakjongCuts, studentGrade9);
  const hakjongChance = hakjongRep
    ? gapToChance(Math.round((studentGrade9 - hakjongRep) * 1000) / 1000)
    : "medium";
  const hakjongType =
    cutoffs.find((c) => c.admissionType === "학종")?.admissionName ??
    "학생부종합";

  return {
    university: cand.university,
    department: cand.department,
    comprehensive: { admissionType: hakjongType, chance: hakjongChance },
    subject: { admissionType: gyogwaType, chance: gyogwaChance },
    _hakjongRep: hakjongRep,
    _gyogwaRep: gyogwaRep,
  };
});

// 교과와 학종 chance 동일 시 교과 한 단계 내림
for (const card of cards) {
  const compIdx = CHANCE_LEVELS.indexOf(card.comprehensive.chance);
  const subjIdx = CHANCE_LEVELS.indexOf(card.subject.chance);
  if (compIdx === subjIdx && subjIdx > 0) {
    card.subject.chance = CHANCE_LEVELS[subjIdx - 1];
  }
}

// 교과 커트라인 낮은 순 정렬
cards.sort((a, b) => (a._gyogwaRep ?? 9) - (b._gyogwaRep ?? 9));

// ══════════════════════════════════════════════
// 3단계: 비현실적 대학 필터링
// ══════════════════════════════════════════════
console.log("=== 3단계: 비현실적 필터링 (gap > 1.5) ===\n");

const unreachableGap9 = 1.5;

const getRepCutoff9 = (
  university: string,
  department: string
): number | null => {
  const cutoffs = findCutoffData(university, department);
  if (cutoffs.length > 0) {
    const gyogwa = cutoffs.find((c) => c.admissionType === "교과");
    if (gyogwa?.cutoff50Grade != null) return gyogwa.cutoff50Grade;
    const hakjong = cutoffs.find((c) => c.admissionType === "학종");
    if (hakjong?.cutoff50Grade != null) return hakjong.cutoff50Grade;
    for (const c of cutoffs) {
      if (c.cutoff50Grade != null) return c.cutoff50Grade;
    }
  }
  return null;
};

const filteredCards = cards.filter((card) => {
  if (card.university === userTargetUniversity) {
    console.log(`  ✅ ${card.university} — 희망대학 유지`);
    return true;
  }
  const cutoff9 = getRepCutoff9(card.university, card.department);
  if (cutoff9 == null) {
    console.log(`  ✅ ${card.university} — cutoff 없음, 유지`);
    return true;
  }
  const gap = studentGrade9 - cutoff9;
  if (gap > unreachableGap9) {
    console.log(
      `  ❌ ${card.university} — 비현실적 제거 (gap=${gap.toFixed(2)})`
    );
    return false;
  }
  console.log(`  ✅ ${card.university} — 유지 (gap=${gap.toFixed(2)})`);
  return true;
});

// ══════════════════════════════════════════════
// 최종 결과
// ══════════════════════════════════════════════
console.log(`\n=== 최종 결과 ===\n`);

console.log(
  "티어   | 대학                  | 학과                       | 학종          | 교과"
);
console.log(
  "------ | -------------------- | ------------------------- | ------------ | ------------"
);

for (const card of filteredCards) {
  const diff =
    card._hakjongRep != null
      ? Math.round((studentGrade9 - card._hakjongRep) * 1000) / 1000
      : null;
  const tier =
    diff == null
      ? "?"
      : diff > 0.1
        ? "상향"
        : diff >= 0.05
          ? "소신"
          : diff >= -0.1
            ? "적정"
            : "안정";

  console.log(
    `${tier.padEnd(6)} | ${card.university.padEnd(20)} | ${card.department.padEnd(25)} | ${CHANCE_LABELS[card.comprehensive.chance].padEnd(12)} | ${CHANCE_LABELS[card.subject.chance]}`
  );
}

console.log(`\n총 ${filteredCards.length}개 대학`);
