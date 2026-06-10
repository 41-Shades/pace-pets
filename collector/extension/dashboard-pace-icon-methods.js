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

  function hasMatchingPlayfulPaceIcon(container, state) {
    const image = container.firstElementChild;
    return (
      DATA.USE_PLAYFUL_PACE_ICONS &&
      container.classList.contains("is-playful") &&
      typeof state.playfulImage === "string" &&
      image?.tagName === "IMG" &&
      image.src === new URL(state.playfulImage, document.baseURI).href
    );
  }

  function hasMatchingPerfectZeroApertureIcon(container, state) {
    const image = container.querySelector(":scope > .perfect-zero-cameo");
    return (
      container.classList.contains("is-perfect-zero-aperture") &&
      typeof state.playfulImage === "string" &&
      image?.tagName === "IMG" &&
      image.src === new URL(state.playfulImage, document.baseURI).href
    );
  }

  function hasMatchingRenderedPaceIcon(
    container,
    state,
    { usePerfectZeroPageAperture },
  ) {
    if (usePerfectZeroPageAperture) {
      return hasMatchingPerfectZeroApertureIcon(container, state);
    }

    if (container.classList.contains("is-perfect-zero-aperture")) {
      return false;
    }

    if (DATA.USE_PLAYFUL_PACE_ICONS && state.playfulImage) {
      return hasMatchingPlayfulPaceIcon(container, state);
    }

    return container.firstElementChild?.tagName === "SVG";
  }

  function paceIconOrigin(controller) {
    const iconRect = controller.elements.paceIcon.getBoundingClientRect();
    return {
      x: iconRect.left + iconRect.width / 2,
      y: iconRect.top + iconRect.height / 2,
    };
  }

  function hasPaceIconEffect(state) {
    return Boolean(DATA.PACE_ICON_EFFECTS_BY_STATE[state.key]);
  }

  function shouldPreservePaceIcon(
    controller,
    previousState,
    state,
    { playEntryAnimation, usePerfectZeroPageAperture },
  ) {
    if (previousState.key !== state.key || playEntryAnimation) {
      return false;
    }

    if (controller.paceIconEffectCleanups.has(controller.elements.paceIcon)) {
      return true;
    }

    if (hasPaceIconEffect(state)) {
      return false;
    }

    return hasMatchingRenderedPaceIcon(controller.elements.paceIcon, state, {
      usePerfectZeroPageAperture,
    });
  }

  function setSplatFallIntro(container, shouldPlay) {
    if (shouldPlay) {
      container.dataset.splatFallIntro = "true";
      return;
    }

    delete container.dataset.splatFallIntro;
  }

  function setSyncSunburstPageBackground(controller, previousState, state) {
    if (state.key !== DATA.PACE_STATES.sync.key) {
      controller.setSyncSunburstPageBackgroundActive?.(false);
      return;
    }

    const sceneActive = Boolean(controller.syncSunburstPageBackgroundScene);
    const shouldUpdateOrigin = previousState.key !== state.key || !sceneActive;
    controller.setSyncSunburstPageBackgroundActive?.(
      true,
      shouldUpdateOrigin ? paceIconOrigin(controller) : null,
    );
  }

  function updatePaceLevelSideEffects(
    controller,
    { level, state, updateStateRailActive, updateTabIcon },
  ) {
    if (updateStateRailActive) {
      controller.updateStateRailActiveSelection?.(state.key);
    }
    if (updateTabIcon) {
      controller.updateFavicon(level);
    }
  }

  const DIRECT_PACE_ICON_EFFECT_RENDERERS = Object.freeze({
    "brake-wobble": (controller, container) =>
      controller.startBrakeWobbleEffect(container),
    "ease-up": (controller, container) =>
      controller.renderEaseUpEffect(container),
    "push-stretch": (controller, container) =>
      controller.renderPushStretchEffect(container),
    "slow-wobble": (controller, container) =>
      controller.startSlowWobbleEffect(container),
    "speed-lines": (controller, container) =>
      controller.renderSpeedLinesEffect(container),
    "splat-fall": (controller, container) =>
      controller.renderSplatFallEffect(container),
    "train-roll": (controller, container) =>
      controller.renderTrainRollEffect(container),
  });

  function renderDirectPaceIconEffect(controller, container, effect) {
    const renderer = DIRECT_PACE_ICON_EFFECT_RENDERERS[effect];
    if (!renderer) {
      return false;
    }

    renderer(controller, container);
    return true;
  }

  function renderLayeredPaceIconEffect(container, effect) {
    const layer = document.createElement("span");
    layer.className = `pace-icon-effect pace-icon-effect-${effect}`;
    layer.setAttribute("aria-hidden", "true");
    for (let puffIndex = 1; puffIndex <= 5; puffIndex += 1) {
      const puff = document.createElement("span");
      puff.className = `pace-smoke-puff pace-smoke-puff-${puffIndex}`;
      layer.append(puff);
    }
    container.append(layer);
    return layer;
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

      this.clearBrakeWobbleEffectClasses?.(container);
      this.clearEaseUpEffectClasses?.(container);
      this.clearSlowWobbleEffectClasses?.(container);
      this.clearPushStretchEffectClasses?.(container);
      this.clearSprintSmokeEffectClasses?.(container);
      this.clearSplatFallEffectClasses?.(container);
      this.clearSpeedLinesEffectClasses?.(container);
      this.clearTrainRollEffectClasses?.(container);
    },

    renderPaceIconEffect(container, state) {
      const effect = DATA.PACE_ICON_EFFECTS_BY_STATE[state.key];
      if (!effect) {
        return;
      }

      if (renderDirectPaceIconEffect(this, container, effect)) {
        return;
      }

      const layer = renderLayeredPaceIconEffect(container, effect);
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
      setSplatFallIntro(this.elements.paceIcon, playSplatFall);
      setSyncSunburstPageBackground(this, previousState, state);
      const staleClasses = DATA.PACE_CLASSES.filter((name) => name !== level);
      this.elements.paceCard.classList.remove(...staleClasses);
      this.elements.paceCard.classList.add(level);
      const pageBackgroundActive =
        this.setPerfectZeroPageBackgroundActive?.(
          state.key === DATA.PACE_STATES.perfectZero.key ||
            state.key === DATA.PACE_STATES.singularity.key,
        ) ?? false;
      const preservePaceIcon = shouldPreservePaceIcon(
        this,
        previousState,
        state,
        {
          playEntryAnimation: playSplatFall,
          usePerfectZeroPageAperture: pageBackgroundActive,
        },
      );
      if (!preservePaceIcon) {
        this.renderPaceIcon(this.elements.paceIcon, level, {
          useEffects: true,
          usePerfectZeroPageAperture: pageBackgroundActive,
        });
      }
      updatePaceLevelSideEffects(this, {
        level,
        state,
        updateStateRailActive,
        updateTabIcon,
      });
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
