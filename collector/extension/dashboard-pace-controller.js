(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const PREVIEW_BROKER = globalThis.PacePetsDashboardDevPreviewBroker;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !PREVIEW_BROKER || !Controller) {
    throw new Error(
      "Pace data and controller core must load before dashboard-pace-controller.js.",
    );
  }

  function createController(options) {
    const controller = new Controller(options);
    controller.bindBrakeExtremePreviewRequests?.();
    controller.bindBigBangReplayRequests?.();
    controller.bindCheckerboardRevealPreviewRequests?.();
    controller.bindPaceStateTransitionPreviewRequests?.();
    controller.bindSyncMonkEscapePreviewRequests?.();
    PREVIEW_BROKER.start();
    return Object.freeze({
      hasForcedPaceStateOverride:
        controller.hasForcedPaceStateOverride.bind(controller),
      nothingnessClassName: DATA.PACE_STATES.nothingness.className,
      nothingnessTitle: DATA.PACE_STATES.nothingness.title,
      pauseHiddenDocumentMotionEffects:
        controller.pauseHiddenDocumentMotionEffects.bind(controller),
      playPendingSpecialTransition:
        controller.playPendingSpecialTransition.bind(controller),
      refreshForcedPaceStateOverride:
        controller.refreshForcedPaceStateOverride.bind(controller),
      renderPaceSummary: controller.renderPaceSummary.bind(controller),
      renderStateRail: controller.renderStateRail.bind(controller),
      setPaceSummary: controller.setPaceSummary.bind(controller),
      setPercent: controller.setPercent.bind(controller),
      stopMotionEffects: controller.stopMotionEffects.bind(controller),
    });
  }

  globalThis.PacePetsDashboardPace = Object.freeze({
    createController,
  });
})();
