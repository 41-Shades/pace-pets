(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const PROFILE = globalThis.PacePetsDashboardSplatFallProfile;
  const PREVIEW = globalThis.PacePetsSplatBouncePreviewControl;
  if (!DATA || !Controller || !DASHBOARD_PREFERENCES || !PROFILE || !PREVIEW) {
    throw new Error(
      [
        "Pace data, core, preferences, Splat profiles, and preview controls must load before",
        "dashboard-splat-fall-methods.js.",
      ].join(" "),
    );
  }

  const SPLAT_FALL_DURATION_MS = 1200;
  const SPLAT_FALL_CLEANUP_MS = 1105;
  const SPLAT_CARD_IMPACT_DURATION_MS = SPLAT_FALL_DURATION_MS + 20;
  const SPLAT_FALL_IMPACT_MS = 960;

  function motionPreferenceEnabled() {
    return DASHBOARD_PREFERENCES.motionPreferenceEnabled();
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
    clearSplatMaxBouncePreview() {
      window.clearTimeout(this.splatMaxBouncePreviewTimer);
      this.splatMaxBouncePreviewTimer = null;
      PROFILE.clearCardImpact(this.elements.paceCard);
    },

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
        PROFILE.clearCardImpact(this.elements.paceCard);
      }
    },

    renderSplatFallMotionLines(layer) {
      for (let lineIndex = 1; lineIndex <= 4; lineIndex += 1) {
        const line = document.createElement("span");
        line.className = `splat-fall-line splat-fall-line-${lineIndex}`;
        layer.append(line);
      }
    },

    renderSplatRatioBounceClone(profile) {
      const source = this.elements.paceRatioValue;
      const rect = source?.getBoundingClientRect();
      if (!source || !rect?.width || !rect.height) {
        return;
      }

      const bounceProfile = profile || PROFILE.randomRatioBounceProfile(this);
      const computedStyle = globalThis.getComputedStyle(source);
      const clone = document.createElement("span");
      clone.className = "pace-ratio-splat-pop-clone";
      clone.textContent = source.textContent;
      clone.setAttribute("aria-hidden", "true");
      clone.style.setProperty(
        "--splat-ratio-pop-duration",
        `${bounceProfile.durationMs}ms`,
      );
      clone.style.setProperty(
        "--splat-pop-peak-x",
        `${bounceProfile.peakXPx}px`,
      );
      clone.style.setProperty(
        "--splat-pop-peak-y",
        `${bounceProfile.peakYPx}px`,
      );
      clone.style.setProperty(
        "--splat-pop-peak-scale",
        String(bounceProfile.peakScale),
      );
      clone.style.setProperty(
        "--splat-pop-rebound-x",
        `${bounceProfile.reboundXPx}px`,
      );
      clone.style.setProperty(
        "--splat-pop-rebound-y",
        `${bounceProfile.reboundYPx}px`,
      );
      clone.style.setProperty(
        "--splat-pop-rebound-scale",
        String(bounceProfile.reboundScale),
      );
      clone.style.setProperty(
        "--splat-pop-second-y",
        `${bounceProfile.secondYPx}px`,
      );
      clone.style.setProperty(
        "--splat-pop-settle-y",
        `${bounceProfile.settleYPx}px`,
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
      window.setTimeout(removeClone, bounceProfile.durationMs + 80);
      document.body.append(clone);
    },

    previewSplatMaxBounce() {
      if (this.currentPaceLevel() !== DATA.PACE_STATES.splat.className) {
        return {
          message: "Open the dashboard on Splat before previewing max bounce.",
          ok: false,
        };
      }

      const ratioProfile = PROFILE.maxRatioBounceProfile();
      this.clearSplatMaxBouncePreview();
      PROFILE.applyCardImpactProfile(
        this.elements.paceCard,
        PROFILE.maxCardImpactProfile(),
      );
      this.renderSplatRatioBounceClone(ratioProfile);
      restartClassAnimation(this.elements.paceCard, "is-splat-card-impacting");
      this.splatMaxBouncePreviewTimer = window.setTimeout(
        () => this.clearSplatMaxBouncePreview(),
        Math.max(SPLAT_CARD_IMPACT_DURATION_MS, ratioProfile.durationMs + 100),
      );
      return { ok: true };
    },

    bindSplatBouncePreviewRequests() {
      if (
        this.splatBouncePreviewRequestsBound ||
        !globalThis.chrome?.runtime?.onMessage
      ) {
        return;
      }

      this.splatBouncePreviewRequestsBound = true;
      globalThis.chrome.runtime.onMessage.addListener(
        (message, _sender, sendResponse) => {
          if (!PREVIEW.isMaxBounceMessage(message)) {
            return false;
          }

          sendResponse?.(this.previewSplatMaxBounce());
          return false;
        },
      );
    },

    renderSplatFallEffect(container) {
      const playIntro = container.dataset.splatFallIntro === "true";
      delete container.dataset.splatFallIntro;
      if (
        !playIntro ||
        !motionPreferenceEnabled() ||
        !DATA.SPLAT_FREE_FALL_IMAGE
      ) {
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
      const impactProfile = {
        card: PROFILE.randomCardImpactProfile(this),
        ratio: PROFILE.randomRatioBounceProfile(this),
      };

      let finished = false;
      let cardImpactTimer = null;
      const clearCardImpact = () => {
        window.clearTimeout(cardImpactTimer);
        cardImpactTimer = null;
        PROFILE.clearCardImpact(this.elements.paceCard);
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
          PROFILE.applyCardImpactProfile(
            this.elements.paceCard,
            impactProfile.card,
          );
          this.renderSplatRatioBounceClone(impactProfile.ratio);
          restartClassAnimation(
            this.elements.paceCard,
            "is-splat-card-impacting",
          );
          cardImpactTimer = window.setTimeout(
            clearCardImpact,
            Math.max(
              SPLAT_CARD_IMPACT_DURATION_MS,
              impactProfile.ratio.durationMs + 100,
            ),
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
