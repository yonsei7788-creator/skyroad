/**
 * 탈일반고 명문 학교 환산 검증
 *
 * - 일반고 학생 등급이 동일할 때, 명문 일반고면 자율고와 동일하게 환산되는지
 * - 명문 리스트에 없는 일반고는 그대로(=null 환산) 유지되는지
 * - 일반고가 아닌 학교는 schoolName 인자 무관하게 기존 동작 유지인지
 *
 * 실행: npx tsx scripts/verify-elite-general-schools.ts
 */

import { convertGradeBySchoolType } from "../libs/report/pipeline/preprocessor";

const ELITE_SCHOOLS = [
  "세화고등학교",
  "세화여자고등학교",
  "휘문고등학교",
  "중동고등학교",
  "현대고등학교",
  "숙명여자고등학교",
  "진선여자고등학교",
  "은광여자고등학교",
  "양정고등학교",
  "한가람고등학교",
  "대일고등학교",
  "보인고등학교",
  "배재고등학교",
  "숭문고등학교",
  "서울고등학교",
  "이화여자고등학교",
  "낙생고등학교",
  "분당중앙고등학교",
  "서현고등학교",
  "공주한일고등학교",
  "청원고등학교",
  "대전고등학교",
  "경북고등학교",
  "부산고등학교",
  "한일고등학교",
  "민사고등학교",
  "북일고등학교",
];

const NON_ELITE = ["수원고등학교", "광주제일고등학교", "(공백 없음)"];

const round = (n: number) => Math.round(n * 100) / 100;

const SAMPLE_GRADES = [1.5, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];

let pass = 0;
let fail = 0;
const failures: string[] = [];

const assertEq = (label: string, actual: number, expected: number) => {
  const a = round(actual);
  const e = round(expected);
  if (a === e) {
    pass++;
  } else {
    fail++;
    failures.push(`${label} — expected ${e}, got ${a}`);
  }
};

console.log("=== 1. 명문 일반고: 일반고 환산 = 자율고 환산 ===\n");
console.log(`원본\t일반고(default)\t자율고\t${"휘문고(예시)\t".padEnd(16)}OK?`);
for (const g of SAMPLE_GRADES) {
  const plainGeneral = round(convertGradeBySchoolType("일반고", g));
  const asJayul = round(convertGradeBySchoolType("자율고", g));
  const asElite = round(convertGradeBySchoolType("일반고", g, "휘문고등학교"));
  const ok = asElite === asJayul && asElite !== plainGeneral;
  console.log(
    `${g}\t${plainGeneral}\t\t${asJayul}\t${asElite.toString().padEnd(15)}\t${ok ? "PASS" : "FAIL"}`
  );
  if (ok) pass++;
  else {
    fail++;
    failures.push(
      `elite ${g}: plain=${plainGeneral} jayul=${asJayul} elite=${asElite}`
    );
  }
}

console.log("\n=== 2. 24개 명문 일반고 전체: 자율고 환산과 동일한지 ===\n");
for (const name of ELITE_SCHOOLS) {
  for (const g of [2.0, 3.0]) {
    const asJayul = convertGradeBySchoolType("자율고", g);
    const asElite = convertGradeBySchoolType("일반고", g, name);
    assertEq(`${name} @ ${g}`, asElite, asJayul);
  }
}
console.log(
  `  → ${ELITE_SCHOOLS.length}개 학교 × 2개 등급 = ${ELITE_SCHOOLS.length * 2}개 케이스`
);

console.log("\n=== 3. 명문 리스트에 없는 일반고: 환산 미적용 ===\n");
for (const name of NON_ELITE) {
  for (const g of SAMPLE_GRADES) {
    const plain = convertGradeBySchoolType("일반고", g);
    const named = convertGradeBySchoolType("일반고", g, name);
    assertEq(`non-elite ${name} @ ${g}`, named, plain);
  }
}

console.log("\n=== 4. 일반고 외 학교 유형은 schoolName 인자에 영향 없음 ===\n");
for (const st of ["자율고", "특목고", "특성화고"]) {
  for (const g of [2.0, 3.0]) {
    const noName = convertGradeBySchoolType(st, g);
    const withElite = convertGradeBySchoolType(st, g, "휘문고등학교");
    const withRandom = convertGradeBySchoolType(st, g, "임의고등학교");
    assertEq(`${st} @ ${g} (vs elite name)`, withElite, noName);
    assertEq(`${st} @ ${g} (vs random name)`, withRandom, noName);
  }
}

console.log("\n=== 5. 구체 환산 값 검증 (docx 표 기반) ===\n");
// 보간 구간: 1.4→1.0, 1.7→1.1, 1.8→1.2, 2.1→1.3, ...
const SPECIFIC_CASES: { grade: number; expected: number }[] = [
  { grade: 1.4, expected: 1.0 },
  { grade: 1.7, expected: 1.1 },
  // 1.8→1.2, 2.1→1.3 사이 보간: t=(2.0-1.8)/(2.1-1.8)=0.667, y=1.2+0.667*0.1=1.267
  {
    grade: 2.0,
    expected: round(1.2 + ((2.0 - 1.8) / (2.1 - 1.8)) * (1.3 - 1.2)),
  },
  { grade: 2.5, expected: 1.5 },
  { grade: 3.0, expected: 1.8 },
  {
    grade: 4.0,
    expected: round(2.4 + ((4.0 - 3.9) / (4.2 - 3.9)) * (2.5 - 2.4)),
  },
];
for (const { grade, expected } of SPECIFIC_CASES) {
  const actual = round(
    convertGradeBySchoolType("일반고", grade, "휘문고등학교")
  );
  const ok = actual === expected;
  console.log(
    `휘문고 ${grade} → ${actual} (expected ${expected})\t${ok ? "PASS" : "FAIL"}`
  );
  if (ok) pass++;
  else {
    fail++;
    failures.push(`docx ${grade}: expected ${expected}, got ${actual}`);
  }
}

console.log("\n========================================");
console.log(`총 ${pass + fail}개 케이스 → PASS=${pass}, FAIL=${fail}`);
if (fail > 0) {
  console.log("\n실패 케이스:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("✅ 모든 검증 통과");
