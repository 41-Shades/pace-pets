import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it, vi } from "vitest";

function windowOption(windowKey) {
  const attributes = new Map();
  const classes = new Set();
  return {
    attributes,
    classes,
    classList: {
      toggle: vi.fn((className, enabled) => {
        if (enabled) {
          classes.add(className);
        } else {
          classes.delete(className);
        }
      }),
    },
    dataset: { windowKey },
    hidden: false,
    setAttribute: vi.fn((name, value) => attributes.set(name, value)),
  };
}

function windowToggle() {
  const attributes = new Map();
  return {
    attributes,
    dataset: {},
    disabled: false,
    getAttribute: vi.fn((name) => attributes.get(name) || null),
    setAttribute: vi.fn((name, value) => attributes.set(name, value)),
  };
}

function appWithWindowControls() {
  const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
  const weeklyOption = windowOption("weekly");
  const fiveHourOption = windowOption("fiveHour");
  const toggle = windowToggle();
  app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
  app.WINDOW_SPECS = app.USAGE_WINDOWS.WINDOW_SPECS;
  app.appTooltips = { setText: vi.fn() };
  app.elements = {
    windowOptions: [weeklyOption, fiveHourOption],
    windowToggle: toggle,
  };
  return { app, fiveHourOption, toggle, weeklyOption };
}

beforeAll(async () => {
  await importExtensionScript("collector/extension/usage-windows.js");
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript("collector/extension/dashboard-state-methods.js");
});

describe("PacePetsDashboardApp window controls", () => {
  it("offers only weekly when the latest sample has no five-hour window", () => {
    const { app, fiveHourOption, toggle, weeklyOption } =
      appWithWindowControls();

    app.renderWindowControls("weekly", { weekly: {} });

    expect(toggle.dataset.nextWindowKey).toBe("");
    expect(toggle.disabled).toBe(true);
    expect(toggle.attributes.get("aria-disabled")).toBe("true");
    expect(toggle.attributes.get("aria-label")).toContain(
      "No alternate window is available for this account.",
    );
    expect(app.appTooltips.setText).toHaveBeenCalledWith(toggle, "");
    expect(weeklyOption.classes).toEqual(new Set(["active"]));
    expect(weeklyOption.hidden).toBe(false);
    expect(fiveHourOption.hidden).toBe(true);
    expect(fiveHourOption.attributes.get("aria-disabled")).toBe("true");
  });

  it("offers five-hour when the latest sample reports it", () => {
    const { app, fiveHourOption, toggle, weeklyOption } =
      appWithWindowControls();

    app.renderWindowControls("weekly", { fiveHour: {}, weekly: {} });

    expect(toggle.dataset.nextWindowKey).toBe("fiveHour");
    expect(toggle.disabled).toBe(false);
    expect(toggle.attributes.get("aria-disabled")).toBe("false");
    expect(app.appTooltips.setText).toHaveBeenCalledWith(
      toggle,
      "Toggle time window (T)",
    );
    expect(weeklyOption.hidden).toBe(false);
    expect(fiveHourOption.hidden).toBe(false);
    expect(fiveHourOption.attributes.get("aria-disabled")).toBe("false");
  });
});

describe("PacePetsDashboardApp window selection", () => {
  it("replaces a selection that disappears without reviving it later", () => {
    const { app } = appWithWindowControls();
    app.selectedWindowKey = "fiveHour";
    app.storeSessionWindowKey = vi.fn();

    expect(app.selectedAvailableWindowKey({ weekly: {} })).toBe("weekly");
    expect(app.storeSessionWindowKey).toHaveBeenCalledWith("weekly");
    expect(app.selectedAvailableWindowKey({ fiveHour: {}, weekly: {} })).toBe(
      "weekly",
    );
    expect(app.storeSessionWindowKey).toHaveBeenCalledTimes(1);
  });

  it("uses only the newest successful sample for availability", () => {
    const { app } = appWithWindowControls();
    const originalHistory = globalThis.CodexUsageHistory;
    globalThis.CodexUsageHistory = {
      latestSample: (history) => history.samples.at(-1),
    };
    app.currentHistory = {
      samples: [
        { windows: { fiveHour: {}, weekly: {} } },
        { windows: { weekly: {} } },
      ],
    };

    try {
      expect(app.currentUsageWindows()).toEqual({ weekly: {} });
    } finally {
      globalThis.CodexUsageHistory = originalHistory;
    }
  });

  it("persists only a window available in committed dashboard state", () => {
    const { app } = appWithWindowControls();
    app.currentUsageWindows = () =>
      app.currentHistory?.samples?.at(-1)?.windows || {};
    app.storeSessionWindowKey = vi.fn();
    app.renderResetExhaustedPreview = vi.fn();
    app.renderHistory = vi.fn();
    app.paceView = { renderStateRail: vi.fn() };
    const developerOptions = {
      brakeIntensityPreview: null,
      checkerboardRevealWhiteTransparent: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
      railHidden: false,
      resetExhaustedPreview: false,
      splatTimeRemainingPreview: null,
      sprintIntensityPreview: null,
    };

    app.applyDashboardState({
      dashboardWindowKey: "fiveHour",
      developerOptions,
      hasChatGptAccess: false,
      history: { samples: [] },
      refreshStatus: null,
      refreshWindowSelection: true,
    });

    expect(app.selectedWindowKey).toBe("weekly");
    expect(app.storeSessionWindowKey).toHaveBeenCalledWith("weekly");

    app.applyDashboardState({
      dashboardWindowKey: "fiveHour",
      developerOptions,
      hasChatGptAccess: true,
      history: {
        samples: [{ windows: { fiveHour: {}, weekly: {} } }],
      },
      refreshStatus: null,
      refreshWindowSelection: true,
    });

    expect(app.selectedWindowKey).toBe("fiveHour");
    expect(app.storeSessionWindowKey).toHaveBeenLastCalledWith("fiveHour");
  });
});
