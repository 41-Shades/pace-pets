(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-splat-fall-methods.js.",
    );
  }

  const SPLAT_FALL_CLEANUP_MS = 1105;
  const SPLAT_FALL_IMPACT_MS = 960;
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

  function prefersReducedMotion() {
    return globalThis.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;
  }

  function splatFallStartY(container) {
    const rect = container.getBoundingClientRect();
    const viewportHeight =
      globalThis.innerHeight || document.documentElement?.clientHeight || 0;
    return -Math.max(viewportHeight, rect.top + rect.height + 28, 180);
  }

  Object.assign(Controller.prototype, {
    clearSplatFallEffectClasses(container) {
      container.classList.remove(
        "has-pace-icon-effect-splat-fall",
        "is-splat-fall-running",
        "is-splat-impacting",
      );
      container.style.removeProperty("--splat-fall-start-x");
      container.style.removeProperty("--splat-fall-start-y");
      delete container.dataset.splatFallIntro;
    },

    renderSplatFallMotionLines(layer) {
      for (let lineIndex = 1; lineIndex <= 4; lineIndex += 1) {
        const line = document.createElement("span");
        line.className = `splat-fall-line splat-fall-line-${lineIndex}`;
        layer.append(line);
      }
    },

    renderSplatFallEffect(container) {
      const playIntro = container.dataset.splatFallIntro === "true";
      delete container.dataset.splatFallIntro;
      if (!playIntro || prefersReducedMotion() || !DATA.SPLAT_FREE_FALL_IMAGE) {
        return;
      }

      const layer = document.createElement("span");
      layer.className = "pace-icon-effect pace-icon-effect-splat-fall";
      layer.setAttribute("aria-hidden", "true");

      const image = document.createElement("img");
      image.className = "splat-fall-image";
      image.src = DATA.SPLAT_FREE_FALL_IMAGE;
      image.alt = "";
      image.decoding = "async";
      image.loading = "eager";
      layer.append(image);
      this.renderSplatFallMotionLines(layer);

      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        window.clearTimeout(impactTimer);
        window.clearTimeout(finishTimer);
        layer.remove();
        this.clearSplatFallEffectClasses(container);
        this.paceIconEffectCleanups.delete(container);
      };
      const impactTimer = window.setTimeout(() => {
        container.classList.add("is-splat-impacting");
      }, SPLAT_FALL_IMPACT_MS);
      const finishTimer = window.setTimeout(finish, SPLAT_FALL_CLEANUP_MS);

      container.style.setProperty("--splat-fall-start-x", "10px");
      container.style.setProperty(
        "--splat-fall-start-y",
        `${splatFallStartY(container)}px`,
      );
      container.classList.add(
        "has-pace-icon-effect-splat-fall",
        "is-splat-fall-running",
      );
      container.append(layer);
      image.addEventListener("animationend", finish, { once: true });
      this.paceIconEffectCleanups.set(container, finish);
    },
  });
})();
