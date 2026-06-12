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
    expect(options.RESET_EXHAUSTED_PREVIEW_KEY).toBe("resetExhaustedPreview");
    expect(options.SPRINT_INTENSITY_PREVIEW_KEY).toBe("sprintIntensityPreview");
    expect(options.SPRINT_INTENSITY_PREVIEW_VALUES).toEqual([
      "1.55",
      "2.00",
      "3.00",
      "4.00",
      "5.00",
      "6.00",
      "7.00",
    ]);
    expect(options.normalizeForcedPaceStateKey("sync")).toBe("sync");
    expect(options.normalizeForcedPaceStateKey("unsupported")).toBeNull();
    expect(options.normalizeCriticalBadgeWindow(true)).toBe(true);
    expect(options.normalizeCriticalBadgeWindow("true")).toBe(false);
    expect(options.normalizeManualRefreshLeadWindow(true)).toBe(true);
    expect(options.normalizeManualRefreshLeadWindow("true")).toBe(false);
    expect(options.normalizeMaxPoolFill(true)).toBe(true);
    expect(options.normalizeMaxPoolFill("true")).toBe(false);
    expect(options.normalizeResetExhaustedPreview(true)).toBe(true);
    expect(options.normalizeResetExhaustedPreview("true")).toBe(false);
    expect(options.normalizeSprintIntensityPreview("4.00")).toBe("4.00");
    expect(options.normalizeSprintIntensityPreview("unsupported")).toBeNull();
    expect(
      options.normalizeDeveloperOptions({
        criticalBadgeWindow: true,
        forcedPaceState: "wellAhead",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
        resetExhaustedPreview: true,
        sprintIntensityPreview: "4.00",
        unsupported: false,
      }),
    ).toMatchObject({
      criticalBadgeWindow: true,
      forcedPaceStateKey: "wellAhead",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
      resetExhaustedPreview: true,
      sprintIntensityPreview: "4.00",
    });
    expect(
      options.normalizeDeveloperOptions({
        forcedPaceState: "perfectZero",
        sprintIntensityPreview: "7.00",
      }),
    ).toMatchObject({
      forcedPaceStateKey: "perfectZero",
      sprintIntensityPreview: null,
    });
    expect(options.normalizeDeveloperOptions(null)).toMatchObject({
      criticalBadgeWindow: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
      resetExhaustedPreview: false,
      sprintIntensityPreview: null,
    });
  });
});

describe("PacePetsDeveloperOptions stored value shape", () => {
  it("owns the stored developer-options value shape", () => {
    const options = globalThis.PacePetsDeveloperOptions;

    expect(
      options.storedDeveloperOptionsValue({
        criticalBadgeWindow: true,
        forcedPaceStateKey: "wellAhead",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
        resetExhaustedPreview: true,
        sprintIntensityPreview: "7.00",
      }),
    ).toEqual({
      criticalBadgeWindow: true,
      forcedPaceState: "wellAhead",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
      resetExhaustedPreview: true,
      sprintIntensityPreview: "7.00",
    });
    expect(
      options.storedDeveloperOptionsValue({
        forcedPaceStateKey: "perfectZero",
        sprintIntensityPreview: "7.00",
      }),
    ).toEqual({
      forcedPaceState: "perfectZero",
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
