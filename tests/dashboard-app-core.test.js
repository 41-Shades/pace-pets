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
  await importExtensionScript("collector/extension/dashboard-app-core.js");
});

describe("PacePetsDashboardApp startup", () => {
  it("prepares audio before applying the initial dashboard render", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const audioReady = deferredPromise();
    const dashboardState = Object.freeze({
      developerOptions: {},
      history: { samples: [] },
      refreshStatus: null,
      refreshWindowSelection: true,
    });
    app.prepareAudioForInitialDashboardRender = vi.fn(() => audioReady.promise);
    app.readDashboardState = vi.fn(() => Promise.resolve(dashboardState));
    app.applyDashboardState = vi.fn();

    const loadPromise = app.loadInitialDashboard();
    await Promise.resolve();

    expect(app.readDashboardState).toHaveBeenCalled();
    expect(app.applyDashboardState).not.toHaveBeenCalled();

    audioReady.resolve();
    await loadPromise;

    expect(app.applyDashboardState).toHaveBeenCalledWith(dashboardState);
  });

  it("loads and preloads audio for the first dashboard render", async () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.audioControl = {
      loadPreference: vi.fn(() => Promise.resolve({ status: "ready" })),
    };
    app.preloadTransitionAudio = vi.fn(() => Promise.resolve([]));

    await app.prepareAudioForInitialDashboardRender();

    expect(app.audioControl.loadPreference).toHaveBeenCalledWith({
      resumeIfNeeded: true,
    });
    expect(app.preloadTransitionAudio).toHaveBeenCalled();
  });
});
