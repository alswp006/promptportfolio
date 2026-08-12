import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeRead, safeWrite } from "@/lib/storage";

interface TestData {
  name: string;
  value: number;
}

interface SaveResult {
  ok: boolean;
  error?: string;
}

describe("저장소 기반 헬퍼 (safeRead/safeWrite)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC-1[P0]: safeRead returns value when key exists and JSON is valid
  it("AC-1[P0]: safeRead should return parsed value for valid JSON", () => {
    const testData: TestData = { name: "John", value: 42 };
    localStorage.setItem("test-key", JSON.stringify(testData));

    const result = safeRead<TestData>("test-key", { name: "default", value: 0 });

    expect(result).toEqual({ name: "John", value: 42 });
    expect(result.name).toBe("John");
    expect(result.value).toBe(42);
  });

  // AC-1[P0]: safeRead returns fallback when key doesn't exist
  it("AC-1[P0]: safeRead should return fallback when key does not exist", () => {
    const fallback: TestData = { name: "fallback", value: 99 };

    const result = safeRead<TestData>("nonexistent-key", fallback);

    expect(result).toEqual({ name: "fallback", value: 99 });
    expect(result.name).toBe("fallback");
    expect(result.value).toBe(99);
  });

  // AC-1[P0]: safeRead returns fallback on JSON parse error (malformed JSON)
  it("AC-1[P0]: safeRead should return fallback when JSON parsing fails", () => {
    localStorage.setItem("invalid-json", "{invalid json string");
    const fallback: TestData = { name: "default", value: 0 };

    const result = safeRead<TestData>("invalid-json", fallback);

    expect(result).toEqual({ name: "default", value: 0 });
    expect(result.name).toBe("default");
    expect(result.value).toBe(0);
  });

  // AC-1[P0]: safeRead does not throw on parsing errors
  it("AC-1[P0]: safeRead should not throw on malformed JSON", () => {
    localStorage.setItem("broken-json", "clearly not json{]");

    expect(() => {
      safeRead("broken-json", "fallback");
    }).not.toThrow();
  });

  // AC-1[P0]: safeRead handles null/empty string values
  it("AC-1[P0]: safeRead should handle null stored value gracefully", () => {
    localStorage.setItem("null-value", "null");
    const fallback = "default-string";

    const result = safeRead<string>("null-value", fallback);

    // null is valid JSON, so it should parse to null
    expect(result).toBeNull();
  });

  // AC-2[P0]: safeWrite succeeds and returns {ok:true}
  it("AC-2[P0]: safeWrite should return {ok:true} on successful write", () => {
    const testData: TestData = { name: "Alice", value: 100 };

    const result = safeWrite("data-key", testData);

    expect(result).toEqual({ ok: true });
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify data was actually stored
    const stored = localStorage.getItem("data-key");
    expect(stored).toBe(JSON.stringify(testData));
  });

  // AC-2[P0]: safeWrite returns error object on QuotaExceededError
  it("AC-2[P0]: safeWrite should return {ok:false, error} on QuotaExceededError", () => {
    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = localStorage.setItem;
    const quotaError = new Error("storage full");
    quotaError.name = "QuotaExceededError";

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    const result = safeWrite("key", "value");

    expect(result).toEqual({ ok: false, error: "저장 공간이 부족합니다" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("저장 공간이 부족합니다");
  });

  // AC-2[P0]: safeWrite does not throw on QuotaExceededError
  it("AC-2[P0]: safeWrite should not throw on QuotaExceededError", () => {
    const quotaError = new Error("storage limit");
    quotaError.name = "QuotaExceededError";

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    expect(() => {
      safeWrite("key", "value");
    }).not.toThrow();
  });

  // AC-3: console.error should never be called inside safeRead/safeWrite
  it("AC-3: safeRead should not call console.error on parse failure", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("bad-json", "{broken");

    safeRead("bad-json", "fallback");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("AC-3: safeWrite should not call console.error on QuotaExceededError", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const quotaError = new Error("quota");
    quotaError.name = "QuotaExceededError";

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    safeWrite("key", "value");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // AC-2[P0]: safeWrite handles complex objects
  it("AC-2[P0]: safeWrite should serialize complex objects correctly", () => {
    const complexData = {
      nested: { level: 2 },
      array: [1, 2, 3],
      date: "2026-08-13",
    };

    const result = safeWrite("complex-key", complexData);

    expect(result).toEqual({ ok: true });
    expect(result.ok).toBe(true);

    // Verify it was stored correctly
    const stored = localStorage.getItem("complex-key");
    expect(stored).toBe(JSON.stringify(complexData));
  });

  // AC-1[P0]: safeRead handles primitive types (strings, numbers, booleans)
  it("AC-1[P0]: safeRead should handle primitive JSON types (string)", () => {
    localStorage.setItem("string-key", JSON.stringify("hello world"));

    const result = safeRead<string>("string-key", "default");

    expect(result).toBe("hello world");
  });

  it("AC-1[P0]: safeRead should handle primitive JSON types (number)", () => {
    localStorage.setItem("number-key", JSON.stringify(42));

    const result = safeRead<number>("number-key", 0);

    expect(result).toBe(42);
  });

  it("AC-1[P0]: safeRead should handle primitive JSON types (boolean)", () => {
    localStorage.setItem("bool-key", JSON.stringify(true));

    const result = safeRead<boolean>("bool-key", false);

    expect(result).toBe(true);
  });

  // AC-1[P0]: safeRead with empty string fallback
  it("AC-1[P0]: safeRead should return empty string fallback when key missing", () => {
    const result = safeRead<string>("missing", "");

    expect(result).toBe("");
  });

  // AC-2[P0]: safeWrite with empty string value
  it("AC-2[P0]: safeWrite should handle empty string values", () => {
    const result = safeWrite("empty-key", "");

    expect(result).toEqual({ ok: true });
    expect(result.ok).toBe(true);
  });
});
