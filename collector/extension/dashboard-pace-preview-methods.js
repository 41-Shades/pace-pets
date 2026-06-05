(() => {
  "use strict";

  const DATA = globalThis.PacePetsDashboardPaceData;
  const Controller = globalThis.PacePetsDashboardPaceController;
  const PREVIEW_CONTROL = globalThis.PacePetsPreviewControl;
  if (!DATA || !Controller || !PREVIEW_CONTROL) {
    throw new Error(
      "Pace data, core, and preview controls must load before dashboard-pace-preview-methods.js.",
    );
  }

  Object.assign(Controller.prototype, {
    faviconSnapshot() {
      if (!this.elements.favicon) {
        return null;
      }

      return {
        hadHref: this.elements.favicon.hasAttribute("href"),
        href: this.elements.favicon.getAttribute("href"),
      };
    },

    restoreFaviconSnapshot(snapshot) {
      if (!this.elements.favicon || !snapshot) {
        return;
      }

      if (snapshot.hadHref) {
        this.elements.favicon.setAttribute("href", snapshot.href ?? "");
        return;
      }

      this.elements.favicon.removeAttribute("href");
    },

    percentSummarySnapshot() {
      return {
        usageText: this.elements.usagePercent.textContent,
        usageBarWidth: this.elements.usageBar.style.width,
        timeText: this.elements.timePercent.textContent,
        timeBarWidth: this.elements.timeBar.style.width,
      };
    },

    restorePercentSummarySnapshot(snapshot) {
      if (!snapshot) {
        return;
      }

      this.elements.usagePercent.textContent = snapshot.usageText;
      this.elements.usageBar.style.width = snapshot.usageBarWidth;
      this.elements.timePercent.textContent = snapshot.timeText;
      this.elements.timeBar.style.width = snapshot.timeBarWidth;
    },

    resetCountdownSnapshot() {
      return {
        progress:
          this.elements.resetProgressFill.style.getPropertyValue(
            "--reset-progress",
          ),
        text: this.elements.resetsIn.textContent,
      };
    },

    restoreResetCountdownSnapshot(snapshot) {
      if (!snapshot) {
        return;
      }

      this.elements.resetsIn.textContent = snapshot.text;
      this.elements.resetProgressFill.style.setProperty(
        "--reset-progress",
        snapshot.progress,
      );
    },

    applyStateResetCountdown(state) {
      if (state.key !== DATA.DASHBOARD_RAIL_STATES.singularity.key) {
        return;
      }

      this.elements.resetsIn.textContent =
        DATA.SINGULARITY_RESET_COUNTDOWN_TEXT;
      this.elements.resetProgressFill.style.setProperty(
        "--reset-progress",
        "100%",
      );
    },

    paceAltRatioSnapshot() {
      if (this.elements.paceAltRatio.hidden) {
        return null;
      }

      const label = this.elements.paceAltRatio.querySelector(
        ".pace-alt-ratio-label",
      );
      const value = this.elements.paceAltRatio.querySelector(
        ".pace-alt-ratio-value",
      );
      if (!label || !value) {
        return this.elements.paceAltRatio.textContent;
      }

      return {
        className: DATA.PACE_CLASSES.find((className) =>
          value.classList.contains(className),
        ),
        label: label.textContent,
        value: value.textContent,
      };
    },

    paceCardSnapshot() {
      return {
        level: this.currentPaceLevel(),
        favicon: this.faviconSnapshot(),
        percentSummary: this.percentSummarySnapshot(),
        resetCountdown: this.resetCountdownSnapshot(),
        title: this.elements.paceTitle.textContent,
        copy: this.elements.paceCopy.textContent,
        statsHidden: this.elements.paceStats.hidden,
        ratioStatHidden: this.elements.paceRatioStat.hidden,
        ratioValue: this.elements.paceRatioValue.textContent,
        tabTitle: document.title,
        altRatio: this.paceAltRatioSnapshot(),
      };
    },

    restorePaceCardSnapshot(snapshot) {
      if (!snapshot) {
        return;
      }

      this.setPaceLevel(snapshot.level, { updateTabIcon: false });
      this.elements.paceTitle.textContent = snapshot.title;
      this.elements.paceCopy.textContent = snapshot.copy;
      this.elements.paceStats.hidden = snapshot.statsHidden;
      this.elements.paceRatioStat.hidden = snapshot.ratioStatHidden;
      this.elements.paceRatioValue.textContent = snapshot.ratioValue;
      this.renderPaceAltRatio(snapshot.altRatio);
      this.restoreFaviconSnapshot(snapshot.favicon);
      this.restorePercentSummarySnapshot(snapshot.percentSummary);
      this.restoreResetCountdownSnapshot(snapshot.resetCountdown);
      document.title = snapshot.tabTitle;
    },

    clearPacePreviewRestoreTimer() {
      window.clearTimeout(this.pacePreviewRestoreTimer);
      this.pacePreviewRestoreTimer = null;
    },

    clearActivePacePreviewState() {
      this.activePacePreviewKey = null;
      this.pacePreviewRestoreSnapshot = null;
      this.clearPacePreviewRestoreTimer();
      this.elements.paceCard.classList.remove("is-previewing");
      this.updateStateRailPreviewSelection(null);
    },

    restorePacePreview() {
      if (!this.activePacePreviewKey) {
        return;
      }

      const snapshot = this.pacePreviewRestoreSnapshot;
      this.activePacePreviewKey = null;
      this.pacePreviewRestoreSnapshot = null;
      this.clearPacePreviewRestoreTimer();
      this.restoreToolbarPreviewBadge();
      this.elements.paceCard.classList.remove("is-previewing");
      this.updateStateRailPreviewSelection(null);
      this.restoreFaviconSnapshot(snapshot?.favicon);
      this.restorePercentSummarySnapshot(snapshot?.percentSummary);
      this.restoreResetCountdownSnapshot(snapshot?.resetCountdown);

      const currentHistory = this.getCurrentHistory();
      if (currentHistory) {
        this.renderHistory(currentHistory, this.getCurrentRefreshStatus());
        return;
      }

      this.restorePaceCardSnapshot(snapshot);
    },

    schedulePacePreviewRestore() {
      this.clearPacePreviewRestoreTimer();
      this.pacePreviewRestoreTimer = window.setTimeout(
        () => this.restorePacePreview(),
        PREVIEW_CONTROL.PACE_STATE_PREVIEW_DURATION_MS,
      );
    },

    renderPacePreviewState(state) {
      const previewPaceRatio = this.previewPaceRatioForState(state.key);
      if (previewPaceRatio === null) {
        return;
      }

      this.setPaceLevel(state.className, { updateStateRailActive: false });
      this.elements.paceCard.classList.add("is-previewing");
      this.elements.paceTitle.textContent = state.title;
      this.elements.paceCopy.textContent = state.copy;
      this.elements.paceStats.hidden = false;
      this.elements.paceRatioStat.hidden = false;
      this.elements.paceRatioValue.textContent =
        PacePetsLogic.formatPaceRatioValue(previewPaceRatio);
      const percentPair = PREVIEW_CONTROL.forcedPercentPairForState(state.key);
      this.setPreviewPercentPair(percentPair);
      this.renderPreviewChart(state.key, previewPaceRatio, percentPair);
      this.applyStateResetCountdown(state);
      this.renderPaceAltRatio(state.previewRatioLabel || state.ratioLabel);
      this.updateTabTitle(state.title, previewPaceRatio);
      this.updateStateRailPreviewSelection(state.key);
      this.updateToolbarPreviewBadge(state.key);
    },

    showPacePreview(stateKey) {
      const state = this.paceStateForKey(stateKey);
      if (!state || !this.previewStateKeyEnabled(state.key)) {
        return;
      }

      if (!this.activePacePreviewKey) {
        this.pacePreviewRestoreSnapshot = this.paceCardSnapshot();
      }

      this.activePacePreviewKey = state.key;
      this.clearPacePreviewRestoreTimer();
      this.renderPacePreviewState(state);
    },

    renderForcedPaceStateOverride() {
      const state = this.forcedPaceState();
      if (!state) {
        return false;
      }

      const forcedPaceRatio = this.forcedPaceRatioForState(state.key);
      if (forcedPaceRatio === null) {
        return false;
      }

      this.clearActivePacePreviewState();
      this.setPaceLevel(state.className);
      this.elements.paceTitle.textContent = state.title;
      this.elements.paceCopy.textContent = state.copy;
      this.elements.paceStats.hidden = false;
      this.elements.paceRatioStat.hidden = false;
      this.elements.paceRatioValue.textContent =
        PacePetsLogic.formatPaceRatioValue(forcedPaceRatio);
      const percentPair = PREVIEW_CONTROL.forcedPercentPairForState(state.key);
      this.setPreviewPercentPair(percentPair);
      this.renderPreviewChart(state.key, forcedPaceRatio, percentPair);
      this.applyStateResetCountdown(state);
      this.renderPaceAltRatio(state.previewRatioLabel || state.ratioLabel);
      this.updateTabTitle(state.title, forcedPaceRatio);
      return true;
    },

    refreshForcedOverrideOrActivePacePreview() {
      if (!this.renderForcedPaceStateOverride()) {
        this.refreshActivePacePreview();
      }
    },

    refreshActivePacePreview() {
      const state = this.paceStateForKey(this.activePacePreviewKey);
      if (!state || !this.previewStateKeyEnabled(state.key)) {
        this.restorePacePreview();
        return;
      }

      this.pacePreviewRestoreSnapshot = this.paceCardSnapshot();
      this.renderPacePreviewState(state);
    },
  });
})();
