/**
 * 서울권 대학 우선 포함 로직 테스트 (윤재혁 학생 데이터)
 * Usage: npx tsx scripts/test-seoul-priority.ts
 */

import { buildUniversityCandidatesText } from "../libs/report/pipeline/preprocessor.ts";

// 윤재혁 학생 실제 데이터
const targetDept = "경영학";
const gradingSystem = "9등급제" as const;
// 파이프라인에서 실제로 사용하는 adjustedAvg = overallAverage - 0.1
const overallAverage = 4.07;
const adjustedAvg = overallAverage - 0.1; // 3.97
const departmentKeywords = ["경영학과", "경제학과", "산업경영공학과"];
const schoolType = "일반고";
const gender = "male" as const;

const SEOUL_NAMES = new Set([
  "건국대학교",
  "동국대학교",
  "홍익대학교",
  "국민대학교",
  "숭실대학교",
  "세종대학교",
  "단국대학교",
  "명지대학교",
  "광운대학교",
  "상명대학교",
  "가톨릭대학교",
  "가천대학교",
  "경기대학교",
  "한성대학교",
  "인천대학교",
  "인하대학교",
  "아주대학교",
  "성결대학교",
  "서경대학교",
  "삼육대학교",
  "강남대학교",
]);

console.log("=== 윤재혁 학생 추천대학 후보군 테스트 ===");
console.log(
  `원래 등급: ${overallAverage} → adjustedAvg: ${adjustedAvg} (${gradingSystem})`
);
console.log(`학과 키워드: ${departmentKeywords.join(", ")}`);
console.log(`범위: ${adjustedAvg - 0.3} ~ ${adjustedAvg + 0.3}`);
console.log("");

// 1) 기존 로직 (plan 미전달 = undefined) — adjustedAvg 사용
console.log("── [1] 기존 로직 (plan 없음, adjustedAvg) ──");
const resultDefault = buildUniversityCandidatesText(
  targetDept,
  gradingSystem,
  adjustedAvg,
  undefined,
  false,
  departmentKeywords,
  schoolType,
  false,
  gender
);
const candidatesDefault = JSON.parse(resultDefault);
console.log(`후보군 수: ${candidatesDefault.length}`);
for (const c of candidatesDefault) {
  const tag = SEOUL_NAMES.has(c.university) ? " ★서울권" : "";
  console.log(
    `  [${c.tier}] ${c.university} — ${c.department} (${c.recommendedAdmissionType})${tag}`
  );
}

console.log("");

// 2) 프리미엄 로직 (plan = "premium") — adjustedAvg 사용
console.log("── [2] 프리미엄 로직 (서울권 우선, adjustedAvg) ──");
const resultPremium = buildUniversityCandidatesText(
  targetDept,
  gradingSystem,
  adjustedAvg,
  undefined,
  false,
  departmentKeywords,
  schoolType,
  false,
  gender,
  "premium"
);
const candidatesPremium = JSON.parse(resultPremium);
console.log(`후보군 수: ${candidatesPremium.length}`);
for (const c of candidatesPremium) {
  const tag = SEOUL_NAMES.has(c.university) ? " ★서울권" : "";
  console.log(
    `  [${c.tier}] ${c.university} — ${c.department} (${c.recommendedAdmissionType})${tag}`
  );
}

const seoulCountDefault = candidatesDefault.filter(
  (c: { university: string }) => SEOUL_NAMES.has(c.university)
).length;
const seoulCountPremium = candidatesPremium.filter(
  (c: { university: string }) => SEOUL_NAMES.has(c.university)
).length;
console.log("");
console.log(
  `서울권 대학 수: 기존=${seoulCountDefault} → 프리미엄=${seoulCountPremium}`
);
