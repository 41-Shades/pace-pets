(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  if (!Controller || !DASHBOARD_PREFERENCES) {
    throw new Error(
      "Pace core and preferences must load before dashboard-ease-up-methods.js.",
    );
  }

  const SIDE_EYE_ANIMATION_DURATION_MS = 7800;
  const SIDE_EYE_INITIAL_DELAY_RANGE_MS = Object.freeze([7000, 10000]);
  const SIDE_EYE_PLAYING_CLASS = "is-ease-up-side-eye-playing";
  const SIDE_EYE_REPEAT_DELAY_RANGE_MS = Object.freeze([24000, 55000]);
  const STEAM_PATHS = Object.freeze([
    "M9.5 27 C8 24.8 11.2 23 9.9 20.8 C8.8 19 11.2 17.6 10.5 16",
    "M13 27 C11.5 24.8 14.7 23 13.4 20.8 C12.3 19 14.7 17.6 14 16",
    "M16.3 26.2 C15.1 24.4 17.7 22.8 16.6 20.9 C15.8 19.4 17.8 18 17.1 16.6",
  ]);
  const SIDE_EYE_PATHS = Object.freeze([
    "M37.5 75.8 C45 72 57.1 72.1 64.6 75.8 C63.3 95.2 38.8 95.5 37.5 75.8Z",
    "M123.6 75.8 C131.4 72 143.8 72.1 151.5 75.8 C150.1 95.2 124.9 95.5 123.6 75.8Z",
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

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
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

  function createSideEyeLayer() {
    const eyeLayer = svgElement("svg", {
      "aria-hidden": "true",
      class: "pace-ease-up-eye-layer",
      focusable: "false",
      viewBox: "0 0 265 265",
    });
    const eyes = svgElement("g", {
      class: "pace-ease-up-eyes",
    });

    SIDE_EYE_PATHS.forEach((pathData, pathIndex) => {
      eyes.append(
        svgElement("path", {
          class: `pace-ease-up-eye pace-ease-up-eye-${pathIndex + 1}`,
          d: pathData,
        }),
      );
    });

    eyeLayer.append(eyes);
    return eyeLayer;
  }

  function createEaseUpLayer() {
    const layer = spanWithClass("pace-icon-effect pace-ease-up-layer");
    const eyeLayer = createSideEyeLayer();
    const steamLayer = createSteamLayer();

    layer.setAttribute("aria-hidden", "true");
    layer.append(eyeLayer, steamLayer);
    return layer;
  }

  function clearSideEyeTimers(state) {
    window.clearTimeout(state.clearTimer);
    window.clearTimeout(state.playTimer);
    state.clearTimer = null;
    state.playTimer = null;
  }

  Object.assign(Controller.prototype, {
    clearEaseUpEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-ease-up",
        SIDE_EYE_PLAYING_CLASS,
      );
      container
        .closest(".pace-card")
        ?.classList.remove("has-pace-ease-up-effect");
    },

    renderEaseUpEffect(container) {
      this.clearEaseUpEffectClasses(container);
      container.classList.add("has-pace-icon-effect-ease-up");
      container.closest(".pace-card")?.classList.add("has-pace-ease-up-effect");

      if (!motionPreferenceEnabled()) {
        this.paceIconEffectCleanups.set(container, () => {
          this.clearEaseUpEffectClasses(container);
        });
        return;
      }

      const layer = createEaseUpLayer();
      const stopSideEyeSchedule = this.startEaseUpSideEyeSchedule(container);
      container.append(layer);
      this.paceIconEffectCleanups.set(container, () => {
        stopSideEyeSchedule();
        layer.remove();
        this.clearEaseUpEffectClasses(container);
      });
    },

    startEaseUpSideEyeSchedule(container) {
      const state = {
        clearTimer: null,
        isActive: true,
        playTimer: null,
      };

      const schedule = (delayRange) => {
        state.playTimer = window.setTimeout(() => {
          state.playTimer = null;
          if (!state.isActive) {
            return;
          }
          if (document.hidden) {
            schedule(SIDE_EYE_REPEAT_DELAY_RANGE_MS);
            return;
          }

          container.classList.add(SIDE_EYE_PLAYING_CLASS);
          state.clearTimer = window.setTimeout(() => {
            state.clearTimer = null;
            container.classList.remove(SIDE_EYE_PLAYING_CLASS);
            if (state.isActive) {
              schedule(SIDE_EYE_REPEAT_DELAY_RANGE_MS);
            }
          }, SIDE_EYE_ANIMATION_DURATION_MS);
        }, this.randomIntegerInRange(delayRange));
      };

      schedule(SIDE_EYE_INITIAL_DELAY_RANGE_MS);
      return () => {
        state.isActive = false;
        clearSideEyeTimers(state);
        container.classList.remove(SIDE_EYE_PLAYING_CLASS);
      };
    },
  });
})();
