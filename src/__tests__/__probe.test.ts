import React from "react";
import { describe, it, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

import { FloatingTabBar } from "@/components/FloatingTabBar";

function TestSideLogger() {
  const loc = useLocation();
  // eslint-disable-next-line no-console
  console.log("TESTSIDE_PATH:", loc.pathname);
  return null;
}

describe("probe", () => {
  it("with mocks: test-side vs src-side useLocation", () => {
    vi.useFakeTimers();
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/library"] },
        React.createElement(TestSideLogger),
        React.createElement(FloatingTabBar, {
          items: [
            { label: "마켓", path: "/" },
            { label: "라이브러리", path: "/library" },
          ],
        }),
      ),
    );
    act(() => vi.runAllTimers());
    vi.useRealTimers();
  });
});
