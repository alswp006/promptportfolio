/**
 * Settlement calculations: used-count tracking, sale records, and flags.
 * Reads and writes pp.usedCounts, pp.sales, pp.flags in localStorage.
 */

import type { Prompt, SaleRecord, UsedCounts, Flags } from "@/lib/types";
import { safeRead, safeWrite } from "@/lib/storage";

const USED_COUNTS_KEY = "pp.usedCounts";
const SALES_KEY = "pp.sales";
const FLAGS_KEY = "pp.flags";
const PROMPTS_KEY = "pp.prompts";

const COMMISSION_RATE = 0.2;

/**
 * Get the used-count map from localStorage.
 * Returns empty object if pp.usedCounts is missing or corrupted.
 */
export function getUsedCounts(): UsedCounts {
  return safeRead<UsedCounts>(USED_COUNTS_KEY, {});
}

/**
 * Increment a prompt's used count.
 * Updates pp.usedCounts[id] and the corresponding Prompt.usedCount together.
 */
export function incrementUsed(id: string): void {
  const used = getUsedCounts();
  const nextCount = (used[id] ?? 0) + 1;
  safeWrite(USED_COUNTS_KEY, { ...used, [id]: nextCount });

  const prompts = safeRead<Prompt[]>(PROMPTS_KEY, []);
  const updated = prompts.map((p) =>
    p.id === id ? { ...p, usedCount: nextCount, updatedAt: Date.now() } : p,
  );
  safeWrite(PROMPTS_KEY, updated);
}

/**
 * Get all sale records from localStorage.
 * Returns empty array if pp.sales is missing or corrupted.
 */
export function getSales(): SaleRecord[] {
  return safeRead<SaleRecord[]>(SALES_KEY, []);
}

/**
 * Record a sale for a prompt.
 * commissionWon = floor(grossWon * 20%), netWon = grossWon - commissionWon.
 */
export function recordSale(prompt: Prompt): void {
  const grossWon = prompt.priceWon;
  const commissionWon = Math.floor(grossWon * COMMISSION_RATE);
  const sale: SaleRecord = {
    id: crypto.randomUUID(),
    promptId: prompt.id,
    promptTitle: prompt.title,
    grossWon,
    commissionWon,
    netWon: grossWon - commissionWon,
    soldAt: Date.now(),
  };

  const sales = getSales();
  safeWrite(SALES_KEY, [...sales, sale]);
}

/**
 * Get flags from localStorage.
 * Returns empty object if pp.flags is missing or corrupted.
 */
export function getFlags(): Flags {
  return safeRead<Flags>(FLAGS_KEY, {});
}

/**
 * Set the onboardedSeller flag, preserving other flags.
 */
export function setOnboardedSeller(value: boolean): void {
  const flags = getFlags();
  safeWrite(FLAGS_KEY, { ...flags, onboardedSeller: value });
}
