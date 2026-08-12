/**
 * TDD Red Phase — Packet 0007: 프롬프트 상세 — 구매(IAP)·정산 기록 연동
 *
 * Tests for PromptDetail (/prompt/:id): TossPurchase IAP gate for paid/unpurchased
 * prompts, purchase-success recording (Purchase + SaleRecord w/ 20% commission),
 * cancel/error handling (no record), already-purchased state ("구매함" + full body),
 * and free-prompt exclusion of the IAP flow.
 * Run: npx vitest run src/__tests__/packet-0007.test.ts
 */

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Routes, Route } from "react-router-dom";
import type { Prompt, Purchase, SaleRecord } from "@/lib/types";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

import PromptDetail from "@/pages/PromptDetail";
import { IAP } from "@apps-in-toss/web-framework";

const PROMPTS_KEY = "pp.prompts";
const PURCHASES_KEY = "pp.purchases";
const SALES_KEY = "pp.sales";

function makePrompt(overrides: Partial<Prompt> & Pick<Prompt, "id">): Prompt {
  const now = Date.now();
  return {
    id: overrides.id,
    title: overrides.title ?? "월간 손익 리포트 자동 작성",
    category: overrides.category ?? "재무",
    jobRole: overrides.jobRole ?? "재무 담당자",
    body:
      overrides.body ??
      "매출과 비용 데이터를 입력하면 경영진 보고용 월간 손익 리포트 초안을 자동으로 작성해주는 프롬프트 본문입니다.",
    sampleOutput:
      overrides.sampleOutput ??
      "매출 3억 2천만 원, 영업이익률 18%, 전월 대비 매출 증감 분석 결과 요약본입니다.",
    priceWon: overrides.priceWon ?? 3000,
    sellerId: overrides.sellerId ?? "seller-finance-01",
    sellerName: overrides.sellerName ?? "이재무",
    version: overrides.version ?? 2,
    usedCount: overrides.usedCount ?? 7,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function seedPrompts(prompts: Prompt[]) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

function seedPurchases(purchases: Purchase[]) {
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

function readPurchases(): Purchase[] {
  return JSON.parse(localStorage.getItem(PURCHASES_KEY) ?? "[]");
}

function readSales(): SaleRecord[] {
  return JSON.parse(localStorage.getItem(SALES_KEY) ?? "[]");
}

function renderDetail(id: string) {
  return renderWithRouter(
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/prompt/:id", element: React.createElement(PromptDetail) }),
      React.createElement(Route, { path: "/", element: React.createElement("div", null, "market-home") }),
    ),
    { initialEntries: [`/prompt/${id}`] },
  );
}

function flush() {
  act(() => {
    vi.runAllTimers();
  });
}

describe("Packet 0007: 프롬프트 상세 — 구매(IAP)·정산 기록 연동", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1 [P0]: priceWon>0 & 미구매 → TossPurchase 노출, 결제 성공 시 기록
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1[P0]: priceWon>0&미구매 시 TossPurchase가 노출되고 지정 SKU로 결제가 시작된다", () => {
    it("renders the purchase CTA and calls IAP.createOneTimePurchaseOrder with VITE_TOSS_IAP_SKU on click", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1", priceWon: 3000 })]);
      seedPurchases([]);

      renderDetail("p1");
      flush();

      const buyButton = screen.getByRole("button", { name: "구매하고 전체 보기" });
      expect(buyButton).toBeInTheDocument();

      fireEvent.click(buyButton);
      flush();

      expect(IAP.createOneTimePurchaseOrder).toHaveBeenCalledTimes(1);
      const call = vi.mocked(IAP.createOneTimePurchaseOrder).mock.calls[0][0] as any;
      expect(call.options.sku).toBe(import.meta.env.VITE_TOSS_IAP_SKU);

      vi.useRealTimers();
    });
  });

  describe("AC-1[P0]: 결제 성공 시 addPurchase+recordSale이 기록되고 '구매 완료' 토스트가 뜬다", () => {
    it("records a Purchase(pricePaidWon:3000) and a SaleRecord(gross:3000, commission:600, net:2400), then shows '구매 완료'", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1", priceWon: 3000, title: "월간 손익 리포트 자동 작성" })]);
      seedPurchases([]);

      renderDetail("p1");
      flush();

      fireEvent.click(screen.getByRole("button", { name: "구매하고 전체 보기" }));
      flush();

      const purchases = readPurchases();
      expect(purchases).toHaveLength(1);
      expect(purchases[0]).toMatchObject({ promptId: "p1", pricePaidWon: 3000 });

      const sales = readSales();
      expect(sales).toHaveLength(1);
      expect(sales[0]).toMatchObject({
        promptId: "p1",
        grossWon: 3000,
        commissionWon: 600,
        netWon: 2400,
      });

      expect(screen.getByText("구매 완료")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2 [P0]: 결제 취소/onError → 미기록 + 취소 토스트
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-2[P0]: 결제 취소/onError 시 Purchase·SaleRecord가 기록되지 않고 취소 토스트가 뜬다", () => {
    it("keeps pp.purchases and pp.sales empty and shows '결제가 취소되었어요' when the IAP order errors", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1", priceWon: 3000 })]);
      seedPurchases([]);

      vi.mocked(IAP.createOneTimePurchaseOrder).mockImplementationOnce((opts: any) => {
        setTimeout(() => opts.onError?.(new Error("USER_CANCELED")), 0);
        return () => {};
      });

      renderDetail("p1");
      flush();

      fireEvent.click(screen.getByRole("button", { name: "구매하고 전체 보기" }));
      flush();

      expect(readPurchases()).toHaveLength(0);
      expect(readSales()).toHaveLength(0);
      expect(screen.getByText("결제가 취소되었어요")).toBeInTheDocument();
      // still locked — CTA remains the purchase prompt, not '프롬프트 복사'
      expect(screen.queryByRole("button", { name: "프롬프트 복사" })).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3 [P0]: 이미 구매 → TossPurchase 미렌더+'구매함'+본문 전체 노출+복사 버튼
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-3[P0]: pp.purchases에 이미 있으면 TossPurchase 대신 '구매함'이 표시되고 본문 전체가 보인다", () => {
    it("hides the purchase CTA, shows '구매함', reveals the full body, and offers '프롬프트 복사' instead", () => {
      vi.useFakeTimers();
      const body =
        "매출과 비용 데이터를 입력하면 경영진 보고용 월간 손익 리포트 초안을 자동으로 작성해주는 프롬프트 본문입니다.";
      seedPrompts([makePrompt({ id: "p1", priceWon: 3000, body })]);
      seedPurchases([{ promptId: "p1", pricePaidWon: 3000, purchasedAt: Date.now() }]);

      renderDetail("p1");
      flush();

      expect(screen.queryByRole("button", { name: "구매하고 전체 보기" })).not.toBeInTheDocument();
      expect(screen.getByText("구매함")).toBeInTheDocument();
      expect(screen.getByText(body)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4 [P1]: 무료 프롬프트 → TossPurchase 미노출, '무료' 배지+즉시 복사
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-4[P1]: priceWon=0이면 TossPurchase 없이 '무료' 배지와 즉시 복사 버튼만 표시된다", () => {
    it("does not render any purchase CTA for a free prompt and offers '프롬프트 복사' immediately", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p-free", priceWon: 0 })]);
      seedPurchases([]);

      renderDetail("p-free");
      flush();

      expect(screen.queryByRole("button", { name: "구매하고 전체 보기" })).not.toBeInTheDocument();
      expect(screen.getAllByText("무료").length).toBeGreaterThan(0);
      expect(screen.getByRole("button", { name: "프롬프트 복사" })).toBeInTheDocument();
      expect(IAP.createOneTimePurchaseOrder).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5: 외부 결제(Stripe/window.open 등) 코드 부재 정적 검사
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-5: 코드에 Stripe/window.open/외부 결제 링크가 없다", () => {
    it("does not reference Stripe, window.open, or window.location.href in PromptDetail.tsx", () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, "../pages/PromptDetail.tsx"),
        "utf-8",
      );

      expect(source).not.toMatch(/stripe/i);
      expect(source).not.toMatch(/window\.open/);
      expect(source).not.toMatch(/window\.location\.href/);

      vi.useRealTimers();
    });
  });
});
