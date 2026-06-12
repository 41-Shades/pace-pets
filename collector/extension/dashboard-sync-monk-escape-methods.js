(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const SyncMonkEscape = globalThis.PacePetsDashboardSyncMonkEscape;
  const SyncMonkEscapePreview = globalThis.PacePetsSyncMonkEscapePreviewControl;
  if (!DATA || !Controller || !SyncMonkEscape || !SyncMonkEscapePreview) {
    throw new Error(
      "Pace data, core, sync monk escape scene, and preview control must load before dashboard-sync-monk-escape-methods.js.",
    );
  }

  const BODY_CLASS = "has-sync-monk-escape";
  const LAUNCH_DELAY_MS = 60 * 1000;
  const LAUNCH_RETRY_DELAY_MS = 500;

  Object.assign(Controller.prototype, {
    clearSyncMonkEscapeLaunchTimer() {
      globalThis.clearTimeout(this.syncMonkEscapeLaunchTimer);
      this.syncMonkEscapeLaunchTimer = null;
    },

    resetSyncMonkEscapeEntryClock() {
      this.syncMonkEscapeEnteredAtMs = null;
      this.syncMonkEscapeLaunchedForEnteredAtMs = null;
    },

    stopSyncMonkEscape({ resetEntryClock = true } = {}) {
      this.clearSyncMonkEscapeLaunchTimer();
      this.syncMonkEscapeScene?.stop();
      this.syncMonkEscapeScene = null;
      document.body.classList.remove(BODY_CLASS);
      if (resetEntryClock) {
        this.resetSyncMonkEscapeEntryClock();
      }
    },

    scheduleSyncMonkEscapeLaunch(delayMs = null) {
      const enteredAtMs = this.syncMonkEscapeEnteredAtMs;
      if (this.isSyncMonkEscapeScheduleBlocked(enteredAtMs)) {
        return false;
      }

      const targetDelayMs =
        delayMs ??
        Math.max(0, enteredAtMs + LAUNCH_DELAY_MS - performance.now());
      this.clearSyncMonkEscapeLaunchTimer();
      this.syncMonkEscapeLaunchTimer = globalThis.setTimeout(
        () => this.launchSyncMonkEscapeIfReady(),
        targetDelayMs,
      );
      return true;
    },

    isSyncMonkEscapeScheduleBlocked(enteredAtMs) {
      return (
        enteredAtMs === null ||
        this.syncMonkEscapeScene ||
        this.syncMonkEscapeLaunchedForEnteredAtMs === enteredAtMs ||
        !SyncMonkEscape.motionPreferenceEnabled()
      );
    },

    isSyncMonkEscapeLaunchBlocked(enteredAtMs) {
      return enteredAtMs === null || !SyncMonkEscape.motionPreferenceEnabled();
    },

    syncMonkEscapeNeedsDelay(enteredAtMs, ignoreDelay) {
      const remainingMs = enteredAtMs + LAUNCH_DELAY_MS - performance.now();
      return !ignoreDelay && remainingMs > 16 ? remainingMs : null;
    },

    stopRunningSyncMonkEscapeScene() {
      this.syncMonkEscapeScene?.stop();
      this.syncMonkEscapeScene = null;
    },

    hasCompletedSyncMonkEscapeLaunch(enteredAtMs, allowReplay) {
      return (
        this.syncMonkEscapeScene ||
        (!allowReplay &&
          this.syncMonkEscapeLaunchedForEnteredAtMs === enteredAtMs)
      );
    },

    retrySyncMonkEscapeLaunch({ allowReplay, ignoreDelay }) {
      if (!ignoreDelay) {
        return this.scheduleSyncMonkEscapeLaunch(LAUNCH_RETRY_DELAY_MS);
      }

      this.syncMonkEscapeLaunchTimer = globalThis.setTimeout(
        () =>
          this.launchSyncMonkEscapeIfReady({
            allowReplay,
            ignoreDelay,
          }),
        LAUNCH_RETRY_DELAY_MS,
      );
      return false;
    },

    createSyncMonkEscapeLaunch(enteredAtMs, { allowReplay, ignoreDelay }) {
      const scene = SyncMonkEscape.create(this.elements.paceIcon, (stopped) => {
        if (this.syncMonkEscapeScene === stopped) {
          this.syncMonkEscapeScene = null;
        }
      });
      if (!scene) {
        return this.retrySyncMonkEscapeLaunch({ allowReplay, ignoreDelay });
      }

      this.syncMonkEscapeScene = scene;
      this.syncMonkEscapeLaunchedForEnteredAtMs = enteredAtMs;
      return true;
    },

    launchSyncMonkEscapeIfReady({
      allowReplay = false,
      ignoreDelay = false,
    } = {}) {
      this.syncMonkEscapeLaunchTimer = null;
      if (this.currentPaceLevel() !== DATA.PACE_STATES.sync.className) {
        this.stopSyncMonkEscape();
        return false;
      }

      const enteredAtMs = this.syncMonkEscapeEnteredAtMs;
      if (this.isSyncMonkEscapeLaunchBlocked(enteredAtMs)) {
        return false;
      }

      const delayMs = this.syncMonkEscapeNeedsDelay(enteredAtMs, ignoreDelay);
      if (delayMs !== null) {
        return this.scheduleSyncMonkEscapeLaunch(delayMs);
      }
      if (this.syncMonkEscapeScene && allowReplay) {
        this.stopRunningSyncMonkEscapeScene();
      }
      if (this.hasCompletedSyncMonkEscapeLaunch(enteredAtMs, allowReplay)) {
        return true;
      }

      return this.createSyncMonkEscapeLaunch(enteredAtMs, {
        allowReplay,
        ignoreDelay,
      });
    },

    launchSyncMonkEscapePreview() {
      if (this.currentPaceLevel() !== DATA.PACE_STATES.sync.className) {
        return false;
      }

      this.clearSyncMonkEscapeLaunchTimer();
      this.syncMonkEscapeEnteredAtMs ??= performance.now();
      return this.launchSyncMonkEscapeIfReady({
        allowReplay: true,
        ignoreDelay: true,
      });
    },

    bindSyncMonkEscapePreviewRequests() {
      if (
        this.syncMonkEscapePreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }

      this.syncMonkEscapePreviewRequestsBound = true;
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!SyncMonkEscapePreview.isLaunchMessage(message)) {
            return false;
          }

          sendResponse?.({ ok: this.launchSyncMonkEscapePreview() });
          return false;
        },
      );
    },

    setSyncMonkEscapeActive(active, { entered = false } = {}) {
      if (!active) {
        this.stopSyncMonkEscape();
        return false;
      }

      if (entered || this.syncMonkEscapeEnteredAtMs === null) {
        this.clearSyncMonkEscapeLaunchTimer();
        this.syncMonkEscapeScene?.stop();
        this.syncMonkEscapeScene = null;
        this.syncMonkEscapeEnteredAtMs = performance.now();
        this.syncMonkEscapeLaunchedForEnteredAtMs = null;
      }

      return this.scheduleSyncMonkEscapeLaunch();
    },
  });
})();
