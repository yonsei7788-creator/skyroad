import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Schema, GenerativeModel } from "@google/generative-ai";

import { isRetryableError, is503Error } from "./retry.ts";
import type { PipelineCacheHandle } from "./cache-manager.ts";

const CALL_TIMEOUT_MS = 300_000; // 5분
// maxOutputTokens는 Gemini가 요청 처리에 필요한 용량을 예약하는 기준.
// 과대 할당(65536 등)은 "model overloaded"(503)를 직접 유발함.
// 실측(2026-04): flash + maxOutputTokens=65536 → 33% 503 / 8192 → 100% 200.
// 기본값을 실제 섹션 출력 상한(~10k 토큰)의 여유분 포함한 16384로 하향.
// 더 큰 출력이 필요한 섹션은 호출별 오버라이드 사용.
const MAX_OUTPUT_TOKENS = 16384;

// ─── 503 폴백 전략 ───
// 기본 시도 체인:
//   primary × 모든 키 → fallback1 × 최대 2키 → fallback2 × 최대 2키
// 각 시도 사이에 지수 백오프 + ±40% 지터, (model, keyIndex) 단위 쿨다운 30s.
//
// strictModel=true(품질 민감 섹션): primary만 유지, 모든 키 사용 + 동일 키 1회 추가 재시도.

const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 60_000;
const BACKOFF_MULTIPLIER = 1.5;
const JITTER_RATIO = 0.4;
const COOLDOWN_MS = 30_000;

export type GeminiModelName = "gemini-2.5-flash" | "gemini-2.5-flash-lite";

// 2026-04 실측: gemini-2.5-flash는 Google 인프라 용량 이슈로 거의 100% 503.
// gemini-2.5-flash-lite는 동일 부하에서 100% 성공.
// → 모든 섹션을 flash-lite로 통일. flash는 현재 503 상태라 폴백도 의미 없음.
// flash가 복구되면 여기서 DEFAULT_MODEL만 flash로 되돌리면 됨.
const DEFAULT_MODEL: GeminiModelName = "gemini-2.5-flash-lite";

/** primary 모델별 폴백 체인.
 *  flash가 현재 무조건 503이므로 flash-lite의 폴백으로도 무의미 → 빈 배열.
 *  복구 후 재설정 가능하도록 구조는 유지. */
const FALLBACK_CHAIN: Record<GeminiModelName, GeminiModelName[]> = {
  "gemini-2.5-flash": ["gemini-2.5-flash-lite"],
  "gemini-2.5-flash-lite": [],
};

interface AttemptStep {
  model: GeminiModelName;
  keyIndex: number;
}

/** 단일 키 시나리오에서도 일시 오류에 대한 최소 재시도를 보장. */
const MIN_ATTEMPTS = 3;

const buildAttemptSequence = (
  primary: GeminiModelName,
  numKeys: number,
  allowDowngrade: boolean
): AttemptStep[] => {
  const seq: AttemptStep[] = [];

  // 1) primary 모델을 모든 키로 시도
  for (let k = 0; k < numKeys; k++) {
    seq.push({ model: primary, keyIndex: k });
  }

  // 2) 폴백 모델: 최대 2개 키
  if (allowDowngrade) {
    const fallbacks = FALLBACK_CHAIN[primary];
    const fallbackKeyCount = Math.min(2, numKeys);
    for (const fb of fallbacks) {
      for (let k = 0; k < fallbackKeyCount; k++) {
        seq.push({ model: fb, keyIndex: k });
      }
    }
  }

  // 3) 시도 수가 MIN_ATTEMPTS 미만이면 primary+k0로 채움 (단일 키/폴백 없음 시나리오)
  while (seq.length < MIN_ATTEMPTS) {
    seq.push({ model: primary, keyIndex: 0 });
  }

  return seq;
};

// ─── (model, keyIndex) 쿨다운 맵 (프로세스 전역 — 파이프라인 내 병렬 태스크 공유) ───
const cooldownUntil = new Map<string, number>();
const cooldownKey = (model: string, keyIndex: number) => `${model}|${keyIndex}`;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const applyJitter = (baseMs: number): number => {
  const jitter = baseMs * JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(0, baseMs + jitter);
};

// ─── Call 옵션 ───

export interface GeminiCallOptions {
  /** 시스템 프롬프트 가변 부분 (캐시 모드: user prompt 선두 주입 / 비캐시: systemInstruction 하단 주입) */
  systemPrefix: string;
  prompt: string;
  responseSchema: Schema;
  temperature?: number;
  thinkingBudget?: number;
  seed?: number;
  maxOutputTokens?: number;
  /** 호출별 primary 모델 오버라이드. */
  model?: GeminiModelName;
  /**
   * true이면 primary 모델만 고수 (키 로테이션만 허용, 다른 모델로 폴백 금지).
   * 품질 민감 섹션(subjectAnalysis/consultantReview/admissionStrategy)에서 사용.
   */
  strictModel?: boolean;
}

export interface GeminiCallResult<T> {
  data: T;
  tokensUsed: {
    input: number;
    output: number;
  };
}

export interface KeyContext {
  apiKey: string;
  genAI: GoogleGenerativeAI;
  /** 이 키로 생성된 캐시 핸들 (없으면 non-cached 경로). */
  cacheHandle: PipelineCacheHandle | null;
}

export interface CreateGeminiClientOptions {
  apiKeys: string[];
  /** apiKeys와 인덱스가 1:1 매핑되는 캐시 핸들 배열 (없는 자리는 null). */
  cacheHandles?: Array<PipelineCacheHandle | null>;
  commonSystemPrompt: string;
}

import { jsonrepair } from "jsonrepair";

const repairJson = (text: string): string => {
  return jsonrepair(text.trim());
};

export const createGeminiClient = (opts: CreateGeminiClientOptions) => {
  const { apiKeys, cacheHandles, commonSystemPrompt } = opts;
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error("createGeminiClient: at least one API key required");
  }

  const keys: KeyContext[] = apiKeys.map((apiKey, i) => ({
    apiKey,
    genAI: new GoogleGenerativeAI(apiKey),
    cacheHandle: cacheHandles?.[i] ?? null,
  }));

  /** 단일 (keyContext, model) 호출 — 1회 시도, 재시도 없음. */
  const doCall = async <T>(
    keyCtx: KeyContext,
    modelName: GeminiModelName,
    options: GeminiCallOptions
  ): Promise<GeminiCallResult<T>> => {
    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      maxOutputTokens: options.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      temperature: options.temperature ?? 0,
    };
    if (options.seed !== undefined) {
      generationConfig.seed = options.seed;
    }
    if (
      options.responseSchema &&
      Object.keys(options.responseSchema).length > 0
    ) {
      generationConfig.responseSchema = options.responseSchema;
    }
    if (options.thinkingBudget !== undefined) {
      generationConfig.thinkingConfig = {
        thinkingBudget: options.thinkingBudget,
      };
    }

    // 캐시는 primary 모델(flash) + 해당 키의 cacheHandle이 있을 때만 사용.
    const useCache = !!keyCtx.cacheHandle && modelName === DEFAULT_MODEL;

    let model: GenerativeModel;
    let userPromptText: string;

    if (useCache && keyCtx.cacheHandle) {
      model = keyCtx.genAI.getGenerativeModelFromCachedContent(
        keyCtx.cacheHandle.cachedContent,
        { generationConfig }
      );
      userPromptText = `${options.systemPrefix}\n\n${options.prompt}`;
    } else {
      const fullSystemInstruction = `${commonSystemPrompt}\n\n${options.systemPrefix}`;
      model = keyCtx.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: fullSystemInstruction,
        generationConfig,
      });
      userPromptText = options.prompt;
    }

    const startMs = Date.now();
    console.log(
      `[gemini:${modelName}${useCache ? "+cache" : ""}] call start (prompt length=${userPromptText.length})`
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

    try {
      const response = await model.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: userPromptText }] }],
        },
        { signal: controller.signal }
      );

      const elapsed = Date.now() - startMs;
      const { candidates } = response.response;
      if (!candidates || candidates.length === 0) {
        const blockReason = response.response.promptFeedback?.blockReason;
        throw new Error(
          `Gemini returned no candidates${blockReason ? ` (blockReason: ${blockReason})` : ""}`
        );
      }
      const [firstCandidate] = candidates;
      const { finishReason } = firstCandidate;
      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        throw new Error(
          `Gemini response blocked (finishReason: ${finishReason})`
        );
      }

      const text = response.response.text();
      const usage = response.response.usageMetadata;
      const cachedTokens =
        (usage as { cachedContentTokenCount?: number })
          ?.cachedContentTokenCount ?? 0;
      console.log(
        `[gemini:${modelName}] call done (${elapsed}ms, in=${usage?.promptTokenCount ?? "?"}, cached=${cachedTokens}, out=${usage?.candidatesTokenCount ?? "?"}, len=${text?.length ?? 0}, finish=${finishReason})`
      );

      if (!text || text.trim().length === 0) {
        throw new Error("Gemini returned empty response");
      }

      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        const preview = trimmed.slice(0, 200);
        throw new Error(`Gemini returned non-JSON response: "${preview}"`);
      }

      let parsed: T;
      try {
        parsed = JSON.parse(text) as T;
      } catch {
        console.warn(
          `[gemini] JSON parse failed (length=${text.length}), attempting repair...`
        );
        const repaired = repairJson(text);
        parsed = JSON.parse(repaired) as T;
        console.info(`[gemini] JSON repair succeeded`);
      }

      return {
        data: parsed,
        tokensUsed: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const call = async <T>(
    options: GeminiCallOptions
  ): Promise<GeminiCallResult<T>> => {
    const primary = options.model ?? DEFAULT_MODEL;
    const allowDowngrade = !options.strictModel;
    const sequence = buildAttemptSequence(primary, keys.length, allowDowngrade);

    let lastError: unknown;
    let attemptCount = 0;

    for (let i = 0; i < sequence.length; i++) {
      const { model, keyIndex } = sequence[i];
      const cdKey = cooldownKey(model, keyIndex);
      const cdUntil = cooldownUntil.get(cdKey) ?? 0;
      const now = Date.now();

      // 쿨다운 중인 (model, key)는 skip — 단, 남은 시퀀스에 **다른 조합**이 있을 때만.
      // 모든 남은 시도가 동일 조합이면 skip해봤자 의미 없으므로 백오프 후 진행.
      if (cdUntil > now) {
        const hasAlternative = sequence
          .slice(i + 1)
          .some((s) => s.model !== model || s.keyIndex !== keyIndex);
        if (hasAlternative) {
          console.log(
            `[gemini] skip ${model}+k${keyIndex} (cooldown ${cdUntil - now}ms)`
          );
          continue;
        }
      }

      // 재시도 간 백오프 (첫 시도는 0s)
      if (attemptCount > 0) {
        const base = Math.min(
          BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attemptCount - 1),
          BACKOFF_MAX_MS
        );
        const wait = applyJitter(base);
        await sleep(wait);
      }

      attemptCount++;

      try {
        return await doCall<T>(keys[keyIndex], model, options);
      } catch (err) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);

        // 재시도 불가 오류(safety 블록 등)는 즉시 throw
        if (!isRetryableError(err)) {
          console.warn(
            `[gemini] non-retryable error on ${model}+k${keyIndex}: ${errMsg.slice(0, 150)}`
          );
          throw err;
        }

        if (is503Error(err)) {
          cooldownUntil.set(cdKey, Date.now() + COOLDOWN_MS);
        }

        console.warn(
          `[gemini] attempt ${attemptCount}/${sequence.length} (${model}+k${keyIndex}) failed: ${errMsg.slice(0, 150)}`
        );
      }
    }

    throw lastError ?? new Error("Gemini 호출 시퀀스 소진");
  };

  return { call };
};

export type GeminiClient = ReturnType<typeof createGeminiClient>;
