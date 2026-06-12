(() => {
  "use strict";

  const Controller = globalThis.PacePetsDashboardPaceController;
  const ECLIPSE_ICON = globalThis.PacePetsDashboardEclipseIcon;
  const PERFECT_ZERO_SPACE = globalThis.PacePetsPerfectZeroSpace;
  if (!Controller || !ECLIPSE_ICON || !PERFECT_ZERO_SPACE) {
    throw new Error(
      "Pace core, eclipse icon, and perfect-zero scene must load before dashboard-perfect-zero-page-background-methods.js.",
    );
  }

  function canUsePerfectZeroPageBackground(controller) {
    return Boolean(
      controller.elements.shell &&
      controller.elements.perfectZeroPageBackground,
    );
  }

  function shouldStopPerfectZeroPageBackground(controller, active) {
    return !active || controller.motionPreferenceEnabled?.() === false;
  }

  function hasMatchingPerfectZeroPageBackgroundScene(
    controller,
    featuredIconPlanet,
  ) {
    return (
      controller.perfectZeroPageBackgroundScene &&
      controller.perfectZeroPageBackgroundFeaturedIconPlanet ===
        featuredIconPlanet
    );
  }

  function preparePerfectZeroPageBackground(controller) {
    controller.elements.perfectZeroPageBackground.hidden = false;
    document.body.classList.add("has-perfect-zero-page-background");
    controller.perfectZeroEclipseIconController()?.start();
  }

  function createPerfectZeroPageBackgroundScene(
    controller,
    featuredIconPlanet,
  ) {
    return PERFECT_ZERO_SPACE.create(
      controller.elements.shell,
      controller.elements.perfectZeroPageBackground,
      {
        profile: PERFECT_ZERO_SPACE.profiles.fullBleed,
        scene: {
          featuredPlanets: featuredIconPlanet
            ? controller.perfectZeroPageFeaturedPlanets()
            : [],
        },
      },
    );
  }

  Object.assign(Controller.prototype, {
    perfectZeroEclipseIconController() {
      if (!this.perfectZeroEclipseIcon && this.elements.themeToggle) {
        this.perfectZeroEclipseIcon = ECLIPSE_ICON.create(
          this.elements.themeToggle,
        );
      }

      return this.perfectZeroEclipseIcon;
    },

    stopPerfectZeroPageBackgroundScene() {
      this.perfectZeroPageBackgroundScene?.stop();
      this.perfectZeroPageBackgroundScene = null;
      this.perfectZeroPageBackgroundFeaturedIconPlanet = null;
      this.perfectZeroEclipseIcon?.stop();
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

    setPerfectZeroPageBackgroundActive(
      active,
      { featuredIconPlanet = true } = {},
    ) {
      if (!canUsePerfectZeroPageBackground(this)) {
        return false;
      }

      if (shouldStopPerfectZeroPageBackground(this, active)) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      if (hasMatchingPerfectZeroPageBackgroundScene(this, featuredIconPlanet)) {
        this.perfectZeroEclipseIconController()?.start();
        return true;
      }

      this.stopPerfectZeroPageBackgroundScene();
      preparePerfectZeroPageBackground(this);
      const scene = createPerfectZeroPageBackgroundScene(
        this,
        featuredIconPlanet,
      );
      if (!scene) {
        this.stopPerfectZeroPageBackgroundScene();
        return false;
      }

      this.perfectZeroPageBackgroundScene = scene;
      this.perfectZeroPageBackgroundFeaturedIconPlanet = featuredIconPlanet;
      return true;
    },
  });
})();
