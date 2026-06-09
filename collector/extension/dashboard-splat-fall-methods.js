(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-splat-fall-methods.js.",
    );
  }

  const SPLAT_FALL_DURATION_MS = 1200;
  const SPLAT_FALL_CLEANUP_MS = 1105;
  const SPLAT_CARD_IMPACT_DURATION_MS = SPLAT_FALL_DURATION_MS + 20;
  const SPLAT_FALL_IMPACT_MS = 960;
  const SPLAT_RATIO_BOUNCE_DURATION_MS = SPLAT_FALL_DURATION_MS;
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

  function restartClassAnimation(element, className) {
    element.classList.remove(className);
    element.getBoundingClientRect();
    element.classList.add(className);
  }

  Object.assign(Controller.prototype, {
    clearSplatFallEffectClasses(container, { clearCardImpact = true } = {}) {
      container.classList.remove(
        "has-pace-icon-effect-splat-fall",
        "is-splat-fall-running",
        "is-splat-impacting",
      );
      container.style.removeProperty("--splat-fall-start-x");
      container.style.removeProperty("--splat-fall-start-y");
      delete container.dataset.splatFallIntro;
      if (clearCardImpact) {
        this.elements.paceCard?.classList.remove("is-splat-card-impacting");
      }
    },

    renderSplatFallMotionLines(layer) {
      for (let lineIndex = 1; lineIndex <= 4; lineIndex += 1) {
        const line = document.createElement("span");
        line.className = `splat-fall-line splat-fall-line-${lineIndex}`;
        layer.append(line);
      }
    },

    renderSplatRatioBounceClone() {
      const source = this.elements.paceRatioValue;
      const rect = source?.getBoundingClientRect();
      if (!source || !rect?.width || !rect.height) {
        return;
      }

      const computedStyle = globalThis.getComputedStyle(source);
      const clone = document.createElement("span");
      clone.className = "pace-ratio-splat-pop-clone";
      clone.textContent = source.textContent;
      clone.setAttribute("aria-hidden", "true");
      clone.style.setProperty(
        "--splat-fall-duration",
        `${SPLAT_RATIO_BOUNCE_DURATION_MS}ms`,
      );
      Object.assign(clone.style, {
        color: computedStyle.color,
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontStyle: computedStyle.fontStyle,
        fontVariantNumeric: computedStyle.fontVariantNumeric,
        fontWeight: computedStyle.fontWeight,
        height: `${rect.height}px`,
        left: `${rect.left}px`,
        letterSpacing: computedStyle.letterSpacing,
        lineHeight: computedStyle.lineHeight,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
      });

      const removeClone = () => clone.remove();
      clone.addEventListener("animationend", removeClone, { once: true });
      window.setTimeout(removeClone, SPLAT_RATIO_BOUNCE_DURATION_MS + 80);
      document.body.append(clone);
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
      let cardImpactTimer = null;
      const clearCardImpact = () => {
        window.clearTimeout(cardImpactTimer);
        cardImpactTimer = null;
        this.elements.paceCard?.classList.remove("is-splat-card-impacting");
      };
      const finish = ({
        clearCardImpact: shouldClearCardImpact = true,
      } = {}) => {
        if (finished) {
          return;
        }

        finished = true;
        window.clearTimeout(impactTimer);
        window.clearTimeout(finishTimer);
        layer.remove();
        this.clearSplatFallEffectClasses(container, {
          clearCardImpact: shouldClearCardImpact,
        });
        if (shouldClearCardImpact) {
          clearCardImpact();
        }
        this.paceIconEffectCleanups.delete(container);
      };
      const impactTimer = window.setTimeout(() => {
        container.classList.add("is-splat-impacting");
        if (this.elements.paceCard) {
          this.renderSplatRatioBounceClone();
          restartClassAnimation(
            this.elements.paceCard,
            "is-splat-card-impacting",
          );
          cardImpactTimer = window.setTimeout(
            clearCardImpact,
            SPLAT_CARD_IMPACT_DURATION_MS,
          );
        }
      }, SPLAT_FALL_IMPACT_MS);
      const finishTimer = window.setTimeout(
        () => finish({ clearCardImpact: false }),
        SPLAT_FALL_CLEANUP_MS,
      );

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
      image.addEventListener(
        "animationend",
        () => finish({ clearCardImpact: false }),
        { once: true },
      );
      this.paceIconEffectCleanups.set(container, () => finish());
    },
  });
})();
