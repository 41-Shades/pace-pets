(() => {
  "use strict";

  const INTEGRATION_CONFIG = globalThis.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error(
      "Codex integration config must load before dashboard-chart-data.js.",
    );
  }
  const PACE_LOGIC = globalThis.PacePetsLogic;
  if (!PACE_LOGIC) {
    throw new Error(
      "Pace Pets logic must load before dashboard-chart-data.js.",
    );
  }

  const LOW_SAMPLE_CHART_COPY =
    "Waiting for enough readings to draw the pace line.";
  const CHART_COLOR_FALLBACKS = {
    line: "rgba(112, 124, 138, 0.72)",
    aboveLine: "rgba(34, 139, 126, 0.74)",
    belowLine: "rgba(184, 94, 86, 0.74)",
    aboveFill: "rgba(20, 184, 166, 0.18)",
    belowFill: "rgba(248, 113, 113, 0.22)",
    perfectLine: "rgba(20, 184, 166, 0.48)",
  };
  const PERFECT_PACE_RATIO = PACE_LOGIC.PERFECT_PACE_RATIO;
  const PACE_RATIO_CHART_MIN = 0;
  const PACE_RATIO_CHART_MAX = PACE_LOGIC.PACE_RATIO_CHART_MAX;
  const PACE_RATIO_CHART_DETAIL_STEP = 0.05;
  const PACE_RATIO_CHART_HIGH_STEP = 0.25;
  const PACE_RATIO_CHART_MIN_SPAN = 0.3;
  const PACE_RATIO_CHART_MIN_PADDING = 0.04;
  const PACE_RATIO_CHART_PADDING_RATIO = 0.2;
  const PACE_RATIO_CHART_HIGH_THRESHOLD = 2;

  function cssCustomProperty(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function chartColors() {
    return {
      line: cssCustomProperty("--chart-line") || CHART_COLOR_FALLBACKS.line,
      aboveLine:
        cssCustomProperty("--chart-line-above") ||
        CHART_COLOR_FALLBACKS.aboveLine,
      belowLine:
        cssCustomProperty("--chart-line-below") ||
        CHART_COLOR_FALLBACKS.belowLine,
      aboveFill:
        cssCustomProperty("--chart-above-fill") ||
        CHART_COLOR_FALLBACKS.aboveFill,
      belowFill:
        cssCustomProperty("--chart-below-fill") ||
        CHART_COLOR_FALLBACKS.belowFill,
      perfectLine:
        cssCustomProperty("--chart-perfect-line") ||
        CHART_COLOR_FALLBACKS.perfectLine,
      tooltipBg: cssCustomProperty("--tooltip-bg") || "#ffffff",
      tooltipText: cssCustomProperty("--tooltip-text") || "#24313d",
      tooltipBorder: cssCustomProperty("--tooltip-border") || "#cfd8e2",
    };
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function chartWindowBounds(windowData) {
    return PACE_LOGIC.resetWindowBounds(windowData);
  }

  function resetWindowSamples(history, windowKey, windowData) {
    return PACE_LOGIC.resetWindowSamples(history, windowKey, windowData);
  }

  function chartSamplesWithLivePoint(samples, windowKey, windowData) {
    const bounds = chartWindowBounds(windowData);
    const nowMs = Date.now();
    if (!bounds || nowMs < bounds.min || nowMs > bounds.max) {
      return samples;
    }

    const latestSample = samples[samples.length - 1];
    const latestMs = PACE_LOGIC.dateMs(latestSample?.collectedAt);
    if (latestMs !== null && nowMs <= latestMs) {
      return samples;
    }

    return samples.concat({
      id: `live-${windowKey}`,
      collectedAt: new Date(nowMs).toISOString(),
      source: INTEGRATION_CONFIG.SOURCE_MARKERS.dashboardLive,
      windows: {
        [windowKey]: windowData,
      },
    });
  }

  function paceChartPoints(samples, windowKey) {
    return samples
      .map((sample) => {
        const collectedMs = PACE_LOGIC.dateMs(sample.collectedAt);
        const windowData = sample.windows[windowKey];
        const remainingPercent = Number(windowData?.remainingPercent);
        if (collectedMs === null || !Number.isFinite(remainingPercent)) {
          return null;
        }

        const timePercent = PACE_LOGIC.timeRemainingPercentAt(
          windowData,
          collectedMs,
        );
        const paceRatio = PACE_LOGIC.paceRatioForValues(
          remainingPercent,
          timePercent,
        );
        if (paceRatio === null) {
          return null;
        }

        return {
          x: collectedMs,
          y: paceRatio,
          paceRatio,
        };
      })
      .filter(Boolean);
  }

  function cappedPaceChartPoints(points, bounds) {
    return points
      .map((point) => {
        const paceRatio = Number(point.paceRatio ?? point.y);
        const plottedPaceRatio = PACE_LOGIC.chartPaceRatio(paceRatio, bounds);
        if (plottedPaceRatio === null) {
          return null;
        }

        return {
          ...point,
          y: plottedPaceRatio,
          cappedHigh: paceRatio > bounds.max,
          cappedLow: paceRatio < bounds.min,
        };
      })
      .filter(Boolean);
  }

  function splitPaceChartCrossings(points) {
    if (points.length < 2) {
      return points;
    }

    const splitPoints = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const previousDelta = previous.y - PERFECT_PACE_RATIO;
      const currentDelta = current.y - PERFECT_PACE_RATIO;
      const crossesPerfect =
        previousDelta !== 0 &&
        currentDelta !== 0 &&
        Math.sign(previousDelta) !== Math.sign(currentDelta) &&
        current.x !== previous.x;

      if (crossesPerfect) {
        const crossingRatio =
          (PERFECT_PACE_RATIO - previous.y) / (current.y - previous.y);
        splitPoints.push({
          synthetic: true,
          x: previous.x + (current.x - previous.x) * crossingRatio,
          y: PERFECT_PACE_RATIO,
        });
      }

      splitPoints.push(current);
    }

    return splitPoints;
  }

  function paceChartSegmentColor(context, colors) {
    const p0Y = context.p0?.parsed?.y;
    const p1Y = context.p1?.parsed?.y;
    if (!Number.isFinite(p0Y) || !Number.isFinite(p1Y)) {
      return colors.line;
    }
    if (p0Y === PERFECT_PACE_RATIO && p1Y === PERFECT_PACE_RATIO) {
      return colors.perfectLine;
    }

    const midpoint = (p0Y + p1Y) / 2;
    if (midpoint > PERFECT_PACE_RATIO) {
      return colors.aboveLine;
    }
    if (midpoint < PERFECT_PACE_RATIO) {
      return colors.belowLine;
    }

    return colors.line;
  }

  function paceChartDataset(points, colors, yBounds) {
    const cappedPoints = cappedPaceChartPoints(points, yBounds);
    const splitPoints = splitPaceChartCrossings(cappedPoints);

    return {
      label: "Pace",
      data: splitPoints,
      parsing: false,
      borderColor: colors.line,
      backgroundColor: colors.aboveFill,
      borderWidth: 1.35,
      fill: {
        above: colors.aboveFill,
        below: colors.belowFill,
        target: {
          value: PERFECT_PACE_RATIO,
        },
      },
      pointBackgroundColor: colors.line,
      pointBorderWidth: 0,
      pointRadius: 0,
      pointHoverRadius: 3,
      segment: {
        borderColor(context) {
          return paceChartSegmentColor(context, colors);
        },
      },
      tension: 0.28,
    };
  }

  function roundChartBoundUp(value, step = PACE_RATIO_CHART_DETAIL_STEP) {
    return Math.ceil(value / step) * step;
  }

  function roundChartBoundDown(value, step = PACE_RATIO_CHART_DETAIL_STEP) {
    return Math.floor(value / step) * step;
  }

  function ratioChartBounds(points) {
    const ratios = points
      .map((point) => point.paceRatio ?? point.y)
      .filter((value) => Number.isFinite(value));
    const minRatio = Math.min(PERFECT_PACE_RATIO, ...ratios);
    const maxRatio = Math.max(PERFECT_PACE_RATIO, ...ratios);

    if (maxRatio > PACE_RATIO_CHART_HIGH_THRESHOLD) {
      return {
        min: PACE_RATIO_CHART_MIN,
        max: Math.min(
          PACE_RATIO_CHART_MAX,
          roundChartBoundUp(maxRatio, PACE_RATIO_CHART_HIGH_STEP),
        ),
      };
    }

    const range = maxRatio - minRatio;
    const padding = Math.max(
      PACE_RATIO_CHART_MIN_PADDING,
      range * PACE_RATIO_CHART_PADDING_RATIO,
    );
    let min = minRatio - padding;
    let max = maxRatio + padding;
    const span = max - min;
    if (span < PACE_RATIO_CHART_MIN_SPAN) {
      const midpoint = (min + max) / 2;
      min = midpoint - PACE_RATIO_CHART_MIN_SPAN / 2;
      max = midpoint + PACE_RATIO_CHART_MIN_SPAN / 2;
    }

    return {
      min: Math.max(PACE_RATIO_CHART_MIN, roundChartBoundDown(min)),
      max: Math.min(PACE_RATIO_CHART_MAX, roundChartBoundUp(max)),
    };
  }

  function formatPaceRatio(value) {
    return PACE_LOGIC.formatPaceRatioValue(value, { suffix: "x" });
  }

  function hasCappedPacePoints(points, yBounds) {
    const cappedHigh = points.some((point) => point.paceRatio > yBounds.max);
    const cappedLow = points.some((point) => point.paceRatio < yBounds.min);
    return cappedHigh || cappedLow;
  }

  globalThis.PacePetsDashboardChartData = Object.freeze({
    LOW_SAMPLE_CHART_COPY,
    PERFECT_PACE_RATIO,
    chartColors,
    chartSamplesWithLivePoint,
    chartWindowBounds,
    formatPaceRatio,
    formatTime,
    hasCappedPacePoints,
    paceChartDataset,
    paceChartPoints,
    ratioChartBounds,
    resetWindowSamples,
  });
})();
