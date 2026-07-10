import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it, vi } from "vitest";

installExtensionRuntimeHooks();

function rawFiveHourUsage(resetAfterSeconds) {
  return {
    subscription: {
      primary: {
        remaining_percent: 42.25,
        reset_after_seconds: resetAfterSeconds,
        limit_window_seconds: 5 * 60 * 60,
      },
    },
  };
}

function normalizedSample(id, collectedAt, resetAfterSeconds) {
  return {
    id,
    collectedAt,
    windows: globalThis.CodexWeeklyUsage.normalizeWhamUsage(
      rawFiveHourUsage(resetAfterSeconds),
    ).windows,
  };
}

describe("relative usage reset normalization", () => {
  it("keeps reset timestamps stable across poll timing jitter", () => {
    vi.setSystemTime(new Date("2026-05-25T12:00:00.125Z"));
    const firstReset = globalThis.CodexWeeklyUsage.normalizeWhamUsage(
      rawFiveHourUsage(60 * 60),
    ).windows.fiveHour.resetsAt;
    vi.setSystemTime(new Date("2026-05-25T12:05:00.875Z"));
    const secondReset = globalThis.CodexWeeklyUsage.normalizeWhamUsage(
      rawFiveHourUsage(55 * 60),
    ).windows.fiveHour.resetsAt;

    expect(firstReset).toBe("2026-05-25T13:01:00.000Z");
    expect(secondReset).toBe(firstReset);
  });

  it("keeps positive relative resets after their observation time", () => {
    vi.setSystemTime(new Date("2026-05-25T12:00:10.000Z"));

    const reset = globalThis.CodexWeeklyUsage.normalizeWhamUsage(
      rawFiveHourUsage(5),
    ).windows.fiveHour.resetsAt;

    expect(reset).toBe("2026-05-25T12:01:00.000Z");
  });

  it("compacts equivalent jittered polls into the plateau interval", () => {
    vi.setSystemTime(new Date("2026-05-25T12:00:00.125Z"));
    const first = normalizedSample(
      "first",
      "2026-05-25T12:00:00.125Z",
      60 * 60,
    );
    vi.setSystemTime(new Date("2026-05-25T12:05:00.875Z"));
    const jittered = normalizedSample(
      "jittered",
      "2026-05-25T12:05:00.875Z",
      55 * 60,
    );

    expect(
      globalThis.CodexUsageHistory.normalizeHistory({
        samples: [first, jittered],
      }).samples.map((sample) => sample.id),
    ).toEqual(["first"]);
  });
});
