/**
 * TDD Red Phase — Packet 0011: 라우팅 배선 · 탭 네비 · 진입점 통합
 *
 * Tests for App.tsx: 5개 라우트('/', '/prompt/:id', '/sell', '/dashboard', '/library') 등록,
 * 미매칭 경로는 '/'로 리다이렉트, 마운트 시 ensureSeeded() 1회 실행 후 홈에 시드 카드 렌더,
 * FloatingTabBar 4탭(마켓/라이브러리/판매/정산) 연결 + 현재 경로 활성 표시,
 * 새로고침/직접 URL 진입에서도 5개 라우트 모두 크래시 없이 렌더.
 *
 * NOTE: react-router-dom is NOT mocked here (real MemoryRouter + real useNavigate/useLocation)
 * so that actual navigation and FloatingTabBar active-tab behavior can be exercised end-to-end.
 * Only TDS and the apps-in-toss SDK are mocked (both crash/throw in jsdom otherwise).
 *
 * Run: npx vitest run src/__tests__/packet-0011.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Prompt } from "@/lib/types";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

import App from "@/App";

const PROMPTS_KEY = "pp.prompts";

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

function seedPrompts(prompts: Prompt[]) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
}

function flush() {
  act(() => {
    vi.runAllTimers();
  });
}

function renderAppAt(path: string) {
  return renderWithRouter(React.createElement(App), { initialEntries: [path] });
}

describe("라우팅 배선 · 탭 네비 · 진입점 통합", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1[P0]: 5개 라우트 등록 + 미매칭 경로는 '/'로 리다이렉트
  // ────────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: '/' renders the market home screen", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트" })]);

    renderAppAt("/");
    flush();

    expect(screen.getByText("프롬프트 마켓")).toBeInTheDocument();
    expect(screen.getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
  });

  it("AC-1[P0]: an unmatched path redirects to '/' and renders the market home screen", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);

    renderAppAt("/does-not-exist");
    flush();

    expect(screen.getByText("프롬프트 마켓")).toBeInTheDocument();
    expect(screen.queryByText("does-not-exist")).not.toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2[P0]: 마운트 시 ensureSeeded() 1회 실행 후 홈에 시드 카드 렌더
  // ────────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: seeds pp.prompts on mount when empty, and renders a seeded card on the home screen", () => {
    vi.useFakeTimers();
    expect(localStorage.getItem(PROMPTS_KEY)).toBeNull();

    renderAppAt("/");
    flush();

    const stored = JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? "[]");
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText("SNS 바이럴 캠페인 기획")).toBeInTheDocument();
  });

  it("AC-2: does not overwrite existing pp.prompts (idempotent seeding) on mount", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "custom-1", title: "이미 있는 프롬프트" })]);

    renderAppAt("/");
    flush();

    const stored = JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("custom-1");
    expect(screen.getByText("이미 있는 프롬프트")).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3[P0]: FloatingTabBar 4탭 연결 + 현재 경로 활성 표시
  // ────────────────────────────────────────────────────────────────────────

  it("AC-3[P0]: shows a 4-tab FloatingTabBar (마켓/라이브러리/판매/정산) with the current route's tab active", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);

    const { unmount } = renderAppAt("/");
    flush();

    let tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual([
      "마켓",
      "라이브러리",
      "판매",
      "정산",
    ]);
    expect(tabs.find((t) => t.getAttribute("aria-label") === "마켓")?.getAttribute("aria-selected")).toBe(
      "true",
    );

    unmount();

    renderAppAt("/library");
    flush();

    tabs = screen.getAllByRole("tab");
    const activeTab = tabs.find((t) => t.getAttribute("aria-label") === "라이브러리");
    expect(activeTab?.getAttribute("aria-selected")).toBe("true");
    expect(tabs.find((t) => t.getAttribute("aria-label") === "마켓")?.getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("AC-3[P0]: tapping the '정산' tab navigates to the dashboard screen", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);

    renderAppAt("/library");
    flush();

    fireEvent.click(screen.getByRole("tab", { name: "정산" }));
    flush();

    expect(screen.getByRole("heading", { name: "정산" })).toBeInTheDocument();
    expect(screen.getByText("총 순수익")).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5[P0]: 새로고침/직접 URL 진입 시 5개 라우트 모두 크래시 없이 렌더
  // ────────────────────────────────────────────────────────────────────────

  it("AC-5[P0]: directly entering '/sell', '/dashboard', and '/library' renders each without crashing", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1" })]);

    let mounted = renderAppAt("/sell");
    expect(() => flush()).not.toThrow();
    expect(screen.getByText("프롬프트 등록")).toBeInTheDocument();
    mounted.unmount();

    mounted = renderAppAt("/dashboard");
    expect(() => flush()).not.toThrow();
    expect(screen.getByRole("heading", { name: "정산" })).toBeInTheDocument();
    mounted.unmount();

    mounted = renderAppAt("/library");
    expect(() => flush()).not.toThrow();
    expect(screen.getByText("내 라이브러리")).toBeInTheDocument();
    mounted.unmount();
  });

  it("AC-5[P0]: directly entering '/prompt/:id' renders the matching prompt, and an unknown id renders an empty state without crashing", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트" })]);

    const first = renderAppAt("/prompt/p1");
    flush();
    expect(screen.getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
    first.unmount();

    expect(() => {
      renderAppAt("/prompt/does-not-exist");
      flush();
    }).not.toThrow();
    expect(screen.getByText("프롬프트를 찾을 수 없어요")).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────────────────
  // Integration: navigate() targets used across pages resolve to a real route
  // ────────────────────────────────────────────────────────────────────────

  it("Integration: tapping a market card navigates to its prompt detail route", () => {
    vi.useFakeTimers();
    seedPrompts([makePrompt({ id: "p1", title: "3줄 회의록 요약 프롬프트" })]);

    renderAppAt("/");
    flush();

    fireEvent.click(screen.getByText("3줄 회의록 요약 프롬프트"));
    flush();

    expect(screen.getByTestId("prompt-detail-card")).toBeInTheDocument();
    expect(within(screen.getByTestId("prompt-detail-card")).getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
  });
});
