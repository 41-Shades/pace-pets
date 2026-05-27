(function attachCodexUsageValues(root) {
  "use strict";

  const MS_PER_MINUTE = 60 * 1000;
  const MAX_PERCENT_DECIMAL_PLACES = 12;

  function numberFrom(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function percentFrom(value) {
    const percent = numberFrom(value);
    if (percent === null || percent < 0 || percent > 100) {
      return null;
    }
    return percent;
  }

  function decimalPlacesFrom(value) {
    const [coefficient, exponentText = "0"] = String(value).trim().split(/e/i);
    const fractionalDigits = (coefficient.split(".")[1] || "").length;
    const exponent = Number(exponentText);
    const decimalPlaces =
      fractionalDigits - (Number.isFinite(exponent) ? exponent : 0);
    return Math.max(0, Math.min(MAX_PERCENT_DECIMAL_PLACES, decimalPlaces));
  }

  function percentComplement(value) {
    const percent = percentFrom(value);
    if (percent === null) {
      return null;
    }

    const scale = 10 ** decimalPlacesFrom(value);
    return boundedPercent((100 * scale - Math.round(percent * scale)) / scale);
  }

  function boundedPercent(value) {
    const percent = numberFrom(value);
    if (percent === null) {
      return null;
    }
    return Math.max(0, Math.min(100, percent));
  }

  function dateMs(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isoDate(value) {
    const parsed = dateMs(value);
    return parsed === null ? null : new Date(parsed).toISOString();
  }

  function windowDurationMs(windowData) {
    const windowMinutes = numberFrom(windowData?.windowMinutes);
    return windowMinutes !== null && windowMinutes > 0
      ? windowMinutes * MS_PER_MINUTE
      : null;
  }

  function windowStartMs(windowData) {
    const resetMs = dateMs(windowData?.resetsAt);
    const durationMs = windowDurationMs(windowData);
    return resetMs === null || durationMs === null
      ? null
      : resetMs - durationMs;
  }

  function timeRemainingPercentAt(windowData, atMs) {
    const resetMs = dateMs(windowData?.resetsAt);
    const durationMs = windowDurationMs(windowData);
    if (resetMs === null || durationMs === null) {
      return null;
    }

    return boundedPercent(((resetMs - atMs) / durationMs) * 100);
  }

  function elapsedWindowPercentAt(windowData, atMs) {
    const startMs = windowStartMs(windowData);
    const resetMs = dateMs(windowData?.resetsAt);
    if (startMs === null || resetMs === null || startMs >= resetMs) {
      return null;
    }

    return boundedPercent(((atMs - startMs) / (resetMs - startMs)) * 100);
  }

  function normalizeStoredWindow(windowData) {
    const remainingPercent = boundedPercent(windowData?.remainingPercent);
    const windowMinutes = numberFrom(windowData?.windowMinutes);
    const resetsAt = isoDate(windowData?.resetsAt);
    if (remainingPercent === null || windowMinutes === null || !resetsAt) {
      return null;
    }

    return {
      remainingPercent,
      usedPercent: percentComplement(remainingPercent),
      resetsAt,
      windowMinutes: Math.round(windowMinutes),
    };
  }

  root.CodexUsageValues = Object.freeze({
    boundedPercent,
    dateMs,
    elapsedWindowPercentAt,
    isoDate,
    normalizeStoredWindow,
    numberFrom,
    percentComplement,
    percentFrom,
    timeRemainingPercentAt,
    windowStartMs,
  });
})(globalThis);
