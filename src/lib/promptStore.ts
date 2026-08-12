/**
 * Prompt CRUD operations.
 * Reads and writes pp.prompts in localStorage.
 */

import type { Prompt, SaveResult } from "@/lib/types";
import { safeRead, safeWrite } from "@/lib/storage";

const STORAGE_KEY = "pp.prompts";

/**
 * Get all prompts from localStorage.
 * Returns empty array if pp.prompts is missing or corrupted.
 */
export function getPrompts(): Prompt[] {
  return safeRead<Prompt[]>(STORAGE_KEY, []);
}

/**
 * Get a single prompt by ID.
 * Returns undefined if not found.
 */
export function getPromptById(id: string): Prompt | undefined {
  return getPrompts().find((p) => p.id === id);
}

/**
 * Save a new prompt.
 * Auto-generates id (UUID), version=1, usedCount=0, createdAt===updatedAt.
 *
 * @param input Prompt input (without id, version, usedCount, timestamps)
 * @returns {ok: true; id: string} on success, {ok: false; error: string} on failure
 */
export function savePrompt(
  input: Omit<Prompt, "id" | "version" | "usedCount" | "createdAt" | "updatedAt">,
): SaveResult {
  const now = Date.now();
  const prompt: Prompt = {
    ...input,
    id: crypto.randomUUID(),
    version: 1,
    usedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const prompts = getPrompts();
  const result = safeWrite(STORAGE_KEY, [...prompts, prompt]);

  if (!result.ok) {
    return { ok: false, error: result.error ?? "저장에 실패했습니다" };
  }
  return { ok: true, id: prompt.id };
}
