(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-train-roll-methods.js.",
    );
  }

  const TRAIN_SMOKE_ORIGIN = Object.freeze({
    X_PX: 64,
    Y_PX: 27,
  });
  const TRAIN_SMOKE_EMIT_INTERVAL_MS = 340;
  const TRAIN_SMOKE_EMIT_JITTER_MS = Object.freeze([-35, 35]);
  const TRAIN_SMOKE_INITIAL_ACTIVE_PUFFS = 12;
  const TRAIN_SMOKE_MAX_CATCH_UP_EMISSIONS = 4;
  const TRAIN_SMOKE_PUFF_POOL_SIZE = 20;
  const TRAIN_SMOKE_SHAPES = Object.freeze(["round", "long", "tall"]);
  const TRAIN_SMOKE_VARIATION = Object.freeze({
    DURATION_MS: Object.freeze([4200, 5800]),
    END_SCALE_PERCENT: Object.freeze([106, 122]),
    END_X_PX: Object.freeze([-60, -44]),
    END_Y_PX: Object.freeze([-27, -20]),
    MID_X_PX: Object.freeze([-5, -1]),
    MID_Y_PX: Object.freeze([-32, -24]),
    OPACITY_PERCENT: Object.freeze([52, 72]),
    SIZE_PX: Object.freeze([12, 19]),
    TILT_DEG: Object.freeze([-12, 10]),
  });

  function spanWithClass(className) {
    const element = document.createElement("span");
    element.className = className;
    return element;
  }

  function decimalString(value) {
    return String(Math.round(value * 100) / 100);
  }

  function lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  function randomItem(controller, items) {
    return items[controller.randomIntegerInRange([0, items.length - 1])];
  }

  function smoothstep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  function quadraticPoint(start, control, end, progress) {
    const inverse = 1 - progress;
    return (
      inverse * inverse * start +
      2 * inverse * progress * control +
      progress * progress * end
    );
  }

  function arcPosition(puffState, progress) {
    return {
      x: quadraticPoint(0, puffState.midX, puffState.endX, progress),
      y: quadraticPoint(0, puffState.midY, puffState.endY, progress),
    };
  }

  function opacityForProgress(progress, peakOpacity) {
    if (progress < 0.16) {
      return peakOpacity * smoothstep(progress / 0.16);
    }
    if (progress < 0.48) {
      return peakOpacity;
    }
    if (progress < 0.7) {
      return lerp(
        peakOpacity,
        peakOpacity * 0.66,
        smoothstep((progress - 0.48) / 0.22),
      );
    }
    if (progress < 0.86) {
      return lerp(
        peakOpacity * 0.66,
        peakOpacity * 0.28,
        smoothstep((progress - 0.7) / 0.16),
      );
    }
    return lerp(peakOpacity * 0.28, 0, smoothstep((progress - 0.86) / 0.14));
  }

  function clearTrainSmokePuffVariation(puff) {
    puff.removeAttribute("data-train-smoke-shape");
    puff.style.removeProperty("--train-smoke-size");
    puff.style.removeProperty("opacity");
    puff.style.removeProperty("transform");
  }

  Object.assign(Controller.prototype, {
    clearTrainRollEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-train-roll");
    },

    nextTrainSmokeEmissionMs(timeMs) {
      return (
        timeMs +
        TRAIN_SMOKE_EMIT_INTERVAL_MS +
        this.randomIntegerInRange(TRAIN_SMOKE_EMIT_JITTER_MS)
      );
    },

    resetTrainSmokePuffState(puffState, startMs) {
      const variation = TRAIN_SMOKE_VARIATION;
      const { puff } = puffState;

      puff.dataset.trainSmokeShape = randomItem(this, TRAIN_SMOKE_SHAPES);
      puff.style.setProperty(
        "--train-smoke-size",
        `${this.randomIntegerInRange(variation.SIZE_PX)}px`,
      );

      Object.assign(puffState, {
        durationMs: this.randomIntegerInRange(variation.DURATION_MS),
        endScale: this.randomIntegerInRange(variation.END_SCALE_PERCENT) / 100,
        endX: this.randomIntegerInRange(variation.END_X_PX),
        endY: this.randomIntegerInRange(variation.END_Y_PX),
        midX: this.randomIntegerInRange(variation.MID_X_PX),
        midY: this.randomIntegerInRange(variation.MID_Y_PX),
        opacity: this.randomIntegerInRange(variation.OPACITY_PERCENT) / 100,
        startMs,
        tilt: this.randomIntegerInRange(variation.TILT_DEG),
        isActive: true,
      });
    },

    emitTrainSmokePuff(state, startMs) {
      const puffState = state.puffs.find((candidate) => !candidate.isActive);
      if (!puffState) {
        return null;
      }

      this.resetTrainSmokePuffState(puffState, startMs);
      return puffState;
    },

    renderTrainSmokePuffFrame(puffState, timeMs) {
      const { puff } = puffState;
      if (!puffState.isActive) {
        return;
      }

      if (timeMs < puffState.startMs) {
        puff.style.opacity = "0";
        return;
      }

      const elapsedMs = timeMs - puffState.startMs;
      if (elapsedMs >= puffState.durationMs) {
        puffState.isActive = false;
        puff.style.opacity = "0";
        return;
      }

      const progress = elapsedMs / puffState.durationMs;
      const motionProgress = smoothstep(progress);
      const position = arcPosition(puffState, motionProgress);
      const opacity = opacityForProgress(progress, puffState.opacity);
      const scale = lerp(0.58, puffState.endScale, motionProgress);
      const rotate = lerp(puffState.tilt, 0, motionProgress);

      puff.style.opacity = decimalString(opacity);
      const positionText = [
        `${decimalString(position.x)}px`,
        `${decimalString(position.y)}px`,
        "0",
      ].join(", ");
      puff.style.transform = [
        "translate(-50%, -50%)",
        `translate3d(${positionText})`,
        `scale(${decimalString(scale)})`,
        `rotate(${decimalString(rotate)}deg)`,
      ].join(" ");
    },

    renderTrainSmokeFrame(state, timeMs) {
      if (!state.isActive) {
        return;
      }

      for (const puffState of state.puffs) {
        this.renderTrainSmokePuffFrame(puffState, timeMs);
      }

      let emissions = 0;
      while (
        timeMs >= state.nextEmissionMs &&
        emissions < TRAIN_SMOKE_MAX_CATCH_UP_EMISSIONS
      ) {
        const puffState = this.emitTrainSmokePuff(state, state.nextEmissionMs);
        if (puffState) {
          this.renderTrainSmokePuffFrame(puffState, timeMs);
        }
        state.nextEmissionMs = this.nextTrainSmokeEmissionMs(
          state.nextEmissionMs,
        );
        emissions += 1;
      }
      if (timeMs >= state.nextEmissionMs) {
        state.nextEmissionMs = this.nextTrainSmokeEmissionMs(timeMs);
      }

      state.animationFrameId = window.requestAnimationFrame((nextTimeMs) =>
        this.renderTrainSmokeFrame(state, nextTimeMs),
      );
    },

    startTrainSmokeEffect(container, smoke) {
      const state = {
        animationFrameId: null,
        cleanups: [],
        isActive: true,
        nextEmissionMs: 0,
        puffs: [],
      };
      const puffs = smoke.querySelectorAll(".pace-train-cloud-puff");
      const startedAtMs = window.performance.now();

      for (const puff of puffs) {
        const puffState = {
          durationMs: 0,
          endScale: 1,
          endX: 0,
          endY: 0,
          midX: 0,
          midY: 0,
          opacity: 0,
          puff,
          startMs: 0,
          tilt: 0,
          isActive: false,
        };

        state.puffs.push(puffState);
        state.cleanups.push(() => clearTrainSmokePuffVariation(puff));
      }

      const initialPuffs = Math.min(
        TRAIN_SMOKE_INITIAL_ACTIVE_PUFFS,
        state.puffs.length,
      );
      for (let index = 0; index < initialPuffs; index += 1) {
        const ageMs = (initialPuffs - index - 1) * TRAIN_SMOKE_EMIT_INTERVAL_MS;
        this.emitTrainSmokePuff(state, startedAtMs - ageMs);
      }
      state.nextEmissionMs = this.nextTrainSmokeEmissionMs(startedAtMs);

      state.animationFrameId = window.requestAnimationFrame((timeMs) =>
        this.renderTrainSmokeFrame(state, timeMs),
      );

      this.paceIconEffectCleanups.set(container, () => {
        state.isActive = false;
        window.cancelAnimationFrame(state.animationFrameId);
        for (const cleanup of state.cleanups) {
          cleanup();
        }
        this.clearTrainRollEffectClasses(container);
      });
    },

    renderTrainRollEffect(container) {
      const smoke = spanWithClass("pace-train-smoke-overlay");
      smoke.setAttribute("aria-hidden", "true");
      smoke.style.setProperty(
        "--train-smoke-origin-x",
        `${TRAIN_SMOKE_ORIGIN.X_PX}px`,
      );
      smoke.style.setProperty(
        "--train-smoke-origin-y",
        `${TRAIN_SMOKE_ORIGIN.Y_PX}px`,
      );
      for (let index = 0; index < TRAIN_SMOKE_PUFF_POOL_SIZE; index += 1) {
        smoke.append(spanWithClass("pace-train-cloud-puff"));
      }

      container.classList.add("has-pace-icon-effect-train-roll");
      container.append(smoke);
      this.startTrainSmokeEffect(container, smoke);
    },
  });
})();
