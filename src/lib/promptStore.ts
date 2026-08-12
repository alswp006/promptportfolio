/**
 * Prompt CRUD operations.
 * Reads and writes pp.prompts in localStorage.
 *
 * TDD Red phase: stubs only. Implementation will be written in Green phase.
 */

import type { Prompt, SaveResult } from "@/lib/types";

/**
 * Get all prompts from localStorage.
 * Returns empty array if pp.prompts is missing or corrupted.
 */
export function getPrompts(): Prompt[] {
  throw new Error("Not implemented: getPrompts()");
}

/**
 * Get a single prompt by ID.
 * Returns undefined if not found.
 */
export function getPromptById(id: string): Prompt | undefined {
  throw new Error("Not implemented: getPromptById()");
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
  throw new Error("Not implemented: savePrompt()");
}
