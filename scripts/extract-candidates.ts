/**
 * 실제 buildUniversityCandidatesText 로직으로 후보군 추출.
 * Usage: npx tsx scripts/extract-candidates.ts
 */

import { buildUniversityCandidatesText } from "../libs/report/pipeline/preprocessor.ts";

// 이 학생의 실제 파라미터 (feedback-organized.md 대상)
const targetDept = "컴퓨터AI";
const gradingSystem = "9등급제" as const;
const overallAverage = 1.67;
const departmentKeywords = [
  "컴퓨터공학과",
  "인공지능학과",
  "데이터사이언스학과",
];

console.log("=== 후보군 추출 (실제 로직) ===");
console.log(`학생 등급: ${overallAverage} (${gradingSystem})`);
console.log(`학과 키워드: ${departmentKeywords.join(", ")}`);
console.log("");

const result = buildUniversityCandidatesText(
  targetDept,
  gradingSystem,
  overallAverage,
  undefined, // fallbackDepartment
  false, // includeSpecialAdmission
  departmentKeywords,
  undefined, // schoolType (일반고)
  false // isGyogwaOnly
);

const candidates = JSON.parse(result);
console.log(`후보군 수: ${candidates.length}`);
console.log("");

// 50%cut 최소값으로 상향/적정/안정 분류
for (const c of candidates) {
  const cuts =
    ((c.cutoffData as string) || "").match(/50%cut=(\d+\.?\d*)/g) || [];
  const minCut =
    cuts.length > 0
      ? Math.min(
          ...cuts.map((s: string) => parseFloat(s.replace("50%cut=", "")))
        )
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
  if (c.cutoffData) {
    console.log(`    ${c.cutoffData}`);
  }
}

console.log("\n=== 원본 JSON ===");
console.log(result);
