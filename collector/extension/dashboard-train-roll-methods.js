(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-train-roll-methods.js.",
    );
  }

  Object.assign(Controller.prototype, {
    clearTrainRollEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-train-roll");
    },

    renderTrainRollEffect(container) {
      container.classList.add("has-pace-icon-effect-train-roll");
    },
  });
})();
