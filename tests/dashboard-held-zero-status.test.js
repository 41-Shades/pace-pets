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
    "collector/extension/dashboard-history-methods.js",
  );
});

function expectHeldHistoryPresentation({
  app,
  history,
  refreshStatus,
  renderAtMs,
  statusState,
}) {
  expect(
    app.DASHBOARD_STATUS.historyCollectionStatusState.mock.calls[0][0],
  ).toMatchObject({ hasResetTiming: true, staleWindow: false });
  expect(app.updateCurrentHeldZeroStates).toHaveBeenCalledWith(
    history,
    refreshStatus,
    history.samples[0].windows,
    renderAtMs,
  );
  expect(app.renderSummaryWindow).toHaveBeenCalledWith(
    "weekly",
    history.samples[0].windows.weekly,
    history.samples[0].windows,
    history,
    {
      applyPaceSummary: true,
      heldZeroStateKey: "singularity",
      renderAtMs,
    },
  );
  expect(app.applyHistoryStatus).toHaveBeenCalledWith(statusState);
  expect(app.usageChartView.renderHistory).toHaveBeenCalledWith({
    atMs: renderAtMs,
    hasResetTiming: true,
    history,
    summaryWindow: history.samples[0].windows.weekly,
    summaryWindowKey: "weekly",
  });
  expect(app.initialDashboardLoadComplete).toBe(true);
  expect(app.paceView.playPendingSpecialTransition).toHaveBeenCalledOnce();

  app.paceView.refreshForcedPaceStateOverride = vi.fn();
  app.renderHistory(history, refreshStatus, { refreshChart: false });
  expect(app.usageChartView.refreshHistoryLivePoint).toHaveBeenCalledWith({
    atMs: renderAtMs,
    summaryWindow: history.samples[0].windows.weekly,
    summaryWindowKey: "weekly",
  });
}

describe("PacePetsDashboardApp held zero history status", () => {
  it("does not project held zero summaries as stale waiting status", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const renderAtMs = Date.parse("2026-05-25T12:00:00.000Z");
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
    app.DASHBOARD_TIME = { formatClockTime: vi.fn() };
    app.DASHBOARD_STATUS = {
      historyCollectionStatusState: vi.fn(() => statusState),
    };
    app.USAGE_WINDOWS = { WINDOW_KEYS: ["weekly"] };
    app.selectedSupportedWindowKey = () => "weekly";
    app.updateCurrentHeldZeroStates = vi.fn(() => ({
      weekly: {
        resetsAt: "2026-05-25T12:01:00.000Z",
        stateKey: "singularity",
      },
    }));
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
      refreshHistoryLivePoint: vi.fn(),
      renderHistory: vi.fn(),
    };
    app.setLatestMetadata = vi.fn();

    const refreshStatus = {
      heldZeroStates: {
        weekly: {
          resetsAt: "2026-05-25T12:01:00.000Z",
          stateKey: "singularity",
        },
      },
      ok: true,
      refreshedAt: history.samples[0].collectedAt,
    };
    app.renderHistory(history, refreshStatus);

    expect(app.isManualRefreshLeadWindow).toHaveBeenCalledWith(
      "weekly",
      history.samples[0].windows.weekly,
      renderAtMs,
    );
    expectHeldHistoryPresentation({
      app,
      history,
      refreshStatus,
      renderAtMs,
      statusState,
    });
  });
});
