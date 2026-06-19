(() => {
  "use strict";

  const MS_PER_MINUTE = 60 * 1000;
  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_DAY = 24;
  const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
  const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

  function dateMs(value) {
    return PacePetsLogic.dateMs(value);
  }

  function formatClockTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "waiting";
    }
    return new Intl.DateTimeFormat(undefined, {
      timeStyle: "short",
    }).format(date);
  }

  function formatDateParts(value, format = "dateTime") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return { date: "Unknown", time: "" };
    }

    if (format === "time") {
      return {
        date: new Intl.DateTimeFormat(undefined, {
          timeStyle: "short",
        }).format(date),
        time: "",
      };
    }

    return {
      date: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(date),
      time: new Intl.DateTimeFormat(undefined, {
        timeStyle: "short",
      }).format(date),
    };
  }

  function setDatePart(dateElement, timeElement, value, format) {
    const parts = formatDateParts(value, format);
    dateElement.textContent = parts.date;
    timeElement.textContent = parts.time;
  }

  function setUnavailableDatePart(dateElement, timeElement) {
    dateElement.textContent = "--";
    timeElement.textContent = "";
  }

  function setDatePartOrUnavailable(dateElement, timeElement, value, format) {
    if (value === null) {
      setUnavailableDatePart(dateElement, timeElement);
      return;
    }

    setDatePart(dateElement, timeElement, value, format);
  }

  function setResetParts(elements, windowData, spec, atMs = Date.now()) {
    const startMs = PacePetsLogic.windowStartMs(windowData);
    const resetMs = dateMs(windowData?.resetsAt);
    const valueFormat = spec.resetValueFormat;

    setDatePartOrUnavailable(
      elements.priorResetDate,
      elements.priorResetTime,
      startMs,
      valueFormat,
    );
    setDatePartOrUnavailable(
      elements.scheduledResetDate,
      elements.scheduledResetTime,
      resetMs,
      valueFormat,
    );

    if (startMs === null || resetMs === null || startMs >= resetMs) {
      elements.resetProgressFill.style.setProperty("--reset-progress", "0%");
      return;
    }

    const elapsedPercent =
      PacePetsLogic.elapsedWindowPercentAt(windowData, atMs) || 0;
    elements.resetProgressFill.style.setProperty(
      "--reset-progress",
      `${elapsedPercent}%`,
    );
  }

  function durationCountdown(
    remainingMs,
    {
      alwaysShowDays = false,
      minuteLabel = "m",
      padMinutes = true,
      suffix = "",
    } = {},
  ) {
    const totalMinutes = Math.floor(remainingMs / MS_PER_MINUTE);
    const days = Math.floor(totalMinutes / (HOURS_PER_DAY * MINUTES_PER_HOUR));
    const hours = Math.floor(
      (totalMinutes % (HOURS_PER_DAY * MINUTES_PER_HOUR)) / MINUTES_PER_HOUR,
    );
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    const minuteValue = padMinutes ? String(minutes).padStart(2, "0") : minutes;
    const time = `${hours}h ${minuteValue}${minuteLabel}`;
    const countdown = alwaysShowDays || days > 0 ? `${days}d ${time}` : time;
    return `${countdown}${suffix}`;
  }

  function resetCountdown(value, atMs = Date.now()) {
    const resetMs = dateMs(value);
    if (resetMs === null) {
      return "--";
    }

    const remainingMs = resetMs - atMs;
    if (remainingMs <= 0) {
      return "Window ended";
    }

    return durationCountdown(remainingMs);
  }

  function hasBurnoutCountdownInputs(startMs, resetMs, remainingPercent) {
    return (
      startMs !== null &&
      resetMs !== null &&
      remainingPercent !== null &&
      startMs < resetMs
    );
  }

  function burnoutTiming(windowData, atMs) {
    const startMs = PacePetsLogic.windowStartMs(windowData);
    const resetMs = dateMs(windowData?.resetsAt);
    const remainingPercent = PacePetsLogic.boundedPercent(
      windowData?.remainingPercent,
    );

    if (!hasBurnoutCountdownInputs(startMs, resetMs, remainingPercent)) {
      return null;
    }

    return { atMs, remainingPercent, resetMs, startMs };
  }

  function burnoutProjection(timing) {
    if (!timing || timing.atMs >= timing.resetMs) {
      return null;
    }
    const elapsedMs = timing.atMs - timing.startMs;
    const usedPercent = 100 - timing.remainingPercent;
    if (elapsedMs <= 0 || usedPercent <= 0) {
      return null;
    }

    const burnoutAtMs = timing.startMs + (elapsedMs * 100) / usedPercent;
    return {
      burnoutRemainingMs: Math.max(0, burnoutAtMs - timing.atMs),
      remainingPercent: timing.remainingPercent,
    };
  }

  function resetBudgetRateUnit(remainingMs) {
    if (remainingMs >= MS_PER_DAY) {
      return { label: "day", ms: MS_PER_DAY };
    }
    if (remainingMs >= MS_PER_HOUR) {
      return { label: "hour", ms: MS_PER_HOUR };
    }

    return { label: "min", ms: MS_PER_MINUTE };
  }

  function formatResetBudgetRatePercent(value, unitMs) {
    if (!Number.isFinite(value)) {
      return "--";
    }
    if (unitMs === MS_PER_MINUTE && value > 0 && value < 0.1) {
      return "<0.1";
    }
    if (unitMs === MS_PER_MINUTE && value < 10) {
      return Number(value.toFixed(1)).toString();
    }
    if (value > 0 && value < 1) {
      return "<1";
    }

    return Math.round(value).toString();
  }

  function paceBurnoutCountdown(windowData, atMs = Date.now()) {
    const timing = burnoutTiming(windowData, atMs);
    if (!timing) {
      return "--";
    }
    if (atMs >= timing.resetMs) {
      return "Window ended";
    }

    const projection = burnoutProjection(timing);
    if (!projection) {
      return "--";
    }

    return durationCountdown(projection.burnoutRemainingMs, {
      alwaysShowDays: true,
      minuteLabel: "min",
      padMinutes: false,
    });
  }

  function resetBudgetRate(windowData, atMs = Date.now()) {
    const unavailableRate = { unit: "", value: "--" };
    const resetMs = dateMs(windowData?.resetsAt);
    const remainingPercent = PacePetsLogic.boundedPercent(
      windowData?.remainingPercent,
    );
    if (
      resetMs === null ||
      remainingPercent === null ||
      remainingPercent <= 0
    ) {
      return unavailableRate;
    }

    const resetRemainingMs = resetMs - atMs;
    if (resetRemainingMs <= 0) {
      return unavailableRate;
    }

    const displayUnit = resetBudgetRateUnit(resetRemainingMs);
    const percentPerUnit =
      (remainingPercent * displayUnit.ms) / resetRemainingMs;
    return {
      unit: `/ ${displayUnit.label}`,
      value: `${formatResetBudgetRatePercent(percentPerUnit, displayUnit.ms)}%`,
    };
  }

  function resetCountdownDisplaysZero(value, atMs = Date.now()) {
    return PacePetsLogic.resetCountdownDisplaysZero(value, atMs);
  }

  globalThis.PacePetsDashboardTime = Object.freeze({
    dateMs,
    formatClockTime,
    isResetWindowStale: PacePetsLogic.isResetWindowStale,
    paceBurnoutCountdown,
    resetBudgetRate,
    resetCountdown,
    resetCountdownDisplaysZero,
    setResetParts,
    timeRemainingPercent: PacePetsLogic.timeRemainingPercent,
    windowStartMs: PacePetsLogic.windowStartMs,
  });
})();
