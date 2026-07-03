import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

function buttonElement() {
  return controlElement();
}

function volumeElement() {
  const volumeSlider = controlElement();
  const panel = controlElement();
  volumeSlider.closest = vi.fn((selector) =>
    selector === ".audio-volume-panel" ? panel : null,
  );
  volumeSlider.panelElement = panel;
  volumeSlider.parentElement = panel;
  return volumeSlider;
}

function controlElement() {
  const attributes = new Map();
  return {
    dataset: {},
    disabled: false,
    style: {
      setProperty: vi.fn(),
    },
    value: "",
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
  { enabledStatus = "ready", loadedStatus = "needsGesture", volume = 0.6 } = {},
) {
  let currentStatus = status;
  let currentVolume = volume;
  const listeners = new Set();
  function notify() {
    for (const listener of listeners) {
      listener(currentStatus);
    }
  }
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
      notify();
      return currentStatus;
    }),
    setEnabled: vi.fn(async (enabled) => {
      currentStatus = enabled ? enabledStatus : "muted";
      notify();
      return { error: null, ok: true, status: currentStatus };
    }),
    setVolume: vi.fn(async (nextVolume) => {
      currentVolume = nextVolume;
      notify();
      return { error: null, ok: true, status: currentStatus };
    }),
    status: vi.fn(() => currentStatus),
    volume: vi.fn(() => currentVolume),
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
    const volumeSlider = volumeElement();
    const appTooltips = { setText: vi.fn() };
    const manager = audioManager();

    const control = globalThis.PacePetsDashboardAudioControl.createController({
      appTooltips,
      audioManager: manager,
      button,
      volumeSlider,
    });

    expect(control.audioManager()).toBe(manager);
    expect(button.dataset.audioStatus).toBe("muted");
    expect(button.attribute("aria-pressed")).toBe("false");
    expect(button.attribute("aria-label")).toBe("Unmute");
    expect(volumeSlider.dataset.audioStatus).toBe("muted");
    expect(volumeSlider.panelElement.dataset.audioStatus).toBe("muted");
    expect(volumeSlider.value).toBe("0");
    expect(volumeSlider.style.setProperty).toHaveBeenCalledWith(
      "--audio-volume-percent",
      "0%",
    );
    expect(volumeSlider.panelElement.style.setProperty).toHaveBeenCalledWith(
      "--audio-volume-percent",
      "0%",
    );
    expect(volumeSlider.attribute("aria-valuetext")).toBe("0%");
    expect(appTooltips.setText).toHaveBeenCalledWith(button, "Unmute");
    expect(appTooltips.setText).toHaveBeenCalledWith(volumeSlider, "Volume");
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
    expect(button.attribute("aria-label")).toBe("Mute");
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
    expect(button.attribute("aria-label")).toBe("Mute");

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

describe("PacePetsDashboardAudioControl volume", () => {
  it("sets app volume while sound is ready", async () => {
    const volumeSlider = volumeElement();
    const manager = audioManager("ready");
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      volumeSlider,
    });

    await expect(control.setVolumePercent(35)).resolves.toBe("ready");

    expect(manager.setVolume).toHaveBeenCalledWith(0.35);
    expect(manager.setEnabled).not.toHaveBeenCalled();
    expect(volumeSlider.value).toBe("35");
    expect(volumeSlider.attribute("aria-valuetext")).toBe("35%");
  });

  it("uses zero volume as mute without losing prior volume", async () => {
    const button = buttonElement();
    const volumeSlider = volumeElement();
    const manager = audioManager("ready");
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      button,
      volumeSlider,
    });

    await expect(control.setVolumePercent(0)).resolves.toBe("muted");
    expect(manager.setVolume).not.toHaveBeenCalled();
    expect(manager.setEnabled).toHaveBeenCalledWith(false);
    expect(volumeSlider.value).toBe("0");

    await expect(control.toggleAudio()).resolves.toBe("ready");
    expect(manager.setEnabled).toHaveBeenLastCalledWith(true);
    expect(volumeSlider.value).toBe("60");
    expect(button.attribute("aria-label")).toBe("Mute");
  });

  it("raises volume from muted state and enables playback", async () => {
    const volumeSlider = volumeElement();
    const manager = audioManager("muted");
    const control = globalThis.PacePetsDashboardAudioControl.createController({
      audioManager: manager,
      volumeSlider,
    });

    await expect(control.setVolumePercent(45)).resolves.toBe("ready");

    expect(manager.setVolume).toHaveBeenCalledWith(0.45);
    expect(manager.setEnabled).toHaveBeenCalledWith(true);
    expect(volumeSlider.value).toBe("45");
  });
});
