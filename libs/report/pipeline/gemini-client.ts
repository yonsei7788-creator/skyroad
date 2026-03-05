import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";

import { withRetry, DEFAULT_RETRY_CONFIG } from "./retry.ts";
import type { RetryConfig } from "./retry.ts";

const CALL_TIMEOUT_MS = 60_000;

export interface GeminiCallOptions {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  temperature?: number;
  retryConfig?: RetryConfig;
}

export interface GeminiCallResult<T> {
  data: T;
  tokensUsed: {
    input: number;
    output: number;
  };
}

const createAbortSignal = (timeoutMs: number): AbortSignal => {
  return AbortSignal.timeout(timeoutMs);
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
      temperature = 0.3,
      retryConfig = DEFAULT_RETRY_CONFIG,
    } = options;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature,
      },
    });

    const result = await withRetry(async () => {
      const response = await model.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        },
        { signal: createAbortSignal(CALL_TIMEOUT_MS) }
      );

      const text = response.response.text();
      if (!text || text.trim().length === 0) {
        throw new Error("Gemini returned empty response");
      }

      const parsed = JSON.parse(text) as T;

      const usage = response.response.usageMetadata;

      return {
        data: parsed,
        tokensUsed: {
          input: usage?.promptTokenCount ?? 0,
          output: usage?.candidatesTokenCount ?? 0,
        },
      };
    }, retryConfig);

    return result;
  };

  return { call };
};

export type GeminiClient = ReturnType<typeof createGeminiClient>;
