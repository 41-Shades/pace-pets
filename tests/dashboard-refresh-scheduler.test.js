import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-history-timing-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-refresh-scheduler.js",
  );
});

function schedulerApp({ atMs, remainingPercent, resetInMs, windowMinutes }) {
  const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
  const windowData = {
    remainingPercent,
    resetsAt: new Date(atMs + resetInMs).toISOString(),
    windowMinutes,
  };
  app.currentHistory = {
    samples: [
      {
        collectedAt: new Date(atMs).toISOString(),
        windows: { weekly: windowData },
      },
    ],
  };
  app.currentManualRefreshLeadWindow = false;
  app.dashboardRefreshGeneration = 0;
  app.dashboardRefreshTimer = null;
  app.selectedWindowKey = "weekly";
  app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
  app.WINDOW_SPECS = globalThis.CodexUsageWindows.WINDOW_SPECS;
  return app;
}

describe("PacePetsDashboardApp boundary refresh timing", () => {
  it("uses the maximum cadence when no presentation boundary exists", () => {
    const app = schedulerApp({
      atMs: Date.now(),
      remainingPercent: null,
      resetInMs: 0,
      windowMinutes: 300,
    });
    app.currentHistory = null;

    expect(app.nextDashboardRefreshDelay()).toBe(60_000);
  });

  it("wakes immediately after the final-minute Singularity boundary", () => {
    const atMs = Date.now();
    const app = schedulerApp({
      atMs,
      remainingPercent: 0.4,
      resetInMs: 61_000,
      windowMinutes: 300,
    });

    expect(app.nextDashboardRefreshDelay(atMs)).toBe(1_001);
  });

  it("wakes when Big Bang leaves its displayed hundred band", () => {
    const atMs = Date.now();
    const durationMs = 300 * 60 * 1000;
    const app = schedulerApp({
      atMs,
      remainingPercent: 100,
      resetInMs: durationMs - 89_000,
      windowMinutes: 300,
    });

    expect(app.nextDashboardRefreshDelay(atMs)).toBe(1_001);
  });

  it("wakes when rounded time enters Perfect sync", () => {
    const atMs = Date.now();
    const app = schedulerApp({
      atMs,
      remainingPercent: 91,
      resetInMs: 16_471_000,
      windowMinutes: 300,
    });

    expect(app.nextDashboardRefreshDelay(atMs)).toBe(1_001);
  });
});

describe("PacePetsDashboardApp refresh timer ownership", () => {
  it("keeps one owned timer and rearms after its cached refresh", async () => {
    const originalDocument = globalThis.document;
    globalThis.document = { hidden: false };
    const app = schedulerApp({
      atMs: Date.now(),
      remainingPercent: 50,
      resetInMs: 5 * 60 * 1000,
      windowMinutes: 300,
    });
    app.nextDashboardRefreshDelay = vi.fn(() => 1_000);
    app.refreshDashboardTimeSensitiveViews = vi.fn(() => Promise.resolve());
    app.renderHistoryLoadFailure = vi.fn();

    try {
      app.scheduleNextDashboardRefresh();
      app.scheduleNextDashboardRefresh();
      expect(vi.getTimerCount()).toBe(1);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(app.refreshDashboardTimeSensitiveViews).toHaveBeenCalledOnce();
      expect(app.renderHistoryLoadFailure).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);
    } finally {
      app.clearDashboardRefreshTimer();
      globalThis.document = originalDocument;
    }
  });

  it("clears the owned timer while the dashboard is hidden", () => {
    const originalDocument = globalThis.document;
    globalThis.document = { hidden: false };
    const app = schedulerApp({
      atMs: Date.now(),
      remainingPercent: 50,
      resetInMs: 5 * 60 * 1000,
      windowMinutes: 300,
    });
    app.nextDashboardRefreshDelay = vi.fn(() => 1_000);

    try {
      app.scheduleNextDashboardRefresh();
      globalThis.document.hidden = true;

      expect(app.scheduleNextDashboardRefresh()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      app.clearDashboardRefreshTimer();
      globalThis.document = originalDocument;
    }
  });
});
