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

const isRetryableError = (
  error: unknown,
  retryableStatuses: number[]
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
    message.includes("response blocked")
  ) {
    return true;
  }

  return false;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

      const errMsg = error instanceof Error ? error.message : String(error);
      const errName =
        error instanceof Error ? error.constructor.name : "Unknown";
      const errStack =
        error instanceof Error ? error.stack?.split("\n")[1]?.trim() : "";
      console.warn(
        `[retry] Attempt ${attempt + 1}/${config.maxRetries} failed (${errName}), retrying in ${delay}ms...\n  message: ${errMsg}\n  at: ${errStack}`
      );

      await sleep(delay);
    }
  }

  throw lastError;
};
