(() => {
  "use strict";

  const CHART_DATA = globalThis.PacePetsDashboardChartData;
  if (!CHART_DATA) {
    throw new Error(
      "Pace Pets dashboard chart data must load before dashboard-chart.js.",
    );
  }
  const CHART_CONFIG = globalThis.PacePetsDashboardChartConfig;
  if (!CHART_CONFIG) {
    throw new Error(
      "Pace Pets dashboard chart config must load before dashboard-chart.js.",
    );
  }
  const CHART_READOUT = globalThis.PacePetsDashboardChartReadout;
  if (!CHART_READOUT) {
    throw new Error(
      "Pace Pets dashboard chart readout must load before dashboard-chart.js.",
    );
  }

  class UsageChartRenderer {
    constructor({
      chartCanvas,
      chartFrame,
      chartInspection,
      chartInspectionTime,
      chartInspectionValues,
      chartState,
      windowSpecs,
    }) {
      this.chartCanvas = chartCanvas;
      this.chartFrame = chartFrame;
      this.chartReadout = CHART_READOUT.createController({
        container: chartInspection,
        time: chartInspectionTime,
        values: chartInspectionValues,
      });
      this.chartCanvas.addEventListener("mouseleave", this.chartReadout.clear);
      this.chartCanvas.addEventListener("touchend", this.chartReadout.clear);
      this.chartCanvas.addEventListener("touchcancel", this.chartReadout.clear);
      this.chartState = chartState;
      this.windowSpecs = windowSpecs;
      this.historyContext = null;
      this.usageChart = null;
    }

    registeredUsageChart() {
      if (
        !globalThis.Chart ||
        typeof globalThis.Chart.getChart !== "function"
      ) {
        return null;
      }
      return globalThis.Chart.getChart(this.chartCanvas) || null;
    }

    destroy() {
      const registeredChart = this.registeredUsageChart();
      if (this.usageChart) {
        this.usageChart.destroy();
      }
      if (registeredChart && registeredChart !== this.usageChart) {
        registeredChart.destroy();
      }
      this.usageChart = null;
    }

    setEmpty(message, { preserveHistoryContext = false } = {}) {
      if (!preserveHistoryContext) {
        this.historyContext = null;
      }
      this.destroy();
      this.chartReadout.clear();
      this.chartFrame.classList.add("empty");
      this.chartFrame.classList.remove("empty-data");
      this.chartCanvas.hidden = true;
      this.chartState.hidden = false;
      this.chartState.textContent = message;
    }

    chartAriaLabel(spec, preview, hasCappedPoints = false) {
      const previewLabel = preview ? " preview" : "";
      const cappedLabel = hasCappedPoints
        ? "; some extreme points are capped"
        : "";
      return `${spec.chartSampleLabel} pace ratio across active reset window${previewLabel}${cappedLabel}`;
    }

    showChartCanvas(spec, preview) {
      this.chartFrame.classList.remove("empty");
      this.chartFrame.classList.remove("empty-data");
      this.chartCanvas.hidden = false;
      this.chartCanvas.setAttribute(
        "aria-label",
        this.chartAriaLabel(spec, preview),
      );
      this.chartState.hidden = true;
    }

    updateChart(config) {
      this.usageChart = this.usageChart || this.registeredUsageChart();
      if (!this.usageChart) {
        this.usageChart = new globalThis.Chart(
          this.chartCanvas.getContext("2d"),
          config,
        );
        return;
      }

      this.usageChart.data.datasets = config.data.datasets;
      this.usageChart.options.interaction = config.options.interaction;
      this.usageChart.options.onHover = config.options.onHover;
      this.usageChart.options.plugins = config.options.plugins;
      this.usageChart.options.scales.x = config.options.scales.x;
      this.usageChart.options.scales.y = config.options.scales.y;
      this.usageChart.update();
    }

    renderEmptyData({ atMs = Date.now(), windowData = null, windowKey }) {
      this.historyContext = null;
      this.chartReadout.clear();
      const spec = this.windowSpecs[windowKey];
      if (!globalThis.Chart) {
        this.setEmpty("Chart.js did not load from the extension asset.");
        return;
      }

      this.chartFrame.classList.remove("empty");
      this.chartFrame.classList.add("empty-data");
      this.chartCanvas.hidden = false;
      this.chartCanvas.setAttribute(
        "aria-label",
        `${spec.chartSampleLabel} pace ratio across active reset window with no data`,
      );
      this.chartState.hidden = true;
      this.updateChart(CHART_CONFIG.emptyUsageChartConfig(windowData, atMs));
    }

    renderPoints(
      points,
      windowKey,
      windowData,
      { atMs = Date.now(), preview = false } = {},
    ) {
      const spec = this.windowSpecs[windowKey];
      if (!globalThis.Chart) {
        this.setEmpty("Chart.js did not load from the extension asset.");
        return;
      }

      if (points.length < 2) {
        this.setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY);
        return;
      }

      this.showChartCanvas(spec, preview);
      const config = CHART_CONFIG.usageChartConfig(
        points,
        windowData,
        atMs,
        this.chartReadout.show,
      );
      const yBounds = config.options.scales.y;
      const hasCappedPoints = CHART_DATA.hasCappedPacePoints(points, yBounds);
      this.chartCanvas.setAttribute(
        "aria-label",
        this.chartAriaLabel(spec, preview, hasCappedPoints),
      );
      this.updateChart(config);
    }

    renderPreview({
      atMs = Date.now(),
      paceRatio,
      summaryWindowKey,
      windowData,
    }) {
      this.historyContext = null;
      const points = CHART_DATA.previewPaceChartPoints(paceRatio, windowData, {
        atMs,
      });
      this.renderPoints(points, summaryWindowKey, windowData, {
        atMs,
        preview: true,
      });
    }

    renderHistory({
      atMs = Date.now(),
      hasResetTiming,
      history,
      summaryWindow,
      summaryWindowKey,
    }) {
      const chartSpec = this.windowSpecs[summaryWindowKey];
      if (!summaryWindow) {
        this.setEmpty(`Waiting for ${chartSpec.chartSampleLabel} usage.`);
        return;
      }

      if (!hasResetTiming) {
        this.setEmpty(
          `${chartSpec.chartSampleLabel} reset timing unavailable.`,
        );
        return;
      }

      const samples = CHART_DATA.resetWindowSamples(
        history,
        summaryWindowKey,
        summaryWindow,
      );
      const historicalPoints = CHART_DATA.paceChartPoints(
        samples,
        summaryWindowKey,
      );
      this.historyContext = {
        historicalPoints,
        latestSample: samples[samples.length - 1] || null,
        summaryWindow,
        summaryWindowKey,
      };
      const points = this.historyPointsAt(atMs);
      if (points.length < 2) {
        this.setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY, {
          preserveHistoryContext: true,
        });
        return;
      }

      this.renderPoints(points, summaryWindowKey, summaryWindow, { atMs });
    }

    historyPointsAt(atMs) {
      const context = this.historyContext;
      return context
        ? CHART_DATA.paceChartPointsWithLivePoint(
            context.historicalPoints,
            context.latestSample,
            context.summaryWindow,
            atMs,
          )
        : [];
    }

    refreshHistoryLivePoint({ atMs, summaryWindow, summaryWindowKey }) {
      const context = this.historyContext;
      if (
        !context ||
        context.summaryWindowKey !== summaryWindowKey ||
        context.summaryWindow?.resetsAt !== summaryWindow?.resetsAt
      ) {
        return false;
      }

      const points = this.historyPointsAt(atMs);
      if (points.length < 2) {
        this.setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY, {
          preserveHistoryContext: true,
        });
        return false;
      }

      this.usageChart = this.usageChart || this.registeredUsageChart();
      if (!this.usageChart) {
        this.renderPoints(points, summaryWindowKey, summaryWindow, { atMs });
        return true;
      }

      const config = CHART_CONFIG.usageChartConfig(
        points,
        summaryWindow,
        atMs,
        this.chartReadout.show,
      );
      const yBounds = config.options.scales.y;
      this.usageChart.data.datasets = config.data.datasets;
      this.usageChart.options.scales.y = yBounds;
      this.chartCanvas.setAttribute(
        "aria-label",
        this.chartAriaLabel(
          this.windowSpecs[summaryWindowKey],
          false,
          CHART_DATA.hasCappedPacePoints(points, yBounds),
        ),
      );
      this.usageChart.update("none");
      return true;
    }
  }

  function createRenderer(options) {
    const renderer = new UsageChartRenderer(options);
    return Object.freeze({
      renderEmptyData: renderer.renderEmptyData.bind(renderer),
      renderHistory: renderer.renderHistory.bind(renderer),
      renderPreview: renderer.renderPreview.bind(renderer),
      refreshHistoryLivePoint: renderer.refreshHistoryLivePoint.bind(renderer),
      setEmpty: renderer.setEmpty.bind(renderer),
    });
  }

  globalThis.PacePetsDashboardChart = Object.freeze({
    createRenderer,
  });
})();
