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
  await importExtensionScript("collector/extension/dashboard-pace-data.js");
  await importExtensionScript("collector/extension/dashboard-pace-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-pace-summary-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-history-timing-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-history-methods.js",
  );
});

function summaryElements() {
  return {
    paceBurnoutIn: { textContent: "" },
    priorResetLabel: { textContent: "" },
    resetBudgetRate: { hidden: false },
    resetBudgetRateUnit: { textContent: "" },
    resetBudgetRateValue: { textContent: "" },
    resetProgressFill: {},
    resetWindowCard: { dataset: {} },
    resetsIn: { textContent: "" },
    scheduledResetLabel: { textContent: "" },
    timeBar: {},
    timePercent: { textContent: "" },
    usageBar: {},
    usagePercent: { textContent: "" },
  };
}

function paceSummaryRenderer() {
  const controller = Object.create(
    globalThis.PacePetsDashboardPaceController.prototype,
  );
  return vi.fn(
    (
      windowData,
      timePercent,
      staleWindow,
      comparisonPaceRatio,
      { allowPerfectZero, heldZeroStateKey, resetCountdownDisplaysZero },
    ) =>
      controller.paceSummaryModel({
        allowPerfectZero,
        comparisonPaceRatio,
        heldZeroStateKey,
        remainingPercent: windowData?.remainingPercent,
        resetCountdownDisplaysZero,
        staleWindow,
        timePercent,
      }),
  );
}

function configureSummaryApp(app, { timeRemainingPercent }) {
  app.DASHBOARD_TIME = {
    dateMs: globalThis.PacePetsLogic.dateMs,
    isResetWindowStale: globalThis.PacePetsLogic.isResetWindowStale,
    resetCountdown: vi.fn((value, atMs) =>
      globalThis.PacePetsLogic.dateMs(value) <= atMs
        ? "Window ended"
        : `reset:${atMs}`,
    ),
    resetCountdownDisplaysZero:
      globalThis.PacePetsLogic.resetCountdownDisplaysZero,
    setResetParts: vi.fn(),
    timeRemainingPercent,
    windowStartMs: globalThis.PacePetsLogic.windowStartMs,
  };
  app.WINDOW_SPECS = globalThis.CodexUsageWindows.WINDOW_SPECS;
  app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
  app.elements = summaryElements();
  app.paceView = {
    renderPaceSummary: paceSummaryRenderer(),
    setPercent(element, _bar, value) {
      element.textContent = value;
    },
  };
  app.setResetBudgetRate = vi.fn();
  app.setPaceBurnoutMetrics = vi.fn();
  return app;
}

describe("PacePetsDashboardApp alternate pace presentation", () => {
  it("keeps the five-hour placeholder visible when weekly is selected", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
    app.WINDOW_SPECS = globalThis.CodexUsageWindows.WINDOW_SPECS;

    expect(
      app.alternatePaceRatioSummary({}, "weekly", { samples: [] }),
    ).toEqual({
      className: "",
      label: "5h:",
      value: "--",
    });
  });
});

describe("PacePetsDashboardApp history presentation time", () => {
  it("preserves the current semantic zero state across its reset boundary", () => {
    const app = Object.create(globalThis.PacePetsDashboardApp.prototype);
    const windowData = {
      remainingPercent: 0,
      resetsAt: "2026-05-25T12:01:00.000Z",
      windowMinutes: 300,
    };
    const history = {
      samples: [
        {
          collectedAt: "2026-05-25T12:00:30.000Z",
          windows: { weekly: windowData },
        },
      ],
    };
    app.USAGE_WINDOWS = globalThis.CodexUsageWindows;
    app.currentHeldZeroStates = {};

    const active = app.updateCurrentHeldZeroStates(
      history,
      null,
      { weekly: windowData },
      Date.parse("2026-05-25T12:00:30.000Z"),
    );
    expect(active.weekly.stateKey).toBe("singularity");

    const stale = app.updateCurrentHeldZeroStates(
      history,
      {
        heldZeroStates: {
          weekly: {
            resetsAt: "2026-05-24T12:01:00.000Z",
            stateKey: "splat",
          },
        },
      },
      { weekly: windowData },
      Date.parse("2026-05-25T12:02:00.000Z"),
    );
    expect(stale).toEqual(active);
  });

  it("renders active 91/91 values and Perfect sync from one live timestamp", () => {
    const renderAtMs = Date.parse("2026-05-25T12:00:00.000Z");
    const windowData = {
      remainingPercent: 91,
      resetsAt: "2026-05-25T16:33:00.000Z",
      windowMinutes: 300,
    };
    const alternateWindowData = {
      remainingPercent: 50,
      resetsAt: "2026-06-01T12:00:00.000Z",
      windowMinutes: 10080,
    };
    const timeRemainingPercent = vi.fn((candidate) =>
      candidate === windowData ? 91 : 50,
    );
    const app = configureSummaryApp(
      Object.create(globalThis.PacePetsDashboardApp.prototype),
      { timeRemainingPercent },
    );

    app.renderSummaryWindow(
      "weekly",
      windowData,
      { fiveHour: alternateWindowData, weekly: windowData },
      { samples: [] },
      { renderAtMs },
    );

    expect(timeRemainingPercent).toHaveBeenCalledOnce();
    expect(timeRemainingPercent).toHaveBeenCalledWith(windowData, renderAtMs);
    expect(app.elements.usagePercent.textContent).toBe(91);
    expect(app.elements.timePercent.textContent).toBe(91);
    expect(app.elements.resetsIn.textContent).toBe(`reset:${renderAtMs}`);
    expect(app.paceView.renderPaceSummary.mock.calls[0][1]).toBe(91);
    expect(app.paceView.renderPaceSummary.mock.results[0].value).toMatchObject({
      level: globalThis.PacePetsLogic.PACE_STATES.sync.className,
      paceRatioForDisplay: 1,
      title: "Perfect sync",
    });
    expect(app.DASHBOARD_TIME.setResetParts).toHaveBeenCalledWith(
      app.elements,
      windowData,
      globalThis.CodexUsageWindows.WINDOW_SPECS.weekly,
      renderAtMs,
    );
    expect(app.setResetBudgetRate).toHaveBeenCalledWith(windowData, renderAtMs);
    expect(app.setPaceBurnoutMetrics).toHaveBeenCalledWith(
      windowData,
      renderAtMs,
    );
  });
});

describe("PacePetsDashboardApp stale held-state presentation", () => {
  it("renders an explicit reset-matched Singularity hold", () => {
    const renderAtMs = Date.parse("2026-05-25T12:02:00.000Z");
    const windowData = {
      remainingPercent: 0,
      resetsAt: "2026-05-25T12:01:00.000Z",
      windowMinutes: 300,
    };
    const history = {
      samples: [
        {
          collectedAt: "2026-05-25T12:00:30.000Z",
          windows: { weekly: windowData },
        },
      ],
    };
    const app = configureSummaryApp(
      Object.create(globalThis.PacePetsDashboardApp.prototype),
      { timeRemainingPercent: globalThis.PacePetsLogic.timeRemainingPercent },
    );

    const summaryState = app.renderSummaryWindow(
      "weekly",
      windowData,
      { weekly: windowData },
      history,
      { heldZeroStateKey: "singularity", renderAtMs },
    );

    expect(app.elements.timePercent.textContent).toBe(0);
    expect(app.elements.resetsIn.textContent).toBe("0d 0h 0m");
    expect(app.paceView.renderPaceSummary.mock.results[0].value).toMatchObject({
      heldZeroState: true,
      level: globalThis.PacePetsLogic.PACE_STATES.singularity.className,
      resetCountdownOverride: "0d 0h 0m",
      title: "Singularity",
    });
    expect(summaryState).toMatchObject({
      heldZeroState: true,
      staleWindow: true,
    });
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
});
