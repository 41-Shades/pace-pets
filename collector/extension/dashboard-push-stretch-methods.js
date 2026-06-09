(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const PushStretch = globalThis.PacePetsDashboardPushStretch;
  const PushSweat = globalThis.PacePetsDashboardPushSweat;
  const PushWater = globalThis.PacePetsDashboardPushWater;
  if (!Controller || !PushStretch || !PushSweat || !PushWater) {
    throw new Error(
      "Pace push stretch renderers must load before dashboard-push-stretch-methods.js.",
    );
  }

  const {
    EXTREME_INTERVAL_RANGE,
    EXTREME_PROFILE,
    NORMAL_PROFILE,
    PULSE_DURATION_MS,
    createRenderer,
    pulseAmount,
  } = PushStretch;
  const EXTREME_TRAIL_PHASE = 0.32;

  function updatePulseCycle(controller, state, cycleIndex) {
    if (state.cycleIndex === cycleIndex) {
      return;
    }
    const previousCycleIndex = state.cycleIndex;
    state.cycleIndex = cycleIndex;
    state.previousCycleWasExtreme = false;
    if (state.isExtreme) {
      state.isExtreme = false;
      state.previousExtremeCycleIndex = previousCycleIndex;
      state.previousCycleWasExtreme = true;
      state.normalPulseCount = 0;
      state.pulsesUntilExtreme = controller.randomIntegerInRange(
        EXTREME_INTERVAL_RANGE,
      );
    }
    if (state.normalPulseCount >= state.pulsesUntilExtreme) {
      state.isExtreme = true;
      return;
    }
    state.normalPulseCount += 1;
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

  function createPushStretchPulseState(controller) {
    return {
      cycleIndex: -1,
      isExtreme: false,
      normalPulseCount: 0,
      previousExtremeCycleIndex: -1,
      previousCycleWasExtreme: false,
      pulsesUntilExtreme: controller.randomIntegerInRange(
        EXTREME_INTERVAL_RANGE,
      ),
      startTime: null,
      stopped: false,
    };
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
      const reducedMotion = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      );
      if (reducedMotion?.matches) {
        return;
      }

      const { layer, stretchCanvas, sweatCanvas } = createPushStretchLayer();
      let animationFrameId = null;
      let renderer = null;
      let waterState = null;
      let sweatRenderer = null;
      const pulseState = createPushStretchPulseState(this);
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
        const profile = pulseState.isExtreme ? EXTREME_PROFILE : NORMAL_PROFILE;
        const amount = pulseAmount(profile, phase);
        const renderExtremeTrail =
          pulseState.previousCycleWasExtreme && phase <= EXTREME_TRAIL_PHASE;
        renderer.render(profile, amount);
        const sweatLoad = sweatRenderer?.render({
          cycleIndex: pulseState.cycleIndex,
          extremeCycleIndex: pulseState.isExtreme
            ? pulseState.cycleIndex
            : pulseState.previousExtremeCycleIndex,
          iconRenderer: renderer,
          profile,
          amount,
          phase,
          isExtreme: pulseState.isExtreme,
          renderExtremeTrail,
        });
        updatePushWaterLayer(
          waterState,
          sweatLoad ?? 0,
          timestamp,
          Boolean(this.getCurrentMaxPoolFill?.()),
        );
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
