import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const storageListeners = new Map();
let storeThemePreference;

beforeAll(async () => {
  globalThis.PacePetsDashboardPreferences = {
    THEME_STORAGE_KEY: "codex-usage-theme",
    normalizeTheme(value) {
      return ["light", "dark"].includes(value) ? value : null;
    },
    readThemePreference: vi.fn(() => ({ error: null, value: null })),
    storeThemePreference: vi.fn(() => ({ error: null, ok: true })),
  };

  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dev-flags-theme-mode.js"),
    )
  );
});

beforeEach(() => {
  storageListeners.clear();
  storeThemePreference =
    globalThis.PacePetsDashboardPreferences.storeThemePreference;
  storeThemePreference.mockClear();
  globalThis.document = {
    documentElement: {
      dataset: {},
    },
  };
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

describe("PacePetsDevFlagsThemeMode", () => {
  it("renders and persists the shared extension-page theme mode", async () => {
    const renderedRows = [];
    const listElement = {
      replaceChildren: vi.fn((...rows) => {
        renderedRows.splice(0, renderedRows.length, ...rows);
      }),
    };
    const optionRow = vi.fn((options) => ({ options }));
    const setStatus = vi.fn();

    const control = globalThis.PacePetsDevFlagsThemeMode.createThemeModeControl(
      {
        listElement,
        optionRow,
        setStatus,
      },
    );

    control.render();

    expect(globalThis.document.documentElement.dataset.theme).toBe("light");
    expect(renderedRows.map((row) => row.options.labelText)).toEqual([
      "Light",
      "Dark",
    ]);
    expect(renderedRows[0].options.pressed).toBe(true);

    await renderedRows[1].options.onClick({ pressed: false });

    expect(storeThemePreference).toHaveBeenCalledWith("dark");
    expect(globalThis.document.documentElement.dataset.theme).toBe("dark");
    expect(setStatus).toHaveBeenCalledWith("Theme mode: Dark.");

    storageListeners.get("storage")({
      key: "codex-usage-theme",
      newValue: "light",
    });

    expect(globalThis.document.documentElement.dataset.theme).toBe("light");
  });
});
