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
describe("PacePetsLogic immutable presentations", () => {
  it("builds canonical pace presentations for badge and dashboard states", () => {
    const bigBangPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(100, 100);
    expect(bigBangPresentation.state.key).toBe("bigBang");
    expect(bigBangPresentation.displayRatio).toBe(1);
    expect(bigBangPresentation.paceRatio).toBe(1);

    const syncPresentation = globalThis.PacePetsLogic.pacePresentationForValues(
      50.4,
      49.6,
    );
    expect(syncPresentation.state.key).toBe("sync");
    expect(syncPresentation.displayRatio).toBe(1);
    expect(syncPresentation.paceRatio).toBeCloseTo(50.4 / 49.6);

    const zeroPresentation = globalThis.PacePetsLogic.pacePresentationForValues(
      0.4,
      0,
    );
    expect(zeroPresentation.state.key).toBe("perfectZero");
    expect(zeroPresentation.displayRatio).toBe(0);
    expect(zeroPresentation.paceRatio).toBeNull();

    const finalBandExactZeroPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(0, 0.4);
    expect(finalBandExactZeroPresentation.state.key).toBe("perfectZero");
    expect(finalBandExactZeroPresentation.displayRatio).toBe(0);

    const earlyExactZeroPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(0, 0.6);
    expect(earlyExactZeroPresentation.state.key).toBe("splat");
    expect(earlyExactZeroPresentation.displayRatio).toBe(0);

    const earlyDisplayedZeroPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(0.4, 50);
    expect(earlyDisplayedZeroPresentation.state.key).toBe("splat");
    expect(earlyDisplayedZeroPresentation.displayRatio).toBe(0);
    expect(earlyDisplayedZeroPresentation.paceRatio).toBe(0.008);
  });
});

describe("PacePetsLogic window presentations", () => {
  it("handles window boundaries, blocked zero, and normal pace", () => {
    const activeZeroWindow = {
      remainingPercent: 0.4,
      resetsAt: "2026-05-25T12:01:00.000Z",
      windowMinutes: 300,
    };
    const activeZeroPresentation =
      globalThis.PacePetsLogic.pacePresentationForWindow(activeZeroWindow, {
        atMs: Date.parse("2026-05-25T12:00:00.000Z"),
      });
    expect(activeZeroPresentation.state.key).toBe("perfectZero");
    expect(activeZeroPresentation.displayRatio).toBe(0);

    const singularityPresentation =
      globalThis.PacePetsLogic.pacePresentationForWindow(
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
      globalThis.PacePetsLogic.pacePresentationForWindow(
        {
          remainingPercent: 0,
          resetsAt: "2026-05-25T12:00:00.000Z",
          windowMinutes: 300,
        },
        { atMs: Date.parse("2026-05-25T12:00:00.000Z") },
      ),
    ).toMatchObject({
      displayRatio: null,
      paceRatio: null,
      state: { key: "muted" },
    });
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

    const blockedDisplayedZeroPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(0.4, 0, {
        allowPerfectZero: false,
      });
    expect(blockedDisplayedZeroPresentation.state.key).toBe("splat");
    expect(blockedDisplayedZeroPresentation.displayRatio).toBe(0);
    const normalPresentation =
      globalThis.PacePetsLogic.pacePresentationForValues(50.6, 49.4);
    expect(normalPresentation).toMatchObject({
      displayRatio: 50.6 / 49.4,
      paceRatio: 50.6 / 49.4,
      state: { key: "on" },
    });
    expect(Object.isFrozen(normalPresentation)).toBe(true);
  });

  it("shares one percent display formatter with state rules", () => {
    const logic = globalThis.PacePetsLogic;
    expect(logic.formatDisplayPercent(null)).toBe("--");
    expect(logic.formatDisplayPercent("")).toBe("--");
    expect(logic.formatDisplayPercent(-1)).toBe("0%");
    expect(logic.formatDisplayPercent(0.4)).toBe("0%");
    expect(logic.formatDisplayPercent(0.5)).toBe("1%");
    expect(logic.formatDisplayPercent("99.5")).toBe("100%");
    expect(logic.formatDisplayPercent(101)).toBe("100%");
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
    expect(globalThis.PacePetsLogic.badgeTextForPaceRatio(null)).toBe("--");
    expect(globalThis.PacePetsLogic.badgeTextForPaceRatio("  ")).toBe("--");
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
    expect(globalThis.PacePetsLogic.paceStateForRatio(null)).toBe(states.muted);
    expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(null)).toBe(
      colors.muted,
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
    expect(globalThis.PacePetsLogic.chartPaceRatio(null)).toBeNull();
  });
});

describe("PacePetsLogic display-scale boundaries", () => {
  it("maps the displayed ratio to the matching threshold state", () => {
    const states = globalThis.PacePetsLogic.PACE_STATES;
    const displayBoundaryCases = [
      [0.544, "0.54", states.criticalBehind],
      [0.549, "0.55", states.wellBehind],
      [0.744, "0.74", states.wellBehind],
      [0.749, "0.75", states.behind],
      [0.894, "0.89", states.behind],
      [0.899, "0.90", states.on],
      [1.104, "1.10", states.on],
      [1.106, "1.11", states.ahead],
      [1.254, "1.25", states.ahead],
      [1.256, "1.26", states.strongAhead],
      [1.554, "1.55", states.strongAhead],
      [1.556, "1.56", states.wellAhead],
    ];

    for (const [ratio, display, state] of displayBoundaryCases) {
      expect(globalThis.PacePetsLogic.formatPaceRatioValue(ratio)).toBe(
        display,
      );
      expect(globalThis.PacePetsLogic.paceStateForRatio(ratio)).toBe(state);
      expect(globalThis.PacePetsLogic.badgeColorForPaceRatio(ratio)).toBe(
        state.badgeColor,
      );
    }
  });
});
