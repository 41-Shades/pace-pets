import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { importExtensionScript } from "./helpers/extension-runtime.js";

function deferredPromise() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
}

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript("collector/extension/dashboard-state-methods.js");
  await importExtensionScript("collector/extension/dashboard-event-methods.js");
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
});

afterEach(() => vi.unstubAllGlobals());

function storageApp(readState) {
  let storageListener;
  vi.stubGlobal("chrome", {
    storage: {
      onChanged: {
        addListener: (listener) => {
          storageListener = listener;
        },
      },
    },
  });
  vi.stubGlobal("CodexUsageHistory", {
    HISTORY_STORAGE_KEY: "history",
    REFRESH_STATUS_STORAGE_KEY: "status",
    normalizeRefreshStatus: (value) => value,
  });
  const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
  app.DEVELOPER_OPTIONS_STORAGE_KEY = "developerOptions";
  app.EXTENSION_STORAGE = {
    isLocalArea: (area) => area === "local",
    hasAnyChange: (changes, keys) => keys.some((key) => key in changes),
  };
  app.syncAudioPreferenceChange = vi.fn();
  app.currentHistory = { samples: [{ id: "cached" }] };
  app.renderHistory = vi.fn(() => app.completeHistoryPresentation());
  app.renderResetExhaustedPreview = vi.fn();
  app.paceView = {
    playPendingSpecialTransition: vi.fn(),
    renderStateRail: vi.fn(),
  };
  app.dashboardStateLoader =
    globalThis.PacePetsDashboardStateLoader.createController({
      applyState: (state) => app.applyDashboardState(state),
      readState,
    });
  app.bindStorageEvents();
  return { app, storageListener };
}

function dashboardState(refreshStatus) {
  return {
    developerOptions: {},
    history: { samples: [{ id: "stored" }] },
    refreshStatus,
    refreshWindowSelection: false,
  };
}

describe("dashboard refresh-status storage ordering", () => {
  it.each(["resolve", "reject"])(
    "keeps a newer failure authoritative when the older load will %s",
    async (settlement) => {
      const staleRead = deferredPromise();
      const currentRead = deferredPromise();
      const oldStatus = { ok: true, refreshedAt: "2026-05-25T12:00:00Z" };
      const failure = {
        ok: false,
        authFailure: true,
        refreshedAt: "2026-05-25T12:01:00Z",
      };
      const readState = vi
        .fn()
        .mockReturnValueOnce(staleRead.promise)
        .mockReturnValueOnce(currentRead.promise);
      const { app, storageListener } = storageApp(readState);
      const loadDashboard = vi.spyOn(app, "loadDashboard");
      const staleLoad = app.loadDashboard();

      storageListener({ status: { newValue: failure } }, "local");
      expect(readState).toHaveBeenCalledTimes(2);
      expect(app.dashboardPresentationAuthoritative).toBe(false);
      expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();

      currentRead.resolve(dashboardState(failure));
      await loadDashboard.mock.results[1].value;
      if (settlement === "reject") {
        staleRead.reject(new Error("Older read failed"));
      } else {
        staleRead.resolve(dashboardState(oldStatus));
      }
      await expect(staleLoad).resolves.toBe(false);

      expect(app.currentRefreshStatus).toEqual(failure);
      expect(app.renderHistory).toHaveBeenCalledOnce();
      expect(app.renderHistory).toHaveBeenCalledWith(
        dashboardState(failure).history,
        failure,
      );
      expect(app.dashboardPresentationAuthoritative).toBe(true);
      expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
    },
  );

  it("keeps status-only updates lightweight when no load is pending", () => {
    const readState = vi.fn();
    const { app, storageListener } = storageApp(readState);
    const failure = { ok: false, refreshedAt: "2026-05-25T12:01:00Z" };

    storageListener({ status: { newValue: failure } }, "local");

    expect(readState).not.toHaveBeenCalled();
    expect(app.currentRefreshStatus).toBe(failure);
    expect(app.renderHistory).toHaveBeenCalledWith(
      app.currentHistory,
      failure,
      {
        refreshChart: false,
      },
    );
  });
});
