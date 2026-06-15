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
  it("keeps the preferred badge window unless an attention state exists", () => {
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
