(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-sprint-smoke-methods.js.",
    );
  }

  function boundedNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cssNumber(element, propertyName, fallback) {
    const value = Number.parseFloat(
      window.getComputedStyle(element).getPropertyValue(propertyName),
    );
    return Number.isFinite(value) ? value : fallback;
  }

  function decimalString(value) {
    return String(Math.round(value * 100) / 100);
  }

  function baseVariablesForPuff(puff) {
    return {
      blur: cssNumber(puff, "--smoke-blur", 0.1),
      driftX: cssNumber(puff, "--smoke-drift-x", -58),
      driftY: cssNumber(puff, "--smoke-drift-y", -10),
      endScale: cssNumber(puff, "--smoke-end-scale", 1.58),
      midOpacity: cssNumber(puff, "--smoke-mid-opacity", 0.72),
      peakOpacity: cssNumber(puff, "--smoke-peak-opacity", 0.92),
      yOffset: cssNumber(puff, "--smoke-y-offset", 0),
    };
  }

  function clearPuffVariation(puff) {
    puff.style.removeProperty("--smoke-blur");
    puff.style.removeProperty("--smoke-drift-x");
    puff.style.removeProperty("--smoke-drift-y");
    puff.style.removeProperty("--smoke-end-scale");
    puff.style.removeProperty("--smoke-mid-opacity");
    puff.style.removeProperty("--smoke-peak-opacity");
    puff.style.removeProperty("--smoke-y-offset");
  }

  Object.assign(Controller.prototype, {
    clearSprintSmokeEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-sprint-smoke",
        "is-sprint-speed-bumping",
      );
      container.removeAttribute("data-sprint-bounce-profile");
      container.removeAttribute("data-sprint-smoke-profile");
    },

    setSprintBounceProfile(container) {
      container.dataset.sprintBounceProfile = String(
        this.randomIntegerInRange([1, 3]),
      );
    },

    setSprintSmokeProfile(container) {
      container.dataset.sprintSmokeProfile = String(
        this.randomIntegerInRange([1, 3]),
      );
    },

    applySprintSmokePuffVariation(puff, base) {
      const variation = DATA.SPRINT_SMOKE_VARIATION;
      const blur =
        base.blur +
        this.randomIntegerInRange(variation.BLUR_JITTER_CENTIPX) / 100;
      const endScale =
        base.endScale +
        this.randomIntegerInRange(variation.END_SCALE_JITTER_PERCENT) / 100;
      const midOpacity =
        base.midOpacity +
        this.randomIntegerInRange(variation.MID_OPACITY_JITTER_PERCENT) / 100;
      const peakOpacity =
        base.peakOpacity +
        this.randomIntegerInRange(variation.PEAK_OPACITY_JITTER_PERCENT) / 100;

      puff.style.setProperty(
        "--smoke-blur",
        `${decimalString(boundedNumber(blur, 0, 0.3))}px`,
      );
      puff.style.setProperty(
        "--smoke-drift-x",
        `${
          base.driftX + this.randomIntegerInRange(variation.DRIFT_X_JITTER_PX)
        }px`,
      );
      puff.style.setProperty(
        "--smoke-drift-y",
        `${
          base.driftY + this.randomIntegerInRange(variation.DRIFT_Y_JITTER_PX)
        }px`,
      );
      puff.style.setProperty(
        "--smoke-end-scale",
        decimalString(boundedNumber(endScale, 1.24, 1.82)),
      );
      puff.style.setProperty(
        "--smoke-mid-opacity",
        decimalString(boundedNumber(midOpacity, 0.44, 0.8)),
      );
      puff.style.setProperty(
        "--smoke-peak-opacity",
        decimalString(boundedNumber(peakOpacity, 0.62, 0.96)),
      );
      puff.style.setProperty(
        "--smoke-y-offset",
        `${
          base.yOffset + this.randomIntegerInRange(variation.Y_OFFSET_JITTER_PX)
        }px`,
      );
    },

    startSprintSmokePuffVariation(layer, state) {
      const puffs = layer.querySelectorAll(".pace-smoke-puff");
      for (const puff of puffs) {
        const base = baseVariablesForPuff(puff);
        const applyVariation = () => {
          if (state.isActive) {
            this.applySprintSmokePuffVariation(puff, base);
          }
        };
        const handleIteration = () => {
          applyVariation();
        };

        applyVariation();
        puff.addEventListener("animationiteration", handleIteration);
        state.cleanups.push(() => {
          puff.removeEventListener("animationiteration", handleIteration);
          clearPuffVariation(puff);
        });
      }
    },

    scheduleSprintBounceProfile(container, state) {
      state.bounceProfileTimer = window.setTimeout(() => {
        if (!state.isActive) {
          return;
        }
        this.setSprintBounceProfile(container);
        this.scheduleSprintBounceProfile(container, state);
      }, this.randomIntegerInRange(DATA.SPRINT_BOUNCE_PROFILE_DELAY_RANGE_MS));
    },

    scheduleSprintSpeedBump(container, state) {
      state.speedBumpTimer = window.setTimeout(() => {
        state.speedBumpTimer = null;
        this.runSprintSpeedBump(container, state);
      }, this.randomIntegerInRange(DATA.SPRINT_SPEED_BUMP_DELAY_RANGE_MS));
    },

    runSprintSpeedBump(container, state) {
      if (!state.isActive) {
        return;
      }

      container.classList.add("is-sprint-speed-bumping");
      state.speedBumpSettleTimer = window.setTimeout(() => {
        state.speedBumpSettleTimer = null;
        container.classList.remove("is-sprint-speed-bumping");
        if (state.isActive) {
          this.scheduleSprintSpeedBump(container, state);
        }
      }, DATA.SPRINT_SPEED_BUMP_DURATION_MS);
    },

    startSprintSmokeEffect(container, layer) {
      const state = {
        bounceProfileTimer: null,
        cleanups: [],
        isActive: true,
        speedBumpSettleTimer: null,
        speedBumpTimer: null,
      };

      this.clearSprintSmokeEffectClasses(container);
      container.classList.add("has-pace-icon-effect-sprint-smoke");
      this.setSprintBounceProfile(container);
      this.setSprintSmokeProfile(container);
      this.startSprintSmokePuffVariation(layer, state);
      this.scheduleSprintBounceProfile(container, state);
      this.scheduleSprintSpeedBump(container, state);

      this.paceIconEffectCleanups.set(container, () => {
        state.isActive = false;
        window.clearTimeout(state.bounceProfileTimer);
        window.clearTimeout(state.speedBumpSettleTimer);
        window.clearTimeout(state.speedBumpTimer);
        for (const cleanup of state.cleanups) {
          cleanup();
        }
        this.clearSprintSmokeEffectClasses(container);
      });
    },
  });
})();
