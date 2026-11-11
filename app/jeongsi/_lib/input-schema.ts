// ============================================================
// JeongsiInput 서버측 Zod 검증 스키마
//
// 클라이언트 폼(JeongsiForm)과 동일한 규칙을 서버에서 다시 검증한다.
// 파싱 결과는 libs/jeongsi/types.ts 의 JeongsiInput 과 구조가 같다.
// ============================================================

import { z } from "zod/v4";

import type { JeongsiInput } from "@/libs/jeongsi/types";

import {
  EXAM_YEAR_OPTIONS,
  INQUIRY_SUBJECT_OPTIONS,
  KOREAN_ELECTIVE_OPTIONS,
  MATH_ELECTIVE_OPTIONS,
  MAX_GRADE,
  MAX_INQUIRY_STANDARD_SCORE,
  MAX_MAIN_STANDARD_SCORE,
  MAX_PERCENTILE,
  MIN_GRADE,
  PREFERRED_REGION_OPTIONS,
  RISK_APPETITE_OPTIONS,
  SUNEUNG_GRADE_OPTIONS,
} from "./options";

const createStandardScoreSchema = (max: number) =>
  z
    .number()
    .int("표준점수는 정수로 입력해주세요.")
    .min(0, "표준점수는 0점 이상이어야 합니다.")
    .max(max, `표준점수는 ${max}점 이하여야 합니다.`);

const PercentileSchema = z
  .number()
  .int("백분위는 정수로 입력해주세요.")
  .min(0, "백분위는 0 이상이어야 합니다.")
  .max(MAX_PERCENTILE, `백분위는 ${MAX_PERCENTILE} 이하여야 합니다.`);

/** SuneungGrade(1~9) 리터럴 유니온으로 좁힌다 */
const GradeSchema = z.literal(SUNEUNG_GRADE_OPTIONS, {
  error: `등급은 ${MIN_GRADE}~${MAX_GRADE} 사이의 정수로 입력해주세요.`,
});

const KoreanScoreSchema = z.object({
  elective: z.enum(KOREAN_ELECTIVE_OPTIONS, {
    error: "국어 선택과목을 선택해주세요.",
  }),
  standardScore: createStandardScoreSchema(MAX_MAIN_STANDARD_SCORE),
  percentile: PercentileSchema,
});

const MathScoreSchema = z.object({
  elective: z.enum(MATH_ELECTIVE_OPTIONS, {
    error: "수학 선택과목을 선택해주세요.",
  }),
  standardScore: createStandardScoreSchema(MAX_MAIN_STANDARD_SCORE),
  percentile: PercentileSchema,
});

const InquiryScoreSchema = z.object({
  subject: z.enum(INQUIRY_SUBJECT_OPTIONS, {
    error: "탐구 과목을 선택해주세요.",
  }),
  standardScore: createStandardScoreSchema(MAX_INQUIRY_STANDARD_SCORE),
  percentile: PercentileSchema,
});

const SuneungScoreSchema = z
  .object({
    examYear: z.literal(EXAM_YEAR_OPTIONS, {
      error: "지원하지 않는 수능 응시연도입니다.",
    }),
    korean: KoreanScoreSchema,
    math: MathScoreSchema,
    english: z.object({ grade: GradeSchema }),
    inquiry1: InquiryScoreSchema,
    inquiry2: InquiryScoreSchema,
    history: z.object({ grade: GradeSchema }),
  })
  .refine((score) => score.inquiry1.subject !== score.inquiry2.subject, {
    error: "탐구1과 탐구2는 서로 다른 과목이어야 합니다.",
    path: ["inquiry2", "subject"],
  });

const JeongsiPreferenceSchema = z.object({
  target: z
    .string()
    .trim()
    .min(1, "희망 학과 또는 계열을 입력해주세요.")
    .max(50, "희망 학과·계열은 50자 이내로 입력해주세요."),
  targetKind: z.enum(["department", "field"], {
    error: "희망 학과 또는 계열 구분이 올바르지 않습니다.",
  }),
  region: z.enum(PREFERRED_REGION_OPTIONS, {
    error: "희망 지역을 선택해주세요.",
  }),
  risk: z.enum(RISK_APPETITE_OPTIONS, {
    error: "지원 성향을 선택해주세요.",
  }),
});

export const JeongsiInputSchema = z.object({
  score: SuneungScoreSchema,
  preference: JeongsiPreferenceSchema,
});

/**
 * 스키마 출력이 공유 계약(JeongsiInput)과 어긋나면 컴파일 에러가 난다.
 * libs/jeongsi/types.ts 가 바뀌면 이 줄이 먼저 깨지도록 두는 안전장치.
 */
const _schemaMatchesContract: JeongsiInput = {} as z.infer<
  typeof JeongsiInputSchema
>;
void _schemaMatchesContract;

/** 첫 번째 검증 실패 메시지를 한국어 한 줄로 뽑는다 */
export const formatJeongsiInputError = (error: z.ZodError): string => {
  const [first] = error.issues;
  return first?.message ?? "입력값이 올바르지 않습니다.";
};
