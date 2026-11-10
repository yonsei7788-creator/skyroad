// ============================================================
// 정시 리포트 해설 검증·재요청·폴백
//
// 설계 원칙:
// - 9회 생성 실측에서 지시문에 맡긴 규칙(글자 수·문장 수·반복·맺음)은
//   회차마다 다른 곳에서 깨졌고, 코드가 계산·검사한 규칙은 한 번도 깨지지
//   않았다. 그래서 꼭 지켜야 하는 규칙은 리포트에 담기 전에 코드가 검사한다.
// - 위반한 칸만 위반 내용과 함께 한 번 다시 요청한다(validate → repair).
//   다시 받은 문장도 위반이면 코드가 만든 문장으로 바꾼다. 위반 문장이
//   리포트에 나가는 경로가 없다.
// - 규칙은 객관적으로 판정 가능한 것만 둔다. 문장의 질은 프롬프트 몫이다.
// - 폴백은 그 칸의 데이터로 만든 구체적인 문장이어야 한다. 일반 문구 폴백은
//   원문보다 나빴다(9개 리포트 실측).
// ============================================================

import type { PassChance } from "../types.ts";

import { JEONGSI_CHANCE_PHRASES } from "./system-prompt.ts";

export interface TextRule {
  /** 문장 수 (정확히 이 수여야 한다) */
  sentences: number;
  /** 공백 포함 글자 수 상한 */
  maxChars: number;
  /** 이 중 하나는 문장에 그대로 들어 있어야 한다 (합격 가능성 해석 문구) */
  requiredAnyOf?: readonly string[];
}

/**
 * 해설에 남으면 안 되는 표현. 대학·성적 서열, 짧은 분류 표현, 과장 표현,
 * 내부 점수 이름이다(수시 규칙과 정시 결정 사항). 톤 치환을 거친 뒤에도
 * 남아 있으면 위반이다.
 */
export const JEONGSI_BANNED_WORDS = [
  "상위권",
  "중위권",
  "하위권",
  "안전판",
  "소신",
  "카드",
  "든든",
  "안전한",
  "매우 높",
  "돋보",
  "기여",
  "강화",
  "극대화",
  "압도적",
  "바람직",
  "탁월",
  "뛰어난",
  "하세요",
  "유리도",
  "advantage",
] as const;

/**
 * 성적을 바꾸라는 조언. 정시 리포트는 수능이 끝난 뒤에 받으므로 맞지 않는다
 * (실측: "탐구 반영 비율이 높아 성적 관리가 중요합니다". 수시 리포트도 생기부
 * 확정 학생에게 성적 보완 조언이 나간 같은 문제가 있었다).
 */
const POST_EXAM_ADVICE =
  /성적\s*관리|성적을\s*관리|공부|성적\s*향상|성적을\s*(?:올리|끌어올리)|보완\s*학습/;

/** PART 3 표의 소재 이름. 문장 첫머리에 베끼면 위반이다 */
const TOPIC_LABEL_START =
  /^\s*(?:연도별 컷의 흐름|같은 구분 안 위치|모집군에서의 역할|모집 규모|강점 영역 반영|약점 영역 부담|활용지표|반영비율|영어·한국사 처리|가산점)\s*—/;

/** 소수점(94.8)은 문장 끝이 아니다. 문장부호 뒤에 공백이 올 때만 나눈다 */
export const splitSentences = (text: string): string[] =>
  text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 0);

/** 합격 가능성 해석 문구. 문장 끝 "입니다" 앞까지만 비교해 어미 변형을 허용한다 */
export const chanceMeaningsOf = (chance: PassChance): string[] =>
  JEONGSI_CHANCE_PHRASES[chance].meanings.map((meaning) =>
    meaning.replace(/입니다$/, "")
  );

/** 문장 하나의 규칙 위반. 재요청 프롬프트에 그대로 싣는 한국어 설명이다 */
export const findTextViolations = (text: string, rule: TextRule): string[] => {
  const problems: string[] = [];
  const count = splitSentences(text).length;
  if (count !== rule.sentences) {
    problems.push(`문장 ${rule.sentences}개로 씁니다`);
  }
  if (text.length > rule.maxChars) {
    problems.push(`${rule.maxChars}자 이내로 씁니다`);
  }
  const banned = JEONGSI_BANNED_WORDS.filter((word) => text.includes(word));
  if (banned.length > 0) {
    problems.push(
      "담백한 표현(도움이 됩니다, 유리하게 작용합니다, 보완합니다 등)으로 씁니다"
    );
  }
  if (POST_EXAM_ADVICE.test(text)) {
    problems.push("원서 선택과 지원 판단으로 문장을 맺습니다");
  }
  if (TOPIC_LABEL_START.test(text)) {
    problems.push("소재 이름 없이 값으로 문장을 시작합니다");
  }
  if (
    rule.requiredAnyOf &&
    !rule.requiredAnyOf.some((phrase) => text.includes(phrase))
  ) {
    problems.push(`"${rule.requiredAnyOf[0]}입니다"로 문장을 맺습니다`);
  }
  return problems;
};

/**
 * 총평이 문장을 덧붙였을 때 규칙의 문장 수로 줄인다. 앞 문장과 마지막 문장을
 * 남긴다. 총평 틀의 마지막 문장은 결론이고, 다시 쓰기 응답이 문장을 덧붙인
 * 3건 모두 마지막 문장이 결론이었다(실측). 앞에서만 자르면 결론이 잘렸다.
 */
export const keepFrameSentences = (text: string, count: number): string => {
  const sentences = splitSentences(text);
  if (sentences.length <= count) return sentences.join(" ");
  return [
    ...sentences.slice(0, count - 1),
    sentences[sentences.length - 1],
  ].join(" ");
};

const AREA_ALIASES: Record<string, string[]> = {
  탐구: ["탐구", "과탐", "사탐"],
};

/** 강점이라는 말. "강점 영역"처럼 영역 일반을 가리키는 말은 뺀다 */
const STRENGTH_WORD = /강점(?!\s*영역)/;

/**
 * 약점 영역을 강점이라고 쓴 문장. 같은 문장에 강점 영역이 함께 나오면
 * ("탐구 부담이 적어 수학 강점을 살립니다") 위반이 아니다.
 * 실측: "탐구 과목별 3% 가산점은 표준점수 66.5점의 강점을 더욱 부각"(탐구가 약점).
 */
export const findWeaknessCalledStrength = (
  text: string,
  strengthLabels: string[],
  weaknessLabels: string[]
): string[] => {
  const mentions = (sentence: string, label: string) =>
    (AREA_ALIASES[label] ?? [label]).some((alias) => sentence.includes(alias));
  return weaknessLabels.flatMap((label) =>
    splitSentences(text).some(
      (sentence) =>
        mentions(sentence, label) &&
        STRENGTH_WORD.test(sentence) &&
        !strengthLabels.some((strength) => mentions(sentence, strength))
    )
      ? [
          `${label} 영역은 이 학생의 약점 영역이므로, 약점 영역 기준으로 서술합니다`,
        ]
      : []
  );
};

// ─── 기준컷 격차 문장 (코드 작성) ───

/**
 * 기준컷 대비 격차 절. 격차의 방향·크기는 코드값이므로 문장도 코드가 쓴다.
 * 예) 4.2 → "기준컷을 4.2백분위점 넘겨" / -1.3 → "기준컷에 1.3백분위점 모자라"
 */
export const composeGapClause = (gap: number | null): string => {
  if (gap === null) {
    return "공개 기준컷이 없어 반영방식과 모집 규모로 판단한 구분으로";
  }
  const rounded = Math.round(gap * 10) / 10;
  if (rounded === 0) {
    return "기준컷과 같은 수준으로";
  }
  const magnitude = Math.abs(rounded).toFixed(1);
  return rounded > 0
    ? `기준컷을 ${magnitude}백분위점 넘겨`
    : `기준컷에 ${magnitude}백분위점 모자라`;
};

/** 격차 절 + 정해진 합격 가능성 해석 문구로 된 한 문장 */
export const composeChanceSentence = (
  gap: number | null,
  meaning: string
): string => `${composeGapClause(gap)}, ${meaning}.`;

// ─── 칸 단위 검증·재요청 ───

/** 해설 한 칸. 검증과 재요청, 폴백의 단위다 */
export interface CommentarySlot {
  /** 재요청 응답에서 이 칸을 찾는 위치 */
  target: { field: string; index?: number };
  /** 가드를 거친 1차 해설 */
  text: string;
  rule: TextRule;
  /** 재요청으로 받은 원문에 1차와 같은 가드를 적용한다 */
  finalize: (raw: string) => string;
  /** 다시 받은 문장도 위반일 때 쓰는 문장 */
  fallback: (text: string) => string;
  /** 규칙 밖의 칸별 검사 (예: PART 4 조합 칸 나열) */
  extraCheck?: (text: string) => string[];
}

export interface SlotViolation {
  slot: CommentarySlot;
  problems: string[];
}

const checkSlot = (slot: CommentarySlot, text: string): string[] => [
  ...findTextViolations(text, slot.rule),
  ...(slot.extraCheck?.(text) ?? []),
];

/**
 * 칸 묶음의 위반. 항목끼리의 반복은 검사하지 않는다. 같은 반영비율의 대학은
 * 같은 사실 문장이 맞는 내용이고, 다시 쓰기로도 고쳐지지 않았으며(실측 0건),
 * 폴백으로 바꾸면 같은 폴백 문장이 3~4번 반복돼 더 나빠졌다(실측).
 */
export const findSlotViolations = (
  slots: CommentarySlot[],
  texts: string[] = slots.map((slot) => slot.text)
): SlotViolation[] =>
  slots.flatMap((slot, position) => {
    const problems = checkSlot(slot, texts[position]);
    return problems.length > 0 ? [{ slot, problems }] : [];
  });

/** 재요청 응답에서 꺼낸 칸별 원문 */
export interface RepairedTexts {
  fields: Map<string, string>;
  items: Map<string, Map<number, string>>;
}

const readRepaired = (
  repaired: RepairedTexts,
  target: CommentarySlot["target"]
): string | undefined =>
  target.index === undefined
    ? repaired.fields.get(target.field)
    : repaired.items.get(target.field)?.get(target.index);

export interface ResolveSlotsOptions {
  /** 위반 칸만 다시 요청한다. 실패하면 null */
  requestRepair: (violations: SlotViolation[]) => Promise<RepairedTexts | null>;
  /** 폴백을 쓴 칸과 그 이유. 운영 로그와 품질 측정에 쓴다 */
  onFallback?: (violation: SlotViolation) => void;
}

/**
 * 칸마다 최종 문장을 정한다.
 * 1차 해설이 규칙을 지키면 그대로, 어기면 한 번 다시 요청한 문장을,
 * 그것도 어기면 칸의 폴백 문장을 쓴다. 반환 배열은 slots 와 같은 순서다.
 */
export const resolveSlots = async (
  slots: CommentarySlot[],
  { requestRepair, onFallback }: ResolveSlotsOptions
): Promise<string[]> => {
  const texts = slots.map((slot) => slot.text);
  const violations = findSlotViolations(slots, texts);
  if (violations.length === 0) {
    return texts;
  }

  const repaired = await requestRepair(violations);
  const violated = new Set(violations.map(({ slot }) => slot));
  if (repaired) {
    slots.forEach((slot, position) => {
      if (!violated.has(slot)) return;
      const raw = readRepaired(repaired, slot.target);
      if (raw !== undefined) {
        texts[position] = slot.finalize(raw);
      }
    });
  }

  const remainingViolations = findSlotViolations(slots, texts);
  remainingViolations.forEach((violation) => onFallback?.(violation));
  const remaining = new Set(remainingViolations.map(({ slot }) => slot));
  return slots.map((slot, position) =>
    remaining.has(slot) ? slot.fallback(texts[position]) : texts[position]
  );
};

// ─── 섹션 안 같은 문장 반복 ───

/** 반복 검사의 단위. 섹션의 해설 칸 하나 */
export interface SentenceEntry {
  text: string;
  /** 칸의 규칙. 바꾼 문장도 이 규칙을 지켜야 한다 */
  rule?: TextRule;
  /** 문장 위치별로 바꿔 쓸 수 있는 문장 (앞에 둔 것부터 쓴다) */
  alternatives?: string[][];
}

/** 바꿀 문장이 없어 반복 문장을 뺀 칸 */
export interface UnresolvedRepeat {
  position: number;
  sentence: string;
}

/**
 * 한 섹션 안에서 똑같은 문장이 두 번 나오지 않게 한다.
 * 앞 칸에 이미 나온 문장은 그 위치의 다른 판정 문장으로 바꾸고, 바꿀 문장이
 * 없으면 뺀다(칸에 문장이 하나뿐이면 둔다). 같은 단어를 다시 쓰는 것은
 * 반복으로 보지 않고, 문장 전체가 같을 때만 바꾼다.
 */
export const ensureUniqueSentences = (
  entries: SentenceEntry[],
  onUnresolved?: (repeat: UnresolvedRepeat) => void
): string[] => {
  const used = new Set<string>();
  return entries.map((entry, position) => {
    const sentences = splitSentences(entry.text);
    const kept: string[] = [];
    sentences.forEach((sentence, index) => {
      if (!used.has(sentence)) {
        kept.push(sentence);
        used.add(sentence);
        return;
      }
      const rest = sentences.slice(index + 1);
      const replacement = (entry.alternatives?.[index] ?? []).find(
        (candidate) =>
          !used.has(candidate) &&
          !rest.includes(candidate) &&
          (!entry.rule ||
            findTextViolations([...kept, candidate, ...rest].join(" "), {
              ...entry.rule,
              sentences: sentences.length,
            }).length === 0)
      );
      if (replacement) {
        kept.push(replacement);
        used.add(replacement);
        return;
      }
      onUnresolved?.({ position, sentence });
      if (sentences.length === 1) kept.push(sentence);
    });
    return kept.join(" ");
  });
};

// ─── 수치 대조 ───

const NUMBER_PATTERN = /\d+(?:\.\d+)?/g;

/** 문장 속 수치. "98점", "+3.8", "40%"는 98, 3.8, 40 이다 */
export const extractNumbers = (text: string): number[] =>
  (text.match(NUMBER_PATTERN) ?? []).map(Number);

const numberKey = (value: number): string =>
  String(Math.round(value * 100) / 100);

/**
 * 인용 가능한 수치 집합. 데이터·판정 문자열에서 모은다. 프롬프트는 소수
 * 한 자리로 반올림해 싣기도 하므로(편차 1.75 → +1.8) 반올림 값도 넣는다.
 */
export const collectNumbers = (...texts: string[]): Set<string> =>
  new Set(
    texts.flatMap((text) =>
      extractNumbers(text).flatMap((value) => [
        numberKey(value),
        numberKey(Math.round(value * 10) / 10),
      ])
    )
  );

/**
 * 해설의 수치가 그 칸에 준 값 안에 있는지. 다른 대학·다른 영역의 값을
 * 옮겨 쓰거나 값을 지어내면 그 수치를 돌려준다.
 */
export const findUngroundedNumbers = (
  text: string,
  allowed: Set<string>
): string[] => {
  const missing = extractNumbers(text).filter(
    (value) => !allowed.has(numberKey(value))
  );
  return missing.length === 0
    ? []
    : [
        `수치는 이 항목 재료에 적힌 값 그대로 씁니다(확인할 수치: ${missing.join(", ")})`,
      ];
};

/** 영역별 실제 성적. 수치 짝 검사에 쓴다 */
export interface AreaScoreFact {
  label: string;
  percentile: number | null;
  standardScore: number | null;
}

/**
 * "수학 백분위 N", "영어 표준점수 N"처럼 영역에 붙인 성적이 그 영역의 실제
 * 값인지. 허용 수치 검사는 다른 영역의 값으로 바꿔 써도 통과한다(실측: 영어
 * 강점에 국어 백분위 84를 "영어 백분위 84점"으로 씀).
 */
export const findMismatchedAreaScores = (
  text: string,
  scores: AreaScoreFact[]
): string[] =>
  scores.flatMap(({ label, percentile, standardScore }) =>
    (
      [
        ["백분위", percentile],
        ["표준점수", standardScore],
      ] as const
    ).flatMap(([kind, actual]) => {
      const pattern = new RegExp(
        `${label}(?:\\s*영역)?(?:의)?\\s*${kind}(?:는|은|가|이)?\\s*(\\d+(?:\\.\\d+)?)`,
        "g"
      );
      return [...text.matchAll(pattern)].flatMap((match) => {
        const cited = Number(match[1]);
        const matches =
          actual !== null &&
          (numberKey(cited) === numberKey(actual) ||
            numberKey(cited) === numberKey(Math.round(actual * 10) / 10));
        return matches
          ? []
          : [
              actual === null
                ? `${label}는 ${kind} 대신 등급과 반영비율로 씁니다`
                : `${label} ${kind}는 ${numberKey(Math.round(actual * 10) / 10)} 그대로 씁니다`,
            ];
      });
    })
  );

const UNIVERSITY_NAME = /[가-힣]{2,}대학교/g;

/**
 * 그 칸의 재료에 없는 대학 이름. 모델이 목록에 없는 대학을 지어내 넣었다
 * (실측: 국민대 칸에 "중앙대학교 경영학과는").
 */
export const findForeignUniversityNames = (
  text: string,
  allowedText: string
): string[] => {
  const foreign = [
    ...new Set(
      (text.match(UNIVERSITY_NAME) ?? []).filter(
        (name) => !allowedText.includes(name)
      )
    ),
  ];
  return foreign.length === 0
    ? []
    : [
        `대학은 이 항목 재료에 적힌 대학만 씁니다(확인할 이름: ${foreign.join(", ")})`,
      ];
};
