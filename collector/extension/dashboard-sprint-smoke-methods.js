(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const SPRINT_INTENSITY = globalThis.PacePetsSprintIntensity;
  if (!DATA || !Controller || !SPRINT_INTENSITY) {
    throw new Error(
      "Pace data, sprint intensity, and core must load before dashboard-sprint-smoke-methods.js.",
    );
  }

  const SPRINT_SMOKE_CONTAINER_VARIABLES = Object.freeze([
    "--sprint-ratio-intensity",
    "--sprint-bounce-duration",
    "--sprint-speed-bump-duration",
    "--sprint-speed-bump-y-dip-small",
    "--sprint-speed-bump-y-lift-peak",
    "--sprint-speed-bump-y-lift-mid",
    "--sprint-speed-bump-y-dip-land",
    "--sprint-speed-bump-y-lift-settle",
    "--sprint-speed-bump-y-dip-settle",
    "--sprint-speed-bump-rotate-dip-small",
    "--sprint-speed-bump-rotate-lift-peak",
    "--sprint-speed-bump-rotate-lift-mid",
    "--sprint-speed-bump-rotate-land",
    "--sprint-speed-bump-rotate-settle-lift",
    "--sprint-speed-bump-rotate-settle-dip",
  ]);

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

  function interpolate(range, progress) {
    return range[0] + (range[1] - range[0]) * progress;
  }

  function interpolateIntegerRange(baseRange, targetRange, progress) {
    return baseRange.map((value, index) =>
      Math.round(value + (targetRange[index] - value) * progress),
    );
  }

  function millisecondsString(value) {
    return `${Math.round(value)}ms`;
  }

  function baseVariablesForPuff(puff) {
    return {
      blur: cssNumber(puff, "--smoke-blur", 0.1),
      driftX: cssNumber(puff, "--smoke-drift-x", -58),
      driftY: cssNumber(puff, "--smoke-drift-y", -10),
      duration: cssNumber(puff, "--smoke-duration", 1.65),
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
    puff.style.removeProperty("--smoke-duration");
    puff.style.removeProperty("--smoke-end-scale");
    puff.style.removeProperty("--smoke-mid-opacity");
    puff.style.removeProperty("--smoke-peak-opacity");
    puff.style.removeProperty("--smoke-y-offset");
  }

  function clearSprintSmokeInlineVariables(container) {
    for (const variableName of SPRINT_SMOKE_CONTAINER_VARIABLES) {
      container.style.removeProperty(variableName);
    }
  }

  function setSprintSpeedBumpTransformVariables(
    container,
    dropScale,
    liftScale,
    tiltScale,
  ) {
    const transformVariables = [
      ["--sprint-speed-bump-y-dip-small", 4 * dropScale, "px"],
      ["--sprint-speed-bump-y-lift-peak", -22 * liftScale, "px"],
      ["--sprint-speed-bump-y-lift-mid", -16 * liftScale, "px"],
      ["--sprint-speed-bump-y-dip-land", 5 * dropScale, "px"],
      ["--sprint-speed-bump-y-lift-settle", -7 * liftScale, "px"],
      ["--sprint-speed-bump-y-dip-settle", 2 * dropScale, "px"],
      ["--sprint-speed-bump-rotate-dip-small", 0.8 * tiltScale, "deg"],
      ["--sprint-speed-bump-rotate-lift-peak", -4.2 * tiltScale, "deg"],
      ["--sprint-speed-bump-rotate-lift-mid", -2.4 * tiltScale, "deg"],
      ["--sprint-speed-bump-rotate-land", 2.2 * tiltScale, "deg"],
      ["--sprint-speed-bump-rotate-settle-lift", -1.1 * tiltScale, "deg"],
      ["--sprint-speed-bump-rotate-settle-dip", 0.5 * tiltScale, "deg"],
    ];
    for (const [variableName, value, unit] of transformVariables) {
      container.style.setProperty(
        variableName,
        `${decimalString(value)}${unit}`,
      );
    }
  }

  Object.assign(Controller.prototype, {
    clearSprintSmokeEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-sprint-smoke",
        "is-sprint-speed-bumping",
      );
      container.removeAttribute("data-sprint-bounce-profile");
      container.removeAttribute("data-sprint-smoke-profile");
      clearSprintSmokeInlineVariables(container);
      this.sprintSmokeEffectStates?.delete(container);
    },

    setSprintBounceProfile(container, state = null) {
      container.dataset.sprintBounceProfile = String(
        this.randomIntegerInRange([1, 3]),
      );
      if (state) {
        this.applySprintSmokeIntensity(container, state, state.paceRatio);
      }
    },

    setSprintSmokeProfile(container) {
      container.dataset.sprintSmokeProfile = String(
        this.randomIntegerInRange([1, 3]),
      );
    },

    applySprintSmokePuffVariation(puff, base, intensity = 0) {
      const sprint = DATA.SPRINT_INTENSITY;
      const variation = DATA.SPRINT_SMOKE_VARIATION;
      const blur =
        base.blur +
        this.randomIntegerInRange(variation.BLUR_JITTER_CENTIPX) / 100;
      const duration =
        base.duration *
        interpolate(sprint.SMOKE_DURATION_SCALE_RANGE, intensity);
      const driftX =
        base.driftX * interpolate(sprint.SMOKE_DRIFT_X_SCALE_RANGE, intensity);
      const driftY =
        base.driftY * interpolate(sprint.SMOKE_DRIFT_Y_SCALE_RANGE, intensity);
      const endScale =
        base.endScale +
        interpolate(sprint.SMOKE_END_SCALE_BONUS_RANGE, intensity) +
        this.randomIntegerInRange(variation.END_SCALE_JITTER_PERCENT) / 100;
      const midOpacity =
        base.midOpacity +
        interpolate(sprint.SMOKE_MID_OPACITY_BONUS_RANGE, intensity) +
        this.randomIntegerInRange(variation.MID_OPACITY_JITTER_PERCENT) / 100;
      const peakOpacity =
        base.peakOpacity +
        interpolate(sprint.SMOKE_PEAK_OPACITY_BONUS_RANGE, intensity) +
        this.randomIntegerInRange(variation.PEAK_OPACITY_JITTER_PERCENT) / 100;

      puff.style.setProperty(
        "--smoke-blur",
        `${decimalString(boundedNumber(blur, 0, 0.3))}px`,
      );
      puff.style.setProperty(
        "--smoke-drift-x",
        `${Math.round(
          driftX + this.randomIntegerInRange(variation.DRIFT_X_JITTER_PX),
        )}px`,
      );
      puff.style.setProperty(
        "--smoke-drift-y",
        `${Math.round(
          driftY + this.randomIntegerInRange(variation.DRIFT_Y_JITTER_PX),
        )}px`,
      );
      puff.style.setProperty(
        "--smoke-duration",
        `${decimalString(boundedNumber(duration, 0.78, 2.1))}s`,
      );
      puff.style.setProperty(
        "--smoke-end-scale",
        decimalString(boundedNumber(endScale, 1.24, 2.3)),
      );
      puff.style.setProperty(
        "--smoke-mid-opacity",
        decimalString(boundedNumber(midOpacity, 0.44, 0.94)),
      );
      puff.style.setProperty(
        "--smoke-peak-opacity",
        decimalString(boundedNumber(peakOpacity, 0.62, 0.98)),
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
      const applyVariations = [];
      for (const puff of puffs) {
        const base = baseVariablesForPuff(puff);
        const applyVariation = () => {
          if (state.isActive) {
            this.applySprintSmokePuffVariation(
              puff,
              base,
              state.sprintIntensity,
            );
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
        applyVariations.push(applyVariation);
      }
      state.applyPuffVariations = () => {
        for (const applyVariation of applyVariations) {
          applyVariation();
        }
      };
    },

    scheduleSprintBounceProfile(container, state) {
      state.bounceProfileTimer = window.setTimeout(() => {
        if (!state.isActive) {
          return;
        }
        this.setSprintBounceProfile(container, state);
        this.scheduleSprintBounceProfile(container, state);
      }, this.randomIntegerInRange(DATA.SPRINT_BOUNCE_PROFILE_DELAY_RANGE_MS));
    },

    scheduleSprintSpeedBump(container, state) {
      state.speedBumpTimer = window.setTimeout(() => {
        state.speedBumpTimer = null;
        this.runSprintSpeedBump(container, state);
      }, this.randomIntegerInRange(state.speedBumpDelayRangeMs));
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
      }, state.speedBumpDurationMs);
    },

    applySprintSmokeIntensity(container, state, paceRatio) {
      const intensity = SPRINT_INTENSITY.intensityForRatio(paceRatio);
      const sprint = DATA.SPRINT_INTENSITY;
      const baseBounceDurationMs = cssNumber(
        container,
        "--sprint-bounce-base-duration",
        640,
      );
      const bounceDurationMs =
        baseBounceDurationMs *
        interpolate(sprint.BOUNCE_DURATION_SCALE_RANGE, intensity);

      state.paceRatio = Number.isFinite(Number(paceRatio))
        ? Number(paceRatio)
        : null;
      state.sprintIntensity = intensity;
      state.speedBumpDelayRangeMs = interpolateIntegerRange(
        DATA.SPRINT_SPEED_BUMP_DELAY_RANGE_MS,
        sprint.SPEED_BUMP_DELAY_RANGE_MS,
        intensity,
      );
      state.speedBumpDurationMs = Math.round(
        DATA.SPRINT_SPEED_BUMP_DURATION_MS +
          (sprint.SPEED_BUMP_DURATION_MS - DATA.SPRINT_SPEED_BUMP_DURATION_MS) *
            intensity,
      );
      const speedBumpDropScale = interpolate(
        sprint.SPEED_BUMP_DROP_SCALE_RANGE,
        intensity,
      );
      const speedBumpLiftScale = interpolate(
        sprint.SPEED_BUMP_LIFT_SCALE_RANGE,
        intensity,
      );
      const speedBumpTiltScale = interpolate(
        sprint.SPEED_BUMP_TILT_SCALE_RANGE,
        intensity,
      );

      container.style.setProperty(
        "--sprint-ratio-intensity",
        decimalString(intensity),
      );
      container.style.setProperty(
        "--sprint-bounce-duration",
        millisecondsString(bounceDurationMs),
      );
      container.style.setProperty(
        "--sprint-speed-bump-duration",
        millisecondsString(state.speedBumpDurationMs),
      );
      setSprintSpeedBumpTransformVariables(
        container,
        speedBumpDropScale,
        speedBumpLiftScale,
        speedBumpTiltScale,
      );
      state.applyPuffVariations?.();
    },

    updateSprintSmokeIntensity(paceRatio) {
      const container = this.elements.paceIcon;
      const state = this.sprintSmokeEffectStates?.get(container);
      if (state) {
        this.applySprintSmokeIntensity(container, state, paceRatio);
      }
    },

    startSprintSmokeEffect(container, layer) {
      const state = {
        applyPuffVariations: null,
        bounceProfileTimer: null,
        cleanups: [],
        isActive: true,
        paceRatio: null,
        speedBumpDelayRangeMs: DATA.SPRINT_SPEED_BUMP_DELAY_RANGE_MS,
        speedBumpDurationMs: DATA.SPRINT_SPEED_BUMP_DURATION_MS,
        speedBumpSettleTimer: null,
        speedBumpTimer: null,
        sprintIntensity: 0,
      };

      this.clearSprintSmokeEffectClasses(container);
      container.classList.add("has-pace-icon-effect-sprint-smoke");
      this.sprintSmokeEffectStates ??= new WeakMap();
      this.sprintSmokeEffectStates.set(container, state);
      this.setSprintBounceProfile(container, state);
      this.setSprintSmokeProfile(container);
      this.startSprintSmokePuffVariation(layer, state);
      this.applySprintSmokeIntensity(container, state, null);
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
