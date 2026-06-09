(() => {
  "use strict";

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

  function resetCountdown(value, atMs = Date.now()) {
    const resetMs = dateMs(value);
    if (resetMs === null) {
      return "--";
    }

    const remainingMs = resetMs - atMs;
    if (remainingMs <= 0) {
      return "Window ended";
    }

    const totalMinutes = Math.floor(remainingMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const time = `${hours}h ${String(minutes).padStart(2, "0")}m`;
    return days > 0 ? `${days}d ${time}` : time;
  }

  function resetCountdownDisplaysZero(value, atMs = Date.now()) {
    const resetMs = dateMs(value);
    if (resetMs === null) {
      return false;
    }

    const remainingMs = resetMs - atMs;
    return remainingMs > 0 && Math.floor(remainingMs / 60000) === 0;
  }

  globalThis.PacePetsDashboardTime = Object.freeze({
    dateMs,
    formatClockTime,
    isResetWindowStale: PacePetsLogic.isResetWindowStale,
    resetCountdown,
    resetCountdownDisplaysZero,
    setResetParts,
    timeRemainingPercent: PacePetsLogic.timeRemainingPercent,
    windowStartMs: PacePetsLogic.windowStartMs,
  });
})();
