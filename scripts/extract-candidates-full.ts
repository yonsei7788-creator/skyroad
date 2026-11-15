/**
 * 실제 로직: 후보군 추출 → postprocessor 필터링까지 시뮬레이션.
 * Usage: npx tsx scripts/extract-candidates-full.ts
 */

import { buildUniversityCandidatesText } from "../libs/report/pipeline/preprocessor.ts";
import { findCutoffData } from "../libs/report/constants/admission-cutoff-data.ts";

// ── 학생 파라미터 (feedback-organized.md 대상) ──
const targetDept = "컴퓨터AI";
const gradingSystem = "9등급제" as const;
const overallAverage = 1.67;
const departmentKeywords = [
  "컴퓨터공학과",
  "인공지능학과",
  "데이터사이언스학과",
];
const studentGrade9 = overallAverage; // 9등급제이므로 환산 불필요
const isGyogwaOnly = false;

// ── 1단계: 후보군 추출 ──
console.log("=== 1단계: 후보군 추출 (buildUniversityCandidatesText) ===\n");

const result = buildUniversityCandidatesText(
  targetDept,
  gradingSystem,
  overallAverage,
  undefined,
  false,
  departmentKeywords,
  undefined,
  false
);

const candidates = JSON.parse(result) as {
  university: string;
  department: string;
  cutoffData?: string;
}[];

for (const c of candidates) {
  const cuts = (c.cutoffData || "").match(/50%cut=(\d+\.?\d*)/g) || [];
  const minCut =
    cuts.length > 0
      ? Math.min(...cuts.map((s) => parseFloat(s.replace("50%cut=", ""))))
      : null;
  const diff = minCut != null ? (overallAverage - minCut).toFixed(2) : "?";
  const label =
    minCut == null
      ? "?"
      : minCut < overallAverage - 0.15
        ? "상향"
        : minCut > overallAverage + 0.15
          ? "안정"
          : "적정";
  console.log(
    `  [${label}] ${c.university} — ${c.department} (min50%cut=${minCut}, diff=${diff})`
  );
}

// ── 2단계: postprocessor 필터링 시뮬레이션 ──
console.log("\n=== 2단계: postprocessor 필터링 시뮬레이션 ===\n");

// postprocessor의 getRepCutoff9 재현 (교과 50%cut 우선)
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

const unreachableGap9 = 1.5;
const tooEasyGap9 = 1.5;

const finalCandidates: typeof candidates = [];

for (const c of candidates) {
  const cutoff9 = getRepCutoff9(c.university, c.department);
  if (cutoff9 == null) {
    console.log(`  ✅ ${c.university} — cutoff 없음, 유지`);
    finalCandidates.push(c);
    continue;
  }

  const gap = studentGrade9 - cutoff9;

  if (gap > unreachableGap9) {
    console.log(
      `  ❌ ${c.university} — 비현실적 제거 (cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
    );
    continue;
  }
  if (gap < -tooEasyGap9) {
    console.log(
      `  ❌ ${c.university} — 하향 과다 제거 (cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
    );
    continue;
  }

  console.log(
    `  ✅ ${c.university} — 유지 (cutoff9=${cutoff9.toFixed(2)}, gap=${gap.toFixed(2)})`
  );
  finalCandidates.push(c);
}

// ── 3단계: 최종 결과 ──
console.log("\n=== 최종 결과 (리포트에 노출될 대학) ===\n");

for (const c of finalCandidates) {
  const cuts = (c.cutoffData || "").match(/50%cut=(\d+\.?\d*)/g) || [];
  const minCut =
    cuts.length > 0
      ? Math.min(...cuts.map((s) => parseFloat(s.replace("50%cut=", ""))))
      : null;
  const label =
    minCut == null
      ? "?"
      : minCut < overallAverage - 0.15
        ? "상향"
        : minCut > overallAverage + 0.15
          ? "안정"
          : "적정";
  console.log(`  [${label}] ${c.university} — ${c.department}`);
  if (c.cutoffData) {
    console.log(`         ${c.cutoffData}`);
  }
}

console.log(`\n총 ${finalCandidates.length}개 대학`);
