(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-summary-methods.js.",
    );
  }

  const ZERO_STATE_KEYS = Object.freeze([
    DATA.PACE_STATES.perfectZero.key,
    DATA.PACE_STATES.singularity.key,
    DATA.PACE_STATES.splat.key,
  ]);

  function isZeroStateKey(stateKey) {
    return ZERO_STATE_KEYS.includes(stateKey);
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
      paceRatio = null,
      paceRatioForDisplay = null,
      timePercent,
      title,
    }) {
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
        paceRatio: null,
        paceRatioForDisplay: null,
        remainingPercent: null,
        timePercent: null,
      });
    },

    stalePaceSummary({ comparisonPaceRatio, remainingPercent, timePercent }) {
      return this.nothingnessPaceSummary("waitingForReading", {
        comparisonPaceRatio,
        paceRatio: null,
        paceRatioForDisplay: null,
        remainingPercent,
        timePercent,
      });
    },

    presentationPaceSummary(context, presentation) {
      const { state } = presentation;
      return {
        ...context,
        copy: state.copy,
        level: state.className,
        paceRatio: presentation.paceRatio,
        paceRatioForDisplay: presentation.displayRatio,
        title: state.title,
      };
    },

    singularityPaceSummary(context, presentation) {
      return {
        ...this.presentationPaceSummary(context, presentation),
        resetCountdownOverride: DATA.SINGULARITY_RESET_COUNTDOWN_TEXT,
      };
    },

    heldZeroPaceSummary(context, stateKey) {
      if (!isZeroStateKey(stateKey)) {
        return null;
      }

      const presentation = Object.freeze({
        displayRatio: 0,
        paceRatio: 0,
        state: DATA.PACE_STATES[stateKey],
      });
      const summary =
        stateKey === DATA.PACE_STATES.singularity.key
          ? this.singularityPaceSummary(context, presentation)
          : this.presentationPaceSummary(context, presentation);
      return { ...summary, heldZeroState: true };
    },

    paceSummaryModel({
      allowPerfectZero,
      comparisonPaceRatio,
      heldZeroStateKey = null,
      remainingPercent,
      resetCountdownDisplaysZero,
      staleWindow,
      timePercent,
    }) {
      if (!Number.isFinite(remainingPercent)) {
        return this.waitingPaceSummary();
      }

      const context = { comparisonPaceRatio, remainingPercent, timePercent };
      if (staleWindow) {
        return (
          this.heldZeroPaceSummary(context, heldZeroStateKey) ||
          this.stalePaceSummary(context)
        );
      }
      const presentation = PacePetsLogic.pacePresentationForValues(
        remainingPercent,
        timePercent,
        { allowPerfectZero, resetCountdownDisplaysZero },
      );
      if (presentation.state.key === DATA.PACE_STATES.muted.key) {
        return this.nothingnessPaceSummary("resetTimingMissing", {
          ...context,
          paceRatio: null,
          paceRatioForDisplay: null,
        });
      }

      return presentation.state.key === DATA.PACE_STATES.singularity.key
        ? this.singularityPaceSummary(context, presentation)
        : this.presentationPaceSummary(context, presentation);
    },

    renderPaceSummary(
      windowData,
      timePercent,
      staleWindow,
      comparisonPaceRatio = null,
      {
        applySummary = true,
        allowPerfectZero = true,
        heldZeroStateKey = null,
        resetCountdownDisplaysZero = false,
      } = {},
    ) {
      const summary = this.paceSummaryModel({
        allowPerfectZero,
        comparisonPaceRatio,
        heldZeroStateKey,
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
