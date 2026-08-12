import React from "react";
import { describe, it } from "vitest";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { useLocation } from "react-router-dom";

function Probe() {
  const loc = useLocation();
  console.log("PROBE_PATH:", loc.pathname);
  return null;
}

describe("probe2", () => {
  it("shows pathname", () => {
    renderWithRouter(React.createElement(Probe), { initialEntries: ["/library"] });
  });
});
