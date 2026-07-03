(function attachPacePetsDashboardAudioControl(root) {
  "use strict";

  const AUDIO_MANAGER = root.PacePetsDashboardAudioManager;
  if (!AUDIO_MANAGER) {
    throw new Error(
      "Pace Pets dashboard audio manager must load before dashboard-audio-control.js.",
    );
  }

  const STATUS_LABELS = Object.freeze({
    [AUDIO_MANAGER.STATUS_MUTED]: "Unmute",
    [AUDIO_MANAGER.STATUS_NEEDS_GESTURE]: "Allow sound for this page",
    [AUDIO_MANAGER.STATUS_READY]: "Mute",
    [AUDIO_MANAGER.STATUS_UNAVAILABLE]: "Sound unavailable",
  });
  const DEFAULT_RESTORE_VOLUME = 0.6;
  const MAX_VOLUME_PERCENT = 100;
  const VOLUME_TOOLTIP = "Volume";

  function pressedForStatus(status) {
    return String(status === AUDIO_MANAGER.STATUS_READY);
  }

  class DashboardAudioControl {
    constructor({
      appTooltips = null,
      audioManager = AUDIO_MANAGER.create(),
      button = null,
      volumeSlider = null,
    } = {}) {
      this.appTooltips = appTooltips;
      this.manager = audioManager;
      this.button = button;
      this.volumeSlider = volumeSlider;
      this.unsubscribeStatusChange =
        this.manager.addStatusChangeListener?.(() => {
          this.updateControls();
        }) || null;
      this.updateControls();
    }

    status() {
      return this.manager.status();
    }

    labelForStatus(status) {
      return STATUS_LABELS[status] || STATUS_LABELS[AUDIO_MANAGER.STATUS_MUTED];
    }

    updateControls() {
      const status = this.status();
      this.updateButton(status);
      this.updateVolumeSlider(status);
    }

    updateButton(status = this.status()) {
      if (this.button) {
        const label = this.labelForStatus(status);
        this.button.dataset.audioStatus = status;
        this.button.disabled = status === AUDIO_MANAGER.STATUS_UNAVAILABLE;
        this.button.setAttribute("aria-pressed", pressedForStatus(status));
        this.button.setAttribute("aria-label", label);
        this.appTooltips?.setText(this.button, label);
      }
    }

    storedVolumePercent() {
      return Math.round(
        (this.manager.volume?.() ?? DEFAULT_RESTORE_VOLUME) * 100,
      );
    }

    displayVolumePercent(status = this.status()) {
      return status === AUDIO_MANAGER.STATUS_MUTED
        ? 0
        : this.storedVolumePercent();
    }

    volumePanel() {
      return (
        this.volumeSlider?.closest?.(".audio-volume-panel") ||
        this.volumeSlider?.parentElement ||
        null
      );
    }

    updateVolumeSlider(status = this.status()) {
      if (!this.volumeSlider) {
        return;
      }

      const percent = this.displayVolumePercent(status);
      const percentValue = `${percent}%`;
      const panel = this.volumePanel();
      if (panel) {
        panel.dataset.audioStatus = status;
        panel.style.setProperty("--audio-volume-percent", percentValue);
      }

      this.volumeSlider.dataset.audioStatus = status;
      this.volumeSlider.disabled = status === AUDIO_MANAGER.STATUS_UNAVAILABLE;
      this.volumeSlider.value = String(percent);
      this.volumeSlider.style.setProperty(
        "--audio-volume-percent",
        percentValue,
      );
      this.volumeSlider.setAttribute("aria-valuetext", `${percent}%`);
      this.appTooltips?.setText(this.volumeSlider, VOLUME_TOOLTIP);
    }

    async loadPreference({ resumeIfNeeded = false } = {}) {
      const result = await this.manager.loadPreference();
      if (
        resumeIfNeeded &&
        result.status === AUDIO_MANAGER.STATUS_NEEDS_GESTURE
      ) {
        await this.manager.resume();
      }
      this.updateControls();
      return Object.freeze({ ...result, status: this.status() });
    }

    async toggleAudio() {
      const status = this.status();
      if (status === AUDIO_MANAGER.STATUS_UNAVAILABLE) {
        return status;
      }

      if (status === AUDIO_MANAGER.STATUS_MUTED) {
        if ((this.manager.volume?.() ?? DEFAULT_RESTORE_VOLUME) <= 0) {
          await this.manager.setVolume(DEFAULT_RESTORE_VOLUME);
        }
        await this.manager.setEnabled(true);
      } else if (status === AUDIO_MANAGER.STATUS_NEEDS_GESTURE) {
        await this.manager.resume();
      } else {
        await this.manager.setEnabled(false);
      }

      this.updateControls();
      return this.status();
    }

    async setVolumePercent(percent) {
      const volume = Math.max(
        0,
        Math.min(MAX_VOLUME_PERCENT, Number(percent) || 0),
      );
      if (volume <= 0) {
        await this.manager.setEnabled(false);
        this.updateControls();
        return this.status();
      }

      const initialStatus = this.status();
      await this.manager.setVolume(volume / MAX_VOLUME_PERCENT);
      if (initialStatus === AUDIO_MANAGER.STATUS_MUTED) {
        await this.manager.setEnabled(true);
      } else if (initialStatus === AUDIO_MANAGER.STATUS_NEEDS_GESTURE) {
        await this.manager.resume();
      }

      this.updateControls();
      return this.status();
    }

    audioManager() {
      return this.manager;
    }
  }

  function createController(options) {
    return new DashboardAudioControl(options);
  }

  root.PacePetsDashboardAudioControl = Object.freeze({
    STATUS_LABELS,
    createController,
  });
})(globalThis);
