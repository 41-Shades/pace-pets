(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const PERFECT_ZERO_SPACE = globalThis.PacePetsPerfectZeroSpace;
  if (!DATA || !Controller || !PERFECT_ZERO_SPACE) {
    throw new Error(
      "Pace data, core, and perfect-zero scene must load before dashboard-pace-icon-methods.js.",
    );
  }

  function setSvgAttributes(element, attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
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

  Object.assign(Controller.prototype, {
    stopPerfectZeroPageBackgroundScene() {
      this.perfectZeroPageBackgroundScene?.stop();
      this.perfectZeroPageBackgroundScene = null;
      if (this.elements.perfectZeroPageBackground) {
        this.elements.perfectZeroPageBackground.hidden = true;
      }
      document.body.classList.remove("has-perfect-zero-page-background");
    },

    perfectZeroPageFeaturedPlanets() {
      if (!this.elements.paceIcon || !this.elements.perfectZeroPageBackground) {
        return [];
      }

      const iconRect = this.elements.paceIcon.getBoundingClientRect();
      const canvasRect =
        this.elements.perfectZeroPageBackground.getBoundingClientRect();
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
    },

    setPerfectZeroPageBackgroundActive(active) {
      if (!this.elements.shell || !this.elements.perfectZeroPageBackground) {
        return false;
      }

      if (!active) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      if (this.perfectZeroPageBackgroundScene) {
        return true;
      }

      this.elements.perfectZeroPageBackground.hidden = false;
      document.body.classList.add("has-perfect-zero-page-background");
      const scene = PERFECT_ZERO_SPACE.create(
        this.elements.shell,
        this.elements.perfectZeroPageBackground,
        {
          profile: PERFECT_ZERO_SPACE.profiles.fullBleed,
          scene: {
            featuredPlanets: this.perfectZeroPageFeaturedPlanets(),
          },
        },
      );
      if (!scene) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      this.perfectZeroPageBackgroundScene = scene;
      return true;
    },

    clearBrakeWobbleEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-brake-wobble",
        "is-brake-wobbling",
      );
      container.removeAttribute("data-brake-wobble-shakes");
      container.removeAttribute("data-brake-wobble-range");
    },

    clearPaceIconEffects(container) {
      const cleanup = this.paceIconEffectCleanups.get(container);
      if (cleanup) {
        cleanup();
        this.paceIconEffectCleanups.delete(container);
        return;
      }

      this.clearBrakeWobbleEffectClasses(container);
      this.clearSprintSmokeEffectClasses(container);
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

    renderPaceIconEffect(container, state) {
      const effect = DATA.PACE_ICON_EFFECTS_BY_STATE[state.key];
      if (!effect) {
        return;
      }

      if (effect === "brake-wobble") {
        this.startBrakeWobbleEffect(container);
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

      this.clearPaceIconEffects(container);
      container.replaceChildren();
      container.classList.toggle(
        "is-perfect-zero-aperture",
        Boolean(shouldRenderPerfectZeroPageAperture),
      );

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
      { updateTabIcon = true, updateStateRailActive = true } = {},
    ) {
      const state = this.paceStateForClassName(level);
      this.elements.paceCard.classList.remove(
        ...DATA.PACE_CLASSES,
        ...DATA.DASHBOARD_RAIL_PACE_CLASSES,
      );
      this.elements.paceCard.classList.add(level);
      const pageBackgroundActive = this.setPerfectZeroPageBackgroundActive(
        state.key === DATA.PACE_STATES.perfectZero.key,
      );
      this.renderPaceIcon(this.elements.paceIcon, level, {
        useEffects: true,
        usePerfectZeroPageAperture: pageBackgroundActive,
      });
      if (updateStateRailActive) {
        this.updateStateRailActiveSelection(state.key);
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

    updateFavicon(level) {
      if (!this.elements.favicon) {
        return;
      }

      const state = this.paceStateForClassName(level);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill="${state.favicon.bg}"/>
    <g transform="translate(8 8) scale(2)" fill="none" stroke="${state.favicon.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      ${svgMarkupForIconParts(state.favicon.iconParts)}
    </g>
  </svg>`;
      this.elements.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
  });
})();
