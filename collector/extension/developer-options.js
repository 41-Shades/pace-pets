(function attachPacePetsDeveloperOptions(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperOptions";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";
  const CRITICAL_BADGE_WINDOW_KEY = "criticalBadgeWindow";
  const MANUAL_REFRESH_LEAD_WINDOW_KEY = "manualRefreshLeadWindow";

  function paceStateOption(key) {
    return Object.freeze({ key });
  }

  function paceStateGroup({ key, listElementId, options }) {
    return Object.freeze({
      key,
      listElementId,
      options: Object.freeze(options),
    });
  }

  function featurePreviewOption({
    disableStatus,
    enableStatus,
    key,
    label,
    value,
  }) {
    return Object.freeze({
      disableStatus,
      enableStatus,
      key,
      label,
      value,
    });
  }

  const FORCEABLE_PACE_STATE_GROUPS = Object.freeze([
    paceStateGroup({
      key: "paceLevels",
      listElementId: "pace-level-list",
      options: [
        paceStateOption("wellAhead"),
        paceStateOption("strongAhead"),
        paceStateOption("ahead"),
        paceStateOption("on"),
        paceStateOption("behind"),
        paceStateOption("wellBehind"),
        paceStateOption("criticalBehind"),
      ],
    }),
    paceStateGroup({
      key: "perfectStates",
      listElementId: "perfect-state-list",
      options: [
        paceStateOption("sync"),
        paceStateOption("perfectZero"),
        paceStateOption("singularity"),
      ],
    }),
    paceStateGroup({
      key: "imperfectStates",
      listElementId: "imperfect-state-list",
      options: [paceStateOption("splat")],
    }),
  ]);
  const FORCEABLE_PACE_STATE_OPTIONS = Object.freeze(
    FORCEABLE_PACE_STATE_GROUPS.reduce(
      (options, group) => options.concat(group.options),
      [],
    ),
  );
  const FORCEABLE_PACE_STATE_KEYS = Object.freeze(
    FORCEABLE_PACE_STATE_OPTIONS.map((option) => option.key),
  );
  const FEATURE_PREVIEW_OPTIONS = Object.freeze([
    featurePreviewOption({
      disableStatus: "Brake hard badge returned to live data.",
      enableStatus: "Brake hard badge forced.",
      key: CRITICAL_BADGE_WINDOW_KEY,
      label: "Extension badge",
      value: "critical-badge-window",
    }),
    featurePreviewOption({
      disableStatus: "Refresh link returned to timing.",
      enableStatus: "Refresh link forced.",
      key: MANUAL_REFRESH_LEAD_WINDOW_KEY,
      label: "Refresh link",
      value: "manual-refresh-lead-window",
    }),
  ]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeForcedPaceStateKey(value) {
    return FORCEABLE_PACE_STATE_KEYS.includes(value) ? value : null;
  }

  function normalizeManualRefreshLeadWindow(value) {
    return value === true;
  }

  function normalizeCriticalBadgeWindow(value) {
    return value === true;
  }

  function normalizeDeveloperOptions(value) {
    return Object.freeze({
      criticalBadgeWindow: normalizeCriticalBadgeWindow(
        isPlainObject(value) ? value[CRITICAL_BADGE_WINDOW_KEY] : null,
      ),
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
    CRITICAL_BADGE_WINDOW_KEY,
    FEATURE_PREVIEW_OPTIONS,
    FORCEABLE_PACE_STATE_GROUPS,
    FORCEABLE_PACE_STATE_KEYS,
    FORCEABLE_PACE_STATE_OPTIONS,
    FORCED_PACE_STATE_KEY,
    MANUAL_REFRESH_LEAD_WINDOW_KEY,
    STORAGE_KEY,
    hasDeveloperOptionsChange,
    normalizeCriticalBadgeWindow,
    normalizeDeveloperOptions,
    normalizeForcedPaceStateKey,
    normalizeManualRefreshLeadWindow,
  });
})(globalThis);
