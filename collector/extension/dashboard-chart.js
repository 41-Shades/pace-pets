(() => {
  "use strict";

  const CHART_DATA = globalThis.PacePetsDashboardChartData;
  if (!CHART_DATA) {
    throw new Error(
      "Pace Pets dashboard chart data must load before dashboard-chart.js.",
    );
  }

  const DEFAULT_CHART_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const MS_PER_MINUTE = 60 * 1000;

  function chartWindowRange(windowData) {
    return (
      CHART_DATA.chartWindowBounds(windowData) || {
        min: Date.now() - DEFAULT_CHART_WINDOW_MS,
        max: Date.now(),
      }
    );
  }

  function chartTooltipOptions(colors) {
    return {
      backgroundColor: colors.tooltipBg,
      bodyColor: colors.tooltipText,
      borderColor: colors.tooltipBorder,
      borderWidth: 1,
      caretSize: 5,
      cornerRadius: 6,
      displayColors: false,
      padding: 8,
      titleColor: colors.tooltipText,
      bodyFont: {
        size: 12,
        weight: "560",
      },
      titleFont: {
        size: 12,
        weight: "600",
      },
      callbacks: {
        label(context) {
          const paceRatio = context.raw?.paceRatio ?? context.parsed.y;
          const capped =
            context.raw?.cappedHigh === true || context.raw?.cappedLow === true;
          return capped
            ? `Pace: ${CHART_DATA.formatPaceRatio(paceRatio)} (capped)`
            : `Pace: ${CHART_DATA.formatPaceRatio(paceRatio)}`;
        },
        title(items) {
          return items[0] ? CHART_DATA.formatTime(items[0].parsed.x) : "";
        },
      },
    };
  }

  function xScaleOptions({ max, min }) {
    return {
      type: "linear",
      min,
      max,
      afterBuildTicks(scale) {
        scale.ticks = [{ value: min }, { value: max }];
      },
      border: {
        display: false,
      },
      grid: {
        display: false,
      },
      ticks: {
        display: false,
      },
    };
  }

  function yGridOptions(colors) {
    return {
      color(context) {
        return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO
          ? colors.perfectLine
          : "transparent";
      },
      drawTicks: false,
      lineWidth(context) {
        return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO ? 1 : 0;
      },
    };
  }

  function yScaleOptions(yBounds, colors) {
    return {
      min: yBounds.min,
      max: yBounds.max,
      afterBuildTicks(scale) {
        scale.ticks = [
          { value: yBounds.min },
          { value: CHART_DATA.PERFECT_PACE_RATIO },
          { value: yBounds.max },
        ];
      },
      border: {
        display: false,
      },
      grid: yGridOptions(colors),
      ticks: {
        display: false,
      },
    };
  }

  function usageChartConfig(points, windowData) {
    const colors = CHART_DATA.chartColors();
    const yBounds = CHART_DATA.ratioChartBounds(points);
    return {
      type: "line",
      data: {
        datasets: [CHART_DATA.paceChartDataset(points, colors, yBounds)],
      },
      options: {
        animation: false,
        interaction: {
          axis: "x",
          intersect: false,
          mode: "nearest",
        },
        maintainAspectRatio: false,
        normalized: true,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: chartTooltipOptions(colors),
        },
        scales: {
          x: xScaleOptions(chartWindowRange(windowData)),
          y: yScaleOptions(yBounds, colors),
        },
      },
    };
  }

  class UsageChartRenderer {
    constructor({ chartCanvas, chartFrame, chartState, windowSpecs }) {
      this.chartCanvas = chartCanvas;
      this.chartFrame = chartFrame;
      this.chartState = chartState;
      this.windowSpecs = windowSpecs;
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

    setEmpty(message) {
      this.destroy();
      this.chartFrame.classList.add("empty");
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
      this.usageChart.options.plugins = config.options.plugins;
      this.usageChart.options.scales.x = config.options.scales.x;
      this.usageChart.options.scales.y = config.options.scales.y;
      this.usageChart.update();
    }

    renderPoints(points, windowKey, windowData, { preview = false } = {}) {
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
      const config = usageChartConfig(points, windowData);
      const yBounds = config.options.scales.y;
      const hasCappedPoints = CHART_DATA.hasCappedPacePoints(points, yBounds);
      this.chartCanvas.setAttribute(
        "aria-label",
        this.chartAriaLabel(spec, preview, hasCappedPoints),
      );
      this.updateChart(config);
    }

    render(samples, windowKey, windowData) {
      this.renderPoints(
        CHART_DATA.paceChartPoints(samples, windowKey),
        windowKey,
        windowData,
      );
    }

    previewDurationMinutes(windowKey, windowData) {
      const windowMinutes = Number(windowData?.windowMinutes);
      if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
        return windowMinutes;
      }

      const specDurationMinutes = Number(
        this.windowSpecs[windowKey]?.durationMinutes,
      );
      return Number.isFinite(specDurationMinutes) && specDurationMinutes > 0
        ? specDurationMinutes
        : DEFAULT_CHART_WINDOW_MS / MS_PER_MINUTE;
    }

    previewWindowData({ atMs, percentPair, summaryWindow, summaryWindowKey }) {
      const timePercent = Math.max(
        0,
        Math.min(100, Number(percentPair?.timePercent) || 0),
      );
      const durationMinutes = this.previewDurationMinutes(
        summaryWindowKey,
        summaryWindow,
      );
      const durationMs = durationMinutes * MS_PER_MINUTE;
      const resetMs = atMs + (durationMs * timePercent) / 100;
      return {
        remainingPercent: percentPair?.remainingPercent,
        resetsAt: new Date(resetMs).toISOString(),
        windowMinutes: durationMinutes,
      };
    }

    renderPreview({ paceRatio, percentPair, summaryWindow, summaryWindowKey }) {
      const atMs = Date.now();
      const windowData = this.previewWindowData({
        atMs,
        percentPair,
        summaryWindow,
        summaryWindowKey,
      });
      const points = CHART_DATA.previewPaceChartPoints(paceRatio, windowData, {
        atMs,
      });
      this.renderPoints(points, summaryWindowKey, windowData, {
        preview: true,
      });
    }

    renderHistory({
      hasResetTiming,
      history,
      summaryWindow,
      summaryWindowKey,
    }) {
      const chartSpec = this.windowSpecs[summaryWindowKey];
      const samples = CHART_DATA.resetWindowSamples(
        history,
        summaryWindowKey,
        summaryWindow,
      );
      const chartSamples = CHART_DATA.chartSamplesWithLivePoint(
        samples,
        summaryWindowKey,
        summaryWindow,
      );

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

      if (chartSamples.length < 2) {
        this.setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY);
        return;
      }

      this.render(chartSamples, summaryWindowKey, summaryWindow);
    }
  }

  function createRenderer(options) {
    const renderer = new UsageChartRenderer(options);
    return Object.freeze({
      renderHistory: renderer.renderHistory.bind(renderer),
      renderPreview: renderer.renderPreview.bind(renderer),
      setEmpty: renderer.setEmpty.bind(renderer),
    });
  }

  globalThis.PacePetsDashboardChart = Object.freeze({
    createRenderer,
  });
})();
