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

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
});

describe("PacePetsDashboardApp window controls", () => {
  it("keeps the temporarily unavailable 5h option legible and inactive", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const weeklyOption = windowOption("weekly");
    const fiveHourOption = windowOption("fiveHour");
    const toggle = windowToggle();
    app.USAGE_WINDOWS = {
      alternateWindowKey: () => "fiveHour",
      isSelectableWindowKey: (windowKey) => windowKey === "weekly",
    };
    app.WINDOW_SPECS = {
      weekly: { badge: "7d" },
      fiveHour: {
        badge: "5h",
        unavailableReason:
          "5h temporarily unavailable — paused by the usage provider.",
      },
    };
    app.appTooltips = { setText: vi.fn() };
    app.elements = {
      windowOptions: [weeklyOption, fiveHourOption],
      windowToggle: toggle,
    };

    app.renderWindowControls("weekly");

    expect(toggle.dataset.nextWindowKey).toBe("");
    expect(toggle.attributes.get("aria-disabled")).toBe("true");
    expect(toggle.attributes.get("aria-label")).toContain(
      "5h temporarily unavailable",
    );
    expect(app.appTooltips.setText).toHaveBeenCalledWith(
      toggle,
      "5h temporarily unavailable — paused by the usage provider.",
    );
    expect(weeklyOption.classes).toEqual(new Set(["active"]));
    expect(fiveHourOption.classes).toEqual(new Set(["unavailable"]));
    expect(fiveHourOption.attributes.get("aria-disabled")).toBe("true");
  });
});
