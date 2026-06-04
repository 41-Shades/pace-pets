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
  const PREVIEW_CONTROL = globalThis.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace Pets preview controls must load before dashboard.js.",
    );
  }
  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  if (!DEVELOPER_OPTIONS) {
    throw new Error(
      "Pace Pets developer options must load before dashboard.js.",
    );
  }
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error("Codex theme assets must load before dashboard.js.");
  }
  const PERFECT_ZERO_SPACE = globalThis.PacePetsPerfectZeroSpace;
  if (!PERFECT_ZERO_SPACE) {
    throw new Error(
      "Pace Pets perfect-zero space scene must load before dashboard.js.",
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

  const DEFAULT_WINDOW_KEY = USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
  const WINDOW_STORAGE_KEY = USAGE_WINDOWS.WINDOW_STORAGE_KEY;
  const DEVELOPER_OPTIONS_STORAGE_KEY = DEVELOPER_OPTIONS.STORAGE_KEY;
  const THEME_STORAGE_KEY = "codex-usage-theme";
  const USE_PLAYFUL_PACE_ICONS = true;
  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const SINGULARITY_RESET_COUNTDOWN_TEXT = "0d 0h 0m";
  const INFO_PANEL_FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const STATUS_TEXT = {
    live: "Live",
    waiting: "Waiting",
    waitingForReading: "Waiting for reading",
    refreshNeeded: "Refresh needed",
    checking: "Checking",
    signInNotFound: "ChatGPT sign-in not found",
    checkFailed: "Check failed",
  };
  const SIGN_IN_NOT_FOUND_COPY = "Open ChatGPT to resume checks.";
  const SIGN_IN_NOT_FOUND_DETAIL =
    "Latest check failed because ChatGPT sign-in was not found.";
  const COLLECTION_STATUS_LABELS = Object.freeze({
    [STATUS_TEXT.checkFailed]: "Check failed",
    [STATUS_TEXT.checking]: "Checking...",
    [STATUS_TEXT.refreshNeeded]: "Refresh needed",
    [STATUS_TEXT.signInNotFound]: "Sign-in needed",
    [STATUS_TEXT.waiting]: "Waiting",
  });
  const MANUAL_REFRESH_DEFAULT_LABEL = "Check ChatGPT usage now";
  const MANUAL_REFRESH_CHECKING_LABEL = "Checking usage...";
  const MANUAL_REFRESH_COOLDOWN_PREFIX = "Check again in";
  const MANUAL_REFRESH_FAILURE_VISIBLE_MS = 1800;
  const WINDOW_SPECS = USAGE_WINDOWS.WINDOW_SPECS;
  const PACE_STATES = PacePetsLogic.PACE_STATES;
  const PACE_CLASSES = PacePetsLogic.PACE_CLASS_NAMES;
  const PACE_LEVEL_LEGEND_STATE_KEYS = Object.freeze([
    PACE_STATES.wellAhead.key,
    PACE_STATES.strongAhead.key,
    PACE_STATES.ahead.key,
    PACE_STATES.on.key,
    PACE_STATES.behind.key,
    PACE_STATES.wellBehind.key,
    PACE_STATES.criticalBehind.key,
  ]);
  const PACE_PERFECT_LEGEND_STATE_KEYS = Object.freeze([
    PACE_STATES.sync.key,
    PACE_STATES.perfectZero.key,
    "singularity",
  ]);
  const PACE_ICON_EFFECTS_BY_STATE = Object.freeze({
    [PACE_STATES.wellAhead.key]: "sprint-smoke",
  });
  const SINGULARITY_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="core" cx="50%" cy="45%" r="62%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="62%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#000000"/>
        </radialGradient>
        <linearGradient id="ring" x1="7" y1="28" x2="57" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#67e8f9"/>
          <stop offset="48%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-45%" width="160%" height="190%">
          <feGaussianBlur stdDeviation="2.1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="48" cy="15" r="1.8" fill="#fbbf24"/>
      <circle cx="15" cy="21" r="1.5" fill="#67e8f9"/>
      <circle cx="48.5" cy="49" r="1.2" fill="#f8fafc"/>
      <ellipse cx="32" cy="32" rx="25" ry="9.5" fill="none" stroke="url(#ring)" stroke-width="5.5" stroke-linecap="round" filter="url(#glow)" transform="rotate(-18 32 32)"/>
      <circle cx="32" cy="32" r="13.5" fill="url(#core)" stroke="#f8fafc" stroke-opacity="0.88" stroke-width="2.6"/>
      <path d="M13.2 35.8c8.6 8 28.4 9.2 39.1.1" fill="none" stroke="#67e8f9" stroke-width="3.6" stroke-linecap="round" opacity="0.92" transform="rotate(-18 32 32)"/>
    </svg>`,
  )}`;
  const DASHBOARD_RAIL_STATES = Object.freeze({
    singularity: Object.freeze({
      key: "singularity",
      className: "pace-singularity",
      title: "Singularity",
      copy: "It all ends in nothingness. Maybe.",
      ratioLabel: "Time = Usage = Resets In = 0",
      previewRatioLabel: "The black hole of zero",
      badgeColor: "#000000",
      favicon: Object.freeze({
        bg: "#111827",
        color: "#f8fafc",
        iconParts: Object.freeze([
          Object.freeze({
            tag: "ellipse",
            attrs: Object.freeze({
              cx: "12",
              cy: "12",
              rx: "9.3",
              ry: "3.7",
              stroke: "#67e8f9",
              "stroke-width": "2",
              transform: "rotate(-18 12 12)",
            }),
          }),
          Object.freeze({
            tag: "circle",
            attrs: Object.freeze({
              fill: "#000000",
              cx: "12",
              cy: "12",
              r: "5",
              stroke: "#f8fafc",
              "stroke-width": "1.35",
            }),
          }),
          Object.freeze({
            tag: "circle",
            attrs: Object.freeze({
              cx: "18.8",
              cy: "5.7",
              fill: "#fbbf24",
              r: "1",
              stroke: "none",
            }),
          }),
        ]),
      }),
      iconParts: Object.freeze([
        Object.freeze({
          tag: "ellipse",
          attrs: Object.freeze({
            cx: "12",
            cy: "12",
            rx: "9.5",
            ry: "3.8",
            stroke: "#67e8f9",
            "stroke-width": "2",
            transform: "rotate(-18 12 12)",
          }),
        }),
        Object.freeze({
          tag: "circle",
          attrs: Object.freeze({
            cx: "12",
            cy: "12",
            r: "5.4",
            fill: "#000000",
            stroke: "#f8fafc",
            "stroke-width": "1.35",
          }),
        }),
        Object.freeze({
          tag: "circle",
          attrs: Object.freeze({
            cx: "18.8",
            cy: "5.7",
            fill: "#fbbf24",
            r: "1.1",
            stroke: "none",
          }),
        }),
      ]),
      playfulImage: SINGULARITY_ICON_DATA_URL,
    }),
  });
  const DASHBOARD_RAIL_STATES_BY_CLASS = Object.freeze(
    Object.fromEntries(
      Object.values(DASHBOARD_RAIL_STATES).map((state) => [
        state.className,
        state,
      ]),
    ),
  );
  const DASHBOARD_RAIL_PACE_CLASSES = Object.freeze(
    Object.values(DASHBOARD_RAIL_STATES).map((state) => state.className),
  );
  const MUTED_PACE_CLASS = PACE_STATES.muted.className;

  const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
  const colorSchemeMedia = window.matchMedia(COLOR_SCHEME_QUERY);
  const PACE_STATE_PREVIEW_DURATION_MS =
    PREVIEW_CONTROL.PACE_STATE_PREVIEW_DURATION_MS;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;
  const DASHBOARD_STATUS_REFRESH_INTERVAL_MS = 60 * 1000;
  const THEME_VALUES = new Set(["light", "dark"]);

  let currentHistory = null;
  let currentRefreshStatus = null;
  let currentForcedPaceStateKey = null;
  let selectedWindowKey = DEFAULT_WINDOW_KEY;
  let explicitTheme = storedThemePreference();
  let infoPanelReturnFocus = null;
  applyResolvedTheme();

  const manifest = chrome.runtime.getManifest();
  document.title = PRODUCT_METADATA.NAME;
  elements.usageTitle.textContent = PRODUCT_METADATA.NAME;
  elements.usageDescription.textContent =
    PRODUCT_METADATA.DASHBOARD_DESCRIPTION;
  elements.collectorVersion.textContent = `v${manifest.version}`;
  let lastCheckedText =
    elements.lastCollectedValue.textContent.trim() || "waiting";
  let collectionStatusText = STATUS_TEXT.live;
  let collectionStatusMode = "ok";
  let collectionStatusTitle = COLLECTION_STATUS_TITLE;
  let collectionStatusDetail = "";
  let manualRefreshAvailable = false;
  let manualRefreshInFlight = false;
  let manualRefreshCooldownUntilMs = 0;
  let manualRefreshCooldownTimer = null;
  let manualRefreshFeedback = null;
  let manualRefreshFeedbackTimer = null;
  let activePacePreviewKey = null;
  let pacePreviewRestoreSnapshot = null;
  let pacePreviewRestoreTimer = null;
  let perfectZeroPageBackgroundScene = null;

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

  function storedThemePreference() {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_VALUES.has(value) ? value : null;
    } catch {
      return null;
    }
  }

  function storeThemePreference(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Local storage can be unavailable in strict browser contexts.
    }
  }

  function systemTheme() {
    return colorSchemeMedia.matches ? "dark" : "light";
  }

  function resolvedTheme() {
    return explicitTheme || systemTheme();
  }

  function oppositeTheme(theme) {
    return theme === "dark" ? "light" : "dark";
  }

  function updateThemeToggle(theme) {
    if (!elements.themeToggle) {
      return;
    }

    const nextTheme = oppositeTheme(theme);
    const label = `Switch to ${nextTheme} theme`;
    elements.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    elements.themeToggle.setAttribute("aria-label", label);
    appTooltips.setText(elements.themeToggle, label);
  }

  function applyResolvedTheme({ refresh = false } = {}) {
    const theme = resolvedTheme();
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(theme);

    if (refresh) {
      refreshThemeSensitiveViews();
    }
  }

  function storeWindowKey(windowKey) {
    EXTENSION_STORAGE.setLocal({ [WINDOW_STORAGE_KEY]: windowKey }).catch(
      (error) => {
        console.warn("Could not store usage window preference:", error.message);
      },
    );
  }

  function isInputLike(element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      (element instanceof HTMLElement && element.isContentEditable)
    );
  }

  function hasSingleKeyShortcutBlocker(event) {
    return (
      event.defaultPrevented ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isInputLike(document.activeElement)
    );
  }

  function isInfoPanelOpen() {
    return Boolean(elements.infoOverlay && !elements.infoOverlay.hidden);
  }

  function infoPanelFocusableElements() {
    if (!elements.infoPanel) {
      return [];
    }

    return [
      ...elements.infoPanel.querySelectorAll(INFO_PANEL_FOCUSABLE_SELECTOR),
    ].filter((element) => element instanceof HTMLElement);
  }

  function showInfoPanel() {
    if (!elements.infoOverlay || isInfoPanelOpen()) {
      return;
    }

    infoPanelReturnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    appTooltips.hide();
    earlyReset.hide();
    elements.infoOverlay.hidden = false;
    elements.infoToggle?.setAttribute("aria-expanded", "true");

    window.requestAnimationFrame(() => {
      const [firstFocusable] = infoPanelFocusableElements();
      firstFocusable?.focus();
    });
  }

  function hideInfoPanel({ restoreFocus = true } = {}) {
    if (!elements.infoOverlay || !isInfoPanelOpen()) {
      return;
    }

    elements.infoOverlay.hidden = true;
    elements.infoToggle?.setAttribute("aria-expanded", "false");
    appTooltips.suppressTemporarily();
    appTooltips.hide();

    if (restoreFocus && infoPanelReturnFocus?.isConnected) {
      infoPanelReturnFocus.focus();
    } else if (
      document.activeElement instanceof HTMLElement &&
      elements.infoOverlay.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
    infoPanelReturnFocus = null;
  }

  function toggleInfoPanel() {
    if (isInfoPanelOpen()) {
      hideInfoPanel();
      return;
    }

    showInfoPanel();
  }

  function trapInfoPanelFocus(event) {
    if (!isInfoPanelOpen() || event.key !== "Tab") {
      return;
    }

    const focusableElements = infoPanelFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      elements.infoPanel?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function dateMs(value) {
    return PacePetsLogic.dateMs(value);
  }

  function formatClockTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "waiting";
    }
    return new Intl.DateTimeFormat(undefined, {
      timeStyle: "short",
    }).format(date);
  }

  function formatDateParts(value, format = "dateTime") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { date: "Unknown", time: "" };
    }

    if (format === "time") {
      return {
        date: new Intl.DateTimeFormat(undefined, {
          timeStyle: "short",
        }).format(date),
        time: "",
      };
    }

    return {
      date: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date),
      time: new Intl.DateTimeFormat(undefined, {
        timeStyle: "short",
      }).format(date),
    };
  }

  function windowStartMs(windowData) {
    return PacePetsLogic.windowStartMs(windowData);
  }

  function setDatePart(dateElement, timeElement, value, format) {
    const parts = formatDateParts(value, format);
    dateElement.textContent = parts.date;
    timeElement.textContent = parts.time;
  }

  function setUnavailableDatePart(dateElement, timeElement) {
    dateElement.textContent = "--";
    timeElement.textContent = "";
  }

  function setDatePartOrUnavailable(dateElement, timeElement, value, format) {
    if (value === null) {
      setUnavailableDatePart(dateElement, timeElement);
      return;
    }

    setDatePart(dateElement, timeElement, value, format);
  }

  function setResetParts(windowData, spec = WINDOW_SPECS.weekly) {
    const startMs = windowStartMs(windowData);
    const resetMs = dateMs(windowData?.resetsAt);
    const valueFormat = spec.resetValueFormat;

    setDatePartOrUnavailable(
      elements.priorResetDate,
      elements.priorResetTime,
      startMs,
      valueFormat,
    );
    setDatePartOrUnavailable(
      elements.scheduledResetDate,
      elements.scheduledResetTime,
      resetMs,
      valueFormat,
    );

    if (startMs === null || resetMs === null || startMs >= resetMs) {
      elements.resetProgressFill.style.setProperty("--reset-progress", "0%");
      return;
    }

    const elapsedPercent =
      PacePetsLogic.elapsedWindowPercentAt(windowData, Date.now()) || 0;
    elements.resetProgressFill.style.setProperty(
      "--reset-progress",
      `${elapsedPercent}%`,
    );
  }

  function resetCountdown(value) {
    const resetMs = dateMs(value);
    if (resetMs === null) {
      return "--";
    }

    const remainingMs = resetMs - Date.now();
    if (remainingMs <= 0) {
      return "Window ended";
    }

    const totalMinutes = Math.floor(remainingMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const time = `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return days > 0 ? `${days}d ${time}` : time;
  }

  function timeRemainingPercent(windowData) {
    return PacePetsLogic.timeRemainingPercent(windowData);
  }

  function isResetWindowStale(windowData, atMs = Date.now()) {
    return PacePetsLogic.isResetWindowStale(windowData, atMs);
  }

  function paceRatioForValues(remainingPercent, timePercent) {
    return PacePetsLogic.paceRatioForValues(remainingPercent, timePercent);
  }

  function isPerfectZeroPercentPair(remainingPercent, timePercent) {
    return PacePetsLogic.isPerfectZeroPercentPair(
      remainingPercent,
      timePercent,
    );
  }

  function controlledPacePresentationForValues(
    remainingPercent,
    timePercent,
    options,
  ) {
    return PacePetsLogic.controlledPacePresentationForValues(
      remainingPercent,
      timePercent,
      options,
    );
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
    const timePercent = timeRemainingPercent(windowData);
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

  function renderPaceAltRatio(altRatio) {
    elements.paceAltRatio.replaceChildren();
    if (!altRatio) {
      elements.paceAltRatio.hidden = true;
      return;
    }

    if (typeof altRatio === "string") {
      elements.paceAltRatio.textContent = altRatio;
      elements.paceAltRatio.hidden = !altRatio;
      return;
    }

    const label = document.createElement("span");
    label.className = "pace-alt-ratio-label";
    label.textContent = altRatio.label;

    const value = document.createElement("span");
    value.className = "pace-alt-ratio-value";
    if (altRatio.className) {
      value.classList.add("is-tinted");
      value.classList.add(altRatio.className);
    }
    value.textContent = altRatio.value;

    elements.paceAltRatio.replaceChildren(label, " ", value);
    elements.paceAltRatio.hidden = false;
  }

  function paceAltRatioSnapshot() {
    if (elements.paceAltRatio.hidden) {
      return null;
    }

    const label = elements.paceAltRatio.querySelector(".pace-alt-ratio-label");
    const value = elements.paceAltRatio.querySelector(".pace-alt-ratio-value");
    if (!label || !value) {
      return elements.paceAltRatio.textContent;
    }

    return {
      className: PACE_CLASSES.find((className) =>
        value.classList.contains(className),
      ),
      label: label.textContent,
      value: value.textContent,
    };
  }

  function statusTooltipText(title, text, detail = "") {
    return detail ? `${title}: ${text}. ${detail}` : `${title}: ${text}`;
  }

  function collectionStatusLabelText(text) {
    return COLLECTION_STATUS_LABELS[text] || "";
  }

  function setCollectionStatusLabel(text, mode) {
    const label = collectionStatusLabelText(text);
    elements.collectionStatusLabel.textContent = label;
    elements.collectionStatusLabel.hidden = !label;
    elements.collectionStatusLabel.classList.toggle("stale", mode === "stale");
    elements.collectionStatusLabel.classList.toggle(
      "warning",
      mode === "warning",
    );
    elements.collectionStatusLabel.classList.toggle("error", mode === "error");
    elements.collectionStatusLabel.classList.toggle(
      "offline",
      mode === "offline",
    );
  }

  function visibleCollectionStatus() {
    if (manualRefreshInFlight) {
      return {
        text: STATUS_TEXT.checking,
        mode: "warning",
        title: COLLECTION_STATUS_TITLE,
        detail: "Checking ChatGPT usage now.",
      };
    }

    if (manualRefreshFeedback) {
      return manualRefreshFeedback;
    }

    return {
      text: collectionStatusText,
      mode: collectionStatusMode,
      title: collectionStatusTitle,
      detail: collectionStatusDetail,
    };
  }

  function renderCollectionStatus() {
    const state = visibleCollectionStatus();
    elements.collectionPulse.classList.toggle("live", state.mode === "live");
    elements.collectionPulse.classList.toggle("stale", state.mode === "stale");
    elements.collectionPulse.classList.toggle(
      "offline",
      state.mode === "offline",
    );
    elements.collectionPulse.classList.toggle("error", state.mode === "error");
    elements.collectionPulse.classList.toggle(
      "warning",
      state.mode === "warning",
    );
    setCollectionStatusLabel(state.text, state.mode);

    const statusText = state.detail
      ? `${state.text}. ${state.detail}`
      : state.text;
    const title = state.title || COLLECTION_STATUS_TITLE;
    const label = `Checked: ${lastCheckedText}. Status: ${statusText}`;
    appTooltips.setText(
      elements.collectionPulse,
      statusTooltipText(title, state.text, state.detail),
    );
    elements.lastCollected.setAttribute("aria-label", label);
    appTooltips.setText(elements.lastCollected, `Status: ${statusText}`);
    updateManualRefreshButton();
  }

  function statusCodeText(refreshStatus) {
    return refreshStatus?.statusCode ? `HTTP ${refreshStatus.statusCode}` : "";
  }

  function refreshAttemptText(refreshStatus) {
    return refreshStatus?.refreshedAt
      ? formatClockTime(refreshStatus.refreshedAt)
      : "";
  }

  function refreshFailureDetail(refreshStatus, latest = null) {
    const message = isSignInNotFoundStatus(refreshStatus)
      ? SIGN_IN_NOT_FOUND_DETAIL
      : String(refreshStatus?.message || "Latest usage check failed.").trim();
    const statusCode = statusCodeText(refreshStatus);
    const attemptText = refreshAttemptText(refreshStatus);
    const latestText = latest?.collectedAt
      ? formatClockTime(latest.collectedAt)
      : "";
    const parts = [
      message,
      statusCode,
      attemptText ? `attempt ${attemptText}` : "",
      latestText ? `stored ${latestText}` : "",
    ].filter(Boolean);
    return parts.join("; ");
  }

  function setStatus(
    text,
    mode = "ok",
    title = COLLECTION_STATUS_TITLE,
    detail = "",
    { manualRefresh = false } = {},
  ) {
    collectionStatusText = text;
    collectionStatusMode = mode;
    collectionStatusTitle = title;
    collectionStatusDetail = detail;
    manualRefreshAvailable = manualRefresh;
    renderCollectionStatus();
  }

  function manualRefreshCooldownRemainingMs() {
    return Math.max(0, manualRefreshCooldownUntilMs - Date.now());
  }

  function clearManualRefreshCooldownTimer() {
    window.clearTimeout(manualRefreshCooldownTimer);
    manualRefreshCooldownTimer = null;
  }

  function clearManualRefreshFeedback() {
    window.clearTimeout(manualRefreshFeedbackTimer);
    manualRefreshFeedbackTimer = null;
    manualRefreshFeedback = null;
  }

  function latestCurrentSample() {
    return currentHistory
      ? CodexUsageHistory.latestSample(currentHistory)
      : null;
  }

  function manualRefreshFailureDetail(refreshStatus, error = null) {
    if (refreshStatus) {
      return refreshFailureDetail(refreshStatus, latestCurrentSample());
    }

    return error?.message || "Could not request a usage check.";
  }

  function showManualRefreshFailure(refreshStatus, error = null) {
    clearManualRefreshFeedback();
    manualRefreshFeedback = {
      text: STATUS_TEXT.checkFailed,
      mode: "error",
      title: COLLECTION_STATUS_TITLE,
      detail: manualRefreshFailureDetail(refreshStatus, error),
    };
    manualRefreshFeedbackTimer = window.setTimeout(() => {
      manualRefreshFeedback = null;
      manualRefreshFeedbackTimer = null;
      renderCollectionStatus();
    }, MANUAL_REFRESH_FAILURE_VISIBLE_MS);
    renderCollectionStatus();
  }

  function scheduleManualRefreshCooldownTimer() {
    clearManualRefreshCooldownTimer();
    const remainingMs = manualRefreshCooldownRemainingMs();
    if (remainingMs <= 0) {
      return;
    }

    manualRefreshCooldownTimer = window.setTimeout(
      () => {
        updateManualRefreshButton();
        scheduleManualRefreshCooldownTimer();
      },
      Math.min(1000, remainingMs),
    );
  }

  function manualRefreshTooltipText() {
    if (manualRefreshInFlight) {
      return MANUAL_REFRESH_CHECKING_LABEL;
    }

    const remainingMs = manualRefreshCooldownRemainingMs();
    if (remainingMs > 0) {
      return `${MANUAL_REFRESH_COOLDOWN_PREFIX} ${Math.ceil(
        remainingMs / 1000,
      )}s`;
    }

    return MANUAL_REFRESH_DEFAULT_LABEL;
  }

  function updateManualRefreshButton() {
    const button = elements.manualRefreshButton;
    if (!button) {
      return;
    }

    const remainingMs = manualRefreshCooldownRemainingMs();
    const disabled = manualRefreshInFlight || remainingMs > 0;
    button.hidden = !manualRefreshAvailable;
    button.setAttribute("aria-disabled", String(disabled));
    button.classList.toggle("is-checking", manualRefreshInFlight);
    button.setAttribute("aria-label", manualRefreshTooltipText());
    appTooltips.setText(button, manualRefreshTooltipText());

    if (manualRefreshAvailable && remainingMs > 0) {
      scheduleManualRefreshCooldownTimer();
    } else {
      clearManualRefreshCooldownTimer();
    }
  }

  function sendRuntimeMessage(message) {
    return EXTENSION_STORAGE.callbackWithLastError((done) => {
      chrome.runtime.sendMessage(message, done);
    });
  }

  function isTransientRuntimeMessageError(error) {
    return /(?:message port closed|receiving end does not exist|extension context invalidated)/i.test(
      error?.message || "",
    );
  }

  function warnOptionalPreviewMessageFailure(label, error) {
    if (isTransientRuntimeMessageError(error)) {
      return;
    }

    console.warn(label, error.message);
  }

  function sendManualRefreshMessage() {
    return sendRuntimeMessage({
      type: REFRESH_CONTROL.REFRESH_NOW_MESSAGE_TYPE,
    });
  }

  function updateToolbarPreviewBadge(stateKey) {
    const message = PREVIEW_CONTROL.previewBadgeMessage(stateKey);
    if (!message) {
      return;
    }

    sendRuntimeMessage(message).catch((error) => {
      warnOptionalPreviewMessageFailure(
        "Codex usage badge preview failed:",
        error,
      );
    });
  }

  function restoreToolbarPreviewBadge() {
    sendRuntimeMessage(PREVIEW_CONTROL.restoreBadgeMessage()).catch((error) => {
      warnOptionalPreviewMessageFailure(
        "Codex usage badge preview restore failed:",
        error,
      );
    });
  }

  function canRunManualRefresh() {
    return (
      manualRefreshAvailable &&
      !manualRefreshInFlight &&
      manualRefreshCooldownRemainingMs() <= 0
    );
  }

  function startManualRefreshAttempt() {
    manualRefreshInFlight = true;
    manualRefreshCooldownUntilMs =
      Date.now() + REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS;
    clearManualRefreshFeedback();
    renderCollectionStatus();
  }

  function finishManualRefreshAttempt() {
    manualRefreshInFlight = false;
    renderCollectionStatus();
  }

  function applyManualRefreshCooldown(response) {
    if (!Number.isFinite(response?.cooldownRemainingMs)) {
      return;
    }

    manualRefreshCooldownUntilMs =
      Date.now() + Math.max(0, response.cooldownRemainingMs);
  }

  function manualRefreshResponseFailed(response) {
    return (
      response?.refreshStatus?.ok === false ||
      (response?.ok === false &&
        !Number.isFinite(response?.cooldownRemainingMs))
    );
  }

  async function applyManualRefreshResponse(response) {
    const refreshFailed = manualRefreshResponseFailed(response);
    applyManualRefreshCooldown(response);

    if (response?.refreshStatus) {
      currentRefreshStatus = response.refreshStatus;
    }

    await loadDashboard({ refreshWindowPreference: false });

    if (refreshFailed) {
      showManualRefreshFailure(response?.refreshStatus);
      return;
    }

    clearManualRefreshFeedback();
  }

  function handleManualRefreshError(error) {
    setStatus(
      STATUS_TEXT.checkFailed,
      "error",
      COLLECTION_STATUS_TITLE,
      error?.message || "Could not request a usage check.",
      { manualRefresh: true },
    );
    showManualRefreshFailure(null, error);
  }

  async function runManualRefresh() {
    if (!canRunManualRefresh()) {
      return;
    }

    startManualRefreshAttempt();

    try {
      const response = await sendManualRefreshMessage();
      await applyManualRefreshResponse(response);
    } catch (error) {
      handleManualRefreshError(error);
    } finally {
      finishManualRefreshAttempt();
    }
  }

  function isSignInNotFoundStatus(refreshStatus) {
    return refreshStatus?.ok === false && refreshStatus.authFailure === true;
  }

  function isFailedRefreshStatus(refreshStatus) {
    return (
      refreshStatus?.ok === false &&
      Boolean(refreshStatus.refreshedAt) &&
      !isSignInNotFoundStatus(refreshStatus)
    );
  }

  function isRecentRefreshStatus(refreshStatus) {
    const refreshedMs = dateMs(refreshStatus?.refreshedAt);
    return (
      refreshedMs !== null &&
      Date.now() - refreshedMs <= COLLECTION_STATUS_STALE_AFTER_MS
    );
  }

  function setPercent(element, bar, value) {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      element.textContent = "--%";
      bar.style.width = "0%";
      return;
    }

    const bounded = Math.max(0, Math.min(100, value));
    element.textContent = `${Math.round(bounded)}%`;
    bar.style.width = `${bounded}%`;
  }

  function setPreviewPercentPair(percentPair) {
    if (!percentPair) {
      setPercent(elements.usagePercent, elements.usageBar, null);
      setPercent(elements.timePercent, elements.timeBar, null);
      return;
    }

    setPercent(
      elements.usagePercent,
      elements.usageBar,
      percentPair.remainingPercent,
    );
    setPercent(elements.timePercent, elements.timeBar, percentPair.timePercent);
  }

  function previewPaceRatioForState(stateKey) {
    if (stateKey === DASHBOARD_RAIL_STATES.singularity.key) {
      return 0;
    }

    return PREVIEW_CONTROL.previewPaceRatioForState(stateKey);
  }

  function previewStateKeyEnabled(stateKey) {
    if (stateKey === DASHBOARD_RAIL_STATES.singularity.key) {
      return true;
    }

    return PREVIEW_CONTROL.previewStateKeyEnabled(stateKey);
  }

  function setPaceLevel(
    level,
    { updateTabIcon = true, updateStateRailActive = true } = {},
  ) {
    const state = paceStateForClassName(level);
    elements.paceCard.classList.remove(
      ...PACE_CLASSES,
      ...DASHBOARD_RAIL_PACE_CLASSES,
    );
    elements.paceCard.classList.add(level);
    const pageBackgroundActive = setPerfectZeroPageBackgroundActive(
      state.key === PACE_STATES.perfectZero.key,
    );
    renderPaceIcon(elements.paceIcon, level, {
      usePerfectZeroPageAperture: pageBackgroundActive,
    });
    if (updateStateRailActive) {
      updateStateRailActiveSelection(state.key);
    }
    if (updateTabIcon) {
      updateFavicon(level);
    }
  }

  function paceStateForClassName(className) {
    return (
      DASHBOARD_RAIL_STATES_BY_CLASS[className] ||
      PacePetsLogic.paceStateForClassName(className)
    );
  }

  function paceStateForKey(stateKey) {
    return DASHBOARD_RAIL_STATES[stateKey] || PACE_STATES[stateKey] || null;
  }

  function forcedPaceState() {
    return currentForcedPaceStateKey
      ? paceStateForKey(currentForcedPaceStateKey)
      : null;
  }

  function clearActivePacePreviewState() {
    activePacePreviewKey = null;
    pacePreviewRestoreSnapshot = null;
    clearPacePreviewRestoreTimer();
    elements.paceCard.classList.remove("is-previewing");
    updateStateRailPreviewSelection(null);
  }

  function stopPerfectZeroPageBackgroundScene() {
    perfectZeroPageBackgroundScene?.stop();
    perfectZeroPageBackgroundScene = null;
    if (elements.perfectZeroPageBackground) {
      elements.perfectZeroPageBackground.hidden = true;
    }
    document.body.classList.remove("has-perfect-zero-page-background");
  }

  function perfectZeroPageFeaturedPlanets() {
    if (!elements.paceIcon || !elements.perfectZeroPageBackground) {
      return [];
    }

    const iconRect = elements.paceIcon.getBoundingClientRect();
    const canvasRect =
      elements.perfectZeroPageBackground.getBoundingClientRect();
    if (
      iconRect.width <= 0 ||
      iconRect.height <= 0 ||
      canvasRect.width <= 0 ||
      canvasRect.height <= 0
    ) {
      return [];
    }

    return [
      {
        minSize: 15,
        originX: iconRect.left + iconRect.width / 2 - canvasRect.left,
        originY: iconRect.top + iconRect.height / 2 - canvasRect.top,
        type: "ringedPlanet",
      },
    ];
  }

  function setPerfectZeroPageBackgroundActive(active) {
    if (!elements.shell || !elements.perfectZeroPageBackground) {
      return false;
    }

    if (!active) {
      stopPerfectZeroPageBackgroundScene();
      return false;
    }

    if (perfectZeroPageBackgroundScene) {
      return true;
    }

    elements.perfectZeroPageBackground.hidden = false;
    document.body.classList.add("has-perfect-zero-page-background");
    const scene = PERFECT_ZERO_SPACE.create(
      elements.shell,
      elements.perfectZeroPageBackground,
      {
        profile: PERFECT_ZERO_SPACE.profiles.fullBleed,
        scene: {
          featuredPlanets: perfectZeroPageFeaturedPlanets(),
        },
      },
    );
    if (!scene) {
      stopPerfectZeroPageBackgroundScene();
      return false;
    }

    perfectZeroPageBackgroundScene = scene;
    return true;
  }

  function renderPaceIcon(
    container,
    level,
    { usePerfectZeroPageAperture = false } = {},
  ) {
    const state = paceStateForClassName(level);
    const src = state.playfulImage;
    const shouldRenderPerfectZeroPageAperture =
      container === elements.paceIcon &&
      state.key === PACE_STATES.perfectZero.key &&
      usePerfectZeroPageAperture;

    container.replaceChildren();
    container.classList.toggle(
      "is-perfect-zero-aperture",
      Boolean(shouldRenderPerfectZeroPageAperture),
    );

    if (shouldRenderPerfectZeroPageAperture) {
      container.classList.remove("is-playful");
      if (src) {
        const image = document.createElement("img");
        image.className = "perfect-zero-cameo";
        image.src = src;
        image.alt = "";
        image.decoding = "async";
        image.loading = "lazy";
        image.setAttribute("aria-hidden", "true");
        container.append(image);
      }
      return;
    }

    if (USE_PLAYFUL_PACE_ICONS && src) {
      container.classList.add("is-playful");
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      container.append(image);
      renderPaceIconEffect(container, state);
      return;
    }

    container.classList.remove("is-playful");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("role", "img");
    for (const part of state.iconParts) {
      const element = document.createElementNS(
        "http://www.w3.org/2000/svg",
        part.tag,
      );
      for (const [name, value] of Object.entries(part.attrs)) {
        element.setAttribute(name, value);
      }
      svg.append(element);
    }
    container.append(svg);
    renderPaceIconEffect(container, state);
  }

  function renderPaceIconEffect(container, state) {
    const effect = PACE_ICON_EFFECTS_BY_STATE[state.key];
    if (!effect) {
      return;
    }

    const layer = document.createElement("span");
    layer.className = `pace-icon-effect pace-icon-effect-${effect}`;
    layer.setAttribute("aria-hidden", "true");
    for (let puffIndex = 1; puffIndex <= 5; puffIndex += 1) {
      const puff = document.createElement("span");
      puff.className = `pace-smoke-puff pace-smoke-puff-${puffIndex}`;
      layer.append(puff);
    }
    container.append(layer);
  }

  function renderStateChip(stateKey) {
    const state = paceStateForKey(stateKey) || PACE_STATES.muted;
    const chip = document.createElement("button");
    chip.className = `state-chip ${state.className}`;
    chip.type = "button";
    chip.dataset.paceStateKey = state.key;
    if (state.key === PACE_STATES.sync.key) {
      chip.dataset.tooltip = "Displayed usage and time are perfectly matched.";
      chip.dataset.tooltipHint = "Click to preview";
    } else if (state.key === PACE_STATES.perfectZero.key) {
      chip.dataset.tooltip = "The window sticks a perfect landing at zero.";
      chip.dataset.tooltipHint = "Click to preview";
    } else if (state.key === DASHBOARD_RAIL_STATES.singularity.key) {
      chip.dataset.tooltip = "Preview mock Singularity status";
      chip.dataset.tooltipHint = "Click to preview";
    } else {
      chip.dataset.tooltip = `Preview mock ${state.title} status`;
    }
    chip.setAttribute("aria-controls", "pace-card");

    const icon = document.createElement("div");
    icon.className = "state-icon";
    icon.setAttribute("aria-hidden", "true");
    renderPaceIcon(icon, state.className);

    const copy = document.createElement("div");
    copy.className = "state-copy";
    const title = document.createElement("strong");
    title.textContent = state.title;

    const meta = document.createElement("span");
    meta.className = "state-meta";
    const ratio = document.createElement("span");
    ratio.className = "state-ratio";
    ratio.textContent = state.ratioLabel;
    meta.append(ratio);

    copy.append(title, meta);
    chip.append(icon, copy);
    return chip;
  }

  function renderStateColumn(className, titleText, stateKeys) {
    const column = document.createElement("div");
    column.className = `state-column ${className}`;
    const title = document.createElement("h2");
    title.className = "state-column-title";
    title.textContent = titleText;
    column.replaceChildren(title, ...stateKeys.map(renderStateChip));
    return column;
  }

  function renderStateRail() {
    if (!elements.paceStateStack) {
      return;
    }

    const levelStateKeys = PACE_LEVEL_LEGEND_STATE_KEYS.filter(
      previewStateKeyEnabled,
    );
    const perfectStateKeys = PACE_PERFECT_LEGEND_STATE_KEYS.filter(
      previewStateKeyEnabled,
    );
    const columns = [];
    if (levelStateKeys.length) {
      columns.push(
        renderStateColumn("state-column-levels", "Pace levels", levelStateKeys),
      );
    }
    if (perfectStateKeys.length) {
      columns.push(
        renderStateColumn(
          "state-column-perfects",
          "Perfect states",
          perfectStateKeys,
        ),
      );
    }

    elements.paceStateStack.hidden = !columns.length;
    elements.paceStateStack.replaceChildren(...columns);
  }

  function updateStateRailActiveSelection(activeKey) {
    if (!elements.paceStateStack) {
      return;
    }

    elements.paceStateStack
      .querySelectorAll(".state-chip[data-pace-state-key]")
      .forEach((chip) => {
        chip.classList.toggle(
          "is-active",
          chip.dataset.paceStateKey === activeKey,
        );
      });
  }

  function currentPaceLevel() {
    return (
      PACE_CLASSES.find((className) =>
        elements.paceCard.classList.contains(className),
      ) || MUTED_PACE_CLASS
    );
  }

  function faviconSnapshot() {
    if (!elements.favicon) {
      return null;
    }

    return {
      hadHref: elements.favicon.hasAttribute("href"),
      href: elements.favicon.getAttribute("href"),
    };
  }

  function restoreFaviconSnapshot(snapshot) {
    if (!elements.favicon || !snapshot) {
      return;
    }

    if (snapshot.hadHref) {
      elements.favicon.setAttribute("href", snapshot.href ?? "");
      return;
    }

    elements.favicon.removeAttribute("href");
  }

  function percentSummarySnapshot() {
    return {
      usageText: elements.usagePercent.textContent,
      usageBarWidth: elements.usageBar.style.width,
      timeText: elements.timePercent.textContent,
      timeBarWidth: elements.timeBar.style.width,
    };
  }

  function restorePercentSummarySnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    elements.usagePercent.textContent = snapshot.usageText;
    elements.usageBar.style.width = snapshot.usageBarWidth;
    elements.timePercent.textContent = snapshot.timeText;
    elements.timeBar.style.width = snapshot.timeBarWidth;
  }

  function resetCountdownSnapshot() {
    return {
      progress:
        elements.resetProgressFill.style.getPropertyValue("--reset-progress"),
      text: elements.resetsIn.textContent,
    };
  }

  function restoreResetCountdownSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    elements.resetsIn.textContent = snapshot.text;
    elements.resetProgressFill.style.setProperty(
      "--reset-progress",
      snapshot.progress,
    );
  }

  function applyStateResetCountdown(state) {
    if (state.key !== DASHBOARD_RAIL_STATES.singularity.key) {
      return;
    }

    elements.resetsIn.textContent = SINGULARITY_RESET_COUNTDOWN_TEXT;
    elements.resetProgressFill.style.setProperty("--reset-progress", "100%");
  }

  function paceCardSnapshot() {
    return {
      level: currentPaceLevel(),
      favicon: faviconSnapshot(),
      percentSummary: percentSummarySnapshot(),
      resetCountdown: resetCountdownSnapshot(),
      title: elements.paceTitle.textContent,
      copy: elements.paceCopy.textContent,
      statsHidden: elements.paceStats.hidden,
      ratioStatHidden: elements.paceRatioStat.hidden,
      ratioValue: elements.paceRatioValue.textContent,
      tabTitle: document.title,
      altRatio: paceAltRatioSnapshot(),
    };
  }

  function restorePaceCardSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    setPaceLevel(snapshot.level, { updateTabIcon: false });
    elements.paceTitle.textContent = snapshot.title;
    elements.paceCopy.textContent = snapshot.copy;
    elements.paceStats.hidden = snapshot.statsHidden;
    elements.paceRatioStat.hidden = snapshot.ratioStatHidden;
    elements.paceRatioValue.textContent = snapshot.ratioValue;
    renderPaceAltRatio(snapshot.altRatio);
    restoreFaviconSnapshot(snapshot.favicon);
    restorePercentSummarySnapshot(snapshot.percentSummary);
    restoreResetCountdownSnapshot(snapshot.resetCountdown);
    document.title = snapshot.tabTitle;
  }

  function clearPacePreviewRestoreTimer() {
    window.clearTimeout(pacePreviewRestoreTimer);
    pacePreviewRestoreTimer = null;
  }

  function updateStateRailPreviewSelection(activeKey) {
    if (!elements.paceStateStack) {
      return;
    }

    elements.paceStateStack.classList.toggle(
      "is-previewing-state",
      Boolean(activeKey),
    );
    elements.paceStateStack
      .querySelectorAll(".state-chip[data-pace-state-key]")
      .forEach((chip) => {
        chip.classList.toggle(
          "is-previewing",
          chip.dataset.paceStateKey === activeKey,
        );
      });
  }

  function restorePacePreview() {
    if (!activePacePreviewKey) {
      return;
    }

    const snapshot = pacePreviewRestoreSnapshot;
    activePacePreviewKey = null;
    pacePreviewRestoreSnapshot = null;
    clearPacePreviewRestoreTimer();
    restoreToolbarPreviewBadge();
    elements.paceCard.classList.remove("is-previewing");
    updateStateRailPreviewSelection(null);
    restoreFaviconSnapshot(snapshot?.favicon);
    restorePercentSummarySnapshot(snapshot?.percentSummary);
    restoreResetCountdownSnapshot(snapshot?.resetCountdown);

    if (currentHistory) {
      renderHistory(currentHistory, currentRefreshStatus, {
        refreshChart: false,
      });
      return;
    }

    restorePaceCardSnapshot(snapshot);
  }

  function schedulePacePreviewRestore() {
    clearPacePreviewRestoreTimer();
    pacePreviewRestoreTimer = window.setTimeout(
      restorePacePreview,
      PACE_STATE_PREVIEW_DURATION_MS,
    );
  }

  function renderPacePreviewState(state) {
    const previewPaceRatio = previewPaceRatioForState(state.key);
    if (previewPaceRatio === null) {
      return;
    }

    setPaceLevel(state.className, { updateStateRailActive: false });
    elements.paceCard.classList.add("is-previewing");
    elements.paceTitle.textContent = state.title;
    elements.paceCopy.textContent = state.copy;
    elements.paceStats.hidden = false;
    elements.paceRatioStat.hidden = false;
    elements.paceRatioValue.textContent =
      formatPaceRatioValue(previewPaceRatio);
    setPreviewPercentPair(PREVIEW_CONTROL.forcedPercentPairForState(state.key));
    applyStateResetCountdown(state);
    const previewRatioLabel = state.previewRatioLabel || state.ratioLabel;
    renderPaceAltRatio(previewRatioLabel);
    updateTabTitle(state.title, previewPaceRatio);
    updateStateRailPreviewSelection(state.key);
    updateToolbarPreviewBadge(state.key);
  }

  function showPacePreview(stateKey) {
    const state = paceStateForKey(stateKey);
    if (!state || !previewStateKeyEnabled(state.key)) {
      return;
    }

    if (!activePacePreviewKey) {
      pacePreviewRestoreSnapshot = paceCardSnapshot();
    }

    activePacePreviewKey = state.key;
    clearPacePreviewRestoreTimer();
    renderPacePreviewState(state);
  }

  function renderForcedPaceStateOverride() {
    const state = forcedPaceState();
    if (!state || !previewStateKeyEnabled(state.key)) {
      return false;
    }

    const previewPaceRatio = previewPaceRatioForState(state.key);
    if (previewPaceRatio === null) {
      return false;
    }

    clearActivePacePreviewState();
    setPaceLevel(state.className);
    elements.paceTitle.textContent = state.title;
    elements.paceCopy.textContent = state.copy;
    elements.paceStats.hidden = false;
    elements.paceRatioStat.hidden = false;
    elements.paceRatioValue.textContent =
      formatPaceRatioValue(previewPaceRatio);
    setPreviewPercentPair(PREVIEW_CONTROL.forcedPercentPairForState(state.key));
    applyStateResetCountdown(state);
    const previewRatioLabel = state.previewRatioLabel || state.ratioLabel;
    renderPaceAltRatio(previewRatioLabel);
    updateTabTitle(state.title, previewPaceRatio);
    return true;
  }

  function refreshForcedOverrideOrActivePacePreview() {
    if (renderForcedPaceStateOverride()) {
      return;
    }

    refreshActivePacePreview();
  }

  function refreshActivePacePreview() {
    const state = paceStateForKey(activePacePreviewKey);
    if (!state || !previewStateKeyEnabled(state.key)) {
      restorePacePreview();
      return;
    }

    pacePreviewRestoreSnapshot = paceCardSnapshot();
    renderPacePreviewState(state);
  }

  function stateChipFromEvent(event) {
    const target = event.target instanceof Element ? event.target : null;
    const chip = target?.closest(".state-chip[data-pace-state-key]");
    return chip && elements.paceStateStack.contains(chip) ? chip : null;
  }

  function svgAttributes(attrs) {
    return Object.entries(attrs)
      .map(([name, value]) => `${name}="${String(value)}"`)
      .join(" ");
  }

  function svgMarkupForIconParts(iconParts) {
    return iconParts
      .map((part) => `<${part.tag} ${svgAttributes(part.attrs)} />`)
      .join("");
  }

  function updateFavicon(level) {
    if (!elements.favicon) {
      return;
    }

    const state = paceStateForClassName(level);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="${state.favicon.bg}"/>
    <g transform="translate(8 8) scale(2)" fill="none" stroke="${state.favicon.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      ${svgMarkupForIconParts(state.favicon.iconParts)}
    </g>
  </svg>`;
    elements.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function updateTabTitle(title, paceRatio) {
    const spec =
      WINDOW_SPECS[selectedWindowKey] || WINDOW_SPECS[DEFAULT_WINDOW_KEY];
    document.title =
      paceRatio === null
        ? `Pace: ${title}`
        : `${spec.badge}: ${formatPaceRatioValue(paceRatio)}`;
  }

  function setPaceSummary(
    level,
    title,
    copy,
    remainingPercent,
    timePercent,
    comparisonPaceRatio = null,
    { paceRatioDisplayOverride = null } = {},
  ) {
    const paceRatio = paceRatioForValues(remainingPercent, timePercent);
    const paceRatioForDisplay =
      paceRatioDisplayOverride === null ? paceRatio : paceRatioDisplayOverride;

    setPaceLevel(level);
    elements.paceTitle.textContent = title;
    elements.paceCopy.textContent = copy;
    elements.paceStats.hidden = paceRatioForDisplay === null;
    elements.paceRatioStat.hidden = paceRatioForDisplay === null;
    elements.paceRatioValue.textContent =
      paceRatioForDisplay === null
        ? "--"
        : formatPaceRatioValue(paceRatioForDisplay);
    renderPaceAltRatio(comparisonPaceRatio);
    updateTabTitle(title, paceRatioForDisplay);
  }

  function renderPaceSummary(
    windowData,
    timePercent,
    staleWindow,
    comparisonPaceRatio = null,
    { allowPerfectZero = true } = {},
  ) {
    const remainingPercent = windowData?.remainingPercent;
    const hasTime = Number.isFinite(timePercent) && timePercent > 0;

    if (!Number.isFinite(remainingPercent)) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        "Waiting for usage",
        "Waiting for the next automatic check.",
        null,
        null,
      );
      return;
    }

    const paceRatio = paceRatioForValues(remainingPercent, timePercent);
    const controlledPresentation = controlledPacePresentationForValues(
      remainingPercent,
      timePercent,
      { allowPerfectZero },
    );
    if (staleWindow) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        STATUS_TEXT.waitingForReading,
        "New window, no reading yet.",
        remainingPercent,
        timePercent,
        comparisonPaceRatio,
      );
    } else if (
      isPerfectZeroPercentPair(remainingPercent, timePercent) &&
      !allowPerfectZero
    ) {
      const state = PACE_STATES.criticalBehind;
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceRatio,
      );
    } else if (controlledPresentation) {
      const { state } = controlledPresentation;
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceRatio,
        { paceRatioDisplayOverride: controlledPresentation.displayRatio },
      );
    } else if (!hasTime || paceRatio === null) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        "Reset time missing",
        "Reset timing is unavailable.",
        remainingPercent,
        timePercent,
        comparisonPaceRatio,
      );
    } else {
      const state = PacePetsLogic.paceStatePresentationForRatio(paceRatio);
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceRatio,
      );
    }
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
    const checkedValue = checkedAt ? formatClockTime(checkedAt) : "waiting";
    setLastCollected(checkedValue);
  }

  function renderLastCollectedValue(value) {
    elements.lastCollectedValue.textContent = value;
  }

  function updateLastCollectedLabel() {
    renderCollectionStatus();
  }

  function setLastCollected(value) {
    const nextValue = String(value || "waiting");
    lastCheckedText = nextValue;
    renderLastCollectedValue(nextValue);
    updateLastCollectedLabel();
  }

  function renderSummaryWindow(windowKey, windowData, windows = {}, history) {
    const spec = WINDOW_SPECS[windowKey];
    const resetMs = dateMs(windowData?.resetsAt);
    const timePercent = timeRemainingPercent(windowData);
    const hasResetTiming =
      resetMs !== null && windowStartMs(windowData) !== null;
    const staleWindow = isResetWindowStale(windowData);

    elements.priorResetLabel.textContent = spec.priorResetLabel;
    elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
    elements.resetWindowCard.dataset.windowKey = windowKey;
    setPercent(
      elements.usagePercent,
      elements.usageBar,
      windowData?.remainingPercent,
    );
    setPercent(elements.timePercent, elements.timeBar, timePercent);
    setResetParts(windowData, spec);
    elements.resetsIn.textContent = resetCountdown(windowData?.resetsAt);
    renderPaceSummary(
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
      },
    );

    return {
      hasResetTiming,
      staleWindow,
    };
  }

  function emptyHistoryState(refreshStatus) {
    if (isSignInNotFoundStatus(refreshStatus)) {
      return {
        statusText: STATUS_TEXT.signInNotFound,
        statusMode: "warning",
        statusDetail: refreshFailureDetail(refreshStatus),
        paceTitle: STATUS_TEXT.signInNotFound,
        paceCopy: SIGN_IN_NOT_FOUND_COPY,
        chartCopy: STATUS_TEXT.signInNotFound,
      };
    }

    if (isFailedRefreshStatus(refreshStatus)) {
      return {
        statusText: STATUS_TEXT.checkFailed,
        statusMode: "error",
        statusDetail: refreshFailureDetail(refreshStatus),
        paceTitle: STATUS_TEXT.checkFailed,
        paceCopy: refreshStatus.message || "The latest usage check failed.",
        chartCopy: "Waiting for local history.",
      };
    }

    if (refreshStatus?.ok === true && !isRecentRefreshStatus(refreshStatus)) {
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
    setStatus(
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
    setPercent(elements.usagePercent, elements.usageBar, null);
    setPercent(elements.timePercent, elements.timeBar, null);
    setResetParts(null, spec);
    elements.resetsIn.textContent = "--";
    setPaceSummary(
      MUTED_PACE_CLASS,
      state.paceTitle,
      state.paceCopy,
      null,
      null,
    );
    usageChartView.setEmpty(state.chartCopy);
    setLatestMetadata(null, refreshStatus);
    refreshForcedOverrideOrActivePacePreview();
  }

  function renderHistoryLoadFailure() {
    const windowKey = selectedSupportedWindowKey();
    const spec = WINDOW_SPECS[windowKey];
    setStatus(STATUS_TEXT.checkFailed, "error");
    renderWindowControls(windowKey);
    elements.priorResetLabel.textContent = spec.priorResetLabel;
    elements.scheduledResetLabel.textContent = spec.scheduledResetLabel;
    elements.resetWindowCard.dataset.windowKey = windowKey;
    setPercent(elements.usagePercent, elements.usageBar, null);
    setPercent(elements.timePercent, elements.timeBar, null);
    setResetParts(null, spec);
    elements.resetsIn.textContent = "--";
    setPaceSummary(
      MUTED_PACE_CLASS,
      STATUS_TEXT.checkFailed,
      "Could not read local history.",
      null,
      null,
    );
    usageChartView.setEmpty("Could not read local history.");
    refreshForcedOverrideOrActivePacePreview();
  }

  function historyStatusState({
    refreshStatus,
    latest,
    hasAnySupportedWindow,
    summaryWindow,
    summaryState,
  }) {
    if (isSignInNotFoundStatus(refreshStatus)) {
      return {
        text: STATUS_TEXT.signInNotFound,
        mode: "warning",
        detail: refreshFailureDetail(refreshStatus, latest),
        manualRefresh: true,
      };
    }

    if (isFailedRefreshStatus(refreshStatus)) {
      return {
        text: STATUS_TEXT.checkFailed,
        mode: "error",
        detail: refreshFailureDetail(refreshStatus, latest),
        manualRefresh: true,
      };
    }

    if (refreshStatus?.ok === true && !isRecentRefreshStatus(refreshStatus)) {
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
      if (refreshStatus?.ok === true && isRecentRefreshStatus(refreshStatus)) {
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
    setStatus(state.text, state.mode, COLLECTION_STATUS_TITLE, state.detail, {
      manualRefresh: state.manualRefresh === true,
    });
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

    const resetMs = dateMs(summaryWindow?.resetsAt);
    const hasResetTiming =
      resetMs !== null && windowStartMs(summaryWindow) !== null;
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
    refreshForcedOverrideOrActivePacePreview();
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
    renderStateRail();
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

  function toggleTheme() {
    explicitTheme = oppositeTheme(resolvedTheme());
    storeThemePreference(explicitTheme);
    applyResolvedTheme({ refresh: true });
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

    const chip = stateChipFromEvent(event);
    if (!chip) {
      return;
    }

    showPacePreview(chip.dataset.paceStateKey);
    appTooltips.hide();

    try {
      chip.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; click still provides timed restore.
    }
  });

  elements.paceStateStack.addEventListener("pointercancel", restorePacePreview);

  elements.paceStateStack.addEventListener("pointerup", (event) => {
    const chip = stateChipFromEvent(event);
    if (!chip || chip.dataset.paceStateKey !== activePacePreviewKey) {
      return;
    }

    schedulePacePreviewRestore();
  });

  elements.paceStateStack.addEventListener("click", (event) => {
    const chip = stateChipFromEvent(event);
    if (!chip) {
      return;
    }

    showPacePreview(chip.dataset.paceStateKey);
    schedulePacePreviewRestore();
    appTooltips.releasePointerClickFocus(event, chip);
  });

  elements.windowToggle.addEventListener("click", (event) => {
    const toggled = toggleUsageWindow();
    if (toggled) {
      appTooltips.releasePointerClickFocus(event, elements.windowToggle);
    }
  });

  elements.themeToggle.addEventListener("click", (event) => {
    toggleTheme();
    appTooltips.releasePointerClickFocus(event, elements.themeToggle);
  });

  elements.manualRefreshButton.addEventListener("click", (event) => {
    runManualRefresh().catch((error) => {
      console.warn("Codex usage manual refresh failed:", error);
    });
    appTooltips.releasePointerClickFocus(event, elements.manualRefreshButton);
  });

  elements.infoToggle.addEventListener("click", (event) => {
    toggleInfoPanel();
    appTooltips.releasePointerClickFocus(event, elements.infoToggle);
  });

  elements.infoClose.addEventListener("click", (event) => {
    hideInfoPanel({ restoreFocus: !appTooltips.isPointerClick(event) });
  });

  elements.infoOverlay.addEventListener("click", (event) => {
    if (event.target === elements.infoOverlay) {
      hideInfoPanel({ restoreFocus: !appTooltips.isPointerClick(event) });
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
      if (isInfoPanelOpen()) {
        hideInfoPanel();
        event.preventDefault();
        return;
      }

      if (activePacePreviewKey) {
        restorePacePreview();
        event.preventDefault();
        return;
      }

      earlyReset.hide();
      appTooltips.hide();
      return;
    }

    trapInfoPanelFocus(event);

    if (isInfoPanelOpen()) {
      return;
    }

    if (event.key.toLowerCase() !== "t" || hasSingleKeyShortcutBlocker(event)) {
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

  colorSchemeMedia.addEventListener("change", () => {
    if (!explicitTheme) {
      applyResolvedTheme({ refresh: true });
    }
  });

  window.addEventListener("resize", () => appTooltips.hide());
  window.addEventListener("scroll", () => appTooltips.hide(), true);
  window.addEventListener("pagehide", () => {
    if (activePacePreviewKey) {
      restoreToolbarPreviewBadge();
    }
  });
  window.setInterval(() => {
    refreshDashboardTimeSensitiveViews().catch(renderHistoryLoadFailure);
  }, DASHBOARD_STATUS_REFRESH_INTERVAL_MS);

  loadDashboard().catch(renderHistoryLoadFailure);
  renderStateRail();
})();
