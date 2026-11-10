// ============================================================
// AI 해설 사후 교정
//
// 프롬프트로 지시해도 모델이 어기면 학생이 틀린 사실을 읽는 항목만
// 코드로 한 번 더 고친다. 수치·라벨은 전부 코드값이 기준이다.
// ============================================================

import { RISK_TIER_MATRIX } from "../engine/combination.ts";
import type { PassChance, RiskAppetite } from "../types.ts";

const TOTAL_CARDS = 3;

const TIER_DISPLAY_ORDER = ["상향", "적정", "안정"] as const;

/** 성향별 원서 배분 표기. 예) "상향 1장, 적정 1장, 안정 1장" */
export const formatCardAllocation = (risk: RiskAppetite): string =>
  TIER_DISPLAY_ORDER.map((tier) => ({
    tier,
    count: RISK_TIER_MATRIX[risk].tiers.filter((item) => item === tier).length,
  }))
    .filter(({ count }) => count > 0)
    .map(({ tier, count }) => `${tier} ${count}장`)
    .join(", ");

const CARD_RUN =
  /(?:상향|적정|안정)\s*\d장(?:\s*(?:,|·|과|와|및)?\s*(?:상향|적정|안정)\s*\d장)*/g;

/** 합이 3장이 아닌 원서 배분 표현을 성향의 배분으로 바꾼다 */
export const normalizeCardAllocation = (
  text: string,
  risk: RiskAppetite
): string =>
  text.replace(CARD_RUN, (run) => {
    const total = [...run.matchAll(/(\d)장/g)].reduce(
      (sum, [, count]) => sum + Number(count),
      0
    );
    return total === TOTAL_CARDS ? run : formatCardAllocation(risk);
  });

type DisplayTier = (typeof TIER_DISPLAY_ORDER)[number];

/** 구간별 항목 수 */
export const countByTier = (
  items: { tier: string }[]
): Map<DisplayTier, number> =>
  new Map(
    TIER_DISPLAY_ORDER.map((tier) => [
      tier,
      items.filter((item) => item.tier === tier).length,
    ])
  );

/** 구간별 목록 대학 수 표기. 예) "상향 1곳, 적정 3곳, 안정 3곳" */
export const formatTierCounts = (counts: Map<DisplayTier, number>): string =>
  [...counts]
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${tier} ${count}곳`)
    .join(", ");

const LIST_RUN =
  /(?:상향|적정|안정)\s*\d+곳(?:\s*(?:,|·|과|와|및)?\s*(?:상향|적정|안정)\s*\d+곳)*/g;

/** 대학 수 표현 바로 뒤 이 글자 수 안에 "원서" 가 오면 원서 배분을 말한 것으로 본다 */
const CARD_CONTEXT_WINDOW = 15;

/**
 * 구간별 대학 수 표현을 실제 목록 수로 고친다.
 * 바로 뒤에서 원서를 수식하는 "N곳" 은 목록 수와 원서 장수를 섞은 것이라
 * 성향의 원서 배분으로 바꾼다. 예) "상향 1곳, 적정 2곳, 안정 3곳으로 구성한 3장의 원서"
 */
export const normalizeTierCounts = (
  text: string,
  counts: Map<DisplayTier, number>,
  risk: RiskAppetite
): string =>
  text.replace(LIST_RUN, (run, offset: number) => {
    const following = text.slice(
      offset + run.length,
      offset + run.length + CARD_CONTEXT_WINDOW
    );
    return following.includes("원서")
      ? formatCardAllocation(risk)
      : run.replace(
          /(상향|적정|안정)(\s*)\d+곳/g,
          (_match, tier: DisplayTier, space: string) =>
            `${tier}${space}${counts.get(tier) ?? 0}곳`
        );
  });

/** 기준컷을 넘은 쪽 서술어 → 못 미친 쪽 서술어 */
const ABOVE_TO_BELOW: Record<string, string> = {
  넘기며: "모자라며",
  넘긴: "모자란",
  넘는: "모자란",
  넘겨: "모자라",
  넘어: "모자라",
  상회하며: "밑돌며",
  상회하는: "밑도는",
  상회합니다: "밑돕니다",
  상회해: "밑돌아",
  웃돌며: "밑돌며",
  웃도는: "밑도는",
  웃돌아: "밑돌아",
  높습니다: "낮습니다",
  높아: "낮아",
  높은: "낮은",
};

const BELOW_TO_ABOVE: Record<string, string> = {
  모자라며: "넘기며",
  모자란: "넘긴",
  모자라: "넘겨",
  밑돌며: "웃돌며",
  밑도는: "웃도는",
  밑돕니다: "웃돕니다",
  밑돌아: "웃돌아",
  낮습니다: "높습니다",
  낮아: "높아",
  낮은: "높은",
};

const GAP_VERBS = [
  ...Object.keys(ABOVE_TO_BELOW),
  ...Object.keys(BELOW_TO_ABOVE),
].sort((a, b) => b.length - a.length);

const GAP_PHRASE = new RegExp(
  `기준컷(\\s*대비|을|에|보다)?(\\s*)(\\d+(?:\\.\\d+)?)(\\s*백분위점\\s*)(${GAP_VERBS.join("|")})`,
  "g"
);

/**
 * 기준컷 대비 격차의 방향·크기를 코드값에 맞춘다.
 * 예) 격차 -1.3 인데 "기준컷을 1.3백분위점 넘겨" → "기준컷에 1.3백분위점 모자라"
 */
export const normalizeGapDirection = (
  text: string,
  gap: number | null
): string => {
  if (gap === null) return text;
  // "기준컷을 -1.3백분위점 모자라"처럼 부호를 붙여 쓴 격차는 크기만 남긴다(실측)
  const unsigned = text.replace(/(기준컷(?:을|에|보다)?\s*)[+-](?=\d)/g, "$1");
  const rounded = Math.round(gap * 10) / 10;
  if (rounded === 0) return unsigned;
  const isAbove = rounded > 0;
  const magnitude = Math.abs(rounded).toFixed(1);
  return unsigned.replace(
    GAP_PHRASE,
    (
      _match,
      particle: string | undefined,
      space: string,
      _value: string,
      unit: string,
      verb: string
    ) => {
      const flipped = isAbove
        ? (BELOW_TO_ABOVE[verb] ?? verb)
        : (ABOVE_TO_BELOW[verb] ?? verb);
      // "기준컷에 모자라" 와 "기준컷을 넘겨" 처럼 서술어에 맞는 조사로 맞춘다
      const objectParticle = flipped.startsWith("모자") ? "에" : "을";
      const fixedParticle =
        particle === "을" || particle === "에"
          ? objectParticle
          : (particle ?? "");
      return `기준컷${fixedParticle}${space}${magnitude}${unit}${flipped}`;
    }
  );
};

const WEIGHT_AS_PERCENT = /(?:반영\s*비율|가중치)\s*(\d+(?:\.\d+)?)%/g;

/**
 * 가중합 대학의 가중치를 퍼센트로 쓴 표현을 고친다.
 * "수120" 은 비율이 아니므로 "수학 반영비율 120%"·"가중치 120%" 는 틀린 말이다.
 */
export const normalizeWeightCitation = (
  text: string,
  ratioSummary: string
): string =>
  ratioSummary.endsWith("가중합")
    ? text.replace(
        WEIGHT_AS_PERCENT,
        (_match, value: string) => `가중치 ${value}`
      )
    : text;

const AREA_BY_SHORT: Record<string, string> = {
  국: "국어",
  수: "수학",
  영: "영어",
  탐: "탐구",
};

const SIMPLE_RATIO =
  /^(?:[국수영탐]\d+(?:\.\d+)?)(?:·[국수영탐]\d+(?:\.\d+)?)*$/;

/**
 * "국35·수35·탐30" 처럼 영역별 비율이 고정된 표기를 영역→비율로 푼다.
 * 상위순·가중합 등 다른 표기는 인용 검증 대상이 아니므로 null.
 */
export const parseSimpleRatio = (
  ratioSummary: string
): Map<string, number> | null => {
  if (!SIMPLE_RATIO.test(ratioSummary)) return null;
  return new Map(
    ratioSummary
      .split("·")
      .map((part) => [AREA_BY_SHORT[part[0]], Number(part.slice(1))])
  );
};

/** 영역별 비율 표기. 예) "국어 35%·수학 35%·탐구 30%" */
export const formatRatioByArea = (ratios: Map<string, number>): string =>
  [...ratios].map(([area, value]) => `${area} ${value}%`).join("·");

const AREA_PERCENT =
  /(국어|수학|영어|탐구)(\s*(?:영역\s*)?(?:반영\s*)?(?:비율|비중)?\s*(?:이|은|는|을|가|로)?\s*)(\d+(?:\.\d+)?)%/g;

const EVEN_SPLIT_AREAS = ["국어", "수학", "탐구"];

const EVEN_SPLIT =
  /(?:국수탐|국·수·탐|국어·수학·탐구|국어,\s*수학,\s*탐구)\s*(?:을|를|에|이|가)?\s*(?:각각\s*)?(\d+(?:\.\d+)?)%\s*씩/g;

/**
 * 영역 반영비율을 틀리게 인용한 표현을 실제 비율로 고친다.
 * 예) 국35·수35·탐30 대학을 "국수탐 35%씩" 으로 쓴 경우.
 */
export const normalizeRatioCitation = (
  text: string,
  ratioSummary: string
): string => {
  const ratios = parseSimpleRatio(ratioSummary);
  if (!ratios) return text;
  const areaFixed = text.replace(
    AREA_PERCENT,
    (match, area: string, between: string, value: string) => {
      const actual = ratios.get(area);
      return actual === undefined || actual === Number(value)
        ? match
        : `${area}${between}${actual}%`;
    }
  );
  const evenAreas = new Map(
    [...ratios].filter(([area]) => EVEN_SPLIT_AREAS.includes(area))
  );
  const isEvenSplit = (value: number): boolean =>
    evenAreas.size === EVEN_SPLIT_AREAS.length &&
    [...evenAreas.values()].every((actual) => actual === value);
  return areaFixed.replace(EVEN_SPLIT, (match, value: string) =>
    evenAreas.size === 0 || isEvenSplit(Number(value))
      ? match
      : formatRatioByArea(evenAreas)
  );
};

/** 가중치 표기와 영역 비율 인용을 함께 고친다 */
export const normalizeRatioMentions = (
  text: string,
  ratioSummary: string
): string =>
  normalizeRatioCitation(
    normalizeWeightCitation(text, ratioSummary),
    ratioSummary
  );

const OVERSTATED_HIGH = /매우\s*높은(?=\s*(?:합격\s*)?가능성)/g;
const OVERSTATED_LOW = /매우\s*낮은(?=\s*(?:합격\s*)?가능성)/g;
/** 안정 쪽 표현의 과장. 합격 가능성 라벨 최고 단계가 "높음" 이라 "매우" 는 늘 과하다 */
const OVERSTATED_SAFE = /매우\s*(안전한|안정적인|든든한)/g;

/**
 * 라벨 원문 "매우낮음" 을 문장 표기로 바꾸고, 라벨보다 센 강도 표현을 낮춘다.
 * 합격 가능성 라벨에 "매우 높음" 은 없고, "매우 낮은" 은 매우낮음일 때만 맞다.
 */
export const normalizeChanceWording = (
  text: string,
  chance?: PassChance
): string => {
  const spaced = text.replaceAll("매우낮음", "매우 낮음");
  if (!chance) return spaced;
  const capped = spaced
    .replace(OVERSTATED_HIGH, "높은")
    .replace(OVERSTATED_SAFE, "$1");
  return chance === "매우낮음"
    ? capped
    : capped.replace(OVERSTATED_LOW, "낮은");
};

/**
 * 수시 리포트 sanitizeAiTone(libs/report/pipeline/postprocessor.ts)에서
 * 정시 해설에도 그대로 맞는 AI 클리셰 치환만 옮겨 왔다.
 * 생기부·학종 전용 치환(희망 학과, 학년 기록, 전형 명칭 등)은 정시 문맥을
 * 망가뜨리므로 가져오지 않는다. 긴 패턴을 먼저 둔다.
 */
const JEONGSI_TONE_REPLACEMENTS: [RegExp, string][] = [
  [/돋보입니다/g, "강점입니다"],
  [/돋보이는/g, "눈에 띄는"],
  [/돋보이며/g, "강점이 있으며"],
  [/인상적입니다/g, "평가 포인트입니다"],
  [/주목할 만합니다/g, "중요합니다"],
  [/것으로 사료됩니다/g, "것으로 봅니다"],
  [/바람직합니다/g, "좋겠습니다"],
  [/높은 경쟁력을 가집니다/g, "강점 요소입니다"],
  [/경쟁력을 가집니다/g, "강점 요소입니다"],
  [/매우 유리합니다/g, "유리한 편입니다"],
  [/매우 적합합니다/g, "적합한 편입니다"],
  [/매우 우수합니다/g, "우수한 편입니다"],
  [/극대화합니다/g, "크게 살립니다"],
  [/극대화할/g, "크게 살릴"],
  [/극대화하는/g, "크게 살리는"],
  [/극대화하거나/g, "크게 살리거나"],
  [/극대화하여/g, "크게 살려"],
  [/매우 유리한/g, "유리한"],
  // "0% 반영하지 않는"은 이중 부정으로 뜻이 뒤집힌다(실측: "국어 영역을 0%
  // 반영하지 않는 구조라"). 0% 는 반영하지 않는다는 뜻이므로 수치를 뗀다.
  [/(?<![\d.])0(?:\.0)?%\s*(?:를|을)?\s*(반영하지|반영되지)/g, "$1"],
  [/기여합니다/g, "도움이 됩니다"],
  [/기여하는/g, "도움이 되는"],
  [/기여하여/g, "도움이 되어"],
  [/기여하며/g, "도움이 되며"],
  [/기여할/g, "도움이 될"],
  [/강화합니다/g, "탄탄하게 만듭니다"],
  [/강화하는/g, "보완하는"],
  [/강화하여/g, "보완하여"],
  [/강화됩니다/g, "탄탄해집니다"],
  [/시사합니다/g, "보여줍니다"],
  [/시사하는/g, "보여주는"],
  [/드러냅니다/g, "나타납니다"],
  [/되어집니다/g, "됩니다"],
  [/검토하세요/g, "검토하는 편이 좋겠습니다"],
  [/고려하세요/g, "고려하는 편이 좋겠습니다"],
  [/확인하세요/g, "확인하는 편이 좋겠습니다"],
  [/배치하세요/g, "배치하는 편이 좋겠습니다"],
  [/\.{3,}|…/g, "(중략)"],
  // 대학·성적을 서열로 묶는 표현은 쓰지 않는다(수시 "대학 티어 분류 표현" 규칙).
  [/(?:전국\s*)?(?:최)?상위권\s*대학/g, "희망 대학"],
  [/(?:전국\s*)?(?:최)?상위권\s*성적/g, "높은 성적"],
  [/압도적인\s+/g, ""],
  // 지시대명사로 여는 문장은 가리키는 대상이 흐려진다(수시 문체 규칙).
  [/(^|[.!?]\s+)이는\s+/g, "$1"],
];

/** 끝소리에 받침이 있는 숫자 (영·일·삼·육·칠·팔, 10·100·1000 의 십·백·천) */
const BATCHIM_DIGITS = new Set(["0", "1", "3", "6", "7", "8"]);
/** 받침이 ㄹ 인 숫자 (일·칠·팔) — "으로" 대신 "로" */
const RIEUL_DIGITS = new Set(["1", "7", "8"]);

const PARTICLE_AFTER_NUMBER =
  /(\d|%)(으로|은|는|이|가|을|를|과|와|로)(?=[\s,.!?)]|$)/g;

const pickParticle = (
  particle: string,
  hasBatchim: boolean,
  rieul: boolean
): string => {
  switch (particle) {
    case "은":
    case "는":
      return hasBatchim ? "은" : "는";
    case "이":
    case "가":
      return hasBatchim ? "이" : "가";
    case "을":
    case "를":
      return hasBatchim ? "을" : "를";
    case "과":
    case "와":
      return hasBatchim ? "과" : "와";
    default:
      return hasBatchim && !rieul ? "으로" : "로";
  }
};

/**
 * 숫자·% 바로 뒤 조사를 끝소리에 맞춘다. 모델이 "가중치 120는"처럼
 * 숫자 뒤 조사를 틀렸다(실측). "%"는 "퍼센트"로 읽어 받침이 없다.
 */
export const normalizeNumberParticles = (text: string): string =>
  text.replace(
    PARTICLE_AFTER_NUMBER,
    (_match, last: string, particle: string) => {
      const hasBatchim = last !== "%" && BATCHIM_DIGITS.has(last);
      const rieul = last !== "%" && RIEUL_DIGITS.has(last);
      return `${last}${pickParticle(particle, hasBatchim, rieul)}`;
    }
  );

/** AI 해설 문자열의 클리셰 표현을 담백한 표현으로 바꾸고 숫자 뒤 조사를 맞춘다 */
export const sanitizeJeongsiTone = (text: string): string =>
  normalizeNumberParticles(
    JEONGSI_TONE_REPLACEMENTS.reduce(
      (result, [pattern, replacement]) => result.replace(pattern, replacement),
      text
    )
  );

/** 응답 JSON 의 모든 문자열에 톤 치환을 적용한다 */
export const sanitizeCommentaryTone = (value: unknown): unknown => {
  if (typeof value === "string") return sanitizeJeongsiTone(value);
  if (Array.isArray(value)) return value.map(sanitizeCommentaryTone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeCommentaryTone(item),
      ])
    );
  }
  return value;
};

const ENGLISH_POLICY = /영어\s*[^(]*\(([^)]*)\)/;

/** "영어 감산(1등급 0 · 2등급 3 · 3등급 6) / …" 에서 등급별 점수를 꺼낸다 */
export const parseEnglishPoints = (
  englishHistorySummary: string
): Map<number, number> => {
  const policy = ENGLISH_POLICY.exec(englishHistorySummary)?.[1] ?? "";
  return new Map(
    [...policy.matchAll(/(\d)등급\s*(\d+(?:\.\d+)?)/g)].map(
      ([, grade, points]) => [Number(grade), Number(points)]
    )
  );
};

const ENGLISH_POINT_CITATION =
  /(영어\s*)(\d)(등급\s*(?:감점|감산|가산점|가산|점수|환산점수)(?:이|은|는|폭이|폭은)?\s*)(\d+(?:\.\d+)?)(점)/g;

/**
 * 영어 등급별 감점·가산 점수 인용을 실제 값으로 고친다.
 * 예) 2등급 감산 3점인 대학을 "영어 2등급 감점이 0.4점" 으로 쓴 경우
 * (모델이 같은 항목의 격차 0.4 를 끌어다 썼다 — 실측).
 */
export const normalizeEnglishCitation = (
  text: string,
  englishHistorySummary: string
): string => {
  const points = parseEnglishPoints(englishHistorySummary);
  if (points.size === 0) return text;
  return text.replace(
    ENGLISH_POINT_CITATION,
    (match, head: string, grade: string, between: string, _value, unit) => {
      const actual = points.get(Number(grade));
      return actual === undefined
        ? match
        : `${head}${grade}${between}${actual}${unit}`;
    }
  );
};

/** 프롬프트 표의 소재 이름. 모델이 칸 문구를 통째로 베껴 문장 앞에 붙였다(실측) */
const TOPIC_LABEL_PREFIX =
  /^\s*(?:연도별 컷의 흐름|같은 구분 안 위치|모집군에서의 역할|모집 규모)\s*(?:—|-|:)\s*/;

/** 해설 첫머리에 붙은 프롬프트 소재 이름을 걷어 낸다 */
export const stripTopicLabel = (text: string): string =>
  text.replace(TOPIC_LABEL_PREFIX, "");

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 해설 첫머리의 "<대학> <학과>는" 주어를 걷어 낸다. 카드 제목에 이미 있는
 * 이름을 되풀이해 항목마다 15~25자를 더 썼다(실측: PART 2 다섯 곳 모두).
 * 모델이 "(자연)"·끝 숫자를 떼고 쓰므로 학과명은 단위 접미사로 찾는다.
 * 학과명이 여러 어절이어도("전자공학부 지능형반도체융합전자전공") 마지막 어절로 찾는다.
 */
export const stripLeadingSubject = (
  text: string,
  university: string
): string => {
  const subject = new RegExp(
    `^\\s*${escapeRegExp(university)}(?:(?:\\s+\\S+?)*?\\s+\\S*?(?:학부|학과|전공|계열|과|부|대학)\\d*(?:\\([^)]*\\))?)?(?:은|는)\\s+`
  );
  // "<대학> <학과>: …" 처럼 이름을 머리말로 붙인 형태(실측)
  const heading = new RegExp(
    `^\\s*${escapeRegExp(university)}[^:：.]{0,40}[:：]\\s*`
  );
  return text.replace(subject, "").replace(heading, "");
};
