import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(pathToFileURL(path.join(projectRoot, source)));
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("collector/extension/dashboard-state-loader.js");
  await importExtensionScript("collector/extension/dashboard-app-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
});

describe("PacePetsDashboardApp history presentation time", () => {
  it("uses stored pace presentation time only for the matching latest sample", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const refreshStatus = {
      pacePresentationAt: "2026-05-25T12:01:00.000Z",
      pacePresentationSampleId: "sample-1",
    };

    expect(
      app.pacePresentationTimeMsForSample({ id: "sample-1" }, refreshStatus),
    ).toBe(Date.parse("2026-05-25T12:01:00.000Z"));

    expect(
      app.pacePresentationTimeMsForSample({ id: "sample-2" }, refreshStatus),
    ).toBe(Date.parse("2026-05-25T12:00:00.000Z"));
  });

  it("keeps live timers current while pace uses the presentation time", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const currentMs = Date.parse("2026-05-25T12:00:00.000Z");
    const paceMs = Date.parse("2026-05-25T11:00:00.000Z");
    const windowData = {
      remainingPercent: 50,
      resetsAt: "2026-05-25T13:00:00.000Z",
      windowMinutes: 300,
    };
    const elements = {
      priorResetLabel: { textContent: "" },
      scheduledResetLabel: { textContent: "" },
      resetWindowCard: { dataset: {} },
      resetProgressFill: {},
      resetsIn: { textContent: "" },
      timeBar: {},
      timePercent: { textContent: "" },
      usageBar: {},
      usagePercent: { textContent: "" },
    };
    const timeRemainingPercent = vi.fn((_windowData, atMs) =>
      atMs === paceMs ? 40 : 20,
    );
    const renderPaceSummary = vi.fn(() => ({}));

    app.DASHBOARD_TIME = {
      dateMs: (value) => Date.parse(value),
      isResetWindowStale: vi.fn(() => false),
      resetCountdown: vi.fn((_value, atMs) => `reset:${atMs}`),
      resetCountdownDisplaysZero: vi.fn(() => false),
      setResetParts: vi.fn(),
      timeRemainingPercent,
      windowStartMs: vi.fn(() => currentMs - 300 * 60 * 1000),
    };
    app.WINDOW_SPECS = globalThis.CodexUsageWindows.WINDOW_SPECS;
    app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
    app.STATUS_TEXT = { waitingForReading: "Waiting" };
    app.elements = elements;
    app.paceView = {
      renderPaceSummary,
      setPercent(element, _bar, value) {
        element.textContent = value;
      },
    };
    app.setResetBudgetRate = vi.fn();
    app.setPaceBurnoutMetrics = vi.fn();

    app.renderSummaryWindow(
      "weekly",
      windowData,
      { weekly: windowData },
      { samples: [] },
      { paceAtMs: paceMs },
    );

    expect(timeRemainingPercent).toHaveBeenCalledWith(windowData, currentMs);
    expect(timeRemainingPercent).toHaveBeenCalledWith(windowData, paceMs);
    expect(elements.timePercent.textContent).toBe(20);
    expect(elements.resetsIn.textContent).toBe(`reset:${currentMs}`);
    expect(renderPaceSummary.mock.calls[0][1]).toBe(40);
  });
});

describe("PacePetsDashboardApp stale zero history status", () => {
  it("does not complete presentation authority during an active load", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    let loading = true;
    app.dashboardPresentationAuthoritative = false;
    app.dashboardStateLoader = { isLoading: () => loading };
    app.paceView = { playPendingSpecialTransition: vi.fn() };

    app.completeHistoryPresentation();
    expect(app.dashboardPresentationAuthoritative).toBe(false);
    expect(app.paceView.playPendingSpecialTransition).not.toHaveBeenCalled();

    loading = false;
    app.dashboardStateMutationInProgress = true;
    app.completeHistoryPresentation();
    expect(app.dashboardPresentationAuthoritative).toBe(false);

    app.dashboardStateMutationInProgress = false;
    app.completeHistoryPresentation();
    expect(app.dashboardPresentationAuthoritative).toBe(true);
    expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
  });

  it("closes the startup window after an empty presentation is evaluated", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.initialDashboardLoadComplete = false;
    app.renderEmptyHistory = vi.fn(() => {
      expect(app.initialDashboardLoadComplete).toBe(false);
    });
    app.paceView = { playPendingSpecialTransition: vi.fn() };

    app.renderHistory({ samples: [] });

    expect(app.renderEmptyHistory).toHaveBeenCalledOnce();
    expect(app.initialDashboardLoadComplete).toBe(true);
    expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
  });

  it("does not project held zero summaries as stale waiting status", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const history = {
      samples: [
        {
          id: "sample-1",
          collectedAt: "2026-05-25T12:00:00.000Z",
          windows: {
            weekly: {
              remainingPercent: 0,
              resetsAt: "2026-05-25T12:01:00.000Z",
              windowMinutes: 10080,
            },
          },
        },
      ],
    };
    const statusState = { detail: "", manualRefresh: false, mode: "live" };
    const historyCollectionStatusState = vi.fn(() => statusState);

    app.DASHBOARD_TIME = {
      formatClockTime: vi.fn(),
    };
    app.DASHBOARD_STATUS = {
      historyCollectionStatusState,
    };
    app.USAGE_WINDOWS = {
      WINDOW_KEYS: ["weekly"],
    };
    app.selectedSupportedWindowKey = () => "weekly";
    app.pacePresentationTimeMsForSample = vi.fn(() =>
      Date.parse("2026-05-25T12:00:30.000Z"),
    );
    app.renderWindowControls = vi.fn();
    app.initialDashboardLoadComplete = false;
    app.paceView = {
      hasForcedPaceStateOverride: vi.fn(() => false),
      playPendingSpecialTransition: vi.fn(),
      refreshForcedPaceStateOverride: vi.fn(() => {
        expect(app.initialDashboardLoadComplete).toBe(false);
      }),
    };
    app.renderSummaryWindow = vi.fn(() => ({
      hasResetTiming: true,
      heldZeroState: true,
      staleWindow: true,
    }));
    app.isManualRefreshLeadWindow = vi.fn(() => false);
    app.applyHistoryStatus = vi.fn();
    app.usageChartView = {
      renderHistory: vi.fn(),
    };
    app.setLatestMetadata = vi.fn();

    app.renderHistory(history, {
      ok: true,
      refreshedAt: history.samples[0].collectedAt,
    });

    expect(historyCollectionStatusState.mock.calls[0][0]).toMatchObject({
      hasResetTiming: true,
      staleWindow: false,
    });
    expect(app.applyHistoryStatus).toHaveBeenCalledWith(statusState);
    expect(app.initialDashboardLoadComplete).toBe(true);
    expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();
  });
});
