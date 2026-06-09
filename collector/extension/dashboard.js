(() => {
  "use strict";

  const DASHBOARD_INIT_KEY = "__pacePetsDashboardInitialized";
  if (globalThis[DASHBOARD_INIT_KEY]) {
    return;
  }
  globalThis[DASHBOARD_INIT_KEY] = true;

  function requiredGlobal(name, description) {
    const value = globalThis[name];
    if (!value) {
      throw new Error(`${description} must load before dashboard.js.`);
    }
    return value;
  }

  function collectElements() {
    return {
      shell: document.querySelector(".shell"),
      perfectZeroPageBackground: document.querySelector(
        "#perfect-zero-page-background",
      ),
      collectionPulse: document.querySelector("#collection-pulse"),
      collectionStatusLabel: document.querySelector("#collection-status-label"),
      favicon: document.querySelector("#dynamic-favicon"),
      usageTitle: document.querySelector("#usage-title"),
      usageDescription: document.querySelector("#usage-description"),
      themeToggle: document.querySelector("#theme-toggle"),
      infoToggle: document.querySelector("#info-toggle"),
      infoOverlay: document.querySelector("#info-overlay"),
      infoPanel: document.querySelector(".info-panel"),
      infoClose: document.querySelector("#info-close"),
      windowToggle: document.querySelector("#window-toggle"),
      windowOptions: [
        ...document.querySelectorAll(".window-toggle-option[data-window-key]"),
      ],
      paceCard: document.querySelector("#pace-card"),
      paceIcon: document.querySelector("#pace-icon"),
      paceTitle: document.querySelector("#pace-title"),
      paceCopy: document.querySelector("#pace-copy"),
      paceStats: document.querySelector(".pace-stats"),
      paceRatioStat: document.querySelector("#pace-ratio-stat"),
      paceRatioValue: document.querySelector("#pace-ratio-value"),
      paceAltRatio: document.querySelector("#pace-alt-ratio"),
      usagePercent: document.querySelector("#usage-percent"),
      usageBar: document.querySelector("#usage-bar"),
      timePercent: document.querySelector("#time-percent"),
      timeBar: document.querySelector("#time-bar"),
      priorResetLabel: document.querySelector("#prior-reset-label"),
      priorResetDate: document.querySelector("#prior-reset-date"),
      priorResetTime: document.querySelector("#prior-reset-time"),
      scheduledResetLabel: document.querySelector("#scheduled-reset-label"),
      scheduledResetDate: document.querySelector("#scheduled-reset-date"),
      scheduledResetTime: document.querySelector("#scheduled-reset-time"),
      resetWindowCard: document.querySelector(".reset-window-card"),
      resetProgressFill: document.querySelector("#reset-progress-fill"),
      resetsIn: document.querySelector("#resets-in"),
      chartFrame: document.querySelector("#chart-frame"),
      chartCanvas: document.querySelector("#usage-chart"),
      chartState: document.querySelector("#chart-state"),
      lastCollected: document.querySelector("#last-collected"),
      lastCollectedValue: document.querySelector("#last-collected-value"),
      manualRefreshButton: document.querySelector("#manual-refresh-button"),
      collectorVersion: document.querySelector("#collector-version"),
      earlyResetButton: document.querySelector("#early-reset-button"),
      earlyResetPopover: document.querySelector("#early-reset-popover"),
      earlyResetPopoverText: document.querySelector(
        "#early-reset-popover .early-reset-popover-text",
      ),
      appTooltip: document.querySelector("#app-tooltip"),
    };
  }

  const dependencies = {
    APP_TOOLTIPS: requiredGlobal(
      "PacePetsAppTooltips",
      "Pace Pets app tooltips",
    ),
    DASHBOARD_CHART: requiredGlobal(
      "PacePetsDashboardChart",
      "Pace Pets dashboard chart",
    ),
    DASHBOARD_PACE: requiredGlobal(
      "PacePetsDashboardPace",
      "Pace Pets dashboard pace controls",
    ),
    DASHBOARD_STATUS: requiredGlobal(
      "PacePetsDashboardStatus",
      "Pace Pets dashboard status controls",
    ),
    DASHBOARD_TIME: requiredGlobal(
      "PacePetsDashboardTime",
      "Pace Pets dashboard time",
    ),
    DEVELOPER_OPTIONS: requiredGlobal(
      "PacePetsDeveloperOptions",
      "Pace Pets developer options",
    ),
    EARLY_RESET: requiredGlobal("PacePetsEarlyReset", "Pace Pets early reset"),
    EXTENSION_STORAGE: requiredGlobal(
      "CodexExtensionStorage",
      "Codex storage adapter",
    ),
    PRODUCT_METADATA: requiredGlobal(
      "CodexProductMetadata",
      "Codex product metadata",
    ),
    REFRESH_CONTROL: requiredGlobal(
      "PacePetsRefreshControl",
      "Pace Pets refresh controls",
    ),
    SHELL_CONTROLS: requiredGlobal(
      "PacePetsDashboardShellControls",
      "Pace Pets dashboard shell controls",
    ),
    USAGE_WINDOWS: requiredGlobal(
      "CodexUsageWindows",
      "Codex usage window contract",
    ),
  };

  const App = requiredGlobal("PacePetsDashboardApp", "Pace Pets dashboard app");
  new App({
    dependencies,
    elements: collectElements(),
  }).start();
})();
