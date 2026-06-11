(function attachPacePetsDeveloperOptions(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperOptions";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";
  const CRITICAL_BADGE_WINDOW_KEY = "criticalBadgeWindow";
  const MANUAL_REFRESH_LEAD_WINDOW_KEY = "manualRefreshLeadWindow";
  const MAX_POOL_FILL_KEY = "maxPoolFill";
  const SINGULARITY_TRANSITION_VERSION_KEY = "singularityTransitionVersion";
  const SPRINT_INTENSITY_PREVIEW_KEY = "sprintIntensityPreview";
  const DEFAULT_SINGULARITY_TRANSITION_VERSION = "v2";
  const PACE_STATE_DATA = root.PacePetsPaceStateData;
  const SPRINT_INTENSITY = root.PacePetsSprintIntensity;
  if (!PACE_STATE_DATA || !SPRINT_INTENSITY) {
    throw new Error(
      "Pace state data and sprint intensity must load before developer-options.js.",
    );
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

  function singularityTransitionVersionOption({ label, status, value }) {
    return Object.freeze({
      label,
      status,
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
    featurePreviewOption({
      disableStatus: "Pool fill returned to sweat.",
      enableStatus: "Pool fill forced to max.",
      key: MAX_POOL_FILL_KEY,
      label: "Max pool fill",
      value: "max-pool-fill",
    }),
  ]);
  const SINGULARITY_TRANSITION_VERSION_OPTIONS = Object.freeze([
    singularityTransitionVersionOption({
      label: "Singularity V2",
      status: "Singularity transition V2 selected.",
      value: "v2",
    }),
    singularityTransitionVersionOption({
      label: "Singularity V1",
      status: "Singularity transition V1 selected.",
      value: "v1",
    }),
  ]);
  const SINGULARITY_TRANSITION_VERSION_VALUES = Object.freeze(
    SINGULARITY_TRANSITION_VERSION_OPTIONS.map((option) => option.value),
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

  function normalizeCriticalBadgeWindow(value) {
    return value === true;
  }

  function normalizeMaxPoolFill(value) {
    return value === true;
  }

  function normalizeSingularityTransitionVersion(value) {
    return SINGULARITY_TRANSITION_VERSION_VALUES.includes(value)
      ? value
      : DEFAULT_SINGULARITY_TRANSITION_VERSION;
  }

  function normalizeSprintIntensityPreview(value) {
    return SPRINT_INTENSITY.normalizePreviewValue(value);
  }

  function normalizeDeveloperOptions(value) {
    const forcedPaceStateKey = normalizeForcedPaceStateKey(
      isPlainObject(value) ? value[FORCED_PACE_STATE_KEY] : null,
    );
    const sprintIntensityPreview = normalizeSprintIntensityPreview(
      isPlainObject(value) ? value[SPRINT_INTENSITY_PREVIEW_KEY] : null,
    );
    return Object.freeze({
      criticalBadgeWindow: normalizeCriticalBadgeWindow(
        isPlainObject(value) ? value[CRITICAL_BADGE_WINDOW_KEY] : null,
      ),
      forcedPaceStateKey,
      manualRefreshLeadWindow: normalizeManualRefreshLeadWindow(
        isPlainObject(value) ? value[MANUAL_REFRESH_LEAD_WINDOW_KEY] : null,
      ),
      maxPoolFill: normalizeMaxPoolFill(
        isPlainObject(value) ? value[MAX_POOL_FILL_KEY] : null,
      ),
      singularityTransitionVersion: normalizeSingularityTransitionVersion(
        isPlainObject(value) ? value[SINGULARITY_TRANSITION_VERSION_KEY] : null,
      ),
      sprintIntensityPreview:
        forcedPaceStateKey === PACE_STATE_DATA.PACE_STATES.wellAhead.key
          ? sprintIntensityPreview
          : null,
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
            [MAX_POOL_FILL_KEY]: options.maxPoolFill,
            [SINGULARITY_TRANSITION_VERSION_KEY]:
              options.singularityTransitionVersion,
            [SPRINT_INTENSITY_PREVIEW_KEY]: options.sprintIntensityPreview,
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
    if (normalized.maxPoolFill) {
      value[MAX_POOL_FILL_KEY] = true;
    }
    if (
      normalized.singularityTransitionVersion !==
      DEFAULT_SINGULARITY_TRANSITION_VERSION
    ) {
      value[SINGULARITY_TRANSITION_VERSION_KEY] =
        normalized.singularityTransitionVersion;
    }
    if (normalized.sprintIntensityPreview) {
      value[SPRINT_INTENSITY_PREVIEW_KEY] = normalized.sprintIntensityPreview;
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
    DEFAULT_SINGULARITY_TRANSITION_VERSION,
    FEATURE_PREVIEW_OPTIONS,
    FORCEABLE_PACE_STATE_GROUPS,
    FORCEABLE_PACE_STATE_KEYS,
    FORCEABLE_PACE_STATE_OPTIONS,
    FORCED_PACE_STATE_KEY,
    MANUAL_REFRESH_LEAD_WINDOW_KEY,
    MAX_POOL_FILL_KEY,
    SINGULARITY_TRANSITION_VERSION_KEY,
    SINGULARITY_TRANSITION_VERSION_OPTIONS,
    SINGULARITY_TRANSITION_VERSION_VALUES,
    SPRINT_INTENSITY_PREVIEW_KEY,
    SPRINT_INTENSITY_PREVIEW_OPTIONS: SPRINT_INTENSITY.PREVIEW_OPTIONS,
    SPRINT_INTENSITY_PREVIEW_VALUES: SPRINT_INTENSITY.PREVIEW_VALUES,
    STORAGE_KEY,
    developerOptionsFromStorageItems,
    developerOptionsStorageItems,
    hasDeveloperOptionsChange,
    hasStoredDeveloperOptionsValue,
    normalizeCriticalBadgeWindow,
    normalizeDeveloperOptions,
    normalizeForcedPaceStateKey,
    normalizeManualRefreshLeadWindow,
    normalizeMaxPoolFill,
    normalizeSingularityTransitionVersion,
    normalizeSprintIntensityPreview,
    storedDeveloperOptionsValue,
  });
})(globalThis);
