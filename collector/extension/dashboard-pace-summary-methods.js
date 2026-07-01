(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-summary-methods.js.",
    );
  }

  function shouldBlockPerfectZero({
    allowPerfectZero,
    remainingPercent,
    timePercent,
  }) {
    return (
      PacePetsLogic.isPerfectZeroPercentPair(remainingPercent, timePercent) &&
      !PacePetsLogic.isUsageAbsoluteZeroBeforeFinalTimeBand(
        remainingPercent,
        timePercent,
      ) &&
      !allowPerfectZero
    );
  }

  function shouldShowSingularity(
    controlledPresentation,
    resetCountdownDisplaysZero,
  ) {
    return (
      controlledPresentation?.state.key === DATA.PACE_STATES.perfectZero.key &&
      resetCountdownDisplaysZero
    );
  }

  const ZERO_STATE_KEYS = Object.freeze([
    DATA.PACE_STATES.perfectZero.key,
    DATA.PACE_STATES.singularity.key,
    DATA.PACE_STATES.splat.key,
  ]);

  function isZeroStatePresentation(controlledPresentation) {
    return ZERO_STATE_KEYS.includes(controlledPresentation?.state.key);
  }

  function nothingnessCopy(reasonKey) {
    const state = DATA.PACE_STATES.nothingness;
    return state.copyByReason?.[reasonKey] || state.copy;
  }

  Object.assign(Controller.prototype, {
    nothingnessPaceSummary(reasonKey, context = {}) {
      const state = DATA.PACE_STATES.nothingness;
      return {
        ...context,
        copy: nothingnessCopy(reasonKey),
        level: state.className,
        title: state.title,
      };
    },

    updateTabTitle(title, paceRatio) {
      if (title === DATA.PACE_STATES.nothingness.title) {
        document.title = "The Void";
        return;
      }

      const selectedWindowKey = this.getSelectedWindowKey();
      const spec =
        this.windowSpecs[selectedWindowKey] ||
        this.windowSpecs[this.defaultWindowKey];
      document.title =
        paceRatio === null
          ? `Pace: ${title}`
          : `${spec.badge}: ${PacePetsLogic.formatPaceRatioValue(paceRatio)}`;
    },

    renderPaceAltRatio(altRatio) {
      this.elements.paceAltRatio.replaceChildren();
      if (!altRatio) {
        this.elements.paceAltRatio.hidden = true;
        return;
      }

      if (typeof altRatio === "string") {
        this.elements.paceAltRatio.textContent = altRatio;
        this.elements.paceAltRatio.hidden = !altRatio;
        return;
      }

      const label = document.createElement("span");
      label.className = "pace-alt-ratio-label";
      label.textContent = altRatio.label;
      const value = document.createElement("span");
      value.className = "pace-alt-ratio-value";
      if (altRatio.className) {
        value.classList.add("is-tinted");
        value.classList.add(altRatio.className);
      }
      value.textContent = altRatio.value;

      this.elements.paceAltRatio.replaceChildren(label, " ", value);
      this.elements.paceAltRatio.hidden = false;
    },

    formatFeaturedPaceRatioValue(state, paceRatio) {
      if (state?.key === DATA.PACE_STATES.bigBang.key) {
        return "100%";
      }

      return PacePetsLogic.formatPaceRatioValue(paceRatio);
    },

    applyPaceSummary({
      comparisonPaceRatio,
      copy,
      displayState,
      level,
      paceRatio,
      paceRatioForDisplay,
      previousState,
      timePercent,
      title,
    }) {
      this.currentPaceSummaryTimePercent = timePercent;
      this.setPaceLevel(level);
      this.updateBrakeWobbleIntensity?.(paceRatio);
      this.updateSprintSmokeIntensity?.(paceRatio);
      this.elements.paceTitle.textContent = title;
      this.elements.paceCopy.textContent = copy;
      this.elements.paceStats.hidden = paceRatioForDisplay === null;
      this.elements.paceRatioStat.hidden = paceRatioForDisplay === null;
      this.elements.paceRatioValue.textContent =
        paceRatioForDisplay === null
          ? "--"
          : this.formatFeaturedPaceRatioValue(
              displayState,
              paceRatioForDisplay,
            );
      this.renderPaceAltRatio(comparisonPaceRatio);
      this.updateTabTitle(title, paceRatioForDisplay);
      this.updateSpecialTransitionState?.(previousState, displayState);
    },

    setPaceSummary({
      comparisonPaceRatio = null,
      copy,
      level,
      paceRatioDisplayOverride = null,
      remainingPercent,
      timePercent,
      title,
    }) {
      const paceRatio = PacePetsLogic.paceRatioForValues(
        remainingPercent,
        timePercent,
      );
      const paceRatioForDisplay =
        paceRatioDisplayOverride === null
          ? paceRatio
          : paceRatioDisplayOverride;
      const previousState = this.paceStateForClassName(this.currentPaceLevel());
      const displayState = this.paceStateForClassName(level);
      this.applyPaceStateChange(previousState, displayState, () => {
        this.applyPaceSummary({
          comparisonPaceRatio,
          copy,
          displayState,
          level,
          paceRatio,
          paceRatioForDisplay,
          previousState,
          timePercent,
          title,
        });
      });
    },

    waitingPaceSummary() {
      return this.nothingnessPaceSummary("waitingForUsage", {
        remainingPercent: null,
        timePercent: null,
      });
    },

    stalePaceSummary({ comparisonPaceRatio, remainingPercent, timePercent }) {
      return this.nothingnessPaceSummary("waitingForReading", {
        comparisonPaceRatio,
        remainingPercent,
        timePercent,
      });
    },

    perfectZeroBlockedSummary(context) {
      const state = DATA.PACE_STATES.criticalBehind;
      return {
        ...context,
        copy: state.copy,
        level: state.className,
        title: state.title,
      };
    },

    controlledPaceSummary(context, controlledPresentation) {
      const { state } = controlledPresentation;
      return {
        ...context,
        copy: state.copy,
        level: state.className,
        paceRatioDisplayOverride: controlledPresentation.displayRatio,
        title: state.title,
      };
    },

    singularityPaceSummary(context) {
      const state = DATA.PACE_STATES.singularity;
      return {
        ...context,
        copy: state.copy,
        level: state.className,
        paceRatioDisplayOverride: 0,
        resetCountdownOverride: DATA.SINGULARITY_RESET_COUNTDOWN_TEXT,
        title: state.title,
      };
    },

    heldZeroPaceSummary(
      context,
      controlledPresentation,
      resetCountdownDisplaysZero,
    ) {
      if (!isZeroStatePresentation(controlledPresentation)) {
        return null;
      }

      const summary = shouldShowSingularity(
        controlledPresentation,
        resetCountdownDisplaysZero,
      )
        ? this.singularityPaceSummary(context)
        : this.controlledPaceSummary(context, controlledPresentation);
      return { ...summary, heldZeroState: true };
    },

    ratioPaceSummary(context, paceRatio) {
      if (paceRatio === null) {
        return this.nothingnessPaceSummary("resetTimingMissing", context);
      }

      const state = PacePetsLogic.paceStatePresentationForRatio(paceRatio);
      return {
        ...context,
        copy: state.copy,
        level: state.className,
        title: state.title,
      };
    },

    paceSummaryModel({
      allowPerfectZero,
      comparisonPaceRatio,
      remainingPercent,
      resetCountdownDisplaysZero,
      staleWindow,
      timePercent,
    }) {
      if (!Number.isFinite(remainingPercent)) {
        return this.waitingPaceSummary();
      }

      const context = { comparisonPaceRatio, remainingPercent, timePercent };
      const paceRatio = PacePetsLogic.paceRatioForValues(
        remainingPercent,
        timePercent,
      );
      const controlledPresentation =
        PacePetsLogic.controlledPacePresentationForValues(
          remainingPercent,
          timePercent,
          { allowPerfectZero },
        );
      if (staleWindow) {
        return (
          this.heldZeroPaceSummary(
            context,
            controlledPresentation,
            resetCountdownDisplaysZero,
          ) || this.stalePaceSummary(context)
        );
      }
      if (
        !controlledPresentation &&
        shouldBlockPerfectZero({
          allowPerfectZero,
          remainingPercent,
          timePercent,
        })
      ) {
        return this.perfectZeroBlockedSummary(context);
      }
      if (
        shouldShowSingularity(
          controlledPresentation,
          resetCountdownDisplaysZero,
        )
      ) {
        return this.singularityPaceSummary(context);
      }
      if (controlledPresentation) {
        return this.controlledPaceSummary(context, controlledPresentation);
      }

      return this.ratioPaceSummary(context, paceRatio);
    },

    renderPaceSummary(
      windowData,
      timePercent,
      staleWindow,
      comparisonPaceRatio = null,
      {
        applySummary = true,
        allowPerfectZero = true,
        resetCountdownDisplaysZero = false,
      } = {},
    ) {
      const summary = this.paceSummaryModel({
        allowPerfectZero,
        comparisonPaceRatio,
        remainingPercent: windowData?.remainingPercent,
        resetCountdownDisplaysZero,
        staleWindow,
        timePercent,
      });
      if (applySummary) {
        this.setPaceSummary(summary);
      }
      return summary;
    },
  });
})();
