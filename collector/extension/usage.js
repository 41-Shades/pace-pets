(function attachCodexWeeklyUsage(root) {
  "use strict";

  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error("Codex usage window contract must load before usage.js.");
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error("Codex usage value helpers must load before usage.js.");
  }
  const USAGE_INTEGRATION_ADAPTERS = root.CodexUsageIntegrationAdapters;
  if (!USAGE_INTEGRATION_ADAPTERS) {
    throw new Error(
      "Codex usage integration adapters must load before usage.js.",
    );
  }
  const USAGE_PROVIDERS = root.CodexUsageProviders;
  if (!USAGE_PROVIDERS) {
    throw new Error("Codex usage providers must load before usage.js.");
  }

  const DEFAULT_USAGE_PROVIDER = USAGE_PROVIDERS.DEFAULT_USAGE_PROVIDER;
  const USAGE_ENDPOINT = DEFAULT_USAGE_PROVIDER.usageEndpoint;
  const WINDOW_SPECS = USAGE_WINDOWS.WINDOW_SPECS;
  const DEFAULT_USAGE_ADAPTER = DEFAULT_USAGE_PROVIDER.adapter;
  const UNSUPPORTED_USAGE_MESSAGE =
    "ChatGPT usage response changed; Pace Pets needs an update.";
  const { dateMs, numberFrom, percentComplement, percentFrom } = USAGE_VALUES;

  function valueFrom(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key)
      ? object[key]
      : null;
  }

  function valueAtPath(object, rawPath) {
    return rawPath.reduce(
      (cursor, key) =>
        cursor && typeof cursor === "object" ? valueFrom(cursor, key) : null,
      object,
    );
  }

  function firstValueAtPaths(object, rawPaths) {
    for (const rawPath of rawPaths) {
      const value = valueAtPath(object, rawPath);
      if (value && typeof value === "object") {
        return value;
      }
    }
    return null;
  }

  function firstValueFromKeys(object, keys) {
    for (const key of keys) {
      const value = valueFrom(object, key);
      if (value !== null) {
        return value;
      }
    }
    return null;
  }

  function epochMs(value) {
    const numeric = numberFrom(value);
    if (numeric !== null) {
      return numeric < 1000000000000 ? numeric * 1000 : numeric;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = dateMs(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  function resetMsFrom(windowData, adapter) {
    const absoluteMs = epochMs(
      firstValueFromKeys(windowData, adapter.resetAtKeys),
    );
    if (absoluteMs !== null) {
      return absoluteMs;
    }

    const relativeSeconds = numberFrom(
      firstValueFromKeys(windowData, adapter.resetAfterSecondsKeys),
    );
    return relativeSeconds === null
      ? null
      : Date.now() + relativeSeconds * 1000;
  }

  function durationMinutesFrom(windowData, adapter) {
    const minutes = numberFrom(
      firstValueFromKeys(windowData, adapter.durationMinutesKeys),
    );
    if (minutes !== null) {
      return Math.round(minutes);
    }

    const seconds = numberFrom(
      firstValueFromKeys(windowData, adapter.durationSecondsKeys),
    );
    return seconds === null ? null : Math.round(seconds / 60);
  }

  function remainingPercentFrom(windowData, adapter) {
    const explicitRemaining = percentFrom(
      firstValueFromKeys(windowData, adapter.remainingPercentKeys),
    );
    if (explicitRemaining !== null) {
      return explicitRemaining;
    }

    return percentComplement(
      firstValueFromKeys(windowData, adapter.usedPercentKeys),
    );
  }

  function displayResetTime(resetMs) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(resetMs));
  }

  function normalizedWindow(windowData, spec) {
    return {
      remainingPercent: windowData.remainingPercent,
      resetsAt: new Date(windowData.resetMs).toISOString(),
      resetsAtText: displayResetTime(windowData.resetMs),
      windowMinutes: spec.durationMinutes,
    };
  }

  function normalizeRawWindow(windowData, adapter) {
    if (!windowData || typeof windowData !== "object") {
      return null;
    }

    const spec = WINDOW_SPECS[adapter.windowKey];
    const remainingPercent = remainingPercentFrom(windowData, adapter);
    const resetMs = resetMsFrom(windowData, adapter);
    const durationMinutes = durationMinutesFrom(windowData, adapter);
    if (
      !spec ||
      remainingPercent === null ||
      resetMs === null ||
      (durationMinutes !== null && durationMinutes !== spec.durationMinutes)
    ) {
      return null;
    }

    return normalizedWindow({ remainingPercent, resetMs }, spec);
  }

  function collectRawWindowCandidates(
    value,
    path,
    candidates,
    depth,
    maxDepth,
  ) {
    if (!value || typeof value !== "object" || depth > maxDepth) {
      return;
    }

    candidates.push({
      path: path.join("."),
      rawWindow: value,
    });

    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === "object") {
        collectRawWindowCandidates(
          child,
          path.concat(key),
          candidates,
          depth + 1,
          maxDepth,
        );
      }
    }
  }

  function windowPathMatches(candidate, adapter) {
    return adapter.candidatePathPattern?.test(candidate.path) || false;
  }

  function chooseMatchingCandidate(candidates, adapter, usedCandidates) {
    for (const candidate of candidates) {
      if (
        usedCandidates.has(candidate) ||
        !windowPathMatches(candidate, adapter)
      ) {
        continue;
      }

      const normalized = normalizeRawWindow(candidate.rawWindow, adapter);
      if (normalized) {
        return {
          candidate,
          normalized,
        };
      }
    }

    return null;
  }

  function candidateWindowAdapters(adapter) {
    return adapter.candidateWindowKeyOrder
      .map((windowKey) =>
        adapter.windows.find(
          (windowAdapter) => windowAdapter.windowKey === windowKey,
        ),
      )
      .filter(Boolean);
  }

  function normalizeCandidateWindows(rawUsage, adapter, windows) {
    if (!adapter.candidateMaxDepth) {
      return;
    }

    const candidates = [];
    collectRawWindowCandidates(
      rawUsage,
      [],
      candidates,
      0,
      adapter.candidateMaxDepth,
    );
    const usedCandidates = new Set();

    for (const windowAdapter of candidateWindowAdapters(adapter)) {
      if (windows[windowAdapter.windowKey]) {
        continue;
      }

      const selected = chooseMatchingCandidate(
        candidates,
        windowAdapter,
        usedCandidates,
      );
      if (selected) {
        usedCandidates.add(selected.candidate);
        windows[windowAdapter.windowKey] = selected.normalized;
      }
    }
  }

  function normalizeUsageWithAdapter(
    rawUsage,
    adapter = DEFAULT_USAGE_ADAPTER,
  ) {
    const windows = {};

    for (const windowAdapter of adapter.windows) {
      const normalized = normalizeRawWindow(
        firstValueAtPaths(rawUsage, windowAdapter.rawPaths),
        windowAdapter,
      );
      if (normalized) {
        windows[windowAdapter.windowKey] = normalized;
      }
    }

    normalizeCandidateWindows(rawUsage, adapter, windows);

    if (!Object.keys(windows).length) {
      throw new Error(UNSUPPORTED_USAGE_MESSAGE);
    }

    return {
      windows,
      source: DEFAULT_USAGE_PROVIDER.sourceMarkers.normalizedUsage,
    };
  }

  function normalizeUsageWithProvider(
    rawUsage,
    provider = DEFAULT_USAGE_PROVIDER,
  ) {
    return normalizeUsageWithAdapter(rawUsage, provider.adapter);
  }

  function normalizeWhamUsage(rawUsage) {
    return normalizeUsageWithProvider(rawUsage, DEFAULT_USAGE_PROVIDER);
  }

  root.CodexWeeklyUsage = {
    DEFAULT_USAGE_PROVIDER,
    USAGE_ENDPOINT,
    BADGE_WINDOW_STORAGE_KEY: USAGE_WINDOWS.BADGE_WINDOW_STORAGE_KEY,
    WEEK_MINUTES: USAGE_WINDOWS.WEEK_MINUTES,
    FIVE_HOUR_MINUTES: USAGE_WINDOWS.FIVE_HOUR_MINUTES,
    normalizeUsageWithAdapter,
    normalizeUsageWithProvider,
    normalizeWhamUsage,
  };
})(globalThis);
