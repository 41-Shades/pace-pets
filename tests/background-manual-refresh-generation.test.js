import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

function deferredPromise() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

const usageData = {
  appendUsageSnapshot: vi.fn(),
  clearUsageData: vi.fn(),
  writeRefreshStatus: vi.fn(),
};
const usagePermissions = { hasChatGptHostPermission: vi.fn() };
const usageSource = { fetchUsageWithProvider: vi.fn() };
let refreshRunner;

installExtensionRuntimeHooks();

beforeEach(async () => {
  vi.resetModules();
  usageData.clearUsageData.mockResolvedValue({
    history: { historyVersion: 1, samples: [] },
    refreshStatus: null,
  });
  usagePermissions.hasChatGptHostPermission.mockResolvedValue(true);
  chrome.storage.local.get.mockImplementation((_keys, done) => done({}));
  chrome.storage.local.set.mockImplementation((_items, done) => done());
  globalThis.PacePetsBackgroundBadgePresentation = {
    updateEmptyBadge: vi.fn().mockResolvedValue(),
  };
  globalThis.CodexUsageHistory = {
    runUsageDataTransaction: (operation) => operation(usageData),
  };
  globalThis.PacePetsUsagePermissions = usagePermissions;
  globalThis.PacePetsBackgroundUsageSource = usageSource;
  await importExtensionScript(
    "collector/extension/background-refresh-runner.js",
  );
  refreshRunner = globalThis.PacePetsBackgroundRefreshRunner;
});

function delayAdmission(stage, entered, released) {
  if (stage === "permission") {
    usagePermissions.hasChatGptHostPermission.mockImplementationOnce(() => {
      entered.resolve();
      return released.promise.then(() => true);
    });
    return;
  }

  const method = stage === "cooldown read" ? "get" : "set";
  chrome.storage.local[method].mockImplementationOnce((_value, done) => {
    entered.resolve();
    released.promise.then(() => done(method === "get" ? {} : undefined));
  });
}

describe("manual refresh generation during admission", () => {
  it.each(["permission", "cooldown read", "cooldown write"])(
    "keeps data cleared when a pre-clear %s check completes",
    async (stage) => {
      const entered = deferredPromise();
      const released = deferredPromise();
      delayAdmission(stage, entered, released);

      const refresh = refreshRunner.runManualRefresh();
      await entered.promise;
      await refreshRunner.runClearUsageData();
      released.resolve();
      await refresh;

      expect(usageData.clearUsageData).toHaveBeenCalledOnce();
      expect(usageSource.fetchUsageWithProvider).not.toHaveBeenCalled();
      expect(usageData.appendUsageSnapshot).not.toHaveBeenCalled();
      expect(usageData.writeRefreshStatus).not.toHaveBeenCalled();
      expect(refreshRunner.scheduledRefreshActive()).toBe(false);
      expect(refreshRunner.currentRefreshState()).toMatchObject({
        ok: false,
        refreshedAt: null,
      });
    },
  );
});
