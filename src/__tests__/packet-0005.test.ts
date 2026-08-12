/**
 * TDD Red Phase — Packet 0005: 마켓 홈 페이지 `/`
 *
 * Tests for MarketHome: prompt card list, category Tab filter, search,
 * banner ad placement, loading/empty states, and card-tap navigation.
 * Run: npx vitest run src/__tests__/packet-0005.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Prompt } from "@/lib/types";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// This import will fail until the implementation exists — that's intentional (TDD red phase).
// @ts-expect-error - MarketHome will be created by Coder
import MarketHome from "@/pages/MarketHome";

mockAll();

const STORAGE_KEY = "pp.prompts";

const CATEGORIES: Prompt["category"][] = [
  "마케팅",
  "재무",
  "PM",
  "법무",
  "개발",
  "디자인",
  "HR",
  "기타",
];

function makePrompt(overrides: Partial<Prompt> & Pick<Prompt, "id" | "title" | "category">): Prompt {
  const now = Date.now();
  return {
    id: overrides.id,
    title: overrides.title,
    category: overrides.category,
    jobRole: overrides.jobRole ?? "일반 직무",
    body: overrides.body ?? "프롬프트 본문 내용입니다.",
    sampleOutput: overrides.sampleOutput ?? "샘플 출력 결과입니다.",
    priceWon: overrides.priceWon ?? 5000,
    sellerId: overrides.sellerId ?? "seller-1",
    sellerName: overrides.sellerName ?? "김판매",
    version: overrides.version ?? 1,
    usedCount: overrides.usedCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

// 12건: 마케팅x2, 재무x3, PM x1, 법무x1, 개발x2, 디자인x1, HR x1, 기타x1
function buildTwelvePrompts(): Prompt[] {
  return [
    makePrompt({ id: "p-mkt-1", title: "브랜드 카피 10종 생성", category: "마케팅", jobRole: "브랜드 마케터", priceWon: 8900, usedCount: 47 }),
    makePrompt({ id: "p-mkt-2", title: "인스타 광고 문구 제작", category: "마케팅", jobRole: "퍼포먼스 마케터", priceWon: 6000, usedCount: 10 }),
    makePrompt({ id: "p-fin-1", title: "월간 손익 리포트 작성", category: "재무", jobRole: "재무 담당자", priceWon: 12000, usedCount: 3 }),
    makePrompt({ id: "p-fin-2", title: "예산안 초안 생성", category: "재무", jobRole: "재무 담당자", priceWon: 9000, usedCount: 8 }),
    makePrompt({ id: "p-fin-3", title: "무료 세금계산서 안내", category: "재무", jobRole: "카피라이터 채용 담당", priceWon: 0, usedCount: 0 }),
    makePrompt({ id: "p-pm-1", title: "스프린트 회고 정리", category: "PM", jobRole: "프로덕트 매니저", priceWon: 6500, usedCount: 21 }),
    makePrompt({ id: "p-legal-1", title: "계약서 리스크 검토", category: "법무", jobRole: "사내 변호사", priceWon: 15000, usedCount: 5 }),
    makePrompt({ id: "p-dev-1", title: "AI Prompt Toolkit", category: "개발", jobRole: "Backend Engineer", priceWon: 9900, usedCount: 12 }),
    makePrompt({ id: "p-dev-2", title: "코드 리뷰 체크리스트", category: "개발", jobRole: "시니어 엔지니어", priceWon: 4900, usedCount: 30 }),
    makePrompt({ id: "p-design-1", title: "UI 카피 톤 가이드", category: "디자인", jobRole: "UI 디자이너", priceWon: 3000, usedCount: 15 }),
    makePrompt({ id: "p-hr-1", title: "채용 공고 초안 생성", category: "HR", jobRole: "HR 매니저", priceWon: 4000, usedCount: 2 }),
    makePrompt({ id: "p-etc-1", title: "이력서 첨삭 도우미", category: "기타", jobRole: "커리어 컨설턴트", priceWon: 2000, usedCount: 1 }),
  ];
}

function seedPrompts(prompts: Prompt[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

function flushLoading() {
  act(() => {
    vi.runAllTimers();
  });
}

describe("Packet 0005: 마켓 홈 페이지 `/`", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1 [P0]: 목록 렌더 — 가격/사용횟수 표시
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-1[P0]: 프롬프트 카드 리스트 렌더 + 가격/사용횟수", () => {
    it("renders 12 ListRow cards with price and used-count for pp.prompts with 12 items", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const cards = screen.getAllByRole("listitem");
      expect(cards.length).toBe(12);

      vi.useRealTimers();
    });

    it("shows ₩-formatted price and '사용 N회' for a paid prompt, '무료' for a free prompt", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const cards = screen.getAllByRole("listitem");
      const paidCard = cards.find((c) => c.textContent?.includes("브랜드 카피 10종 생성"));
      const freeCard = cards.find((c) => c.textContent?.includes("무료 세금계산서 안내"));

      expect(paidCard).toBeTruthy();
      expect(paidCard?.textContent).toMatch(/₩/);
      expect(paidCard?.textContent).toMatch(/8,?900/);
      expect(paidCard?.textContent).toMatch(/사용\s*47\s*회/);

      expect(freeCard).toBeTruthy();
      expect(freeCard?.textContent).toMatch(/무료/);
      expect(freeCard?.textContent).toMatch(/사용\s*0\s*회/);

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2 [P0]: 카테고리 Tab 필터
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-2[P0]: 카테고리 Tab 필터", () => {
    it("shows all 8 categories + '전체' as 9 tabs total", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBe(9);
      CATEGORIES.forEach((cat) => {
        expect(screen.getByRole("tab", { name: cat })).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("shows only category==='재무' prompts (3 of 12) when '재무' tab is clicked", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      fireEvent.click(screen.getByRole("tab", { name: "재무" }));

      const cards = screen.getAllByRole("listitem");
      expect(cards.length).toBe(3);
      expect(screen.getByText("월간 손익 리포트 작성")).toBeInTheDocument();
      expect(screen.getByText("예산안 초안 생성")).toBeInTheDocument();
      expect(screen.queryByText("브랜드 카피 10종 생성")).not.toBeInTheDocument();
      expect(screen.queryByText("스프린트 회고 정리")).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3 [P1]: 검색 (title 또는 jobRole 부분일치, 대소문자 무시)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-3[P1]: 검색어로 title/jobRole 부분일치 필터 (대소문자 무시)", () => {
    it("filters to items whose title or jobRole contains '카피' (2 of 12)", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "카피" } });

      const cards = screen.getAllByRole("listitem");
      expect(cards.length).toBe(2);
      expect(screen.getByText("브랜드 카피 10종 생성")).toBeInTheDocument();
      expect(screen.getByText("무료 세금계산서 안내")).toBeInTheDocument();
      expect(screen.queryByText("스프린트 회고 정리")).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it("matches case-insensitively: lowercase 'prompt' finds title 'AI Prompt Toolkit'", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "prompt" } });

      const cards = screen.getAllByRole("listitem");
      expect(cards.length).toBe(1);
      expect(screen.getByText("AI Prompt Toolkit")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4 [P1]: 로딩 상태 (read 완료 전 Skeleton 6개)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-4[P1]: read 완료 전 Skeleton 6개, 완료 후 카드 렌더", () => {
    it("shows 6 skeleton placeholders before the read resolves, then renders cards and hides skeletons", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));

      // read가 완료되기 전: Skeleton 6개, 카드 리스트는 렌더되지 않음
      expect(document.querySelectorAll('[data-skeleton="true"]').length).toBe(6);
      expect(screen.queryAllByRole("listitem").length).toBe(0);

      flushLoading();

      // read 완료 후: Skeleton 사라지고 카드 12개 렌더
      expect(document.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
      expect(screen.getAllByRole("listitem").length).toBe(12);

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5 [P1]: 빈 검색 결과
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-5[P1]: 검색 결과 0건 → EmptyState", () => {
    it("shows '검색 결과가 없어요' with an icon and no cards for a non-matching query", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "존재하지않음zzz" } });

      expect(screen.queryAllByRole("listitem").length).toBe(0);
      expect(screen.getByText("검색 결과가 없어요")).toBeInTheDocument();
      expect(document.querySelector("[data-content-icon]")).toBeTruthy();

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-6 [P2]: 배너 광고 배치 (섹션 사이 1회)
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-6[P2]: AdSlot 배너를 상단 섹션과 리스트 사이에 1회 배치", () => {
    it("renders exactly one AdSlot banner element between the top section and the card list", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const adSlots = document.querySelectorAll("[data-ad-group-id]");
      expect(adSlots.length).toBe(1);

      vi.useRealTimers();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-7: 카드 탭 → 상세 이동
  // ────────────────────────────────────────────────────────────────────────

  describe("AC-7: 카드 탭 시 navigate('/prompt/'+id) 호출", () => {
    it("navigates to /prompt/p-mkt-1 when the matching card is clicked", () => {
      vi.useFakeTimers();
      seedPrompts(buildTwelvePrompts());

      renderWithRouter(React.createElement(MarketHome));
      flushLoading();

      const cards = screen.getAllByRole("listitem");
      const target = cards.find((c) => c.textContent?.includes("브랜드 카피 10종 생성"));
      expect(target).toBeTruthy();

      fireEvent.click(target as HTMLElement);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/prompt/p-mkt-1");

      vi.useRealTimers();
    });
  });
});
