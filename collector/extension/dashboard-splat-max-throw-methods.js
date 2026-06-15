(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-splat-max-throw-methods.js.",
    );
  }

  const MAX_THROW_ACTOR_SIZE_PX = 112;
  const MAX_THROW_DURATION_MS = 540;
  const MAX_THROW_SLAM_CARD_LAUNCH_PROGRESS = 0.08;
  const MAX_THROW_SLAM_DELAY_MS = 60;
  const MAX_THROW_WALL_STICK_MS = 350;
  const MAX_THROW_WALL_SLIDE_MS = 1600;
  const MAX_THROW_FLOOR_DRIFT_FALL_MS = 360;
  const MAX_THROW_FLOOR_SPIN_MS = 3400;
  const MAX_THROW_FLOOR_SLAM_MS = 270;
  const MAX_THROW_FINAL_SPLAT_SETTLE_MS = 290;
  const MAX_THROW_SEQUENCE_DURATION_MS =
    MAX_THROW_DURATION_MS +
    MAX_THROW_WALL_STICK_MS +
    MAX_THROW_WALL_SLIDE_MS +
    MAX_THROW_FLOOR_DRIFT_FALL_MS +
    MAX_THROW_FLOOR_SPIN_MS +
    MAX_THROW_FLOOR_SLAM_MS +
    MAX_THROW_FINAL_SPLAT_SETTLE_MS;
  const MAX_THROW_WALL_ANGLE_DEG = 10.5;
  const MAX_THROW_WALL_X_OVERHANG_PX = 24;
  const MAX_THROW_WALL_Y_INSET_PX = 4;
  const MAX_THROW_FLOOR_INWARD_DRIFT_PX = 56;
  const MAX_THROW_FLOOR_Y_OVERHANG_PX = 18;

  const BASE_CLEAR_SPLAT_MAX_BOUNCE_PREVIEW =
    Controller.prototype.clearSplatMaxBouncePreview;
  if (typeof BASE_CLEAR_SPLAT_MAX_BOUNCE_PREVIEW !== "function") {
    throw new Error(
      "Splat fall methods must load before dashboard-splat-max-throw-methods.js.",
    );
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function copyRect(rect) {
    if (!rect?.width || !rect.height) {
      return null;
    }

    return {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  }

  function viewportSize() {
    return {
      height: Math.max(
        globalThis.innerHeight || 0,
        document.documentElement?.clientHeight || 0,
      ),
      width: Math.max(
        globalThis.innerWidth || 0,
        document.documentElement?.clientWidth || 0,
      ),
    };
  }

  function maxThrowGeometry(originRect) {
    const viewport = viewportSize();
    const startX = Math.round(
      originRect.left + originRect.width / 2 - MAX_THROW_ACTOR_SIZE_PX / 2,
    );
    const startY = Math.round(
      originRect.top + originRect.height / 2 - MAX_THROW_ACTOR_SIZE_PX / 2,
    );
    const targetX = Math.max(
      startX + 1,
      viewport.width - MAX_THROW_ACTOR_SIZE_PX + MAX_THROW_WALL_X_OVERHANG_PX,
    );
    const throwXPx = targetX - startX;
    const wallAngleRadians = (MAX_THROW_WALL_ANGLE_DEG * Math.PI) / 180;
    const angledTargetY = startY - throwXPx * Math.tan(wallAngleRadians);
    const targetY = clamp(
      Math.round(angledTargetY),
      MAX_THROW_WALL_Y_INSET_PX,
      Math.max(
        MAX_THROW_WALL_Y_INSET_PX,
        viewport.height - MAX_THROW_ACTOR_SIZE_PX - MAX_THROW_WALL_Y_INSET_PX,
      ),
    );
    const throwYPx = targetY - startY;
    const arcLiftYPx = clamp(Math.round(throwXPx * 0.09), 48, 112);
    const floorYPx =
      viewport.height -
      MAX_THROW_ACTOR_SIZE_PX +
      MAX_THROW_FLOOR_Y_OVERHANG_PX -
      startY;
    const slideDistancePx = clamp(Math.round(viewport.height * 0.09), 45, 75);
    const wallSlideYPx = Math.min(
      throwYPx + slideDistancePx,
      Math.max(throwYPx, floorYPx - 120),
    );
    const floorXPx = Math.max(0, throwXPx - MAX_THROW_FLOOR_INWARD_DRIFT_PX);
    const floorSpinXPx = Math.round((throwXPx + floorXPx) / 2);
    const floorSpinYPx = Math.round((wallSlideYPx + floorYPx) / 2);

    return {
      floorYPx,
      floorXPx,
      floorSpinXPx,
      floorSpinYPx,
      midXPx: Math.round(throwXPx * 0.48),
      midYPx: Math.round(throwYPx * 0.48 - arcLiftYPx),
      startX,
      startY,
      throwXPx,
      throwYPx,
      wallSlideYPx,
    };
  }

  function setPixelVariable(style, property, value) {
    style.setProperty(property, `${value}px`);
  }

  function maxThrowStartDelayMs(cardImpactDelayMs, cardProfile) {
    return (
      cardImpactDelayMs +
      Math.round(cardProfile.durationMs * MAX_THROW_SLAM_CARD_LAUNCH_PROGRESS)
    );
  }

  Object.assign(Controller.prototype, {
    clearSplatMaxThrow() {
      window.clearTimeout(this.splatMaxThrowTimer);
      window.clearTimeout(this.splatMaxThrowRemoveTimer);
      window.clearTimeout(this.splatMaxThrowPulseTimer);
      this.splatMaxThrowTimer = null;
      this.splatMaxThrowRemoveTimer = null;
      this.splatMaxThrowPulseTimer = null;
      this.splatMaxThrowActor?.remove();
      this.splatMaxThrowActor = null;
      this.elements.paceIcon?.classList.remove("is-splat-max-throwing");
    },

    clearSplatMaxBouncePreview({ clearThrow = true } = {}) {
      if (clearThrow) {
        this.clearSplatMaxThrow();
      }
      BASE_CLEAR_SPLAT_MAX_BOUNCE_PREVIEW.call(this);
    },

    playSplatMaxThrow() {
      const originRect = copyRect(
        this.elements.paceIcon?.getBoundingClientRect(),
      );
      if (!originRect || !DATA.SPLAT_FREE_FALL_IMAGE) {
        return;
      }

      const geometry = maxThrowGeometry(originRect);
      const actor = document.createElement("span");
      actor.className = "splat-max-throw-actor";
      actor.setAttribute("aria-hidden", "true");
      Object.assign(actor.style, {
        height: `${MAX_THROW_ACTOR_SIZE_PX}px`,
        left: `${geometry.startX}px`,
        top: `${geometry.startY}px`,
        width: `${MAX_THROW_ACTOR_SIZE_PX}px`,
      });
      actor.style.setProperty(
        "--splat-max-throw-sequence-duration",
        `${MAX_THROW_SEQUENCE_DURATION_MS}ms`,
      );
      setPixelVariable(actor.style, "--splat-max-floor-x", geometry.floorXPx);
      setPixelVariable(
        actor.style,
        "--splat-max-floor-spin-x",
        geometry.floorSpinXPx,
      );
      setPixelVariable(
        actor.style,
        "--splat-max-floor-spin-y",
        geometry.floorSpinYPx,
      );
      setPixelVariable(actor.style, "--splat-max-floor-y", geometry.floorYPx);
      setPixelVariable(actor.style, "--splat-max-throw-x", geometry.throwXPx);
      setPixelVariable(actor.style, "--splat-max-throw-y", geometry.throwYPx);
      setPixelVariable(actor.style, "--splat-max-throw-mid-x", geometry.midXPx);
      setPixelVariable(actor.style, "--splat-max-throw-mid-y", geometry.midYPx);
      setPixelVariable(
        actor.style,
        "--splat-max-wall-slide-y",
        geometry.wallSlideYPx,
      );
      const flightImage = document.createElement("img");
      flightImage.className = "splat-max-throw-flight-image";
      flightImage.src = DATA.SPLAT_FREE_FALL_IMAGE;
      flightImage.alt = "";
      flightImage.decoding = "async";
      flightImage.loading = "eager";
      actor.append(flightImage);

      const wallImage = document.createElement("img");
      wallImage.className = "splat-max-throw-wall-image";
      wallImage.src =
        DATA.PACE_STATES?.splat?.playfulImage || DATA.SPLAT_FREE_FALL_IMAGE;
      wallImage.alt = "";
      wallImage.decoding = "async";
      wallImage.loading = "eager";
      actor.append(wallImage);

      this.splatMaxThrowActor?.remove();
      this.splatMaxThrowActor = actor;
      this.elements.paceIcon?.classList.add("is-splat-max-throwing");
      window.clearTimeout(this.splatMaxThrowPulseTimer);
      this.splatMaxThrowPulseTimer = window.setTimeout(() => {
        if (this.splatMaxThrowActor === actor) {
          actor.classList.add("is-splat-max-final-pulsing");
        }
      }, MAX_THROW_SEQUENCE_DURATION_MS);
      document.body.append(actor);
    },

    splatMaxThrowRemoveDelayMs(cardImpactDelayMs, cardProfile) {
      return (
        maxThrowStartDelayMs(cardImpactDelayMs, cardProfile) +
        MAX_THROW_SEQUENCE_DURATION_MS +
        120
      );
    },

    queueSplatMaxThrowForCardImpact(cardImpactDelayMs, cardProfile) {
      window.clearTimeout(this.splatMaxThrowTimer);
      this.splatMaxThrowTimer = window.setTimeout(
        () => this.playSplatMaxThrow(),
        maxThrowStartDelayMs(cardImpactDelayMs, cardProfile),
      );
    },

    queueSplatMaxBounceSlam() {
      this.clearSplatMaxThrow();
      window.clearTimeout(this.splatMaxBouncePreviewTimer);
      this.splatMaxBouncePreviewTimer = window.setTimeout(
        () => this.playSplatMaxBounceSlam(),
        MAX_THROW_SLAM_DELAY_MS,
      );
    },
  });
})();
