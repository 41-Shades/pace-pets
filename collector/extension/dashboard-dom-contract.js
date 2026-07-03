(function attachPacePetsDashboardDom(root) {
  "use strict";

  const DASHBOARD_ELEMENT_SELECTORS = Object.freeze({
    appTooltip: "#app-tooltip",
    audioControlGroup: "#audio-control",
    audioToggle: "#audio-toggle",
    audioVolume: "#audio-volume",
    audioVolumePanel: "#audio-volume-panel",
    audioVolumeRail: "#audio-volume-rail",
    chartCanvas: "#usage-chart",
    chartFrame: "#chart-frame",
    chartState: "#chart-state",
    clearDataButton: "#clear-data-button",
    collectionPulse: "#collection-pulse",
    collectionStatus: "#collection-status",
    collectionStatusLabel: "#collection-status-label",
    collectorVersion: "#collector-version",
    earlyResetButton: "#early-reset-button",
    earlyResetPopover: "#early-reset-popover",
    earlyResetPopoverText: "#early-reset-popover .early-reset-popover-text",
    favicon: "#dynamic-favicon",
    infoClose: "#info-close",
    infoOverlay: "#info-overlay",
    infoPanel: ".info-panel",
    infoToggle: "#info-toggle",
    lastCollected: "#last-collected",
    lastCollectedValue: "#last-collected-value",
    manualRefreshButton: "#manual-refresh-button",
    motionToggle: "#motion-toggle",
    paceAltRatio: "#pace-alt-ratio",
    paceBurnoutIn: "#pace-burnout-in",
    paceCard: "#pace-card",
    paceChangePulse: "#pace-change-pulse",
    paceCopy: "#pace-copy",
    paceIcon: "#pace-icon",
    paceRatioStat: "#pace-ratio-stat",
    paceRatioValue: "#pace-ratio-value",
    paceStateRail: ".state-rail",
    paceStateStack: "#pace-state-stack",
    paceStats: ".pace-stats",
    paceTitle: "#pace-title",
    perfectZeroPageBackground: "#perfect-zero-page-background",
    priorResetDate: "#prior-reset-date",
    priorResetLabel: "#prior-reset-label",
    priorResetTime: "#prior-reset-time",
    resetBudgetRate: "#reset-budget-rate",
    resetBudgetRateUnit: "#reset-budget-rate-unit",
    resetBudgetRateValue: "#reset-budget-rate-value",
    resetsIn: "#resets-in",
    resetCountdownCard: ".reset-countdown-card",
    resetProgressFill: "#reset-progress-fill",
    resetWindowCard: ".reset-window-card",
    scheduledResetDate: "#scheduled-reset-date",
    scheduledResetLabel: "#scheduled-reset-label",
    scheduledResetTime: "#scheduled-reset-time",
    shell: ".shell",
    themeToggle: "#theme-toggle",
    timeBar: "#time-bar",
    timePercent: "#time-percent",
    usageBar: "#usage-bar",
    usageDescription: "#usage-description",
    usagePercent: "#usage-percent",
    usageTitle: "#usage-title",
    windowToggle: "#window-toggle",
  });
  const WINDOW_OPTION_SELECTOR = ".window-toggle-option[data-window-key]";

  function idFromSelector(selector) {
    const match = /^#([A-Za-z][\w-]*)$/.exec(selector);
    return match?.[1] || null;
  }

  const REQUIRED_DASHBOARD_ELEMENT_IDS = Object.freeze(
    Object.values(DASHBOARD_ELEMENT_SELECTORS)
      .map(idFromSelector)
      .filter(Boolean),
  );

  function collectElements(documentRef) {
    return Object.freeze({
      ...Object.fromEntries(
        Object.entries(DASHBOARD_ELEMENT_SELECTORS).map(([key, selector]) => [
          key,
          documentRef.querySelector(selector),
        ]),
      ),
      windowOptions: Object.freeze([
        ...documentRef.querySelectorAll(WINDOW_OPTION_SELECTOR),
      ]),
    });
  }

  root.PacePetsDashboardDom = Object.freeze({
    DASHBOARD_ELEMENT_SELECTORS,
    REQUIRED_DASHBOARD_ELEMENT_IDS,
    WINDOW_OPTION_SELECTOR,
    collectElements,
  });
})(globalThis);
