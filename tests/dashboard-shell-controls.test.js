import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const storageListeners = new Map();

function toggleElement() {
  const attributes = new Map();
  return {
    attributes,
    setAttribute: vi.fn((name, value) => attributes.set(name, value)),
  };
}

function createControls() {
  const motionToggle = toggleElement();
  const themeToggle = toggleElement();
  const onMotionPreferenceChanged = vi.fn();
  const refreshThemeSensitiveViews = vi.fn();
  const setTooltipText = vi.fn();
  const controls = globalThis.PacePetsDashboardShellControls.createController({
    appTooltips: { setText: setTooltipText },
    earlyReset: {},
    elements: { motionToggle, themeToggle },
    onMotionPreferenceChanged,
    refreshThemeSensitiveViews,
  });
  return {
    controls,
    motionToggle,
    onMotionPreferenceChanged,
    refreshThemeSensitiveViews,
    setTooltipText,
  };
}

beforeAll(async () => {
  globalThis.PacePetsDashboardPreferences = {
    DEFAULT_MOTION: "on",
    MOTION_STORAGE_KEY: "pace-pets-dashboard-motion",
    THEME_STORAGE_KEY: "codex-usage-theme",
    normalizeMotion: (value) => (["on", "off"].includes(value) ? value : null),
    normalizeTheme: (value) =>
      ["light", "dark"].includes(value) ? value : null,
    notifyMotionPreferenceChanged: vi.fn(),
    readMotionPreference: vi.fn(() => ({ error: null, value: "on" })),
    readThemePreference: vi.fn(() => ({ error: null, value: null })),
    storeMotionPreference: vi.fn(),
    storeThemePreference: vi.fn(),
  };
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-shell-controls.js"),
    )
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  storageListeners.clear();
  globalThis.document = { documentElement: { dataset: {} } };
  globalThis.window = {
    addEventListener: vi.fn((eventName, listener) => {
      storageListeners.set(eventName, listener);
    }),
    matchMedia: vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
    })),
  };
});

describe("PacePetsDashboardShellControls preference sync", () => {
  it("applies motion storage changes from another dashboard", () => {
    const { motionToggle, onMotionPreferenceChanged, setTooltipText } =
      createControls();

    storageListeners.get("storage")({
      key: "pace-pets-dashboard-motion",
      newValue: "off",
    });

    expect(globalThis.document.documentElement.dataset.motion).toBe("off");
    expect(motionToggle.attributes.get("aria-pressed")).toBe("false");
    expect(motionToggle.attributes.get("aria-label")).toBe(
      "Turn motion effects on",
    );
    expect(setTooltipText).toHaveBeenLastCalledWith(
      motionToggle,
      "Turn motion effects on",
    );
    expect(onMotionPreferenceChanged).toHaveBeenCalledWith("off");
    expect(
      globalThis.PacePetsDashboardPreferences.notifyMotionPreferenceChanged,
    ).toHaveBeenCalledWith("off");
  });

  it("restores the default when a peer removes the motion preference", () => {
    const { onMotionPreferenceChanged } = createControls();

    storageListeners.get("storage")({
      key: "pace-pets-dashboard-motion",
      newValue: null,
    });

    expect(globalThis.document.documentElement.dataset.motion).toBe("on");
    expect(onMotionPreferenceChanged).toHaveBeenCalledWith("on");
  });

  it("keeps theme storage changes scoped to theme refreshes", () => {
    const { onMotionPreferenceChanged, refreshThemeSensitiveViews } =
      createControls();

    storageListeners.get("storage")({
      key: "codex-usage-theme",
      newValue: "dark",
    });

    expect(globalThis.document.documentElement.dataset.theme).toBe("dark");
    expect(refreshThemeSensitiveViews).toHaveBeenCalledTimes(1);
    expect(onMotionPreferenceChanged).not.toHaveBeenCalled();
  });
});
