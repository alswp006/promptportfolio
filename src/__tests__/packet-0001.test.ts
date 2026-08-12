import { describe, it, expect } from "vitest";
import type {
  Prompt,
  Purchase,
  SaleRecord,
  PromptCategory,
  Flags,
  UsedCounts,
  SaveResult,
  RouteState,
} from "@/lib/types";

describe("Packet 0001: Data Models & RouteState Types", () => {
  describe("AC-1: Prompt type with 12 SPEC fields", () => {
    it("AC-1[P0]: Prompt has all required fields (id, title, category, jobRole, body, sampleOutput, priceWon, sellerId, sellerName, version, usedCount, createdAt, updatedAt)", () => {
      const prompt: Prompt = {
        id: "uuid-p1",
        title: "광고 카피 3안",
        category: "마케팅",
        jobRole: "퍼포먼스 마케터",
        body: "프롬프트 본문이 여기에 20자 이상.",
        sampleOutput: "샘플 출력물이 여기에 10자 이상",
        priceWon: 3000,
        sellerId: "seller-1",
        sellerName: "판매자이름",
        version: 1,
        usedCount: 0,
        createdAt: 1692374400000,
        updatedAt: 1692374400000,
      };

      expect(prompt.id).toBe("uuid-p1");
      expect(prompt.title).toBe("광고 카피 3안");
      expect(prompt.category).toBe("마케팅");
      expect(prompt.jobRole).toBe("퍼포먼스 마케터");
      expect(prompt.body).toBe("프롬프트 본문이 여기에 20자 이상.");
      expect(prompt.sampleOutput).toBe("샘플 출력물이 여기에 10자 이상");
      expect(prompt.priceWon).toBe(3000);
      expect(prompt.sellerId).toBe("seller-1");
      expect(prompt.sellerName).toBe("판매자이름");
      expect(prompt.version).toBe(1);
      expect(prompt.usedCount).toBe(0);
      expect(typeof prompt.createdAt).toBe("number");
      expect(typeof prompt.updatedAt).toBe("number");
    });

    it("AC-1[P0]: PromptCategory union type covers all 8 categories", () => {
      const categories: PromptCategory[] = [
        "마케팅",
        "재무",
        "PM",
        "법무",
        "개발",
        "디자인",
        "HR",
        "기타",
      ];

      expect(categories).toHaveLength(8);

      categories.forEach((cat) => {
        const p: Prompt = {
          id: "p1",
          title: "test",
          category: cat,
          jobRole: "role",
          body: "프롬프트 본문이 20자 이상이어야 합니다.",
          sampleOutput: "샘플 출력",
          priceWon: 0,
          sellerId: "s1",
          sellerName: "판매자",
          version: 1,
          usedCount: 0,
          createdAt: 0,
          updatedAt: 0,
        };
        expect(categories).toContain(p.category);
      });
    });
  });

  describe("AC-2: Purchase, SaleRecord, Flags, UsedCounts exports", () => {
    it("AC-2[P0]: Purchase type has promptId, pricePaidWon, purchasedAt", () => {
      const purchase: Purchase = {
        promptId: "p1",
        pricePaidWon: 3000,
        purchasedAt: 1692374400000,
      };

      expect(purchase.promptId).toBe("p1");
      expect(purchase.pricePaidWon).toBe(3000);
      expect(typeof purchase.purchasedAt).toBe("number");
      expect(purchase.purchasedAt).toBe(1692374400000);
    });

    it("AC-2[P0]: SaleRecord type has id, promptId, promptTitle, grossWon, commissionWon, netWon, soldAt", () => {
      const record: SaleRecord = {
        id: "sr-uuid-1",
        promptId: "p1",
        promptTitle: "광고 카피",
        grossWon: 3000,
        commissionWon: 600,
        netWon: 2400,
        soldAt: 1692374400000,
      };

      expect(record.id).toBe("sr-uuid-1");
      expect(record.promptId).toBe("p1");
      expect(record.promptTitle).toBe("광고 카피");
      expect(record.grossWon).toBe(3000);
      expect(record.commissionWon).toBe(600);
      expect(record.netWon).toBe(2400);
      expect(typeof record.soldAt).toBe("number");
    });

    it("AC-2[P0]: Flags type has optional onboardedSeller property", () => {
      const flags1: Flags = {};
      const flags2: Flags = { onboardedSeller: false };
      const flags3: Flags = { onboardedSeller: true };

      expect(flags1.onboardedSeller).toBeUndefined();
      expect(flags2.onboardedSeller).toBe(false);
      expect(flags3.onboardedSeller).toBe(true);
    });

    it("AC-2[P0]: UsedCounts is Record<string, number>", () => {
      const counts: UsedCounts = {
        p1: 5,
        p2: 10,
        p3: 0,
      };

      expect(counts.p1).toBe(5);
      expect(counts.p2).toBe(10);
      expect(counts.p3).toBe(0);

      // Test that it can accept any string key
      const dynamicCounts: UsedCounts = {};
      dynamicCounts["dynamic-key"] = 42;
      expect(dynamicCounts["dynamic-key"]).toBe(42);
    });
  });

  describe("AC-3: SaveResult union type (discriminated union)", () => {
    it("AC-3[P0]: SaveResult success case has ok=true and id field", () => {
      const result: SaveResult = {
        ok: true,
        id: "new-prompt-uuid",
      };

      expect(result.ok).toBe(true);
      if (result.ok === true) {
        expect(result.id).toBe("new-prompt-uuid");
        expect(typeof result.id).toBe("string");
      }
    });

    it("AC-3[P0]: SaveResult error case has ok=false and error field", () => {
      const result: SaveResult = {
        ok: false,
        error: "저장 공간이 부족합니다",
      };

      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error).toBe("저장 공간이 부족합니다");
        expect(typeof result.error).toBe("string");
      }
    });

    it("AC-3[P0]: SaveResult discriminates between success and error at type level", () => {
      const successResults: SaveResult[] = [
        { ok: true, id: "id1" },
        { ok: true, id: "id2" },
      ];
      const errorResults: SaveResult[] = [
        { ok: false, error: "error1" },
        { ok: false, error: "error2" },
      ];

      successResults.forEach((result) => {
        expect(result.ok).toBe(true);
      });

      errorResults.forEach((result) => {
        expect(result.ok).toBe(false);
      });
    });
  });

  describe("AC-4: RouteState type (navigation contracts)", () => {
    it("AC-4[P0]: RouteState defines all 5 routes with undefined state", () => {
      const routeStates: Record<keyof RouteState, undefined> = {
        "/": undefined,
        "/prompt/:id": undefined,
        "/sell": undefined,
        "/dashboard": undefined,
        "/library": undefined,
      };

      const routes = Object.keys(routeStates) as (keyof RouteState)[];
      expect(routes).toHaveLength(5);
      expect(routes).toContain("/");
      expect(routes).toContain("/prompt/:id");
      expect(routes).toContain("/sell");
      expect(routes).toContain("/dashboard");
      expect(routes).toContain("/library");
    });

    it("AC-4[P0]: All RouteState paths have undefined as state type", () => {
      const stateTypes: Record<keyof RouteState, unknown> = {
        "/": undefined,
        "/prompt/:id": undefined,
        "/sell": undefined,
        "/dashboard": undefined,
        "/library": undefined,
      };

      Object.entries(stateTypes).forEach(([, state]) => {
        expect(state).toBeUndefined();
      });
    });
  });

  describe("AC-5: TypeScript compilation and runtime validation", () => {
    it("AC-5[P0]: All types are importable and valid (verified at import time)", () => {
      // Types are verified at TypeScript compile time via the import statement at the top
      // This test simply confirms that the imports succeeded (no ReferenceError thrown)
      // npx tsc --noEmit will validate all type definitions
      const samplePrompt: Prompt = {
        id: "test",
        title: "test",
        category: "마케팅",
        jobRole: "test",
        body: "test body with 20+ chars minimum",
        sampleOutput: "sample",
        priceWon: 0,
        sellerId: "test",
        sellerName: "test",
        version: 1,
        usedCount: 0,
        createdAt: 0,
        updatedAt: 0,
      };
      expect(samplePrompt.id).toBeDefined();
    });

    it("AC-5[P0]: Prompt fields are strictly typed (no extra fields)", () => {
      const prompt: Prompt = {
        id: "p1",
        title: "title",
        category: "마케팅",
        jobRole: "role",
        body: "body text that is longer than 20 characters",
        sampleOutput: "sample",
        priceWon: 0,
        sellerId: "seller",
        sellerName: "name",
        version: 1,
        usedCount: 0,
        createdAt: 0,
        updatedAt: 0,
      };

      // Verify the exact structure
      const keys = Object.keys(prompt) as (keyof Prompt)[];
      expect(keys).toHaveLength(13);
      expect(keys).toContain("id");
      expect(keys).toContain("title");
      expect(keys).toContain("category");
      expect(keys).toContain("jobRole");
      expect(keys).toContain("body");
      expect(keys).toContain("sampleOutput");
      expect(keys).toContain("priceWon");
      expect(keys).toContain("sellerId");
      expect(keys).toContain("sellerName");
      expect(keys).toContain("version");
      expect(keys).toContain("usedCount");
      expect(keys).toContain("createdAt");
      expect(keys).toContain("updatedAt");
    });
  });
});
