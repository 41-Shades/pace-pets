import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(relativePath) {
  await import(pathToFileURL(path.join(projectRoot, relativePath)));
}

beforeAll(async () => {
  globalThis.chrome = {
    runtime: {
      getManifest: () => ({ version: "0.1.0" }),
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
  };

  await importExtensionScript("collector/extension/product-metadata.js");
  await importExtensionScript("collector/extension/integration-config.js");
  await importExtensionScript("collector/extension/usage-windows.js");
  await importExtensionScript("collector/extension/usage-values.js");
  await importExtensionScript("collector/extension/refresh-status.js");
  await importExtensionScript("collector/extension/storage-adapter.js");
  await importExtensionScript(
    "collector/extension/usage-integration-adapters.js",
  );
  await importExtensionScript(
    "collector/extension/themes/default/asset-manifest.js",
  );
  await importExtensionScript("collector/extension/pace-logic.js");
  await importExtensionScript("collector/extension/usage.js");
  await importExtensionScript("collector/extension/history-store.js");
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));
  vi.clearAllMocks();
  globalThis.chrome.runtime.lastError = null;
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.chrome.runtime.lastError = null;
});

describe("CodexExtensionStorage", () => {
  it("wraps local storage reads and writes with Promise APIs", async () => {
    globalThis.chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ [keys]: "stored-value" });
    });
    globalThis.chrome.storage.local.set.mockImplementation(
      (_items, callback) => {
        callback();
      },
    );

    await expect(
      globalThis.CodexExtensionStorage.getLocal("codex-test-key"),
    ).resolves.toEqual({ "codex-test-key": "stored-value" });
    await expect(
      globalThis.CodexExtensionStorage.setLocal({
        "codex-test-key": "next-value",
      }),
    ).resolves.toBeUndefined();

    expect(globalThis.chrome.storage.local.get).toHaveBeenCalledWith(
      "codex-test-key",
      expect.any(Function),
    );
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith(
      { "codex-test-key": "next-value" },
      expect.any(Function),
    );
  });

  it("normalizes local storage errors and change checks", async () => {
    globalThis.chrome.storage.local.get.mockImplementation(
      (_keys, callback) => {
        globalThis.chrome.runtime.lastError = { message: "read failed" };
        callback();
      },
    );

    await expect(
      globalThis.CodexExtensionStorage.getLocal("codex-test-key"),
    ).rejects.toThrow("read failed");

    expect(globalThis.CodexExtensionStorage.isLocalArea("local")).toBe(true);
    expect(globalThis.CodexExtensionStorage.isLocalArea("sync")).toBe(false);
    expect(
      globalThis.CodexExtensionStorage.hasChange(
        { "codex-test-key": { newValue: true } },
        "codex-test-key",
      ),
    ).toBe(true);
    expect(
      globalThis.CodexExtensionStorage.hasAnyChange(
        { "codex-test-key": { newValue: true } },
        ["missing", "codex-test-key"],
      ),
    ).toBe(true);
  });

  it("wraps generic Chrome callbacks with runtime lastError handling", async () => {
    await expect(
      globalThis.CodexExtensionStorage.callbackWithLastError((done) => {
        done("ok");
      }),
    ).resolves.toBe("ok");

    await expect(
      globalThis.CodexExtensionStorage.callbackWithLastError((done) => {
        globalThis.chrome.runtime.lastError = { message: "platform failed" };
        done();
      }),
    ).rejects.toThrow("platform failed");
  });
});

describe("CodexProductMetadata", () => {
  it("exposes shared product labels and runtime titles", () => {
    const metadata = globalThis.CodexProductMetadata;

    expect(metadata.NAME).toBe("Pace Pets");
    expect(metadata.DASHBOARD_PATH).toBe("dashboard.html");
    expect(metadata.OPEN_DASHBOARD_MENU_TITLE).toBe("Open Pace Pets");
    expect(metadata.badgeTitle({ badgeText: "0.83", label: "7d" })).toBe(
      "Pace Pets - 7d pace 0.83",
    );
    expect(metadata.badgeTitle()).toBe("Pace Pets");
  });
});

describe("CodexThemeAssets", () => {
  it("exposes app icons and one runtime icon path per playful pace state", () => {
    const assets = globalThis.CodexThemeAssets;
    const paceIconFiles = Object.values(assets.PACE_ICON_FILES_BY_STATE);

    expect(assets.PACE_ICON_FILES).toEqual(paceIconFiles);
    expect(new Set(assets.PACE_ICON_FILES).size).toBe(
      assets.PACE_ICON_FILES.length,
    );
    expect(assets.appIconPathForSize(32)).toBe(
      `${assets.THEME_BASE_PATH}/${assets.APP_ICON_FILES_BY_SIZE["32"]}`,
    );
    expect(assets.paceIconPathForState("wellAhead")).toBe(
      `${assets.THEME_BASE_PATH}/${assets.PACE_ICON_FILES_BY_STATE.wellAhead}`,
    );
    expect(assets.paceIconPathForState("muted")).toBe("");
  });
});

describe("CodexUsageValues", () => {
  it("normalizes primitive values and supported stored windows", () => {
    const values = globalThis.CodexUsageValues;

    expect(values.numberFrom("42")).toBe(42);
    expect(values.percentFrom(101)).toBeNull();
    expect(values.boundedPercent(120)).toBe(100);
    expect(values.percentComplement(99.99)).toBe(0.01);
    expect(values.percentComplement(87.66)).toBe(12.34);
    expect(values.isoDate("2026-05-26T12:00:00.000Z")).toBe(
      "2026-05-26T12:00:00.000Z",
    );
    expect(
      values.normalizeStoredWindow({
        remainingPercent: "12.34",
        resetsAt: "2026-05-26T12:00:00.000Z",
        windowMinutes: "300.4",
      }),
    ).toEqual({
      remainingPercent: 12.34,
      resetsAt: "2026-05-26T12:00:00.000Z",
      usedPercent: 87.66,
      windowMinutes: 300,
    });
  });

  it("computes reset-window time helpers consistently", () => {
    const values = globalThis.CodexUsageValues;
    const windowData = {
      resetsAt: "2026-05-25T14:00:00.000Z",
      windowMinutes: 300,
    };

    expect(values.windowStartMs(windowData)).toBe(
      Date.parse("2026-05-25T09:00:00.000Z"),
    );
    expect(
      values.timeRemainingPercentAt(
        windowData,
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(40);
    expect(
      values.elapsedWindowPercentAt(
        windowData,
        Date.parse("2026-05-25T12:00:00.000Z"),
      ),
    ).toBe(60);
  });
});

describe("CodexRefreshStatus", () => {
  it("builds observable refresh success and failure states", () => {
    const status = globalThis.CodexRefreshStatus;

    expect(
      status.successState({
        badgePaceRatio: 0.75,
        badgeWindowKey: "weekly",
        refreshedAt: "2026-05-25T12:00:00.000Z",
        sampleCount: 3,
        stored: true,
        windows: { weekly: { remainingPercent: 80 } },
      }),
    ).toMatchObject({
      ok: true,
      message: status.SUCCESS_STORED_MESSAGE,
      authFailure: false,
      statusCode: null,
      refreshedAt: "2026-05-25T12:00:00.000Z",
      badgeWindowKey: "weekly",
      badgePaceRatio: 0.75,
      sampleCount: 3,
      stored: true,
    });

    const failure = status.failureState(
      {
        message:
          "Request failed with Authorization: Bearer secret-token and accessToken=second-secret",
        authFailure: true,
        statusCode: 401,
      },
      "2026-05-25T12:00:00.000Z",
    );

    expect(failure).toMatchObject({
      ok: false,
      authFailure: true,
      statusCode: 401,
      refreshedAt: "2026-05-25T12:00:00.000Z",
      windows: null,
      badgeWindowKey: null,
      badgePaceRatio: null,
      sampleCount: 0,
      stored: null,
    });
    expect(failure.message).not.toContain("secret-token");
    expect(failure.message).not.toContain("second-secret");
    expect(failure.message).toContain("[redacted]");
  });

  it("normalizes persisted refresh status shape", () => {
    expect(
      globalThis.CodexRefreshStatus.normalizeRefreshStatus({
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

  it("redacts bearer tokens without leaking callback offsets", () => {
    const status = globalThis.CodexRefreshStatus;

    expect(
      status.safeFailureMessage({
        message: "Bearer root-secret failed",
      }),
    ).toBe("Bearer [redacted] failed");
    expect(
      status.safeFailureMessage({
        message: "Request failed with Bearer later-secret",
      }),
    ).toBe("Request failed with Bearer [redacted]");

    const labeledMessage = status.safeFailureMessage({
      message:
        "Request failed with Authorization: Bearer secret-token and accessToken=second-secret",
    });
    expect(labeledMessage).toBe(
      "Request failed with Authorization: [redacted] and accessToken: [redacted]",
    );
    expect(labeledMessage).not.toMatch(/\b\d+: \[redacted\]/);
    expect(labeledMessage).not.toContain("secret-token");
    expect(labeledMessage).not.toContain("second-secret");
  });
});

describe("CodexUsageIntegrationAdapters", () => {
  it("exposes the WHAM raw window mapping separately from normalization", () => {
    const adapters = globalThis.CodexUsageIntegrationAdapters;
    const whamAdapter = adapters.adapterForKey(
      adapters.CHATGPT_WHAM_ADAPTER_KEY,
    );

    expect(adapters.DEFAULT_USAGE_ADAPTER).toBe(whamAdapter);
    expect(
      whamAdapter.windows.map((windowAdapter) => windowAdapter.windowKey),
    ).toEqual(["weekly", "fiveHour"]);
    expect(whamAdapter.windows[0].rawPaths[0]).toEqual([
      "subscription",
      "secondary",
    ]);
    expect(whamAdapter.windows[0].rawPaths).toContainEqual(["weekly"]);
    expect(whamAdapter.windows[1].rawPaths[0]).toEqual([
      "subscription",
      "primary",
    ]);
    expect(whamAdapter.windows[1].rawPaths).toContainEqual(["fiveHour"]);
    expect(whamAdapter.candidateWindowKeyOrder).toEqual(["fiveHour", "weekly"]);
    expect(whamAdapter.windows[0].remainingPercentKeys).toContain(
      "remainingPercent",
    );
    expect(whamAdapter.windows[0].resetAfterSecondsKeys).toContain(
      "resetAfterSeconds",
    );
    expect(whamAdapter.windows[0].candidatePathPattern).toBeInstanceOf(RegExp);
  });
});

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
      source: globalThis.CodexIntegrationConfig.SOURCE_MARKERS.normalizedUsage,
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
