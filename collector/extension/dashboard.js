(() => {
  "use strict";

  const DASHBOARD_INIT_KEY = "__pacePetsDashboardInitialized";
  if (globalThis[DASHBOARD_INIT_KEY]) {
    return;
  }
  globalThis[DASHBOARD_INIT_KEY] = true;

  const USAGE_WINDOWS = globalThis.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before dashboard.js.",
    );
  }
  const PRODUCT_METADATA = globalThis.CodexProductMetadata;
  if (!PRODUCT_METADATA) {
    throw new Error("Codex product metadata must load before dashboard.js.");
  }
  const EXTENSION_STORAGE = globalThis.CodexExtensionStorage;
  if (!EXTENSION_STORAGE) {
    throw new Error("Codex storage adapter must load before dashboard.js.");
  }
  const REFRESH_CONTROL = globalThis.PacePetsRefreshControl;
  if (!REFRESH_CONTROL) {
    throw new Error(
      "Pace Pets refresh controls must load before dashboard.js.",
    );
  }
  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  if (!DEVELOPER_OPTIONS) {
    throw new Error(
      "Pace Pets developer options must load before dashboard.js.",
    );
  }
  const APP_TOOLTIPS = globalThis.PacePetsAppTooltips;
  if (!APP_TOOLTIPS) {
    throw new Error("Pace Pets app tooltips must load before dashboard.js.");
  }
  const EARLY_RESET = globalThis.PacePetsEarlyReset;
  if (!EARLY_RESET) {
    throw new Error("Pace Pets early reset must load before dashboard.js.");
  }
  const DASHBOARD_CHART = globalThis.PacePetsDashboardChart;
  if (!DASHBOARD_CHART) {
    throw new Error("Pace Pets dashboard chart must load before dashboard.js.");
  }
  const SHELL_CONTROLS = globalThis.PacePetsDashboardShellControls;
  if (!SHELL_CONTROLS) {
    throw new Error(
      "Pace Pets dashboard shell controls must load before dashboard.js.",
    );
  }
  const DASHBOARD_STATUS = globalThis.PacePetsDashboardStatus;
  if (!DASHBOARD_STATUS) {
    throw new Error(
      "Pace Pets dashboard status controls must load before dashboard.js.",
    );
  }
  const DASHBOARD_PACE = globalThis.PacePetsDashboardPace;
  if (!DASHBOARD_PACE) {
    throw new Error(
      "Pace Pets dashboard pace controls must load before dashboard.js.",
    );
  }
  const DASHBOARD_TIME = globalThis.PacePetsDashboardTime;
  if (!DASHBOARD_TIME) {
    throw new Error("Pace Pets dashboard time must load before dashboard.js.");
  }

  const elements = {
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
    paceStateStack: document.querySelector("#pace-state-stack"),
    appTooltip: document.querySelector("#app-tooltip"),
  };
  const appTooltips = APP_TOOLTIPS.createController({
    tooltipElement: elements.appTooltip,
  });
  const earlyReset = EARLY_RESET.createController({
    button: elements.earlyResetButton,
    hideTooltip: appTooltips.hide,
    popover: elements.earlyResetPopover,
    popoverText: elements.earlyResetPopoverText,
  });
  const usageChartView = DASHBOARD_CHART.createRenderer({
    chartCanvas: elements.chartCanvas,
    chartFrame: elements.chartFrame,
    chartState: elements.chartState,
    windowSpecs: USAGE_WINDOWS.WINDOW_SPECS,
  });
  const shellControls = SHELL_CONTROLS.createController({
    appTooltips,
    earlyReset,
    elements,
    refreshThemeSensitiveViews: () => refreshThemeSensitiveViews(),
  });
  const dashboardStatus = DASHBOARD_STATUS.createController({
    appTooltips,
    elements,
    formatClockTime: DASHBOARD_TIME.formatClockTime,
    getCurrentHistory: () => currentHistory,
    loadDashboard: (options) => loadDashboard(options),
    setCurrentRefreshStatus: (refreshStatus) => {
      currentRefreshStatus = refreshStatus;
    },
  });
  const paceView = DASHBOARD_PACE.createController({
    defaultWindowKey: USAGE_WINDOWS.DEFAULT_WINDOW_KEY,
    elements,
    getCurrentForcedPaceStateKey: () => currentForcedPaceStateKey,
    getCurrentHistory: () => currentHistory,
    getCurrentRefreshStatus: () => currentRefreshStatus,
    getSelectedWindowKey: () => selectedWindowKey,
    renderHistory: (history, refreshStatus, options) =>
      renderHistory(history, refreshStatus, options),
    restoreToolbarPreviewBadge: () =>
      dashboardStatus.restoreToolbarPreviewBadge(),
    selectedSupportedWindowKey: () => selectedSupportedWindowKey(),
    updateToolbarPreviewBadge: (stateKey) =>
      dashboardStatus.updateToolbarPreviewBadge(stateKey),
    usageChartView,
    windowSpecs: USAGE_WINDOWS.WINDOW_SPECS,
  });

  const DEFAULT_WINDOW_KEY = USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
  const WINDOW_STORAGE_KEY = USAGE_WINDOWS.WINDOW_STORAGE_KEY;
  const DEVELOPER_OPTIONS_STORAGE_KEY = DEVELOPER_OPTIONS.STORAGE_KEY;
  const COLLECTION_STATUS_TITLE = DASHBOARD_STATUS.COLLECTION_STATUS_TITLE;
  const STATUS_TEXT = DASHBOARD_STATUS.STATUS_TEXT;
  const SIGN_IN_NOT_FOUND_COPY = DASHBOARD_STATUS.SIGN_IN_NOT_FOUND_COPY;
  const WINDOW_SPECS = USAGE_WINDOWS.WINDOW_SPECS;
  const DASHBOARD_STATUS_REFRESH_INTERVAL_MS = 60 * 1000;

  let currentHistory = null;
  let currentRefreshStatus = null;
  let currentForcedPaceStateKey = null;
  let selectedWindowKey = DEFAULT_WINDOW_KEY;

  const manifest = chrome.runtime.getManifest();
  document.title = PRODUCT_METADATA.NAME;
  elements.usageTitle.textContent = PRODUCT_METADATA.NAME;
  elements.usageDescription.textContent =
    PRODUCT_METADATA.DASHBOARD_DESCRIPTION;
  elements.collectorVersion.textContent = `v${manifest.version}`;

  function normalizedWindowKey(value) {
    return USAGE_WINDOWS.normalizeWindowKey(value);
  }

  async function readStoredWindowKey() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(WINDOW_STORAGE_KEY);
      return normalizedWindowKey(items[WINDOW_STORAGE_KEY]);
    } catch (error) {
      console.warn("Could not read usage window preference:", error.message);
      return DEFAULT_WINDOW_KEY;
    }
  }

  async function readDeveloperOptions() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(
        DEVELOPER_OPTIONS_STORAGE_KEY,
      );
      return DEVELOPER_OPTIONS.normalizeDeveloperOptions(
        items?.[DEVELOPER_OPTIONS_STORAGE_KEY],
      );
    } catch (error) {
      console.warn("Could not read developer options:", error.message);
      return DEVELOPER_OPTIONS.normalizeDeveloperOptions(null);
    }
  }

  function storeWindowKey(windowKey) {
    EXTENSION_STORAGE.setLocal({ [WINDOW_STORAGE_KEY]: windowKey }).catch(
      (error) => {
        console.warn("Could not store usage window preference:", error.message);
      },
    );
  }

  function paceRatioForValues(remainingPercent, timePercent) {
    return PacePetsLogic.paceRatioForValues(remainingPercent, timePercent);
  }

  function formatPaceRatioValue(value, { suffix = "" } = {}) {
    return PacePetsLogic.formatPaceRatioValue(value, { suffix });
  }

  function windowsForSample(sample) {
    return sample?.windows && typeof sample.windows === "object"
      ? sample.windows
      : {};
  }

  function selectedSupportedWindowKey() {
    // Preserve the selected product window; missing data renders an empty state.
    if (USAGE_WINDOWS.isSupportedWindowKey(selectedWindowKey)) {
      return selectedWindowKey;
    }

    selectedWindowKey = DEFAULT_WINDOW_KEY;
    return DEFAULT_WINDOW_KEY;
  }

  function renderWindowControls(activeKey) {
    const nextKey = alternateWindowKey(activeKey);
    elements.windowToggle.disabled = !nextKey;
    elements.windowToggle.dataset.nextWindowKey = nextKey || "";
    appTooltips.setText(
      elements.windowToggle,
      nextKey ? "Toggle time window (T)" : "",
    );
    elements.windowToggle.setAttribute(
      "aria-label",
      nextKey
        ? `Usage window ${WINDOW_SPECS[activeKey].badge}. Switch to ${WINDOW_SPECS[nextKey].badge}.`
        : `Usage window ${WINDOW_SPECS[activeKey].badge}.`,
    );

    elements.windowOptions.forEach((option) => {
      const windowKey = option.dataset.windowKey;
      const active = windowKey === activeKey;

      option.classList.toggle("active", active);
      option.classList.remove("unavailable");
      option.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function alternateWindowKey(activeKey) {
    return USAGE_WINDOWS.alternateWindowKey(activeKey);
  }

  function paceRatioForWindow(windowData) {
    const remainingPercent = windowData?.remainingPercent;
    const timePercent = DASHBOARD_TIME.timeRemainingPercent(windowData);
    return paceRatioForValues(remainingPercent, timePercent);
  }

  function alternatePaceRatioSummary(windows, activeKey) {
    const comparisonKey = alternateWindowKey(activeKey);
    if (!comparisonKey || !windows[comparisonKey]) {
      return null;
    }

    const paceRatio = paceRatioForWindow(windows[comparisonKey]);
    const label = `${WINDOW_SPECS[comparisonKey].badge}:`;
    if (paceRatio === null) {
      return {
        className: "",
        label,
        value: "--",
      };
    }

    return {
      className:
        PacePetsLogic.paceStatePresentationForRatio(paceRatio).className,
      label,
      value: formatPaceRatioValue(paceRatio),
    };
  }

  function allowsPerfectZeroForWindow(history, windowKey, windowData) {
    return PacePetsLogic.allowsPerfectZeroForWindow(
      history,
      windowKey,
      windowData,
    );
  }

  function setLatestMetadata(latest, refreshStatus = null) {
    const checkedAt = refreshStatus?.refreshedAt || latest?.collectedAt;
    const checkedValue = checkedAt
      ? DASHBOARD_TIME.formatClockTime(checkedAt)
      : "waiting";
    dashboardStatus.setLastCollected(checkedValue);
  }

  function renderSummaryWindow(windowKey, windowData, windows = {}, history) {
    const spec = WINDOW_SPECS[windowKey];
    const resetMs = DASHBOARD_TIME.dateMs(windowData?.resetsAt);
    const timePercent = DASHBOARD_TIME.timeRemainingPercent(windowData);
    const hasResetTiming =
      resetMs !== null && DASHBOARD_TIME.windowStartMs(windowData) !== null;
    const staleWindow = DASHBOARD_TIME.isResetWindowStale(windowData);

    elements.priorResetLabel.textContent = spec.priorResetLabel;
    elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
    elements.resetWindowCard.dataset.windowKey = windowKey;
    paceView.setPercent(
      elements.usagePercent,
      elements.usageBar,
      windowData?.remainingPercent,
    );
    paceView.setPercent(elements.timePercent, elements.timeBar, timePercent);
    DASHBOARD_TIME.setResetParts(elements, windowData, spec);
    elements.resetsIn.textContent = DASHBOARD_TIME.resetCountdown(
      windowData?.resetsAt,
    );
    paceView.renderPaceSummary(
      windowData,
      timePercent,
      staleWindow,
      alternatePaceRatioSummary(windows, windowKey),
      {
        allowPerfectZero: allowsPerfectZeroForWindow(
          history,
          windowKey,
          windowData,
        ),
        waitingForReadingText: STATUS_TEXT.waitingForReading,
      },
    );

    return {
      hasResetTiming,
      staleWindow,
    };
  }

  function emptyHistoryState(refreshStatus) {
    if (DASHBOARD_STATUS.isSignInNotFoundStatus(refreshStatus)) {
      return {
        statusText: STATUS_TEXT.signInNotFound,
        statusMode: "warning",
        statusDetail: dashboardStatus.refreshFailureDetail(refreshStatus),
        paceTitle: STATUS_TEXT.signInNotFound,
        paceCopy: SIGN_IN_NOT_FOUND_COPY,
        chartCopy: STATUS_TEXT.signInNotFound,
      };
    }

    if (DASHBOARD_STATUS.isFailedRefreshStatus(refreshStatus)) {
      return {
        statusText: STATUS_TEXT.checkFailed,
        statusMode: "error",
        statusDetail: dashboardStatus.refreshFailureDetail(refreshStatus),
        paceTitle: STATUS_TEXT.checkFailed,
        paceCopy: refreshStatus.message || "The latest usage check failed.",
        chartCopy: "Waiting for local history.",
      };
    }

    if (
      refreshStatus?.ok === true &&
      !DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus)
    ) {
      return {
        statusText: STATUS_TEXT.refreshNeeded,
        statusMode: "stale",
        statusDetail: "",
        paceTitle: "No history yet",
        paceCopy: "Waiting for the first automatic usage check.",
        chartCopy: "Waiting for local history.",
      };
    }

    return {
      statusText: STATUS_TEXT.waiting,
      statusMode: "ok",
      statusDetail: "",
      paceTitle: "No history yet",
      paceCopy: "Waiting for the first automatic usage check.",
      chartCopy: "Waiting for local history.",
    };
  }

  function renderEmptyHistory(refreshStatus = null) {
    const windowKey = selectedSupportedWindowKey();
    const spec = WINDOW_SPECS[windowKey];
    const state = emptyHistoryState(refreshStatus);
    dashboardStatus.setStatus(
      state.statusText,
      state.statusMode,
      COLLECTION_STATUS_TITLE,
      state.statusDetail,
      { manualRefresh: true },
    );
    renderWindowControls(windowKey);
    elements.priorResetLabel.textContent = spec.priorResetLabel;
    elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
    elements.resetWindowCard.dataset.windowKey = windowKey;
    paceView.setPercent(elements.usagePercent, elements.usageBar, null);
    paceView.setPercent(elements.timePercent, elements.timeBar, null);
    DASHBOARD_TIME.setResetParts(elements, null, spec);
    elements.resetsIn.textContent = "--";
    paceView.setPaceSummary(
      paceView.mutedClassName,
      state.paceTitle,
      state.paceCopy,
      null,
      null,
    );
    usageChartView.setEmpty(state.chartCopy);
    setLatestMetadata(null, refreshStatus);
    paceView.refreshForcedOverrideOrActivePacePreview();
  }

  function renderHistoryLoadFailure() {
    const windowKey = selectedSupportedWindowKey();
    const spec = WINDOW_SPECS[windowKey];
    dashboardStatus.setStatus(STATUS_TEXT.checkFailed, "error");
    renderWindowControls(windowKey);
    elements.priorResetLabel.textContent = spec.priorResetLabel;
    elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
    elements.resetWindowCard.dataset.windowKey = windowKey;
    paceView.setPercent(elements.usagePercent, elements.usageBar, null);
    paceView.setPercent(elements.timePercent, elements.timeBar, null);
    DASHBOARD_TIME.setResetParts(elements, null, spec);
    elements.resetsIn.textContent = "--";
    paceView.setPaceSummary(
      paceView.mutedClassName,
      STATUS_TEXT.checkFailed,
      "Could not read local history.",
      null,
      null,
    );
    usageChartView.setEmpty("Could not read local history.");
    paceView.refreshForcedOverrideOrActivePacePreview();
  }

  function historyStatusState({
    refreshStatus,
    latest,
    hasAnySupportedWindow,
    summaryWindow,
    summaryState,
  }) {
    if (DASHBOARD_STATUS.isSignInNotFoundStatus(refreshStatus)) {
      return {
        text: STATUS_TEXT.signInNotFound,
        mode: "warning",
        detail: dashboardStatus.refreshFailureDetail(refreshStatus, latest),
        manualRefresh: true,
      };
    }

    if (DASHBOARD_STATUS.isFailedRefreshStatus(refreshStatus)) {
      return {
        text: STATUS_TEXT.checkFailed,
        mode: "error",
        detail: dashboardStatus.refreshFailureDetail(refreshStatus, latest),
        manualRefresh: true,
      };
    }

    if (
      refreshStatus?.ok === true &&
      !DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus)
    ) {
      return {
        text: STATUS_TEXT.refreshNeeded,
        mode: "stale",
        detail: "",
        manualRefresh: true,
      };
    }

    if (
      !hasAnySupportedWindow ||
      !summaryWindow ||
      !summaryState.hasResetTiming
    ) {
      return {
        text: STATUS_TEXT.waiting,
        mode: "warning",
        detail: "",
        manualRefresh: true,
      };
    }

    if (summaryState.staleWindow) {
      if (
        refreshStatus?.ok === true &&
        DASHBOARD_STATUS.isRecentRefreshStatus(refreshStatus)
      ) {
        return {
          text: STATUS_TEXT.waitingForReading,
          mode: "live",
          detail: "",
        };
      }

      return {
        text: STATUS_TEXT.refreshNeeded,
        mode: "stale",
        detail: "",
        manualRefresh: true,
      };
    }

    return { text: STATUS_TEXT.live, mode: "live", detail: "" };
  }

  function applyHistoryStatus(state) {
    dashboardStatus.setStatus(
      state.text,
      state.mode,
      COLLECTION_STATUS_TITLE,
      state.detail,
      {
        manualRefresh: state.manualRefresh === true,
      },
    );
  }

  function renderHistoryChart(
    history,
    summaryWindowKey,
    summaryWindow,
    hasResetTiming,
  ) {
    usageChartView.renderHistory({
      hasResetTiming,
      history,
      summaryWindowKey,
      summaryWindow,
    });
  }

  function renderHistory(
    history,
    refreshStatus = null,
    { refreshChart = true } = {},
  ) {
    const latest = CodexUsageHistory.latestSample(history);
    if (!latest) {
      renderEmptyHistory(refreshStatus);
      return;
    }

    const windows = windowsForSample(latest);
    const summaryWindowKey = selectedSupportedWindowKey();
    const summaryWindow = windows[summaryWindowKey];

    renderWindowControls(summaryWindowKey);
    const summaryState = renderSummaryWindow(
      summaryWindowKey,
      summaryWindow,
      windows,
      history,
    );

    const resetMs = DASHBOARD_TIME.dateMs(summaryWindow?.resetsAt);
    const hasResetTiming =
      resetMs !== null && DASHBOARD_TIME.windowStartMs(summaryWindow) !== null;
    const hasAnySupportedWindow = USAGE_WINDOWS.WINDOW_KEYS.some(
      (windowKey) => windows[windowKey],
    );

    applyHistoryStatus(
      historyStatusState({
        refreshStatus,
        latest,
        hasAnySupportedWindow,
        summaryWindow,
        summaryState,
      }),
    );

    if (refreshChart) {
      renderHistoryChart(
        history,
        summaryWindowKey,
        summaryWindow,
        hasResetTiming,
      );
    }
    setLatestMetadata(latest, refreshStatus);
    paceView.refreshForcedOverrideOrActivePacePreview();
  }

  async function readRefreshStatus() {
    return CodexUsageHistory.readRefreshStatus();
  }

  async function loadDashboard({ refreshWindowPreference = true } = {}) {
    const [history, refreshStatus, storedWindowKeyValue, developerOptions] =
      await Promise.all([
        CodexUsageHistory.readHistory(),
        readRefreshStatus(),
        refreshWindowPreference ? readStoredWindowKey() : Promise.resolve(null),
        readDeveloperOptions(),
      ]);
    if (refreshWindowPreference) {
      selectedWindowKey = storedWindowKeyValue;
    }
    currentForcedPaceStateKey = developerOptions.forcedPaceStateKey;
    currentHistory = history;
    currentRefreshStatus = refreshStatus;
    paceView.renderStateRail();
    renderHistory(currentHistory, currentRefreshStatus);
  }

  async function refreshDashboardTimeSensitiveViews() {
    if (!currentHistory) {
      await loadDashboard();
      return;
    }

    renderHistory(currentHistory, currentRefreshStatus, {
      refreshChart: false,
    });
  }

  function refreshThemeSensitiveViews() {
    loadDashboard().catch(renderHistoryLoadFailure);
  }

  function toggleUsageWindow() {
    const windowKey = elements.windowToggle.dataset.nextWindowKey;
    if (
      !USAGE_WINDOWS.isSupportedWindowKey(windowKey) ||
      elements.windowToggle.disabled
    ) {
      return false;
    }

    selectedWindowKey = windowKey;
    storeWindowKey(windowKey);
    loadDashboard({ refreshWindowPreference: false }).catch(
      renderHistoryLoadFailure,
    );
    return true;
  }

  elements.paceStateStack.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    const chip = paceView.stateChipFromEvent(event);
    if (!chip) {
      return;
    }

    paceView.showPacePreview(chip.dataset.paceStateKey);
    appTooltips.hide();

    try {
      chip.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; click still provides timed restore.
    }
  });

  elements.paceStateStack.addEventListener(
    "pointercancel",
    paceView.restorePacePreview,
  );

  elements.paceStateStack.addEventListener("pointerup", (event) => {
    const chip = paceView.stateChipFromEvent(event);
    if (!chip || chip.dataset.paceStateKey !== paceView.activePreviewKey) {
      return;
    }

    paceView.schedulePacePreviewRestore();
  });

  elements.paceStateStack.addEventListener("click", (event) => {
    const chip = paceView.stateChipFromEvent(event);
    if (!chip) {
      return;
    }

    paceView.showPacePreview(chip.dataset.paceStateKey);
    paceView.schedulePacePreviewRestore();
    appTooltips.releasePointerClickFocus(event, chip);
  });

  elements.windowToggle.addEventListener("click", (event) => {
    const toggled = toggleUsageWindow();
    if (toggled) {
      appTooltips.releasePointerClickFocus(event, elements.windowToggle);
    }
  });

  elements.themeToggle.addEventListener("click", (event) => {
    shellControls.toggleTheme();
    appTooltips.releasePointerClickFocus(event, elements.themeToggle);
  });

  elements.manualRefreshButton.addEventListener("click", (event) => {
    dashboardStatus.runManualRefresh().catch((error) => {
      console.warn("Codex usage manual refresh failed:", error);
    });
    appTooltips.releasePointerClickFocus(event, elements.manualRefreshButton);
  });

  elements.infoToggle.addEventListener("click", (event) => {
    shellControls.toggleInfoPanel();
    appTooltips.releasePointerClickFocus(event, elements.infoToggle);
  });

  elements.infoClose.addEventListener("click", (event) => {
    shellControls.hideInfoPanel({
      restoreFocus: !appTooltips.isPointerClick(event),
    });
  });

  elements.infoOverlay.addEventListener("click", (event) => {
    if (event.target === elements.infoOverlay) {
      shellControls.hideInfoPanel({
        restoreFocus: !appTooltips.isPointerClick(event),
      });
    }
  });

  document.addEventListener("pointerover", (event) => {
    const target = appTooltips.targetFromEvent(event);
    if (!target || appTooltips.isActiveTarget(target)) {
      return;
    }
    if (appTooltips.isSuppressed()) {
      return;
    }
    if (
      event.relatedTarget instanceof Node &&
      target.contains(event.relatedTarget)
    ) {
      return;
    }

    appTooltips.schedule(target);
  });

  document.addEventListener("pointerout", (event) => {
    const target = appTooltips.targetFromEvent(event);
    if (!target) {
      return;
    }
    if (
      event.relatedTarget instanceof Node &&
      target.contains(event.relatedTarget)
    ) {
      return;
    }

    appTooltips.hide();
  });

  document.addEventListener("focusin", (event) => {
    const target = appTooltips.targetFromEvent(event);
    if (target) {
      if (appTooltips.isSuppressed()) {
        return;
      }

      appTooltips.schedule(target);
    }
  });

  document.addEventListener("focusout", (event) => {
    const target = appTooltips.targetFromEvent(event);
    if (target) {
      appTooltips.hide();
    }
  });

  elements.earlyResetButton.addEventListener(
    "click",
    earlyReset.handleButtonClick,
  );

  document.addEventListener("click", (event) => {
    earlyReset.hideIfOutside(event);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (shellControls.isInfoPanelOpen()) {
        shellControls.hideInfoPanel();
        event.preventDefault();
        return;
      }

      if (paceView.activePreviewKey) {
        paceView.restorePacePreview();
        event.preventDefault();
        return;
      }

      earlyReset.hide();
      appTooltips.hide();
      return;
    }

    shellControls.trapInfoPanelFocus(event);

    if (shellControls.isInfoPanelOpen()) {
      return;
    }

    if (
      event.key.toLowerCase() !== "t" ||
      shellControls.hasSingleKeyShortcutBlocker(event)
    ) {
      return;
    }

    if (toggleUsageWindow()) {
      event.preventDefault();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      EXTENSION_STORAGE.isLocalArea(areaName) &&
      EXTENSION_STORAGE.hasAnyChange(changes, [
        CodexUsageHistory.HISTORY_STORAGE_KEY,
        CodexUsageHistory.REFRESH_STATUS_STORAGE_KEY,
        WINDOW_STORAGE_KEY,
        DEVELOPER_OPTIONS_STORAGE_KEY,
      ])
    ) {
      loadDashboard().catch(() => {
        const historyChange = changes[CodexUsageHistory.HISTORY_STORAGE_KEY];
        if (historyChange) {
          currentHistory = CodexUsageHistory.normalizeHistory(
            historyChange.newValue,
          );
          currentRefreshStatus = null;
          renderHistory(currentHistory, currentRefreshStatus);
        } else {
          renderHistoryLoadFailure();
        }
      });
    }
  });

  window.addEventListener("resize", () => appTooltips.hide());
  window.addEventListener("scroll", () => appTooltips.hide(), true);
  window.addEventListener("pagehide", () => {
    if (paceView.activePreviewKey) {
      dashboardStatus.restoreToolbarPreviewBadge();
    }
  });
  window.setInterval(() => {
    refreshDashboardTimeSensitiveViews().catch(renderHistoryLoadFailure);
  }, DASHBOARD_STATUS_REFRESH_INTERVAL_MS);

  loadDashboard().catch(renderHistoryLoadFailure);
  paceView.renderStateRail();
})();
