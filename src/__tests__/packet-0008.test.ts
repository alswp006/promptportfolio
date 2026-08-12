/**
 * TDD Red Phase — Packet 0008: 판매 등록 페이지 `/sell`
 *
 * Tests for SellPrompt (/sell): form fields + category selector + full-width submit CTA,
 * inline validation (title/body/price) without saving, save-then-navigate happy path,
 * first-entry onboarding AlertDialog gate, and duplicate-submit guard.
 * Run: npx vitest run src/__tests__/packet-0008.test.ts
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

import SellPrompt from "@/pages/SellPrompt";
import { getPrompts } from "@/lib/promptStore";
import { getFlags } from "@/lib/settlement";

const FLAGS_KEY = "pp.flags";
const PROMPTS_KEY = "pp.prompts";

function seedOnboarded() {
  localStorage.setItem(FLAGS_KEY, JSON.stringify({ onboardedSeller: true }));
}

function fieldByLabel(label: string): HTMLInputElement | HTMLTextAreaElement {
  const labelEl = screen.getByText(label, { selector: "label" });
  const wrapper = labelEl.parentElement as HTMLElement;
  const field = wrapper.querySelector("input, textarea");
  if (!field) throw new Error(`no input/textarea found for label "${label}"`);
  return field as HTMLInputElement | HTMLTextAreaElement;
}

function selectCategory(name: string) {
  const el = screen.queryByRole("tab", { name }) ?? screen.getByRole("button", { name });
  fireEvent.click(el);
}

function fillValidForm() {
  fireEvent.change(fieldByLabel("제목"), { target: { value: "3줄 회의록 요약 프롬프트" } });
  fireEvent.change(fieldByLabel("직무"), { target: { value: "PM 매니저" } });
  fireEvent.change(fieldByLabel("본문"), {
    target: {
      value: "회의록 텍스트를 붙여넣으면 핵심 결정사항 세 줄로 요약해주는 프롬프트입니다.",
    },
  });
  fireEvent.change(fieldByLabel("샘플 출력"), {
    target: { value: "1) 예산 승인 2) 출시일 연기 3) 담당자 재배정" },
  });
  fireEvent.change(fieldByLabel("가격"), { target: { value: "8900" } });
  selectCategory("PM");
}

function submitButton() {
  return screen.getByRole("button", { name: "등록하기" });
}

beforeEach(() => {
  seedOnboarded();
});

describe("판매 등록 페이지 `/sell`", () => {
  it("AC-1: renders all fields, category selector, and a full-width submit CTA inside ScreenScaffold — no app-install or outlink copy", () => {
    const { container } = renderWithRouter(React.createElement(SellPrompt));

    expect(screen.getByText("제목")).toBeInTheDocument();
    expect(screen.getByText("직무")).toBeInTheDocument();
    expect(screen.getByText("본문")).toBeInTheDocument();
    expect(screen.getByText("샘플 출력")).toBeInTheDocument();
    expect(screen.getByText("가격")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "마케팅" })).toBeInTheDocument();

    const submit = submitButton();
    expect(submit).toHaveAttribute("data-slot", "fixed-bottom-cta");
    expect(container.querySelector('[style*="100dvh"]')).not.toBeNull();

    expect(screen.queryByText(/앱\s*설치/)).not.toBeInTheDocument();
    expect(screen.queryByText(/다운로드받/)).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="http"]')).toBeNull();
  });

  it("AC-2[P0]: shows '제목을 입력해주세요' for an empty title and does not save", () => {
    renderWithRouter(React.createElement(SellPrompt));
    fillValidForm();
    fireEvent.change(fieldByLabel("제목"), { target: { value: "" } });

    fireEvent.click(submitButton());

    expect(screen.getByText("제목을 입력해주세요")).toBeInTheDocument();
    expect(getPrompts()).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: shows '프롬프트 본문은 20자 이상이어야 해요' when body is under 20 characters and does not save", () => {
    renderWithRouter(React.createElement(SellPrompt));
    fillValidForm();
    fireEvent.change(fieldByLabel("본문"), { target: { value: "짧은 본문" } });

    fireEvent.click(submitButton());

    expect(screen.getByText("프롬프트 본문은 20자 이상이어야 해요")).toBeInTheDocument();
    expect(getPrompts()).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: shows '가격은 0원 또는 1,000~50,000원이어야 해요' for an out-of-range nonzero price and does not save", () => {
    renderWithRouter(React.createElement(SellPrompt));
    fillValidForm();
    fireEvent.change(fieldByLabel("가격"), { target: { value: "500" } });

    fireEvent.click(submitButton());

    expect(screen.getByText("가격은 0원 또는 1,000~50,000원이어야 해요")).toBeInTheDocument();
    expect(getPrompts()).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-3: on valid submit, saves the prompt with version=1/usedCount=0 and navigates to '/prompt/:newId'", async () => {
    renderWithRouter(React.createElement(SellPrompt));
    fillValidForm();

    fireEvent.click(submitButton());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));

    const prompts = getPrompts();
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      title: "3줄 회의록 요약 프롬프트",
      category: "PM",
      priceWon: 8900,
      version: 1,
      usedCount: 0,
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/prompt/${prompts[0].id}`);
  });

  it("AC-4: shows the onboarding AlertDialog on first entry when pp.flags.onboardedSeller is unset, and setting it once on confirm", () => {
    localStorage.removeItem(FLAGS_KEY);
    renderWithRouter(React.createElement(SellPrompt));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/수수료 20%가 차감되어 정산돼요/)).toBeInTheDocument();
    expect(getFlags().onboardedSeller).not.toBe(true);

    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(getFlags().onboardedSeller).toBe(true);
  });

  it("AC-4: does not show the onboarding AlertDialog once pp.flags.onboardedSeller is already true", () => {
    seedOnboarded();
    renderWithRouter(React.createElement(SellPrompt));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(getFlags().onboardedSeller).toBe(true);
  });

  it("AC-5[P0]: blocks duplicate submits while saving so only one prompt is persisted", async () => {
    renderWithRouter(React.createElement(SellPrompt));
    fillValidForm();
    const submit = submitButton();

    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());

    expect(getPrompts()).toHaveLength(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(PROMPTS_KEY) ?? "[]")).toHaveLength(1);
  });
});
