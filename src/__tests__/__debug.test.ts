import React from "react";
import { describe, it, expect } from "vitest";
import { screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

import App from "@/App";

describe("debug", () => {
  it("renders at /library directly", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/library"] });
    act(() => {});
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((t) => {
      console.log("TAB", t.getAttribute("aria-label"), t.getAttribute("aria-selected"));
    });
  });
});
