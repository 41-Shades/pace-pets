import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

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
    globalThis.chrome.storage.local.remove.mockImplementation(
      (_keys, callback) => {
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
    await expect(
      globalThis.CodexExtensionStorage.removeLocal("codex-test-key"),
    ).resolves.toBeUndefined();

    expect(globalThis.chrome.storage.local.get).toHaveBeenCalledWith(
      "codex-test-key",
      expect.any(Function),
    );
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith(
      { "codex-test-key": "next-value" },
      expect.any(Function),
    );
    expect(globalThis.chrome.storage.local.remove).toHaveBeenCalledWith(
      "codex-test-key",
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

describe("PacePetsSingularityTransitionPreviewControl", () => {
  it("creates launch messages for Singularity transition previews", () => {
    const preview = globalThis.PacePetsSingularityTransitionPreviewControl;
    const message = preview.launchMessage();

    expect(preview.isLaunchMessage(message)).toBe(true);
    expect(preview.isLaunchMessage({ type: "other" })).toBe(false);
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
    expect(
      metadata.attentionBadgeTitle({
        items: [
          {
            label: "5h",
            paceText: "0.42",
            title: "Brake hard!",
          },
          {
            label: "7d",
            paceText: "0.48",
            title: "Brake hard!",
          },
        ],
      }),
    ).toBe("Pace Pets - 5h Brake hard! pace 0.42; 7d Brake hard! pace 0.48");
    expect(
      metadata.stateOverrideBadgeTitle({
        badgeText: "1.00",
        title: "Perfect sync",
      }),
    ).toBe("Pace Pets - Perfect sync override 1.00");
    expect(metadata.badgeTitle()).toBe("Pace Pets");
  });
});

describe("CodexThemeAssets", () => {
  it("exposes app icons and derives packaged pace icons from the pace-state catalog", () => {
    const assets = globalThis.CodexThemeAssets;
    const paceStateData = globalThis.PacePetsPaceStateData;
    const paceIconFiles = Object.values(assets.PACE_ICON_FILES_BY_STATE);
    const packagedStateKeys = assets.packagedPaceIconStateKeys(
      paceStateData.PACE_STATES,
    );

    expect(assets.PACE_ICON_FILES).toEqual(paceIconFiles);
    expect(new Set(assets.PACE_ICON_FILES).size).toBe(
      assets.PACE_ICON_FILES.length,
    );
    expect(new Set(packagedStateKeys)).toEqual(
      new Set(Object.keys(assets.PACE_ICON_FILES_BY_STATE)),
    );
    expect(assets.isPackagedPaceIconState("wellAhead")).toBe(true);
    expect(assets.isPackagedPaceIconState("singularity")).toBe(false);
    expect(assets.PACE_ICON_STATE_EXCLUSIONS).toEqual({
      muted: "No playful image.",
      singularity: "Uses generated in-memory art.",
    });
    expect(assets.appIconPathForSize(32)).toBe(
      `${assets.THEME_BASE_PATH}/${assets.APP_ICON_FILES_BY_SIZE["32"]}`,
    );
    expect(assets.paceIconPathForState("wellAhead")).toBe(
      `${assets.THEME_BASE_PATH}/${assets.PACE_ICON_FILES_BY_STATE.wellAhead}`,
    );
    expect(assets.paceIconPathForState("perfectZero")).toBe(
      `${assets.THEME_BASE_PATH}/${assets.PACE_ICON_FILES_BY_STATE.perfectZero}`,
    );
    expect(assets.effectAssetPath("resetExhaustedPerson")).toBe(
      `${assets.THEME_BASE_PATH}/${assets.EFFECT_ASSET_FILES.resetExhaustedPerson}`,
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
