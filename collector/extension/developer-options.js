(function attachPacePetsDeveloperOptions(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperOptions";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";
  const CRITICAL_BADGE_WINDOW_KEY = "criticalBadgeWindow";
  const MANUAL_REFRESH_LEAD_WINDOW_KEY = "manualRefreshLeadWindow";
  const PACE_STATE_DATA = root.PacePetsPaceStateData;
  if (!PACE_STATE_DATA) {
    throw new Error("Pace state data must load before developer-options.js.");
  }
  const FORCEABLE_PACE_STATE_GROUP_LIST_ELEMENT_IDS = Object.freeze({
    imperfectStates: "imperfect-state-list",
    paceLevels: "pace-level-list",
    perfectStates: "perfect-state-list",
  });

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

  function forceablePaceStateGroup(group) {
    return paceStateGroup({
      key: group.key,
      listElementId: FORCEABLE_PACE_STATE_GROUP_LIST_ELEMENT_IDS[group.key],
      options: group.displayStateKeys.map(paceStateOption),
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

  const FORCEABLE_PACE_STATE_GROUPS = Object.freeze(
    PACE_STATE_DATA.PACE_STATE_GROUPS.map(forceablePaceStateGroup),
  );
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

  function storedDeveloperOptionsValue(options = {}) {
    const normalized = normalizeDeveloperOptions(
      isPlainObject(options)
        ? {
            [CRITICAL_BADGE_WINDOW_KEY]: options.criticalBadgeWindow,
            [FORCED_PACE_STATE_KEY]:
              options.forcedPaceStateKey ?? options[FORCED_PACE_STATE_KEY],
            [MANUAL_REFRESH_LEAD_WINDOW_KEY]: options.manualRefreshLeadWindow,
          }
        : null,
    );
    const value = {};
    if (normalized.forcedPaceStateKey) {
      value[FORCED_PACE_STATE_KEY] = normalized.forcedPaceStateKey;
    }
    if (normalized.criticalBadgeWindow) {
      value[CRITICAL_BADGE_WINDOW_KEY] = true;
    }
    if (normalized.manualRefreshLeadWindow) {
      value[MANUAL_REFRESH_LEAD_WINDOW_KEY] = true;
    }
    return Object.freeze(value);
  }

  function hasStoredDeveloperOptionsValue(value) {
    return isPlainObject(value) && Object.keys(value).length > 0;
  }

  function developerOptionsStorageItems(options = {}) {
    const value = storedDeveloperOptionsValue(options);
    return hasStoredDeveloperOptionsValue(value)
      ? Object.freeze({ [STORAGE_KEY]: value })
      : null;
  }

  function developerOptionsFromStorageItems(items) {
    return normalizeDeveloperOptions(
      isPlainObject(items) ? items[STORAGE_KEY] : null,
    );
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
    developerOptionsFromStorageItems,
    developerOptionsStorageItems,
    hasDeveloperOptionsChange,
    hasStoredDeveloperOptionsValue,
    normalizeCriticalBadgeWindow,
    normalizeDeveloperOptions,
    normalizeForcedPaceStateKey,
    normalizeManualRefreshLeadWindow,
    storedDeveloperOptionsValue,
  });
})(globalThis);
