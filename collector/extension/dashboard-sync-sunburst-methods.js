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

    setSyncSunburstPageBackgroundActive(active, origin) {
      if (!active) {
        this.scheduleSyncSunburstPageBackgroundStop();
        return false;
      }

      this.clearSyncSunburstPageBackgroundStopTimer();
      this.syncSunburstPageBackgroundStartedAtMs ??= window.performance.now();

      if (this.syncSunburstPageBackgroundScene) {
        if (origin) {
          this.syncSunburstPageBackgroundScene.updateOrigin(origin);
        }
        return true;
      }
      if (!origin) {
        return false;
      }

      const scene = SyncSunburst.create(origin, {
        startedAtMs: this.syncSunburstPageBackgroundStartedAtMs,
      });
      if (!scene) {
        this.stopSyncSunburstPageBackground();
        return false;
      }

      this.syncSunburstPageBackgroundScene = scene;
      return true;
    },
  });
})();
