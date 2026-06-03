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
  const FEATURE_FLAGS = globalThis.PacePetsFeatureFlags;
  if (!FEATURE_FLAGS) {
    throw new Error("Pace Pets feature flags must load before dashboard.js.");
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

  const DEFAULT_WINDOW_KEY = USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
  const WINDOW_STORAGE_KEY = USAGE_WINDOWS.WINDOW_STORAGE_KEY;
  const FEATURE_FLAGS_STORAGE_KEY = FEATURE_FLAGS.STORAGE_KEY;
  const THEME_STORAGE_KEY = "codex-usage-theme";
  const USE_PLAYFUL_PACE_ICONS = true;
  const COLLECTION_STATUS_TITLE = "Usage collection status";
  const APP_TOOLTIP_ID = "app-tooltip";
  const APP_TOOLTIP_SELECTOR = "[data-tooltip]";
  const APP_TOOLTIP_SHOW_DELAY_MS = 180;
  const APP_TOOLTIP_OFFSET_PX = 8;
  const APP_TOOLTIP_VIEWPORT_MARGIN_PX = 8;
  const APP_TOOLTIP_SLOW_FADE_MS = 1600;
  const APP_TOOLTIP_SLOW_AUTO_HIDE_DELAY_MS = APP_TOOLTIP_SLOW_FADE_MS + 500;
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
  const LOW_SAMPLE_CHART_COPY =
    "Waiting for enough readings to draw the pace line.";
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
  const PACE_STATE_PREVIEW_DURATION_MS =
    PREVIEW_CONTROL.PACE_STATE_PREVIEW_DURATION_MS;
  const PACE_STATE_PREVIEW_PERCENT_PAIRS =
    PREVIEW_CONTROL.PACE_STATE_PREVIEW_PERCENT_PAIRS;
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
  let currentFeatureFlags = FEATURE_FLAGS.DEFAULT_FEATURE_FLAGS;
  let currentForcedPaceStateKey = null;
  let selectedWindowKey = DEFAULT_WINDOW_KEY;
  let explicitTheme = storedThemePreference();
  let activeTooltipTarget = null;
  let tooltipShowTimer = null;
  let tooltipHideTimer = null;
  let tooltipAutoHideTimer = null;
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

  async function readDeveloperOptions() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(FEATURE_FLAGS_STORAGE_KEY);
      return FEATURE_FLAGS.normalizeDeveloperOptions(
        items?.[FEATURE_FLAGS_STORAGE_KEY],
      );
    } catch (error) {
      console.warn("Could not read developer feature flags:", error.message);
      return FEATURE_FLAGS.normalizeDeveloperOptions(null);
    }
  }

  function featureFlagValue(key) {
    return FEATURE_FLAGS.featureFlagValue(currentFeatureFlags, key);
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

  function appTooltipHint(target) {
    return target?.dataset?.tooltipHint?.trim() || "";
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
    const preferredPlacement = target.dataset.tooltipPlacement;

    if (preferredPlacement === "right") {
      let placement = "right";
      let left = targetRect.right + APP_TOOLTIP_OFFSET_PX;
      if (left + tooltipRect.width > viewportWidth - margin) {
        placement = "left";
        left = targetRect.left - tooltipRect.width - APP_TOOLTIP_OFFSET_PX;
      }

      left = clampNumber(
        left,
        margin,
        viewportWidth - tooltipRect.width - margin,
      );
      const top = clampNumber(
        targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
        margin,
        viewportHeight - tooltipRect.height - margin,
      );
      const arrowTop = clampNumber(
        targetRect.top + targetRect.height / 2 - top,
        12,
        tooltipRect.height - 12,
      );

      tooltip.dataset.placement = placement;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.setProperty("--tooltip-arrow-top", `${arrowTop}px`);
      return;
    }

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
    const hint = appTooltipHint(target);
    if (!tooltip || !text) {
      hideAppTooltip();
      return;
    }

    window.clearTimeout(tooltipHideTimer);
    tooltipHideTimer = null;
    window.clearTimeout(tooltipAutoHideTimer);
    tooltipAutoHideTimer = null;
    activeTooltipTarget = target;
    const motion = target.dataset.tooltipMotion?.trim() || "";
    if (motion) {
      tooltip.dataset.motion = motion;
    } else {
      delete tooltip.dataset.motion;
    }
    const variant = target.dataset.tooltipVariant?.trim() || "";
    if (variant) {
      tooltip.dataset.variant = variant;
    } else {
      delete tooltip.dataset.variant;
    }
    tooltip.textContent = text;
    if (hint) {
      const hintElement = document.createElement("span");
      hintElement.className = "app-tooltip-hint";
      hintElement.textContent = hint;
      tooltip.append(hintElement);
    }
    tooltip.hidden = false;
    tooltip.classList.remove("is-visible");
    positionAppTooltip(target);
    addAppTooltipDescription(target);

    window.requestAnimationFrame(() => {
      if (activeTooltipTarget === target) {
        tooltip.classList.add("is-visible");
        if (target.dataset.tooltipAutoHide === "true") {
          tooltipAutoHideTimer = window.setTimeout(() => {
            if (activeTooltipTarget === target) {
              hideAppTooltip();
            }
          }, APP_TOOLTIP_SLOW_AUTO_HIDE_DELAY_MS);
        }
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

  function hideAppTooltip({ immediate = false } = {}) {
    window.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = null;
    window.clearTimeout(tooltipAutoHideTimer);
    tooltipAutoHideTimer = null;
    if (activeTooltipTarget) {
      removeAppTooltipDescription(activeTooltipTarget);
    }
    activeTooltipTarget = null;

    if (elements.appTooltip) {
      const hasSlowFade =
        elements.appTooltip.dataset.motion === "slow" &&
        !elements.appTooltip.hidden;
      window.clearTimeout(tooltipHideTimer);
      tooltipHideTimer = null;
      elements.appTooltip.classList.remove("is-visible");
      if (hasSlowFade && !immediate) {
        tooltipHideTimer = window.setTimeout(() => {
          elements.appTooltip.hidden = true;
          delete elements.appTooltip.dataset.motion;
          delete elements.appTooltip.dataset.variant;
          tooltipHideTimer = null;
        }, APP_TOOLTIP_SLOW_FADE_MS);
      } else {
        elements.appTooltip.hidden = true;
        delete elements.appTooltip.dataset.motion;
        delete elements.appTooltip.dataset.variant;
      }
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

  function isPointerClick(event) {
    return event.detail > 0;
  }

  function releasePointerClickFocus(event, element) {
    if (!isPointerClick(event) || document.activeElement !== element) {
      return;
    }

    element.blur();
    hideAppTooltip();
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
    setAppTooltipText(
      elements.collectionPulse,
      statusTooltipText(title, state.text, state.detail),
    );
    elements.lastCollected.setAttribute("aria-label", label);
    setAppTooltipText(elements.lastCollected, `Status: ${statusText}`);
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
    setAppTooltipText(button, manualRefreshTooltipText());

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
    const message = PREVIEW_CONTROL.previewBadgeMessage(
      stateKey,
      currentFeatureFlags,
    );
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
    if (!featureFlagValue("statePreviews")) {
      return null;
    }
    if (stateKey === DASHBOARD_RAIL_STATES.singularity.key) {
      return featureFlagValue("perfectZeroState") ? 0 : null;
    }

    return PREVIEW_CONTROL.previewPaceRatioForState(
      stateKey,
      currentFeatureFlags,
    );
  }

  function previewStateKeyEnabled(stateKey) {
    if (stateKey === DASHBOARD_RAIL_STATES.singularity.key) {
      return (
        featureFlagValue("statePreviews") &&
        featureFlagValue("perfectZeroState")
      );
    }

    return PREVIEW_CONTROL.previewStateKeyEnabled(
      stateKey,
      currentFeatureFlags,
    );
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
      state.key === PACE_STATES.perfectZero.key &&
        featureFlagValue("perfectZeroScene"),
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

    if (!active || !featureFlagValue("perfectZeroScene")) {
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

  function paceCardSnapshot() {
    return {
      level: currentPaceLevel(),
      favicon: faviconSnapshot(),
      percentSummary: percentSummarySnapshot(),
      title: elements.paceTitle.textContent,
      copy: elements.paceCopy.textContent,
      statsHidden: elements.paceStats.hidden,
      ratioStatHidden: elements.paceRatioStat.hidden,
      ratioValue: elements.paceRatioValue.textContent,
      tabTitle: document.title,
      altRatio: elements.paceAltRatio.textContent,
      altRatioHidden: elements.paceAltRatio.hidden,
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
    elements.paceAltRatio.textContent = snapshot.altRatio;
    elements.paceAltRatio.hidden = snapshot.altRatioHidden;
    restoreFaviconSnapshot(snapshot.favicon);
    restorePercentSummarySnapshot(snapshot.percentSummary);
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
    setPreviewPercentPair(
      PACE_STATE_PREVIEW_PERCENT_PAIRS[state.key] || {
        remainingPercent: 0,
        timePercent: 0,
      },
    );
    const previewRatioLabel = state.previewRatioLabel || state.ratioLabel;
    elements.paceAltRatio.textContent = previewRatioLabel;
    elements.paceAltRatio.hidden = !previewRatioLabel;
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
    comparisonPaceText = "",
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
    elements.paceAltRatio.textContent = comparisonPaceText;
    elements.paceAltRatio.hidden = !comparisonPaceText;
    updateTabTitle(title, paceRatioForDisplay);
  }

  function renderPaceSummary(
    windowData,
    timePercent,
    staleWindow,
    comparisonPaceText = "",
    { allowPerfectZero = true } = {},
  ) {
    const remainingPercent = windowData?.remainingPercent;
    const hasTime = Number.isFinite(timePercent) && timePercent > 0;
    const forcedState = forcedPaceState();

    if (forcedState) {
      setPaceSummary(
        forcedState.className,
        forcedState.title,
        forcedState.copy,
        remainingPercent,
        timePercent,
        "Dev override",
        {
          paceRatioDisplayOverride: PREVIEW_CONTROL.forcedPaceRatioForState(
            forcedState.key,
          ),
        },
      );
      return;
    }

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
      { allowPerfectZero, featureFlags: currentFeatureFlags },
    );
    if (staleWindow) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        STATUS_TEXT.waitingForReading,
        "New window, no reading yet.",
        remainingPercent,
        timePercent,
        comparisonPaceText,
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
        comparisonPaceText,
      );
    } else if (controlledPresentation) {
      const { state } = controlledPresentation;
      setPaceSummary(
        state.className,
        state.title,
        state.copy,
        remainingPercent,
        timePercent,
        comparisonPaceText,
        { paceRatioDisplayOverride: controlledPresentation.displayRatio },
      );
    } else if (!hasTime || paceRatio === null) {
      setPaceSummary(
        MUTED_PACE_CLASS,
        "Reset time missing",
        "Reset timing is unavailable.",
        remainingPercent,
        timePercent,
        comparisonPaceText,
      );
    } else {
      const state = PacePetsLogic.paceStatePresentationForRatio(
        paceRatio,
        currentFeatureFlags,
      );
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

  function chartWindowBounds(windowData) {
    return PacePetsLogic.resetWindowBounds(windowData);
  }

  function resetWindowSamples(history, windowKey, windowData) {
    return PacePetsLogic.resetWindowSamples(history, windowKey, windowData);
  }

  function allowsPerfectZeroForWindow(history, windowKey, windowData) {
    return PacePetsLogic.allowsPerfectZeroForWindow(
      history,
      windowKey,
      windowData,
    );
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
      alternatePaceRatioText(windows, windowKey),
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
    setChartEmpty(state.chartCopy);
    setLatestMetadata(null, refreshStatus);
    refreshActivePacePreview();
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
    refreshActivePacePreview();
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
    refreshActivePacePreview();
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
    currentFeatureFlags = developerOptions.featureFlags;
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
    hideAppTooltip();

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
    releasePointerClickFocus(event, chip);
  });

  elements.windowToggle.addEventListener("click", (event) => {
    const toggled = toggleUsageWindow();
    if (toggled) {
      releasePointerClickFocus(event, elements.windowToggle);
    }
  });

  elements.themeToggle.addEventListener("click", (event) => {
    toggleTheme();
    releasePointerClickFocus(event, elements.themeToggle);
  });

  elements.manualRefreshButton.addEventListener("click", (event) => {
    runManualRefresh().catch((error) => {
      console.warn("Codex usage manual refresh failed:", error);
    });
    releasePointerClickFocus(event, elements.manualRefreshButton);
  });

  elements.infoToggle.addEventListener("click", (event) => {
    toggleInfoPanel();
    releasePointerClickFocus(event, elements.infoToggle);
  });

  elements.infoClose.addEventListener("click", (event) => {
    hideInfoPanel({ restoreFocus: !isPointerClick(event) });
  });

  elements.infoOverlay.addEventListener("click", (event) => {
    if (event.target === elements.infoOverlay) {
      hideInfoPanel({ restoreFocus: !isPointerClick(event) });
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
    hideAppTooltip({ immediate: true });

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

      if (activePacePreviewKey) {
        restorePacePreview();
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
        FEATURE_FLAGS_STORAGE_KEY,
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
