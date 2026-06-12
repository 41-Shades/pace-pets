import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function storageWith(value) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/usage-windows.js"),
    )
  );
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-preferences.js"),
    )
  );
});

describe("PacePetsDashboardPreferences metadata", () => {
  it("owns dashboard-local preference keys and scopes", () => {
    const preferences = globalThis.PacePetsDashboardPreferences;

    expect(preferences.DASHBOARD_WINDOW_SESSION_KEY).toBe(
      "pace-pets-dashboard-window",
    );
    expect(preferences.THEME_STORAGE_KEY).toBe("codex-usage-theme");
    expect(preferences.THEME_VALUES).toEqual(["light", "dark"]);
    expect(preferences.MOTION_STORAGE_KEY).toBe("pace-pets-dashboard-motion");
    expect(preferences.MOTION_VALUES).toEqual(["on", "off"]);
    expect(preferences.DEFAULT_MOTION).toBe("on");
    expect(preferences.LOCAL_PREFERENCES).toEqual([
      {
        key: "pace-pets-dashboard-window",
        scope: "sessionStorage",
        values: "supported usage-window keys",
      },
      {
        key: "codex-usage-theme",
        scope: "localStorage",
        values: "`light`, `dark`",
      },
      {
        key: "pace-pets-dashboard-motion",
        scope: "localStorage",
        values: "`on`, `off`",
      },
    ]);
  });
});

describe("PacePetsDashboardPreferences storage", () => {
  it("normalizes and stores the tab-scoped dashboard window", () => {
    const preferences = globalThis.PacePetsDashboardPreferences;
    const storage = storageWith("fiveHour");

    expect(preferences.readDashboardWindowPreference(storage)).toEqual({
      error: null,
      value: "fiveHour",
    });
    expect(
      preferences.storeDashboardWindowPreference("weekly", storage),
    ).toEqual({
      error: null,
      ok: true,
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      preferences.DASHBOARD_WINDOW_SESSION_KEY,
      "weekly",
    );
    expect(
      preferences.readDashboardWindowPreference(storageWith("unsupported")),
    ).toEqual({
      error: null,
      value: null,
    });
  });

  it("normalizes and stores the extension-page theme", () => {
    const preferences = globalThis.PacePetsDashboardPreferences;
    const storage = storageWith("dark");

    expect(preferences.readThemePreference(storage)).toEqual({
      error: null,
      value: "dark",
    });
    expect(preferences.storeThemePreference("light", storage)).toEqual({
      error: null,
      ok: true,
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      preferences.THEME_STORAGE_KEY,
      "light",
    );
    expect(preferences.readThemePreference(storageWith("blue"))).toEqual({
      error: null,
      value: null,
    });
    expect(preferences.storeThemePreference("blue", storage)).toEqual({
      error: null,
      ok: false,
    });
  });

  it("normalizes and stores the extension-page motion preference", () => {
    const preferences = globalThis.PacePetsDashboardPreferences;
    const storage = storageWith("off");

    expect(preferences.readMotionPreference(storage)).toEqual({
      error: null,
      value: "off",
    });
    expect(preferences.storeMotionPreference("on", storage)).toEqual({
      error: null,
      ok: true,
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      preferences.MOTION_STORAGE_KEY,
      "on",
    );
    expect(preferences.readMotionPreference(storageWith("soft"))).toEqual({
      error: null,
      value: null,
    });
    expect(preferences.motionPreferenceEnabled(storageWith("off"))).toBe(false);
    expect(preferences.motionPreferenceEnabled(storageWith("on"))).toBe(true);
    expect(preferences.motionPreferenceEnabled(storageWith(null))).toBe(true);
    expect(preferences.storeMotionPreference("soft", storage)).toEqual({
      error: null,
      ok: false,
    });
  });
});

describe("PacePetsDashboardPreferences storage errors", () => {
  it("returns storage errors without throwing", () => {
    const preferences = globalThis.PacePetsDashboardPreferences;
    const error = new Error("storage disabled");
    const storage = {
      getItem: vi.fn(() => {
        throw error;
      }),
      setItem: vi.fn(() => {
        throw error;
      }),
    };

    expect(preferences.readThemePreference(storage)).toEqual({
      error,
      value: null,
    });
    expect(preferences.storeThemePreference("dark", storage)).toEqual({
      error,
      ok: false,
    });
    expect(preferences.readMotionPreference(storage)).toEqual({
      error,
      value: null,
    });
    expect(preferences.storeMotionPreference("off", storage)).toEqual({
      error,
      ok: false,
    });
  });
});
