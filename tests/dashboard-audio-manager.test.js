import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function audioParam(value = 1) {
  return {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(function ramp(nextValue) {
      this.value = nextValue;
    }),
    setValueAtTime: vi.fn(function set(nextValue) {
      this.value = nextValue;
    }),
    value,
  };
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 10;
    this.destination = {};
    this.gains = [];
    this.sources = [];
    this.state = "suspended";
  }

  createGain() {
    const gain = {
      connect: vi.fn(),
      gain: audioParam(),
    };
    this.gains.push(gain);
    return gain;
  }

  createBufferSource() {
    let started = false;
    const source = {
      connect: vi.fn(),
      start: vi.fn(() => {
        started = true;
      }),
      stop: vi.fn(() => {
        if (!started) {
          throw new DOMException("Cannot stop before start");
        }
      }),
    };
    this.sources.push(source);
    return source;
  }

  decodeAudioData() {
    return Promise.resolve({ duration: 1 });
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

function clipRegistry() {
  return {
    clipForId: vi.fn((id) =>
      id === "bigBangTransition"
        ? {
            channel: "music",
            group: "bigBang",
            id,
            loop: false,
            path: "assets/audio/big-bang-transition.webm",
            volume: 0.5,
          }
        : null,
    ),
    urlForClip: vi.fn((id) =>
      id === "bigBangTransition"
        ? `chrome-extension://pace-pets/assets/audio/${id}.webm`
        : null,
    ),
  };
}

function preferences() {
  return {
    readAudioPreference: vi.fn(() =>
      Promise.resolve({
        error: null,
        value: { enabled: true, volume: 0.6 },
      }),
    ),
    storeAudioPreference: vi.fn(() =>
      Promise.resolve({
        error: null,
        ok: true,
      }),
    ),
    storedAudioPreferenceValue:
      globalThis.PacePetsAudioPreferences.storedAudioPreferenceValue,
  };
}

function fetchAudio() {
  return vi.fn(() =>
    Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }),
  );
}

function deferredPreferenceRead() {
  let resolveRead;
  const readPromise = new Promise((resolve) => {
    resolveRead = resolve;
  });
  return {
    readPromise,
    resolveRead,
  };
}

beforeAll(async () => {
  globalThis.chrome = {
    runtime: {
      getManifest: () => ({ version: "0.1.0" }),
      getURL: (path) => `chrome-extension://pace-pets/${path}`,
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn(),
        remove: vi.fn(),
        set: vi.fn(),
      },
    },
  };

  await importExtensionScript("collector/extension/storage-adapter.js");
  await importExtensionScript("collector/extension/audio-preferences.js");
  await importExtensionScript("collector/extension/audio-clips.js");
  await importExtensionScript("collector/extension/dashboard-audio-manager.js");
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PacePetsDashboardAudioManager", () => {
  it("reports muted until the user enables audio", async () => {
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: preferences(),
    });

    expect(manager.status()).toBe("muted");
    await expect(manager.playClip("bigBangTransition")).resolves.toBeNull();
  });

  it("loads preference state and resumes Web Audio when enabled", async () => {
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: preferences(),
    });

    await expect(manager.loadPreference()).resolves.toEqual({
      error: null,
      status: "needsGesture",
    });
    await expect(manager.resume()).resolves.toBe("ready");
    expect(manager.status()).toBe("ready");
  });

  it("requests current-page audio before awaiting preference storage", async () => {
    const events = [];
    class OrderedAudioContext extends FakeAudioContext {
      resume() {
        events.push("resume");
        return super.resume();
      }
    }
    const audioPreferences = preferences();
    audioPreferences.storeAudioPreference = vi.fn((preference) => {
      events.push(`store:${preference.enabled}`);
      return Promise.resolve({ error: null, ok: true });
    });
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: OrderedAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: audioPreferences,
    });

    await expect(manager.setEnabled(true)).resolves.toMatchObject({
      status: "ready",
    });

    expect(events).toEqual(["resume", "store:true"]);
  });

  it("does not let stale preference reads overwrite user toggles", async () => {
    const deferredRead = deferredPreferenceRead();
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: {
        readAudioPreference: vi.fn(() => deferredRead.readPromise),
        storeAudioPreference: vi.fn(() =>
          Promise.resolve({ error: null, ok: true }),
        ),
        storedAudioPreferenceValue:
          globalThis.PacePetsAudioPreferences.storedAudioPreferenceValue,
      },
    });

    const loadPromise = manager.loadPreference();
    await expect(manager.setEnabled(true)).resolves.toMatchObject({
      status: "ready",
    });
    deferredRead.resolveRead({
      error: null,
      value: { enabled: false, volume: 0.6 },
    });

    await expect(loadPromise).resolves.toEqual({
      error: null,
      status: "ready",
    });
    expect(manager.status()).toBe("ready");
  });
});

describe("PacePetsDashboardAudioManager playback", () => {
  it("schedules clips and fades active groups", async () => {
    const clips = clipRegistry();
    const fetchClip = fetchAudio();
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips,
      fetchAudio: fetchClip,
      preferences: preferences(),
    });

    await manager.setEnabled(true);
    const handle = await manager.scheduleClip("bigBangTransition", {
      atMs: 500,
      fadeInMs: 200,
    });

    expect(fetchClip).toHaveBeenCalledWith(
      "chrome-extension://pace-pets/assets/audio/bigBangTransition.webm",
    );
    expect(handle.source.start).toHaveBeenCalledWith(10.5, 0);
    expect(handle.gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.5,
      10.7,
    );

    manager.stopGroup("bigBang", { fadeOutMs: 300 });
    expect(handle.source.stop.mock.calls[0][0]).toBeCloseTo(10.35);
    expect(handle.gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      10.3,
    );
  });

  it("preloads clip buffers before playback", async () => {
    const fetchClip = fetchAudio();
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchClip,
      preferences: preferences(),
    });

    await manager.setEnabled(true);
    await expect(manager.preloadClip("bigBangTransition")).resolves.toEqual({
      duration: 1,
    });
    await manager.scheduleClip("bigBangTransition");

    expect(fetchClip).toHaveBeenCalledTimes(1);
  });

  it("does not preload clips until playback is ready", async () => {
    const fetchClip = fetchAudio();
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchClip,
      preferences: preferences(),
    });

    await expect(manager.preloadClip("bigBangTransition")).resolves.toBeNull();

    expect(fetchClip).not.toHaveBeenCalled();
  });
});

describe("PacePetsDashboardAudioManager clip scheduling", () => {
  it("schedules clip offsets, durations, and final fades", async () => {
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: preferences(),
    });

    await manager.setEnabled(true);
    const handle = await manager.scheduleClip("bigBangTransition", {
      atMs: 500,
      durationMs: 1000,
      fadeOutMs: 250,
      offsetMs: 200,
    });

    expect(handle.source.start).toHaveBeenCalledWith(10.5, 0.2);
    expect(handle.gain.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 11.25);
    expect(handle.gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      11.5,
    );
    expect(handle.source.stop).toHaveBeenCalledWith(11.55);
  });

  it("schedules clips from an anchored timeline start", async () => {
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: FakeAudioContext,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: preferences(),
    });

    await manager.setEnabled(true);
    const handle = await manager.scheduleClip("bigBangTransition", {
      atMs: 500,
      timelineStartAt: 25,
    });

    expect(handle.source.start).toHaveBeenCalledWith(25.5, 0);
  });

  it("reports unavailable when Web Audio cannot be created", async () => {
    const manager = globalThis.PacePetsDashboardAudioManager.create({
      AudioContextConstructor: null,
      clips: clipRegistry(),
      fetchAudio: fetchAudio(),
      preferences: preferences(),
    });

    await expect(manager.setEnabled(true)).resolves.toEqual({
      error: null,
      ok: true,
      status: "unavailable",
    });
  });
});
