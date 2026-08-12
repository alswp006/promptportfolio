/**
 * TDD Red Phase — Packet 0003: 프롬프트 store + 시드 데이터
 *
 * Tests for prompt CRUD operations and seed initialization.
 * Run: npx vitest run src/__tests__/packet-0003.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Prompt, PromptCategory, SaveResult } from "@/lib/types";

// These imports will fail until the implementations are written — that's intentional (TDD).
// The Coder will create these files based on what these tests expect.
import * as promptStore from "@/lib/promptStore";
import * as seed from "@/lib/seed";

describe("Packet 0003: 프롬프트 store + 시드 데이터", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1: ensureSeeded() — 시드 초기화
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1: ensureSeeded() initializes seed data", () => {
    it("should seed 8 prompts with all 8 categories when pp.prompts is empty", async () => {
      // Empty state
      localStorage.clear();

      // ensureSeeded() should populate pp.prompts with ≥8 prompts
      await seed.ensureSeeded();

      // Verify seed was written
      const prompts = promptStore.getPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(8);

      // Verify all 8 categories are present
      const categories = new Set<PromptCategory>();
      prompts.forEach((p: Prompt) => categories.add(p.category));
      const requiredCategories: PromptCategory[] = [
        "마케팅",
        "재무",
        "PM",
        "법무",
        "개발",
        "디자인",
        "HR",
        "기타",
      ];
      requiredCategories.forEach((cat: PromptCategory) => {
        expect(categories.has(cat)).toBe(true);
      });
    });

    it("should reinitialize seed when pp.prompts is corrupted (empty array)", async () => {
      // Write corrupted data (empty)
      localStorage.setItem("pp.prompts", JSON.stringify([]));

      await seed.ensureSeeded();

      const prompts = promptStore.getPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(8);

      // Verify all categories exist
      const categories = new Set<PromptCategory>();
      prompts.forEach((p) => categories.add(p.category));
      expect(categories.size).toBe(8);
    });

    it("should not reinitialize if pp.prompts already has valid seeds", async () => {
      // Seed once
      await seed.ensureSeeded();
      const firstRun = promptStore.getPrompts();
      const firstIds = new Set(firstRun.map((p) => p.id));

      // Call again (idempotent)
      await seed.ensureSeeded();
      const secondRun = promptStore.getPrompts();
      const secondIds = new Set(secondRun.map((p) => p.id));

      // IDs should remain unchanged — no re-seeding
      expect(secondIds.size).toBe(firstIds.size);
      expect(Array.from(secondIds)).toEqual(Array.from(firstIds));
    });

    it("should have at least 1 prompt per category in seed", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      const categoryCount = new Map<PromptCategory, number>();
      prompts.forEach((p: Prompt) => {
        categoryCount.set(p.category, (categoryCount.get(p.category) ?? 0) + 1);
      });

      const requiredCategories: PromptCategory[] = [
        "마케팅",
        "재무",
        "PM",
        "법무",
        "개발",
        "디자인",
        "HR",
        "기타",
      ];
      requiredCategories.forEach((cat) => {
        expect(categoryCount.get(cat) ?? 0).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2: getPrompts() & getPromptById()
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-2: getPrompts() and getPromptById()", () => {
    it("should return empty array when pp.prompts is empty (no seed)", () => {
      localStorage.clear();
      const prompts = promptStore.getPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBe(0);
    });

    it("should return all prompts after seeding", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThanOrEqual(8);

      // Verify all items are valid Prompt objects
      prompts.forEach((p: Prompt) => {
        expect(p).toHaveProperty("id");
        expect(p).toHaveProperty("title");
        expect(p).toHaveProperty("category");
        expect(p).toHaveProperty("jobRole");
        expect(p).toHaveProperty("body");
        expect(p).toHaveProperty("sampleOutput");
        expect(p).toHaveProperty("priceWon");
        expect(p).toHaveProperty("sellerId");
        expect(p).toHaveProperty("sellerName");
        expect(p).toHaveProperty("version");
        expect(p).toHaveProperty("usedCount");
        expect(p).toHaveProperty("createdAt");
        expect(p).toHaveProperty("updatedAt");
      });
    });

    it("should return undefined for non-existent ID", async () => {
      await seed.ensureSeeded();
      const prompt = promptStore.getPromptById("non-existent-id-xyz");

      expect(prompt).toBeUndefined();
    });

    it("should return correct prompt by ID", async () => {
      await seed.ensureSeeded();
      const all = promptStore.getPrompts();
      const first = all[0];

      const found = promptStore.getPromptById(first.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(first.id);
      expect(found?.title).toBe(first.title);
      expect(found?.category).toBe(first.category);
    });

    it("should handle corrupted pp.prompts gracefully and return empty array", () => {
      // Write invalid JSON
      localStorage.setItem("pp.prompts", "NOT_VALID_JSON");

      const prompts = promptStore.getPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3: savePrompt() — add new prompt with defaults
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-3: savePrompt() sets id, version=1, usedCount=0, createdAt===updatedAt", () => {
    it("should add new prompt with auto-generated UUID", async () => {
      await seed.ensureSeeded();

      const input = {
        title: "New Marketing Prompt",
        category: "마케팅" as PromptCategory,
        jobRole: "CMO",
        body: "Create a viral campaign",
        sampleOutput: "Campaign strategy...",
        priceWon: 5000,
        sellerId: "user-123",
        sellerName: "John Doe",
      };

      const result = promptStore.savePrompt(input);

      // Should return { ok: true; id: string }
      expect(result.ok).toBe(true);
      expect("id" in result && result.id).toBeTruthy();

      // Should be a valid UUID (36 chars, with dashes)
      if (result.ok) {
        expect(result.id.length).toBe(36);
        expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it("should set version=1 on new prompt", async () => {
      await seed.ensureSeeded();

      const input = {
        title: "Test Prompt",
        category: "개발" as PromptCategory,
        jobRole: "Senior Engineer",
        body: "Optimize database queries",
        sampleOutput: "Query optimization guide...",
        priceWon: 10000,
        sellerId: "user-456",
        sellerName: "Jane Smith",
      };

      const result = promptStore.savePrompt(input);

      if (result.ok) {
        const saved = promptStore.getPromptById(result.id);
        expect(saved?.version).toBe(1);
      }
    });

    it("should set usedCount=0 on new prompt", async () => {
      await seed.ensureSeeded();

      const input = {
        title: "Test Prompt",
        category: "디자인" as PromptCategory,
        jobRole: "UI Designer",
        body: "Design a mobile app interface",
        sampleOutput: "Wireframe and mockups...",
        priceWon: 7500,
        sellerId: "user-789",
        sellerName: "Alice Chen",
      };

      const result = promptStore.savePrompt(input);

      if (result.ok) {
        const saved = promptStore.getPromptById(result.id);
        expect(saved?.usedCount).toBe(0);
      }
    });

    it("should set createdAt === updatedAt on new prompt", async () => {
      await seed.ensureSeeded();

      const input = {
        title: "Test Prompt",
        category: "HR" as PromptCategory,
        jobRole: "HR Manager",
        body: "Write job descriptions",
        sampleOutput: "Job description template...",
        priceWon: 3000,
        sellerId: "user-hr",
        sellerName: "Bob Johnson",
      };

      const result = promptStore.savePrompt(input);

      if (result.ok) {
        const saved = promptStore.getPromptById(result.id);
        expect(saved?.createdAt).toBe(saved?.updatedAt);
        expect(typeof saved?.createdAt).toBe("number");
        expect(saved?.createdAt).toBeGreaterThan(0);
      }
    });

    it("should persist new prompt to localStorage", async () => {
      await seed.ensureSeeded();
      const initialCount = promptStore.getPrompts().length;

      const input = {
        title: "Persistence Test",
        category: "재무" as PromptCategory,
        jobRole: "CFO",
        body: "Financial forecasting",
        sampleOutput: "Forecast model...",
        priceWon: 20000,
        sellerId: "user-cfo",
        sellerName: "Carol Davis",
      };

      const result = promptStore.savePrompt(input);

      // Verify persisted
      if (result.ok) {
        const all = promptStore.getPrompts();
        expect(all.length).toBe(initialCount + 1);

        const saved = promptStore.getPromptById(result.id);
        expect(saved?.title).toBe(input.title);
        expect(saved?.category).toBe(input.category);
        expect(saved?.jobRole).toBe(input.jobRole);
      }
    });

    it("should return error when localStorage quota exceeded (QuotaExceededError)", async () => {
      await seed.ensureSeeded();

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const err = new Error("QuotaExceededError") as any;
        err.name = "QuotaExceededError";
        throw err;
      });

      const input = {
        title: "Quota Test",
        category: "법무" as PromptCategory,
        jobRole: "Legal Counsel",
        body: "Contract review",
        sampleOutput: "Contract template...",
        priceWon: 15000,
        sellerId: "user-legal",
        sellerName: "Eve Wilson",
      };

      const result = promptStore.savePrompt(input);

      expect(result.ok).toBe(false);
      expect("error" in result && result.error).toBeTruthy();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Seed Data Quality Checks
  // ────────────────────────────────────────────────────────────────────────

  describe("Seed data quality", () => {
    it("should have non-empty title, body, sampleOutput for each seed prompt", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(p.title).toBeTruthy();
        expect(p.title.length).toBeGreaterThan(0);

        expect(p.body).toBeTruthy();
        expect(p.body.length).toBeGreaterThan(0);

        expect(p.sampleOutput).toBeTruthy();
        expect(p.sampleOutput.length).toBeGreaterThan(0);
      });
    });

    it("should have valid price (>= 0) for each seed prompt", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(typeof p.priceWon).toBe("number");
        expect(p.priceWon).toBeGreaterThanOrEqual(0);
      });
    });

    it("should have non-empty sellerId and sellerName for each seed prompt", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(p.sellerId).toBeTruthy();
        expect(p.sellerId.length).toBeGreaterThan(0);

        expect(p.sellerName).toBeTruthy();
        expect(p.sellerName.length).toBeGreaterThan(0);
      });
    });

    it("should have seed prompts with version >= 1", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(typeof p.version).toBe("number");
        expect(p.version).toBeGreaterThanOrEqual(1);
      });
    });

    it("should have seed prompts with usedCount >= 0", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(typeof p.usedCount).toBe("number");
        expect(p.usedCount).toBeGreaterThanOrEqual(0);
      });
    });

    it("should have seed prompts with createdAt <= updatedAt", async () => {
      await seed.ensureSeeded();
      const prompts = promptStore.getPrompts();

      prompts.forEach((p) => {
        expect(typeof p.createdAt).toBe("number");
        expect(typeof p.updatedAt).toBe("number");
        expect(p.createdAt).toBeLessThanOrEqual(p.updatedAt);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Integration: savePrompt respects existing data
  // ────────────────────────────────────────────────────────────────────────

  describe("savePrompt integration with seed data", () => {
    it("should add to existing seed data without corrupting it", async () => {
      await seed.ensureSeeded();
      const seedIds = new Set(promptStore.getPrompts().map((p: Prompt) => p.id));

      const input = {
        title: "Integration Test",
        category: "기타" as PromptCategory,
        jobRole: "Consultant",
        body: "General consulting",
        sampleOutput: "Consulting framework...",
        priceWon: 5000,
        sellerId: "user-consultant",
        sellerName: "Frank Brown",
      };

      const result = promptStore.savePrompt(input);

      if (result.ok) {
        const all = promptStore.getPrompts();
        const newIds = new Set(all.map((p: Prompt) => p.id));

        // All seed IDs should still exist
        seedIds.forEach((id: string) => {
          expect(newIds.has(id)).toBe(true);
        });

        // New ID should be added
        expect(newIds.has(result.id)).toBe(true);
        expect(all.length).toBe(seedIds.size + 1);
      }
    });
  });
});
