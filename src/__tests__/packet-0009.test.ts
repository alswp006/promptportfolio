/**
 * TDD Red Phase — Packet 0009: 정산 대시보드 페이지 `/dashboard`
 *
 * Tests for Dashboard (/dashboard): getSales() 로드 후 순수익 합계·건수·총매출·수수료를
 * SummaryHero(net-hero)로 표시, 판매 ≥2건 시 netWon 추이 Sparkline, 최근 내역 ListRow
 * 최신순, 빈 배열 시 EmptyState, 로드 중 Skeleton, 하드코딩 HEX 색상 없음.
 * Run: npx vitest run src/__tests__/packet-0009.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, within, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { SaleRecord } from "@/lib/types";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

import Dashboard from "@/pages/Dashboard";

const SALES_KEY = "pp.sales";

function makeSale(overrides: Partial<SaleRecord> & Pick<SaleRecord, "id">): SaleRecord {
  const gross = overrides.grossWon ?? 3000;
  const commission = overrides.commissionWon ?? Math.floor(gross * 0.2);
  return {
    id: overrides.id,
    promptId: overrides.promptId ?? `prompt-${overrides.id}`,
    promptTitle: overrides.promptTitle ?? "3줄 회의록 요약 프롬프트",
    grossWon: gross,
    commissionWon: commission,
    netWon: overrides.netWon ?? gross - commission,
    soldAt: overrides.soldAt ?? Date.now(),
  };
}

function seedSales(sales: SaleRecord[]) {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

function flush() {
  act(() => {
    vi.runAllTimers();
  });
}

function renderDashboard() {
  return renderWithRouter(React.createElement(Dashboard));
}

describe("정산 대시보드 페이지 `/dashboard`", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-1[P0]: getSales() 로드 후 순수익 합계·건수·총매출·수수료 표시
  // ────────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: shows net total '6,400원', 2건, gross '8,000원', commission '1,600원' after getSales() loads", () => {
    vi.useFakeTimers();
    seedSales([
      makeSale({ id: "s1", grossWon: 3000, commissionWon: 600, netWon: 2400, soldAt: 1_700_000_000_000 }),
      makeSale({ id: "s2", grossWon: 5000, commissionWon: 1000, netWon: 4000, soldAt: 1_700_003_600_000 }),
    ]);

    renderDashboard();
    flush();

    expect(screen.getByText("6,400원")).toBeInTheDocument();
    expect(screen.getByText(/2건/)).toBeInTheDocument();
    expect(screen.getByText("8,000원")).toBeInTheDocument();
    expect(screen.getByText("1,600원")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("AC-1[P0]: shows '0원' totals and 0건 when getSales() returns an empty array", () => {
    vi.useFakeTimers();
    seedSales([]);

    renderDashboard();
    flush();

    expect(screen.getAllByText("0원").length).toBeGreaterThan(0);
    expect(screen.getByText(/0건/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-2[P0]: data-testid='net-hero' SummaryHero — 순수익 CountUp t2~t3 강조, Card로 묶임
  // ────────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: renders a Card-wrapped SummaryHero (data-testid='net-hero') with net total as a t2/t3 CountUp value", () => {
    vi.useFakeTimers();
    seedSales([
      makeSale({ id: "s1", grossWon: 3000, commissionWon: 600, netWon: 2400 }),
      makeSale({ id: "s2", grossWon: 5000, commissionWon: 1000, netWon: 4000 }),
    ]);

    renderDashboard();
    flush();

    const hero = screen.getByTestId("net-hero");
    expect(hero).toBeInTheDocument();

    const emphasized = hero.querySelector('[data-typography="t2"], [data-typography="t3"]');
    expect(emphasized).not.toBeNull();
    expect(emphasized).toHaveTextContent("6,400원");

    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-3: 판매 ≥2건 시 최근 netWon 추이 Sparkline 표시
  // ────────────────────────────────────────────────────────────────────────

  it("AC-3: renders a netWon trend Sparkline when there are 2 or more sales", () => {
    vi.useFakeTimers();
    seedSales([
      makeSale({ id: "s1", netWon: 2400, soldAt: 1_700_000_000_000 }),
      makeSale({ id: "s2", netWon: 4000, soldAt: 1_700_003_600_000 }),
    ]);

    renderDashboard();
    flush();

    const sparkline = screen.getByRole("img", { name: "추이 그래프" });
    expect(sparkline.tagName.toLowerCase()).toBe("svg");

    vi.useRealTimers();
  });

  it("AC-3: does not render the Sparkline for a single sale", () => {
    vi.useFakeTimers();
    seedSales([makeSale({ id: "s1", netWon: 2400 })]);

    renderDashboard();
    flush();

    expect(screen.queryByRole("img", { name: "추이 그래프" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-4: 빈 배열 시 Asset.ContentIcon+'아직 판매 내역이 없어요', 히어로 '0원', 크래시 없음
  // ────────────────────────────────────────────────────────────────────────

  it("AC-4: renders EmptyState with a content icon and '아직 판매 내역이 없어요' plus a '0원' hero, without crashing", () => {
    vi.useFakeTimers();
    seedSales([]);

    expect(() => {
      renderDashboard();
      flush();
    }).not.toThrow();

    expect(screen.getByText("아직 판매 내역이 없어요")).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).not.toBeNull();
    const hero = screen.getByTestId("net-hero");
    expect(within(hero).getByText("0원")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("AC-4: renders EmptyState without crashing when pp.sales is missing entirely", () => {
    expect(() => {
      renderDashboard();
    }).not.toThrow();
  });

  // ────────────────────────────────────────────────────────────────────────
  // AC-5: 내역 TDS ListRow로 promptTitle·netWon·판매일 최신순, read 중 Skeleton, HEX 색상 없음
  // ────────────────────────────────────────────────────────────────────────

  it("AC-5[P0]: shows Skeleton rows while loading, then renders sale rows newest-first with promptTitle and netWon", () => {
    vi.useFakeTimers();
    seedSales([
      makeSale({
        id: "s1",
        promptTitle: "3줄 회의록 요약 프롬프트",
        netWon: 2400,
        soldAt: 1_700_000_000_000,
      }),
      makeSale({
        id: "s2",
        promptTitle: "면접 예상 질문 생성기",
        netWon: 4000,
        soldAt: 1_700_003_600_000,
      }),
    ]);

    renderDashboard();

    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);

    flush();

    const rows = screen.getAllByTestId("sale-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("면접 예상 질문 생성기")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/4,000원/)).toBeInTheDocument();
    expect(within(rows[1]).getByText("3줄 회의록 요약 프롬프트")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/2,400원/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("AC-5: does not hardcode any #RRGGBB hex color in the rendered output (adaptive/TDS tokens only)", () => {
    vi.useFakeTimers();
    seedSales([
      makeSale({ id: "s1", netWon: 2400, soldAt: 1_700_000_000_000 }),
      makeSale({ id: "s2", netWon: 4000, soldAt: 1_700_003_600_000 }),
    ]);

    const { container } = renderDashboard();
    flush();

    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{6}\b/);

    vi.useRealTimers();
  });
});
