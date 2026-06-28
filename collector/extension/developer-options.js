(function attachPacePetsDeveloperOptions(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperOptions";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";
  const BADGE_HIDDEN_KEY = "badgeHidden";
  const CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY =
    "checkerboardRevealWhiteTransparent";
  const CRITICAL_BADGE_WINDOW_KEY = "criticalBadgeWindow";
  const MANUAL_REFRESH_LEAD_WINDOW_KEY = "manualRefreshLeadWindow";
  const MAX_POOL_FILL_KEY = "maxPoolFill";
  const RAIL_HIDDEN_KEY = "railHidden";
  const RESET_EXHAUSTED_PREVIEW_KEY = "resetExhaustedPreview";
  const SPLAT_TIME_REMAINING_PREVIEW_KEY = "splatTimeRemainingPreview";
  const BRAKE_INTENSITY_PREVIEW_KEY = "brakeIntensityPreview";
  const SPRINT_INTENSITY_PREVIEW_KEY = "sprintIntensityPreview";
  const PACE_STATE_DATA = root.PacePetsPaceStateData;
  const BRAKE_INTENSITY = root.PacePetsBrakeIntensity;
  const SPRINT_INTENSITY = root.PacePetsSprintIntensity;
  if (!PACE_STATE_DATA || !BRAKE_INTENSITY || !SPRINT_INTENSITY) {
    throw new Error(
      "Pace state data and intensity controls must load before developer-options.js.",
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
    activeLabel = null,
    disableStatus,
    enableStatus,
    key,
    label,
    value,
  }) {
    return Object.freeze({
      activeLabel,
      disableStatus,
      enableStatus,
      key,
      label,
      value,
    });
  }

  function splatTimeRemainingPreviewOption({ label, status, value }) {
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
      activeLabel: "Show badge",
      disableStatus: "Extension badge shown.",
      enableStatus: "Extension badge hidden.",
      key: BADGE_HIDDEN_KEY,
      label: "Hide badge",
      value: "badge-hidden",
    }),
    featurePreviewOption({
      activeLabel: "Black squares transparent",
      disableStatus:
        "Checkerboard reveal returned to transparent black squares.",
      enableStatus: "Checkerboard reveal uses transparent white squares.",
      key: CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY,
      label: "White squares transparent",
      value: "checkerboard-reveal-white-transparent",
    }),
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
    featurePreviewOption({
      disableStatus: "Rail items shown.",
      enableStatus: "Rail items hidden.",
      key: RAIL_HIDDEN_KEY,
      activeLabel: "Show rail items",
      label: "Hide rail items",
      value: "rail-hidden",
    }),
    featurePreviewOption({
      disableStatus: "Exhausted man hidden.",
      enableStatus: "Exhausted man shown.",
      key: RESET_EXHAUSTED_PREVIEW_KEY,
      label: "Exhausted man",
      value: "reset-exhausted-preview",
    }),
  ]);
  const SPLAT_TIME_REMAINING_PREVIEW_VALUES = Object.freeze({
    over50: "over50",
    under50: "under50",
  });
  const BOOLEAN_STORAGE_KEYS = Object.freeze([
    BADGE_HIDDEN_KEY,
    CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY,
    CRITICAL_BADGE_WINDOW_KEY,
    MANUAL_REFRESH_LEAD_WINDOW_KEY,
    MAX_POOL_FILL_KEY,
    RAIL_HIDDEN_KEY,
    RESET_EXHAUSTED_PREVIEW_KEY,
  ]);
  const SPLAT_TIME_REMAINING_PREVIEW_OPTIONS = Object.freeze([
    splatTimeRemainingPreviewOption({
      label: "Splat >50%",
      status: "Splat time remaining forced over 50%.",
      value: SPLAT_TIME_REMAINING_PREVIEW_VALUES.over50,
    }),
    splatTimeRemainingPreviewOption({
      label: "Splat <50%",
      status: "Splat time remaining forced under 50%.",
      value: SPLAT_TIME_REMAINING_PREVIEW_VALUES.under50,
    }),
  ]);
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeForcedPaceStateKey(value) {
    return FORCEABLE_PACE_STATE_KEYS.includes(value) ? value : null;
  }

  function normalizeBadgeHidden(value) {
    return value === true;
  }

  function normalizeManualRefreshLeadWindow(value) {
    return value === true;
  }

  function normalizeCriticalBadgeWindow(value) {
    return value === true;
  }

  function normalizeCheckerboardRevealWhiteTransparent(value) {
    return value === true;
  }

  function normalizeMaxPoolFill(value) {
    return value === true;
  }

  function normalizeRailHidden(value) {
    return value === true;
  }

  function normalizeResetExhaustedPreview(value) {
    return value === true;
  }

  function normalizeSprintIntensityPreview(value) {
    return SPRINT_INTENSITY.normalizePreviewValue(value);
  }

  function normalizeBrakeIntensityPreview(value) {
    return BRAKE_INTENSITY.normalizePreviewValue(value);
  }

  function normalizeSplatTimeRemainingPreview(value) {
    return Object.values(SPLAT_TIME_REMAINING_PREVIEW_VALUES).includes(value)
      ? value
      : null;
  }

  function normalizeDeveloperOptions(value) {
    const source = isPlainObject(value) ? value : {};
    const forcedPaceStateKey = normalizeForcedPaceStateKey(
      source[FORCED_PACE_STATE_KEY],
    );
    const brakeIntensityPreview = normalizeBrakeIntensityPreview(
      source[BRAKE_INTENSITY_PREVIEW_KEY],
    );
    const sprintIntensityPreview = normalizeSprintIntensityPreview(
      source[SPRINT_INTENSITY_PREVIEW_KEY],
    );
    const splatTimeRemainingPreview = normalizeSplatTimeRemainingPreview(
      source[SPLAT_TIME_REMAINING_PREVIEW_KEY],
    );
    return Object.freeze({
      badgeHidden: normalizeBadgeHidden(source[BADGE_HIDDEN_KEY]),
      checkerboardRevealWhiteTransparent:
        normalizeCheckerboardRevealWhiteTransparent(
          source[CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY],
        ),
      criticalBadgeWindow: normalizeCriticalBadgeWindow(
        source[CRITICAL_BADGE_WINDOW_KEY],
      ),
      forcedPaceStateKey,
      manualRefreshLeadWindow: normalizeManualRefreshLeadWindow(
        source[MANUAL_REFRESH_LEAD_WINDOW_KEY],
      ),
      maxPoolFill: normalizeMaxPoolFill(source[MAX_POOL_FILL_KEY]),
      railHidden: normalizeRailHidden(source[RAIL_HIDDEN_KEY]),
      resetExhaustedPreview: normalizeResetExhaustedPreview(
        source[RESET_EXHAUSTED_PREVIEW_KEY],
      ),
      brakeIntensityPreview:
        forcedPaceStateKey === PACE_STATE_DATA.PACE_STATES.criticalBehind.key
          ? brakeIntensityPreview
          : null,
      splatTimeRemainingPreview:
        forcedPaceStateKey === PACE_STATE_DATA.PACE_STATES.splat.key
          ? splatTimeRemainingPreview
          : null,
      sprintIntensityPreview:
        forcedPaceStateKey === PACE_STATE_DATA.PACE_STATES.wellAhead.key
          ? sprintIntensityPreview
          : null,
    });
  }

  function developerOptionsStorageInput(options) {
    if (!isPlainObject(options)) {
      return null;
    }

    return {
      [BADGE_HIDDEN_KEY]: options.badgeHidden,
      [CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY]:
        options.checkerboardRevealWhiteTransparent,
      [CRITICAL_BADGE_WINDOW_KEY]: options.criticalBadgeWindow,
      [FORCED_PACE_STATE_KEY]:
        options.forcedPaceStateKey ?? options[FORCED_PACE_STATE_KEY],
      [MANUAL_REFRESH_LEAD_WINDOW_KEY]: options.manualRefreshLeadWindow,
      [MAX_POOL_FILL_KEY]: options.maxPoolFill,
      [RAIL_HIDDEN_KEY]: options.railHidden,
      [RESET_EXHAUSTED_PREVIEW_KEY]: options.resetExhaustedPreview,
      [BRAKE_INTENSITY_PREVIEW_KEY]: options.brakeIntensityPreview,
      [SPLAT_TIME_REMAINING_PREVIEW_KEY]: options.splatTimeRemainingPreview,
      [SPRINT_INTENSITY_PREVIEW_KEY]: options.sprintIntensityPreview,
    };
  }

  function storedDeveloperOptionsValue(options = {}) {
    const normalized = normalizeDeveloperOptions(
      developerOptionsStorageInput(options),
    );
    const value = {};
    if (normalized.forcedPaceStateKey) {
      value[FORCED_PACE_STATE_KEY] = normalized.forcedPaceStateKey;
    }
    for (const key of BOOLEAN_STORAGE_KEYS) {
      if (normalized[key]) {
        value[key] = true;
      }
    }
    if (normalized.splatTimeRemainingPreview) {
      value[SPLAT_TIME_REMAINING_PREVIEW_KEY] =
        normalized.splatTimeRemainingPreview;
    }
    if (normalized.brakeIntensityPreview) {
      value[BRAKE_INTENSITY_PREVIEW_KEY] = normalized.brakeIntensityPreview;
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
    BADGE_HIDDEN_KEY,
    BRAKE_INTENSITY_PREVIEW_KEY,
    BRAKE_INTENSITY_PREVIEW_OPTIONS: BRAKE_INTENSITY.PREVIEW_OPTIONS,
    BRAKE_INTENSITY_PREVIEW_VALUES: BRAKE_INTENSITY.PREVIEW_VALUES,
    CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY,
    CRITICAL_BADGE_WINDOW_KEY,
    FEATURE_PREVIEW_OPTIONS,
    FORCEABLE_PACE_STATE_GROUPS,
    FORCEABLE_PACE_STATE_KEYS,
    FORCEABLE_PACE_STATE_OPTIONS,
    FORCED_PACE_STATE_KEY,
    MANUAL_REFRESH_LEAD_WINDOW_KEY,
    MAX_POOL_FILL_KEY,
    RAIL_HIDDEN_KEY,
    RESET_EXHAUSTED_PREVIEW_KEY,
    SPLAT_TIME_REMAINING_PREVIEW_KEY,
    SPLAT_TIME_REMAINING_PREVIEW_OPTIONS,
    SPLAT_TIME_REMAINING_PREVIEW_VALUES,
    SPRINT_INTENSITY_PREVIEW_KEY,
    SPRINT_INTENSITY_PREVIEW_OPTIONS: SPRINT_INTENSITY.PREVIEW_OPTIONS,
    SPRINT_INTENSITY_PREVIEW_VALUES: SPRINT_INTENSITY.PREVIEW_VALUES,
    STORAGE_KEY,
    developerOptionsFromStorageItems,
    developerOptionsStorageItems,
    hasDeveloperOptionsChange,
    hasStoredDeveloperOptionsValue,
    normalizeBadgeHidden,
    normalizeBrakeIntensityPreview,
    normalizeCriticalBadgeWindow,
    normalizeCheckerboardRevealWhiteTransparent,
    normalizeDeveloperOptions,
    normalizeForcedPaceStateKey,
    normalizeManualRefreshLeadWindow,
    normalizeMaxPoolFill,
    normalizeRailHidden,
    normalizeResetExhaustedPreview,
    normalizeSplatTimeRemainingPreview,
    normalizeSprintIntensityPreview,
    storedDeveloperOptionsValue,
  });
})(globalThis);
