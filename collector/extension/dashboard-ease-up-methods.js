(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!Controller) {
    throw new Error("Pace core must load before dashboard-ease-up-methods.js.");
  }

  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const STEAM_PATHS = Object.freeze([
    "M9.5 27 C8 24.8 11.2 23 9.9 20.8 C8.8 19 11.2 17.6 10.5 16",
    "M13 27 C11.5 24.8 14.7 23 13.4 20.8 C12.3 19 14.7 17.6 14 16",
    "M16.3 26.2 C15.1 24.4 17.7 22.8 16.6 20.9 C15.8 19.4 17.8 18 17.1 16.6",
  ]);

  function spanWithClass(className) {
    const element = document.createElement("span");
    element.className = className;
    return element;
  }

  function svgElement(tagName, attrs) {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      tagName,
    );
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
    return element;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
  }

  function createSteamLayer() {
    const steamLayer = svgElement("svg", {
      "aria-hidden": "true",
      class: "pace-ease-up-steam-layer",
      focusable: "false",
      viewBox: "0 0 24 32",
    });
    STEAM_PATHS.forEach((pathData, pathIndex) => {
      steamLayer.append(
        svgElement("path", {
          class: `pace-ease-up-steam pace-ease-up-steam-${pathIndex + 1}`,
          d: pathData,
        }),
      );
    });
    return steamLayer;
  }

  function createEaseUpLayer() {
    const layer = spanWithClass("pace-icon-effect pace-ease-up-layer");
    const steamLayer = createSteamLayer();

    layer.setAttribute("aria-hidden", "true");
    layer.append(steamLayer);
    return layer;
  }

  Object.assign(Controller.prototype, {
    clearEaseUpEffectClasses(container) {
      container.classList.remove("has-pace-icon-effect-ease-up");
      container
        .closest(".pace-card")
        ?.classList.remove("has-pace-ease-up-effect");
    },

    renderEaseUpEffect(container) {
      this.clearEaseUpEffectClasses(container);
      container.classList.add("has-pace-icon-effect-ease-up");
      container.closest(".pace-card")?.classList.add("has-pace-ease-up-effect");

      if (prefersReducedMotion()) {
        this.paceIconEffectCleanups.set(container, () => {
          this.clearEaseUpEffectClasses(container);
        });
        return;
      }

      const layer = createEaseUpLayer();
      container.append(layer);
      this.paceIconEffectCleanups.set(container, () => {
        layer.remove();
        this.clearEaseUpEffectClasses(container);
      });
    },
  });
})();
