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
  throw new Error("Not implemented");
}

/**
 * Safely writes a value to localStorage as JSON.
 * Returns {ok: true} on success.
 * Returns {ok: false, error: string} on QuotaExceededError.
 * Never throws or logs errors.
 */
export function safeWrite(key: string, value: unknown): SaveResult {
  throw new Error("Not implemented");
}
