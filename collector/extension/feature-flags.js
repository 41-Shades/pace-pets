(function attachPacePetsFeatureFlags(root) {
  "use strict";

  const STORAGE_KEY = "pacePetsDeveloperFeatureFlags";
  const FORCED_PACE_STATE_KEY = "forcedPaceState";

  function featureFlag(definition) {
    return Object.freeze({
      key: definition.key,
      defaultValue: definition.defaultValue !== false,
      label: definition.label,
      description: definition.description,
    });
  }

  const FEATURE_FLAG_DEFINITIONS = Object.freeze({
    paceLevelStates: featureFlag({
      key: "paceLevelStates",
      defaultValue: true,
      label: "Pace level states",
      description:
        "Display ratio-derived states such as Brake hard, Keep pace, and Sprint faster.",
    }),
    perfectSyncState: featureFlag({
      key: "perfectSyncState",
      defaultValue: true,
      label: "Perfect sync state",
      description:
        "Display Perfect sync when rounded usage and time percentages match.",
    }),
    perfectZeroState: featureFlag({
      key: "perfectZeroState",
      defaultValue: true,
      label: "Perfect zero state",
      description:
        "Display Perfect zero when rounded usage and time percentages both land at zero.",
    }),
    perfectZeroScene: featureFlag({
      key: "perfectZeroScene",
      defaultValue: true,
      label: "Perfect zero scene",
      description:
        "Show the full-page Perfect zero canvas scene behind the dashboard.",
    }),
    statePreviews: featureFlag({
      key: "statePreviews",
      defaultValue: true,
      label: "State previews",
      description:
        "Enable dashboard state chips and temporary toolbar badge previews.",
    }),
  });

  const FEATURE_FLAG_KEYS = Object.freeze(
    Object.keys(FEATURE_FLAG_DEFINITIONS),
  );
  const FORCEABLE_PACE_STATE_OPTIONS = Object.freeze([
    Object.freeze({ key: "on", label: "Keep pace" }),
    Object.freeze({ key: "sync", label: "Perfect sync" }),
    Object.freeze({ key: "perfectZero", label: "Perfect zero" }),
  ]);
  const FORCEABLE_PACE_STATE_KEYS = Object.freeze(
    FORCEABLE_PACE_STATE_OPTIONS.map((option) => option.key),
  );
  const DEFAULT_FEATURE_FLAGS = Object.freeze(
    Object.fromEntries(
      FEATURE_FLAG_KEYS.map((key) => [
        key,
        FEATURE_FLAG_DEFINITIONS[key].defaultValue,
      ]),
    ),
  );

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeFeatureFlagOverrides(value) {
    const normalized = {};
    if (!isPlainObject(value)) {
      return Object.freeze(normalized);
    }

    for (const key of FEATURE_FLAG_KEYS) {
      if (typeof value[key] === "boolean") {
        normalized[key] = value[key];
      }
    }

    return Object.freeze(normalized);
  }

  function normalizeFeatureFlags(value) {
    return Object.freeze({
      ...DEFAULT_FEATURE_FLAGS,
      ...normalizeFeatureFlagOverrides(value),
    });
  }

  function normalizeForcedPaceStateKey(value) {
    return FORCEABLE_PACE_STATE_KEYS.includes(value) ? value : null;
  }

  function normalizeDeveloperOptions(value) {
    return Object.freeze({
      featureFlags: normalizeFeatureFlags(value),
      featureFlagOverrides: normalizeFeatureFlagOverrides(value),
      forcedPaceStateKey: normalizeForcedPaceStateKey(
        isPlainObject(value) ? value[FORCED_PACE_STATE_KEY] : null,
      ),
    });
  }

  function featureFlagValue(flags, key) {
    return normalizeFeatureFlags(flags)[key] === true;
  }

  function hasFeatureFlagsChange(changes) {
    return Object.hasOwn(changes || {}, STORAGE_KEY);
  }

  root.PacePetsFeatureFlags = Object.freeze({
    DEFAULT_FEATURE_FLAGS,
    FEATURE_FLAG_DEFINITIONS,
    FEATURE_FLAG_KEYS,
    FORCEABLE_PACE_STATE_KEYS,
    FORCEABLE_PACE_STATE_OPTIONS,
    FORCED_PACE_STATE_KEY,
    STORAGE_KEY,
    featureFlagValue,
    hasFeatureFlagsChange,
    normalizeDeveloperOptions,
    normalizeFeatureFlagOverrides,
    normalizeFeatureFlags,
    normalizeForcedPaceStateKey,
  });
})(globalThis);
