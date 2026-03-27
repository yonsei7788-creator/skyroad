/**
 * 커트라인 데이터 커버리지 검증 (실제 시나리오: 3~5개 학과 키워드 그룹).
 * AI가 detectedDepartments로 출력하는 것처럼 관련 학과 3개씩 묶어서 테스트.
 * ±0.3 고정 마진, 등급 1.0~9.0 (0.5 단위).
 *
 * Usage: npx tsx scripts/test-cutoff-coverage-grouped.ts [gradeMin] [gradeMax]
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

// ── 실제 AI 출력 시나리오를 반영한 학과 그룹 ──
// competency-extraction.ts 프롬프트 예시 + 주요 계열별 확장
const DEPARTMENT_GROUPS: { name: string; keywords: string[] }[] = [
  // 공학 계열
  {
    name: "전기전자",
    keywords: ["전기전자공학과", "전자공학과", "반도체공학과"],
  },
  {
    name: "컴퓨터",
    keywords: ["컴퓨터공학과", "소프트웨어학과", "인공지능학과"],
  },
  { name: "기계공학", keywords: ["기계공학과", "로봇공학과", "자동차공학과"] },
  { name: "화학공학", keywords: ["화학과", "화학공학과", "응용화학과"] },
  { name: "건축", keywords: ["건축학과", "건축공학과", "건설환경공학과"] },
  { name: "토목", keywords: ["토목공학과", "건설시스템공학과", "도시공학과"] },
  {
    name: "산업공학",
    keywords: ["산업공학과", "산업경영공학과", "시스템경영공학과"],
  },
  {
    name: "신소재",
    keywords: ["신소재공학과", "재료공학과", "나노신소재공학과"],
  },
  {
    name: "환경공학",
    keywords: ["환경공학과", "지구환경과학과", "환경과학과"],
  },
  { name: "생명공학", keywords: ["생명공학과", "생명과학과", "바이오공학과"] },
  { name: "식품공학", keywords: ["식품공학과", "식품영양학과", "식품과학과"] },
  {
    name: "정보통신",
    keywords: ["정보통신공학과", "통신공학과", "전자통신공학과"],
  },

  // 자연과학 계열
  { name: "수학", keywords: ["수학과", "통계학과", "수리과학과"] },
  { name: "물리학", keywords: ["물리학과", "천문학과", "물리천문학과"] },
  { name: "생물학", keywords: ["생물학과", "생명과학과", "미생물학과"] },

  // 사회과학 계열
  { name: "경영", keywords: ["경영학과", "경제학과", "국제통상학과"] },
  { name: "행정", keywords: ["행정학과", "정치외교학과", "공공인재학과"] },
  { name: "사회학", keywords: ["사회학과", "사회복지학과", "심리학과"] },
  { name: "법학", keywords: ["법학과", "정치외교학과", "행정학과"] },
  { name: "심리", keywords: ["심리학과", "상담심리학과", "교육심리학과"] },
  { name: "경찰", keywords: ["경찰행정학과", "경찰학과", "법학과"] },
  { name: "미디어", keywords: ["미디어학과", "신문방송학과", "광고홍보학과"] },
  { name: "관광경영", keywords: ["관광경영학과", "호텔경영학과", "관광학과"] },

  // 인문 계열
  {
    name: "국어국문",
    keywords: ["국어국문학과", "국어교육과", "문예창작학과"],
  },
  { name: "영어영문", keywords: ["영어영문학과", "영어교육과", "국제학과"] },
  { name: "역사", keywords: ["사학과", "역사학과", "국사학과"] },
  { name: "철학", keywords: ["철학과", "윤리학과", "윤리교육과"] },
  { name: "중국어", keywords: ["중어중문학과", "중국학과", "일본학과"] },

  // 교육 계열
  { name: "교육학", keywords: ["교육학과", "교육공학과", "유아교육학과"] },
  { name: "수학교육", keywords: ["수학교육과", "수학과", "통계학과"] },
  { name: "과학교육", keywords: ["과학교육과", "물리교육과", "화학교육과"] },
  { name: "사회교육", keywords: ["사회교육과", "지리교육과", "역사교육과"] },
  { name: "체육교육", keywords: ["체육교육과", "스포츠과학과", "체육학과"] },

  // 의약 계열
  { name: "간호", keywords: ["간호학과", "보건학과", "물리치료학과"] },
  { name: "약학", keywords: ["약학과", "생명약학과", "화학과"] },
  { name: "치의학", keywords: ["치의학과", "치위생학과", "보건학과"] },
  { name: "한의학", keywords: ["한의학과", "한약학과", "간호학과"] },

  // 예술 계열
  {
    name: "디자인",
    keywords: ["시각디자인학과", "산업디자인학과", "디자인학과"],
  },
  { name: "음악", keywords: ["음악학과", "실용음악학과", "작곡과"] },
  { name: "미술", keywords: ["미술학과", "회화과", "조소과"] },
  {
    name: "영상",
    keywords: ["영화영상학과", "영상학과", "만화애니메이션학과"],
  },

  // 농업/수산
  { name: "농업", keywords: ["농업경제학과", "원예학과", "식물자원학과"] },
  { name: "수산", keywords: ["수산학과", "해양학과", "해양과학과"] },

  // 기타 특수
  { name: "무역통상", keywords: ["무역학과", "국제통상학과", "경제학과"] },
  { name: "경영정보", keywords: ["경영정보학과", "경영학과", "정보통신학과"] },
  { name: "도시계획", keywords: ["도시공학과", "건축학과", "조경학과"] },
];

// ── CLI 파라미터 ──
const gradeMin = parseFloat(process.argv[2] || "1.0");
const gradeMax = parseFloat(process.argv[3] || "9.0");

// ── 등급 목록 생성 ──
const grades: number[] = [];
for (let g = gradeMin; g <= gradeMax + 0.01; g += 0.5) {
  grades.push(Math.round(g * 10) / 10);
}

// ── 검증 실행 ──
interface FailCase {
  groupName: string;
  keywords: string[];
  grade: number;
  found: number;
  universities: string[];
}

const failures: FailCase[] = [];
let totalTests = 0;

for (const group of DEPARTMENT_GROUPS) {
  const targetCores = group.keywords.map(normalizeDeptCore);

  for (const grade of grades) {
    totalTests++;
    const lo = grade - MARGIN;
    const hi = grade + MARGIN;

    // 여러 키워드로 매칭 — 실제 파이프라인과 동일하게 대학 단위 중복 제거
    const matchedUnis = new Map<string, string>(); // uni → department (첫 매칭)
    for (const e of ADMISSION_CUTOFF_DATA) {
      const eDeptCore = normalizeDeptCore(e.department);
      const matched = targetCores.some((core) => eDeptCore === core);
      if (!matched) continue;
      if (e.cutoff50Grade == null) continue;
      if (e.cutoff50Grade >= lo && e.cutoff50Grade <= hi) {
        if (!matchedUnis.has(e.university)) {
          matchedUnis.set(e.university, e.department);
        }
      }
    }

    if (matchedUnis.size < MIN_CANDIDATES) {
      failures.push({
        groupName: group.name,
        keywords: group.keywords,
        grade,
        found: matchedUnis.size,
        universities: [...matchedUnis.entries()].map(
          ([uni, dept]) => `${uni}(${dept})`
        ),
      });
    }
  }
}

// ── 결과 출력 ──
console.log(`\n${"=".repeat(70)}`);
console.log(
  `커트라인 커버리지 검증 — 그룹 키워드 (±${MARGIN} 고정, 등급 ${gradeMin}~${gradeMax})`
);
console.log(`${"=".repeat(70)}`);
console.log(`학과 그룹 수: ${DEPARTMENT_GROUPS.length}`);
console.log(`등급 구간: ${grades.join(", ")}`);
console.log(`총 테스트: ${totalTests}`);
console.log(`실패 (후보 <3): ${failures.length}`);
console.log(
  `성공률: ${(((totalTests - failures.length) / totalTests) * 100).toFixed(1)}%\n`
);

if (failures.length > 0) {
  // 등급별 실패 요약
  const failByGrade = new Map<number, number>();
  for (const f of failures) {
    failByGrade.set(f.grade, (failByGrade.get(f.grade) || 0) + 1);
  }
  console.log(`── 등급별 실패 수 (${DEPARTMENT_GROUPS.length}개 그룹 중) ──`);
  for (const [g, count] of [...failByGrade.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const bar = "█".repeat(Math.round((count / DEPARTMENT_GROUPS.length) * 30));
    console.log(
      `  등급 ${g.toFixed(1)}: ${String(count).padStart(2)}/${DEPARTMENT_GROUPS.length} 실패  ${bar}`
    );
  }

  // 그룹별 실패 요약
  const failByGroup = new Map<string, number>();
  for (const f of failures) {
    failByGroup.set(f.groupName, (failByGroup.get(f.groupName) || 0) + 1);
  }
  console.log(`\n── 그룹별 실패 등급 수 ──`);
  const sortedGroups = [...failByGroup.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedGroups) {
    const group = DEPARTMENT_GROUPS.find((g) => g.name === name)!;
    const status =
      count === grades.length ? "❌ 전구간 실패" : `${count}/${grades.length}`;
    console.log(
      `  ${name.padEnd(10)} ${status.padEnd(14)} [${group.keywords.join(", ")}]`
    );
  }

  // 후보 0개인 심각 케이스
  const zeroMatches = failures.filter((f) => f.found === 0);
  if (zeroMatches.length > 0) {
    console.log(`\n── 후보 0개 (가장 심각) — ${zeroMatches.length}건 ──`);
    for (const f of zeroMatches) {
      console.log(
        `  ${f.groupName} @ 등급${f.grade.toFixed(1)}: 0개  [${f.keywords.join(", ")}]`
      );
    }
  }

  // 후보 1~2개 케이스 (성공 직전)
  const lowMatches = failures.filter(
    (f) => f.found > 0 && f.found < MIN_CANDIDATES
  );
  if (lowMatches.length > 0) {
    console.log(`\n── 후보 1~2개 — ${lowMatches.length}건 ──`);
    for (const f of lowMatches) {
      console.log(
        `  ${f.groupName} @ 등급${f.grade.toFixed(1)}: ${f.found}개  [${f.universities.join(", ")}]`
      );
    }
  }

  // 성공 그룹 (전 등급 통과)
  const successGroups = DEPARTMENT_GROUPS.filter(
    (g) => !failByGroup.has(g.name)
  );
  if (successGroups.length > 0) {
    console.log(`\n── ✅ 전 등급 통과 그룹 ──`);
    for (const g of successGroups) {
      console.log(`  ${g.name}: [${g.keywords.join(", ")}]`);
    }
  }
}

console.log(`\n${"=".repeat(70)}\n`);
