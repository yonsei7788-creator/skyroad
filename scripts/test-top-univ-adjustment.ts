/**
 * ujh9208@gmail.com 전체 추천대학 플로우 시뮬레이션
 * 5등급제, 평균 4.07, 일반고, 경영학과/경제학과/산업공학과
 *
 * Usage: npx tsx scripts/test-top-univ-adjustment.ts
 */

import { buildUniversityCandidatesText } from "../libs/report/pipeline/preprocessor.ts";
import { findCutoffData } from "../libs/report/constants/admission-cutoff-data.ts";

const gradingSystem = "5등급제" as const;
const overallAverage = 4.07;
const departmentKeywords = ["경영학과", "경제학과", "산업공학과"];
const userTargetUniversity = "대구대학교";

const TABLE: [number, number][] = [
  [1, 1],
  [1.5, 1.09],
  [2, 1.33],
  [2.5, 1.6],
  [3, 1.89],
  [3.5, 2.15],
  [4, 2.43],
  [4.5, 2.73],
  [5, 3.03],
  [5.5, 3.32],
  [6, 3.55],
  [6.5, 3.91],
  [7, 4.19],
  [7.5, 4.47],
  [8, 4.72],
  [8.5, 4.91],
  [9, 5],
];
const fiveToNine = (five: number): number => {
  if (five <= 1) return 1;
  if (five >= 5) return 9;
  for (let i = 1; i < TABLE.length; i++) {
    const [n1, f1] = TABLE[i - 1];
    const [n2, f2] = TABLE[i];
    if (five <= f2) {
      return (
        Math.round((n1 + ((five - f1) / (f2 - f1)) * (n2 - n1)) * 100) / 100
      );
    }
  }
  return 9;
};
const nineToFive = (nine: number): number => {
  if (nine <= 1) return 1;
  if (nine >= 9) return 5;
  for (let i = 1; i < TABLE.length; i++) {
    const [n1, f1] = TABLE[i - 1];
    const [n2, f2] = TABLE[i];
    if (nine <= n2) {
      return (
        Math.round((f1 + ((nine - n1) / (n2 - n1)) * (f2 - f1)) * 100) / 100
      );
    }
  }
  return 5;
};

const studentGrade9 = fiveToNine(overallAverage);
console.log(`학생: ${overallAverage} (5등급제) → 9등급 환산: ${studentGrade9}`);
console.log(
  `범위: [${(studentGrade9 - 0.3).toFixed(2)}, ${(studentGrade9 + 0.3).toFixed(2)}]\n`
);

// ══ 1단계: 후보군 추출 ══
console.log("=== 1단계: 후보군 추출 ===\n");

const candidatesText = buildUniversityCandidatesText(
  "경영학부 경영학전공",
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

// ══ 2단계: 카드 생성 ══
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

const closestCutoff = (cuts: number[], grade: number): number | null => {
  if (cuts.length === 0) return null;
  return cuts.reduce((best, g) =>
    Math.abs(g - grade) < Math.abs(best - grade) ? g : best
  );
};

const gapToChance = (gap: number): string => {
  if (gap >= 0.3) return "very_low";
  if (gap > 0.1) return "low";
  if (gap >= -0.1) return "medium";
  return "high";
};

const CHANCE_LABELS: Record<string, string> = {
  very_low: "낮음",
  low: "다소 낮음",
  medium: "보통",
  high: "높음",
};
const CHANCE_LEVELS = ["very_low", "low", "medium", "high"];

const cards = candidates.map((cand) => {
  const rawCutoffs = findCutoffData(cand.university, cand.department);
  const cutoffs = rawCutoffs.filter(
    (c) => !SPECIAL_KEYWORDS.some((kw) => c.admissionName.includes(kw))
  );

  const hakjongCuts = cutoffs
    .filter((c) => c.admissionType === "학종" && c.cutoff50Grade != null)
    .map((c) => nineToFive(c.cutoff50Grade!));
  const gyogwaCuts = cutoffs
    .filter((c) => c.admissionType === "교과" && c.cutoff50Grade != null)
    .map((c) => nineToFive(c.cutoff50Grade!));

  const hakjongRep = closestCutoff(hakjongCuts, overallAverage);
  const gyogwaRep = closestCutoff(gyogwaCuts, overallAverage);

  const hakjongChance = hakjongRep
    ? gapToChance(Math.round((overallAverage - hakjongRep) * 1000) / 1000)
    : "medium";
  let gyogwaChance = gyogwaRep
    ? gapToChance(Math.round((overallAverage - gyogwaRep) * 1000) / 1000)
    : "medium";

  const compIdx = CHANCE_LEVELS.indexOf(hakjongChance);
  const subjIdx = CHANCE_LEVELS.indexOf(gyogwaChance);
  if (compIdx === subjIdx && subjIdx > 0) {
    gyogwaChance = CHANCE_LEVELS[subjIdx - 1];
  }

  return {
    university: cand.university,
    department: cand.department,
    hakjongChance,
    gyogwaChance,
    _hakjongRep: hakjongRep,
    _gyogwaRep: gyogwaRep,
  };
});

// ══ 3단계: 비현실적 필터링 ══
console.log("=== 3단계: 비현실적 필터링 ===\n");

const filteredCards = cards.filter((card) => {
  if (card.university === userTargetUniversity) {
    console.log(`  ✅ ${card.university} — 희망대학 유지`);
    return true;
  }
  const rawCutoffs = findCutoffData(card.university, card.department);
  const filtered = rawCutoffs.filter(
    (c) => !SPECIAL_KEYWORDS.some((kw) => c.admissionName.includes(kw))
  );
  const gyogwa = filtered.find(
    (c) => c.admissionType === "교과" && c.cutoff50Grade != null
  );
  const hakjong = filtered.find(
    (c) => c.admissionType === "학종" && c.cutoff50Grade != null
  );
  const repCut9 = gyogwa?.cutoff50Grade ?? hakjong?.cutoff50Grade ?? null;
  if (repCut9 == null) {
    console.log(`  ✅ ${card.university} — cutoff 없음, 유지`);
    return true;
  }
  const repCut5 = nineToFive(repCut9);
  const gap = Math.round((overallAverage - repCut5) * 1000) / 1000;
  if (gap > 1.5) {
    console.log(
      `  ❌ ${card.university} — 비현실적 제거 (5등급 gap=${gap.toFixed(2)})`
    );
    return false;
  }
  console.log(`  ✅ ${card.university} — 유지 (gap=${gap.toFixed(2)})`);
  return true;
});

// ══ 최종 결과 ══
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
      ? Math.round((overallAverage - card._hakjongRep) * 1000) / 1000
      : null;
  const tier =
    diff == null
      ? "?"
      : diff >= 0.3
        ? "상향"
        : diff > 0.1
          ? "소신"
          : diff >= -0.1
            ? "적정"
            : "안정";

  console.log(
    `${tier.padEnd(6)} | ${card.university.padEnd(20)} | ${card.department.padEnd(25)} | ${CHANCE_LABELS[card.hakjongChance].padEnd(12)} | ${CHANCE_LABELS[card.gyogwaChance]}`
  );
}

console.log(`\n총 ${filteredCards.length}개 대학`);
