/**
 * "입학사정관"으로 시작하는 문장 형광펜 처리 검증
 *
 * insight-marker.tsx의 highlightInspectorSentences 로직을 그대로 재현해
 * 문장 경계 매칭과 split 결과를 검증한다.
 * 특히 CompetitiveProfilingRenderer가 렌더링하는 competitorCoreDifference 템플릿
 * 3종(있음/보통/없음)이 모두 정확히 매칭되는지 확인.
 *
 * 실행: npx tsx scripts/verify-inspector-highlight.ts
 */

const INSIGHT_PATTERN = /\[\[insight\]\]([\s\S]*?)\[\[\/insight\]\]/g;
const INSPECTOR_SENTENCE_PATTERN = /(^|[.!?…]\s+)(입학사정관[^.!?…]*[.!?…]?)/g;

type Segment = { type: "text" | "mark"; value: string };

const renderSegments = (input: string): Segment[] => {
  const stripped = input.includes("[[insight]]")
    ? input.replace(INSIGHT_PATTERN, "$1")
    : input;
  if (!stripped.includes("입학사정관"))
    return [{ type: "text", value: stripped }];

  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of stripped.matchAll(INSPECTOR_SENTENCE_PATTERN)) {
    const matchStart = match.index ?? 0;
    const [, prefix, sentence] = match;
    const sentenceStart = matchStart + (prefix?.length ?? 0);
    if (sentenceStart > lastIndex) {
      segments.push({
        type: "text",
        value: stripped.slice(lastIndex, sentenceStart),
      });
    }
    segments.push({ type: "mark", value: sentence });
    lastIndex = sentenceStart + sentence.length;
  }
  if (segments.length === 0) return [{ type: "text", value: stripped }];
  if (lastIndex < stripped.length) {
    segments.push({ type: "text", value: stripped.slice(lastIndex) });
  }
  return segments;
};

type Case = { label: string; input: string; expected: Segment[] };

// 사용자가 지목한 정확한 문장 (competitive-profiling-templates.ts:169-171)
const CC_있음 =
  "입학사정관 입장에서 활동의 방향성과 연결성이 확인되며, 핵심 메시지를 한 단계 더 선명하게 정리하면 최종 선발에서 강력한 경쟁력을 갖출 수 있습니다.";
const CC_보통 =
  "입학사정관 입장에서 개별 활동은 긍정적이지만, 생기부를 다 읽고 나서 '이 학생은 어떤 학생인가'라는 한 문장이 바로 떠오르도록 정리하면 경쟁력이 크게 올라갑니다.";
const CC_없음 =
  "입학사정관 입장에서 활동들이 흩어져 있어 이 학생이 어떤 방향으로 준비해온 학생인지 파악하기 어렵고, 따라서 선발의 근거를 찾기 힘든 상태입니다.";

const CASES: Case[] = [
  {
    label: "사용자 지목 문장: competitorCoreDifference['있음']",
    input: CC_있음,
    expected: [{ type: "mark", value: CC_있음 }],
  },
  {
    label: "competitorCoreDifference['보통']",
    input: CC_보통,
    expected: [{ type: "mark", value: CC_보통 }],
  },
  {
    label: "competitorCoreDifference['없음']",
    input: CC_없음,
    expected: [{ type: "mark", value: CC_없음 }],
  },
  {
    label: "문장 중간에 입학사정관",
    input: "기록이 있습니다. 입학사정관은 ~로 평가할 겁니다.",
    expected: [
      { type: "text", value: "기록이 있습니다. " },
      { type: "mark", value: "입학사정관은 ~로 평가할 겁니다." },
    ],
  },
  {
    label: "여러 번 등장 - N개 형광펜",
    input:
      "1학년 기록입니다. 입학사정관은 일관성을 평가할 겁니다. 2학년도 있습니다. 입학사정관은 깊이를 봅니다.",
    expected: [
      { type: "text", value: "1학년 기록입니다. " },
      { type: "mark", value: "입학사정관은 일관성을 평가할 겁니다." },
      { type: "text", value: " 2학년도 있습니다. " },
      { type: "mark", value: "입학사정관은 깊이를 봅니다." },
    ],
  },
  {
    label: "입학사정관 없음 - 형광펜 없음",
    input: "단순한 활동 서술입니다.",
    expected: [{ type: "text", value: "단순한 활동 서술입니다." }],
  },
  {
    label: "단어 일부 매칭 안 됨 (다른 위치)",
    input: "그것은 입학사정관과 무관합니다.",
    expected: [{ type: "text", value: "그것은 입학사정관과 무관합니다." }],
  },
  {
    label: "[[insight]] 마커 제거 + 형광펜",
    input:
      "기록입니다. [[insight]]입학사정관은 평가할 겁니다.[[/insight]] 추가 설명.",
    expected: [
      { type: "text", value: "기록입니다. " },
      { type: "mark", value: "입학사정관은 평가할 겁니다." },
      { type: "text", value: " 추가 설명." },
    ],
  },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

const equal = (a: Segment[], b: Segment[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((s, i) => s.type === b[i].type && s.value === b[i].value);
};

for (const c of CASES) {
  const actual = renderSegments(c.input);
  if (equal(actual, c.expected)) {
    pass++;
    console.log(`  PASS  ${c.label}`);
  } else {
    fail++;
    failures.push(
      `${c.label}\n    input:    ${c.input}\n    expected: ${JSON.stringify(c.expected)}\n    actual:   ${JSON.stringify(actual)}`
    );
    console.log(`  FAIL  ${c.label}`);
    console.log(`        expected: ${JSON.stringify(c.expected)}`);
    console.log(`        actual:   ${JSON.stringify(actual)}`);
  }
}

console.log("\n========================================");
console.log(`총 ${pass + fail}개 케이스 → PASS=${pass}, FAIL=${fail}`);
if (fail > 0) {
  console.log("\n실패 상세:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("✅ 모든 검증 통과");
