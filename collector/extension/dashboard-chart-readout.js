(() => {
  "use strict";

  const PACE_LOGIC = globalThis.PacePetsLogic;
  if (!PACE_LOGIC) {
    throw new Error(
      "Pace Pets logic must load before dashboard-chart-readout.js.",
    );
  }
  const CHART_DATA = globalThis.PacePetsDashboardChartData;
  if (!CHART_DATA) {
    throw new Error(
      "Pace Pets dashboard chart data must load before dashboard-chart-readout.js.",
    );
  }

  function percentReadout(label, value) {
    return Number.isFinite(value)
      ? `${label} ${PACE_LOGIC.formatDisplayPercent(value)}`
      : null;
  }

  function pointReadout(point) {
    const paceRatio = PACE_LOGIC.finitePaceRatio(point?.paceRatio ?? point?.y);
    if (!Number.isFinite(point?.x) || paceRatio === null) {
      return null;
    }

    const capped = point.cappedHigh === true || point.cappedLow === true;
    const cappedLabel = capped ? " (capped)" : "";
    const values = [
      percentReadout("Usage", point.remainingPercent),
      percentReadout("Time", point.timePercent),
      `Pace ${CHART_DATA.formatPaceRatio(paceRatio)}${cappedLabel}`,
    ].filter(Boolean);
    return {
      timestamp: CHART_DATA.formatTime(point.x),
      values: values.join(" · "),
    };
  }

  class ChartReadoutController {
    constructor({ container, time, values }) {
      this.container = container;
      this.time = time;
      this.values = values;
    }

    clear() {
      this.container.hidden = true;
      this.time.textContent = "";
      this.values.textContent = "";
    }

    show(point = null) {
      const readout = pointReadout(point);
      if (!readout) {
        this.clear();
        return;
      }

      this.time.textContent = readout.timestamp;
      this.values.textContent = readout.values;
      this.container.hidden = false;
    }
  }

  function createController(options) {
    const controller = new ChartReadoutController(options);
    return Object.freeze({
      clear: controller.clear.bind(controller),
      show: controller.show.bind(controller),
    });
  }

  globalThis.PacePetsDashboardChartReadout = Object.freeze({
    createController,
    pointReadout,
  });
})();
