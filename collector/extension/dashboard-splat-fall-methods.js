(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  const PROFILE = globalThis.PacePetsDashboardSplatFallProfile;
  const PREVIEW = globalThis.PacePetsSplatBouncePreviewControl;
  const SPLAT_ENTRY = globalThis.PacePetsDashboardSplatEntryPlayback;
  if (
    !DATA ||
    !Controller ||
    !DASHBOARD_PREFERENCES ||
    !PROFILE ||
    !PREVIEW ||
    !SPLAT_ENTRY
  ) {
    throw new Error(
      [
        "Pace data, core, preferences, Splat profiles, Splat entry playback,",
        "and preview controls must load before",
        "dashboard-splat-fall-methods.js.",
      ].join(" "),
    );
  }

  const SPLAT_FALL_DURATION_MS = 1200;
  const SPLAT_FALL_CLEANUP_MS = 1105;
  const SPLAT_CARD_IMPACT_DURATION_MS = SPLAT_FALL_DURATION_MS + 20;
  const SPLAT_FALL_IMPACT_MS = 960;
  const SPLAT_EXTREME_CARD_DROP_PROGRESS = 0.08;

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

  function createSplatFallLayer(imageSrc) {
    const layer = document.createElement("span");
    layer.className = "pace-icon-effect pace-icon-effect-splat-fall";
    layer.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.className = "splat-fall-image";
    image.src = imageSrc;
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    layer.append(image);
    return { image, layer };
  }

  function applySplatFallTimingStyles(container, fallTiming) {
    container.style.setProperty(
      "--splat-fall-duration",
      `${fallTiming.durationMs}ms`,
    );
    container.style.setProperty("--splat-fall-start-x", "10px");
    container.style.setProperty(
      "--splat-fall-start-y",
      `${splatFallStartY(container)}px`,
    );
  }

  const DEFAULT_SPLAT_FALL_TIMING = Object.freeze({
    cleanupMs: SPLAT_FALL_CLEANUP_MS,
    durationMs: SPLAT_FALL_DURATION_MS,
    impactMs: SPLAT_FALL_IMPACT_MS,
  });

  const RATIO_BOUNCE_PIXEL_PROPERTIES = Object.freeze([
    ["--splat-pop-peak-x", "peakXPx"],
    ["--splat-pop-peak-y", "peakYPx"],
    ["--splat-pop-rebound-x", "reboundXPx"],
    ["--splat-pop-rebound-y", "reboundYPx"],
    ["--splat-pop-second-y", "secondYPx"],
    ["--splat-pop-settle-y", "settleYPx"],
  ]);
  const RATIO_EXTREME_PIXEL_PROPERTIES = Object.freeze([
    ["--splat-extreme-slam-y", "slamYPx"],
    ["--splat-extreme-descent-high-y", "slamDescentHighYPx"],
    ["--splat-extreme-descent-mid-y", "slamDescentMidYPx"],
    ["--splat-extreme-descent-near-y", "slamDescentNearYPx"],
    ["--splat-extreme-descent-final-y", "slamDescentFinalYPx"],
    ["--splat-extreme-settle-y", "slamSettleYPx"],
    ["--splat-extreme-small-bounce-y", "slamSmallBounceYPx"],
  ]);

  function applyPixelProperties(style, profile, properties, { required }) {
    for (const [property, key] of properties) {
      const value = profile[key];
      if (required || Number.isFinite(value)) {
        style.setProperty(property, `${value}px`);
      }
    }
  }

  function applyRatioBounceCloneProfile(clone, profile) {
    const { style } = clone;
    style.setProperty("--splat-ratio-pop-duration", `${profile.durationMs}ms`);
    applyPixelProperties(style, profile, RATIO_BOUNCE_PIXEL_PROPERTIES, {
      required: true,
    });
    style.setProperty("--splat-pop-peak-scale", String(profile.peakScale));
    style.setProperty(
      "--splat-pop-rebound-scale",
      String(profile.reboundScale),
    );
    applyPixelProperties(style, profile, RATIO_EXTREME_PIXEL_PROPERTIES, {
      required: false,
    });
  }

  Object.assign(Controller.prototype, {
    clearSplatMaxBouncePreview() {
      window.clearTimeout(this.splatMaxBouncePreviewTimer);
      window.clearTimeout(this.splatMaxBounceCardTimer);
      this.splatMaxBouncePreviewTimer = null;
      this.splatMaxBounceCardTimer = null;
      this.splatMaxBounceRatioOriginRect = null;
      PROFILE.clearCardImpact(this.elements.paceCard);
      this.elements.paceCard?.classList.remove("is-splat-ratio-source-hidden");
    },

    clearSplatFallEffectClasses(container, { clearCardImpact = true } = {}) {
      container.classList.remove(
        "has-pace-icon-effect-splat-fall",
        "is-splat-fall-running",
        "is-splat-impacting",
      );
      container.style.removeProperty("--splat-fall-start-x");
      container.style.removeProperty("--splat-fall-start-y");
      container.style.removeProperty("--splat-fall-duration");
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
      const currentRect = source?.getBoundingClientRect();
      if (!source || !currentRect?.width || !currentRect.height) {
        return;
      }

      const bounceProfile = profile || PROFILE.randomRatioBounceProfile(this);
      const computedStyle = globalThis.getComputedStyle(source);
      const rect = bounceProfile.originRect || currentRect;
      const clone = document.createElement("span");
      clone.className = "pace-ratio-splat-pop-clone";
      clone.classList.add(...[bounceProfile.typeClass].filter(Boolean));
      clone.textContent = source.textContent;
      clone.setAttribute("aria-hidden", "true");
      applyRatioBounceCloneProfile(clone, bounceProfile);
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
      const removeDelayMs =
        bounceProfile.removeDelayMs || bounceProfile.durationMs;
      if (removeDelayMs <= bounceProfile.durationMs) {
        clone.addEventListener("animationend", removeClone, { once: true });
      }
      window.setTimeout(removeClone, removeDelayMs + 80);
      document.body.append(clone);
    },

    playSplatMaxBounceSlam() {
      const ratioProfile = PROFILE.extremeRatioSlamProfile();
      const cardProfile = PROFILE.extremeCardImpactProfile();
      const cardImpactDelayMs = Math.max(
        0,
        (ratioProfile.slamImpactDelayMs || 0) -
          Math.round(cardProfile.durationMs * SPLAT_EXTREME_CARD_DROP_PROGRESS),
      );
      ratioProfile.removeDelayMs = Math.max(
        ratioProfile.durationMs + 100,
        cardImpactDelayMs + cardProfile.durationMs + 100,
        this.splatMaxThrowRemoveDelayMs?.(cardImpactDelayMs, cardProfile) || 0,
      );
      ratioProfile.originRect = this.splatMaxBounceRatioOriginRect;

      this.renderSplatRatioBounceClone(ratioProfile);
      this.elements.paceCard?.classList.add("is-splat-ratio-source-hidden");
      window.clearTimeout(this.splatMaxBounceCardTimer);
      this.splatMaxBounceCardTimer = window.setTimeout(() => {
        if (!this.elements.paceCard) {
          return;
        }

        PROFILE.applyCardImpactProfile(this.elements.paceCard, cardProfile);
        restartClassAnimation(
          this.elements.paceCard,
          "is-splat-card-impacting",
        );
      }, cardImpactDelayMs);
      this.queueSplatMaxThrowForCardImpact?.(cardImpactDelayMs, cardProfile);
      this.splatMaxBouncePreviewTimer = window.setTimeout(
        () => this.clearSplatMaxBouncePreview({ clearThrow: false }),
        ratioProfile.removeDelayMs,
      );
    },

    previewSplatMaxBounce() {
      if (this.currentPaceLevel() !== DATA.PACE_STATES.splat.className) {
        return {
          message: PREVIEW.fallbackErrorMessage,
          ok: false,
        };
      }
      if (!motionPreferenceEnabled()) {
        return {
          message: "Turn motion on before previewing Max Splat bounce.",
          ok: false,
        };
      }
      if (!DATA.SPLAT_FREE_FALL_IMAGE) {
        return {
          message: "Splat free-fall art is unavailable.",
          ok: false,
        };
      }

      this.clearPaceIconEffects?.(this.elements.paceIcon);
      this.clearSplatMaxBouncePreview();
      this.splatMaxBounceRatioOriginRect = SPLAT_ENTRY.ratioOriginRect(this);
      this.elements.paceIcon.dataset.splatFallIntro = "true";
      this.renderSplatFallEffect(this.elements.paceIcon, {
        fallTiming: SPLAT_ENTRY.maxSplatFallTiming,
        impactProfile: {
          card: PROFILE.maxIntroCardImpactProfile(),
          ratio: null,
        },
        onImpact: () => this.queueSplatMaxBounceSlam(),
      });
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

    renderSplatFallEffect(
      container,
      {
        fallTiming = DEFAULT_SPLAT_FALL_TIMING,
        impactProfile = null,
        onImpact,
      } = {},
    ) {
      const playIntro = container.dataset.splatFallIntro === "true";
      delete container.dataset.splatFallIntro;
      if (
        !playIntro ||
        !motionPreferenceEnabled() ||
        !DATA.SPLAT_FREE_FALL_IMAGE
      ) {
        return;
      }

      const { image, layer } = createSplatFallLayer(DATA.SPLAT_FREE_FALL_IMAGE);
      this.renderSplatFallMotionLines(layer);
      const playback = SPLAT_ENTRY.resolve(this, {
        fallTiming,
        impactProfile,
        onImpact,
      });

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
        if (this.elements.paceCard && playback.impactProfile.card) {
          PROFILE.applyCardImpactProfile(
            this.elements.paceCard,
            playback.impactProfile.card,
          );
          if (playback.impactProfile.ratio) {
            this.renderSplatRatioBounceClone(playback.impactProfile.ratio);
          }
          restartClassAnimation(
            this.elements.paceCard,
            "is-splat-card-impacting",
          );
          cardImpactTimer = window.setTimeout(
            clearCardImpact,
            Math.max(
              SPLAT_CARD_IMPACT_DURATION_MS,
              (playback.impactProfile.ratio?.durationMs || 0) + 100,
            ),
          );
        }
        playback.onImpact?.();
      }, playback.fallTiming.impactMs);
      const finishTimer = window.setTimeout(
        () => finish({ clearCardImpact: false }),
        playback.fallTiming.cleanupMs,
      );

      applySplatFallTimingStyles(container, playback.fallTiming);
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
