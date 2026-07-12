import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function deferredPromise() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

const badgePresentation = {
  setBadge: vi.fn(),
  updateEmptyBadge: vi.fn(),
  updatePaceBadge: vi.fn(),
};
const usageData = {
  appendUsageSnapshot: vi.fn(),
  clearUsageData: vi.fn(),
  readHistory: vi.fn(),
  readRefreshStatus: vi.fn(),
  writeHistory: vi.fn(),
  writeRefreshStatus: vi.fn(),
};
const usageHistory = {
  latestSample: vi.fn(),
  runUsageDataTransaction: vi.fn(),
};
const usagePermissions = {
  chatGptAccessRequiredError: vi.fn(),
  hasChatGptHostPermission: vi.fn(),
};
const usageSource = {
  fetchUsageWithProvider: vi.fn(),
};
const weeklyUsage = {
  DEFAULT_USAGE_PROVIDER: Object.freeze({ key: "test" }),
  normalizeUsageWithProvider: vi.fn(),
};
let refreshRunner;

installExtensionRuntimeHooks();

beforeAll(async () => {
  globalThis.PacePetsBackgroundBadgePresentation = badgePresentation;
  globalThis.CodexUsageHistory = usageHistory;
  globalThis.PacePetsUsagePermissions = usagePermissions;
  globalThis.PacePetsBackgroundUsageSource = usageSource;
  globalThis.CodexWeeklyUsage = weeklyUsage;
  await importExtensionScript(
    "collector/extension/background-refresh-runner.js",
  );
  refreshRunner = globalThis.PacePetsBackgroundRefreshRunner;
});

beforeEach(async () => {
  usageHistory.runUsageDataTransaction.mockImplementation((operation) =>
    operation(usageData),
  );
  usageData.clearUsageData.mockResolvedValue({
    history: { historyVersion: 1, samples: [] },
    refreshStatus: null,
  });
  usageData.writeRefreshStatus.mockImplementation(async (status) => status);
  usageData.readRefreshStatus.mockResolvedValue(null);
  usagePermissions.hasChatGptHostPermission.mockResolvedValue(true);
  usagePermissions.chatGptAccessRequiredError.mockReturnValue(
    new Error("ChatGPT access is needed before Pace Pets can check usage."),
  );
  badgePresentation.setBadge.mockResolvedValue();
  badgePresentation.updateEmptyBadge.mockResolvedValue();
  weeklyUsage.normalizeUsageWithProvider.mockReturnValue({ windows: {} });

  await refreshRunner.runClearUsageData();
  vi.clearAllMocks();

  usageHistory.runUsageDataTransaction.mockImplementation((operation) =>
    operation(usageData),
  );
  usageData.clearUsageData.mockResolvedValue({
    history: { historyVersion: 1, samples: [] },
    refreshStatus: null,
  });
  usageData.writeRefreshStatus.mockImplementation(async (status) => status);
  usageData.readRefreshStatus.mockResolvedValue(null);
  usagePermissions.hasChatGptHostPermission.mockResolvedValue(true);
  badgePresentation.setBadge.mockResolvedValue();
  badgePresentation.updateEmptyBadge.mockResolvedValue();
  weeklyUsage.normalizeUsageWithProvider.mockReturnValue({ windows: {} });
});

describe("PacePetsBackgroundRefreshRunner usage-data lifecycle", () => {
  it("prevents a deferred pre-clear refresh from restoring history or status", async () => {
    const rawUsage = deferredPromise();
    usageSource.fetchUsageWithProvider.mockReturnValue(rawUsage.promise);

    const refreshPromise = refreshRunner.runScheduledRefresh();
    for (let turn = 0; turn < 4; turn += 1) {
      await Promise.resolve();
    }
    expect(usageSource.fetchUsageWithProvider).toHaveBeenCalledTimes(1);

    await refreshRunner.runClearUsageData();
    rawUsage.resolve({ usage: "after-clear" });
    await refreshPromise;

    expect(usageData.clearUsageData).toHaveBeenCalledTimes(1);
    expect(usageData.appendUsageSnapshot).not.toHaveBeenCalled();
    expect(usageData.writeRefreshStatus).not.toHaveBeenCalled();
    expect(refreshRunner.currentRefreshState()).toMatchObject({
      ok: false,
      refreshedAt: null,
    });
  });

  it("starts fresh work after clear without letting the stale task release it", async () => {
    const preClearUsage = deferredPromise();
    const postClearUsage = deferredPromise();
    usageSource.fetchUsageWithProvider
      .mockReturnValueOnce(preClearUsage.promise)
      .mockReturnValueOnce(postClearUsage.promise);
    usageData.appendUsageSnapshot.mockResolvedValue({
      history: { samples: [{ id: "post-clear" }] },
      sample: { id: "post-clear", windows: {} },
      stored: true,
      checkedAt: "2026-05-25T12:00:00.000Z",
    });
    badgePresentation.updatePaceBadge.mockResolvedValue({
      badgePaceRatio: 1,
      presentedAtMs: Date.parse("2026-05-25T12:00:00.000Z"),
      presentedStateKeysByWindow: {},
      windowKey: "fiveHour",
    });
    chrome.storage.local.get.mockImplementation((_key, done) => done({}));
    chrome.storage.local.set.mockImplementation((_items, done) => done());

    const preClearRefresh = refreshRunner.runScheduledRefresh();
    for (let turn = 0; turn < 4; turn += 1) {
      await Promise.resolve();
    }
    await refreshRunner.runClearUsageData();

    expect(refreshRunner.scheduledRefreshActive()).toBe(false);
    const postClearRefresh = refreshRunner.runManualRefresh();
    for (let turn = 0; turn < 8; turn += 1) {
      await Promise.resolve();
    }
    expect(usageSource.fetchUsageWithProvider).toHaveBeenCalledTimes(2);
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);

    preClearUsage.resolve({ usage: "stale" });
    await preClearRefresh;
    expect(refreshRunner.scheduledRefreshActive()).toBe(true);

    postClearUsage.resolve({ usage: "current" });
    await expect(postClearRefresh).resolves.toMatchObject({ ok: true });
    expect(usageData.appendUsageSnapshot).toHaveBeenCalledTimes(1);
    expect(refreshRunner.scheduledRefreshActive()).toBe(false);
  });

  it("persists the normalized timeout failure before releasing the refresh", async () => {
    const timeoutError = Object.assign(
      new Error("ChatGPT usage check timed out."),
      { timeout: true },
    );
    usageSource.fetchUsageWithProvider.mockRejectedValue(timeoutError);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const state = await refreshRunner.runScheduledRefresh();

    expect(state).toMatchObject({
      ok: false,
      message: "ChatGPT usage check timed out.",
      refreshedAt: "2026-05-25T12:00:00.000Z",
    });
    expect(usageData.writeRefreshStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        message: "ChatGPT usage check timed out.",
      }),
    );
    expect(badgePresentation.setBadge).toHaveBeenCalledWith(
      "!",
      "#b42318",
      expect.any(String),
    );

    warn.mockRestore();
  });
});

describe("PacePetsBackgroundRefreshRunner held states", () => {
  it("preserves persisted semantic holds when a refresh fails", async () => {
    const heldZeroStates = {
      weekly: {
        resetsAt: "2026-05-25T12:01:00.000Z",
        stateKey: "singularity",
      },
    };
    usageData.readRefreshStatus.mockResolvedValue({
      heldZeroStates,
      message: "Stored usage history locally.",
      ok: true,
      refreshedAt: "2026-05-25T11:59:00.000Z",
    });
    usageSource.fetchUsageWithProvider.mockRejectedValue(
      new Error("refresh failed"),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await refreshRunner.runScheduledRefresh();

    expect(refreshRunner.currentRefreshState().heldZeroStates).toEqual(
      heldZeroStates,
    );
    expect(usageData.writeRefreshStatus).toHaveBeenCalledWith(
      expect.objectContaining({ heldZeroStates, ok: false }),
    );
    warn.mockRestore();
  });

  it("evolves persisted holds from all real window presentations", async () => {
    const resetAt = "2026-05-25T12:01:00.000Z";
    const sample = {
      id: "sample-1",
      windows: {
        weekly: {
          remainingPercent: 0,
          resetsAt: resetAt,
          windowMinutes: 10080,
        },
      },
    };
    usageData.readRefreshStatus.mockResolvedValue({
      heldZeroStates: {
        weekly: { resetsAt: resetAt, stateKey: "perfectZero" },
      },
      message: "Stored usage history locally.",
      ok: true,
      refreshedAt: "2026-05-25T11:59:00.000Z",
    });
    usageSource.fetchUsageWithProvider.mockResolvedValue({});
    usageData.appendUsageSnapshot.mockResolvedValue({
      checkedAt: "2026-05-25T12:00:00.000Z",
      history: { samples: [sample] },
      sample,
      stored: true,
    });
    badgePresentation.updatePaceBadge.mockResolvedValue({
      badgePaceRatio: 0,
      presentedAtMs: Date.parse("2026-05-25T12:00:30.000Z"),
      presentedStateKeysByWindow: { weekly: "singularity" },
      windowKey: "weekly",
    });

    const state = await refreshRunner.runScheduledRefresh();

    expect(state.heldZeroStates).toEqual({
      weekly: { resetsAt: resetAt, stateKey: "singularity" },
    });
  });
});
