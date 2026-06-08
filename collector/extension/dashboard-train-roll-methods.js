(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error(
      "Pace core must load before dashboard-train-roll-methods.js.",
    );
  }

  function spanWithClass(className) {
    const element = document.createElement("span");
    element.className = className;
    return element;
  }

  Object.assign(Controller.prototype, {
    clearTrainRollEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-train-roll");
    },

    renderTrainRollEffect(container) {
      const smoke = spanWithClass("pace-train-smoke-overlay");
      smoke.setAttribute("aria-hidden", "true");
      smoke.append(
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-1"),
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-2"),
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-3"),
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-4"),
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-5"),
        spanWithClass("pace-train-cloud-puff pace-train-cloud-puff-6"),
      );

      container.classList.add("has-pace-icon-effect-train-roll");
      container.append(smoke);
    },
  });
})();
