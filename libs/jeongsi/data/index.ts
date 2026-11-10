// ============================================================
// 정시 데이터 로더
//
// ⚠️ 서버 전용 모듈.
// fs 로 파일을 읽으므로 클라이언트 컴포넌트에서 import 하면 안 된다.
// (route handler / 서버 컴포넌트 / 서버 액션에서만 호출할 것.
//  server-only 패키지가 설치되어 있지 않아 주석으로 명시한다)
//
// 설계 원칙:
// - 호출부는 데이터 출처(JSON / DB / 외부 API)를 알지 못한다.
//   JeongsiDataSource 인터페이스만 바라본다.
// - 지금은 libs/jeongsi/data/*.json 을 읽지만, DB 전환 시
//   setJeongsiDataSource() 로 구현체만 교체하면 된다.
// - JSON 을 import 하지 않고 fs 로 런타임에 읽어 JSON.parse 한다.
//   `import data from "./x.json"` 은 TS 가 파일 전체의 구조적 타입을
//   추론하므로 데이터가 커지면 TS2590 이 재발한다
//   (libs/report/constants/admission-cutoff-data.ts:22 의 실제 사례).
//   런타임 파싱 + 타입 단언은 추론을 아예 타지 않는다.
// - 모듈 레벨 메모이제이션으로 요청마다 파일을 다시 읽지 않는다.
// - Zod 검증은 수만 건 규모에서 비용이 크므로 프로덕션 경로에서는
//   선택적으로만 돌린다(JEONGSI_VALIDATE_DATA=true).
// ============================================================

import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod/v4";

import { logger } from "@/libs/logger";

import type { JeongsiAdmissionPlan, JeongsiResultEntry } from "../types";

/** 데이터 파일 식별자 (확장자 제외). specs/012-jeongsi-data-spec.md 기준 */
const PLAN_SOURCE_NAME = "admission-plans-2027";
const RESULT_SOURCE_NAME = "admission-results";

/** 프로젝트 루트 기준 데이터 디렉토리 */
const DATA_DIR = path.join("libs", "jeongsi", "data");

/** 검증 활성화 환경변수 */
const VALIDATE_ENV_KEY = "JEONGSI_VALIDATE_DATA";

/**
 * 원시 데이터 공급자.
 * 반환값은 검증 전이므로 unknown 이다. 배열이거나, 배열을 담은
 * 래퍼 객체({ plans: [...] } 등)여도 로더가 평탄화한다.
 */
export interface JeongsiDataSource {
  readAdmissionPlans(): Promise<unknown>;
  readAdmissionResults(): Promise<unknown>;
}

/**
 * 데이터 파일의 절대 경로.
 *
 * ⚠️ 이 경로는 리터럴 상수만 조합해야 한다. Next 의 outputFileTracing
 * 이 `path.join(process.cwd(), <리터럴>)` + readFile 패턴을 정적으로
 * 인식해 JSON 을 서버 함수 번들에 포함시키기 때문이다(검증: 클린
 * 빌드 후 .next/server/app/api/jeongsi/analyze/route.js.nft.json 에
 * 두 JSON 이 등재됨). 경로를 런타임 변수로 만들면 추적이 깨져
 * Vercel 에서 ENOENT 가 난다.
 */
const toDataFilePath = (sourceName: string): string =>
  path.join(process.cwd(), DATA_DIR, `${sourceName}.json`);

/**
 * fs 로 JSON 을 읽어 파싱한다.
 *
 * JSON 을 import 하지 않으므로 (1) TS 구조적 타입 추론을 타지 않아
 * 데이터가 수만 건이 되어도 TS2590 이 나지 않고, (2) 서버 번들에
 * JSON 이 들어가지 않는다(현재 데이터 약 500KB 절감).
 */
const readJsonSource = async (sourceName: string): Promise<unknown> => {
  const raw = await readFile(toDataFilePath(sourceName), "utf-8");
  return JSON.parse(raw) as unknown;
};

const jsonDataSource: JeongsiDataSource = {
  readAdmissionPlans: () => readJsonSource(PLAN_SOURCE_NAME),
  readAdmissionResults: () => readJsonSource(RESULT_SOURCE_NAME),
};

let activeDataSource: JeongsiDataSource = jsonDataSource;
let planCache: JeongsiAdmissionPlan[] | null = null;
let resultCache: JeongsiResultEntry[] | null = null;

/** 데이터 출처 교체 (테스트, DB 전환용) */
export const setJeongsiDataSource = (source: JeongsiDataSource): void => {
  activeDataSource = source;
  clearJeongsiDataCache();
};

/** 기본 JSON 공급자로 되돌린다 */
export const resetJeongsiDataSource = (): void => {
  activeDataSource = jsonDataSource;
  clearJeongsiDataCache();
};

/** 메모리 캐시 비우기 */
export const clearJeongsiDataCache = (): void => {
  planCache = null;
  resultCache = null;
};

const isValidationEnabled = (): boolean =>
  process.env[VALIDATE_ENV_KEY] === "true";

/** 배열 또는 배열을 담은 래퍼 객체를 배열로 평탄화한다 */
const toEntryArray = (raw: unknown, label: string): unknown[] => {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    const nested = Object.values(raw).find(Array.isArray);
    if (nested) {
      return nested;
    }
  }

  logger.warn(`${label} 데이터가 배열 형태가 아닙니다.`, {
    receivedType: typeof raw,
  });
  return [];
};

const readSource = async (
  read: () => Promise<unknown>,
  label: string
): Promise<unknown[]> => {
  try {
    return toEntryArray(await read(), label);
  } catch (error) {
    // 데이터 파일이 아직 없을 수 있다. 분석 전체를 실패시키지 않는다.
    logger.warn(`${label} 데이터를 불러오지 못했습니다.`, {
      reason: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

// ─── Zod 검증 스키마 ───

const gradeScoreTableSchema = z.record(z.string(), z.number());

const bonusRuleSchema = z.object({
  type: z.enum(["percent", "point"]),
  value: z.number(),
});

const conversionFormulaSchema = z.object({
  formulaVersion: z.literal(1),
  totalScore: z.number().positive(),
  ratios: z.object({
    korean: z.number(),
    math: z.number(),
    english: z.number(),
    inquiry: z.number(),
  }),
  metric: z.object({
    korean: z.enum(["standard", "percentile"]),
    math: z.enum(["standard", "percentile"]),
    inquiry: z.enum(["standard", "percentile", "convertedStandard"]),
  }),
  inquiryCount: z.union([z.literal(1), z.literal(2)]),
  convertedStandardTable: z.record(z.string(), z.number()).optional(),
  convertedStandardTableByTrack: z
    .object({
      science: z.record(z.string(), z.number()).nullable(),
      social: z.record(z.string(), z.number()).nullable(),
    })
    .optional(),
  english: z.union([
    z.object({
      type: z.literal("ratioIncluded"),
      scoreByGrade: gradeScoreTableSchema,
    }),
    z.object({ type: z.literal("add"), scoreByGrade: gradeScoreTableSchema }),
    z.object({
      type: z.literal("subtract"),
      penaltyByGrade: gradeScoreTableSchema,
    }),
  ]),
  history: z.union([
    z.object({ type: z.literal("add"), scoreByGrade: gradeScoreTableSchema }),
    z.object({
      type: z.literal("subtract"),
      penaltyByGrade: gradeScoreTableSchema,
    }),
  ]),
  bonus: z
    .object({
      // Partial<Record<MathElective, BonusRule>> 이므로 일부 과목만
      // 기술되는 것이 정상이다. z.record 는 키를 모두 요구한다.
      mathElective: z
        .partialRecord(
          z.enum(["확률과통계", "미적분", "기하"]),
          bonusRuleSchema
        )
        .optional(),
      scienceInquiry: bonusRuleSchema
        .extend({
          appliesTo: z.enum(["each", "total"]),
          minCount: z.literal(2).optional(),
        })
        .optional(),
    })
    .optional(),
  baseMax: z.object({
    korean: z.number().positive(),
    math: z.number().positive(),
    inquiry: z.number().positive(),
  }),
  selection: z
    .object({
      areas: z.array(z.enum(["korean", "math", "english", "inquiry"])).min(2),
      rankRatios: z.array(z.number().nonnegative()).min(1),
      rankBasis: z.enum(["standard", "percentile", "areaScore"]),
    })
    .refine((rule) => rule.rankRatios.length <= rule.areas.length, {
      message: "선택 영역 수가 대상 영역 수보다 많습니다.",
    })
    .optional(),
});

export const admissionPlanSchema = z.object({
  id: z.string().min(1),
  admissionYear: z.literal(2027),
  university: z.string().min(1),
  campus: z.string().optional(),
  department: z.string().min(1),
  category: z.string().min(1),
  region: z.enum(["서울", "수도권", "지방"]),
  group: z.enum(["가", "나", "다"]),
  quota: z.number().int().nonnegative(),
  suneungWeight: z.number().positive().lt(100).optional(),
  statedRatios: z.string().min(1).optional(),
  areaSharesEstimated: z.literal(true).optional(),
  formula: conversionFormulaSchema,
  restrictions: z
    .object({
      math: z.array(z.enum(["확률과통계", "미적분", "기하"])).optional(),
      inquiry: z.enum(["과탐필수", "과탐1과목이상", "제한없음"]).optional(),
    })
    .optional(),
});

const resultCutSchema = z.object({
  metric: z.enum(["percentile", "convertedScore"]),
  value: z.number(),
});

export const admissionResultSchema = z.object({
  planKey: z.string().min(1),
  admissionYear: z.union([z.literal(2024), z.literal(2025), z.literal(2026)]),
  university: z.string().min(1),
  department: z.string().min(1),
  group: z.enum(["가", "나", "다"]),
  quota: z.number().int().nonnegative(),
  competitionRate: z.number().nonnegative().optional(),
  additionalPassCount: z.number().int().nonnegative().optional(),
  cut70: resultCutSchema.optional(),
  cut50: resultCutSchema.optional(),
  average: resultCutSchema.optional(),
});

/** 검증 결과. 유효하지 않은 항목의 인덱스와 사유를 모은다 */
export interface DataValidationResult {
  valid: boolean;
  checkedCount: number;
  errors: string[];
}

/** 최대 보고 오류 수. 수만 건에서 로그가 폭주하지 않도록 제한 */
const MAX_REPORTED_ERRORS = 20;

const validateEntries = (
  entries: unknown[],
  schema: z.ZodType,
  label: string
): DataValidationResult => {
  const errors: string[] = [];

  entries.forEach((entry, index) => {
    if (errors.length >= MAX_REPORTED_ERRORS) {
      return;
    }

    const parsed = schema.safeParse(entry);
    if (parsed.success) {
      return;
    }

    const [issue] = parsed.error.issues;
    const path = issue?.path.join(".") ?? "";
    errors.push(`${label}[${index}] ${path}: ${issue?.message ?? "형식 오류"}`);
  });

  return { valid: errors.length === 0, checkedCount: entries.length, errors };
};

/** 시행계획 데이터 검증 */
export const validateAdmissionPlans = (
  entries: unknown[]
): DataValidationResult =>
  validateEntries(entries, admissionPlanSchema, "시행계획");

/** 입결 데이터 검증 */
export const validateAdmissionResults = (
  entries: unknown[]
): DataValidationResult =>
  validateEntries(entries, admissionResultSchema, "입결");

const runOptionalValidation = (
  entries: unknown[],
  validate: (entries: unknown[]) => DataValidationResult,
  label: string
): void => {
  if (!isValidationEnabled()) {
    return;
  }

  const result = validate(entries);
  if (result.valid) {
    return;
  }

  logger.warn(`${label} 데이터 검증에서 형식 오류를 발견했습니다.`, {
    checkedCount: result.checkedCount,
    errors: result.errors,
  });
};

// ─── 공개 로더 ───

/** 2027학년도 정시 시행계획 전체 */
export const loadAdmissionPlans = async (): Promise<JeongsiAdmissionPlan[]> => {
  if (planCache) {
    return planCache;
  }

  const entries = await readSource(
    () => activeDataSource.readAdmissionPlans(),
    "시행계획"
  );
  runOptionalValidation(entries, validateAdmissionPlans, "시행계획");

  planCache = entries as JeongsiAdmissionPlan[];
  return planCache;
};

/**
 * 분류에 쓸 수 있는 컷이 없는 입결을 경고한다.
 * 데이터 품질 규칙상 cut70 없는 레코드는 넣지 않기로 확정했다
 * (specs/013 §9-7). 세 컷이 모두 없으면 분류가 불가능하다.
 */
const warnMissingCuts = (entries: JeongsiResultEntry[]): void => {
  const missing = entries.filter(
    (entry) => !entry.cut70 && !entry.cut50 && !entry.average
  );
  if (missing.length === 0) {
    return;
  }

  logger.warn("컷이 없는 입결 레코드가 있어 분류에 쓸 수 없습니다.", {
    count: missing.length,
    samplePlanKeys: missing.slice(0, 5).map((entry) => entry.planKey),
  });
};

/** 최근 3개년 정시 입결 전체 */
export const loadAdmissionResults = async (): Promise<JeongsiResultEntry[]> => {
  if (resultCache) {
    return resultCache;
  }

  const entries = await readSource(
    () => activeDataSource.readAdmissionResults(),
    "입결"
  );
  runOptionalValidation(entries, validateAdmissionResults, "입결");

  resultCache = entries as JeongsiResultEntry[];
  warnMissingCuts(resultCache);
  return resultCache;
};

/**
 * planKey → 입결 목록(최신 학년도 우선) 인덱스.
 * 분류 엔진이 모집단위별 입결을 O(1) 로 찾기 위해 사용한다.
 */
export const loadAdmissionResultIndex = async (): Promise<
  Map<string, JeongsiResultEntry[]>
> => {
  const results = await loadAdmissionResults();
  const index = new Map<string, JeongsiResultEntry[]>();

  for (const entry of results) {
    const bucket = index.get(entry.planKey);
    if (bucket) {
      bucket.push(entry);
      continue;
    }
    index.set(entry.planKey, [entry]);
  }

  for (const bucket of index.values()) {
    bucket.sort((a, b) => b.admissionYear - a.admissionYear);
  }

  return index;
};
