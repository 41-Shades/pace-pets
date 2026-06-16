import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexWeeklyUsage provider normalization", () => {
  it("normalizes through the default provider while preserving source markers", () => {
    const provider = globalThis.CodexUsageProviders.DEFAULT_USAGE_PROVIDER;
    const rawUsage = {
      subscription: {
        primary: {
          remaining_percent: 42,
          reset_after_seconds: 60 * 60,
        },
      },
    };

    expect(
      globalThis.CodexWeeklyUsage.normalizeUsageWithProvider(
        rawUsage,
        provider,
        { sourceMarkerKey: "background" },
      ),
    ).toMatchObject({
      source: provider.sourceMarkers.background,
      windows: {
        fiveHour: {
          remainingPercent: 42,
          windowMinutes: 300,
        },
      },
    });
    expect(
      globalThis.CodexWeeklyUsage.normalizeWhamUsage(rawUsage).source,
    ).toBe(provider.sourceMarkers.normalizedUsage);
  });
});

describe("CodexWeeklyUsage.normalizeWhamUsage", () => {
  it("normalizes weekly and five-hour windows from canonical subscription usage", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      subscription: {
        primary: {
          remaining_percent: 42.25,
          reset_after_seconds: 60 * 60,
          limit_window_seconds: 5 * 60 * 60,
        },
        secondary: {
          used_percent: 12.34,
          reset_at: "2026-05-26T12:00:00.000Z",
          window_duration_mins: 7 * 24 * 60,
        },
      },
    });

    expect(usage).toMatchObject({
      source:
        globalThis.CodexUsageProviders.DEFAULT_USAGE_PROVIDER.sourceMarkers
          .normalizedUsage,
      windows: {
        fiveHour: {
          remainingPercent: 42.25,
          resetsAt: "2026-05-25T13:00:00.000Z",
          windowMinutes: 300,
        },
        weekly: {
          remainingPercent: 87.66,
          resetsAt: "2026-05-26T12:00:00.000Z",
          windowMinutes: 10080,
        },
      },
    });
  });

  it("normalizes adapter-declared top-level WHAM windows", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      primary: {
        remaining_percent: 42.25,
        reset_after_seconds: 60 * 60,
        limit_window_seconds: 5 * 60 * 60,
      },
      secondary: {
        used_percent: 12.34,
        reset_at: "2026-05-26T12:00:00.000Z",
        window_duration_mins: 7 * 24 * 60,
      },
      unrelated: {
        weekly: {
          remaining_percent: 1,
          reset_at: "2026-05-26T12:00:00.000Z",
          window_duration_mins: 7 * 24 * 60,
        },
      },
    });

    expect(usage.windows).toMatchObject({
      fiveHour: {
        remainingPercent: 42.25,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
      weekly: {
        remainingPercent: 87.66,
        resetsAt: "2026-05-26T12:00:00.000Z",
        windowMinutes: 10080,
      },
    });
  });

  it("normalizes derived remaining percentages without float residue", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      usage: {
        windows: {
          weekly: {
            used_percent: 99.99,
            reset_at: "2026-05-26T12:00:00.000Z",
            window_duration_mins: 7 * 24 * 60,
          },
        },
      },
    });

    expect(usage.windows.weekly).toMatchObject({
      remainingPercent: 0.01,
      resetsAt: "2026-05-26T12:00:00.000Z",
      windowMinutes: 10080,
    });
  });
});

describe("CodexWeeklyUsage.normalizeWhamUsage live paths", () => {
  it("normalizes adapter-declared nested WHAM windows", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      usage: {
        windows: {
          five_hour: {
            remaining_percent: 42.25,
            reset_after_seconds: 60 * 60,
            limit_window_seconds: 5 * 60 * 60,
          },
          weekly: {
            used_percent: 12.34,
            reset_at: "2026-05-26T12:00:00.000Z",
            window_duration_mins: 7 * 24 * 60,
          },
        },
      },
    });

    expect(usage.windows).toMatchObject({
      fiveHour: {
        remainingPercent: 42.25,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
      weekly: {
        remainingPercent: 87.66,
        resetsAt: "2026-05-26T12:00:00.000Z",
        windowMinutes: 10080,
      },
    });
  });

  it("normalizes live rate_limit WHAM windows", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      rate_limit: {
        primary_window: {
          remaining_percent: 42.25,
          reset_after_seconds: 60 * 60,
          limit_window_sec: 5 * 60 * 60,
        },
        secondary_window: {
          used_percent: 12.34,
          reset_at: "2026-05-26T12:00:00.000Z",
          window_duration_mins: 7 * 24 * 60,
        },
      },
    });

    expect(usage.windows).toMatchObject({
      fiveHour: {
        remainingPercent: 42.25,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
      weekly: {
        remainingPercent: 87.66,
        resetsAt: "2026-05-26T12:00:00.000Z",
        windowMinutes: 10080,
      },
    });
  });
});

describe("CodexWeeklyUsage.normalizeWhamUsage fallbacks", () => {
  it("normalizes path-matched WHAM candidates with alternate field names", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      account: {
        usageLimits: {
          primary: {
            remainingPercent: 42.25,
            resetAfterSeconds: 60 * 60,
            limitWindowSeconds: 5 * 60 * 60,
          },
          secondary: {
            usedPercent: 12.34,
            resetAt: "2026-05-26T12:00:00.000Z",
            windowDurationMins: 7 * 24 * 60,
          },
        },
      },
    });

    expect(usage.windows).toMatchObject({
      fiveHour: {
        remainingPercent: 42.25,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
      weekly: {
        remainingPercent: 87.66,
        resetsAt: "2026-05-26T12:00:00.000Z",
        windowMinutes: 10080,
      },
    });
  });

  it("ignores unrelated exact-duration objects when canonical usage exists", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      unrelated: {
        weeklyQuota: {
          used_percent: 1,
          reset_at: "2026-05-26T12:00:00.000Z",
          window_duration_mins: 7 * 24 * 60,
        },
        fiveHourQuota: {
          remaining_percent: 1,
          reset_after_seconds: 60 * 30,
          limit_window_seconds: 5 * 60 * 60,
        },
      },
      subscription: {
        primary: {
          remaining_percent: 42.25,
          reset_after_seconds: 60 * 60,
          limit_window_seconds: 5 * 60 * 60,
        },
      },
    });

    expect(usage.windows).toMatchObject({
      fiveHour: {
        remainingPercent: 42.25,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
    });
    expect(usage.windows).not.toHaveProperty("weekly");
  });

  it("rejects unrelated exact-duration objects without a supported path", () => {
    expect(() =>
      globalThis.CodexWeeklyUsage.normalizeWhamUsage({
        unrelated: {
          weeklyQuota: {
            usedPercent: 1,
            resetAt: "2026-05-26T12:00:00.000Z",
            windowDurationMins: 7 * 24 * 60,
          },
          fiveHourQuota: {
            remainingPercent: 1,
            resetAfterSeconds: 60 * 30,
            limitWindowSeconds: 5 * 60 * 60,
          },
        },
      }),
    ).toThrow("ChatGPT usage response changed; Pace Pets needs an update.");
  });
});

describe("CodexWeeklyUsage.normalizeWhamUsage duration handling", () => {
  it("does not treat durationless primary usage as a weekly window", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      subscription: {
        primary: {
          remaining_percent: 42,
          reset_after_seconds: 60 * 60,
        },
      },
    });

    expect(usage.windows.fiveHour).toMatchObject({
      remainingPercent: 42,
      resetsAt: "2026-05-25T13:00:00.000Z",
      windowMinutes: 300,
    });
    expect(usage.windows).not.toHaveProperty("weekly");
  });

  it("does not treat unrelated durationless usage as a weekly window", () => {
    const usage = globalThis.CodexWeeklyUsage.normalizeWhamUsage({
      unrelated: {
        quota: {
          remaining_percent: 99,
          reset_after_seconds: 60 * 30,
        },
      },
      subscription: {
        primary: {
          remaining_percent: 42,
          reset_after_seconds: 60 * 60,
        },
      },
    });

    expect(usage.windows.fiveHour).toMatchObject({
      remainingPercent: 42,
      resetsAt: "2026-05-25T13:00:00.000Z",
      windowMinutes: 300,
    });
    expect(usage.windows).not.toHaveProperty("weekly");
  });

  it("rejects canonical windows with mismatched duration metadata", () => {
    expect(() =>
      globalThis.CodexWeeklyUsage.normalizeWhamUsage({
        subscription: {
          primary: {
            remaining_percent: 42,
            reset_after_seconds: 60 * 60,
            limit_window_seconds: 7 * 24 * 60 * 60,
          },
        },
      }),
    ).toThrow("ChatGPT usage response changed; Pace Pets needs an update.");
  });

  it("throws when no supported usage window can be found", () => {
    expect(() =>
      globalThis.CodexWeeklyUsage.normalizeWhamUsage({
        subscription: {
          primary: {
            reset_after_seconds: 60 * 60,
          },
        },
      }),
    ).toThrow("ChatGPT usage response changed; Pace Pets needs an update.");
  });
});
