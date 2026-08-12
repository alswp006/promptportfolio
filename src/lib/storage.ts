export interface SaveResult {
  ok: boolean;
  error?: string;
}

/**
 * Safely reads a value from localStorage and parses it as JSON.
 * Returns the fallback value if the key doesn't exist or JSON parsing fails.
 * Never throws or logs errors.
 */
export function safeRead<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely writes a value to localStorage as JSON.
 * Returns {ok: true} on success.
 * Returns {ok: false, error: string} on QuotaExceededError.
 * Never throws or logs errors.
 */
export function safeWrite(key: string, value: unknown): SaveResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: "저장 공간이 부족합니다" };
  }
}
