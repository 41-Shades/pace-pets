(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-wobble-methods.js.",
    );
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
