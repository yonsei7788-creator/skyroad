import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";

import { withRetry, DEFAULT_RETRY_CONFIG } from "./retry.ts";
import type { RetryConfig } from "./retry.ts";

const CALL_TIMEOUT_MS = 300_000; // 5분
const MAX_OUTPUT_TOKENS = 65536;

export interface GeminiCallOptions {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  temperature?: number;
  retryConfig?: RetryConfig;
  /** 0 = thinking OFF, positive = thinking budget tokens. undefined = model default */
  thinkingBudget?: number;
}

export interface GeminiCallResult<T> {
  data: T;
  tokensUsed: {
    input: number;
    output: number;
  };
}

import { jsonrepair } from "jsonrepair";

/**
 * 잘못되거나 잘린 JSON 응답을 복구한다.
 * - 이스케이프되지 않은 따옴표/줄바꿈
 * - 후행 콤마
 * - 따옴표 없는 프로퍼티 키
 * - 잘린 JSON (maxOutputTokens 도달)
 */
const repairJson = (text: string): string => {
  return jsonrepair(text.trim());
};

export const createGeminiClient = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);

  const call = async <T>(
    options: GeminiCallOptions
  ): Promise<GeminiCallResult<T>> => {
    const {
      systemInstruction,
      prompt,
      responseSchema,
      temperature = 0,
      retryConfig = DEFAULT_RETRY_CONFIG,
      thinkingBudget,
    } = options;

    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature,
    };

    // responseSchema가 비어있지 않으면 Gemini structured output 활성화
    if (responseSchema && Object.keys(responseSchema).length > 0) {
      generationConfig.responseSchema = responseSchema;
    }

    if (thinkingBudget !== undefined) {
      generationConfig.thinkingConfig = {
        thinkingBudget,
      };
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
      generationConfig,
    });

    const result = await withRetry(async () => {
      const startMs = Date.now();
      console.log(`[gemini] call start (prompt length=${prompt.length})`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

      try {
        const response = await model.generateContent(
          {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
          { signal: controller.signal }
        );

        const elapsed = Date.now() - startMs;

        // 차단된 응답 감지 (safety filter, empty candidates)
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
        console.log(
          `[gemini] call done (${elapsed}ms, in=${usage?.promptTokenCount ?? "?"}, out=${usage?.candidatesTokenCount ?? "?"}, len=${text?.length ?? 0})`
        );

        if (!text || text.trim().length === 0) {
          throw new Error("Gemini returned empty response");
        }

        // JSON이 아닌 응답 감지 (에러 메시지, 차단된 응답 등)
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
    }, retryConfig);

    return result;
  };

  return { call };
};

export type GeminiClient = ReturnType<typeof createGeminiClient>;
