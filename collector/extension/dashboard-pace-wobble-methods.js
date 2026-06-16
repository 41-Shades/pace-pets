(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const BRAKE_EXTREME_PREVIEW = globalThis.PacePetsBrakeExtremePreviewControl;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !BRAKE_EXTREME_PREVIEW || !Controller) {
    throw new Error(
      "Pace data, preview controls, and core must load before dashboard-pace-wobble-methods.js.",
    );
  }

  function burstChancePercentValue(chancePercent) {
    const numericChance = Number(chancePercent);
    return Number.isFinite(numericChance)
      ? Math.min(100, Math.max(0, numericChance))
      : 0;
  }

  function brakeWobbleRangeKeyForRoll(controller) {
    const roll = controller.randomIntegerInRange([1, 100]);
    let cumulativeChance = 0;
    for (const entry of DATA.BRAKE_WOBBLE_BURST_CHANCES_PERCENT) {
      cumulativeChance += burstChancePercentValue(entry.chancePercent);
      if (roll <= cumulativeChance) {
        return entry.rangeKey;
      }
    }
    return "normal";
  }

  function brakeWobbleShakeCountForRange(controller, rangeKey) {
    const shakeRange =
      rangeKey === "extreme"
        ? DATA.BRAKE_WOBBLE_EXTREME_SHAKE_COUNT_RANGE
        : DATA.BRAKE_WOBBLE_SHAKE_COUNT_RANGE;
    return controller.randomIntegerInRange(shakeRange);
  }

  function brakeDebrisState({ isActive = true, isFirstBurst = true } = {}) {
    return {
      debrisAnimationCleanups: new Set(),
      debrisLayers: new Set(),
      debrisTimers: new Set(),
      delayTimer: null,
      isFirstBurst,
      isActive,
      settleTimer: null,
    };
  }

  Object.assign(Controller.prototype, {
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
      const rangeKey = state.isFirstBurst
        ? "normal"
        : brakeWobbleRangeKeyForRoll(this);
      state.isFirstBurst = false;
      const shakeCount = brakeWobbleShakeCountForRange(this, rangeKey);
      return { rangeKey, shakeCount };
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
      if (burst.rangeKey !== "normal") {
        container.dataset.brakeWobbleRange = burst.rangeKey;
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

    launchBrakeExtremeDebrisPreview() {
      const brakeHardClassName = DATA.PACE_STATES.criticalBehind.className;
      if (this.currentPaceLevel() !== brakeHardClassName) {
        return {
          message: BRAKE_EXTREME_PREVIEW.fallbackErrorMessage,
          ok: false,
        };
      }
      if (this.motionPreferenceEnabled?.() === false) {
        return {
          message: "Turn motion on before previewing Max debris burst.",
          ok: false,
        };
      }

      const container = this.elements.paceIcon;
      const burst = {
        rangeKey: "extreme",
        shakeCount: DATA.BRAKE_WOBBLE_EXTREME_SHAKE_COUNT_RANGE[1],
      };
      const durationMs =
        DATA.BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT[burst.shakeCount];
      const state = brakeDebrisState({ isFirstBurst: false });
      container.dataset.brakeWobbleRange = burst.rangeKey;
      container.dataset.brakeWobbleShakes = String(burst.shakeCount);
      container.classList.add("is-brake-wobbling");
      this.launchBrakeDebrisBurst(container, burst, state);
      window.setTimeout(
        () => this.clearBrakeWobbleBurstClasses(container),
        durationMs,
      );
      return { ok: true };
    },

    bindBrakeExtremePreviewRequests() {
      if (
        this.brakeExtremePreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }

      this.brakeExtremePreviewRequestsBound = true;
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!BRAKE_EXTREME_PREVIEW.isMaxBurstMessage(message)) {
            return false;
          }

          sendResponse?.(this.launchBrakeExtremeDebrisPreview());
          return false;
        },
      );
    },

    startBrakeWobbleEffect(container) {
      const state = brakeDebrisState();

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
        cartSpillPileColumns: new Map(),
        cartSpillPileLayer: null,
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
  });
})();
