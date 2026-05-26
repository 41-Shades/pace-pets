(function attachCodexUsageWindows(root) {
  "use strict";

  const WINDOW_STORAGE_KEY = "codex-usage-window";
  const DEFAULT_WINDOW_KEY = "weekly";
  const WEEK_MINUTES = 7 * 24 * 60;
  const FIVE_HOUR_MINUTES = 5 * 60;
  const WINDOW_KEYS = Object.freeze(["weekly", "fiveHour"]);
  const WINDOW_SPECS = Object.freeze({
    weekly: Object.freeze({
      key: "weekly",
      durationMinutes: WEEK_MINUTES,
      badge: "7d",
      titleMeta: "Week",
      chartSampleLabel: "weekly",
      resetValueFormat: "dateTime",
      priorResetLabel: "Last reset",
      scheduledResetLabel: "Next reset",
    }),
    fiveHour: Object.freeze({
      key: "fiveHour",
      durationMinutes: FIVE_HOUR_MINUTES,
      badge: "5h",
      titleMeta: "5h",
      chartSampleLabel: "5-hour",
      resetValueFormat: "dateTime",
      priorResetLabel: "Last reset",
      scheduledResetLabel: "Next reset",
    }),
  });

  const WINDOW_BADGE_LABELS = Object.freeze(
    Object.fromEntries(
      WINDOW_KEYS.map((key) => [key, WINDOW_SPECS[key].badge]),
    ),
  );

  function isSupportedWindowKey(value) {
    return Object.hasOwn(WINDOW_SPECS, value);
  }

  function normalizeWindowKey(value) {
    return isSupportedWindowKey(value) ? value : DEFAULT_WINDOW_KEY;
  }

  function windowSpec(value) {
    return WINDOW_SPECS[normalizeWindowKey(value)];
  }

  function alternateWindowKey(activeKey) {
    const normalizedKey = normalizeWindowKey(activeKey);
    return WINDOW_KEYS.find((windowKey) => windowKey !== normalizedKey) || null;
  }

  function firstAvailableWindowKey(windows, preferredWindowKey) {
    const normalizedPreference = normalizeWindowKey(preferredWindowKey);
    if (windows?.[normalizedPreference]) {
      return normalizedPreference;
    }

    return (
      WINDOW_KEYS.find((windowKey) => windows?.[windowKey]) ||
      normalizedPreference
    );
  }

  root.CodexUsageWindows = Object.freeze({
    DEFAULT_WINDOW_KEY,
    FIVE_HOUR_MINUTES,
    WEEK_MINUTES,
    WINDOW_BADGE_LABELS,
    WINDOW_KEYS,
    WINDOW_SPECS,
    WINDOW_STORAGE_KEY,
    alternateWindowKey,
    firstAvailableWindowKey,
    isSupportedWindowKey,
    normalizeWindowKey,
    windowSpec,
  });
})(globalThis);
