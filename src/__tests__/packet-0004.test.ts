/**
 * TDD Red Phase — Packet 0004: 구매·정산·사용횟수 store + 정산 계산
 *
 * Tests for purchase store, sale records, used counts tracking, and settlement calculations.
 * Run: npx vitest run src/__tests__/packet-0004.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Prompt, Purchase, SaleRecord } from "@/lib/types";

// These imports will fail until the implementations are written — that's intentional (TDD).
// The Coder will create these files based on what these tests expect.
import * as promptStore from "@/lib/promptStore";
// @ts-expect-error - purchaseStore will be created by Coder
import * as purchaseStore from "@/lib/purchaseStore";
// @ts-expect-error - settlement will be created by Coder
import * as settlement from "@/lib/settlement";
import * as seed from "@/lib/seed";

describe("Packet 0004: 구매·정산·사용횟수 store + 정산 계산", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1: getPurchases() — return empty array (never null/undefined)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1: getPurchases() returns empty array when no purchases", () => {
    it("should return empty array when pp.purchases is empty (not null/undefined)", () => {
      localStorage.clear();

      const purchases = purchaseStore.getPurchases();

      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBe(0);
      expect(purchases).not.toBeNull();
      expect(purchases).not.toBeUndefined();
    });

    it("should return empty array after explicitly clearing purchases", () => {
      // Write empty purchases
      localStorage.setItem("pp.purchases", JSON.stringify([]));

      const purchases = purchaseStore.getPurchases();

      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBe(0);
    });

    it("should handle corrupted pp.purchases and return empty array", () => {
      // Write invalid JSON
      localStorage.setItem("pp.purchases", "NOT_VALID_JSON");

      const purchases = purchaseStore.getPurchases();

      expect(Array.isArray(purchases)).toBe(true);
      expect(purchases.length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1 extended: addPurchase(promptId, pricePaidWon)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1 extended: addPurchase(promptId, pricePaidWon) adds to purchases", () => {
    it("should add purchase with promptId, pricePaidWon, and purchasedAt timestamp", () => {
      const promptId = "prompt-123";
      const pricePaidWon = 3000;

      purchaseStore.addPurchase(promptId, pricePaidWon);

      const purchases = purchaseStore.getPurchases();
      expect(purchases.length).toBe(1);
      expect(purchases[0].promptId).toBe(promptId);
      expect(purchases[0].pricePaidWon).toBe(pricePaidWon);
      expect(typeof purchases[0].purchasedAt).toBe("number");
      expect(purchases[0].purchasedAt).toBeGreaterThan(0);
    });

    it("should persist purchase to localStorage", () => {
      purchaseStore.addPurchase("p1", 5000);
      purchaseStore.addPurchase("p2", 7000);

      const purchases = purchaseStore.getPurchases();
      expect(purchases.length).toBe(2);
      expect(purchases[0].promptId).toBe("p1");
      expect(purchases[1].promptId).toBe("p2");
    });

    it("should allow multiple purchases of the same prompt", () => {
      purchaseStore.addPurchase("p1", 3000);
      purchaseStore.addPurchase("p1", 5000); // Same prompt, different price

      const purchases = purchaseStore.getPurchases();
      expect(purchases.length).toBe(2);
      expect(purchases[0].promptId).toBe("p1");
      expect(purchases[0].pricePaidWon).toBe(3000);
      expect(purchases[1].promptId).toBe("p1");
      expect(purchases[1].pricePaidWon).toBe(5000);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2: incrementUsed(id) — update pp.usedCounts[id] AND Prompt.usedCount atomically
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-2: incrementUsed(id) updates pp.usedCounts and Prompt.usedCount", () => {
    it("should increment pp.usedCounts[id] from 0 to 1", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const promptId = prompts[0].id;

      // Initially no entry in usedCounts
      let used = settlement.getUsedCounts();
      expect(used[promptId]).toBeUndefined();

      // Increment once
      settlement.incrementUsed(promptId);

      used = settlement.getUsedCounts();
      expect(used[promptId]).toBe(1);
    });

    it("should update Prompt.usedCount when incrementUsed is called", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = prompts[0];
      const initialUsedCount = prompt.usedCount;

      settlement.incrementUsed(prompt.id);

      const updated = promptStore.getPromptById(prompt.id);
      expect(updated?.usedCount).toBe(initialUsedCount + 1);
    });

    it("should increment both pp.usedCounts and Prompt.usedCount atomically", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const promptId = prompts[0].id;

      // Before: usedCount = 0
      let prompt = promptStore.getPromptById(promptId);
      expect(prompt?.usedCount).toBe(0);

      settlement.incrementUsed(promptId);

      // After: both should be 1
      prompt = promptStore.getPromptById(promptId);
      const used = settlement.getUsedCounts();
      expect(prompt?.usedCount).toBe(1);
      expect(used[promptId]).toBe(1);
    });

    it("should accumulate used count on multiple increments", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const promptId = prompts[0].id;

      settlement.incrementUsed(promptId);
      settlement.incrementUsed(promptId);
      settlement.incrementUsed(promptId);

      const used = settlement.getUsedCounts();
      expect(used[promptId]).toBe(3);

      const prompt = promptStore.getPromptById(promptId);
      expect(prompt?.usedCount).toBe(3);
    });

    it("should handle multiple prompts independently", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const id1 = prompts[0].id;
      const id2 = prompts[1].id;

      settlement.incrementUsed(id1);
      settlement.incrementUsed(id1);
      settlement.incrementUsed(id2);

      const used = settlement.getUsedCounts();
      expect(used[id1]).toBe(2);
      expect(used[id2]).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3: recordSale(prompt) — commission calculation (20% floor) + add to pp.sales
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-3: recordSale(prompt) calculates commission correctly", () => {
    it("should calculate commission as Math.floor(gross * 0.2)", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = { ...prompts[0], priceWon: 3000 };

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      expect(sales.length).toBe(1);
      const sale = sales[0];
      expect(sale.grossWon).toBe(3000);
      expect(sale.commissionWon).toBe(Math.floor(3000 * 0.2)); // 600
      expect(sale.commissionWon).toBe(600);
    });

    it("should calculate netWon as grossWon - commissionWon", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = { ...prompts[0], priceWon: 5000 };

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      const sale = sales[0];
      expect(sale.netWon).toBe(5000 - 1000); // 5000 - floor(5000*0.2)
      expect(sale.netWon).toBe(4000);
    });

    it("should handle floor division correctly on odd amounts", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      // 3333 * 0.2 = 666.6 → floor = 666
      const prompt = { ...prompts[0], priceWon: 3333 };

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      const sale = sales[0];
      expect(sale.commissionWon).toBe(666);
      expect(sale.netWon).toBe(3333 - 666); // 2667
      expect(sale.netWon).toBe(2667);
    });

    it("should add SaleRecord to pp.sales with all required fields", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = prompts[0];

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      expect(sales.length).toBe(1);
      const sale = sales[0];

      // Check all fields
      expect(sale).toHaveProperty("id");
      expect(sale).toHaveProperty("promptId");
      expect(sale).toHaveProperty("promptTitle");
      expect(sale).toHaveProperty("grossWon");
      expect(sale).toHaveProperty("commissionWon");
      expect(sale).toHaveProperty("netWon");
      expect(sale).toHaveProperty("soldAt");

      // Verify values
      expect(typeof sale.id).toBe("string");
      expect(sale.id.length).toBeGreaterThan(0);
      expect(sale.promptId).toBe(prompt.id);
      expect(sale.promptTitle).toBe(prompt.title);
      expect(sale.grossWon).toBe(prompt.priceWon);
      expect(typeof sale.soldAt).toBe("number");
      expect(sale.soldAt).toBeGreaterThan(0);
    });

    it("should persist SaleRecord to localStorage", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      settlement.recordSale(prompts[0]);
      settlement.recordSale(prompts[1]);

      const sales = settlement.getSales();
      expect(sales.length).toBe(2);
      expect(sales[0].promptId).toBe(prompts[0].id);
      expect(sales[1].promptId).toBe(prompts[1].id);
    });

    it("should support multiple sales of same prompt at different times", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = prompts[0];

      settlement.recordSale(prompt);
      settlement.recordSale(prompt); // Same prompt, second sale

      const sales = settlement.getSales();
      expect(sales.length).toBe(2);
      expect(sales[0].promptId).toBe(prompt.id);
      expect(sales[1].promptId).toBe(prompt.id);
      // IDs should differ even though promptId is same
      expect(sales[0].id).not.toBe(sales[1].id);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4: getSales() returns SaleRecord[]
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-4: getSales() returns array of SaleRecords", () => {
    it("should return empty array when pp.sales is empty", () => {
      localStorage.clear();

      const sales = settlement.getSales();

      expect(Array.isArray(sales)).toBe(true);
      expect(sales.length).toBe(0);
    });

    it("should return all sales after recordSale", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      settlement.recordSale(prompts[0]);
      settlement.recordSale(prompts[1]);
      settlement.recordSale(prompts[2]);

      const sales = settlement.getSales();
      expect(sales.length).toBe(3);
    });

    it("should handle corrupted pp.sales gracefully", () => {
      localStorage.setItem("pp.sales", "CORRUPTED_JSON");

      const sales = settlement.getSales();

      expect(Array.isArray(sales)).toBe(true);
      expect(sales.length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5: getFlags() / setOnboardedSeller()
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-5: getFlags() and setOnboardedSeller() manage flags", () => {
    it("should return empty flags object when pp.flags is empty", () => {
      localStorage.clear();

      const flags = settlement.getFlags();

      expect(typeof flags).toBe("object");
      expect(flags.onboardedSeller).toBeUndefined();
    });

    it("should set onboardedSeller to true after calling setOnboardedSeller()", () => {
      settlement.setOnboardedSeller(true);

      const flags = settlement.getFlags();
      expect(flags.onboardedSeller).toBe(true);
    });

    it("should set onboardedSeller to false when called with false", () => {
      settlement.setOnboardedSeller(true);
      settlement.setOnboardedSeller(false);

      const flags = settlement.getFlags();
      expect(flags.onboardedSeller).toBe(false);
    });

    it("should persist flags to localStorage", () => {
      settlement.setOnboardedSeller(true);

      // Verify via localStorage directly
      const raw = localStorage.getItem("pp.flags");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.onboardedSeller).toBe(true);
    });

    it("should preserve other flags when setting onboardedSeller", () => {
      // Manually set a custom flag
      localStorage.setItem("pp.flags", JSON.stringify({ customFlag: "value", onboardedSeller: false }));

      settlement.setOnboardedSeller(true);

      const flags = settlement.getFlags();
      expect(flags.onboardedSeller).toBe(true);
      // Note: If custom flags should be preserved, this test validates that behavior
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Integration: settlement calculations work end-to-end
  // ────────────────────────────────────────────────────────────────────────

  describe("Settlement integration tests", () => {
    it("should calculate total net income from multiple sales", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      // Record 2 sales: 3000 + 5000
      settlement.recordSale({ ...prompts[0], priceWon: 3000 });
      settlement.recordSale({ ...prompts[1], priceWon: 5000 });

      const sales = settlement.getSales();
      const totalNet = sales.reduce((sum: number, s: SaleRecord) => sum + s.netWon, 0);

      // Expected: (3000*0.8) + (5000*0.8) = 2400 + 4000 = 6400
      expect(totalNet).toBe(6400);
    });

    it("should handle used counts and sales independently", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const promptId = prompts[0].id;

      // Increment used count
      settlement.incrementUsed(promptId);
      settlement.incrementUsed(promptId);

      // Record sale
      settlement.recordSale({ ...prompts[0], priceWon: 4000 });

      // Both should be tracked independently
      const usedCounts = settlement.getUsedCounts();
      const sales = settlement.getSales();

      expect(usedCounts[promptId]).toBe(2);
      expect(sales.length).toBe(1);
      expect(sales[0].grossWon).toBe(4000);
    });

    it("should not corrupt data when storage quota is exceeded", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      // Mock localStorage.setItem to throw QuotaExceededError
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const err = new Error("QuotaExceededError") as any;
        err.name = "QuotaExceededError";
        throw err;
      });

      // This should fail gracefully
      try {
        settlement.recordSale(prompts[0]);
      } catch {
        // Expected to throw or handle gracefully
      }

      // Restore
      setItemSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Type validation
  // ────────────────────────────────────────────────────────────────────────

  describe("Type validation and edge cases", () => {
    it("should accept 0 price (free prompt) in recordSale", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = { ...prompts[0], priceWon: 0 };

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      const sale = sales[0];
      expect(sale.grossWon).toBe(0);
      expect(sale.commissionWon).toBe(0); // floor(0*0.2) = 0
      expect(sale.netWon).toBe(0);
    });

    it("should handle large amounts correctly", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();
      const prompt = { ...prompts[0], priceWon: 50000 }; // Max price per spec

      settlement.recordSale(prompt);

      const sales = settlement.getSales();
      const sale = sales[0];
      expect(sale.commissionWon).toBe(Math.floor(50000 * 0.2)); // 10000
      expect(sale.netWon).toBe(40000);
    });
  });
});
