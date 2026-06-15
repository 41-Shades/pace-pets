(() => {
  "use strict";

  const MS_PER_MINUTE = 60 * 1000;
  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_DAY = 24;

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

  function durationCountdown(remainingMs, { alwaysShowDays = false } = {}) {
    const totalMinutes = Math.floor(remainingMs / MS_PER_MINUTE);
    const days = Math.floor(totalMinutes / (HOURS_PER_DAY * MINUTES_PER_HOUR));
    const hours = Math.floor(
      (totalMinutes % (HOURS_PER_DAY * MINUTES_PER_HOUR)) / MINUTES_PER_HOUR,
    );
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    const time = `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return alwaysShowDays || days > 0 ? `${days}d ${time}` : time;
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

  function paceBurnoutCountdown(windowData, atMs = Date.now()) {
    const startMs = PacePetsLogic.windowStartMs(windowData);
    const resetMs = dateMs(windowData?.resetsAt);
    const remainingPercent = PacePetsLogic.boundedPercent(
      windowData?.remainingPercent,
    );

    if (!hasBurnoutCountdownInputs(startMs, resetMs, remainingPercent)) {
      return "--";
    }
    if (atMs >= resetMs) {
      return "Window ended";
    }

    const elapsedMs = atMs - startMs;
    const usedPercent = 100 - remainingPercent;
    if (elapsedMs <= 0 || usedPercent <= 0) {
      return "--";
    }

    const burnoutAtMs = startMs + (elapsedMs * 100) / usedPercent;
    return durationCountdown(Math.max(0, burnoutAtMs - atMs), {
      alwaysShowDays: true,
    });
  }

  function resetCountdownDisplaysZero(value, atMs = Date.now()) {
    return PacePetsLogic.resetCountdownDisplaysZero(value, atMs);
  }

  globalThis.PacePetsDashboardTime = Object.freeze({
    dateMs,
    formatClockTime,
    isResetWindowStale: PacePetsLogic.isResetWindowStale,
    paceBurnoutCountdown,
    resetCountdown,
    resetCountdownDisplaysZero,
    setResetParts,
    timeRemainingPercent: PacePetsLogic.timeRemainingPercent,
    windowStartMs: PacePetsLogic.windowStartMs,
  });
})();
