/**
 * 재시도 헬퍼 (gemini-client 외 용도).
 *
 * Gemini 호출의 재시도/폴백/키 로테이션은 gemini-client.ts의 attempt sequence에서
 * 통합 관리한다. 이 파일은 기존 호환성을 위해 최소 유틸만 유지.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 2000,
  maxDelay: 8000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503],
};

/**
 * error가 일시적(재시도 가능) 오류인지 판정.
 * Gemini 호출의 overload/timeout/블록/JSON 파싱 실패 등을 포함.
 */
export const isRetryableError = (
  error: unknown,
  retryableStatuses: number[] = DEFAULT_RETRY_CONFIG.retryableStatuses
): boolean => {
  if (!(error instanceof Error)) return false;

  // JSON 파싱 실패 (잘린 응답 복구도 실패한 경우) → 재시도
  if (error instanceof SyntaxError) return true;

  const { message } = error;

  for (const status of retryableStatuses) {
    if (message.includes(String(status))) return true;
  }

  if (
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("network") ||
    message.includes("aborted") ||
    message.includes("AbortError") ||
    message.includes("non-JSON response") ||
    message.includes("no candidates") ||
    message.includes("response blocked") ||
    message.includes("overloaded") ||
    message.includes("UNAVAILABLE")
  ) {
    return true;
  }

  return false;
};

/** 503(모델 과부하) 특정 판정 — 쿨다운 트리거용 */
export const is503Error = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const { message } = error;
  return (
    message.includes("503") ||
    message.includes("overloaded") ||
    message.includes("UNAVAILABLE")
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 레거시 단순 재시도 — 현재 Gemini 호출 경로에선 사용하지 않지만
 * 기존 import 호환을 위해 유지.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === config.maxRetries) break;
      if (!isRetryableError(error, config.retryableStatuses)) break;

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError;
};
