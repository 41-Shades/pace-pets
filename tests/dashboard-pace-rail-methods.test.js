import { beforeAll, describe, expect, it, vi } from "vitest";

import { importExtensionScript } from "./helpers/extension-runtime.js";

class DashboardPaceController {
  constructor(elements) {
    this.elements = elements;
  }
}

const paceStates = {
  bigBang: { key: "bigBang" },
  muted: { key: "muted" },
  nothingness: { key: "nothingness" },
  perfectZero: { key: "perfectZero" },
  singularity: { key: "singularity" },
  splat: { key: "splat" },
  sync: { key: "sync" },
};

beforeAll(async () => {
  globalThis.PacePetsDashboardPaceData = {
    PACE_STATES: paceStates,
  };
  globalThis.PacePetsDashboardPaceController = DashboardPaceController;
  await importExtensionScript(
    "collector/extension/dashboard-pace-rail-methods.js",
  );
});

function createController({ railHidden = false } = {}) {
  const chips = ["on", "nothingness"].map((key) => ({
    classList: { toggle: vi.fn() },
    dataset: { paceStateKey: key },
  }));
  const paceStateRail = { hidden: false };
  const paceStateStack = {
    hidden: false,
    querySelectorAll: vi.fn(() => chips),
  };
  const controller = new DashboardPaceController({
    paceStateRail,
    paceStateStack,
  });
  controller.getCurrentRailHidden = () => railHidden;
  return { chips, controller, paceStateRail, paceStateStack };
}

describe("Dashboard pace state rail visibility", () => {
  it("keeps the rail visible and selects Nothingness", () => {
    const { chips, controller, paceStateRail, paceStateStack } =
      createController();

    controller.updateStateRailActiveSelection("nothingness");

    expect(paceStateRail.hidden).toBe(false);
    expect(paceStateStack.hidden).toBe(false);
    expect(paceStateStack.querySelectorAll).toHaveBeenCalledWith(
      ".state-chip[data-pace-state-key]",
    );
    expect(chips[0].classList.toggle).toHaveBeenCalledWith("is-active", false);
    expect(chips[1].classList.toggle).toHaveBeenCalledWith("is-active", true);
  });

  it("still honors the explicit developer rail-hidden control", () => {
    const { chips, controller, paceStateRail, paceStateStack } =
      createController({ railHidden: true });

    controller.updateStateRailActiveSelection("nothingness");

    expect(paceStateRail.hidden).toBe(true);
    expect(paceStateStack.hidden).toBe(true);
    expect(paceStateStack.querySelectorAll).not.toHaveBeenCalled();
    expect(chips[0].classList.toggle).not.toHaveBeenCalled();
    expect(chips[1].classList.toggle).not.toHaveBeenCalled();
  });
});
