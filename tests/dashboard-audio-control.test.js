import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function buttonElement() {
  const attributes = new Map();
  return {
    dataset: {},
    disabled: false,
    setAttribute: vi.fn((name, value) => {
      attributes.set(name, value);
    }),
    attribute(name) {
      return attributes.get(name);
    },
  };
}

function audioManager(
  status = "muted",
  { enabledStatus = "ready", loadedStatus = "needsGesture" } = {},
) {
  let currentStatus = status;
  const listeners = new Set();
  return {
    addStatusChangeListener: vi.fn((listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    loadPreference: vi.fn(async () => {
      currentStatus = loadedStatus;
      return { error: null, status: currentStatus };
    }),
    resume: vi.fn(async () => {
      currentStatus = "ready";
      for (const listener of listeners) {
        listener(currentStatus);
      }
      return currentStatus;
    }),
    setEnabled: vi.fn(async (enabled) => {
      currentStatus = enabled ? enabledStatus : "muted";
      for (const listener of listeners) {
        listener(currentStatus);
      }
      return { error: null, ok: true, status: currentStatus };
    }),
    status: vi.fn(() => currentStatus),
  };
}

beforeAll(async () => {
  globalThis.PacePetsDashboardAudioManager = {
    STATUS_MUTED: "muted",
    STATUS_NEEDS_GESTURE: "needsGesture",
    STATUS_READY: "ready",
    STATUS_UNAVAILABLE: "unavailable",
    create: () => audioManager(),
  };

  await importExtensionScript("collector/extension/dashboard-audio-control.js");
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PacePetsDashboardAudioControl", () => {
  it("renders muted controls by default", () => {
    const button = buttonElement();
    const appTooltips = { setText: vi.fn() };
    const manager = audioManager();

    const control = globalThis.PacePetsDashboardAudioControl.createController({
      appTooltips,
      audioManager: manager,
      button,
    });

    expect(control.audioManager()).toBe(manager);
    expect(button.dataset.audioStatus).toBe("muted");
    expect(button.attribute("aria-pressed")).toBe("false");
    expect(button.attribute("aria-label")).toBe("Turn sound on");
    expect(appTooltips.setText).toHaveBeenCalledWith(button, "Turn sound on");
  });

  it("loads preference state and renders needs-gesture status", async () => {
    const button = buttonElement();
    const manager = audioManager();
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    await expect(control.loadPreference()).resolves.toEqual({
      error: null,
      status: "needsGesture",
    });

    expect(button.dataset.audioStatus).toBe("needsGesture");
    expect(button.attribute("aria-pressed")).toBe("false");
    expect(button.attribute("aria-label")).toBe("Allow sound for this page");
  });

  it("tries to restore current-page playback after loading an enabled preference", async () => {
    const button = buttonElement();
    const manager = audioManager();
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    await expect(
      control.loadPreference({ resumeIfNeeded: true }),
    ).resolves.toEqual({
      error: null,
      status: "ready",
    });

    expect(manager.resume).toHaveBeenCalled();
    expect(button.dataset.audioStatus).toBe("ready");
    expect(button.attribute("aria-label")).toBe("Turn sound off");
  });

  it("does not request playback after loading a muted preference", async () => {
    const button = buttonElement();
    const manager = audioManager("muted", { loadedStatus: "muted" });
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    await expect(
      control.loadPreference({ resumeIfNeeded: true }),
    ).resolves.toEqual({
      error: null,
      status: "muted",
    });

    expect(manager.resume).not.toHaveBeenCalled();
    expect(button.dataset.audioStatus).toBe("muted");
  });
});

describe("PacePetsDashboardAudioControl toggles", () => {
  it("enables current-page playback and mutes through one button action", async () => {
    const button = buttonElement();
    const manager = audioManager();
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    await expect(control.toggleAudio()).resolves.toBe("ready");
    expect(manager.setEnabled).toHaveBeenCalledWith(true);
    expect(button.dataset.audioStatus).toBe("ready");
    expect(button.attribute("aria-label")).toBe("Turn sound off");

    await expect(control.toggleAudio()).resolves.toBe("muted");
    expect(manager.setEnabled).toHaveBeenLastCalledWith(false);
    expect(button.dataset.audioStatus).toBe("muted");
  });

  it("allows the current page when stored sound still needs a gesture", async () => {
    const button = buttonElement();
    const manager = audioManager("needsGesture");
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    await expect(control.toggleAudio()).resolves.toBe("ready");

    expect(manager.resume).toHaveBeenCalled();
    expect(button.dataset.audioStatus).toBe("ready");
  });

  it("disables unavailable audio controls", () => {
    const button = buttonElement();
    const manager = audioManager("unavailable");

    globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
    });

    expect(button.disabled).toBe(true);
    expect(button.attribute("aria-label")).toBe("Sound unavailable");
  });
});
