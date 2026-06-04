(() => {
  "use strict";

  const CHART_DATA = globalThis.PacePetsDashboardChartData;
  if (!CHART_DATA) {
    throw new Error(
      "Pace Pets dashboard chart data must load before dashboard-chart.js.",
    );
  }

  const DEFAULT_CHART_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  function usageChartConfig(points, windowData) {
    const { min, max } = CHART_DATA.chartWindowBounds(windowData) || {
      min: Date.now() - DEFAULT_CHART_WINDOW_MS,
      max: Date.now(),
    };
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
          tooltip: {
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
                  context.raw?.cappedHigh === true ||
                  context.raw?.cappedLow === true;
                return capped
                  ? `Pace: ${CHART_DATA.formatPaceRatio(paceRatio)} (capped)`
                  : `Pace: ${CHART_DATA.formatPaceRatio(paceRatio)}`;
              },
              title(items) {
                return items[0] ? CHART_DATA.formatTime(items[0].parsed.x) : "";
              },
            },
          },
        },
        scales: {
          x: {
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
          },
          y: {
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
            grid: {
              color(context) {
                return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO
                  ? colors.perfectLine
                  : "transparent";
              },
              drawTicks: false,
              lineWidth(context) {
                return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO
                  ? 1
                  : 0;
              },
            },
            ticks: {
              display: false,
            },
          },
        },
      },
    };
  }

  function createRenderer({
    chartCanvas,
    chartFrame,
    chartState,
    windowSpecs,
  }) {
    let usageChart = null;

    function registeredUsageChart() {
      if (
        !globalThis.Chart ||
        typeof globalThis.Chart.getChart !== "function"
      ) {
        return null;
      }
      return globalThis.Chart.getChart(chartCanvas) || null;
    }

    function destroy() {
      const registeredChart = registeredUsageChart();
      if (usageChart) {
        usageChart.destroy();
      }
      if (registeredChart && registeredChart !== usageChart) {
        registeredChart.destroy();
      }
      usageChart = null;
    }

    function setEmpty(message) {
      destroy();
      chartFrame.classList.add("empty");
      chartCanvas.hidden = true;
      chartState.hidden = false;
      chartState.textContent = message;
    }

    function render(samples, windowKey, windowData) {
      const spec = windowSpecs[windowKey];
      if (!globalThis.Chart) {
        setEmpty("Chart.js did not load from the extension asset.");
        return;
      }

      const points = CHART_DATA.paceChartPoints(samples, windowKey);
      if (points.length < 2) {
        setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY);
        return;
      }

      chartFrame.classList.remove("empty");
      chartCanvas.hidden = false;
      chartCanvas.setAttribute(
        "aria-label",
        `${spec.chartSampleLabel} pace ratio across active reset window`,
      );
      chartState.hidden = true;

      const config = usageChartConfig(points, windowData);
      const yBounds = config.options.scales.y;
      const hasCappedPoints = CHART_DATA.hasCappedPacePoints(points, yBounds);
      chartCanvas.setAttribute(
        "aria-label",
        `${spec.chartSampleLabel} pace ratio across active reset window${
          hasCappedPoints ? "; some extreme points are capped" : ""
        }`,
      );
      usageChart = usageChart || registeredUsageChart();
      if (!usageChart) {
        usageChart = new globalThis.Chart(chartCanvas.getContext("2d"), config);
        return;
      }

      usageChart.data.datasets = config.data.datasets;
      usageChart.options.interaction = config.options.interaction;
      usageChart.options.plugins = config.options.plugins;
      usageChart.options.scales.x = config.options.scales.x;
      usageChart.options.scales.y = config.options.scales.y;
      usageChart.update();
    }

    function renderHistory({
      hasResetTiming,
      history,
      summaryWindow,
      summaryWindowKey,
    }) {
      const chartSpec = windowSpecs[summaryWindowKey];
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
        setEmpty(`Waiting for ${chartSpec.chartSampleLabel} usage.`);
        return;
      }

      if (!hasResetTiming) {
        setEmpty(`${chartSpec.chartSampleLabel} reset timing unavailable.`);
        return;
      }

      if (chartSamples.length < 2) {
        setEmpty(CHART_DATA.LOW_SAMPLE_CHART_COPY);
        return;
      }

      render(chartSamples, summaryWindowKey, summaryWindow);
    }

    return Object.freeze({
      renderHistory,
      setEmpty,
    });
  }

  globalThis.PacePetsDashboardChart = Object.freeze({
    createRenderer,
  });
})();
