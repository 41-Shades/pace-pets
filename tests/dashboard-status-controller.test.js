import fs from "node:fs";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

const controllerSource = fs.readFileSync(
  new URL(
    "../collector/extension/dashboard-status-controller.js",
    import.meta.url,
  ),
  "utf8",
);

function classList() {
  return { remove: vi.fn(), toggle: vi.fn() };
}

function controllerElements() {
  return {
    collectionPulse: { classList: classList() },
    collectionStatus: {},
    collectionStatusLabel: { classList: classList(), hidden: false },
    lastCollected: { setAttribute: vi.fn() },
    lastCollectedValue: { classList: classList(), textContent: "waiting" },
    manualRefreshButton: null,
  };
}

function createController({ completeHistoryPresentation, loadDashboard }) {
  const context = vm.createContext({
    chrome: {
      runtime: {
        sendMessage: (_message, done) => done({ ok: true }),
      },
    },
    CodexExtensionStorage: {
      callbackWithLastError: (invoke) =>
        new Promise((resolve) => invoke(resolve)),
    },
    PacePetsDashboardStatusLogic: {
      AUTO_CHECKS_STATUS_TOOLTIP: "Automatic checks",
      CHECKS_EVERY_ARIA: "Checks automatically",
      COLLECTION_STATUS_TITLE: "Collection status",
      LAST_COLLECTED_UPDATE_FEEDBACK_MS: 1000,
      MANUAL_REFRESH_COOLDOWN_PREFIX: "Available in",
      MANUAL_REFRESH_DEFAULT_LABEL: "Check now",
      MANUAL_REFRESH_FAILURE_VISIBLE_MS: 1000,
      STATUS_TEXT: { checkFailed: "Check failed", live: "Live" },
      collectionStatusLabelText: (text) => text,
      refreshResponseMessage: () => "Refresh failed",
      statusSummaryText: (text, detail) => `${text}: ${detail}`,
    },
    PacePetsRefreshControl: {
      MANUAL_REFRESH_COOLDOWN_MS: 1000,
      cooldownRemainingMs: () => 0,
      manualRefreshResponseFailed: () => false,
      refreshNowMessage: () => ({ type: "refresh" }),
      responseCooldownUntilMs: () => null,
    },
    PacePetsUsagePermissions: {
      ensureChatGptHostPermission: () => Promise.resolve(true),
    },
    window: { clearTimeout: vi.fn(), setTimeout: vi.fn(() => 1) },
  });
  vm.runInContext(controllerSource, context);
  const controller = context.PacePetsDashboardStatus.createController({
    appTooltips: { setText: vi.fn() },
    completeHistoryPresentation,
    elements: controllerElements(),
    formatClockTime: vi.fn(),
    getCurrentHistory: () => null,
    loadDashboard,
    setCurrentRefreshStatus: vi.fn(),
  });
  controller.setStatus("Live", "live", "Collection status", "", {
    manualRefresh: true,
  });
  return controller;
}

describe("PacePetsDashboardStatus manual refresh recovery", () => {
  it("restores presentation authority after its dashboard read fails", async () => {
    const error = new Error("Dashboard read failed.");
    const completeHistoryPresentation = vi.fn();
    const loadDashboard = vi.fn(() => Promise.reject(error));
    const controller = createController({
      completeHistoryPresentation,
      loadDashboard,
    });

    await controller.runManualRefresh();

    expect(loadDashboard).toHaveBeenCalledWith({
      refreshWindowSelection: false,
    });
    expect(completeHistoryPresentation).toHaveBeenCalledOnce();
  });
});
