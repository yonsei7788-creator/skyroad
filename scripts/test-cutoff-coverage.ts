/**
 * 커트라인 데이터 커버리지 검증 스크립트.
 * 각 학과 키워드 × 등급(1.0~9.0, 0.5단위) 조합에 대해
 * ±0.3 고정 마진으로 후보 대학이 3개 이상인지 검증한다.
 *
 * Usage: npx tsx scripts/test-cutoff-coverage.ts [gradeMin] [gradeMax]
 *   예: npx tsx scripts/test-cutoff-coverage.ts 1.0 3.0
 */

import { ADMISSION_CUTOFF_DATA } from "../libs/report/constants/admission-cutoff-data.ts";

const MARGIN = 0.3;
const MIN_CANDIDATES = 3;

// ── 정규화 (preprocessor.ts와 동일) ──
const normalizeDeptCore = (name: string): string =>
  name
    .replace(/\(.*\).*$/, "")
    .replace(/\[.*\].*$/, "")
    .split(" ")[0]
    .replace(/(?:전공|과|부)$/, "")
    .trim();

// ── CLI 파라미터 ──
const gradeMin = parseFloat(process.argv[2] || "1.0");
const gradeMax = parseFloat(process.argv[3] || "9.0");

// ── 모든 고유 학과 코어 추출 ──
const deptCoreMap = new Map<string, Set<string>>(); // core → Set<university>
for (const e of ADMISSION_CUTOFF_DATA) {
  const core = normalizeDeptCore(e.department);
  if (!deptCoreMap.has(core)) deptCoreMap.set(core, new Set());
  deptCoreMap.get(core)!.add(e.university);
}

// 데이터가 1개 대학밖에 없는 초소규모 학과는 제외 (의미 없음)
const deptCores = [...deptCoreMap.entries()]
  .filter(([, unis]) => unis.size >= 3) // 최소 3개 대학에 존재하는 학과만
  .map(([core]) => core)
  .sort();

// ── 등급 목록 생성 ──
const grades: number[] = [];
for (let g = gradeMin; g <= gradeMax + 0.01; g += 0.5) {
  grades.push(Math.round(g * 10) / 10);
}

// ── 검증 실행 ──
interface FailCase {
  deptCore: string;
  grade: number;
  found: number;
  universities: string[];
}

const failures: FailCase[] = [];
let totalTests = 0;

for (const core of deptCores) {
  for (const grade of grades) {
    totalTests++;
    const lo = grade - MARGIN;
    const hi = grade + MARGIN;

    // cutoff50Grade 기준으로 ±0.3 내 대학 추출 (대학 단위 중복 제거)
    const matchedUnis = new Set<string>();
    for (const e of ADMISSION_CUTOFF_DATA) {
      const eDeptCore = normalizeDeptCore(e.department);
      if (eDeptCore !== core) continue;
      if (e.cutoff50Grade == null) continue;
      if (e.cutoff50Grade >= lo && e.cutoff50Grade <= hi) {
        matchedUnis.add(e.university);
      }
    }

    if (matchedUnis.size < MIN_CANDIDATES) {
      failures.push({
        deptCore: core,
        grade,
        found: matchedUnis.size,
        universities: [...matchedUnis],
      });
    }
  }
}

// ── 결과 출력 ──
console.log(`\n${"=".repeat(60)}`);
console.log(
  `커트라인 커버리지 검증 (±${MARGIN} 고정, 등급 ${gradeMin}~${gradeMax})`
);
console.log(`${"=".repeat(60)}`);
console.log(`학과 키워드 수: ${deptCores.length}`);
console.log(`등급 구간: ${grades.join(", ")}`);
console.log(`총 테스트: ${totalTests}`);
console.log(`실패: ${failures.length}`);
console.log(
  `성공률: ${(((totalTests - failures.length) / totalTests) * 100).toFixed(1)}%\n`
);

if (failures.length > 0) {
  // 등급별 실패 요약
  const failByGrade = new Map<number, number>();
  for (const f of failures) {
    failByGrade.set(f.grade, (failByGrade.get(f.grade) || 0) + 1);
  }
  console.log("── 등급별 실패 수 ──");
  for (const [g, count] of [...failByGrade.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    console.log(`  등급 ${g.toFixed(1)}: ${count}개 학과 실패`);
  }

  // 학과별 실패 요약 (가장 많이 실패한 학과 Top 20)
  const failByDept = new Map<string, number>();
  for (const f of failures) {
    failByDept.set(f.deptCore, (failByDept.get(f.deptCore) || 0) + 1);
  }
  const topFails = [...failByDept.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  console.log("\n── 실패 빈도 Top 20 학과 ──");
  for (const [dept, count] of topFails) {
    const totalGrades = grades.length;
    console.log(`  ${dept}: ${count}/${totalGrades} 등급에서 실패`);
  }

  // 상세 실패 목록 (found=0인 케이스)
  const zeroMatches = failures.filter((f) => f.found === 0);
  if (zeroMatches.length > 0) {
    console.log(`\n── 후보 0개 (가장 심각) — ${zeroMatches.length}건 ──`);
    for (const f of zeroMatches.slice(0, 30)) {
      console.log(`  ${f.deptCore} @ 등급${f.grade.toFixed(1)}: 0개`);
    }
    if (zeroMatches.length > 30) {
      console.log(`  ... 외 ${zeroMatches.length - 30}건`);
    }
  }

  // found=1~2인 케이스 샘플
  const lowMatches = failures.filter(
    (f) => f.found > 0 && f.found < MIN_CANDIDATES
  );
  if (lowMatches.length > 0) {
    console.log(`\n── 후보 1~2개 — ${lowMatches.length}건 (샘플 30건) ──`);
    for (const f of lowMatches.slice(0, 30)) {
      console.log(
        `  ${f.deptCore} @ 등급${f.grade.toFixed(1)}: ${f.found}개 [${f.universities.join(", ")}]`
      );
    }
  }
}

console.log(`\n${"=".repeat(60)}\n`);
