(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const PushStretch = globalThis.PacePetsDashboardPushStretch;
  const PushSweat = globalThis.PacePetsDashboardPushSweat;
  const PushWater = globalThis.PacePetsDashboardPushWater;
  if (
    !Controller ||
    !DASHBOARD_PREFERENCES ||
    !PushStretch ||
    !PushSweat ||
    !PushWater
  ) {
    throw new Error(
      "Pace preferences and push stretch renderers must load before dashboard-push-stretch-methods.js.",
    );
  }

  const {
    EXTREME_PROFILE,
    NORMAL_PROFILE,
    PULSE_DURATION_MS,
    RARE_PROFILE,
    createRenderer,
    pulseAmount,
  } = PushStretch;
  const PULSE_LEVEL_WEIGHTS = Object.freeze([
    Object.freeze({ level: "normal", weight: 75 }),
    Object.freeze({ level: "extreme", weight: 20 }),
    Object.freeze({ level: "rare", weight: 5 }),
  ]);
  const PULSE_LEVEL_WEIGHT_TOTAL = PULSE_LEVEL_WEIGHTS.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  function profileForPulseLevel(level) {
    if (level === "rare") {
      return RARE_PROFILE;
    }
    if (level === "extreme") {
      return EXTREME_PROFILE;
    }
    return NORMAL_PROFILE;
  }

  function pulseLevelForCycle(controller, cycleIndex) {
    if (cycleIndex <= 0) {
      return "normal";
    }
    let bucket = controller.randomIntegerInRange([1, PULSE_LEVEL_WEIGHT_TOTAL]);
    for (const { level, weight } of PULSE_LEVEL_WEIGHTS) {
      bucket -= weight;
      if (bucket <= 0) {
        return level;
      }
    }
    return "normal";
  }

  function updatePulseCycle(controller, state, cycleIndex) {
    if (state.cycleIndex === cycleIndex) {
      return;
    }
    const previousCycleIndex = state.cycleIndex;
    const hasPreviousCycle = previousCycleIndex === cycleIndex - 1;
    state.cycleIndex = cycleIndex;
    state.previousCycleIndex = hasPreviousCycle ? previousCycleIndex : -1;
    state.previousProfile = hasPreviousCycle ? state.profile : null;
    state.previousPulseLevel = hasPreviousCycle ? state.pulseLevel : null;
    state.pulseLevel = pulseLevelForCycle(controller, cycleIndex);
    state.profile = profileForPulseLevel(state.pulseLevel);
  }

  function attachPushWaterLayer(container) {
    const card = container.closest(".pace-card");
    if (!card) {
      return null;
    }
    card.querySelector(".pace-push-water-layer")?.remove();
    const canvas = document.createElement("canvas");
    canvas.className = "pace-push-water-canvas";
    const layer = document.createElement("span");
    layer.className = "pace-push-water-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.append(canvas);
    card.classList.add("has-pace-push-water");
    card.prepend(layer);
    return {
      card,
      layer,
      renderer: PushWater.createRenderer(canvas),
    };
  }

  function clearPushWaterLayer(container) {
    const card = container.closest(".pace-card");
    card?.classList.remove("has-pace-push-water");
    card?.querySelector(".pace-push-water-layer")?.remove();
  }

  function updatePushWaterLayer(state, sweatLoad, timestamp, maxFill) {
    if (!state?.renderer) {
      return;
    }
    state.renderer.render(sweatLoad, timestamp, { maxFill });
  }

  function currentPushWaterLevel(state, maxFill) {
    return state?.renderer?.currentLevel?.({ maxFill }) ?? 0;
  }

  function createPushStretchLayer() {
    const stretchCanvas = document.createElement("canvas");
    stretchCanvas.className = "pace-push-stretch-canvas";
    const sweatCanvas = document.createElement("canvas");
    sweatCanvas.className = "pace-push-sweat-canvas";
    const layer = document.createElement("span");
    layer.className = "pace-icon-effect pace-push-stretch-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.append(stretchCanvas, sweatCanvas);
    return { layer, stretchCanvas, sweatCanvas };
  }

  function createPushStretchPulseState() {
    return {
      cycleIndex: -1,
      previousCycleIndex: -1,
      previousProfile: null,
      previousPulseLevel: null,
      profile: NORMAL_PROFILE,
      pulseLevel: "normal",
      startTime: null,
      stopped: false,
    };
  }

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  Object.assign(Controller.prototype, {
    clearPushStretchEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-push-stretch");
      container.querySelector(".pace-push-stretch-layer")?.remove();
      clearPushWaterLayer(container);
    },

    renderPushStretchEffect(container) {
      const image = container.querySelector("img");
      if (!image) {
        return;
      }
      if (!motionPreferenceEnabled()) {
        return;
      }

      const { layer, stretchCanvas, sweatCanvas } = createPushStretchLayer();
      let animationFrameId = null;
      let renderer = null;
      let waterState = null;
      let sweatRenderer = null;
      const pulseState = createPushStretchPulseState();
      const renderFrame = (timestamp) => {
        if (pulseState.stopped || !renderer) {
          return;
        }
        pulseState.startTime ??= timestamp;
        const elapsed = timestamp - pulseState.startTime;
        updatePulseCycle(
          this,
          pulseState,
          Math.floor(elapsed / PULSE_DURATION_MS),
        );
        const phase = (elapsed % PULSE_DURATION_MS) / PULSE_DURATION_MS;
        const profile = pulseState.profile;
        const amount = pulseAmount(profile, phase);
        const maxFill = Boolean(this.getCurrentMaxPoolFill?.());
        renderer.render(profile, amount);
        const sweatLoad = sweatRenderer?.render({
          cycleIndex: pulseState.cycleIndex,
          iconRenderer: renderer,
          profile,
          amount,
          phase,
          previousCycleIndex: pulseState.previousCycleIndex,
          previousProfile: pulseState.previousProfile,
          previousPulseLevel: pulseState.previousPulseLevel,
          pulseLevel: pulseState.pulseLevel,
          waterLevel: currentPushWaterLevel(waterState, maxFill),
        });
        updatePushWaterLayer(waterState, sweatLoad ?? 0, timestamp, maxFill);
        animationFrameId = window.requestAnimationFrame(renderFrame);
      };
      const start = () => {
        if (pulseState.stopped || renderer) {
          return;
        }
        renderer = createRenderer(stretchCanvas, image);
        if (!renderer) {
          layer.remove();
          return;
        }
        sweatRenderer = PushSweat.createRenderer(
          sweatCanvas,
          container.closest(".pace-card"),
        );
        waterState = attachPushWaterLayer(container);
        container.classList.add("has-pace-icon-effect-push-stretch");
        container.append(layer);
        animationFrameId = window.requestAnimationFrame(renderFrame);
      };
      const stop = () => {
        pulseState.stopped = true;
        image.removeEventListener("load", start);
        window.cancelAnimationFrame(animationFrameId);
        renderer?.destroy();
        waterState?.card.classList.remove("has-pace-push-water");
        this.clearPushStretchEffectClasses(container);
      };
      image.addEventListener("load", start, { once: true });
      this.paceIconEffectCleanups.set(container, stop);
      if (image.complete && image.naturalWidth > 0) {
        start();
      }
    },
  });
})();
