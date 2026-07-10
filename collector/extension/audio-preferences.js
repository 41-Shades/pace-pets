(function attachPacePetsAudioPreferences(root) {
  "use strict";

  const STORAGE = root.CodexExtensionStorage;
  if (!STORAGE) {
    throw new Error(
      "Extension storage adapter must load before audio-preferences.js.",
    );
  }

  const AUDIO_PREFERENCE_STORAGE_KEY = "pace-pets-dashboard-audio";
  const DEFAULT_AUDIO_ENABLED = false;
  const DEFAULT_AUDIO_VOLUME = 0.6;
  const MIN_AUDIO_VOLUME = 0;
  const MAX_AUDIO_VOLUME = 1;

  function readResult(value, error = null) {
    return Object.freeze({ error, value });
  }

  function writeResult(ok, error = null) {
    return Object.freeze({ error, ok });
  }

  function normalizeVolume(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return null;
    }

    return Math.min(MAX_AUDIO_VOLUME, Math.max(MIN_AUDIO_VOLUME, numberValue));
  }

  function storedAudioPreferenceValue(value = {}) {
    return Object.freeze({
      enabled:
        typeof value.enabled === "boolean"
          ? value.enabled
          : DEFAULT_AUDIO_ENABLED,
      volume: normalizeVolume(value.volume) ?? DEFAULT_AUDIO_VOLUME,
    });
  }

  function audioPreferenceFromStorageChange(changes, areaName) {
    if (
      !STORAGE.isLocalArea(areaName) ||
      !STORAGE.hasChange(changes, AUDIO_PREFERENCE_STORAGE_KEY)
    ) {
      return null;
    }

    return storedAudioPreferenceValue(
      changes[AUDIO_PREFERENCE_STORAGE_KEY]?.newValue,
    );
  }

  async function readAudioPreference(storage = STORAGE) {
    try {
      const result = await storage.getLocal(AUDIO_PREFERENCE_STORAGE_KEY);
      return readResult(
        storedAudioPreferenceValue(result?.[AUDIO_PREFERENCE_STORAGE_KEY]),
      );
    } catch (error) {
      return readResult(storedAudioPreferenceValue(), error);
    }
  }

  async function storeAudioPreference(preference, storage = STORAGE) {
    try {
      await storage.setLocal({
        [AUDIO_PREFERENCE_STORAGE_KEY]: storedAudioPreferenceValue(preference),
      });
      return writeResult(true);
    } catch (error) {
      return writeResult(false, error);
    }
  }

  root.PacePetsAudioPreferences = Object.freeze({
    AUDIO_PREFERENCE_STORAGE_KEY,
    DEFAULT_AUDIO_ENABLED,
    DEFAULT_AUDIO_VOLUME,
    MAX_AUDIO_VOLUME,
    MIN_AUDIO_VOLUME,
    audioPreferenceFromStorageChange,
    normalizeVolume,
    readAudioPreference,
    storeAudioPreference,
    storedAudioPreferenceValue,
  });
})(globalThis);
