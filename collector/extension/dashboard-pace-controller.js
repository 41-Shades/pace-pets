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
      mutedClassName: DATA.MUTED_PACE_CLASS,
      refreshForcedPaceStateOverride:
        controller.refreshForcedPaceStateOverride.bind(controller),
      renderPaceSummary: controller.renderPaceSummary.bind(controller),
      renderStateRail: controller.renderStateRail.bind(controller),
      setPaceSummary: controller.setPaceSummary.bind(controller),
      setPercent: controller.setPercent.bind(controller),
    });
  }

  globalThis.PacePetsDashboardPace = Object.freeze({
    createController,
  });
})();
