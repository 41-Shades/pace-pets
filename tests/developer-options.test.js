import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("PacePetsDeveloperOptions", () => {
  it("derives forceable state groups from the pace-state catalog", () => {
    const options = globalThis.PacePetsDeveloperOptions;
    const groupsByKey =
      globalThis.PacePetsPaceStateData.PACE_STATE_GROUPS_BY_KEY;

    expect(
      options.FORCEABLE_PACE_STATE_GROUPS.map((group) => ({
        key: group.key,
        options: group.options.map((option) => option.key),
      })),
    ).toEqual([
      {
        key: "paceLevels",
        options: groupsByKey.paceLevels.displayStateKeys,
      },
      {
        key: "perfectStates",
        options: groupsByKey.perfectStates.displayStateKeys,
      },
      {
        key: "imperfectStates",
        options: groupsByKey.imperfectStates.displayStateKeys,
      },
    ]);
    expect(options.FORCEABLE_PACE_STATE_KEYS).toEqual([
      ...groupsByKey.paceLevels.displayStateKeys,
      ...groupsByKey.perfectStates.displayStateKeys,
      ...groupsByKey.imperfectStates.displayStateKeys,
    ]);
  });
});

describe("PacePetsDeveloperOptions storage", () => {
  it("normalizes local developer state overrides", () => {
    const options = globalThis.PacePetsDeveloperOptions;

    expect(options.STORAGE_KEY).toBe("pacePetsDeveloperOptions");
    expect(options.CRITICAL_BADGE_WINDOW_KEY).toBe("criticalBadgeWindow");
    expect(options.MANUAL_REFRESH_LEAD_WINDOW_KEY).toBe(
      "manualRefreshLeadWindow",
    );
    expect(options.MAX_POOL_FILL_KEY).toBe("maxPoolFill");
    expect(options.normalizeForcedPaceStateKey("sync")).toBe("sync");
    expect(options.normalizeForcedPaceStateKey("unsupported")).toBeNull();
    expect(options.normalizeCriticalBadgeWindow(true)).toBe(true);
    expect(options.normalizeCriticalBadgeWindow("true")).toBe(false);
    expect(options.normalizeManualRefreshLeadWindow(true)).toBe(true);
    expect(options.normalizeManualRefreshLeadWindow("true")).toBe(false);
    expect(options.normalizeMaxPoolFill(true)).toBe(true);
    expect(options.normalizeMaxPoolFill("true")).toBe(false);
    expect(
      options.normalizeDeveloperOptions({
        criticalBadgeWindow: true,
        forcedPaceState: "perfectZero",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
        unsupported: false,
      }),
    ).toMatchObject({
      criticalBadgeWindow: true,
      forcedPaceStateKey: "perfectZero",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
    });
    expect(options.normalizeDeveloperOptions(null)).toMatchObject({
      criticalBadgeWindow: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
    });
  });

  it("owns the stored developer-options value shape", () => {
    const options = globalThis.PacePetsDeveloperOptions;

    expect(
      options.storedDeveloperOptionsValue({
        criticalBadgeWindow: true,
        forcedPaceStateKey: "perfectZero",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
      }),
    ).toEqual({
      criticalBadgeWindow: true,
      forcedPaceState: "perfectZero",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
    });
    expect(
      options.developerOptionsStorageItems({
        criticalBadgeWindow: true,
      }),
    ).toEqual({
      pacePetsDeveloperOptions: {
        criticalBadgeWindow: true,
      },
    });
    expect(options.developerOptionsStorageItems({})).toBeNull();
    expect(
      options.developerOptionsFromStorageItems({
        pacePetsDeveloperOptions: {
          forcedPaceState: "perfectZero",
        },
      }),
    ).toMatchObject({
      forcedPaceStateKey: "perfectZero",
    });
    expect(options.hasStoredDeveloperOptionsValue({})).toBe(false);
    expect(
      options.hasStoredDeveloperOptionsValue({ criticalBadgeWindow: true }),
    ).toBe(true);
    expect(
      options.hasDeveloperOptionsChange({
        pacePetsDeveloperOptions: { newValue: {} },
      }),
    ).toBe(true);
  });
});
