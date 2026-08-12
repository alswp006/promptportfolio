/**
 * Seed data initialization.
 * Ensures pp.prompts is populated with default prompts on first use.
 *
 * TDD Red phase: stubs only. Implementation will be written in Green phase.
 */

/**
 * Initialize seed data if pp.prompts is empty or corrupted.
 *
 * Idempotent: if valid seed data already exists, does nothing.
 * On first run, writes 8+ prompts covering all 8 categories:
 * "마케팅", "재무", "PM", "법무", "개발", "디자인", "HR", "기타"
 */
export async function ensureSeeded(): Promise<void> {
  throw new Error("Not implemented: ensureSeeded()");
}
