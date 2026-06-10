(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const PERFECT_ZERO_SPACE = globalThis.PacePetsPerfectZeroSpace;
  if (!Controller || !PERFECT_ZERO_SPACE) {
    throw new Error(
      "Pace core and perfect-zero scene must load before dashboard-perfect-zero-page-background-methods.js.",
    );
  }

  Object.assign(Controller.prototype, {
    stopPerfectZeroPageBackgroundScene() {
      this.perfectZeroPageBackgroundScene?.stop();
      this.perfectZeroPageBackgroundScene = null;
      if (this.elements.perfectZeroPageBackground) {
        this.elements.perfectZeroPageBackground.hidden = true;
      }
      document.body.classList.remove("has-perfect-zero-page-background");
    },

    perfectZeroPageFeaturedPlanets() {
      if (!this.elements.paceIcon || !this.elements.perfectZeroPageBackground) {
        return [];
      }

      const iconRect = this.elements.paceIcon.getBoundingClientRect();
      const canvasRect =
        this.elements.perfectZeroPageBackground.getBoundingClientRect();
      if (
        iconRect.width <= 0 ||
        iconRect.height <= 0 ||
        canvasRect.width <= 0 ||
        canvasRect.height <= 0
      ) {
        return [];
      }

      return [
        {
          minSize: 15,
          originX: iconRect.left + iconRect.width / 2 - canvasRect.left,
          originY: iconRect.top + iconRect.height / 2 - canvasRect.top,
          type: "ringedPlanet",
        },
      ];
    },

    setPerfectZeroPageBackgroundActive(active) {
      if (!this.elements.shell || !this.elements.perfectZeroPageBackground) {
        return false;
      }

      if (!active) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      if (this.perfectZeroPageBackgroundScene) {
        return true;
      }

      this.elements.perfectZeroPageBackground.hidden = false;
      document.body.classList.add("has-perfect-zero-page-background");
      const scene = PERFECT_ZERO_SPACE.create(
        this.elements.shell,
        this.elements.perfectZeroPageBackground,
        {
          profile: PERFECT_ZERO_SPACE.profiles.fullBleed,
          scene: {
            featuredPlanets: this.perfectZeroPageFeaturedPlanets(),
          },
        },
      );
      if (!scene) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      this.perfectZeroPageBackgroundScene = scene;
      return true;
    },
  });
})();
