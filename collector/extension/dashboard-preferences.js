(() => {
  "use strict";

  const USAGE_WINDOWS = globalThis.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before dashboard-preferences.js.",
    );
  }

  const DASHBOARD_WINDOW_SESSION_KEY = "pace-pets-dashboard-window";
  const THEME_STORAGE_KEY = "codex-usage-theme";
  const THEME_VALUES = Object.freeze(["light", "dark"]);
  const MOTION_STORAGE_KEY = "pace-pets-dashboard-motion";
  const MOTION_VALUES = Object.freeze(["on", "off"]);
  const DEFAULT_MOTION = "on";
  const MOTION_CHANGE_EVENT = "pacepetsmotionpreferencechange";
  const SESSION_STORAGE_SCOPE = "sessionStorage";
  const LOCAL_PREFERENCES = Object.freeze([
    Object.freeze({
      key: DASHBOARD_WINDOW_SESSION_KEY,
      scope: SESSION_STORAGE_SCOPE,
      values: "supported usage-window keys",
    }),
    Object.freeze({
      key: THEME_STORAGE_KEY,
      scope: "localStorage",
      values: THEME_VALUES.map((theme) => `\`${theme}\``).join(", "),
    }),
    Object.freeze({
      key: MOTION_STORAGE_KEY,
      scope: "localStorage",
      values: MOTION_VALUES.map((motion) => `\`${motion}\``).join(", "),
    }),
  ]);

  function readResult(value, error = null) {
    return Object.freeze({ error, value });
  }

  function writeResult(ok, error = null) {
    return Object.freeze({ error, ok });
  }

  function normalizeTheme(value) {
    return THEME_VALUES.includes(value) ? value : null;
  }

  function normalizeMotion(value) {
    return MOTION_VALUES.includes(value) ? value : null;
  }

  function sessionStorageSurface() {
    return globalThis[SESSION_STORAGE_SCOPE];
  }

  function motionPreferenceEnabled(storage = globalThis.localStorage) {
    return (readMotionPreference(storage).value || DEFAULT_MOTION) === "on";
  }

  function readDashboardWindowPreference(storage = sessionStorageSurface()) {
    try {
      const windowKey = storage.getItem(DASHBOARD_WINDOW_SESSION_KEY);
      return readResult(
        USAGE_WINDOWS.isSupportedWindowKey(windowKey) ? windowKey : null,
      );
    } catch (error) {
      return readResult(null, error);
    }
  }

  function storeDashboardWindowPreference(
    windowKey,
    storage = sessionStorageSurface(),
  ) {
    if (!USAGE_WINDOWS.isSupportedWindowKey(windowKey)) {
      return writeResult(false);
    }

    try {
      storage.setItem(DASHBOARD_WINDOW_SESSION_KEY, windowKey);
      return writeResult(true);
    } catch (error) {
      return writeResult(false, error);
    }
  }

  function readThemePreference(storage = globalThis.localStorage) {
    try {
      return readResult(normalizeTheme(storage.getItem(THEME_STORAGE_KEY)));
    } catch (error) {
      return readResult(null, error);
    }
  }

  function storeThemePreference(theme, storage = globalThis.localStorage) {
    const normalizedTheme = normalizeTheme(theme);
    if (!normalizedTheme) {
      return writeResult(false);
    }

    try {
      storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
      return writeResult(true);
    } catch (error) {
      return writeResult(false, error);
    }
  }

  function readMotionPreference(storage = globalThis.localStorage) {
    try {
      return readResult(normalizeMotion(storage.getItem(MOTION_STORAGE_KEY)));
    } catch (error) {
      return readResult(null, error);
    }
  }

  function storeMotionPreference(motion, storage = globalThis.localStorage) {
    const normalizedMotion = normalizeMotion(motion);
    if (!normalizedMotion) {
      return writeResult(false);
    }

    try {
      storage.setItem(MOTION_STORAGE_KEY, normalizedMotion);
      return writeResult(true);
    } catch (error) {
      return writeResult(false, error);
    }
  }

  function notifyMotionPreferenceChanged(motion, target = globalThis) {
    target.dispatchEvent?.(
      new CustomEvent(MOTION_CHANGE_EVENT, {
        detail: Object.freeze({ motion }),
      }),
    );
  }

  function addMotionPreferenceChangeListener(listener, target = globalThis) {
    target.addEventListener?.(MOTION_CHANGE_EVENT, listener);
    return () => target.removeEventListener?.(MOTION_CHANGE_EVENT, listener);
  }

  globalThis.PacePetsDashboardPreferences = Object.freeze({
    DASHBOARD_WINDOW_SESSION_KEY,
    DEFAULT_MOTION,
    LOCAL_PREFERENCES,
    MOTION_CHANGE_EVENT,
    MOTION_STORAGE_KEY,
    MOTION_VALUES,
    THEME_STORAGE_KEY,
    THEME_VALUES,
    addMotionPreferenceChangeListener,
    motionPreferenceEnabled,
    normalizeMotion,
    normalizeTheme,
    readDashboardWindowPreference,
    readMotionPreference,
    readThemePreference,
    notifyMotionPreferenceChanged,
    storeDashboardWindowPreference,
    storeMotionPreference,
    storeThemePreference,
  });
})();
