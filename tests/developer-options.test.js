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
    expect(options.CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY).toBe(
      "checkerboardRevealWhiteTransparent",
    );
    expect(options.CRITICAL_BADGE_WINDOW_KEY).toBe("criticalBadgeWindow");
    expect(options.MANUAL_REFRESH_LEAD_WINDOW_KEY).toBe(
      "manualRefreshLeadWindow",
    );
    expect(options.MAX_POOL_FILL_KEY).toBe("maxPoolFill");
    expect(options.RAIL_HIDDEN_KEY).toBe("railHidden");
    expect(options.RESET_EXHAUSTED_PREVIEW_KEY).toBe("resetExhaustedPreview");
    expect(options.SPLAT_TIME_REMAINING_PREVIEW_KEY).toBe(
      "splatTimeRemainingPreview",
    );
    expect(options.BRAKE_INTENSITY_PREVIEW_KEY).toBe("brakeIntensityPreview");
    expect(options.SPRINT_INTENSITY_PREVIEW_KEY).toBe("sprintIntensityPreview");
    expect(options.SPLAT_TIME_REMAINING_PREVIEW_VALUES).toEqual({
      over50: "over50",
      under50: "under50",
    });
    expect(options.BRAKE_INTENSITY_PREVIEW_VALUES).toEqual([
      "0.55",
      "0.45",
      "0.35",
      "0.25",
      "0.15",
      "0.05",
      "0.00",
    ]);
    expect(options.SPRINT_INTENSITY_PREVIEW_VALUES).toEqual([
      "1.55",
      "2.00",
      "3.00",
      "4.00",
      "5.00",
      "6.00",
      "7.00",
    ]);
  });
});

describe("PacePetsDeveloperOptions normalization", () => {
  it("normalizes local developer state overrides", () => {
    const options = globalThis.PacePetsDeveloperOptions;

    expect(options.normalizeForcedPaceStateKey("sync")).toBe("sync");
    expect(options.normalizeForcedPaceStateKey("unsupported")).toBeNull();
    expect(options.normalizeCheckerboardRevealWhiteTransparent(true)).toBe(
      true,
    );
    expect(options.normalizeCheckerboardRevealWhiteTransparent("true")).toBe(
      false,
    );
    expect(options.normalizeCriticalBadgeWindow(true)).toBe(true);
    expect(options.normalizeCriticalBadgeWindow("true")).toBe(false);
    expect(options.normalizeManualRefreshLeadWindow(true)).toBe(true);
    expect(options.normalizeManualRefreshLeadWindow("true")).toBe(false);
    expect(options.normalizeMaxPoolFill(true)).toBe(true);
    expect(options.normalizeMaxPoolFill("true")).toBe(false);
    expect(options.normalizeRailHidden(true)).toBe(true);
    expect(options.normalizeRailHidden("true")).toBe(false);
    expect(options.normalizeResetExhaustedPreview(true)).toBe(true);
    expect(options.normalizeResetExhaustedPreview("true")).toBe(false);
    expect(options.normalizeSplatTimeRemainingPreview("over50")).toBe("over50");
    expect(
      options.normalizeSplatTimeRemainingPreview("unsupported"),
    ).toBeNull();
    expect(options.normalizeBrakeIntensityPreview("0.25")).toBe("0.25");
    expect(options.normalizeBrakeIntensityPreview("unsupported")).toBeNull();
    expect(options.normalizeSprintIntensityPreview("4.00")).toBe("4.00");
    expect(options.normalizeSprintIntensityPreview("unsupported")).toBeNull();
    expect(
      options.normalizeDeveloperOptions({
        checkerboardRevealWhiteTransparent: true,
        criticalBadgeWindow: true,
        forcedPaceState: "wellAhead",
        brakeIntensityPreview: "0.05",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
        railHidden: true,
        resetExhaustedPreview: true,
        sprintIntensityPreview: "4.00",
        unsupported: false,
      }),
    ).toMatchObject({
      checkerboardRevealWhiteTransparent: true,
      criticalBadgeWindow: true,
      forcedPaceStateKey: "wellAhead",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
      railHidden: true,
      resetExhaustedPreview: true,
      brakeIntensityPreview: null,
      sprintIntensityPreview: "4.00",
    });
    expect(
      options.normalizeDeveloperOptions({
        forcedPaceState: "criticalBehind",
        brakeIntensityPreview: "0.05",
        sprintIntensityPreview: "7.00",
      }),
    ).toMatchObject({
      forcedPaceStateKey: "criticalBehind",
      brakeIntensityPreview: "0.05",
      sprintIntensityPreview: null,
    });
    expect(
      options.normalizeDeveloperOptions({
        forcedPaceState: "perfectZero",
        brakeIntensityPreview: "0.05",
        splatTimeRemainingPreview: "over50",
        sprintIntensityPreview: "7.00",
      }),
    ).toMatchObject({
      forcedPaceStateKey: "perfectZero",
      brakeIntensityPreview: null,
      splatTimeRemainingPreview: null,
      sprintIntensityPreview: null,
    });
    expect(
      options.normalizeDeveloperOptions({
        forcedPaceState: "splat",
        splatTimeRemainingPreview: "under50",
      }),
    ).toMatchObject({
      forcedPaceStateKey: "splat",
      splatTimeRemainingPreview: "under50",
    });
    expect(options.normalizeDeveloperOptions(null)).toMatchObject({
      checkerboardRevealWhiteTransparent: false,
      criticalBadgeWindow: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
      railHidden: false,
      resetExhaustedPreview: false,
      brakeIntensityPreview: null,
      splatTimeRemainingPreview: null,
      sprintIntensityPreview: null,
    });
  });
});

describe("PacePetsDeveloperOptions stored value shape", () => {
  it("owns the stored developer-options value shape", () => {
    const options = globalThis.PacePetsDeveloperOptions;

    expect(
      options.storedDeveloperOptionsValue({
        checkerboardRevealWhiteTransparent: true,
        criticalBadgeWindow: true,
        forcedPaceStateKey: "wellAhead",
        brakeIntensityPreview: "0.00",
        manualRefreshLeadWindow: true,
        maxPoolFill: true,
        railHidden: true,
        resetExhaustedPreview: true,
        sprintIntensityPreview: "7.00",
      }),
    ).toEqual({
      checkerboardRevealWhiteTransparent: true,
      criticalBadgeWindow: true,
      forcedPaceState: "wellAhead",
      manualRefreshLeadWindow: true,
      maxPoolFill: true,
      railHidden: true,
      resetExhaustedPreview: true,
      sprintIntensityPreview: "7.00",
    });
    expect(
      options.storedDeveloperOptionsValue({
        forcedPaceStateKey: "criticalBehind",
        brakeIntensityPreview: "0.00",
        sprintIntensityPreview: "7.00",
      }),
    ).toEqual({
      forcedPaceState: "criticalBehind",
      brakeIntensityPreview: "0.00",
    });
    expect(
      options.storedDeveloperOptionsValue({
        forcedPaceStateKey: "perfectZero",
        brakeIntensityPreview: "0.00",
        splatTimeRemainingPreview: "over50",
        sprintIntensityPreview: "7.00",
      }),
    ).toEqual({
      forcedPaceState: "perfectZero",
    });
    expect(
      options.storedDeveloperOptionsValue({
        forcedPaceStateKey: "splat",
        splatTimeRemainingPreview: "over50",
      }),
    ).toEqual({
      forcedPaceState: "splat",
      splatTimeRemainingPreview: "over50",
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
