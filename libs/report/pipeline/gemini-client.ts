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

/**
 * 잘린 JSON 응답을 복구한다.
 * Gemini가 maxOutputTokens에 도달하면 JSON이 중간에 끊길 수 있음.
 */
const repairTruncatedJson = (text: string): string => {
  let json = text.trim();

  // 1차 시도
  try {
    JSON.parse(json);
    return json;
  } catch {
    // 복구 진행
  }

  // 열린 괄호/중괄호를 추적하여 닫기
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack[stack.length - 1] === ch) {
      stack.pop();
    }
  }

  // 문자열이 열려있으면 닫기
  if (inString) json += '"';

  // 후행 콤마 제거
  json = json.replace(/,\s*$/, "");

  // 남은 열린 괄호 닫기
  while (stack.length > 0) json += stack.pop();

  return json;
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
        const text = response.response.text();
        const usage = response.response.usageMetadata;
        console.log(
          `[gemini] call done (${elapsed}ms, in=${usage?.promptTokenCount ?? "?"}, out=${usage?.candidatesTokenCount ?? "?"}, len=${text?.length ?? 0})`
        );

        if (!text || text.trim().length === 0) {
          throw new Error("Gemini returned empty response");
        }

        let parsed: T;
        try {
          parsed = JSON.parse(text) as T;
        } catch {
          console.warn(
            `[gemini] JSON parse failed (length=${text.length}), attempting repair...`
          );
          const repaired = repairTruncatedJson(text);
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
