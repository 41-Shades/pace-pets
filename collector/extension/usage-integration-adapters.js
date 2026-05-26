(function attachCodexUsageIntegrationAdapters(root) {
  "use strict";

  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before usage-integration-adapters.js.",
    );
  }

  function rawPath(path) {
    return Object.freeze([...path]);
  }

  function rawWindowAdapter(adapter) {
    return Object.freeze({
      ...adapter,
      candidatePathPattern: adapter.candidatePathPattern || null,
      durationMinutesKeys: Object.freeze(adapter.durationMinutesKeys),
      durationSecondsKeys: Object.freeze(adapter.durationSecondsKeys),
      rawPaths: Object.freeze(adapter.rawPaths.map(rawPath)),
      remainingPercentKeys: Object.freeze(adapter.remainingPercentKeys),
      resetAfterSecondsKeys: Object.freeze(adapter.resetAfterSecondsKeys),
      resetAtKeys: Object.freeze(adapter.resetAtKeys),
      usedPercentKeys: Object.freeze(adapter.usedPercentKeys),
    });
  }

  function usageAdapter(adapter) {
    return Object.freeze({
      ...adapter,
      candidateMaxDepth: adapter.candidateMaxDepth ?? 0,
      candidateWindowKeyOrder: Object.freeze(
        adapter.candidateWindowKeyOrder ||
          adapter.windows.map((windowAdapter) => windowAdapter.windowKey),
      ),
      windows: Object.freeze(adapter.windows.map(rawWindowAdapter)),
    });
  }

  const CHATGPT_WHAM_ADAPTER_KEY = "chatgptWham";
  const CHATGPT_WHAM_FIELD_KEYS = Object.freeze({
    durationMinutesKeys: Object.freeze([
      "window_duration_mins",
      "windowDurationMins",
      "duration_minutes",
      "durationMinutes",
      "limit_window_minutes",
      "limitWindowMinutes",
    ]),
    durationSecondsKeys: Object.freeze([
      "limit_window_seconds",
      "limitWindowSeconds",
      "limit_window_sec",
      "limitWindowSec",
      "window_duration_seconds",
      "windowDurationSeconds",
      "window_duration_sec",
      "windowDurationSec",
      "duration_seconds",
      "durationSeconds",
      "duration_sec",
      "durationSec",
    ]),
    remainingPercentKeys: Object.freeze([
      "remaining_percent",
      "remainingPercent",
      "remaining_pct",
      "remainingPct",
    ]),
    resetAfterSecondsKeys: Object.freeze([
      "reset_after_seconds",
      "resetAfterSeconds",
      "reset_after_sec",
      "resetAfterSec",
      "seconds_until_reset",
      "secondsUntilReset",
    ]),
    resetAtKeys: Object.freeze([
      "reset_at",
      "resetAt",
      "resets_at",
      "resetsAt",
      "reset_time",
      "resetTime",
      "window_reset_at",
      "windowResetAt",
    ]),
    usedPercentKeys: Object.freeze([
      "used_percent",
      "usedPercent",
      "used_pct",
      "usedPct",
    ]),
  });
  const CHATGPT_WHAM_ADAPTER = usageAdapter({
    candidateMaxDepth: 6,
    candidateWindowKeyOrder: [
      USAGE_WINDOWS.WINDOW_SPECS.fiveHour.key,
      USAGE_WINDOWS.WINDOW_SPECS.weekly.key,
    ],
    key: CHATGPT_WHAM_ADAPTER_KEY,
    windows: [
      {
        ...CHATGPT_WHAM_FIELD_KEYS,
        candidatePathPattern:
          /(?:^|\.)(?:subscription|usage|windows|usageLimits|usage_limits|rateLimit|rate_limit)(?:\.|.*\.)(?:secondary|secondary_window|secondaryWindow|weekly|weekly_window|weeklyWindow)$/i,
        windowKey: USAGE_WINDOWS.WINDOW_SPECS.weekly.key,
        rawPaths: [
          ["subscription", "secondary"],
          ["subscription", "weekly"],
          ["rate_limit", "secondary"],
          ["rate_limit", "secondary_window"],
          ["rate_limit", "weekly"],
          ["rate_limit", "weekly_window"],
          ["rateLimit", "secondary"],
          ["rateLimit", "secondaryWindow"],
          ["rateLimit", "weekly"],
          ["rateLimit", "weeklyWindow"],
          ["secondary"],
          ["secondary_window"],
          ["secondaryWindow"],
          ["weekly"],
          ["weekly_window"],
          ["weeklyWindow"],
          ["windows", "weekly"],
          ["windows", "weekly_window"],
          ["windows", "weeklyWindow"],
          ["usage", "weekly"],
          ["usage", "weekly_window"],
          ["usage", "weeklyWindow"],
          ["usage", "windows", "weekly"],
          ["usage", "windows", "weekly_window"],
          ["usage", "windows", "weeklyWindow"],
        ],
      },
      {
        ...CHATGPT_WHAM_FIELD_KEYS,
        candidatePathPattern:
          /(?:^|\.)(?:subscription|usage|windows|usageLimits|usage_limits|rateLimit|rate_limit)(?:\.|.*\.)(?:primary|primary_window|primaryWindow|fiveHour|five_hour|fiveHourWindow|five_hour_window)$/i,
        windowKey: USAGE_WINDOWS.WINDOW_SPECS.fiveHour.key,
        rawPaths: [
          ["subscription", "primary"],
          ["subscription", "fiveHour"],
          ["subscription", "five_hour"],
          ["rate_limit", "primary"],
          ["rate_limit", "primary_window"],
          ["rate_limit", "fiveHour"],
          ["rate_limit", "five_hour"],
          ["rate_limit", "five_hour_window"],
          ["rateLimit", "primary"],
          ["rateLimit", "primaryWindow"],
          ["rateLimit", "fiveHour"],
          ["rateLimit", "fiveHourWindow"],
          ["rateLimit", "five_hour"],
          ["primary"],
          ["primary_window"],
          ["primaryWindow"],
          ["fiveHour"],
          ["fiveHourWindow"],
          ["five_hour"],
          ["five_hour_window"],
          ["windows", "fiveHour"],
          ["windows", "fiveHourWindow"],
          ["windows", "five_hour"],
          ["windows", "five_hour_window"],
          ["usage", "fiveHour"],
          ["usage", "fiveHourWindow"],
          ["usage", "five_hour"],
          ["usage", "five_hour_window"],
          ["usage", "windows", "fiveHour"],
          ["usage", "windows", "fiveHourWindow"],
          ["usage", "windows", "five_hour"],
          ["usage", "windows", "five_hour_window"],
        ],
      },
    ],
  });

  const ADAPTERS = Object.freeze({
    [CHATGPT_WHAM_ADAPTER.key]: CHATGPT_WHAM_ADAPTER,
  });

  function adapterForKey(adapterKey) {
    return ADAPTERS[adapterKey] || null;
  }

  root.CodexUsageIntegrationAdapters = Object.freeze({
    ADAPTERS,
    CHATGPT_WHAM_ADAPTER,
    CHATGPT_WHAM_ADAPTER_KEY,
    DEFAULT_USAGE_ADAPTER: CHATGPT_WHAM_ADAPTER,
    adapterForKey,
  });
})(globalThis);
