(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-speed-lines-methods.js.",
    );
  }

  const SPEED_LINE_DELAY_RANGE_MS = Object.freeze([-1000, -80]);
  const SPEED_LINE_DURATION_RANGE_MS = Object.freeze([1250, 1450]);
  const SPEED_LINE_EXTREME_ORBIT_CHANCE_PERCENT = 25;
  const SPEED_LINE_EXTREME_ORBIT_CENTER_Y_RANGE_PX = Object.freeze([-18, 18]);
  const SPEED_LINE_EXTREME_ORBIT_LOOP_COUNT = 18;
  const SPEED_LINE_LAUNCH_DURATION_MS = 390;
  const SPEED_LINE_NORMAL_ORBIT_LOOP_COUNT = 5;
  const SPEED_LINE_ORBIT_DELAY_RANGE_MS = Object.freeze([4000, 7000]);
  const SPEED_LINE_ORBIT_LOOP_DURATION_MS = 150;
  const SPEED_LINE_ORIGIN_BOTTOM = Object.freeze({ x: 11, y: 72 });
  const SPEED_LINE_ORIGIN_INSET_RANGE_PX = Object.freeze([0, 4]);
  const SPEED_LINE_ORIGIN_TOP = Object.freeze({ x: 34, y: 20 });
  const SPEED_LINE_PEAK_OPACITY_RANGE_PERCENT = Object.freeze([36, 58]);
  const SPEED_LINE_PROFILES = Object.freeze([
    Object.freeze({ top: [20, 24], width: [12, 20] }),
    Object.freeze({ top: [33, 39], width: [16, 26] }),
    Object.freeze({ top: [45, 51], width: [9, 12] }),
    Object.freeze({ top: [56, 63], width: [8, 11] }),
    Object.freeze({ top: [68, 72], width: [7, 10] }),
  ]);

  function decimalString(value) {
    return String(Math.round(value * 100) / 100);
  }

  function speedLineOriginXAt(topPx) {
    const progress =
      (topPx - SPEED_LINE_ORIGIN_TOP.y) /
      (SPEED_LINE_ORIGIN_BOTTOM.y - SPEED_LINE_ORIGIN_TOP.y);
    return (
      SPEED_LINE_ORIGIN_TOP.x +
      (SPEED_LINE_ORIGIN_BOTTOM.x - SPEED_LINE_ORIGIN_TOP.x) * progress
    );
  }

  Object.assign(Controller.prototype, {
    clearSpeedLinesEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-speed-lines",
        "is-speed-launching",
        "is-speed-orbiting",
        "is-speed-orbiting-extreme",
      );
      container.style.removeProperty("--speed-orbit-center-y");
    },

    applySpeedLineVariation(line, profile, useInitialDelay = false) {
      const peakOpacity =
        this.randomIntegerInRange(SPEED_LINE_PEAK_OPACITY_RANGE_PERCENT) / 100;
      const topPx = this.randomIntegerInRange(profile.top);
      const widthPx = this.randomIntegerInRange(profile.width);
      const originInsetPx = this.randomIntegerInRange(
        SPEED_LINE_ORIGIN_INSET_RANGE_PX,
      );
      const leftPx = Math.round(
        speedLineOriginXAt(topPx) - widthPx - originInsetPx,
      );
      line.style.setProperty(
        "--speed-line-duration",
        `${this.randomIntegerInRange(SPEED_LINE_DURATION_RANGE_MS)}ms`,
      );
      line.style.setProperty("--speed-line-left", `${leftPx}px`);
      line.style.setProperty(
        "--speed-line-mid-opacity",
        decimalString(peakOpacity * 0.52),
      );
      line.style.setProperty(
        "--speed-line-peak-opacity",
        decimalString(peakOpacity),
      );
      line.style.setProperty("--speed-line-top", `${topPx}px`);
      line.style.setProperty("--speed-line-width", `${widthPx}px`);
      if (useInitialDelay) {
        line.style.setProperty(
          "--speed-line-delay",
          `${this.randomIntegerInRange(SPEED_LINE_DELAY_RANGE_MS)}ms`,
        );
      }
    },

    applyExtremeSpeedLineOrbitWobble(container) {
      container.style.setProperty(
        "--speed-orbit-center-y",
        `${this.randomIntegerInRange(
          SPEED_LINE_EXTREME_ORBIT_CENTER_Y_RANGE_PX,
        )}px`,
      );
    },

    scheduleSpeedLineOrbit(container, state) {
      state.orbitTimer = window.setTimeout(() => {
        state.orbitTimer = null;
        this.runSpeedLineOrbit(container, state);
      }, this.randomIntegerInRange(SPEED_LINE_ORBIT_DELAY_RANGE_MS));
    },

    speedLineOrbitLoopCount(state) {
      if (!state.hasCompletedOrbit) {
        return SPEED_LINE_NORMAL_ORBIT_LOOP_COUNT;
      }

      return this.randomIntegerInRange([1, 100]) <=
        SPEED_LINE_EXTREME_ORBIT_CHANCE_PERCENT
        ? SPEED_LINE_EXTREME_ORBIT_LOOP_COUNT
        : SPEED_LINE_NORMAL_ORBIT_LOOP_COUNT;
    },

    startExtremeSpeedLineOrbitWobble(container, state) {
      const image = container.querySelector("img");
      if (!image) {
        return;
      }

      this.applyExtremeSpeedLineOrbitWobble(container);
      const handleIteration = () => {
        if (state.isActive) {
          this.applyExtremeSpeedLineOrbitWobble(container);
        }
      };
      image.addEventListener("animationiteration", handleIteration);
      state.orbitWobbleCleanup = () => {
        image.removeEventListener("animationiteration", handleIteration);
        container.style.removeProperty("--speed-orbit-center-y");
        state.orbitWobbleCleanup = null;
      };
    },

    stopExtremeSpeedLineOrbitWobble(container, state) {
      if (state.orbitWobbleCleanup) {
        state.orbitWobbleCleanup();
        return;
      }

      container.style.removeProperty("--speed-orbit-center-y");
    },

    runSpeedLineOrbit(container, state) {
      if (!state.isActive) {
        return;
      }

      const orbitLoopCount = this.speedLineOrbitLoopCount(state);
      const isExtreme = orbitLoopCount === SPEED_LINE_EXTREME_ORBIT_LOOP_COUNT;

      container.classList.add("is-speed-launching");
      state.launchTimer = window.setTimeout(() => {
        state.launchTimer = null;
        container.classList.remove("is-speed-launching");
        if (!state.isActive) {
          return;
        }

        if (isExtreme) {
          this.startExtremeSpeedLineOrbitWobble(container, state);
        } else {
          this.stopExtremeSpeedLineOrbitWobble(container, state);
        }
        container.classList.add("is-speed-orbiting");
        container.classList.toggle("is-speed-orbiting-extreme", isExtreme);
        state.orbitSettleTimer = window.setTimeout(() => {
          state.orbitSettleTimer = null;
          this.stopExtremeSpeedLineOrbitWobble(container, state);
          container.classList.remove(
            "is-speed-orbiting",
            "is-speed-orbiting-extreme",
          );
          state.hasCompletedOrbit = true;
          if (state.isActive) {
            this.scheduleSpeedLineOrbit(container, state);
          }
        }, SPEED_LINE_ORBIT_LOOP_DURATION_MS * orbitLoopCount);
      }, SPEED_LINE_LAUNCH_DURATION_MS);
    },

    renderSpeedLinesEffect(container) {
      this.clearSpeedLinesEffectClasses(container);
      container.classList.add("has-pace-icon-effect-speed-lines");

      const layer = document.createElement("span");
      layer.className = "pace-icon-effect pace-icon-effect-speed-lines";
      layer.setAttribute("aria-hidden", "true");
      const cleanups = [];
      const state = {
        hasCompletedOrbit: false,
        isActive: true,
        launchTimer: null,
        orbitSettleTimer: null,
        orbitTimer: null,
        orbitWobbleCleanup: null,
      };

      SPEED_LINE_PROFILES.forEach((profile, profileIndex) => {
        const line = document.createElement("span");
        const lineIndex = profileIndex + 1;
        line.className = `pace-speed-line pace-speed-line-${lineIndex}`;
        this.applySpeedLineVariation(line, profile, true);
        const handleIteration = () => {
          this.applySpeedLineVariation(line, profile);
        };
        line.addEventListener("animationiteration", handleIteration);
        cleanups.push(() => {
          line.removeEventListener("animationiteration", handleIteration);
        });
        layer.append(line);
      });

      container.append(layer);
      this.scheduleSpeedLineOrbit(container, state);
      this.paceIconEffectCleanups.set(container, () => {
        state.isActive = false;
        window.clearTimeout(state.launchTimer);
        window.clearTimeout(state.orbitSettleTimer);
        window.clearTimeout(state.orbitTimer);
        this.stopExtremeSpeedLineOrbitWobble(container, state);
        for (const cleanup of cleanups) {
          cleanup();
        }
        this.clearSpeedLinesEffectClasses(container);
      });
    },
  });
})();
