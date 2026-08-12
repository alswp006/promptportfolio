/**
 * TDD Red Phase — Packet 0010: 내 라이브러리 페이지 `/library`
 *
 * Tests for Library (/library): getPurchases() 기준 promptId를 getPromptById로 조인해
 * ListRow 카드로 표시, v{version}·'사용 {usedCount}회' 표시, 카드 탭→navigate('/prompt/'+id),
 * 빈 배열 시 EmptyState, 원본 삭제 시 '삭제된 프롬프트' 카드(크래시 없음, 탭해도 이동 안 함),
 * read 중 Skeleton, purchasedAt desc 정렬.
 * Run: npx vitest run src/__tests__/packet-0010.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Prompt, Purchase } from "@/lib/types";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

import Library from "@/pages/Library";

const PROMPTS_KEY = "pp.prompts";
const PURCHASES_KEY = "pp.purchases";

function makePrompt(overrides: Partial<Prompt> & Pick<Prompt, "id">): Prompt {
  return {
    id: overrides.id,
    title: overrides.title ?? "3줄 회의록 요약 프롬프트",
    category: overrides.category ?? "PM",
    jobRole: overrides.jobRole ?? "기획자",
    body: overrides.body ?? "회의록을 3줄로 요약해줘",
    sampleOutput: overrides.sampleOutput ?? "요약 결과 예시",
    priceWon: overrides.priceWon ?? 3000,
    sellerId: overrides.sellerId ?? "seller-1",
    sellerName: overrides.sellerName ?? "김판매",
    version: overrides.version ?? 1,
    usedCount: overrides.usedCount ?? 0,
    createdAt: overrides.createdAt ?? 1_700_000_000_000,
    updatedAt: overrides.updatedAt ?? 1_700_000_000_000,
  };
}

function makePurchase(overrides: Partial<Purchase> & Pick<Purchase, "promptId">): Purchase {
  return {
    promptId: overrides.promptId,
    pricePaidWon: overrides.pricePaidWon ?? 3000,
    purchasedAt: overrides.purchasedAt ?? Date.now(),
  };
}

function seedPrompts(prompts: Prompt[]) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

function seedPurchases(purchases: Purchase[]) {
  localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
}

function flush() {
  act(() => {
    vi.runAllTimers();
  });
}

function renderLibrary() {
  return renderWithRouter(React.createElement(Library));
}

describe("내 라이브러리 페이지 `/library`", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1[P0]: getPurchases() ⋈ getPromptById → ListRow, v{version}·'사용 {usedCount}회'
  // ────────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: renders a card per purchase joined with its prompt, showing title, v{version} and '사용 {usedCount}회'", () => {
    vi.useFakeTimers();
    seedPrompts([
      makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트", version: 2, usedCount: 5 }),
    ]);
    seedPurchases([makePurchase({ promptId: "p1", purchasedAt: 1_700_000_000_000 })]);

    renderLibrary();
    flush();

    const rows = screen.getAllByTestId("library-item");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/v2/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/사용 5회/)).toBeInTheDocument();
  });

  it("AC-1[P0]: renders an empty list (no crash, no cards) when pp.purchases is missing entirely", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);

    expect(() => {
      renderLibrary();
      flush();
    }).not.toThrow();

    expect(screen.queryAllByTestId("library-item")).toHaveLength(0);
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2[P0]: 카드 탭(≥44px) → navigate('/prompt/'+id)
  // ────────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: tapping a purchased-prompt card navigates to '/prompt/p1'", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트" })]);
    seedPurchases([makePurchase({ promptId: "p1" })]);

    renderLibrary();
    flush();

    const row = screen.getByTestId("library-item");
    fireEvent.click(row);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/prompt/p1");
  });

  it("AC-2: purchased-prompt card meets the 44px minimum touch target", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);
    seedPurchases([makePurchase({ promptId: "p1" })]);

    renderLibrary();
    flush();

    const row = screen.getByTestId("library-item");
    const minHeight = parseInt(row.style.minHeight || "0", 10);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3: 빈 배열 시 Asset.ContentIcon+'구매한 프롬프트가 없어요'+'마켓 둘러보기'(→'/')
  // ────────────────────────────────────────────────────────────────────────

  it("AC-3: shows EmptyState with a content icon, '구매한 프롬프트가 없어요' title and a '마켓 둘러보기' action when purchases are empty", () => {
    vi.useFakeTimers();
    seedPrompts([]);
    seedPurchases([]);

    renderLibrary();
    flush();

    expect(screen.getByText("구매한 프롬프트가 없어요")).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).not.toBeNull();

    const cta = screen.getByRole("button", { name: "마켓 둘러보기" });
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4: 원본 삭제(pp.prompts에 없음) → '삭제된 프롬프트' 카드, 탭해도 이동 안 함, 크래시 없음
  // ────────────────────────────────────────────────────────────────────────

  it("AC-4: renders a '삭제된 프롬프트' card (no crash) when the original prompt is missing from pp.prompts", () => {
    vi.useFakeTimers();
    seedPrompts([]); // original prompt deleted
    seedPurchases([makePurchase({ promptId: "ghost-id" })]);

    expect(() => {
      renderLibrary();
      flush();
    }).not.toThrow();

    const rows = screen.getAllByTestId("library-item");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("삭제된 프롬프트")).toBeInTheDocument();
  });

  it("AC-4: tapping a '삭제된 프롬프트' card does not navigate anywhere", () => {
    vi.useFakeTimers();
    seedPrompts([]);
    seedPurchases([makePurchase({ promptId: "ghost-id" })]);

    renderLibrary();
    flush();

    const row = screen.getByTestId("library-item");
    fireEvent.click(row);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5: read 중 Skeleton, purchasedAt desc 정렬
  // ────────────────────────────────────────────────────────────────────────

  it("AC-5[P0]: shows Skeleton rows while loading, then renders purchases sorted by purchasedAt descending", () => {
    vi.useFakeTimers();
    seedPrompts([
      makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트" }),
      makePrompt({ id: "p2", title: "면접 예상 질문 생성기" }),
    ]);
    seedPurchases([
      makePurchase({ promptId: "p1", purchasedAt: 1_700_000_000_000 }),
      makePurchase({ promptId: "p2", purchasedAt: 1_700_003_600_000 }),
    ]);

    renderLibrary();

    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);

    flush();

    const rows = screen.getAllByTestId("library-item");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("면접 예상 질문 생성기")).toBeInTheDocument();
    expect(within(rows[1]).getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
  });
});
