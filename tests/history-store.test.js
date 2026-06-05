import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexUsageHistory.normalizeHistory", () => {
  it("sanitizes recent supported samples and drops stale or unusable entries", () => {
    const history = globalThis.CodexUsageHistory.normalizeHistory({
      samples: [
        {
          id: "old",
          collectedAt: "2026-05-01T12:00:00.000Z",
          windows: {
            weekly: {
              remainingPercent: 50,
              resetsAt: "2026-05-08T12:00:00.000Z",
              windowMinutes: 10080,
            },
          },
        },
        {
          id: "invalid",
          collectedAt: "2026-05-25T09:00:00.000Z",
          windows: {},
        },
        {
          id: "  recent sample  ",
          collectedAt: "2026-05-25T10:00:00.000Z",
          source: "  codex  extension  ",
          collectorVersion: "  dev\nbuild  ",
          windows: {
            weekly: {
              remainingPercent: 101,
              resetsAt: "2026-06-01T10:00:00.000Z",
              windowMinutes: "10080.4",
            },
            fiveHour: {
              remainingPercent: "12.34",
              resetsAt: "2026-05-25T15:00:00.000Z",
              windowMinutes: "300",
            },
          },
        },
      ],
    });

    expect(history).toEqual({
      historyVersion: 1,
      samples: [
        {
          id: "recent sample",
          collectedAt: "2026-05-25T10:00:00.000Z",
          source: "codex extension",
          collectorVersion: "dev build",
          windows: {
            weekly: {
              remainingPercent: 100,
              usedPercent: 0,
              resetsAt: "2026-06-01T10:00:00.000Z",
              windowMinutes: 10080,
            },
            fiveHour: {
              remainingPercent: 12.34,
              usedPercent: 87.66,
              resetsAt: "2026-05-25T15:00:00.000Z",
              windowMinutes: 300,
            },
          },
        },
      ],
    });
  });
});

describe("CodexUsageHistory.normalizeHistory duration validation", () => {
  it("drops stored windows whose duration does not match their key", () => {
    const history = globalThis.CodexUsageHistory.normalizeHistory({
      samples: [
        {
          id: "mismatched-only",
          collectedAt: "2026-05-25T10:00:00.000Z",
          windows: {
            weekly: {
              remainingPercent: 50,
              resetsAt: "2026-06-01T10:00:00.000Z",
              windowMinutes: 300,
            },
            fiveHour: {
              remainingPercent: 60,
              resetsAt: "2026-05-25T15:00:00.000Z",
              windowMinutes: 10080,
            },
          },
        },
        {
          id: "mixed",
          collectedAt: "2026-05-25T11:00:00.000Z",
          windows: {
            weekly: {
              remainingPercent: 70,
              resetsAt: "2026-06-01T11:00:00.000Z",
              windowMinutes: 300,
            },
            fiveHour: {
              remainingPercent: 80,
              resetsAt: "2026-05-25T16:00:00.000Z",
              windowMinutes: 300,
            },
          },
        },
      ],
    });

    expect(history.samples).toEqual([
      {
        id: "mixed",
        collectedAt: "2026-05-25T11:00:00.000Z",
        source: "codex-wham-extension-background",
        collectorVersion: "0.1.0",
        windows: {
          fiveHour: {
            remainingPercent: 80,
            usedPercent: 20,
            resetsAt: "2026-05-25T16:00:00.000Z",
            windowMinutes: 300,
          },
        },
      },
    ]);
  });
});

describe("CodexUsageHistory.normalizeHistory compaction", () => {
  it("compacts unchanged plateau samples but keeps changed samples", () => {
    const windows = {
      fiveHour: {
        remainingPercent: 50,
        resetsAt: "2026-05-25T15:00:00.000Z",
        windowMinutes: 300,
      },
    };
    const changedWindows = {
      fiveHour: {
        remainingPercent: 45,
        resetsAt: "2026-05-25T15:00:00.000Z",
        windowMinutes: 300,
      },
    };

    const history = globalThis.CodexUsageHistory.normalizeHistory({
      samples: [
        {
          id: "first",
          collectedAt: "2026-05-25T10:00:00.000Z",
          windows,
        },
        {
          id: "too-soon",
          collectedAt: "2026-05-25T10:10:00.000Z",
          windows,
        },
        {
          id: "plateau-interval",
          collectedAt: "2026-05-25T10:30:00.000Z",
          windows,
        },
        {
          id: "changed",
          collectedAt: "2026-05-25T10:40:00.000Z",
          windows: changedWindows,
        },
      ],
    });

    expect(history.samples.map((sample) => sample.id)).toEqual([
      "first",
      "plateau-interval",
      "changed",
    ]);
  });
});

describe("CodexUsageHistory.normalizeRefreshStatus", () => {
  it("normalizes observable refresh status without preserving noisy text", () => {
    expect(
      globalThis.CodexUsageHistory.normalizeRefreshStatus({
        ok: false,
        message: "  failed\nbecause token was unavailable  ",
        authFailure: true,
        statusCode: "401",
        refreshedAt: "2026-05-25T11:59:00.000Z",
        sampleCount: "3",
        stored: false,
      }),
    ).toEqual({
      ok: false,
      message: "failed because token was unavailable",
      authFailure: true,
      statusCode: 401,
      refreshedAt: "2026-05-25T11:59:00.000Z",
      sampleCount: 3,
      stored: false,
    });
  });

  it("preserves absent refresh HTTP status as null", () => {
    expect(
      globalThis.CodexUsageHistory.normalizeRefreshStatus({
        ok: true,
        statusCode: null,
        refreshedAt: "2026-05-25T11:59:00.000Z",
      }).statusCode,
    ).toBeNull();
  });
});
