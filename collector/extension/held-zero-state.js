(function attachPacePetsHeldZeroState(root) {
  "use strict";

  const USAGE_VALUES = root.CodexUsageValues;
  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_VALUES || !USAGE_WINDOWS) {
    throw new Error(
      "Usage values and windows must load before held-zero-state.js.",
    );
  }

  const HELD_ZERO_STATE_KEYS = Object.freeze([
    "perfectZero",
    "singularity",
    "splat",
  ]);
  const STATE_PRECEDENCE = Object.freeze({
    perfectZero: 1,
    singularity: 2,
    splat: 3,
  });

  function isHeldZeroStateKey(value) {
    return HELD_ZERO_STATE_KEYS.includes(value);
  }

  function normalizeEntry(value) {
    const resetsAt = USAGE_VALUES.isoDate(value?.resetsAt);
    return resetsAt && isHeldZeroStateKey(value?.stateKey)
      ? { resetsAt, stateKey: value.stateKey }
      : null;
  }

  function normalizeHeldZeroStates(value) {
    if (!value || typeof value !== "object") {
      return {};
    }

    return Object.fromEntries(
      USAGE_WINDOWS.WINDOW_KEYS.map((windowKey) => [
        windowKey,
        normalizeEntry(value[windowKey]),
      ]).filter((entry) => entry[1]),
    );
  }

  function stateKeyForWindow(heldZeroStates, windowKey, windowData) {
    const entry = normalizeHeldZeroStates(heldZeroStates)[windowKey];
    const resetsAt = USAGE_VALUES.isoDate(windowData?.resetsAt);
    return entry && resetsAt === entry.resetsAt ? entry.stateKey : null;
  }

  function mergeHeldZeroStates(...values) {
    const merged = {};
    for (const value of values) {
      const normalized = normalizeHeldZeroStates(value);
      for (const [windowKey, candidate] of Object.entries(normalized)) {
        const current = merged[windowKey];
        if (
          !current ||
          current.resetsAt !== candidate.resetsAt ||
          STATE_PRECEDENCE[candidate.stateKey] >=
            STATE_PRECEDENCE[current.stateKey]
        ) {
          merged[windowKey] = candidate;
        }
      }
    }
    return merged;
  }

  function nextEntry(previousEntry, resetsAt, stateKey, atMs) {
    if (isHeldZeroStateKey(stateKey)) {
      return { resetsAt, stateKey };
    }

    const resetMs = USAGE_VALUES.dateMs(resetsAt);
    return previousEntry?.resetsAt === resetsAt &&
      resetMs !== null &&
      resetMs <= atMs
      ? previousEntry
      : null;
  }

  function nextHeldZeroStates(
    previousValue,
    windows,
    presentedStateKeysByWindow,
    atMs = Date.now(),
  ) {
    const previous = normalizeHeldZeroStates(previousValue);
    const next = {};
    for (const windowKey of USAGE_WINDOWS.WINDOW_KEYS) {
      const resetsAt = USAGE_VALUES.isoDate(windows?.[windowKey]?.resetsAt);
      if (!resetsAt) {
        continue;
      }

      const entry = nextEntry(
        previous[windowKey],
        resetsAt,
        presentedStateKeysByWindow?.[windowKey],
        atMs,
      );
      if (entry) {
        next[windowKey] = entry;
      }
    }
    return next;
  }

  root.PacePetsHeldZeroState = Object.freeze({
    HELD_ZERO_STATE_KEYS,
    isHeldZeroStateKey,
    mergeHeldZeroStates,
    nextHeldZeroStates,
    normalizeHeldZeroStates,
    stateKeyForWindow,
  });
})(globalThis);
