/**
 * Purchase record operations.
 * Reads and writes pp.purchases in localStorage.
 */

import type { Purchase } from "@/lib/types";
import { safeRead, safeWrite } from "@/lib/storage";

const STORAGE_KEY = "pp.purchases";

/**
 * Get all purchase records from localStorage.
 * Returns empty array if pp.purchases is missing or corrupted.
 */
export function getPurchases(): Purchase[] {
  return safeRead<Purchase[]>(STORAGE_KEY, []);
}

/**
 * Record a new purchase.
 */
export function addPurchase(promptId: string, pricePaidWon: number): void {
  const purchase: Purchase = {
    promptId,
    pricePaidWon,
    purchasedAt: Date.now(),
  };

  const purchases = getPurchases();
  safeWrite(STORAGE_KEY, [...purchases, purchase]);
}
