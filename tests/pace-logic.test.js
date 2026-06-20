import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";
import { describe, expect, it } from "vitest";
installExtensionRuntimeHooks();
describe("PacePetsLogic", () => {
  it("computes bounded time percent and pace ratios for a reset window", () => {
    const windowData = {
      remainingPercent: 25,
      resetsAt: "2026-05-25T14:00:00.000Z",
      windowMinutes: 300,
    };
    expect(
      globalThis.PacePetsLogic.timeRemainingPercentAt(
        windowData,
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(40);
    expect(
      globalThis.PacePetsLogic.paceRatioForWindow(
        windowData,
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(0.625);
  });

  it("detects displayed perfect sync percent pairs including zero-zero", () => {
    expect(globalThis.PacePetsLogic.paceRatioForValues(0, 0)).toBeNull();
    expect(globalThis.PacePetsLogic.isPerfectSyncPercentPair(0, 0)).toBe(true);
    expect(globalThis.PacePetsLogic.isPerfectZeroPercentPair(0, 0)).toBe(true);
    expect(globalThis.PacePetsLogic.isPerfectSyncPercentPair(0.4, 0)).toBe(
      true,
    );
    expect(globalThis.PacePetsLogic.isPerfectZeroPercentPair(0.4, 0)).toBe(
      true,
    );
    expect(globalThis.PacePetsLogic.isPerfectSyncPercentPair(0.6, 0)).toBe(
      false,
    );
    expect(globalThis.PacePetsLogic.isPerfectZeroPercentPair(0.6, 0)).toBe(
      false,
    );
    expect(globalThis.PacePetsLogic.isPerfectSyncPercentPair(50.4, 49.6)).toBe(
      true,
    );
    expect(globalThis.PacePetsLogic.isPerfectZeroPercentPair(50.4, 49.6)).toBe(
      false,
    );
    expect(
      globalThis.PacePetsLogic.isPerfectHundredPercentPair(99.6, 100),
    ).toBe(true);
    expect(
      globalThis.PacePetsLogic.isPerfectHundredPercentPair(99.4, 99.4),
    ).toBe(false);
    expect(globalThis.PacePetsLogic.isPerfectSyncPercentPair(null, 0)).toBe(
      false,
    );
    expect(globalThis.PacePetsLogic.isPerfectZeroPercentPair(null, 0)).toBe(
      false,
    );
  });
});
describe("PacePetsLogic controlled presentations", () => {
  it("builds controlled pace presentations for badge and dashboard sync states", () => {
    const bigBangPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForValues(100, 100);
    expect(bigBangPresentation.state.key).toBe("bigBang");
    expect(bigBangPresentation.displayRatio).toBe(1);
    expect(bigBangPresentation.paceRatio).toBe(1);

    const syncPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForValues(50.4, 49.6);
    expect(syncPresentation.state.key).toBe("sync");
    expect(syncPresentation.displayRatio).toBe(1);
    expect(syncPresentation.paceRatio).toBeCloseTo(50.4 / 49.6);

    const zeroPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForValues(0.4, 0);
    expect(zeroPresentation.state.key).toBe("perfectZero");
    expect(zeroPresentation.displayRatio).toBe(0);
    expect(zeroPresentation.paceRatio).toBeNull();

    const finalBandExactZeroPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForValues(0, 0.4);
    expect(finalBandExactZeroPresentation.state.key).toBe("perfectZero");
    expect(finalBandExactZeroPresentation.displayRatio).toBe(0);

    const earlyExactZeroPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForValues(0, 0.6);
    expect(earlyExactZeroPresentation.state.key).toBe("splat");
    expect(earlyExactZeroPresentation.displayRatio).toBe(0);

    const activeZeroWindow = {
      remainingPercent: 0.4,
      resetsAt: "2026-05-25T12:01:00.000Z",
      windowMinutes: 300,
    };
    const activeZeroPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForWindow(
        activeZeroWindow,
        { atMs: Date.parse("2026-05-25T12:00:00.000Z") },
      );
    expect(activeZeroPresentation.state.key).toBe("perfectZero");
    expect(activeZeroPresentation.displayRatio).toBe(0);

    const singularityPresentation =
      globalThis.PacePetsLogic.controlledPacePresentationForWindow(
        {
          remainingPercent: 0.4,
          resetsAt: "2026-05-25T12:00:30.000Z",
          windowMinutes: 300,
        },
        { atMs: Date.parse("2026-05-25T12:00:00.000Z") },
      );
    expect(singularityPresentation.state.key).toBe("singularity");
    expect(singularityPresentation.displayRatio).toBe(0);
    expect(
      globalThis.PacePetsLogic.resetCountdownDisplaysZero(
        "2026-05-25T12:00:30.000Z",
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(true);

    expect(
      globalThis.PacePetsLogic.controlledPacePresentationForWindow(
        {
          remainingPercent: 0,
          resetsAt: "2026-05-25T12:00:00.000Z",
          windowMinutes: 300,
        },
        { atMs: Date.parse("2026-05-25T12:00:00.000Z") },
      ),
    ).toBeNull();
    expect(globalThis.PacePetsLogic.isResetWindowStale(activeZeroWindow)).toBe(
      false,
    );
    expect(
      globalThis.PacePetsLogic.isResetWindowStale(
        {
          remainingPercent: 0,
          resetsAt: "2026-05-25T12:00:00.000Z",
          windowMinutes: 300,
        },
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(true);

    expect(
      globalThis.PacePetsLogic.controlledPacePresentationForValues(0.4, 0, {
        allowPerfectZero: false,
      }),
    ).toBeNull();
    expect(
      globalThis.PacePetsLogic.controlledPacePresentationForValues(50.6, 49.4),
    ).toBeNull();
  });
});

describe("PacePetsLogic perfect-zero history", () => {
  it("detects usage that reached displayed zero before the final time band", () => {
    const windowData = {
      remainingPercent: 0.4,
      resetsAt: "2026-05-25T15:00:00.000Z",
      windowMinutes: 300,
    };

    expect(
      globalThis.PacePetsLogic.usageZeroedBeforeFinalTimeBand(
        windowData,
        Date.parse("2026-05-25T14:58:00.000Z"),
      ),
    ).toBe(true);
    expect(
      globalThis.PacePetsLogic.usageZeroedBeforeFinalTimeBand(
        windowData,
        Date.parse("2026-05-25T14:59:00.000Z"),
      ),
    ).toBe(false);
    expect(
      globalThis.PacePetsLogic.usageZeroedBeforeFinalTimeBand(
        { ...windowData, remainingPercent: 0.6 },
        Date.parse("2026-05-25T14:58:00.000Z"),
      ),
    ).toBe(false);
  });

  it("shares reset-window history checks for perfect-zero presentation control", () => {
    const windowData = {
      remainingPercent: 0,
      resetsAt: "2026-05-25T15:00:00.000Z",
      windowMinutes: 300,
    };
    const history = {
      samples: [
        {
          collectedAt: "2026-05-25T14:58:00.000Z",
          windows: {
            weekly: {
              remainingPercent: 0.4,
              resetsAt: "2026-05-25T15:00:00.000Z",
              windowMinutes: 300,
            },
          },
        },
      ],
    };

    expect(
      globalThis.PacePetsLogic.allowsPerfectZeroForWindow(
        history,
        "weekly",
        windowData,
      ),
    ).toBe(false);
    expect(
      globalThis.PacePetsLogic.allowsPerfectZeroForWindow(
        { samples: [] },
        "weekly",
        windowData,
      ),
    ).toBe(true);
  });
});

describe("PacePetsLogic presentation", () => {
  it("formats dashboard and badge pace ratios with their existing caps", () => {
    expect(globalThis.PacePetsLogic.formatPaceRatioValue(0.005)).toBe("<0.01");
    expect(
      globalThis.PacePetsLogic.formatPaceRatioValue(120, { suffix: "x" }),
    ).toBe("100x+");
    expect(globalThis.PacePetsLogic.badgeTextForPaceRatio(0.005)).toBe("0.01");
    expect(globalThis.PacePetsLogic.badgeTextForPaceRatio(12)).toBe("10+");
    expect(globalThis.PacePetsLogic.badgeTextForPaceRatio(undefined)).toBe(
      "--",
    );
  });

  it("maps pace ratios to badge colors at threshold boundaries", () => {
    const colors = globalThis.PacePetsLogic.DEFAULT_BADGE_COLORS;
    const states = globalThis.PacePetsLogic.PACE_STATES;

    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(undefined)).toBe(
      colors.muted,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(0.54)).toBe(
      colors.criticalBehind,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(0.55)).toBe(
      colors.wellBehind,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(0.75)).toBe(
      colors.behind,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(0.9)).toBe(
      colors.on,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(1.25)).toBe(
      colors.ahead,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(1.55)).toBe(
      colors.strongAhead,
    );
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(1.56)).toBe(
      colors.wellAhead,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(undefined)).toBe(
      states.muted,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(0.54)).toBe(
      states.criticalBehind,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(0.55)).toBe(
      states.wellBehind,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(0.75)).toBe(
      states.behind,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(0.9)).toBe(states.on);
    expect(globalThis.PacePetsLogic.paceStateForRatio(1.25)).toBe(states.ahead);
    expect(globalThis.PacePetsLogic.paceStateForRatio(1.55)).toBe(
      states.strongAhead,
    );
    expect(globalThis.PacePetsLogic.paceStateForRatio(1.56)).toBe(
      states.wellAhead,
    );
    expect(states.wellAhead.playfulImage).toBe(
      globalThis.CodexThemeAssets.paceIconPathForState("wellAhead"),
    );
    expect(states.perfectZero.playfulImage).toBe(
      globalThis.CodexThemeAssets.paceIconPathForState("perfectZero"),
    );
    expect(globalThis.PacePetsLogic.PACE_LEGEND_STATE_KEYS).toEqual([
      "wellAhead",
      "on",
      "behind",
      "strongAhead",
      "bigBang",
      "sync",
      "wellBehind",
      "ahead",
      "perfectZero",
      "criticalBehind",
    ]);
  });

  it("clamps chart pace points to the configured y bounds", () => {
    expect(globalThis.PacePetsLogic.chartPaceRatio(51)).toBe(50);
    expect(globalThis.PacePetsLogic.chartPaceRatio(-1)).toBe(0);
    expect(
      globalThis.PacePetsLogic.chartPaceRatio(12, { min: 0.5, max: 2 }),
    ).toBe(2);
    expect(globalThis.PacePetsLogic.chartPaceRatio("nope")).toBeNull();
  });
});
