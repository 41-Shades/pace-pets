import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it, vi } from "vitest";

function deferredPromise() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function installPresentationCommit(app) {
  app.dashboardPresentationAuthoritative = true;
  app.dashboardStateMutationInProgress = false;
  app.paceView = { playPendingSpecialTransition: vi.fn() };
  const completeHistoryPresentation = app.completeHistoryPresentation.bind(app);
  app.completeHistoryPresentation = vi.fn(completeHistoryPresentation);
  app.renderHistory = vi.fn(() => app.completeHistoryPresentation());
}

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript("collector/extension/dashboard-state-methods.js");
  await importExtensionScript(
    "collector/extension/dashboard-history-timing-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
});

describe("PacePetsDashboardApp clear data", () => {
  it("routes the destructive mutation through the background worker", async () => {
    const originalChrome = globalThis.chrome;
    const originalUsageHistory = globalThis.CodexUsageHistory;
    const clearedHistory = { historyVersion: 1, samples: [] };
    const response = {
      ok: true,
      history: clearedHistory,
      refreshStatus: null,
    };
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.EXTENSION_STORAGE = {
      callbackWithLastError: vi.fn(
        (invoke) =>
          new Promise((resolve) => {
            invoke(resolve);
          }),
      ),
    };
    app.REFRESH_CONTROL = {
      CLEAR_USAGE_DATA_FAILURE_MESSAGE: "Could not clear local usage data.",
      clearUsageDataMessage: vi.fn(() => ({
        type: "pacePets.clearUsageData",
      })),
    };
    app.dashboardStateLoader = { invalidate: vi.fn() };
    installPresentationCommit(app);
    globalThis.CodexUsageHistory = {
      normalizeHistory: vi.fn(() => clearedHistory),
      normalizeRefreshStatus: vi.fn(() => null),
    };
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn((_message, done) => done(response)),
      },
    };

    try {
      await app.clearLocalUsageData();

      expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: "pacePets.clearUsageData" },
        expect.any(Function),
      );
      expect(app.dashboardStateLoader.invalidate).toHaveBeenCalledTimes(2);
      expect(app.currentHistory).toBe(clearedHistory);
      expect(app.currentRefreshStatus).toBeNull();
      expect(app.renderHistory).toHaveBeenCalledWith(clearedHistory, null);
      expect(app.dashboardPresentationAuthoritative).toBe(true);
      expect(app.dashboardStateMutationInProgress).toBe(false);
    } finally {
      globalThis.chrome = originalChrome;
      globalThis.CodexUsageHistory = originalUsageHistory;
    }
  });
});

describe("PacePetsDashboardApp clear failure", () => {
  it("restores the prior presentation authority before reporting failure", async () => {
    const originalChrome = globalThis.chrome;
    const errorMessage = "Clear failed.";
    let completeClear;
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.EXTENSION_STORAGE = {
      callbackWithLastError: vi.fn(
        (invoke) =>
          new Promise((resolve) => {
            invoke(resolve);
          }),
      ),
    };
    app.REFRESH_CONTROL = {
      CLEAR_USAGE_DATA_FAILURE_MESSAGE: errorMessage,
      clearUsageDataMessage: () => ({ type: "pacePets.clearUsageData" }),
    };
    app.dashboardStateLoader = {
      invalidate: vi.fn(),
      isLoading: vi.fn(() => false),
      load: vi.fn(() => Promise.reject(new Error("Recovery failed."))),
    };
    installPresentationCommit(app);
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn((_message, done) => {
          completeClear = done;
        }),
      },
    };

    try {
      const clearResult = app.clearLocalUsageData();
      expect(app.dashboardPresentationAuthoritative).toBe(false);
      expect(app.completeHistoryPresentation).not.toHaveBeenCalled();

      completeClear({ message: errorMessage, ok: false });
      await expect(clearResult).rejects.toThrow(errorMessage);
      expect(app.dashboardPresentationAuthoritative).toBe(true);
      expect(app.dashboardStateMutationInProgress).toBe(false);
      expect(app.completeHistoryPresentation).toHaveBeenCalledOnce();
      expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
      expect(app.dashboardStateLoader.load).toHaveBeenCalledOnce();
    } finally {
      globalThis.chrome = originalChrome;
    }
  });
});

describe("PacePetsDashboardApp clear recovery", () => {
  it("re-reads local state after a failed clear invalidates initial loading", async () => {
    const originalChrome = globalThis.chrome;
    const initialRead = deferredPromise();
    const recoveryRead = deferredPromise();
    const recoveredHistory = { samples: [{ id: "recovered" }] };
    let completeClear;
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.paceView = { playPendingSpecialTransition: vi.fn() };
    app.renderHistory = vi.fn(() => app.completeHistoryPresentation());
    app.dashboardStateLoader =
      globalThis.PacePetsDashboardStateLoader.createController({
        applyState: (state) => app.renderHistory(state.history, null),
        readState: vi
          .fn()
          .mockReturnValueOnce(initialRead.promise)
          .mockReturnValueOnce(recoveryRead.promise),
      });
    app.EXTENSION_STORAGE = {
      callbackWithLastError: (invoke) =>
        new Promise((resolve) => invoke(resolve)),
    };
    app.REFRESH_CONTROL = {
      CLEAR_USAGE_DATA_FAILURE_MESSAGE: "Clear failed.",
      clearUsageDataMessage: () => ({ type: "pacePets.clearUsageData" }),
    };
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn((_message, done) => {
          completeClear = done;
        }),
      },
    };

    try {
      const initialLoad = app.loadDashboard();
      const clearResult = app.clearLocalUsageData();
      completeClear({ message: "Clear failed.", ok: false });
      await Promise.resolve();

      initialRead.resolve({ history: { samples: [] } });
      await expect(initialLoad).resolves.toBe(false);
      recoveryRead.resolve({ history: recoveredHistory });
      await expect(clearResult).rejects.toThrow("Clear failed.");

      expect(app.renderHistory).toHaveBeenCalledWith(recoveredHistory, null);
      expect(app.dashboardPresentationAuthoritative).toBe(true);
      expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
    } finally {
      globalThis.chrome = originalChrome;
    }
  });
});

describe("PacePetsDashboardApp clear commit ordering", () => {
  it("invalidates a load started while the clear response is pending", async () => {
    const originalChrome = globalThis.chrome;
    const originalUsageHistory = globalThis.CodexUsageHistory;
    const pendingLoad = deferredPromise();
    const clearedHistory = { historyVersion: 1, samples: [] };
    const applyState = vi.fn();
    let completeClear;
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.dashboardStateLoader =
      globalThis.PacePetsDashboardStateLoader.createController({
        applyState,
        readState: vi.fn(() => pendingLoad.promise),
      });
    app.EXTENSION_STORAGE = {
      callbackWithLastError: vi.fn(
        (invoke) =>
          new Promise((resolve) => {
            invoke(resolve);
          }),
      ),
    };
    app.REFRESH_CONTROL = {
      CLEAR_USAGE_DATA_FAILURE_MESSAGE: "Could not clear local usage data.",
      clearUsageDataMessage: () => ({ type: "pacePets.clearUsageData" }),
    };
    installPresentationCommit(app);
    let releasedTransitions = 0;
    app.paceView.playPendingSpecialTransition.mockImplementation(() => {
      if (app.dashboardPresentationAuthoritative) {
        releasedTransitions += 1;
      }
    });
    globalThis.CodexUsageHistory = {
      normalizeHistory: vi.fn(() => clearedHistory),
      normalizeRefreshStatus: vi.fn(() => null),
    };
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn((_message, done) => {
          completeClear = done;
        }),
      },
    };

    try {
      const clearResult = app.clearLocalUsageData();
      app.renderHistory({ samples: [{ id: "cached" }] }, null);
      expect(app.dashboardPresentationAuthoritative).toBe(false);
      expect(releasedTransitions).toBe(0);

      const interveningLoad = app.dashboardStateLoader.load();
      completeClear({
        history: clearedHistory,
        ok: true,
        refreshStatus: null,
      });
      await clearResult;
      pendingLoad.resolve({ history: "stale" });

      await expect(interveningLoad).resolves.toBe(false);
      expect(applyState).not.toHaveBeenCalled();
      expect(app.currentHistory).toBe(clearedHistory);
      expect(app.renderHistory).toHaveBeenCalledWith(clearedHistory, null);
      expect(releasedTransitions).toBe(1);
    } finally {
      globalThis.chrome = originalChrome;
      globalThis.CodexUsageHistory = originalUsageHistory;
    }
  });
});
