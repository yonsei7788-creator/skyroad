/**
 * Gemini 컨텍스트 캐시 매니저
 *
 * COMMON_SYSTEM_PROMPT(~12k tokens)를 파이프라인 시작 시 1회 캐싱하여
 * 전체 섹션 호출에서 입력 토큰/TTFT를 크게 절감한다.
 *
 * - TTL: 10분 (파이프라인은 5분 내 종료되므로 여유 있게 설정)
 * - 모델: gemini-2.5-flash-lite (DEFAULT_MODEL과 일치해야 캐시 사용됨).
 * - 캐시 생성 실패 시 조용히 null 반환 → 파이프라인은 정상 동작 (fallback 경로)
 */

import { GoogleAICacheManager } from "@google/generative-ai/server";
import type { CachedContent } from "@google/generative-ai/server";

// 캐시 모델은 gemini-client.ts의 DEFAULT_MODEL과 반드시 일치해야 함.
// getGenerativeModelFromCachedContent 호출 시 여기 지정한 모델로 실제 요청이 나감.
const CACHE_MODEL = "models/gemini-2.5-flash-lite";
const CACHE_TTL_SECONDS = 600;

export interface PipelineCacheHandle {
  cachedContent: CachedContent;
  manager: GoogleAICacheManager;
}

/**
 * COMMON_SYSTEM_PROMPT를 캐시 콘텐츠로 등록한다.
 * 실패 시 null 반환 — 호출자는 캐시 없이 정상 호출 경로로 폴백해야 한다.
 */
export const createPipelineCache = async (
  apiKey: string,
  commonSystemPrompt: string,
  reportId: string
): Promise<PipelineCacheHandle | null> => {
  try {
    const manager = new GoogleAICacheManager(apiKey);
    // systemInstruction만 캐시 — contents는 필수 필드지만 placeholder용 최소 content 주입.
    // 사용자 프롬프트는 호출 시점에 주입되며, 캐시된 contents는 모든 호출에서 항상 먼저 노출됨.
    const cachedContent = await manager.create({
      model: CACHE_MODEL,
      systemInstruction: commonSystemPrompt,
      contents: [
        {
          role: "user",
          parts: [{ text: "ready" }],
        },
      ],
      ttlSeconds: CACHE_TTL_SECONDS,
      displayName: `report-${reportId}`,
    });
    console.log(
      `[report:${reportId}] 컨텍스트 캐시 생성: ${cachedContent.name} (TTL ${CACHE_TTL_SECONDS}s)`
    );
    return { cachedContent, manager };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[report:${reportId}] 컨텍스트 캐시 생성 실패 — 캐시 없이 진행: ${msg}`
    );
    return null;
  }
};

/**
 * 캐시 삭제. 실패해도 무시 (TTL로 자동 만료됨).
 */
export const deletePipelineCache = async (
  handle: PipelineCacheHandle | null,
  reportId: string
): Promise<void> => {
  if (!handle?.cachedContent.name) return;
  try {
    await handle.manager.delete(handle.cachedContent.name);
    console.log(
      `[report:${reportId}] 컨텍스트 캐시 삭제: ${handle.cachedContent.name}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[report:${reportId}] 캐시 삭제 실패 (무시): ${msg}`);
  }
};
