import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it, vi } from "vitest";

function deferredPromise() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript("collector/extension/dashboard-state-methods.js");
  await importExtensionScript("collector/extension/dashboard-event-methods.js");
});

describe("PacePetsDashboardApp startup", () => {
  it("does not wait for audio preparation before applying the initial dashboard render", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const audioReady = deferredPromise();
    const dashboardReady = deferredPromise();
    app.prepareAudioForInitialDashboardRender = vi.fn(() => audioReady.promise);
    app.loadDashboard = vi.fn(async () => {
      await dashboardReady.promise;
      app.initialDashboardLoadComplete = true;
      return true;
    });
    app.paceView = { playPendingSpecialTransition: vi.fn() };

    const loadPromise = app.loadInitialDashboard();
    await Promise.resolve();

    expect(app.loadDashboard).toHaveBeenCalled();
    expect(app.initialDashboardLoadComplete).toBe(false);
    expect(app.initialSpecialTransitionPreparationComplete).toBe(false);
    expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();
    dashboardReady.resolve(true);
    await loadPromise;
    expect(app.initialDashboardLoadComplete).toBe(true);

    audioReady.resolve(true);
    await app.initialSpecialTransitionPreparation;
    expect(app.prepareAudioForInitialDashboardRender).toHaveBeenCalled();
    expect(app.initialSpecialTransitionPreparationComplete).toBe(true);
    expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
    expect(app.initialSpecialTransitionAudioAllowed).toBe(true);
  });

  it("loads and preloads audio for the first dashboard render", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.audioControl = {
      loadPreference: vi.fn(() => Promise.resolve({ status: "ready" })),
    };
    app.DASHBOARD_AUDIO_CONTROL = { STATUS_READY: "ready" };
    app.preloadTransitionAudio = vi.fn(() => Promise.resolve([]));

    await app.prepareAudioForInitialDashboardRender();

    expect(app.audioControl.loadPreference).toHaveBeenCalledWith({
      resumeIfNeeded: true,
      resumeWaitMs: 250,
    });
    expect(app.preloadTransitionAudio).toHaveBeenCalledWith(["bigBang"]);
  });

  it("skips preloading when startup audio still requires a gesture", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.audioControl = {
      loadPreference: vi.fn(() => Promise.resolve({ status: "needsGesture" })),
    };
    app.DASHBOARD_AUDIO_CONTROL = { STATUS_READY: "ready" };
    app.preloadTransitionAudio = vi.fn();

    await expect(app.prepareAudioForInitialDashboardRender()).resolves.toBe(
      false,
    );
    expect(app.preloadTransitionAudio).not.toHaveBeenCalled();
  });
});

describe("PacePetsDashboardApp initial state", () => {
  it("keeps the startup outcome active until a superseding load commits", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const firstState = deferredPromise();
    const secondState = deferredPromise();
    const renderLoadFlags = [];
    const developerOptions = {
      brakeIntensityPreview: null,
      checkerboardRevealWhiteTransparent: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
      railHidden: false,
      resetExhaustedPreview: false,
      splatTimeRemainingPreview: null,
      sprintIntensityPreview: null,
    };
    app.prepareAudioForInitialDashboardRender = vi.fn(() => false);
    app.paceView = {
      playPendingSpecialTransition: vi.fn(),
      renderStateRail: vi.fn(),
    };
    app.renderResetExhaustedPreview = vi.fn();
    app.renderHistory = vi.fn(() => {
      renderLoadFlags.push(app.initialDashboardLoadComplete);
    });
    app.completeHistoryPresentation = vi.fn(() => {
      app.dashboardPresentationAuthoritative = true;
      app.initialDashboardLoadComplete = true;
      app.paceView.playPendingSpecialTransition();
    });
    app.readDashboardState = vi
      .fn()
      .mockReturnValueOnce(firstState.promise)
      .mockReturnValueOnce(secondState.promise);
    app.dashboardStateLoader =
      globalThis.PacePetsDashboardStateLoader.createController({
        applyState: (state) => app.applyDashboardState(state),
        readState: () => app.readDashboardState(),
      });

    const initialLoad = app.loadInitialDashboard();
    const newerLoad = app.loadDashboard();
    firstState.resolve({ developerOptions, history: {}, refreshStatus: null });
    await expect(initialLoad).resolves.toBe(false);
    expect(app.initialDashboardLoadComplete).toBe(false);

    secondState.resolve({ developerOptions, history: {}, refreshStatus: null });
    await expect(newerLoad).resolves.toBe(true);
    expect(renderLoadFlags).toEqual([false]);
    expect(app.initialDashboardLoadComplete).toBe(true);
  });

  it("releases the transition gate with a stable warning after audio preparation fails", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    app.prepareAudioForInitialDashboardRender = vi.fn(() =>
      Promise.reject(new Error("private failure details")),
    );
    app.loadDashboard = vi.fn(() => Promise.resolve(true));
    app.paceView = { playPendingSpecialTransition: vi.fn() };

    try {
      await app.loadInitialDashboard();
      await app.initialSpecialTransitionPreparation;

      expect(app.initialSpecialTransitionPreparationComplete).toBe(true);
      expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
      expect(warning).toHaveBeenCalledOnce();
      expect(warning).toHaveBeenCalledWith(
        "Could not prepare initial dashboard audio.",
      );
      expect(app.initialSpecialTransitionAudioAllowed).toBe(false);
    } finally {
      warning.mockRestore();
    }
  });
});

describe("PacePetsDashboardApp audio preference sync", () => {
  it("routes normalized audio storage changes to the audio control", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const preference = Object.freeze({ enabled: false, volume: 0.4 });
    app.AUDIO_PREFERENCES = {
      audioPreferenceFromStorageChange: vi.fn(() => preference),
    };
    app.audioControl = { applyStoredPreference: vi.fn() };
    const changes = { "pace-pets-dashboard-audio": { newValue: preference } };

    expect(app.syncAudioPreferenceChange(changes, "local")).toBe(true);
    expect(
      app.AUDIO_PREFERENCES.audioPreferenceFromStorageChange,
    ).toHaveBeenCalledWith(changes, "local");
    expect(app.audioControl.applyStoredPreference).toHaveBeenCalledWith(
      preference,
    );
  });
});

describe("PacePetsDashboardApp storage events", () => {
  it("syncs audio-only changes without suppressing combined updates", async () => {
    let storageListener = null;
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      storage: {
        onChanged: {
          addListener: vi.fn((listener) => {
            storageListener = listener;
          }),
        },
      },
    };
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.syncAudioPreferenceChange = vi.fn();
    app.hasDashboardStorageChange = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    app.renderRefreshStatusChange = vi.fn(() => false);
    app.loadDashboard = vi.fn(() => Promise.resolve());

    try {
      app.bindStorageEvents();
      storageListener({ audio: {} }, "local");
      expect(app.syncAudioPreferenceChange).toHaveBeenCalledTimes(1);
      expect(app.loadDashboard).not.toHaveBeenCalled();

      storageListener({ audio: {}, history: {} }, "local");
      await Promise.resolve();
      expect(app.syncAudioPreferenceChange).toHaveBeenCalledTimes(2);
      expect(app.loadDashboard).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.chrome = originalChrome;
    }
  });
});

describe("PacePetsDashboardApp visibility", () => {
  it("refreshes visible state before releasing a pending transition", async () => {
    const originalDocument = globalThis.document;
    const refreshed = deferredPromise();
    globalThis.document = { hidden: false };
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.paceView = { playPendingSpecialTransition: vi.fn() };
    app.refreshDashboardTimeSensitiveViews = vi.fn(() =>
      refreshed.promise.then(() => app.paceView.playPendingSpecialTransition()),
    );

    try {
      const visibilityChange = app.handleVisibilityChange();
      expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();

      refreshed.resolve();
      await visibilityChange;
      expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it("does not release a stale transition when visible-state refresh fails", async () => {
    const originalDocument = globalThis.document;
    const error = new Error("refresh failed");
    globalThis.document = { hidden: false };
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.refreshDashboardTimeSensitiveViews = vi.fn(() => Promise.reject(error));
    app.renderHistoryLoadFailure = vi.fn();
    app.paceView = { playPendingSpecialTransition: vi.fn() };

    try {
      await app.handleVisibilityChange();
      expect(app.renderHistoryLoadFailure).toHaveBeenCalledWith(error);
      expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

describe("PacePetsDashboardApp controller wiring", () => {
  it("gives manual-refresh errors the presentation completion boundary", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.DASHBOARD_STATUS = { createController: vi.fn(() => ({})) };
    app.DASHBOARD_PACE = { createController: vi.fn(() => ({})) };
    app.DASHBOARD_TIME = { formatClockTime: vi.fn() };
    app.completeHistoryPresentation = vi.fn();
    app.dashboardPresentationAuthoritative = true;
    app.dashboardStateMutationInProgress = true;
    app.dashboardStateLoader = { isLoading: () => false };
    app.elements = {};

    app.createStatusAndPaceControllers();
    const options = app.DASHBOARD_STATUS.createController.mock.calls[0][0];
    options.completeHistoryPresentation();

    expect(app.completeHistoryPresentation).toHaveBeenCalledOnce();
    const paceOptions = app.DASHBOARD_PACE.createController.mock.calls[0][0];
    expect(paceOptions.specialTransitionStateReady()).toBe(false);
    app.dashboardStateMutationInProgress = false;
    expect(paceOptions.specialTransitionStateReady()).toBe(true);
  });
});

describe("PacePetsDashboardApp state commits", () => {
  it("releases pending transitions only after a successful latest commit", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const error = new Error("load failed");
    app.dashboardStateLoader = {
      load: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(true),
    };
    app.paceView = { playPendingSpecialTransition: vi.fn() };
    app.completeHistoryPresentation = vi.fn(() => {
      app.dashboardPresentationAuthoritative = true;
      app.paceView.playPendingSpecialTransition();
    });

    await expect(app.loadDashboard()).resolves.toBe(false);
    await expect(app.loadDashboard()).rejects.toBe(error);
    expect(app.dashboardPresentationAuthoritative).toBe(false);
    expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();

    app.completeHistoryPresentation();
    expect(app.dashboardPresentationAuthoritative).toBe(true);
    await expect(app.loadDashboard()).resolves.toBe(true);
    expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledTimes(2);
  });

  it("does not persist a seeded window selection during an uncommitted read", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.readSessionWindowKey = vi.fn(() => null);
    app.readBadgeWindowKey = vi.fn(() => Promise.resolve("weekly"));
    app.storeSessionWindowKey = vi.fn();

    await expect(app.readDashboardWindowKey()).resolves.toBe("weekly");
    expect(app.storeSessionWindowKey).not.toHaveBeenCalled();
  });

  it("persists the window selection only when dashboard state commits", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.storeSessionWindowKey = vi.fn();
    app.renderResetExhaustedPreview = vi.fn();
    app.renderHistory = vi.fn();
    app.paceView = { renderStateRail: vi.fn() };
    const developerOptions = {
      brakeIntensityPreview: null,
      checkerboardRevealWhiteTransparent: false,
      forcedPaceStateKey: null,
      manualRefreshLeadWindow: false,
      maxPoolFill: false,
      railHidden: false,
      resetExhaustedPreview: false,
      splatTimeRemainingPreview: null,
      sprintIntensityPreview: null,
    };

    app.applyDashboardState({
      dashboardWindowKey: "fiveHour",
      developerOptions,
      history: { samples: [] },
      refreshStatus: null,
      refreshWindowSelection: true,
    });

    expect(app.selectedWindowKey).toBe("fiveHour");
    expect(app.storeSessionWindowKey).toHaveBeenCalledWith("fiveHour");
  });
});
