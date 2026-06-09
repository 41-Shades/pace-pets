(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-speed-lines-methods.js.",
    );
  }

  const SPEED_LINE_DELAY_RANGE_MS = Object.freeze([-1000, -80]);
  const SPEED_LINE_DURATION_RANGE_MS = Object.freeze([1050, 1450]);
  const SPEED_LINE_ORIGIN_BOTTOM = Object.freeze({ x: 11, y: 72 });
  const SPEED_LINE_ORIGIN_INSET_RANGE_PX = Object.freeze([0, 4]);
  const SPEED_LINE_ORIGIN_TOP = Object.freeze({ x: 34, y: 20 });
  const SPEED_LINE_PEAK_OPACITY_RANGE_PERCENT = Object.freeze([36, 58]);
  const SPEED_LINE_PROFILES = Object.freeze([
    Object.freeze({ top: [20, 24], width: [12, 20] }),
    Object.freeze({ top: [33, 39], width: [16, 26] }),
    Object.freeze({ top: [45, 51], width: [8, 15] }),
    Object.freeze({ top: [56, 63], width: [10, 18] }),
    Object.freeze({ top: [68, 72], width: [10, 18] }),
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
      container.classList.remove("has-pace-icon-effect-speed-lines");
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

    renderSpeedLinesEffect(container) {
      this.clearSpeedLinesEffectClasses(container);
      container.classList.add("has-pace-icon-effect-speed-lines");

      const layer = document.createElement("span");
      layer.className = "pace-icon-effect pace-icon-effect-speed-lines";
      layer.setAttribute("aria-hidden", "true");
      const cleanups = [];

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
      this.paceIconEffectCleanups.set(container, () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
        this.clearSpeedLinesEffectClasses(container);
      });
    },
  });
})();
