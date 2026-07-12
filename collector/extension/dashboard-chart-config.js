(() => {
  "use strict";

  const CHART_DATA = globalThis.PacePetsDashboardChartData;
  if (!CHART_DATA) {
    throw new Error(
      "Pace Pets dashboard chart data must load before dashboard-chart-config.js.",
    );
  }

  const DEFAULT_CHART_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  function chartWindowRange(windowData, atMs) {
    return (
      CHART_DATA.chartWindowBounds(windowData) || {
        min: atMs - DEFAULT_CHART_WINDOW_MS,
        max: atMs,
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
      bodyFont: { size: 12, weight: "560" },
      titleFont: { size: 12, weight: "600" },
      callbacks: {
        label(context) {
          const paceRatio = context.raw?.paceRatio ?? context.parsed.y;
          const capped =
            context.raw?.cappedHigh === true || context.raw?.cappedLow === true;
          const suffix = capped ? " (capped)" : "";
          return `Pace: ${CHART_DATA.formatPaceRatio(paceRatio)}${suffix}`;
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
      border: { display: false },
      grid: { display: false },
      ticks: { display: false },
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
      border: { display: false },
      grid: {
        color(context) {
          return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO
            ? colors.perfectLine
            : "transparent";
        },
        drawTicks: false,
        lineWidth(context) {
          return context.tick.value === CHART_DATA.PERFECT_PACE_RATIO ? 1 : 0;
        },
      },
      ticks: { display: false },
    };
  }

  function baseOptions(windowData, colors, yBounds, atMs) {
    return {
      animation: false,
      interaction: { axis: "x", intersect: false, mode: "nearest" },
      maintainAspectRatio: false,
      normalized: true,
      plugins: { legend: { display: false } },
      scales: {
        x: xScaleOptions(chartWindowRange(windowData, atMs)),
        y: yScaleOptions(yBounds, colors),
      },
    };
  }

  function usageChartConfig(points, windowData, atMs = Date.now()) {
    const colors = CHART_DATA.chartColors();
    const yBounds = CHART_DATA.ratioChartBounds(points);
    const options = baseOptions(windowData, colors, yBounds, atMs);
    options.plugins.tooltip = chartTooltipOptions(colors);
    return {
      type: "line",
      data: {
        datasets: [CHART_DATA.paceChartDataset(points, colors, yBounds)],
      },
      options,
    };
  }

  function emptyUsageChartConfig(windowData, atMs = Date.now()) {
    const colors = CHART_DATA.chartColors();
    const yBounds = CHART_DATA.ratioChartBounds([]);
    const options = baseOptions(windowData, colors, yBounds, atMs);
    options.plugins.tooltip = { enabled: false };
    return {
      type: "line",
      data: {
        datasets: [
          {
            ...CHART_DATA.paceChartDataset([], colors, yBounds),
            data: [],
          },
        ],
      },
      options,
    };
  }

  globalThis.PacePetsDashboardChartConfig = Object.freeze({
    emptyUsageChartConfig,
    usageChartConfig,
  });
})();
