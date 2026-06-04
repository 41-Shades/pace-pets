(() => {
  "use strict";

  const PREVIEW_CONTROL = globalThis.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace Pets preview controls must load before dashboard-pace-controller.js.",
    );
  }
  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error(
      "Codex theme assets must load before dashboard-pace-controller.js.",
    );
  }
  const PERFECT_ZERO_SPACE = globalThis.PacePetsPerfectZeroSpace;
  if (!PERFECT_ZERO_SPACE) {
    throw new Error(
      "Pace Pets perfect-zero scene must load before dashboard-pace-controller.js.",
    );
  }

  const USE_PLAYFUL_PACE_ICONS = true;
  const SINGULARITY_RESET_COUNTDOWN_TEXT = "0d 0h 0m";
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
    [PACE_STATES.criticalBehind.key]: "brake-wobble",
  });
  const BRAKE_WOBBLE_INITIAL_DELAY_RANGE_MS = Object.freeze([650, 1400]);
  const BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS = Object.freeze([1600, 3400]);
  const BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE = Object.freeze([2, 4]);
  const BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT = Object.freeze({
    1: 320,
    2: 520,
    3: 720,
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

  function randomIntegerInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createController({
    defaultWindowKey,
    elements,
    getCurrentForcedPaceStateKey,
    getCurrentHistory,
    getCurrentRefreshStatus,
    getSelectedWindowKey,
    renderHistory,
    restoreToolbarPreviewBadge,
    selectedSupportedWindowKey,
    updateToolbarPreviewBadge,
    usageChartView,
    windowSpecs,
  }) {
    let activePacePreviewKey = null;
    let pacePreviewRestoreSnapshot = null;
    let pacePreviewRestoreTimer = null;
    const paceIconEffectCleanups = new WeakMap();
    let perfectZeroPageBackgroundScene = null;

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
      setPercent(
        elements.timePercent,
        elements.timeBar,
        percentPair.timePercent,
      );
    }

    function selectedSummaryWindowForChartPreview() {
      const latest = CodexUsageHistory.latestSample(getCurrentHistory());
      const windows =
        latest?.windows && typeof latest.windows === "object"
          ? latest.windows
          : {};
      return windows[selectedSupportedWindowKey()] || null;
    }

    function previewChartPaceRatioForState(stateKey, paceRatio) {
      return stateKey === PACE_STATES.perfectZero.key ||
        stateKey === DASHBOARD_RAIL_STATES.singularity.key
        ? PacePetsLogic.PERFECT_PACE_RATIO
        : paceRatio;
    }

    function renderPreviewChart(stateKey, paceRatio, percentPair) {
      if (!percentPair || paceRatio === null) {
        return;
      }

      usageChartView.renderPreview({
        paceRatio: previewChartPaceRatioForState(stateKey, paceRatio),
        percentPair,
        summaryWindow: selectedSummaryWindowForChartPreview(),
        summaryWindowKey: selectedSupportedWindowKey(),
      });
    }

    function previewPaceRatioForState(stateKey) {
      return PREVIEW_CONTROL.previewPaceRatioForState(stateKey);
    }

    function previewStateKeyEnabled(stateKey) {
      return PREVIEW_CONTROL.previewStateKeyEnabled(stateKey);
    }

    function forcedPaceRatioForState(stateKey) {
      return PREVIEW_CONTROL.forcedPaceRatioForState(stateKey);
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
      const currentForcedPaceStateKey = getCurrentForcedPaceStateKey();
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

    function clearBrakeWobbleEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-brake-wobble",
        "is-brake-wobbling",
      );
      container.removeAttribute("data-brake-wobble-shakes");
      container.removeAttribute("data-brake-wobble-range");
    }

    function clearPaceIconEffects(container) {
      const cleanup = paceIconEffectCleanups.get(container);
      if (cleanup) {
        cleanup();
        paceIconEffectCleanups.delete(container);
        return;
      }

      clearBrakeWobbleEffectClasses(container);
    }

    function startBrakeWobbleEffect(container) {
      let delayTimer = null;
      let settleTimer = null;
      let isActive = true;
      let nextWideBurstEscapes = false;
      let burstsUntilWide = randomIntegerInRange(
        BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE,
      );

      const scheduleBurst = (delayRange) => {
        delayTimer = window.setTimeout(() => {
          delayTimer = null;
          runBurst();
        }, randomIntegerInRange(delayRange));
      };

      const clearBurstClasses = () => {
        container.classList.remove("is-brake-wobbling");
        container.removeAttribute("data-brake-wobble-shakes");
        container.removeAttribute("data-brake-wobble-range");
      };

      const runBurst = () => {
        if (!isActive) {
          return;
        }

        const shakeCount = randomIntegerInRange([1, 3]);
        const isWideBurst = burstsUntilWide <= 1;
        const isEscapeBurst = isWideBurst && nextWideBurstEscapes;
        const durationMs =
          BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT[shakeCount] ||
          BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT[2];
        if (isWideBurst) {
          nextWideBurstEscapes = !nextWideBurstEscapes;
        }
        burstsUntilWide = isWideBurst
          ? randomIntegerInRange(BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE)
          : burstsUntilWide - 1;
        container.dataset.brakeWobbleShakes = String(shakeCount);
        if (isWideBurst) {
          container.dataset.brakeWobbleRange = isEscapeBurst
            ? "escape"
            : "wide";
        }
        container.classList.add("is-brake-wobbling");

        settleTimer = window.setTimeout(() => {
          settleTimer = null;
          clearBurstClasses();
          if (isActive) {
            scheduleBurst(BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS);
          }
        }, durationMs);
      };

      clearBrakeWobbleEffectClasses(container);
      container.classList.add("has-pace-icon-effect-brake-wobble");
      scheduleBurst(BRAKE_WOBBLE_INITIAL_DELAY_RANGE_MS);

      paceIconEffectCleanups.set(container, () => {
        isActive = false;
        window.clearTimeout(delayTimer);
        window.clearTimeout(settleTimer);
        clearBrakeWobbleEffectClasses(container);
      });
    }

    function renderPaceIconEffect(container, state) {
      const effect = PACE_ICON_EFFECTS_BY_STATE[state.key];
      if (!effect) {
        return;
      }

      if (effect === "brake-wobble") {
        startBrakeWobbleEffect(container);
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

    function renderPaceIcon(
      container,
      level,
      { useEffects = false, usePerfectZeroPageAperture = false } = {},
    ) {
      const state = paceStateForClassName(level);
      const src = state.playfulImage;
      const shouldRenderPerfectZeroPageAperture =
        container === elements.paceIcon &&
        state.key === PACE_STATES.perfectZero.key &&
        usePerfectZeroPageAperture;

      clearPaceIconEffects(container);
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
        if (useEffects) {
          renderPaceIconEffect(container, state);
        }
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
      if (useEffects) {
        renderPaceIconEffect(container, state);
      }
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
        useEffects: true,
        usePerfectZeroPageAperture: pageBackgroundActive,
      });
      if (updateStateRailActive) {
        updateStateRailActiveSelection(state.key);
      }
      if (updateTabIcon) {
        updateFavicon(level);
      }
    }

    function renderStateChip(stateKey) {
      const state = paceStateForKey(stateKey) || PACE_STATES.muted;
      const canPreview = previewStateKeyEnabled(state.key);
      const chip = document.createElement("button");
      chip.className = `state-chip ${state.className}`;
      chip.type = "button";
      chip.dataset.paceStateKey = state.key;
      chip.dataset.previewable = String(canPreview);
      if (!canPreview) {
        chip.setAttribute("aria-disabled", "true");
      }
      if (state.key === PACE_STATES.sync.key) {
        chip.dataset.tooltip = "Special live state: usage matches time.";
        chip.dataset.tooltipHint = "Not previewable";
      } else if (state.key === PACE_STATES.perfectZero.key) {
        chip.dataset.tooltip = "Special live state: usage and time are zero.";
        chip.dataset.tooltipHint = "Not previewable";
      } else if (state.key === DASHBOARD_RAIL_STATES.singularity.key) {
        chip.dataset.tooltip = "Special developer state.";
        chip.dataset.tooltipHint = "Not previewable";
      } else {
        chip.dataset.tooltip = `Preview mock ${state.title} status`;
        chip.dataset.tooltipHint = "Click to preview";
      }
      if (canPreview) {
        chip.setAttribute("aria-controls", "pace-card");
      }

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
      const perfectStateKeys = PACE_PERFECT_LEGEND_STATE_KEYS;
      const columns = [];
      if (levelStateKeys.length) {
        columns.push(
          renderStateColumn(
            "state-column-levels",
            "Pace levels",
            levelStateKeys,
          ),
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

    function paceAltRatioSnapshot() {
      if (elements.paceAltRatio.hidden) {
        return null;
      }

      const label = elements.paceAltRatio.querySelector(
        ".pace-alt-ratio-label",
      );
      const value = elements.paceAltRatio.querySelector(
        ".pace-alt-ratio-value",
      );
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

    function clearActivePacePreviewState() {
      activePacePreviewKey = null;
      pacePreviewRestoreSnapshot = null;
      clearPacePreviewRestoreTimer();
      elements.paceCard.classList.remove("is-previewing");
      updateStateRailPreviewSelection(null);
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

      const currentHistory = getCurrentHistory();
      if (currentHistory) {
        renderHistory(currentHistory, getCurrentRefreshStatus());
        return;
      }

      restorePaceCardSnapshot(snapshot);
    }

    function schedulePacePreviewRestore() {
      clearPacePreviewRestoreTimer();
      pacePreviewRestoreTimer = window.setTimeout(
        restorePacePreview,
        PREVIEW_CONTROL.PACE_STATE_PREVIEW_DURATION_MS,
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
        PacePetsLogic.formatPaceRatioValue(previewPaceRatio);
      const percentPair = PREVIEW_CONTROL.forcedPercentPairForState(state.key);
      setPreviewPercentPair(percentPair);
      renderPreviewChart(state.key, previewPaceRatio, percentPair);
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
      if (!state) {
        return false;
      }

      const forcedPaceRatio = forcedPaceRatioForState(state.key);
      if (forcedPaceRatio === null) {
        return false;
      }

      clearActivePacePreviewState();
      setPaceLevel(state.className);
      elements.paceTitle.textContent = state.title;
      elements.paceCopy.textContent = state.copy;
      elements.paceStats.hidden = false;
      elements.paceRatioStat.hidden = false;
      elements.paceRatioValue.textContent =
        PacePetsLogic.formatPaceRatioValue(forcedPaceRatio);
      const percentPair = PREVIEW_CONTROL.forcedPercentPairForState(state.key);
      setPreviewPercentPair(percentPair);
      renderPreviewChart(state.key, forcedPaceRatio, percentPair);
      applyStateResetCountdown(state);
      const previewRatioLabel = state.previewRatioLabel || state.ratioLabel;
      renderPaceAltRatio(previewRatioLabel);
      updateTabTitle(state.title, forcedPaceRatio);
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
      const selectedWindowKey = getSelectedWindowKey();
      const spec =
        windowSpecs[selectedWindowKey] || windowSpecs[defaultWindowKey];
      document.title =
        paceRatio === null
          ? `Pace: ${title}`
          : `${spec.badge}: ${PacePetsLogic.formatPaceRatioValue(paceRatio)}`;
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

    function setPaceSummary(
      level,
      title,
      copy,
      remainingPercent,
      timePercent,
      comparisonPaceRatio = null,
      { paceRatioDisplayOverride = null } = {},
    ) {
      const paceRatio = PacePetsLogic.paceRatioForValues(
        remainingPercent,
        timePercent,
      );
      const paceRatioForDisplay =
        paceRatioDisplayOverride === null
          ? paceRatio
          : paceRatioDisplayOverride;

      setPaceLevel(level);
      elements.paceTitle.textContent = title;
      elements.paceCopy.textContent = copy;
      elements.paceStats.hidden = paceRatioForDisplay === null;
      elements.paceRatioStat.hidden = paceRatioForDisplay === null;
      elements.paceRatioValue.textContent =
        paceRatioForDisplay === null
          ? "--"
          : PacePetsLogic.formatPaceRatioValue(paceRatioForDisplay);
      renderPaceAltRatio(comparisonPaceRatio);
      updateTabTitle(title, paceRatioForDisplay);
    }

    function renderPaceSummary(
      windowData,
      timePercent,
      staleWindow,
      comparisonPaceRatio = null,
      { allowPerfectZero = true, waitingForReadingText = "Waiting" } = {},
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

      const paceRatio = PacePetsLogic.paceRatioForValues(
        remainingPercent,
        timePercent,
      );
      const controlledPresentation =
        PacePetsLogic.controlledPacePresentationForValues(
          remainingPercent,
          timePercent,
          { allowPerfectZero },
        );
      if (staleWindow) {
        setPaceSummary(
          MUTED_PACE_CLASS,
          waitingForReadingText,
          "New window, no reading yet.",
          remainingPercent,
          timePercent,
          comparisonPaceRatio,
        );
      } else if (
        PacePetsLogic.isPerfectZeroPercentPair(remainingPercent, timePercent) &&
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

    return Object.freeze({
      get activePreviewKey() {
        return activePacePreviewKey;
      },
      mutedClassName: MUTED_PACE_CLASS,
      refreshForcedOverrideOrActivePacePreview,
      renderPaceSummary,
      renderStateRail,
      restorePacePreview,
      schedulePacePreviewRestore,
      setPaceSummary,
      setPercent,
      showPacePreview,
      stateChipFromEvent,
    });
  }

  globalThis.PacePetsDashboardPace = Object.freeze({
    createController,
  });
})();
