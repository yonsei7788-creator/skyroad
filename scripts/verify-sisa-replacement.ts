/**
 * "시사하다" 동사 활용형 → "보여주다" 자동 치환 검증
 *
 * 검증 흐름: postprocessor.sanitizeAiTone 직접 호출.
 *
 * 핵심:
 * - 모든 동사 활용형이 "보여주다" 활용형으로 치환되는가
 * - 명사 "시사점", "시사회", "시사적", 복합어 "도시사회학과" 등은 보존되는가
 *
 * 실행: npx tsx scripts/verify-sisa-replacement.ts
 */

import { sanitizeAiTone } from "../libs/report/pipeline/postprocessor";

type Case = { input: string; expected: string; label: string };

// 1. 치환되어야 하는 동사 활용형
const VERB_CASES: Case[] = [
  {
    label: "현재형 -합니다",
    input: "성장을 시사합니다.",
    expected: "성장을 보여줍니다.",
  },
  {
    label: "현재형 -ㄴ다",
    input: "발전 가능성을 시사한다.",
    expected: "발전 가능성을 보여준다.",
  },
  {
    label: "관형형 -하는",
    input: "성장을 시사하는 활동입니다.",
    expected: "성장을 보여주는 활동입니다.",
  },
  {
    label: "연결 -하여",
    input: "이를 시사하여 분석할 만합니다.",
    expected: "이를 보여주어 분석할 만합니다.",
  },
  {
    label: "연결 -하고",
    input: "성과를 시사하고 있습니다.",
    expected: "성과를 보여주고 있습니다.",
  },
  {
    label: "연결 -하며",
    input: "변화를 시사하며 발전합니다.",
    expected: "변화를 보여주며 발전합니다.",
  },
  {
    label: "조건 -하면",
    input: "데이터가 한계를 시사하면 보완해야 합니다.",
    expected: "데이터가 한계를 보여주면 보완해야 합니다.",
  },
  {
    label: "양보 -하지만",
    input: "필요성을 시사하지만 부족합니다.",
    expected: "필요성을 보여주지만 부족합니다.",
  },
  {
    label: "부정 -하지",
    input: "필요성을 시사하지 못합니다.",
    expected: "필요성을 보여주지 못합니다.",
  },
  {
    label: "명사화 -하기",
    input: "한계를 시사하기 어렵습니다.",
    expected: "한계를 보여주기 어렵습니다.",
  },
  {
    label: "미래 -할",
    input: "필요성을 시사할 수 있습니다.",
    expected: "필요성을 보여줄 수 있습니다.",
  },
  {
    label: "인용 -한다고",
    input: "성장을 시사한다고 합니다.",
    expected: "성장을 보여준다고 합니다.",
  },
  {
    label: "인용 -한다는",
    input: "성장을 시사한다는 점이 있습니다.",
    expected: "성장을 보여준다는 점이 있습니다.",
  },
  {
    label: "과거형 -했습니다",
    input: "이전 활동이 성장을 시사했습니다.",
    expected: "이전 활동이 성장을 보여줬습니다.",
  },
  {
    label: "과거형 -했다",
    input: "성장을 시사했다.",
    expected: "성장을 보여줬다.",
  },
  {
    label: "과거형 -했고",
    input: "성장을 시사했고 발전했습니다.",
    expected: "성장을 보여줬고 발전했습니다.",
  },
  {
    label: "과거형 -했던",
    input: "성장을 시사했던 활동입니다.",
    expected: "성장을 보여줬던 활동입니다.",
  },
  {
    label: "명사화 -함",
    input: "성장을 시사함이 보입니다.",
    expected: "성장을 보여줌이 보입니다.",
  },
  {
    label: "명사화 -함을",
    input: "성장을 시사함을 알 수 있습니다.",
    expected: "성장을 보여줌을 알 수 있습니다.",
  },
  {
    label: "명사화 -함이",
    input: "성장을 시사함이 분명합니다.",
    expected: "성장을 보여줌이 분명합니다.",
  },
  {
    label: "명사화 -함에",
    input: "성장을 시사함에 그치지 않습니다.",
    expected: "성장을 보여줌에 그치지 않습니다.",
  },
  {
    label: "명사화 -함에도",
    input: "성장을 시사함에도 부족합니다.",
    expected: "성장을 보여줌에도 부족합니다.",
  },
  {
    label: "연결 -해서",
    input: "성장을 시사해서 의미가 있습니다.",
    expected: "성장을 보여줘서 의미가 있습니다.",
  },
];

// 2. 보존되어야 하는 케이스 (명사형/복합어/관계없는 단어)
const PRESERVE_CASES: Case[] = [
  {
    label: "명사 '시사점'",
    input: "활동의 시사점을 정리합니다.",
    expected: "활동의 시사점을 정리합니다.",
  },
  {
    label: "명사 '시사점이'",
    input: "이 활동의 시사점이 큽니다.",
    expected: "이 활동의 시사점이 큽니다.",
  },
  {
    label: "복합어 '도시사회학과'",
    input: "도시사회학과 진학을 희망합니다.",
    expected: "도시사회학과 진학을 희망합니다.",
  },
  {
    label: "복합어 '도시사회학'",
    input: "도시사회학 분야에 관심이 있습니다.",
    expected: "도시사회학 분야에 관심이 있습니다.",
  },
  {
    label: "복합어 '시사회'",
    input: "시사회 참석 경험이 있습니다.",
    expected: "시사회 참석 경험이 있습니다.",
  },
  {
    label: "단독 '시사'",
    input: "시사 토론 동아리에서 활동했습니다.",
    expected: "시사 토론 동아리에서 활동했습니다.",
  },
  {
    label: "복합어 '시사적'",
    input: "시사적 안목을 키웠습니다.",
    expected: "시사적 안목을 키웠습니다.",
  },
  {
    label: "관용표현 '결론/시사점'",
    input: "구조는 활동동기, 주제선정, 결론/시사점으로 구성됩니다.",
    expected: "구조는 활동동기, 주제선정, 결론/시사점으로 구성됩니다.",
  },
];

// 3. 혼합 케이스 (한 문장에 동사형 + 명사형)
const MIXED_CASES: Case[] = [
  {
    label: "동사+명사 혼합",
    input: "활동은 성장을 시사합니다. 시사점이 큽니다.",
    expected: "활동은 성장을 보여줍니다. 시사점이 큽니다.",
  },
  {
    label: "복합어+동사",
    input: "도시사회학과 진학 의지가 강함을 시사하는 활동입니다.",
    expected: "도시사회학과 진학 의지가 강함을 보여주는 활동입니다.",
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

run(VERB_CASES, "1. 동사 활용형 치환");
run(PRESERVE_CASES, "2. 명사/복합어 보존");
run(MIXED_CASES, "3. 혼합 케이스");

console.log("\n========================================");
console.log(`총 ${pass + fail}개 케이스 → PASS=${pass}, FAIL=${fail}`);
if (fail > 0) {
  console.log("\n실패 상세:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("✅ 모든 검증 통과");
