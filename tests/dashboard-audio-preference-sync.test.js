import {
  importExtensionScript,
  installExtensionRuntimeHooks,
} from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it, vi } from "vitest";

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("collector/extension/audio-clips.js");
  await importExtensionScript("collector/extension/dashboard-audio-manager.js");
});

function preferenceStore() {
  return {
    readAudioPreference: vi.fn(),
    storeAudioPreference: vi.fn(),
    storedAudioPreferenceValue:
      globalThis.PacePetsAudioPreferences.storedAudioPreferenceValue,
  };
}

function activeHandle(group = "bigBang") {
  return Object.freeze({
    gain: {
      gain: {
        cancelScheduledValues: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
        value: 1,
      },
    },
    group,
    source: { stop: vi.fn() },
  });
}

describe("dashboard audio preference synchronization", () => {
  it("stops active playback without persisting an external mute again", () => {
    const preferences = preferenceStore();
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: null,
      fetchAudio: null,
      preferences,
    });
    const handle = activeHandle();
    manager.context = { currentTime: 10, state: "running" };
    manager.setPreference({ enabled: true, volume: 0.6 });
    manager.activeByGroup.set(handle.group, new Set([handle]));

    manager.setPreference({ enabled: false, volume: 0.4 });

    expect(manager.status()).toBe("muted");
    expect(manager.volume()).toBe(0.4);
    expect(handle.source.stop).toHaveBeenCalledWith(10.05);
    expect(preferences.storeAudioPreference).not.toHaveBeenCalled();
  });
});
