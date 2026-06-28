(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Pace Pets dashboard app core must load before dashboard-event-methods.js.",
    );
  }

  Object.assign(App.prototype, {
    bindControlEvents() {
      this.elements.windowToggle.addEventListener("click", (event) => {
        if (this.toggleUsageWindow()) {
          this.appTooltips.releasePointerClickFocus(
            event,
            this.elements.windowToggle,
          );
        }
      });
      this.elements.themeToggle.addEventListener("click", (event) => {
        this.shellControls.toggleTheme();
        this.appTooltips.releasePointerClickFocus(
          event,
          this.elements.themeToggle,
        );
      });
      this.elements.motionToggle.addEventListener("click", (event) => {
        this.shellControls.toggleMotion();
        this.appTooltips.releasePointerClickFocus(
          event,
          this.elements.motionToggle,
        );
      });
      this.elements.manualRefreshButton.addEventListener("click", (event) => {
        this.dashboardStatus.runManualRefresh().catch((error) => {
          console.warn("Codex usage manual refresh failed:", error);
        });
        this.appTooltips.releasePointerClickFocus(
          event,
          this.elements.manualRefreshButton,
        );
      });
    },

    bindInfoPanelEvents() {
      this.elements.infoToggle.addEventListener("click", (event) => {
        this.shellControls.toggleInfoPanel({
          restoreFocus: !this.appTooltips.isPointerClick(event),
        });
        this.appTooltips.releasePointerClickFocus(
          event,
          this.elements.infoToggle,
        );
      });
      this.elements.infoClose.addEventListener("click", (event) => {
        this.shellControls.hideInfoPanel({
          restoreFocus: !this.appTooltips.isPointerClick(event),
        });
      });
      this.elements.clearDataButton.addEventListener("click", (event) => {
        this.elements.clearDataButton.disabled = true;
        this.clearLocalUsageData()
          .catch((error) => {
            console.warn("Could not clear local usage data:", error.message);
          })
          .finally(() => {
            this.elements.clearDataButton.disabled = false;
          });
        this.appTooltips.releasePointerClickFocus(
          event,
          this.elements.clearDataButton,
        );
      });
      this.elements.infoOverlay.addEventListener("click", (event) => {
        if (event.target === this.elements.infoOverlay) {
          this.shellControls.hideInfoPanel({
            restoreFocus: !this.appTooltips.isPointerClick(event),
          });
        }
      });
    },

    bindTooltipEvents() {
      document.addEventListener("pointerover", (event) => {
        const target = this.appTooltips.targetFromEvent(event);
        if (this.shouldSkipTooltipPointerOver(event, target)) {
          return;
        }

        this.appTooltips.schedule(target);
      });
      document.addEventListener("pointerout", (event) => {
        const target = this.appTooltips.targetFromEvent(event);
        if (
          !target ||
          (event.relatedTarget instanceof Node &&
            target.contains(event.relatedTarget))
        ) {
          return;
        }

        this.appTooltips.hide();
      });
      document.addEventListener("focusin", (event) => {
        const target = this.appTooltips.targetFromEvent(event);
        if (target && !this.appTooltips.isSuppressed()) {
          this.appTooltips.schedule(target);
        }
      });
      document.addEventListener("focusout", (event) => {
        if (this.appTooltips.targetFromEvent(event)) {
          this.appTooltips.hide();
        }
      });
    },

    shouldSkipTooltipPointerOver(event, target) {
      return (
        !target ||
        this.appTooltips.isActiveTarget(target) ||
        this.appTooltips.isSuppressed() ||
        (event.relatedTarget instanceof Node &&
          target.contains(event.relatedTarget))
      );
    },

    bindDocumentEvents() {
      this.elements.earlyResetButton.addEventListener(
        "click",
        this.earlyReset.handleButtonClick,
      );
      document.addEventListener("click", (event) => {
        this.earlyReset.hideIfOutside(event);
      });
      document.addEventListener("keydown", (event) => {
        this.handleKeydown(event);
      });
    },

    handleKeydown(event) {
      if (event.key === "Escape") {
        this.handleEscapeKey(event);
        return;
      }

      this.shellControls.trapInfoPanelFocus(event);

      if (
        this.shellControls.isInfoPanelOpen() ||
        event.key.toLowerCase() !== "t" ||
        this.shellControls.hasSingleKeyShortcutBlocker(event)
      ) {
        return;
      }

      if (this.toggleUsageWindow()) {
        event.preventDefault();
      }
    },

    handleEscapeKey(event) {
      if (this.shellControls.isInfoPanelOpen()) {
        this.shellControls.hideInfoPanel();
        event.preventDefault();
        return;
      }

      this.earlyReset.hide();
      this.appTooltips.hide();
    },

    bindStorageEvents() {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (!this.hasDashboardStorageChange(changes, areaName)) {
          return;
        }

        if (this.renderRefreshStatusChange(changes)) {
          return;
        }

        this.loadDashboard().catch(() => {
          this.renderChangedHistoryFallback(changes);
        });
      });
    },

    hasDashboardStorageChange(changes, areaName) {
      return (
        this.EXTENSION_STORAGE.isLocalArea(areaName) &&
        this.EXTENSION_STORAGE.hasAnyChange(changes, [
          CodexUsageHistory.HISTORY_STORAGE_KEY,
          CodexUsageHistory.REFRESH_STATUS_STORAGE_KEY,
          this.BADGE_WINDOW_STORAGE_KEY,
          this.DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY,
          this.DEVELOPER_OPTIONS_STORAGE_KEY,
        ])
      );
    },

    renderRefreshStatusChange(changes) {
      const refreshStatusChange =
        changes[CodexUsageHistory.REFRESH_STATUS_STORAGE_KEY];
      if (
        !refreshStatusChange ||
        changes[CodexUsageHistory.HISTORY_STORAGE_KEY] ||
        changes[this.BADGE_WINDOW_STORAGE_KEY] ||
        changes[this.DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY] ||
        changes[this.DEVELOPER_OPTIONS_STORAGE_KEY]
      ) {
        return false;
      }

      this.currentRefreshStatus = CodexUsageHistory.normalizeRefreshStatus(
        refreshStatusChange.newValue,
      );
      if (!this.currentHistory) {
        return false;
      }

      this.renderHistory(this.currentHistory, this.currentRefreshStatus, {
        refreshChart: false,
      });
      return true;
    },

    renderChangedHistoryFallback(changes) {
      const historyChange = changes[CodexUsageHistory.HISTORY_STORAGE_KEY];
      if (historyChange) {
        this.currentHistory = CodexUsageHistory.normalizeHistory(
          historyChange.newValue,
        );
        this.currentRefreshStatus = null;
        this.renderHistory(this.currentHistory, this.currentRefreshStatus);
        return;
      }

      this.renderHistoryLoadFailure();
    },

    bindWindowEvents() {
      window.addEventListener("resize", () => this.appTooltips.hide());
      window.addEventListener("scroll", () => this.appTooltips.hide(), true);
      document.addEventListener("visibilitychange", () => {
        this.handleVisibilityChange();
      });
    },

    handleVisibilityChange() {
      if (document.hidden) {
        this.appTooltips.hide();
        this.paceView.pauseHiddenDocumentMotionEffects?.();
        return;
      }

      this.paceView.playPendingSpecialTransition?.();
      this.refreshDashboardTimeSensitiveViews().catch((error) =>
        this.renderHistoryLoadFailure(error),
      );
    },

    bindEvents() {
      this.bindControlEvents();
      this.bindInfoPanelEvents();
      this.bindTooltipEvents();
      this.bindDocumentEvents();
      this.bindStorageEvents();
      this.bindWindowEvents();
    },
  });
})();
