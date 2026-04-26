/**
 * 고교유형별 등급 환산 검증 (실제 preprocessor.ts 함수 직접 호출)
 *
 * 검증 흐름: wave-executor → buildUniversityCandidatesText → computeGrade9ForCutoff →
 *   fiveToNineGrade(5등급일 때) → convertGradeBySchoolType(특목/특성화일 때)
 * 본 스크립트는 위 두 함수를 그대로 import해 호출합니다.
 *
 * 실행: npx tsx scripts/test-grade-conversion.ts
 */

import {
  convertGradeBySchoolType,
  fiveToNineGrade,
} from "../libs/report/pipeline/preprocessor";

// 학교 유형별로 9등급 입력 → 일반고 환산 9등급
const toGeneral = (schoolType: string, nineGrade: number): number =>
  convertGradeBySchoolType(schoolType, nineGrade);

// 일반고 9등급 → 해당 학교 유형의 9등급 (역변환).
// 학교유형의 정의역(테이블 첫 brackpoint)에서 스캔 시작 → clamp 영역 회피.
const SEARCH_RANGES: Record<string, [number, number]> = {
  특목고: [1.4, 8.9],
  특성화고: [1.0, 8.0],
};
const inverseFromGeneral = (
  schoolType: string,
  targetGen: number
): number | null => {
  const range = SEARCH_RANGES[schoolType];
  if (!range) return null;
  const [lo, hi] = range;
  let best: { input: number; diff: number } | null = null;
  for (let i = Math.round(lo * 100); i <= Math.round(hi * 100); i++) {
    const input = i / 100;
    const out = toGeneral(schoolType, input);
    const diff = Math.abs(out - targetGen);
    if (!best || diff < best.diff) best = { input, diff };
  }
  if (!best || best.diff > 0.005) return null;
  return Math.round(best.input * 100) / 100;
};

// docx 정답
const DOCX_ROWS: {
  gen: [number, number];
  sp: [number, number];
  vc: [number, number];
}[] = [
  { gen: [1.0, 1.1], sp: [1.4, 1.7], vc: [1.0, 1.0] },
  { gen: [1.2, 1.3], sp: [1.8, 2.1], vc: [1.0, 1.0] },
  { gen: [1.4, 1.5], sp: [2.2, 2.5], vc: [1.0, 1.0] },
  { gen: [1.6, 1.7], sp: [2.6, 2.9], vc: [1.0, 1.0] },
  { gen: [1.8, 1.9], sp: [3.0, 3.2], vc: [1.0, 1.0] },
  { gen: [2.0, 2.1], sp: [3.3, 3.5], vc: [1.0, 1.1] },
  { gen: [2.2, 2.3], sp: [3.6, 3.8], vc: [1.2, 1.3] },
  { gen: [2.4, 2.5], sp: [3.9, 4.2], vc: [1.4, 1.5] },
  { gen: [2.6, 2.7], sp: [4.3, 4.5], vc: [1.6, 1.7] },
  { gen: [2.8, 2.9], sp: [4.6, 4.8], vc: [1.8, 1.9] },
  { gen: [3.0, 3.1], sp: [4.9, 5.0], vc: [2.0, 2.1] },
  { gen: [3.2, 3.3], sp: [5.1, 5.2], vc: [2.2, 2.3] },
  { gen: [3.4, 3.5], sp: [5.3, 5.4], vc: [2.4, 2.5] },
  { gen: [3.6, 3.7], sp: [5.5, 5.6], vc: [2.6, 2.7] },
  { gen: [3.8, 3.9], sp: [5.7, 5.8], vc: [2.8, 2.9] },
  { gen: [4.0, 4.1], sp: [5.9, 6.0], vc: [3.0, 3.1] },
  { gen: [4.2, 4.3], sp: [6.1, 6.2], vc: [3.2, 3.3] },
  { gen: [4.4, 4.5], sp: [6.3, 6.4], vc: [3.4, 3.5] },
  { gen: [4.6, 4.7], sp: [6.5, 6.6], vc: [3.6, 3.7] },
  { gen: [4.8, 4.9], sp: [6.7, 6.8], vc: [3.8, 3.9] },
  { gen: [5.0, 5.1], sp: [6.9, 7.0], vc: [4.0, 4.1] },
  { gen: [5.2, 5.3], sp: [7.1, 7.2], vc: [4.2, 4.3] },
  { gen: [5.4, 5.5], sp: [7.3, 7.4], vc: [4.4, 4.5] },
  { gen: [5.6, 5.7], sp: [7.5, 7.6], vc: [4.6, 4.7] },
  { gen: [5.8, 5.9], sp: [7.7, 7.8], vc: [4.8, 4.9] },
  { gen: [6.0, 6.1], sp: [7.9, 8.0], vc: [5.0, 5.1] },
  { gen: [6.2, 6.3], sp: [8.1, 8.2], vc: [5.2, 5.3] },
  { gen: [6.4, 6.5], sp: [8.3, 8.4], vc: [5.4, 5.5] },
  { gen: [6.6, 6.7], sp: [8.5, 8.6], vc: [5.6, 5.7] },
  { gen: [6.8, 6.9], sp: [8.7, 8.8], vc: [5.8, 5.9] },
];

const fmt = (v: number): string => v.toFixed(2);
const fmtRange = (
  lo: number | null,
  hi: number | null,
  clampValue: number
): string => {
  const loVal = lo ?? clampValue;
  const hiVal = hi ?? clampValue;
  if (Math.abs(loVal - hiVal) < 1e-9) return fmt(loVal);
  return `${fmt(loVal)}~${fmt(hiVal)}`;
};
const inRange = (v: number, [lo, hi]: [number, number]) =>
  v >= lo - 1e-9 && v <= hi + 1e-9;

// 검증 + 표 데이터
let pass = 0;
let fail = 0;
const failures: string[] = [];
const tableRows: string[] = [];

for (const row of DOCX_ROWS) {
  // 특목·자사 9등급 (역변환)
  const spLo = inverseFromGeneral("특목고", row.gen[0]);
  const spHi = inverseFromGeneral("특목고", row.gen[1]);
  // 특성화 9등급 (역변환)
  const vcLo = inverseFromGeneral("특성화고", row.gen[0]);
  const vcHi = inverseFromGeneral("특성화고", row.gen[1]);

  const checkSp =
    spLo !== null &&
    spHi !== null &&
    inRange(spLo, row.sp) &&
    inRange(spHi, row.sp);
  const vcLoEff = vcLo ?? 1.0;
  const vcHiEff = vcHi ?? 1.0;
  const checkVc = inRange(vcLoEff, row.vc) && inRange(vcHiEff, row.vc);

  if (checkSp && checkVc) pass++;
  else {
    fail++;
    failures.push(
      `일반고 ${row.gen[0]}~${row.gen[1]}: ` +
        `특목 ${fmtRange(spLo, spHi, 1.0)} (docx ${row.sp[0]}~${row.sp[1]}) ${checkSp ? "✓" : "✗"}, ` +
        `특성화 ${fmtRange(vcLo, vcHi, 1.0)} (docx ${row.vc[0]}~${row.vc[1]}) ${checkVc ? "✓" : "✗"}`
    );
  }

  tableRows.push(
    `${row.gen[0].toFixed(1)}~${row.gen[1].toFixed(1)} | ${fmtRange(spLo, spHi, 1.0)} | ${fmtRange(vcLo, vcHi, 1.0)}`
  );
}

// 5등급 → 9등급 직접 호출 sanity check
const sample5to9: [number, number][] = [
  [1.0, 1.0],
  [1.5, 2.31],
  [2.0, 3.21],
  [3.0, 4.95],
  [5.0, 9.0],
];
console.log("[fiveToNineGrade 직접 호출 sanity check]");
for (const [input, expected] of sample5to9) {
  const got = fiveToNineGrade(input);
  const ok = Math.abs(got - expected) < 0.01;
  console.log(
    `  5등급 ${input.toFixed(1)} → 9등급 ${got.toFixed(2)} (expect ${expected}) ${ok ? "✓" : "✗"}`
  );
}

console.log(
  `\n[docx 적합성 검증 (convertGradeBySchoolType 역변환)] PASS=${pass}, FAIL=${fail}`
);
if (failures.length) console.log(`실패:\n${failures.join("\n")}`);

// 3컬럼 사이드-바이-사이드
console.log("\n=== 코드 환산 결과 (docx 포맷, 3컬럼) ===");
const chunk = Math.ceil(tableRows.length / 3);
const c1 = tableRows.slice(0, chunk);
const c2 = tableRows.slice(chunk, chunk * 2);
const c3 = tableRows.slice(chunk * 2);
console.log(
  "| 일반고 | 특목·자사 | 특성화 |   | 일반고 | 특목·자사 | 특성화 |   | 일반고 | 특목·자사 | 특성화 |"
);
console.log(
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
);
const max = Math.max(c1.length, c2.length, c3.length);
const empty = " | | ";
for (let i = 0; i < max; i++) {
  console.log(
    `| ${c1[i] ?? empty} | | ${c2[i] ?? empty} | | ${c3[i] ?? empty} |`
  );
}
