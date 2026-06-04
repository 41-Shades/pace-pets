(function attachPacePetsDeveloperOptions(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperOptions";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";
  const MANUAL_REFRESH_LEAD_WINDOW_KEY = "manualRefreshLeadWindow";

  const FORCEABLE_PACE_STATE_OPTIONS = Object.freeze([
    Object.freeze({ key: "wellAhead", label: "Sprint faster!" }),
    Object.freeze({ key: "strongAhead", label: "Push harder" }),
    Object.freeze({ key: "ahead", label: "Pick up speed" }),
    Object.freeze({ key: "on", label: "Keep pace" }),
    Object.freeze({ key: "behind", label: "Ease up" }),
    Object.freeze({ key: "wellBehind", label: "Slow down" }),
    Object.freeze({ key: "criticalBehind", label: "Brake hard!" }),
    Object.freeze({ key: "sync", label: "Perfect sync" }),
    Object.freeze({ key: "perfectZero", label: "Perfect zero" }),
    Object.freeze({ key: "singularity", label: "Singularity" }),
  ]);
  const FORCEABLE_PACE_STATE_KEYS = Object.freeze(
    FORCEABLE_PACE_STATE_OPTIONS.map((option) => option.key),
  );

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeForcedPaceStateKey(value) {
    return FORCEABLE_PACE_STATE_KEYS.includes(value) ? value : null;
  }

  function normalizeManualRefreshLeadWindow(value) {
    return value === true;
  }

  function normalizeDeveloperOptions(value) {
    return Object.freeze({
      forcedPaceStateKey: normalizeForcedPaceStateKey(
        isPlainObject(value) ? value[FORCED_PACE_STATE_KEY] : null,
      ),
      manualRefreshLeadWindow: normalizeManualRefreshLeadWindow(
        isPlainObject(value) ? value[MANUAL_REFRESH_LEAD_WINDOW_KEY] : null,
      ),
    });
  }

  function hasDeveloperOptionsChange(changes) {
    return Object.hasOwn(changes || {}, STORAGE_KEY);
  }

  root.PacePetsDeveloperOptions = Object.freeze({
    FORCEABLE_PACE_STATE_KEYS,
    FORCEABLE_PACE_STATE_OPTIONS,
    FORCED_PACE_STATE_KEY,
    MANUAL_REFRESH_LEAD_WINDOW_KEY,
    STORAGE_KEY,
    hasDeveloperOptionsChange,
    normalizeDeveloperOptions,
    normalizeForcedPaceStateKey,
    normalizeManualRefreshLeadWindow,
  });
})(globalThis);
