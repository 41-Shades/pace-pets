import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(
    pathToFileURL(path.join(projectRoot, "collector/extension", source))
  );
}

async function importRuntimeManifest() {
  await importExtensionScript("runtime-manifest.js");
  const runtimeManifest = globalThis.CodexExtensionRuntime;
  if (!Array.isArray(runtimeManifest?.COMMON_SCRIPT_SOURCES)) {
    throw new Error("Extension runtime manifest common sources are not wired.");
  }
  return runtimeManifest;
}

beforeAll(async () => {
  const runtimeManifest = await importRuntimeManifest();
  for (const source of runtimeManifest.COMMON_SCRIPT_SOURCES) {
    await importExtensionScript(source);
  }
  await importExtensionScript("background-logic.js");
});

describe("PacePetsBackgroundLogic auth", () => {
  it("extracts access tokens from supported session shapes only", () => {
    const logic = globalThis.PacePetsBackgroundLogic;

    expect(logic.extractAccessToken({ accessToken: "direct" })).toBe("direct");
    expect(logic.extractAccessToken({ access_token: "snake" })).toBe("snake");
    expect(
      logic.extractAccessToken({ session: { accessToken: "nested" } }),
    ).toBe("nested");
    expect(
      logic.extractAccessToken({ session: { access_token: "nested-snake" } }),
    ).toBe("nested-snake");
    expect(logic.extractAccessToken({ session: {} })).toBeNull();
  });

  it("reads session response tokens without throwing on unusable responses", async () => {
    const logic = globalThis.PacePetsBackgroundLogic;

    await expect(
      logic.extractAccessTokenFromSessionResponse({
        ok: true,
        json: async () => ({ accessToken: "direct" }),
      }),
    ).resolves.toBe("direct");
    await expect(
      logic.extractAccessTokenFromSessionResponse({
        ok: false,
        json: async () => {
          throw new Error("should not parse");
        },
      }),
    ).resolves.toBeNull();
    await expect(
      logic.extractAccessTokenFromSessionResponse({
        ok: true,
        json: async () => {
          throw new SyntaxError("unexpected token");
        },
      }),
    ).resolves.toBeNull();
  });

  it("builds usage headers without adding authorization when no token exists", () => {
    const logic = globalThis.PacePetsBackgroundLogic;

    expect(logic.usageHeaders(null, "en-GB")).toEqual({
      Accept: "application/json",
      "oai-language": "en-GB",
    });
    expect(logic.usageHeaders("token", "en-US")).toEqual({
      Accept: "application/json",
      Authorization: "Bearer token",
      "oai-language": "en-US",
    });
  });

  it("retries only auth failures that used an access token", () => {
    const logic = globalThis.PacePetsBackgroundLogic;

    expect(logic.shouldRetryUsageResponse(401, "token")).toBe(true);
    expect(logic.shouldRetryUsageResponse(403, "token")).toBe(true);
    expect(logic.shouldRetryUsageResponse(401, null)).toBe(false);
    expect(logic.shouldRetryUsageResponse(500, "token")).toBe(false);
  });
});

describe("PacePetsBackgroundLogic badge selection", () => {
  it("defines the shared badge window preference", () => {
    const usageWindows = globalThis.CodexUsageWindows;

    expect(usageWindows.BADGE_WINDOW_STORAGE_KEY).toBe("codex-usage-window");
    expect(usageWindows.DEFAULT_WINDOW_KEY).toBe("weekly");
    expect(usageWindows.WINDOW_KEYS).toEqual(["weekly", "fiveHour"]);
    expect(usageWindows.WINDOW_BADGE_LABELS).toEqual({
      fiveHour: "5h",
      weekly: "7d",
    });
  });

  it("selects badge windows from valid stored preferences and available data", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const storageKey = globalThis.CodexUsageWindows.BADGE_WINDOW_STORAGE_KEY;

    expect(logic.selectedBadgeWindowKeyFromItems({}, storageKey)).toBe(
      "weekly",
    );
    expect(
      logic.selectedBadgeWindowKeyFromItems(
        { [storageKey]: "fiveHour" },
        storageKey,
      ),
    ).toBe("fiveHour");
    expect(
      logic.selectedBadgeWindowKeyFromItems(
        { [storageKey]: "unsupported" },
        storageKey,
      ),
    ).toBe("weekly");

    expect(
      logic.badgeWindowKey({ fiveHour: { remainingPercent: 50 } }, "weekly"),
    ).toBe("fiveHour");
    expect(
      logic.badgeWindowKey(
        {
          weekly: { remainingPercent: 80 },
          fiveHour: { remainingPercent: 50 },
        },
        "fiveHour",
      ),
    ).toBe("fiveHour");
    expect(logic.badgeWindowKey({}, "unsupported")).toBe("weekly");
  });

  it("prioritizes critical badge attention before the stored window preference", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const candidates = [
      {
        paceRatio: 1,
        stateKey: "on",
        windowKey: "weekly",
      },
      {
        paceRatio: 0.42,
        stateKey: "criticalBehind",
        windowKey: "fiveHour",
      },
    ];

    expect(logic.isAttentionBadgeStateKey("criticalBehind")).toBe(true);
    expect(logic.isAttentionBadgeStateKey("wellAhead")).toBe(false);
    expect(logic.prioritizedBadgeSelection(candidates, "weekly")).toEqual({
      attentionCandidates: [candidates[1]],
      candidate: candidates[1],
    });
  });

  it("shows the critical window label instead of the ratio badge", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const display = logic.badgeDisplayForWindows({
      atMs,
      criticalBadgeWindow: true,
      forcedBadgeState: null,
      history: null,
      preferredWindowKey: "weekly",
      windows: {},
    });

    expect(display.badgeText).toBe("5h");
    expect(display.windowKey).toBe("fiveHour");
    expect(display.badgePaceRatio).toBeCloseTo(0.45);
    expect(display.title).toBe("Pace Pets - 5h Brake hard! pace 0.45");
  });
});

describe("PacePetsBackgroundLogic display-scale attention", () => {
  it("enters attention mode only when the displayed ratio is below 0.55", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const windowData = (remainingPercent) => ({
      remainingPercent,
      resetsAt: "2026-05-25T12:30:00.000Z",
      windowMinutes: 300,
    });
    const badgeDisplay = (fiveHourRemainingPercent) =>
      logic.badgeDisplayForWindows({
        atMs,
        forcedBadgeState: null,
        history: { samples: [] },
        preferredWindowKey: "weekly",
        windows: {
          fiveHour: windowData(fiveHourRemainingPercent),
          weekly: windowData(10),
        },
      });

    const roundedBoundary = badgeDisplay(5.49);
    expect(roundedBoundary.badgeText).toBe("1.00");
    expect(roundedBoundary.windowKey).toBe("weekly");

    const displayedCritical = badgeDisplay(5.44);
    expect(displayedCritical.badgeText).toBe("5h");
    expect(displayedCritical.badgePaceRatio).toBeCloseTo(0.544);
    expect(displayedCritical.windowKey).toBe("fiveHour");
  });
});

describe("PacePetsBackgroundLogic special badge states", () => {
  it("derives held-state candidates from real windows, not badge previews", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const windows = {
      fiveHour: {
        remainingPercent: 0,
        resetsAt: "2026-05-25T12:02:00.000Z",
        windowMinutes: 300,
      },
    };

    const criticalDisplay = logic.badgeDisplayForWindows({
      atMs,
      criticalBadgeWindow: true,
      forcedBadgeState: null,
      history: { samples: [] },
      preferredWindowKey: "weekly",
      windows,
    });
    expect(criticalDisplay.badgeText).toBe("5h");
    expect(criticalDisplay.presentedStateKeysByWindow).toEqual({
      fiveHour: "splat",
    });

    const forcedDisplay = logic.badgeDisplayForWindows({
      atMs,
      forcedBadgeState: {
        badgeColor: "#000000",
        badgeText: "X",
        paceRatio: 9,
        state: { title: "Forced" },
      },
      history: { samples: [] },
      preferredWindowKey: "fiveHour",
      windows,
    });
    expect(forcedDisplay.badgeText).toBe("X");
    expect(forcedDisplay.presentedStateKeysByWindow).toEqual({
      fiveHour: "splat",
    });
  });
});

describe("PacePetsBackgroundLogic special badge rendering", () => {
  it("keeps an expired reset window muted when its pace ratio is unavailable", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const states = globalThis.PacePetsLogic.PACE_STATES;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const display = logic.badgeDisplayForWindows({
      atMs,
      forcedBadgeState: null,
      history: { samples: [] },
      preferredWindowKey: "weekly",
      windows: {
        weekly: {
          remainingPercent: 40,
          resetsAt: "2026-05-25T12:00:00.000Z",
          windowMinutes: 10080,
        },
      },
    });

    expect(display.badgeText).toBe("--");
    expect(display.badgeColor).toBe(states.muted.badgeColor);
    expect(display.badgePaceRatio).toBeNull();
    expect(display.title).toBe("Pace Pets");
  });

  it("promotes live reset-start perfect hundred to a Big Bang badge", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const states = globalThis.PacePetsLogic.PACE_STATES;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const display = logic.badgeDisplayForWindows({
      atMs,
      forcedBadgeState: null,
      history: { samples: [] },
      preferredWindowKey: "weekly",
      windows: {
        weekly: {
          remainingPercent: 100,
          resetsAt: "2026-06-01T12:00:00.000Z",
          windowMinutes: 10080,
        },
      },
    });

    expect(display.badgeText).toBe("1.00");
    expect(display.badgeColor).toBe(states.bigBang.badgeColor);
    expect(display.badgePaceRatio).toBe(1);
    expect(display.title).toBe("Pace Pets - 7d pace 1.00");
    expect(display.windowKey).toBe("weekly");
  });

  it("promotes live final-minute perfect zero to a Singularity badge", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const states = globalThis.PacePetsLogic.PACE_STATES;
    const atMs = Date.parse("2026-05-25T12:00:00.000Z");
    const display = logic.badgeDisplayForWindows({
      atMs,
      forcedBadgeState: null,
      history: { samples: [] },
      preferredWindowKey: "weekly",
      windows: {
        weekly: {
          remainingPercent: 0.4,
          resetsAt: "2026-05-25T12:00:30.000Z",
          windowMinutes: 10080,
        },
      },
    });

    expect(display.badgeText).toBe("0.00");
    expect(display.badgeColor).toBe(states.singularity.badgeColor);
    expect(display.badgePaceRatio).toBe(0);
    expect(display.title).toBe("Pace Pets - 7d pace 0.00");
    expect(display.windowKey).toBe("weekly");
  });
});

describe("PacePetsBackgroundLogic attention badge ordering", () => {
  it("honors an available preferred badge window", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const candidates = [
      {
        paceRatio: 1,
        stateKey: "on",
        windowKey: "weekly",
      },
      {
        paceRatio: 0.6,
        stateKey: "wellBehind",
        windowKey: "fiveHour",
      },
    ];

    expect(logic.prioritizedBadgeSelection(candidates, "fiveHour")).toEqual({
      attentionCandidates: [],
      candidate: candidates[1],
    });
  });

  it("chooses the worst critical badge candidate with stable tie handling", () => {
    const logic = globalThis.PacePetsBackgroundLogic;
    const weekly = {
      paceRatio: 0.41,
      stateKey: "criticalBehind",
      windowKey: "weekly",
    };
    const fiveHour = {
      paceRatio: 0.32,
      stateKey: "criticalBehind",
      windowKey: "fiveHour",
    };

    expect(
      logic.prioritizedBadgeSelection([weekly, fiveHour], "weekly"),
    ).toEqual({
      attentionCandidates: [fiveHour, weekly],
      candidate: fiveHour,
    });
    expect(
      logic.prioritizedBadgeSelection(
        [
          { ...weekly, paceRatio: 0.4 },
          { ...fiveHour, paceRatio: 0.4 },
        ],
        "weekly",
      ).candidate.windowKey,
    ).toBe("weekly");
  });
});
