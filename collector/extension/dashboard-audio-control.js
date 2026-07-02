(function attachPacePetsDashboardAudioControl(root) {
  "use strict";

  const AUDIO_MANAGER = root.PacePetsDashboardAudioManager;
  if (!AUDIO_MANAGER) {
    throw new Error(
      "Pace Pets dashboard audio manager must load before dashboard-audio-control.js.",
    );
  }

  const STATUS_LABELS = Object.freeze({
    [AUDIO_MANAGER.STATUS_MUTED]: "Turn sound on",
    [AUDIO_MANAGER.STATUS_NEEDS_GESTURE]: "Allow sound for this page",
    [AUDIO_MANAGER.STATUS_READY]: "Turn sound off",
    [AUDIO_MANAGER.STATUS_UNAVAILABLE]: "Sound unavailable",
  });

  function pressedForStatus(status) {
    return String(status === AUDIO_MANAGER.STATUS_READY);
  }

  class DashboardAudioControl {
    constructor({
      appTooltips = null,
      audioManager = AUDIO_MANAGER.create(),
      button = null,
    } = {}) {
      this.appTooltips = appTooltips;
      this.manager = audioManager;
      this.button = button;
      this.unsubscribeStatusChange =
        this.manager.addStatusChangeListener?.(() => {
          this.updateButton();
        }) || null;
      this.updateButton();
    }

    status() {
      return this.manager.status();
    }

    labelForStatus(status) {
      return STATUS_LABELS[status] || STATUS_LABELS[AUDIO_MANAGER.STATUS_MUTED];
    }

    updateButton() {
      if (!this.button) {
        return;
      }

      const status = this.status();
      const label = this.labelForStatus(status);
      this.button.dataset.audioStatus = status;
      this.button.disabled = status === AUDIO_MANAGER.STATUS_UNAVAILABLE;
      this.button.setAttribute("aria-pressed", pressedForStatus(status));
      this.button.setAttribute("aria-label", label);
      this.appTooltips?.setText(this.button, label);
    }

    async loadPreference({ resumeIfNeeded = false } = {}) {
      const result = await this.manager.loadPreference();
      if (
        resumeIfNeeded &&
        result.status === AUDIO_MANAGER.STATUS_NEEDS_GESTURE
      ) {
        await this.manager.resume();
      }
      this.updateButton();
      return Object.freeze({ ...result, status: this.status() });
    }

    async toggleAudio() {
      const status = this.status();
      if (status === AUDIO_MANAGER.STATUS_UNAVAILABLE) {
        return status;
      }

      if (status === AUDIO_MANAGER.STATUS_MUTED) {
        await this.manager.setEnabled(true);
      } else if (status === AUDIO_MANAGER.STATUS_NEEDS_GESTURE) {
        await this.manager.resume();
      } else {
        await this.manager.setEnabled(false);
      }

      this.updateButton();
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
