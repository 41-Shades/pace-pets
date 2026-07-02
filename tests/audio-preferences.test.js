import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("PacePetsAudioPreferences", () => {
  it("owns persisted audio preference defaults and storage key", () => {
    const preferences = globalThis.PacePetsAudioPreferences;

    expect(preferences.AUDIO_PREFERENCE_STORAGE_KEY).toBe(
      "pace-pets-dashboard-audio",
    );
    expect(preferences.DEFAULT_AUDIO_ENABLED).toBe(false);
    expect(preferences.DEFAULT_AUDIO_VOLUME).toBe(0.6);
    expect(preferences.MIN_AUDIO_VOLUME).toBe(0);
    expect(preferences.MAX_AUDIO_VOLUME).toBe(1);
    expect(preferences.storedAudioPreferenceValue()).toEqual({
      enabled: false,
      volume: 0.6,
    });
  });

  it("normalizes persisted audio preferences", () => {
    const preferences = globalThis.PacePetsAudioPreferences;

    expect(
      preferences.storedAudioPreferenceValue({
        enabled: true,
        volume: 0.25,
      }),
    ).toEqual({
      enabled: true,
      volume: 0.25,
    });
    expect(
      preferences.storedAudioPreferenceValue({
        enabled: "yes",
        volume: 2,
      }),
    ).toEqual({
      enabled: false,
      volume: 1,
    });
    expect(preferences.normalizeVolume(-1)).toBe(0);
    expect(preferences.normalizeVolume("quiet")).toBeNull();
  });

  it("reads and stores audio preferences through chrome.storage.local", async () => {
    const preferences = globalThis.PacePetsAudioPreferences;
    globalThis.chrome.storage.local.get.mockImplementation((_keys, done) => {
      done({
        [preferences.AUDIO_PREFERENCE_STORAGE_KEY]: {
          enabled: true,
          volume: 0.4,
        },
      });
    });
    globalThis.chrome.storage.local.set.mockImplementation((_items, done) => {
      done();
    });

    await expect(preferences.readAudioPreference()).resolves.toEqual({
      error: null,
      value: {
        enabled: true,
        volume: 0.4,
      },
    });
    await expect(
      preferences.storeAudioPreference({ enabled: false, volume: 0.8 }),
    ).resolves.toEqual({
      error: null,
      ok: true,
    });
    expect(globalThis.chrome.storage.local.get).toHaveBeenCalledWith(
      preferences.AUDIO_PREFERENCE_STORAGE_KEY,
      expect.any(Function),
    );
    expect(globalThis.chrome.storage.local.set).toHaveBeenCalledWith(
      {
        [preferences.AUDIO_PREFERENCE_STORAGE_KEY]: {
          enabled: false,
          volume: 0.8,
        },
      },
      expect.any(Function),
    );
  });

  it("returns defaults with storage errors instead of throwing", async () => {
    const preferences = globalThis.PacePetsAudioPreferences;
    globalThis.chrome.storage.local.get.mockImplementation((_keys, done) => {
      globalThis.chrome.runtime.lastError = { message: "read failed" };
      done();
    });

    await expect(preferences.readAudioPreference()).resolves.toEqual({
      error: expect.any(Error),
      value: {
        enabled: false,
        volume: 0.6,
      },
    });
  });
});
