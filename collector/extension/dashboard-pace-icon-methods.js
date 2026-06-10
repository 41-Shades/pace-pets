(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-icon-methods.js.",
    );
  }

  function setSvgAttributes(element, attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
  }

  function shouldPlaySplatFall({ previousState, state, replay, playOnEntry }) {
    return (
      state.key === DATA.PACE_STATES.splat.key &&
      (replay || (playOnEntry && previousState.key !== state.key))
    );
  }

  Object.assign(Controller.prototype, {
    clearBrakeWobbleEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-brake-wobble",
        "is-brake-wobbling",
      );
      container.removeAttribute("data-brake-wobble-shakes");
      container.removeAttribute("data-brake-wobble-range");
    },

    clearSlowWobbleEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-slow-wobble",
        "is-slow-wobbling-extreme",
        "is-slow-wobbling",
      );
      container.style.removeProperty("--slow-wobble-duration");
    },

    clearPaceIconEffects(container) {
      const cleanup = this.paceIconEffectCleanups.get(container);
      if (cleanup) {
        cleanup();
        this.paceIconEffectCleanups.delete(container);
        return;
      }

      this.clearBrakeWobbleEffectClasses(container);
      this.clearSlowWobbleEffectClasses(container);
      this.clearPushStretchEffectClasses(container);
      this.clearSprintSmokeEffectClasses(container);
      this.clearSplatFallEffectClasses?.(container);
      this.clearSpeedLinesEffectClasses(container);
      this.clearTrainRollEffectClasses(container);
    },

    scheduleBrakeWobbleBurst(container, state, delayRange) {
      state.delayTimer = window.setTimeout(() => {
        state.delayTimer = null;
        this.runBrakeWobbleBurst(container, state);
      }, this.randomIntegerInRange(delayRange));
    },

    clearBrakeWobbleBurstClasses(container) {
      container.classList.remove("is-brake-wobbling");
      container.removeAttribute("data-brake-wobble-shakes");
      container.removeAttribute("data-brake-wobble-range");
    },

    brakeWobbleBurstState(state) {
      const shakeCount = this.randomIntegerInRange([1, 3]);
      const isWideBurst = state.burstsUntilWide <= 1;
      const isEscapeBurst = isWideBurst && state.nextWideBurstEscapes;
      if (isWideBurst) {
        state.nextWideBurstEscapes = !state.nextWideBurstEscapes;
      }
      state.burstsUntilWide = isWideBurst
        ? this.randomIntegerInRange(DATA.BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE)
        : state.burstsUntilWide - 1;
      return { isEscapeBurst, isWideBurst, shakeCount };
    },

    runBrakeWobbleBurst(container, state) {
      if (!state.isActive) {
        return;
      }

      const burst = this.brakeWobbleBurstState(state);
      const durationMs =
        DATA.BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT[burst.shakeCount] ||
        DATA.BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT[2];
      container.dataset.brakeWobbleShakes = String(burst.shakeCount);
      if (burst.isWideBurst) {
        container.dataset.brakeWobbleRange = burst.isEscapeBurst
          ? "escape"
          : "wide";
      }
      container.classList.add("is-brake-wobbling");
      this.launchBrakeDebrisBurst(container, burst, state);

      state.settleTimer = window.setTimeout(() => {
        state.settleTimer = null;
        this.clearBrakeWobbleBurstClasses(container);
        if (state.isActive) {
          this.scheduleBrakeWobbleBurst(
            container,
            state,
            DATA.BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS,
          );
        }
      }, durationMs);
    },

    startBrakeWobbleEffect(container) {
      const state = {
        burstsUntilWide: this.randomIntegerInRange(
          DATA.BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE,
        ),
        debrisLayers: new Set(),
        debrisTimers: new Set(),
        delayTimer: null,
        isActive: true,
        nextWideBurstEscapes: false,
        settleTimer: null,
      };

      this.clearBrakeWobbleEffectClasses(container);
      container.classList.add("has-pace-icon-effect-brake-wobble");
      this.scheduleBrakeWobbleBurst(
        container,
        state,
        DATA.BRAKE_WOBBLE_INITIAL_DELAY_RANGE_MS,
      );

      this.paceIconEffectCleanups.set(container, () => {
        state.isActive = false;
        window.clearTimeout(state.delayTimer);
        window.clearTimeout(state.settleTimer);
        this.clearBrakeDebrisLayers(state);
        this.clearBrakeWobbleEffectClasses(container);
      });
    },

    startSlowWobbleEffect(container) {
      const state = {
        cartSpillLayers: new Set(),
        cartSpillTimers: new Set(),
        delayTimer: null,
        isActive: true,
        settleTimer: null,
      };

      this.clearSlowWobbleEffectClasses(container);
      container.classList.add("has-pace-icon-effect-slow-wobble");
      container.style.setProperty(
        "--slow-wobble-duration",
        `${DATA.SLOW_WOBBLE_DURATION_MS}ms`,
      );
      this.showSlowCartSpillOrigin?.(container, state);
      this.scheduleSlowWobbleBurst(container, state);

      this.paceIconEffectCleanups.set(container, () => {
        state.isActive = false;
        window.clearTimeout(state.delayTimer);
        window.clearTimeout(state.settleTimer);
        this.clearSlowCartSpillLayers?.(state);
        this.clearSlowWobbleEffectClasses(container);
      });
    },

    scheduleSlowWobbleBurst(container, state) {
      state.delayTimer = window.setTimeout(() => {
        state.delayTimer = null;
        this.runSlowWobbleBurst(container, state);
      }, this.randomIntegerInRange(DATA.SLOW_WOBBLE_DELAY_RANGE_MS));
    },

    runSlowWobbleBurst(container, state) {
      if (!state.isActive) {
        return;
      }

      const isExtreme = Math.random() < DATA.SLOW_WOBBLE_EXTREME_CHANCE;
      container.classList.toggle("is-slow-wobbling-extreme", isExtreme);
      container.classList.add("is-slow-wobbling");
      this.launchSlowCartSpill?.(container, state, { isExtreme });
      state.settleTimer = window.setTimeout(() => {
        state.settleTimer = null;
        container.classList.remove(
          "is-slow-wobbling-extreme",
          "is-slow-wobbling",
        );
      }, DATA.SLOW_WOBBLE_DURATION_MS);
      this.scheduleSlowWobbleBurst(container, state);
    },

    renderPaceIconEffect(container, state) {
      const effect = DATA.PACE_ICON_EFFECTS_BY_STATE[state.key];
      if (!effect) {
        return;
      }

      if (effect === "push-stretch") {
        this.renderPushStretchEffect(container);
        return;
      }

      if (effect === "brake-wobble") {
        this.startBrakeWobbleEffect(container);
        return;
      }

      if (effect === "slow-wobble") {
        this.startSlowWobbleEffect(container);
        return;
      }

      if (effect === "train-roll") {
        this.renderTrainRollEffect(container);
        return;
      }

      if (effect === "speed-lines") {
        this.renderSpeedLinesEffect(container);
        return;
      }

      if (effect === "splat-fall") {
        this.renderSplatFallEffect(container);
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

      if (effect === "sprint-smoke") {
        this.startSprintSmokeEffect(container, layer);
      }
    },

    renderPlayfulPaceIcon(container, src, state, useEffects) {
      container.classList.add("is-playful");
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      container.append(image);
      if (useEffects) {
        this.renderPaceIconEffect(container, state);
      }
    },

    renderSvgPaceIcon(container, state, useEffects) {
      container.classList.remove("is-playful");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("role", "img");
      for (const part of state.iconParts) {
        const element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          part.tag,
        );
        setSvgAttributes(element, part.attrs);
        svg.append(element);
      }
      container.append(svg);
      if (useEffects) {
        this.renderPaceIconEffect(container, state);
      }
    },

    renderPerfectZeroApertureIcon(container, src) {
      container.classList.remove("is-playful");
      if (!src) {
        return;
      }

      const image = document.createElement("img");
      image.className = "perfect-zero-cameo";
      image.src = src;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      image.setAttribute("aria-hidden", "true");
      container.append(image);
    },

    renderPaceIcon(
      container,
      level,
      { useEffects = false, usePerfectZeroPageAperture = false } = {},
    ) {
      const state = this.paceStateForClassName(level);
      const src = state.playfulImage;
      const shouldRenderPerfectZeroPageAperture =
        container === this.elements.paceIcon &&
        state.key === DATA.PACE_STATES.perfectZero.key &&
        usePerfectZeroPageAperture;
      const shouldPlaySplatFallIntro = [
        container.dataset.splatFallIntro === "true",
        useEffects,
        state.key === DATA.PACE_STATES.splat.key,
      ].every(Boolean);

      this.clearPaceIconEffects(container);
      container.replaceChildren();
      container.classList.toggle(
        "is-perfect-zero-aperture",
        Boolean(shouldRenderPerfectZeroPageAperture),
      );
      if (shouldPlaySplatFallIntro) {
        container.dataset.splatFallIntro = "true";
      }

      if (shouldRenderPerfectZeroPageAperture) {
        this.renderPerfectZeroApertureIcon(container, src);
      } else if (DATA.USE_PLAYFUL_PACE_ICONS && src) {
        this.renderPlayfulPaceIcon(container, src, state, useEffects);
      } else {
        this.renderSvgPaceIcon(container, state, useEffects);
      }
    },

    setPaceLevel(
      level,
      {
        playSplatFallOnEntry = true,
        replaySplatFall = false,
        updateTabIcon = true,
        updateStateRailActive = true,
      } = {},
    ) {
      const previousState = this.paceStateForClassName(this.currentPaceLevel());
      const state = this.paceStateForClassName(level);
      const playSplatFall = shouldPlaySplatFall({
        playOnEntry: playSplatFallOnEntry,
        previousState,
        replay: replaySplatFall,
        state,
      });
      if (playSplatFall) {
        this.elements.paceIcon.dataset.splatFallIntro = "true";
      } else {
        delete this.elements.paceIcon.dataset.splatFallIntro;
      }
      const iconRect = this.elements.paceIcon.getBoundingClientRect();
      this.setSyncSunburstPageBackgroundActive(
        state.key === DATA.PACE_STATES.sync.key,
        {
          x: iconRect.left + iconRect.width / 2,
          y: iconRect.top + iconRect.height / 2,
        },
      );
      const staleClasses = DATA.PACE_CLASSES.filter((name) => name !== level);
      this.elements.paceCard.classList.remove(...staleClasses);
      this.elements.paceCard.classList.add(level);
      const pageBackgroundActive = this.setPerfectZeroPageBackgroundActive(
        state.key === DATA.PACE_STATES.perfectZero.key,
      );
      this.renderPaceIcon(this.elements.paceIcon, level, {
        useEffects: true,
        usePerfectZeroPageAperture: pageBackgroundActive,
      });
      if (updateStateRailActive) {
        this.updateStateRailActiveSelection?.(state.key);
      }
      if (updateTabIcon) {
        this.updateFavicon(level);
      }
    },

    currentPaceLevel() {
      return (
        DATA.PACE_CLASSES.find((className) =>
          this.elements.paceCard.classList.contains(className),
        ) || DATA.MUTED_PACE_CLASS
      );
    },
  });
})();
