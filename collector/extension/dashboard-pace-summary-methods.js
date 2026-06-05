(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  if (!DATA || !Controller) {
    throw new Error(
      "Pace data and core must load before dashboard-pace-summary-methods.js.",
    );
  }

  Object.assign(Controller.prototype, {
    updateTabTitle(title, paceRatio) {
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

      this.setPaceLevel(level);
      this.elements.paceTitle.textContent = title;
      this.elements.paceCopy.textContent = copy;
      this.elements.paceStats.hidden = paceRatioForDisplay === null;
      this.elements.paceRatioStat.hidden = paceRatioForDisplay === null;
      this.elements.paceRatioValue.textContent =
        paceRatioForDisplay === null
          ? "--"
          : PacePetsLogic.formatPaceRatioValue(paceRatioForDisplay);
      this.renderPaceAltRatio(comparisonPaceRatio);
      this.updateTabTitle(title, paceRatioForDisplay);
    },

    waitingPaceSummary() {
      return {
        copy: "Waiting for the next automatic check.",
        level: DATA.MUTED_PACE_CLASS,
        remainingPercent: null,
        timePercent: null,
        title: "Waiting for usage",
      };
    },

    stalePaceSummary({
      comparisonPaceRatio,
      remainingPercent,
      timePercent,
      waitingForReadingText,
    }) {
      return {
        comparisonPaceRatio,
        copy: "New window, no reading yet.",
        level: DATA.MUTED_PACE_CLASS,
        remainingPercent,
        timePercent,
        title: waitingForReadingText,
      };
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

    resetTimeMissingSummary(context) {
      return {
        ...context,
        copy: "Reset timing is unavailable.",
        level: DATA.MUTED_PACE_CLASS,
        title: "Reset time missing",
      };
    },

    ratioPaceSummary(context, paceRatio) {
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
      staleWindow,
      timePercent,
      waitingForReadingText,
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
      const hasTime = Number.isFinite(timePercent) && timePercent > 0;
      if (staleWindow) {
        return this.stalePaceSummary({ ...context, waitingForReadingText });
      }
      if (
        PacePetsLogic.isPerfectZeroPercentPair(remainingPercent, timePercent) &&
        !allowPerfectZero
      ) {
        return this.perfectZeroBlockedSummary(context);
      }
      if (controlledPresentation) {
        return this.controlledPaceSummary(context, controlledPresentation);
      }
      if (!hasTime || paceRatio === null) {
        return this.resetTimeMissingSummary(context);
      }

      return this.ratioPaceSummary(context, paceRatio);
    },

    renderPaceSummary(
      windowData,
      timePercent,
      staleWindow,
      comparisonPaceRatio = null,
      { allowPerfectZero = true, waitingForReadingText = "Waiting" } = {},
    ) {
      this.setPaceSummary(
        this.paceSummaryModel({
          allowPerfectZero,
          comparisonPaceRatio,
          remainingPercent: windowData?.remainingPercent,
          staleWindow,
          timePercent,
          waitingForReadingText,
        }),
      );
    },
  });
})();
