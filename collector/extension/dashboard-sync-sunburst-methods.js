(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const SyncSunburst = globalThis.PacePetsDashboardSyncSunburst;
  if (!Controller || !SyncSunburst) {
    throw new Error(
      "Pace sync sunburst renderer must load before dashboard-sync-sunburst-methods.js.",
    );
  }

  const STOP_DELAY_MS = 1200;

  Object.assign(Controller.prototype, {
    clearSyncSunburstPageBackgroundStopTimer() {
      window.clearTimeout(this.syncSunburstPageBackgroundStopTimer);
      this.syncSunburstPageBackgroundStopTimer = null;
    },

    stopSyncSunburstPageBackground() {
      this.clearSyncSunburstPageBackgroundStopTimer();
      this.setSyncMonkEscapeActive?.(false);
      this.syncSunburstPageBackgroundScene?.stop();
      this.syncSunburstPageBackgroundScene = null;
    },

    scheduleSyncSunburstPageBackgroundStop() {
      if (this.syncSunburstPageBackgroundStopTimer) {
        return;
      }

      this.syncSunburstPageBackgroundStopTimer = window.setTimeout(() => {
        this.syncSunburstPageBackgroundStopTimer = null;
        this.syncSunburstPageBackgroundScene?.stop();
        this.syncSunburstPageBackgroundScene = null;
      }, STOP_DELAY_MS);
    },

    deactivateSyncSunburstPageBackground() {
      this.setSyncMonkEscapeActive?.(false);
      this.scheduleSyncSunburstPageBackgroundStop();
      return false;
    },

    activateSyncMonkEscape(enteredSync) {
      this.setSyncMonkEscapeActive?.(true, { entered: enteredSync });
    },

    createSyncSunburstPageBackgroundScene(enteredSync) {
      const scene = SyncSunburst.create(this.elements.paceIcon, {
        startedAtMs: this.syncSunburstPageBackgroundStartedAtMs,
      });
      if (!scene) {
        this.stopSyncSunburstPageBackground();
        return false;
      }

      this.syncSunburstPageBackgroundScene = scene;
      this.activateSyncMonkEscape(enteredSync);
      return true;
    },

    setSyncSunburstPageBackgroundActive(active, { enteredSync = false } = {}) {
      if (!active || this.motionPreferenceEnabled?.() === false) {
        return this.deactivateSyncSunburstPageBackground();
      }

      this.clearSyncSunburstPageBackgroundStopTimer();
      this.syncSunburstPageBackgroundStartedAtMs ??= window.performance.now();

      if (this.syncSunburstPageBackgroundScene) {
        this.activateSyncMonkEscape(enteredSync);
        return true;
      }

      return this.createSyncSunburstPageBackgroundScene(enteredSync);
    },
  });
})();
