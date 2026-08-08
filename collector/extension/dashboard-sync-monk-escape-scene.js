(() => {
  "use strict";

  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const MOTION = globalThis.PacePetsDashboardSyncMonkEscapeMotion;
  if (!DASHBOARD_PREFERENCES || !MOTION) {
    throw new Error(
      "Sync monk motion and preferences must load before dashboard-sync-monk-escape-scene.js.",
    );
  }

  const BODY_CLASS = "has-sync-monk-escape";
  const CONE_HALF_ANGLE_RADIANS = (35 * Math.PI) / 180;
  const SPEED_MAX_PX_PER_SECOND = 30;
  const SPEED_MIN_PX_PER_SECOND = 18;
  const UPWARD_ANGLE_RADIANS = -Math.PI / 2;

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function viewportSize() {
    const root = document.documentElement;
    return {
      height: Math.max(1, globalThis.innerHeight || root?.clientHeight || 1),
      width: Math.max(1, globalThis.innerWidth || root?.clientWidth || 1),
    };
  }

  function syncIconSource(container) {
    return container.querySelector(":scope > img, :scope > svg");
  }

  function cloneIcon(source) {
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    if (clone.tagName === "IMG") {
      clone.alt = "";
      clone.decoding = "async";
      clone.loading = "eager";
    }
    return clone;
  }

  function launchVelocity() {
    const angle =
      UPWARD_ANGLE_RADIANS +
      randomBetween(-CONE_HALF_ANGLE_RADIANS, CONE_HALF_ANGLE_RADIANS);
    const speed = randomBetween(
      SPEED_MIN_PX_PER_SECOND,
      SPEED_MAX_PX_PER_SECOND,
    );
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  function axisTransform(axis, position) {
    return axis === "x"
      ? `translate3d(${position}px, 0, 0)`
      : `translate3d(0, ${position}px, 0)`;
  }

  class SyncMonkEscapeScene {
    constructor(container, onStop) {
      this.axisMotions = [];
      this.body = null;
      this.container = container;
      this.isStopped = false;
      this.layer = null;
      this.onStop = onStop;
      this.verticalLayer = null;
      this.handleMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.removeMotionPreferenceListener = () => {};
    }

    createLayer() {
      const source = syncIconSource(this.container);
      const rect = source?.getBoundingClientRect();
      if (!source || !rect?.width || !rect.height) {
        return null;
      }

      const layer = document.createElement("span");
      const verticalLayer = document.createElement("span");
      layer.className = "sync-monk-escape";
      layer.setAttribute("aria-hidden", "true");
      layer.style.color = globalThis.getComputedStyle(source).color;
      layer.style.height = `${rect.height}px`;
      layer.style.width = `${rect.width}px`;
      verticalLayer.className = "sync-monk-escape-y";
      verticalLayer.append(cloneIcon(source));
      layer.append(verticalLayer);
      this.body = {
        height: rect.height,
        width: rect.width,
        x: rect.left,
        y: rect.top,
        ...launchVelocity(),
      };
      this.verticalLayer = verticalLayer;
      return layer;
    }

    createAxisMotion(axis, element, position, velocity, maximum) {
      const track = MOTION.createAxisTrack({ maximum, position, velocity });
      element.style.transform = axisTransform(axis, track.position);
      const animation = track.moving
        ? element.animate(
            track.keyframes.map((keyframe) => ({
              offset: keyframe.offset,
              transform: axisTransform(axis, keyframe.position),
            })),
            {
              duration: track.durationMs,
              easing: "linear",
              fill: "both",
              iterations: Infinity,
            },
          )
        : null;
      return { animation, axis, element, track };
    }

    startMotion(body) {
      const size = viewportSize();
      this.axisMotions = [
        this.createAxisMotion(
          "x",
          this.layer,
          body.x,
          body.vx,
          Math.max(0, size.width - body.width),
        ),
        this.createAxisMotion(
          "y",
          this.verticalLayer,
          body.y,
          body.vy,
          Math.max(0, size.height - body.height),
        ),
      ];
      const timelineTime = document.timeline?.currentTime;
      for (const motion of this.axisMotions) {
        if (motion.animation && Number.isFinite(timelineTime)) {
          motion.animation.startTime = timelineTime;
        }
      }
      this.updatePlayback();
    }

    currentBody() {
      const [xMotion, yMotion] = this.axisMotions;
      const x = MOTION.stateAt(
        xMotion.track,
        Number(xMotion.animation?.currentTime ?? 0),
      );
      const y = MOTION.stateAt(
        yMotion.track,
        Number(yMotion.animation?.currentTime ?? 0),
      );
      return {
        height: this.body.height,
        width: this.body.width,
        vx: x.velocity,
        vy: y.velocity,
        x: x.position,
        y: y.position,
      };
    }

    cancelMotion() {
      for (const motion of this.axisMotions) {
        motion.animation?.cancel();
      }
      this.axisMotions = [];
    }

    updatePlayback() {
      const method = document.hidden ? "pause" : "play";
      for (const motion of this.axisMotions) {
        motion.animation?.[method]();
      }
    }

    handleMotionPreferenceChange() {
      if (!motionPreferenceEnabled()) {
        this.stop();
      }
    }

    handleResize() {
      if (this.isStopped || this.axisMotions.length !== 2) {
        return;
      }

      const body = this.currentBody();
      this.cancelMotion();
      this.body = body;
      this.startMotion(body);
    }

    handleVisibilityChange() {
      this.updatePlayback();
    }

    start() {
      if (!motionPreferenceEnabled()) {
        return null;
      }

      this.layer = this.createLayer();
      if (!this.layer) {
        return null;
      }

      document.body.append(this.layer);
      this.startMotion(this.body);
      document.body.classList.add(BODY_CLASS);
      this.removeMotionPreferenceListener =
        DASHBOARD_PREFERENCES.addMotionPreferenceChangeListener(
          this.handleMotionPreferenceChange,
        );
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      globalThis.addEventListener("resize", this.handleResize);
      return this;
    }

    stop() {
      if (this.isStopped) {
        return;
      }

      this.isStopped = true;
      this.cancelMotion();
      this.removeMotionPreferenceListener();
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      globalThis.removeEventListener("resize", this.handleResize);
      this.layer?.remove();
      document.body.classList.remove(BODY_CLASS);
      this.onStop?.(this);
    }
  }

  function create(container, onStop) {
    if (!motionPreferenceEnabled()) {
      return null;
    }

    return new SyncMonkEscapeScene(container, onStop).start();
  }

  globalThis.PacePetsDashboardSyncMonkEscape = Object.freeze({
    create,
    motionPreferenceEnabled,
  });
})();
