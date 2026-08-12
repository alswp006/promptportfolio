/**
 * TDD Red Phase — Packet 0006: 프롬프트 상세 — 렌더·샘플 광고 게이트·복사
 *
 * Tests for PromptDetail (/prompt/:id): card render, reward-ad-gated sample preview,
 * paid-body masking/purchase CTA, copy-to-clipboard with usedCount increment,
 * not-found fallback, and loading skeleton.
 * Run: npx vitest run src/__tests__/packet-0006.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Routes, Route } from "react-router-dom";
import type { Prompt, Purchase } from "@/lib/types";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// NOTE: intentionally NOT using mockTossRewardAd() — its stub auto-reveals gated
// content on mount regardless of ad outcome, which would make it impossible to
// test the "masked until watched" and "ad failure keeps it masked" ACs below.
// We mock the underlying SDK ad functions directly instead (ground truth per
// .ai-factory/apps-in-toss-essential.txt).
mockTds();
mockAppsInToss();
mockRouter();

import PromptDetail from "@/pages/PromptDetail";
import { setClipboardText, loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";

const PROMPTS_KEY = "pp.prompts";
const PURCHASES_KEY = "pp.purchases";
const USED_COUNTS_KEY = "pp.usedCounts";

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
    priceWon: overrides.priceWon ?? 12000,
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

describe("Packet 0006: 프롬프트 상세 — 렌더·샘플 광고 게이트·복사", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1 [P0]: 없는 id → 크래시 없이 폴백 + 마켓으로 이동
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1[P0]: 없는 id는 크래시 없이 '프롬프트를 찾을 수 없어요' 폴백을 보여준다", () => {
    it("renders '프롬프트를 찾을 수 없어요' and a '마켓으로' button for an unknown id, without throwing", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1" })]);

      expect(() => renderDetail("does-not-exist")).not.toThrow();
      flush();

      expect(screen.getByText("프롬프트를 찾을 수 없어요")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "마켓으로" })).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("navigates to '/' when the '마켓으로' button is clicked", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1" })]);

      renderDetail("does-not-exist");
      flush();

      fireEvent.click(screen.getByRole("button", { name: "마켓으로" }));

      expect(mockNavigate).toHaveBeenCalledWith("/");

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2 [P0]: 상세 카드 렌더 (title/jobRole/version/usedCount/가격 + price-hero)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-2[P0]: prompt-detail-card에 title·jobRole·버전·사용횟수·가격이 표시된다", () => {
    it("shows title, jobRole, 'v{version}', '사용 {usedCount}회' inside data-testid='prompt-detail-card'", () => {
      vi.useFakeTimers();
      seedPrompts([
        makePrompt({
          id: "p1",
          title: "월간 손익 리포트 자동 작성",
          jobRole: "재무 담당자",
          version: 2,
          usedCount: 7,
          priceWon: 12000,
        }),
      ]);

      renderDetail("p1");
      flush();

      const card = screen.getByTestId("prompt-detail-card");
      expect(card.textContent).toContain("월간 손익 리포트 자동 작성");
      expect(card.textContent).toContain("재무 담당자");
      expect(card.textContent).toMatch(/v2\b/);
      expect(card.textContent).toMatch(/사용\s*7\s*회/);

      vi.useRealTimers();
    });

    it("renders data-testid='price-hero' with ₩12,000 in t2~t3 typography", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p1", priceWon: 12000 })]);

      renderDetail("p1");
      flush();

      const priceHero = screen.getByTestId("price-hero");
      expect(priceHero.textContent).toMatch(/₩\s*12,000/);

      const typed = priceHero.querySelector("[data-typography]");
      expect(typed).toBeTruthy();
      expect(typed?.getAttribute("data-typography")).toMatch(/^t[23]$/);

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3 [P0]: 샘플 결과 보기 → 보상형 광고 시청 완료 시 sampleOutput 공개, 실패 시 가림 유지
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-3[P0]: 샘플 결과 보기 버튼 → 광고 시청 완료 시 sampleOutput 공개, 실패 시 토스트+가림 유지", () => {
    it("hides sampleOutput until '샘플 결과 보기' is tapped and the ad completes, then reveals it in full", () => {
      vi.useFakeTimers();
      const sampleOutput =
        "매출 3억 2천만 원, 영업이익률 18%, 전월 대비 매출 증감 분석 결과 요약본입니다.";
      seedPrompts([makePrompt({ id: "p1", sampleOutput })]);

      renderDetail("p1");
      flush();

      expect(screen.queryByText(sampleOutput)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "샘플 결과 보기" }));
      flush();

      expect(screen.getByText(sampleOutput)).toBeInTheDocument();

      vi.useRealTimers();
    });

    it("shows toast '광고를 불러오지 못했어요' and keeps sampleOutput hidden when the ad fails", () => {
      vi.useFakeTimers();
      const sampleOutput =
        "매출 3억 2천만 원, 영업이익률 18%, 전월 대비 매출 증감 분석 결과 요약본입니다.";
      seedPrompts([makePrompt({ id: "p1", sampleOutput })]);

      // Force the reward-ad playback to fail regardless of internal wiring
      // (load-time or show-time), per .ai-factory/apps-in-toss-essential.txt shape.
      vi.mocked(loadFullScreenAd).mockImplementation((opts: any) => {
        setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
        return () => {};
      });
      vi.mocked(showFullScreenAd).mockImplementation((opts: any) => {
        setTimeout(() => opts.onError?.(new Error("ad playback failed")), 0);
        return () => {};
      });

      renderDetail("p1");
      flush();

      fireEvent.click(screen.getByRole("button", { name: "샘플 결과 보기" }));
      flush();

      expect(screen.queryByText(sampleOutput)).not.toBeInTheDocument();
      expect(screen.getByText("광고를 불러오지 못했어요")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4 [P0]: 유료 미구매 본문 마스킹+구매 버튼 / 무료·구매 시 복사+토스트+usedCount 증가
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-4[P0]: 유료 미구매는 본문 마스킹+구매 버튼, 무료/구매는 복사 시 클립보드+토스트+usedCount 증가", () => {
    it("masks the body and shows '구매하고 전체 보기' when priceWon>0 and not purchased", () => {
      vi.useFakeTimers();
      const body =
        "매출과 비용 데이터를 입력하면 경영진 보고용 월간 손익 리포트 초안을 자동으로 작성해주는 프롬프트 본문입니다.";
      seedPrompts([makePrompt({ id: "p1", priceWon: 12000, body })]);
      seedPurchases([]);

      renderDetail("p1");
      flush();

      expect(screen.queryByText(body)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "구매하고 전체 보기" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "프롬프트 복사" })).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("copies body to clipboard, shows '복사했어요' toast, and increments usedCount when a free prompt's '프롬프트 복사' is tapped", () => {
      vi.useFakeTimers();
      const body =
        "무료 프롬프트의 전체 본문입니다. 20자 이상의 실제 프롬프트 지시문이 여기 들어갑니다.";
      seedPrompts([makePrompt({ id: "p-free", priceWon: 0, body, usedCount: 3 })]);

      renderDetail("p-free");
      flush();

      expect(screen.getByText(body)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "프롬프트 복사" }));
      flush();

      expect(setClipboardText).toHaveBeenCalledWith(body);
      expect(screen.getByText("복사했어요")).toBeInTheDocument();

      const usedCounts = JSON.parse(localStorage.getItem(USED_COUNTS_KEY) ?? "{}");
      expect(usedCounts["p-free"]).toBe(1);

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5: read 중 Skeleton, ScreenScaffold + 하단 고정 SubmitFooter
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-5: read 중 Skeleton, 완료 후 ScreenScaffold + 하단 고정 SubmitFooter 버튼", () => {
    it("shows Skeleton placeholders before read resolves, then renders the card and a fixed bottom CTA button", () => {
      vi.useFakeTimers();
      seedPrompts([makePrompt({ id: "p-free", priceWon: 0 })]);

      renderDetail("p-free");

      expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
      expect(screen.queryByTestId("prompt-detail-card")).not.toBeInTheDocument();

      flush();

      expect(document.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
      expect(screen.getByTestId("prompt-detail-card")).toBeInTheDocument();

      const bottomCta = document.querySelector('[data-slot="fixed-bottom-cta"]');
      expect(bottomCta).toBeTruthy();
      expect(bottomCta?.tagName).toBe("BUTTON");

      vi.useRealTimers();
    });
  });
});
