(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and controller core must load before dashboard-pace-controller.js.",
    );
  }

  function createController(options) {
    const controller = new Controller(options);
    return Object.freeze({
      get activePreviewKey() {
        return controller.activePacePreviewKey;
      },
      mutedClassName: DATA.MUTED_PACE_CLASS,
      refreshForcedOverrideOrActivePacePreview:
        controller.refreshForcedOverrideOrActivePacePreview.bind(controller),
      renderPaceSummary: controller.renderPaceSummary.bind(controller),
      renderStateRail: controller.renderStateRail.bind(controller),
      restorePacePreview: controller.restorePacePreview.bind(controller),
      schedulePacePreviewRestore:
        controller.schedulePacePreviewRestore.bind(controller),
      setPaceSummary: controller.setPaceSummary.bind(controller),
      setPercent: controller.setPercent.bind(controller),
      showPacePreview: controller.showPacePreview.bind(controller),
      stateChipFromEvent: controller.stateChipFromEvent.bind(controller),
    });
  }

  globalThis.PacePetsDashboardPace = Object.freeze({
    createController,
  });
})();
