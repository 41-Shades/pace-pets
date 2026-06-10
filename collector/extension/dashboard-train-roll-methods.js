(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-train-roll-methods.js.",
    );
  }
  const TRAIN_SMOKE = globalThis.PacePetsDashboardTrainSmoke;
  if (!TRAIN_SMOKE) {
    throw new Error(
      "Train smoke must load before dashboard-train-roll-methods.js.",
    );
  }

  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function spanWithClass(className) {
    const element = document.createElement("span");
    element.className = className;
    return element;
  }

  function addMediaChangeListener(mediaQuery, listener) {
    if (!mediaQuery) {
      return () => {};
    }
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
    mediaQuery.addListener?.(listener);
    return () => mediaQuery.removeListener?.(listener);
  }

  Object.assign(Controller.prototype, {
    clearTrainRollEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-train-roll");
    },

    trainSmokeReducedMotionMedia() {
      return window.matchMedia?.(REDUCED_MOTION_QUERY) || null;
    },

    nextTrainSmokeEmissionMs(timeMs) {
      return (
        timeMs +
        TRAIN_SMOKE.EMIT_INTERVAL_MS +
        this.randomIntegerInRange(TRAIN_SMOKE.EMIT_JITTER_MS)
      );
    },

    resetTrainSmokePuffState(puffState, startMs) {
      const { puff } = puffState;
      const variation = TRAIN_SMOKE.randomVariation(this);
      const escape = TRAIN_SMOKE.randomEscape(this, puff, variation);

      puff.dataset.trainSmokeShape = variation.shape;
      puff.style.setProperty("--train-smoke-size", `${variation.sizePx}px`);

      Object.assign(puffState, {
        baseDurationMs: variation.baseDurationMs,
        durationMs: variation.baseDurationMs + escape.durationMs,
        endScale: variation.endScale,
        endX: variation.endX,
        endY: variation.endY,
        escapeEndScale: escape.endScale,
        escapeEndX: escape.endX,
        escapeEndY: escape.endY,
        escapeFirstControlX: escape.firstControlX,
        escapeFirstControlY: escape.firstControlY,
        escapeSecondControlX: escape.secondControlX,
        escapeSecondControlY: escape.secondControlY,
        escapeSpinDeg: escape.spinDeg,
        escapeTilt: escape.tilt,
        isEscape: escape.isEscape,
        midX: variation.midX,
        midY: variation.midY,
        opacity: variation.opacity,
        startMs,
        tilt: variation.tilt,
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

      const frame = TRAIN_SMOKE.puffFrameValues(puffState, elapsedMs);

      puff.style.opacity = TRAIN_SMOKE.decimalString(frame.opacity);
      const positionText = [
        `${TRAIN_SMOKE.decimalString(frame.position.x)}px`,
        `${TRAIN_SMOKE.decimalString(frame.position.y)}px`,
        "0",
      ].join(", ");
      puff.style.transform = [
        "translate(-50%, -50%)",
        `translate3d(${positionText})`,
        `scale(${TRAIN_SMOKE.decimalString(frame.scale)})`,
        `rotate(${TRAIN_SMOKE.decimalString(frame.rotate)}deg)`,
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
        emissions < TRAIN_SMOKE.MAX_CATCH_UP_EMISSIONS
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
      const reducedMotionMedia = this.trainSmokeReducedMotionMedia();
      if (reducedMotionMedia?.matches) {
        return;
      }

      const puffs = smoke.querySelectorAll(".pace-train-cloud-puff");
      const startedAtMs = window.performance.now();

      for (const puff of puffs) {
        const puffState = {
          baseDurationMs: 0,
          durationMs: 0,
          endScale: 1,
          endX: 0,
          endY: 0,
          escapeEndScale: 1,
          escapeEndX: 0,
          escapeEndY: 0,
          escapeFirstControlX: 0,
          escapeFirstControlY: 0,
          escapeSecondControlX: 0,
          escapeSecondControlY: 0,
          escapeSpinDeg: 0,
          escapeTilt: 0,
          midX: 0,
          midY: 0,
          opacity: 0,
          puff,
          startMs: 0,
          tilt: 0,
          isEscape: false,
          isActive: false,
        };

        state.puffs.push(puffState);
        state.cleanups.push(() => TRAIN_SMOKE.clearPuffVariation(puff));
      }

      const initialPuffs = Math.min(
        TRAIN_SMOKE.INITIAL_ACTIVE_PUFFS,
        state.puffs.length,
      );
      for (let index = 0; index < initialPuffs; index += 1) {
        const ageMs = (initialPuffs - index - 1) * TRAIN_SMOKE.EMIT_INTERVAL_MS;
        this.emitTrainSmokePuff(state, startedAtMs - ageMs);
      }
      state.nextEmissionMs = this.nextTrainSmokeEmissionMs(startedAtMs);

      state.animationFrameId = window.requestAnimationFrame((timeMs) =>
        this.renderTrainSmokeFrame(state, timeMs),
      );
      state.cleanups.push(
        addMediaChangeListener(reducedMotionMedia, (event) => {
          if (event.matches) {
            const cleanup = this.paceIconEffectCleanups.get(container);
            cleanup?.();
            this.paceIconEffectCleanups.delete(container);
          }
        }),
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
        `${TRAIN_SMOKE.ORIGIN.X_PX}px`,
      );
      smoke.style.setProperty(
        "--train-smoke-origin-y",
        `${TRAIN_SMOKE.ORIGIN.Y_PX}px`,
      );

      container.classList.add("has-pace-icon-effect-train-roll");
      if (this.trainSmokeReducedMotionMedia()?.matches) {
        return;
      }

      for (let index = 0; index < TRAIN_SMOKE.PUFF_POOL_SIZE; index += 1) {
        smoke.append(spanWithClass("pace-train-cloud-puff"));
      }
      container.append(smoke);
      this.startTrainSmokeEffect(container, smoke);
    },
  });
})();
