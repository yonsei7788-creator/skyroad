/**
 * 활동 서술 관찰형 톤 보존 검증 (a.md #3 피드백)
 *
 * 사용자가 선호하는 "~한 것으로 보여집니다" 스타일이 postprocessor에서
 * "~한 것으로 보입니다"로 덮어쓰여지지 않는지 확인.
 *
 * 실행: npx tsx scripts/verify-observational-tone.ts
 */

import { sanitizeAiTone } from "../libs/report/pipeline/postprocessor";

type Case = { input: string; expected: string; label: string };

// 1. 보존: 관찰형 종결 "~한 것으로 보여집니다" 유지
const PRESERVE_CASES: Case[] = [
  {
    label: "사용자 예시 문장 (a.md #3)",
    input:
      "1학년 진로활동은 경영회계학부 체험 및 환경경영 리포트 탐구에 집중한 것으로 보여집니다.",
    expected:
      "1학년 진로활동은 경영회계학부 체험 및 환경경영 리포트 탐구에 집중한 것으로 보여집니다.",
  },
  {
    label: "'것으로 보여집니다' 단독",
    input: "환경 분야 활동에 집중한 것으로 보여집니다.",
    expected: "환경 분야 활동에 집중한 것으로 보여집니다.",
  },
  {
    label: "'할 것으로 보여집니다' 미래형",
    input: "지속적으로 발전할 것으로 보여집니다.",
    expected: "지속적으로 발전할 것으로 보여집니다.",
  },
  {
    label: "'보여집니다' 단독",
    input: "탐구 주도성이 보여집니다.",
    expected: "탐구 주도성이 보여집니다.",
  },
  {
    label: "'보여지고 있습니다' 진행형",
    input: "지속적인 변화가 보여지고 있습니다.",
    expected: "지속적인 변화가 보여지고 있습니다.",
  },
  {
    label: "'보여지는' 관형형",
    input: "꾸준히 보여지는 성장세입니다.",
    expected: "꾸준히 보여지는 성장세입니다.",
  },
];

// 2. 기존 정상 동작 유지 (이번 변경이 의도치 않게 깨트리지 않는지)
const REGRESSION_CASES: Case[] = [
  {
    label: "'되어지고 있습니다' → '되고 있습니다' (오류 표현 제거 유지)",
    input: "성장이 이뤄지고 있습니다.",
    expected: "성장이 이뤄지고 있습니다.",
  },
  {
    label: "'되어집니다' → '됩니다' (오류 표현 제거 유지)",
    input: "활동이 진행되어집니다.",
    expected: "활동이 진행됩니다.",
  },
  {
    label: "기여하다 동사 치환 유지 (이전 fix 회귀 없음)",
    input: "학습에 기여합니다.",
    expected: "학습에 도움이 됩니다.",
  },
  {
    label: "시사하다 동사 치환 유지 (직전 fix #2 회귀 없음)",
    input: "성장을 시사합니다.",
    expected: "성장을 보여줍니다.",
  },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

const run = (cases: Case[], section: string) => {
  console.log(`\n=== ${section} ===`);
  for (const c of cases) {
    const actual = sanitizeAiTone(c.input);
    const ok = actual === c.expected;
    if (ok) {
      pass++;
      console.log(`  PASS  ${c.label}`);
    } else {
      fail++;
      failures.push(
        `${section} > ${c.label}\n    input:    ${c.input}\n    expected: ${c.expected}\n    actual:   ${actual}`
      );
      console.log(`  FAIL  ${c.label}`);
      console.log(`        input:    ${c.input}`);
      console.log(`        expected: ${c.expected}`);
      console.log(`        actual:   ${actual}`);
    }
  }
};

run(PRESERVE_CASES, "1. '보여집니다' 관찰형 종결 보존");
run(REGRESSION_CASES, "2. 기존 치환 규칙 회귀 없음");

console.log("\n========================================");
console.log(`총 ${pass + fail}개 케이스 → PASS=${pass}, FAIL=${fail}`);
if (fail > 0) {
  console.log("\n실패 상세:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("✅ 모든 검증 통과");
