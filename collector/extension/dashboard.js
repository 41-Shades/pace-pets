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
  const INTEGRATION_CONFIG = globalThis.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error("Codex integration config must load before dashboard.js.");
  }
  const EXTENSION_STORAGE = globalThis.CodexExtensionStorage;
  if (!EXTENSION_STORAGE) {
    throw new Error("Codex storage adapter must load before dashboard.js.");
  }

  const elements = {
    collectionPulse: document.querySelector("#collection-pulse"),
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
    collectorVersion: document.querySelector("#collector-version"),
    earlyResetButton: document.querySelector("#early-reset-button"),
    earlyResetPopover: document.querySelector("#early-reset-popover"),
    earlyResetPopoverText: document.querySelector(
      "#early-reset-popover .early-reset-popover-text",
    ),
    paceStateStack: document.querySelector("#pace-state-stack"),
    paceSpecialStateStack: document.querySelector("#pace-special-state-stack"),
    appTooltip: document.querySelector("#app-tooltip"),
  };

  const DEFAULT_WINDOW_KEY = USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
  const WINDOW_STORAGE_KEY = USAGE_WINDOWS.WINDOW_STORAGE_KEY;
  const THEME_STORAGE_KEY = "codex-usage-theme";
  const USE_PLAYFUL_PACE_ICONS = true;
  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const APP_TOOLTIP_ID = "app-tooltip";
  const APP_TOOLTIP_SELECTOR = "[data-tooltip]";
  const APP_TOOLTIP_SHOW_DELAY_MS = 180;
  const APP_TOOLTIP_OFFSET_PX = 8;
  const APP_TOOLTIP_VIEWPORT_MARGIN_PX = 8;
  const APP_TOOLTIP_SUPPRESS_AFTER_INFO_CLOSE_MS = 360;
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
    signInNotFound: "ChatGPT sign-in not found",
    checkFailed: "Check failed",
  };
  const SIGN_IN_NOT_FOUND_COPY = "Open ChatGPT to resume checks.";
  const LOW_SAMPLE_CHART_COPY =
    "Waiting for enough readings to draw the pace line.";
  const WINDOW_SPECS = USAGE_WINDOWS.WINDOW_SPECS;
  const PACE_STATES = PacePetsLogic.PACE_STATES;
  const PACE_CLASSES = PacePetsLogic.PACE_CLASS_NAMES;
  const PACE_RAIL_STATE_KEYS = PacePetsLogic.PACE_RAIL_STATE_KEYS;
  const PACE_SPECIAL_STATE_KEYS = PacePetsLogic.PACE_SPECIAL_STATE_KEYS;
  const MUTED_PACE_CLASS = PACE_STATES.muted.className;

  const CHART_COLOR_FALLBACKS = {
    line: "rgba(112, 124, 138, 0.72)",
    aboveLine: "rgba(34, 139, 126, 0.74)",
    belowLine: "rgba(184, 94, 86, 0.74)",
    aboveFill: "rgba(20, 184, 166, 0.18)",
    belowFill: "rgba(248, 113, 113, 0.22)",
    perfectLine: "rgba(20, 184, 166, 0.48)",
  };
  const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
  const colorSchemeMedia = window.matchMedia(COLOR_SCHEME_QUERY);
  const DEFAULT_CHART_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const PERFECT_PACE_RATIO = PacePetsLogic.PERFECT_PACE_RATIO;
  const PACE_RATIO_CHART_MIN = 0;
  const PACE_RATIO_CHART_MAX = PacePetsLogic.PACE_RATIO_CHART_MAX;
  const PACE_RATIO_CHART_DETAIL_STEP = 0.05;
  const PACE_RATIO_CHART_HIGH_STEP = 0.25;
  const PACE_RATIO_CHART_MIN_SPAN = 0.3;
  const PACE_RATIO_CHART_MIN_PADDING = 0.04;
  const PACE_RATIO_CHART_PADDING_RATIO = 0.2;
  const PACE_RATIO_CHART_HIGH_THRESHOLD = 2;
  const COLLECTION_STATUS_STALE_AFTER_MS = 15 * 60 * 1000;
  const DASHBOARD_STATUS_REFRESH_INTERVAL_MS = 60 * 1000;
  const THEME_VALUES = new Set(["light", "dark"]);

  let usageChart = null;
  let currentHistory = null;
  let currentRefreshStatus = null;
  let selectedWindowKey = DEFAULT_WINDOW_KEY;
  let explicitTheme = storedThemePreference();
  let activeTooltipTarget = null;
  let tooltipShowTimer = null;
  let infoPanelReturnFocus = null;
  let suppressAppTooltipUntilMs = 0;
  applyResolvedTheme();

  const manifest = chrome.runtime.getManifest();
  document.title = PRODUCT_METADATA.NAME;
  elements.usageTitle.textContent = PRODUCT_METADATA.NAME;
  elements.usageDescription.textContent =
    PRODUCT_METADATA.DASHBOARD_DESCRIPTION;
  elements.collectorVersion.textContent = `v${manifest.version}`;
  let earlyResetPopoverTimer = null;
  let earlyResetClickCount = 0;
  let earlyResetIsPopping = false;
  let lastCheckedText =
    elements.lastCollectedValue.textContent.trim() || "waiting";
  let collectionStatusText = STATUS_TEXT.live;
  let collectionStatusDetail = "";

  const EARLY_RESET_POPOVER_MESSAGES = [
    "This button does nothing. But keep trying.",
    "Still nothing. It did get bigger.",
    "Persistent click detected.",
    "Reset pressure rising.",
    "Early reset request submitted to balloon.",
    "Reset looks close.\nSurely one more click.",
  ];

  const EARLY_RESET_POPOVER_HIDE_DELAY_MS = 3600;
  const EARLY_RESET_POPOVER_POP_DELAY_MS = 1000;

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
    setAppTooltipText(elements.themeToggle, label);
  }

  function applyResolvedTheme({ refresh = false } = {}) {
    const theme = resolvedTheme();
    document.documentElement.dataset.theme = theme;
    updateThemeToggle(theme);

    if (refresh) {
      refreshThemeSensitiveViews();
    }
  }

  function cssCustomProperty(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function chartColors() {
    return {
      line: cssCustomProperty("--chart-line") || CHART_COLOR_FALLBACKS.line,
      aboveLine:
        cssCustomProperty("--chart-line-above") ||
        CHART_COLOR_FALLBACKS.aboveLine,
      belowLine:
        cssCustomProperty("--chart-line-below") ||
        CHART_COLOR_FALLBACKS.belowLine,
      aboveFill:
        cssCustomProperty("--chart-above-fill") ||
        CHART_COLOR_FALLBACKS.aboveFill,
      belowFill:
        cssCustomProperty("--chart-below-fill") ||
        CHART_COLOR_FALLBACKS.belowFill,
      perfectLine:
        cssCustomProperty("--chart-perfect-line") ||
        CHART_COLOR_FALLBACKS.perfectLine,
      tooltipBg: cssCustomProperty("--tooltip-bg") || "#ffffff",
      tooltipText: cssCustomProperty("--tooltip-text") || "#24313d",
      tooltipBorder: cssCustomProperty("--tooltip-border") || "#cfd8e2",
    };
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

  function appTooltipTarget(event) {
    return event.target instanceof Element
      ? event.target.closest(APP_TOOLTIP_SELECTOR)
      : null;
  }

  function appTooltipText(target) {
    return target?.dataset?.tooltip?.trim() || "";
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function addAppTooltipDescription(target) {
    if (target.getAttribute("aria-hidden") === "true") {
      return;
    }

    const describedBy = target.getAttribute("aria-describedby") || "";
    const ids = describedBy.split(/\s+/).filter(Boolean);
    if (ids.includes(APP_TOOLTIP_ID)) {
      return;
    }

    target.dataset.appTooltipDescribed = "true";
    target.setAttribute("aria-describedby", [...ids, APP_TOOLTIP_ID].join(" "));
  }

  function removeAppTooltipDescription(target) {
    if (!target?.dataset?.appTooltipDescribed) {
      return;
    }

    const ids = (target.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== APP_TOOLTIP_ID);
    if (ids.length > 0) {
      target.setAttribute("aria-describedby", ids.join(" "));
    } else {
      target.removeAttribute("aria-describedby");
    }
    delete target.dataset.appTooltipDescribed;
  }

  function positionAppTooltip(target) {
    const tooltip = elements.appTooltip;
    if (!tooltip) {
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = APP_TOOLTIP_VIEWPORT_MARGIN_PX;
    let placement = "top";
    let top = targetRect.top - tooltipRect.height - APP_TOOLTIP_OFFSET_PX;

    if (top < margin) {
      placement = "bottom";
      top = targetRect.bottom + APP_TOOLTIP_OFFSET_PX;
    }

    top = clampNumber(
      top,
      margin,
      viewportHeight - tooltipRect.height - margin,
    );
    const centeredLeft =
      targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    const left = clampNumber(
      centeredLeft,
      margin,
      viewportWidth - tooltipRect.width - margin,
    );
    const arrowLeft = clampNumber(
      targetRect.left + targetRect.width / 2 - left,
      12,
      tooltipRect.width - 12,
    );

    tooltip.dataset.placement = placement;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.setProperty("--tooltip-arrow-left", `${arrowLeft}px`);
  }

  function showAppTooltip(target) {
    const tooltip = elements.appTooltip;
    const text = appTooltipText(target);
    if (!tooltip || !text) {
      hideAppTooltip();
      return;
    }

    activeTooltipTarget = target;
    tooltip.textContent = text;
    tooltip.hidden = false;
    tooltip.classList.remove("is-visible");
    positionAppTooltip(target);
    addAppTooltipDescription(target);

    window.requestAnimationFrame(() => {
      if (activeTooltipTarget === target) {
        tooltip.classList.add("is-visible");
      }
    });
  }

  function scheduleAppTooltip(target) {
    window.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = window.setTimeout(() => {
      tooltipShowTimer = null;
      showAppTooltip(target);
    }, APP_TOOLTIP_SHOW_DELAY_MS);
  }

  function hideAppTooltip() {
    window.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = null;
    if (activeTooltipTarget) {
      removeAppTooltipDescription(activeTooltipTarget);
    }
    activeTooltipTarget = null;

    if (elements.appTooltip) {
      elements.appTooltip.classList.remove("is-visible");
      elements.appTooltip.hidden = true;
    }
  }

  function setAppTooltipText(element, text) {
    if (!element) {
      return;
    }

    const nextText = String(text || "").trim();
    if (nextText) {
      element.dataset.tooltip = nextText;
    } else {
      element.removeAttribute("data-tooltip");
    }

    if (element === activeTooltipTarget) {
      if (nextText) {
        showAppTooltip(element);
      } else {
        hideAppTooltip();
      }
    }
  }

  function isAppTooltipSuppressed() {
    return Date.now() < suppressAppTooltipUntilMs;
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
    hideAppTooltip();
    hideEarlyResetPopover();
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
    suppressAppTooltipUntilMs =
      Date.now() + APP_TOOLTIP_SUPPRESS_AFTER_INFO_CLOSE_MS;
    hideAppTooltip();

    if (restoreFocus && infoPanelReturnFocus?.isConnected) {
      infoPanelReturnFocus.focus();
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

  function setEarlyResetPopoverMessage(message) {
    const lines = message.split("\n");
    const fragment = document.createDocumentFragment();

    elements.earlyResetPopover.setAttribute(
      "aria-label",
      message.replace(/\n/g, " "),
    );

    lines.forEach((line) => {
      const lineElement = document.createElement("span");
      lineElement.className = "early-reset-popover-line";

      line.split(" ").forEach((word) => {
        const wordElement = document.createElement("span");
        wordElement.className = "early-reset-popover-word";
        wordElement.setAttribute("aria-hidden", "true");
        wordElement.textContent = word;
        lineElement.append(wordElement);
      });

      fragment.append(lineElement);
    });

    elements.earlyResetPopoverText.replaceChildren(fragment);
  }

  function restoreEarlyResetPopover() {
    earlyResetClickCount = 0;
    earlyResetIsPopping = false;
    elements.earlyResetPopover.classList.remove("is-popping");
    elements.earlyResetPopover.removeAttribute("data-early-reset-stage");
    setEarlyResetPopoverMessage(EARLY_RESET_POPOVER_MESSAGES[0]);
  }

  function hideEarlyResetPopover() {
    window.clearTimeout(earlyResetPopoverTimer);
    earlyResetPopoverTimer = null;
    elements.earlyResetPopover.hidden = true;
    restoreEarlyResetPopover();
  }

  function scheduleEarlyResetPopoverHide(
    delay = EARLY_RESET_POPOVER_HIDE_DELAY_MS,
  ) {
    window.clearTimeout(earlyResetPopoverTimer);
    earlyResetPopoverTimer = window.setTimeout(hideEarlyResetPopover, delay);
  }

  function setEarlyResetPopoverStage(stageIndex) {
    setEarlyResetPopoverMessage(EARLY_RESET_POPOVER_MESSAGES[stageIndex]);
    elements.earlyResetPopover.dataset.earlyResetStage = String(stageIndex);
  }

  function popEarlyResetPopover() {
    earlyResetIsPopping = true;
    setEarlyResetPopoverMessage("RESET\nDENIED!");
    elements.earlyResetPopover.dataset.earlyResetStage = "pop";
    elements.earlyResetPopover.classList.add("is-popping");
    scheduleEarlyResetPopoverHide(EARLY_RESET_POPOVER_POP_DELAY_MS);
  }

  function dateMs(value) {
    return PacePetsLogic.dateMs(value);
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
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

  function timeRemainingPercentAt(windowData, atMs) {
    return PacePetsLogic.timeRemainingPercentAt(windowData, atMs);
  }

  function boundedPercent(value) {
    return PacePetsLogic.boundedPercent(value);
  }

  function paceRatioForValues(remainingPercent, timePercent) {
    return PacePetsLogic.paceRatioForValues(remainingPercent, timePercent);
  }

  function formatPaceRatioValue(value, { suffix = "" } = {}) {
    return PacePetsLogic.formatPaceRatioValue(value, { suffix });
  }

  function chartPaceRatio(value, bounds = null) {
    return PacePetsLogic.chartPaceRatio(value, bounds);
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
    setAppTooltipText(
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

  function alternatePaceRatioText(windows, activeKey) {
    const comparisonKey = alternateWindowKey(activeKey);
    if (!comparisonKey || !windows[comparisonKey]) {
      return "";
    }

    const paceRatio = paceRatioForWindow(windows[comparisonKey]);
    if (paceRatio === null) {
      return `${WINDOW_SPECS[comparisonKey].badge}: --`;
    }

    return `${WINDOW_SPECS[comparisonKey].badge}: ${formatPaceRatioValue(
      paceRatio,
    )}`;
  }

  function statusTooltipText(title, text, detail = "") {
    return detail ? `${title}: ${text}. ${detail}` : `${title}: ${text}`;
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
    const message = String(
      refreshStatus?.message || "Latest usage check failed.",
    ).trim();
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
  ) {
    collectionStatusText = text;
    collectionStatusDetail = detail;

    elements.collectionPulse.classList.toggle("live", mode === "live");
    elements.collectionPulse.classList.toggle("stale", mode === "stale");
    elements.collectionPulse.classList.toggle("offline", mode === "offline");
    elements.collectionPulse.classList.toggle("error", mode === "error");
    elements.collectionPulse.classList.toggle("warning", mode === "warning");
    setAppTooltipText(
      elements.collectionPulse,
      statusTooltipText(title, text, detail),
    );
    updateLastCollectedLabel();
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

  function setPaceLevel(level) {
    elements.paceCard.classList.remove(...PACE_CLASSES);
    elements.paceCard.classList.add(level);
    renderPaceIcon(elements.paceIcon, level);
    updateFavicon(level);
  }

  function paceStateForClassName(className) {
    return PacePetsLogic.paceStateForClassName(className);
  }

  function renderPaceIcon(container, level) {
    const state = paceStateForClassName(level);
    const src = state.playfulImage;
    container.replaceChildren();
    if (USE_PLAYFUL_PACE_ICONS && src) {
      container.classList.add("is-playful");
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      container.append(image);
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
  }

  function renderStateChip(stateKey) {
    const state = PACE_STATES[stateKey] || PACE_STATES.muted;
    const chip = document.createElement("article");
    chip.className = `state-chip ${state.className}`;

    const icon = document.createElement("div");
    icon.className = "state-icon";
    renderPaceIcon(icon, state.className);

    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = state.title;
    if (state.key === PACE_STATES.sync.key) {
      title.classList.add("state-special-title");
    }

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

  function renderStateStack(container, stateKeys) {
    if (!container) {
      return;
    }

    container.replaceChildren(...stateKeys.map(renderStateChip));
  }

  function renderStateRail() {
    renderStateStack(elements.paceStateStack, PACE_RAIL_STATE_KEYS);
    renderStateStack(elements.paceSpecialStateStack, PACE_SPECIAL_STATE_KEYS);
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
      ${svgMarkupForIconParts(state.iconParts)}
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
    comparisonPaceText = "",
  ) {
    const paceRatio = paceRatioForValues(remainingPercent, timePercent);

    setPaceLevel(level);
    elements.paceTitle.textContent = title;
    elements.paceCopy.textContent = copy;
    elements.paceStats.hidden = paceRatio === null;
    elements.paceRatioStat.hidden = paceRatio === null;
    elements.paceRatioValue.textContent =
      paceRatio === null ? "--" : formatPaceRatioValue(paceRatio);
    elements.paceAltRatio.textContent = comparisonPaceText;
    elements.paceAltRatio.hidden = !comparisonPaceText;
    updateTabTitle(title, paceRatio);
  }

  function renderPaceSummary(
    windowData,
    timePercent,
    staleWindow,
    comparisonPaceText = "",
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

    if (staleWindow) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        STATUS_TEXT.waitingForReading,
        "New window, no reading yet.",
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
      return;
    }

    if (!hasTime) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        "Reset time missing",
        "Reset timing is unavailable.",
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
      return;
    }

    const boundedRemainingPercent = boundedPercent(remainingPercent);
    const boundedTimePercent = boundedPercent(timePercent);
    const paceRatio = paceRatioForValues(remainingPercent, timePercent);
    if (paceRatio === null) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        "Reset time missing",
        "Reset timing is unavailable.",
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
    } else if (
      Math.round(boundedRemainingPercent) === Math.round(boundedTimePercent)
    ) {
      const state = PACE_STATES.sync;
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
    } else {
      const state = PacePetsLogic.paceStateForRatio(paceRatio);
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
    }
  }

  function windowSamples(history, windowKey) {
    return history.samples
      .filter((sample) => sample.windows[windowKey])
      .sort((a, b) => dateMs(a.collectedAt) - dateMs(b.collectedAt));
  }

  function chartWindowBounds(windowData) {
    const min = windowStartMs(windowData);
    const max = dateMs(windowData?.resetsAt);
    if (min === null || max === null || min >= max) {
      return null;
    }
    return { min, max };
  }

  function resetWindowSamples(history, windowKey, windowData) {
    const bounds = chartWindowBounds(windowData);
    if (!bounds) {
      return [];
    }

    return windowSamples(history, windowKey).filter((sample) => {
      const collectedMs = dateMs(sample.collectedAt);
      return (
        collectedMs !== null &&
        collectedMs >= bounds.min &&
        collectedMs <= bounds.max
      );
    });
  }

  function chartSamplesWithLivePoint(samples, windowKey, windowData) {
    const bounds = chartWindowBounds(windowData);
    const nowMs = Date.now();
    if (!bounds || nowMs < bounds.min || nowMs > bounds.max) {
      return samples;
    }

    const latestSample = samples[samples.length - 1];
    const latestMs = dateMs(latestSample?.collectedAt);
    if (latestMs !== null && nowMs <= latestMs) {
      return samples;
    }

    return samples.concat({
      id: `live-${windowKey}`,
      collectedAt: new Date(nowMs).toISOString(),
      source: INTEGRATION_CONFIG.SOURCE_MARKERS.dashboardLive,
      windows: {
        [windowKey]: windowData,
      },
    });
  }

  function paceChartPoints(samples, windowKey) {
    return samples
      .map((sample) => {
        const collectedMs = dateMs(sample.collectedAt);
        const windowData = sample.windows[windowKey];
        const remainingPercent = Number(windowData?.remainingPercent);
        if (collectedMs === null || !Number.isFinite(remainingPercent)) {
          return null;
        }

        const timePercent = timeRemainingPercentAt(windowData, collectedMs);
        const paceRatio = paceRatioForValues(remainingPercent, timePercent);
        if (paceRatio === null) {
          return null;
        }

        return {
          x: collectedMs,
          y: paceRatio,
          paceRatio,
        };
      })
      .filter(Boolean);
  }

  function cappedPaceChartPoints(points, bounds) {
    return points
      .map((point) => {
        const paceRatio = Number(point.paceRatio ?? point.y);
        const plottedPaceRatio = chartPaceRatio(paceRatio, bounds);
        if (plottedPaceRatio === null) {
          return null;
        }

        return {
          ...point,
          y: plottedPaceRatio,
          cappedHigh: paceRatio > bounds.max,
          cappedLow: paceRatio < bounds.min,
        };
      })
      .filter(Boolean);
  }

  function splitPaceChartCrossings(points) {
    if (points.length < 2) {
      return points;
    }

    const splitPoints = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const previousDelta = previous.y - PERFECT_PACE_RATIO;
      const currentDelta = current.y - PERFECT_PACE_RATIO;
      const crossesPerfect =
        previousDelta !== 0 &&
        currentDelta !== 0 &&
        Math.sign(previousDelta) !== Math.sign(currentDelta) &&
        current.x !== previous.x;

      if (crossesPerfect) {
        const crossingRatio =
          (PERFECT_PACE_RATIO - previous.y) / (current.y - previous.y);
        splitPoints.push({
          synthetic: true,
          x: previous.x + (current.x - previous.x) * crossingRatio,
          y: PERFECT_PACE_RATIO,
        });
      }

      splitPoints.push(current);
    }

    return splitPoints;
  }

  function paceChartSegmentColor(context, colors) {
    const p0Y = context.p0?.parsed?.y;
    const p1Y = context.p1?.parsed?.y;
    if (!Number.isFinite(p0Y) || !Number.isFinite(p1Y)) {
      return colors.line;
    }
    if (p0Y === PERFECT_PACE_RATIO && p1Y === PERFECT_PACE_RATIO) {
      return colors.perfectLine;
    }

    const midpoint = (p0Y + p1Y) / 2;
    if (midpoint > PERFECT_PACE_RATIO) {
      return colors.aboveLine;
    }
    if (midpoint < PERFECT_PACE_RATIO) {
      return colors.belowLine;
    }

    return colors.line;
  }

  function paceChartDataset(points, colors, yBounds) {
    const cappedPoints = cappedPaceChartPoints(points, yBounds);
    const splitPoints = splitPaceChartCrossings(cappedPoints);

    return {
      label: "Pace",
      data: splitPoints,
      parsing: false,
      borderColor: colors.line,
      backgroundColor: colors.aboveFill,
      borderWidth: 1.35,
      fill: {
        above: colors.aboveFill,
        below: colors.belowFill,
        target: {
          value: PERFECT_PACE_RATIO,
        },
      },
      pointBackgroundColor: colors.line,
      pointBorderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 3,
      segment: {
        borderColor(context) {
          return paceChartSegmentColor(context, colors);
        },
      },
      tension: 0.28,
    };
  }

  function setLatestMetadata(latest, refreshStatus = null) {
    const checkedAt =
      refreshStatus?.ok === true
        ? refreshStatus.refreshedAt || latest?.collectedAt
        : latest?.collectedAt || refreshStatus?.refreshedAt;
    const checkedValue = checkedAt ? formatClockTime(checkedAt) : "waiting";
    setLastCollected(checkedValue);
  }

  function renderLastCollectedValue(value) {
    elements.lastCollectedValue.textContent = value;
  }

  function updateLastCollectedLabel() {
    const statusText = collectionStatusDetail
      ? `${collectionStatusText}. ${collectionStatusDetail}`
      : collectionStatusText;
    const label = `Checked: ${lastCheckedText}. Status: ${statusText}`;
    elements.lastCollected.setAttribute("aria-label", label);
    setAppTooltipText(elements.lastCollected, `Status: ${statusText}`);
  }

  function setLastCollected(value) {
    const nextValue = String(value || "waiting");
    lastCheckedText = nextValue;
    renderLastCollectedValue(nextValue);
    updateLastCollectedLabel();
  }

  function destroyUsageChart() {
    const registeredChart = registeredUsageChart();
    if (usageChart) {
      usageChart.destroy();
    }
    if (registeredChart && registeredChart !== usageChart) {
      registeredChart.destroy();
    }
    usageChart = null;
  }

  function registeredUsageChart() {
    if (!globalThis.Chart || typeof globalThis.Chart.getChart !== "function") {
      return null;
    }
    return globalThis.Chart.getChart(elements.chartCanvas) || null;
  }

  function setChartEmpty(message) {
    destroyUsageChart();
    elements.chartFrame.classList.add("empty");
    elements.chartCanvas.hidden = true;
    elements.chartState.hidden = false;
    elements.chartState.textContent = message;
  }

  function roundChartBoundUp(value, step = PACE_RATIO_CHART_DETAIL_STEP) {
    return Math.ceil(value / step) * step;
  }

  function roundChartBoundDown(value, step = PACE_RATIO_CHART_DETAIL_STEP) {
    return Math.floor(value / step) * step;
  }

  function ratioChartBounds(points) {
    const ratios = points
      .map((point) => point.paceRatio ?? point.y)
      .filter((value) => Number.isFinite(value));
    const minRatio = Math.min(PERFECT_PACE_RATIO, ...ratios);
    const maxRatio = Math.max(PERFECT_PACE_RATIO, ...ratios);

    if (maxRatio > PACE_RATIO_CHART_HIGH_THRESHOLD) {
      return {
        min: PACE_RATIO_CHART_MIN,
        max: Math.min(
          PACE_RATIO_CHART_MAX,
          roundChartBoundUp(maxRatio, PACE_RATIO_CHART_HIGH_STEP),
        ),
      };
    }

    const range = maxRatio - minRatio;
    const padding = Math.max(
      PACE_RATIO_CHART_MIN_PADDING,
      range * PACE_RATIO_CHART_PADDING_RATIO,
    );
    let min = minRatio - padding;
    let max = maxRatio + padding;
    const span = max - min;
    if (span < PACE_RATIO_CHART_MIN_SPAN) {
      const midpoint = (min + max) / 2;
      min = midpoint - PACE_RATIO_CHART_MIN_SPAN / 2;
      max = midpoint + PACE_RATIO_CHART_MIN_SPAN / 2;
    }

    return {
      min: Math.max(PACE_RATIO_CHART_MIN, roundChartBoundDown(min)),
      max: Math.min(PACE_RATIO_CHART_MAX, roundChartBoundUp(max)),
    };
  }

  function formatPaceRatio(value) {
    return formatPaceRatioValue(value, { suffix: "x" });
  }

  function hasCappedPacePoints(points, yBounds) {
    const cappedHigh = points.some((point) => point.paceRatio > yBounds.max);
    const cappedLow = points.some((point) => point.paceRatio < yBounds.min);
    return cappedHigh || cappedLow;
  }

  function usageChartConfig(points, windowData) {
    const { min, max } = chartWindowBounds(windowData) || {
      min: Date.now() - DEFAULT_CHART_WINDOW_MS,
      max: Date.now(),
    };
    const colors = chartColors();
    const yBounds = ratioChartBounds(points);
    return {
      type: "line",
      data: {
        datasets: [paceChartDataset(points, colors, yBounds)],
      },
      options: {
        animation: false,
        interaction: {
          axis: "x",
          intersect: false,
          mode: "nearest",
        },
        maintainAspectRatio: false,
        normalized: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1,
            caretSize: 5,
            cornerRadius: 6,
            displayColors: false,
            padding: 8,
            titleColor: colors.tooltipText,
            bodyFont: {
              size: 12,
              weight: "560",
            },
            titleFont: {
              size: 12,
              weight: "600",
            },
            callbacks: {
              label(context) {
                const paceRatio = context.raw?.paceRatio ?? context.parsed.y;
                const capped =
                  context.raw?.cappedHigh === true ||
                  context.raw?.cappedLow === true;
                return capped
                  ? `Pace: ${formatPaceRatio(paceRatio)} (capped)`
                  : `Pace: ${formatPaceRatio(paceRatio)}`;
              },
              title(items) {
                return items[0] ? formatTime(items[0].parsed.x) : "";
              },
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min,
            max,
            afterBuildTicks(scale) {
              scale.ticks = [{ value: min }, { value: max }];
            },
            border: {
              display: false,
            },
            grid: {
              display: false,
            },
            ticks: {
              display: false,
            },
          },
          y: {
            min: yBounds.min,
            max: yBounds.max,
            afterBuildTicks(scale) {
              scale.ticks = [
                { value: yBounds.min },
                { value: PERFECT_PACE_RATIO },
                { value: yBounds.max },
              ];
            },
            border: {
              display: false,
            },
            grid: {
              color(context) {
                return context.tick.value === PERFECT_PACE_RATIO
                  ? colors.perfectLine
                  : "transparent";
              },
              drawTicks: false,
              lineWidth(context) {
                return context.tick.value === PERFECT_PACE_RATIO ? 1 : 0;
              },
            },
            ticks: {
              display: false,
            },
          },
        },
      },
    };
  }

  function renderUsageChart(samples, windowKey, windowData) {
    const spec = WINDOW_SPECS[windowKey];
    if (!globalThis.Chart) {
      setChartEmpty("Chart.js did not load from the extension asset.");
      return;
    }

    const points = paceChartPoints(samples, windowKey);
    if (points.length < 2) {
      setChartEmpty(LOW_SAMPLE_CHART_COPY);
      return;
    }

    elements.chartFrame.classList.remove("empty");
    elements.chartCanvas.hidden = false;
    elements.chartCanvas.setAttribute(
      "aria-label",
      `${spec.chartSampleLabel} pace ratio across active reset window`,
    );
    elements.chartState.hidden = true;

    const config = usageChartConfig(points, windowData);
    const yBounds = config.options.scales.y;
    const hasCappedPoints = hasCappedPacePoints(points, yBounds);
    elements.chartCanvas.setAttribute(
      "aria-label",
      `${spec.chartSampleLabel} pace ratio across active reset window${
        hasCappedPoints ? "; some extreme points are capped" : ""
      }`,
    );
    usageChart = usageChart || registeredUsageChart();
    if (!usageChart) {
      usageChart = new globalThis.Chart(
        elements.chartCanvas.getContext("2d"),
        config,
      );
      return;
    }

    usageChart.data.datasets = config.data.datasets;
    usageChart.options.interaction = config.options.interaction;
    usageChart.options.plugins = config.options.plugins;
    usageChart.options.scales.x = config.options.scales.x;
    usageChart.options.scales.y = config.options.scales.y;
    usageChart.update();
  }

  function renderSummaryWindow(windowKey, windowData, windows = {}) {
    const spec = WINDOW_SPECS[windowKey];
    const resetMs = dateMs(windowData?.resetsAt);
    const timePercent = timeRemainingPercent(windowData);
    const hasResetTiming =
      resetMs !== null && windowStartMs(windowData) !== null;
    const staleWindow = resetMs !== null && resetMs <= Date.now();

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
      alternatePaceRatioText(windows, windowKey),
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
    setChartEmpty(state.chartCopy);
    setLatestMetadata(null, refreshStatus);
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
    setChartEmpty("Could not read local history.");
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
      };
    }

    if (isFailedRefreshStatus(refreshStatus)) {
      return {
        text: STATUS_TEXT.checkFailed,
        mode: "error",
        detail: refreshFailureDetail(refreshStatus, latest),
      };
    }

    if (refreshStatus?.ok === true && !isRecentRefreshStatus(refreshStatus)) {
      return { text: STATUS_TEXT.refreshNeeded, mode: "stale", detail: "" };
    }

    if (
      !hasAnySupportedWindow ||
      !summaryWindow ||
      !summaryState.hasResetTiming
    ) {
      return { text: STATUS_TEXT.waiting, mode: "warning", detail: "" };
    }

    if (summaryState.staleWindow) {
      if (refreshStatus?.ok === true && isRecentRefreshStatus(refreshStatus)) {
        return {
          text: STATUS_TEXT.waitingForReading,
          mode: "live",
          detail: "",
        };
      }

      return { text: STATUS_TEXT.refreshNeeded, mode: "stale", detail: "" };
    }

    return { text: STATUS_TEXT.live, mode: "live", detail: "" };
  }

  function applyHistoryStatus(state) {
    setStatus(state.text, state.mode, COLLECTION_STATUS_TITLE, state.detail);
  }

  function renderHistoryChart(
    history,
    summaryWindowKey,
    summaryWindow,
    hasResetTiming,
  ) {
    const chartSpec = WINDOW_SPECS[summaryWindowKey];
    const samples = resetWindowSamples(
      history,
      summaryWindowKey,
      summaryWindow,
    );
    const chartSamples = chartSamplesWithLivePoint(
      samples,
      summaryWindowKey,
      summaryWindow,
    );

    if (!summaryWindow) {
      setChartEmpty(`Waiting for ${chartSpec.chartSampleLabel} usage.`);
      return;
    }

    if (!hasResetTiming) {
      setChartEmpty(`${chartSpec.chartSampleLabel} reset timing unavailable.`);
      return;
    }

    if (chartSamples.length < 2) {
      setChartEmpty(LOW_SAMPLE_CHART_COPY);
      return;
    }

    renderUsageChart(chartSamples, summaryWindowKey, summaryWindow);
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
  }

  async function readRefreshStatus() {
    return CodexUsageHistory.readRefreshStatus();
  }

  async function loadDashboard({ refreshWindowPreference = true } = {}) {
    const [history, refreshStatus, storedWindowKeyValue] = await Promise.all([
      CodexUsageHistory.readHistory(),
      readRefreshStatus(),
      refreshWindowPreference ? readStoredWindowKey() : Promise.resolve(null),
    ]);
    if (refreshWindowPreference) {
      selectedWindowKey = storedWindowKeyValue;
    }
    currentHistory = history;
    currentRefreshStatus = refreshStatus;
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

  elements.windowToggle.addEventListener("click", () => {
    toggleUsageWindow();
  });

  elements.themeToggle.addEventListener("click", () => {
    toggleTheme();
  });

  elements.infoToggle.addEventListener("click", () => {
    toggleInfoPanel();
  });

  elements.infoClose.addEventListener("click", () => {
    hideInfoPanel();
  });

  elements.infoOverlay.addEventListener("click", (event) => {
    if (event.target === elements.infoOverlay) {
      hideInfoPanel();
    }
  });

  document.addEventListener("pointerover", (event) => {
    const target = appTooltipTarget(event);
    if (!target || target === activeTooltipTarget) {
      return;
    }
    if (isAppTooltipSuppressed()) {
      return;
    }
    if (
      event.relatedTarget instanceof Node &&
      target.contains(event.relatedTarget)
    ) {
      return;
    }

    scheduleAppTooltip(target);
  });

  document.addEventListener("pointerout", (event) => {
    const target = appTooltipTarget(event);
    if (!target) {
      return;
    }
    if (
      event.relatedTarget instanceof Node &&
      target.contains(event.relatedTarget)
    ) {
      return;
    }

    hideAppTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const target = appTooltipTarget(event);
    if (target) {
      if (isAppTooltipSuppressed()) {
        return;
      }

      scheduleAppTooltip(target);
    }
  });

  document.addEventListener("focusout", (event) => {
    const target = appTooltipTarget(event);
    if (target) {
      hideAppTooltip();
    }
  });

  elements.earlyResetButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (earlyResetIsPopping) {
      return;
    }

    elements.earlyResetPopover.hidden = false;
    earlyResetClickCount += 1;

    if (earlyResetClickCount > EARLY_RESET_POPOVER_MESSAGES.length) {
      popEarlyResetPopover();
      return;
    }

    setEarlyResetPopoverStage(earlyResetClickCount - 1);
    scheduleEarlyResetPopoverHide();
  });

  document.addEventListener("click", (event) => {
    if (!elements.earlyResetButton.contains(event.target)) {
      hideEarlyResetPopover();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (isInfoPanelOpen()) {
        hideInfoPanel();
        event.preventDefault();
        return;
      }

      hideEarlyResetPopover();
      hideAppTooltip();
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

  window.addEventListener("resize", hideAppTooltip);
  window.addEventListener("scroll", hideAppTooltip, true);
  window.setInterval(() => {
    refreshDashboardTimeSensitiveViews().catch(renderHistoryLoadFailure);
  }, DASHBOARD_STATUS_REFRESH_INTERVAL_MS);

  loadDashboard().catch(renderHistoryLoadFailure);
  renderStateRail();
})();
