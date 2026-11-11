// ============================================================
// 정시 리포트 AI 응답 검증 스키마
//
// 설계 원칙:
// - 검증 대상은 "해설 문자열"뿐이다. 수치·라벨은 코드가 확정해 섹션에
//   직접 담으므로 AI 응답 스키마에 존재하지 않는다. 구조적으로 AI 가
//   수치를 덮어쓸 경로를 없앴다.
// - 어떤 입력이 와도 예외를 던지지 않는다. 필드 단위로 .catch() 를 걸어
//   어긋난 해설만 폴백 문구로 바꾸고, 나머지 해설은 그대로 살린다.
// - 목록 해설은 index 로 매핑한다. index 가 없으면 배열 순서로 보정하고,
//   끝까지 복구되지 않은 항목은 build 단계에서 폴백 문구로 채운다.
// ============================================================

import { z } from "zod/v4";

import type { RepairedTexts } from "./commentary-validation.ts";

/** 해설 생성이 실패했을 때 섹션에 들어가는 문구 */
export const JEONGSI_COMMENTARY_FALLBACK = {
  scoreOverall:
    "성적 해설을 생성하지 못했습니다. 위 표의 표준점수·백분위와 평균 백분위가 분석의 기준값입니다.",
  scoreStrength:
    "강점 해설을 생성하지 못했습니다. 영역 내 순위와 편차 수치로 강점 영역을 확인할 수 있습니다.",
  scoreWeakness:
    "약점 해설을 생성하지 못했습니다. 영역 내 순위와 편차 수치로 보완이 필요한 영역을 확인할 수 있습니다.",
  matchOverall:
    "반영방식 해설을 생성하지 못했습니다. 각 대학의 반영비율과 활용지표가 비교 기준입니다.",
  matchReason:
    "반영비율과 활용지표가 내 강점 영역에 유리하게 맞물려 선정된 대학입니다.",
  recommendationOverall:
    "지원 전략 해설을 생성하지 못했습니다. 환산점수와 3개년 기준컷의 격차가 구분 기준입니다.",
  recommendationComment: "환산점수와 3개년 기준컷의 격차로 산출된 구분입니다.",
  combinationOverall:
    "조합 해설을 생성하지 못했습니다. 각 조합의 군별 구분 배치가 전략의 기준입니다.",
  combinationStrategy: "군별 구분 배치로 성격이 결정된 조합입니다.",
  detailReason:
    "반영방식과 환산점수, 3개년 기준컷을 기준으로 추천된 전형입니다.",
} as const;

/**
 * 해설 길이 안전 상한. 프롬프트가 지시하는 상한(90~300자)보다 넉넉하게
 * 두어, 조금 넘긴 정상 해설은 살리고 폭주한 출력만 자른다.
 */
const HARD_CAP = {
  overall: 600,
  item: 300,
} as const;

const SENTENCE_END = "다.";

/** 공백 정리 후 상한을 넘으면 마지막 문장 끝에서 자른다. */
const normalizeComment = (value: string, maxChars: number): string => {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) {
    return collapsed;
  }

  const head = collapsed.slice(0, maxChars);
  const lastSentenceEnd = head.lastIndexOf(SENTENCE_END);
  if (lastSentenceEnd > 0) {
    return head.slice(0, lastSentenceEnd + SENTENCE_END.length);
  }
  return `${head.trimEnd()}…`;
};

/**
 * 해설 원문. 프롬프트는 문장 하나를 배열 원소 하나로 받는다(문장 수를
 * 지시문 대신 JSON 구조로 고정). 문자열로 와도 그대로 받는다.
 */
const CommentTextSchema = z.union([
  z.string(),
  z
    .array(z.string())
    .transform((sentences) =>
      sentences.map((sentence) => sentence.trim()).join(" ")
    ),
]);

/** 비거나 타입이 어긋난 해설을 폴백 문구로 바꾸는 문자열 필드 */
const commentField = (fallback: string, maxChars: number) =>
  CommentTextSchema.transform((value) => normalizeComment(value, maxChars))
    .refine((value) => value.length > 0)
    .catch(fallback);

// ─── PART 1. 성적 종합 분석 ───

export const JeongsiScoreAnalysisCommentarySchema = z.object({
  overallComment: commentField(
    JEONGSI_COMMENTARY_FALLBACK.scoreOverall,
    HARD_CAP.overall
  ),
  strengthComment: commentField(
    JEONGSI_COMMENTARY_FALLBACK.scoreStrength,
    HARD_CAP.overall
  ),
  weaknessComment: commentField(
    JEONGSI_COMMENTARY_FALLBACK.scoreWeakness,
    HARD_CAP.overall
  ),
});

export type JeongsiScoreAnalysisCommentary = z.infer<
  typeof JeongsiScoreAnalysisCommentarySchema
>;

export const parseScoreAnalysisCommentary = (
  raw: unknown
): JeongsiScoreAnalysisCommentary => {
  const result = JeongsiScoreAnalysisCommentarySchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  return {
    overallComment: JEONGSI_COMMENTARY_FALLBACK.scoreOverall,
    strengthComment: JEONGSI_COMMENTARY_FALLBACK.scoreStrength,
    weaknessComment: JEONGSI_COMMENTARY_FALLBACK.scoreWeakness,
  };
};

// ─── 목록 해설 공통 ───

/**
 * 목록 해설 한 요소.
 * 모델이 reason / comment / strategy / text 중 어느 키를 쓰더라도 읽어낸다.
 * index 가 없으면 배열 순서로 보정한다.
 */
const IndexedCommentSchema = z.object({
  index: z.coerce.number().int().min(0).optional(),
  reason: CommentTextSchema.optional(),
  comment: CommentTextSchema.optional(),
  strategy: CommentTextSchema.optional(),
  /** PART 4: 다른 조합과 달라지는 칸 문장. 선정 기준·맞바꿈 문장은 코드가 붙인다 */
  difference: CommentTextSchema.optional(),
  text: CommentTextSchema.optional(),
});

/** index → 해설 문자열. 비어 있는 항목은 호출부에서 폴백으로 채운다. */
export type CommentaryByIndex = Map<number, string>;

const readIndexedList = (items: unknown[]): CommentaryByIndex => {
  const byIndex: CommentaryByIndex = new Map();

  items.forEach((element, position) => {
    const parsed = IndexedCommentSchema.safeParse(element);
    if (!parsed.success) {
      return;
    }

    const { index, reason, comment, strategy, difference, text } = parsed.data;
    const rawText = reason ?? comment ?? difference ?? strategy ?? text;
    if (rawText === undefined) {
      return;
    }

    const normalized = normalizeComment(rawText, HARD_CAP.item);
    if (normalized.length === 0) {
      return;
    }

    byIndex.set(index ?? position, normalized);
  });

  return byIndex;
};

const buildListEnvelopeSchema = (overallFallback: string) =>
  z.object({
    overallComment: commentField(overallFallback, HARD_CAP.overall),
    items: z.array(z.unknown()).catch(() => [] as unknown[]),
  });

/** overallComment + 항목별 해설을 함께 쓰는 섹션의 파싱 결과 */
export interface ListCommentary {
  overallComment: string;
  byIndex: CommentaryByIndex;
}

const parseListCommentary = (
  raw: unknown,
  schema: ReturnType<typeof buildListEnvelopeSchema>,
  overallFallback: string
): ListCommentary => {
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { overallComment: overallFallback, byIndex: new Map() };
  }
  return {
    overallComment: result.data.overallComment,
    byIndex: readIndexedList(result.data.items),
  };
};

// ─── PART 2. 나에게 유리한 대학 분석 ───

export const JeongsiUniversityMatchCommentarySchema = buildListEnvelopeSchema(
  JEONGSI_COMMENTARY_FALLBACK.matchOverall
);

export const parseUniversityMatchCommentary = (raw: unknown): ListCommentary =>
  parseListCommentary(
    raw,
    JeongsiUniversityMatchCommentarySchema,
    JEONGSI_COMMENTARY_FALLBACK.matchOverall
  );

// ─── PART 3. 지원 가능 대학·학과 ───

export const JeongsiRecommendationCommentarySchema = buildListEnvelopeSchema(
  JEONGSI_COMMENTARY_FALLBACK.recommendationOverall
);

export const parseRecommendationCommentary = (raw: unknown): ListCommentary =>
  parseListCommentary(
    raw,
    JeongsiRecommendationCommentarySchema,
    JEONGSI_COMMENTARY_FALLBACK.recommendationOverall
  );

// ─── PART 4. 가·나·다군 지원 조합 ───

export const JeongsiCombinationCommentarySchema = buildListEnvelopeSchema(
  JEONGSI_COMMENTARY_FALLBACK.combinationOverall
);

export const parseCombinationCommentary = (raw: unknown): ListCommentary =>
  parseListCommentary(
    raw,
    JeongsiCombinationCommentarySchema,
    JEONGSI_COMMENTARY_FALLBACK.combinationOverall
  );

// ─── 위반 칸 다시 쓰기 응답 ───

const ITEM_TEXT_FIELDS = new Set(["reason", "comment", "difference"]);

/**
 * 다시 쓰기 응답에서 칸별 원문을 꺼낸다. 최상위 문자열·배열 필드는 총평류,
 * items 는 index → 원문으로 읽는다. 어떤 입력에도 예외를 던지지 않는다.
 */
export const parseRepairedCommentary = (raw: unknown): RepairedTexts => {
  const fields = new Map<string, string>();
  const items = new Map<string, Map<number, string>>();
  if (!raw || typeof raw !== "object") {
    return { fields, items };
  }

  Object.entries(raw).forEach(([key, value]) => {
    if (key === "items") return;
    const parsed = CommentTextSchema.safeParse(value);
    if (parsed.success) {
      const text = normalizeComment(parsed.data, HARD_CAP.overall);
      if (text.length > 0) fields.set(key, text);
    }
  });

  const list = (raw as { items?: unknown }).items;
  if (Array.isArray(list)) {
    const byIndex = readIndexedList(list);
    // 응답이 어느 키로 썼든 항목 칸은 같은 원문으로 읽는다
    ITEM_TEXT_FIELDS.forEach((field) => items.set(field, byIndex));
  }
  return { fields, items };
};
