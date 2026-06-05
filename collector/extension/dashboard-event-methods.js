(() => {
  "use strict";

  const App = globalThis.PacePetsDashboardApp;
  if (!App) {
    throw new Error(
      "Pace Pets dashboard app core must load before dashboard-event-methods.js.",
    );
  }

  Object.assign(App.prototype, {
    bindPacePreviewEvents() {
      this.elements.paceStateStack.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) {
          return;
        }

        const chip = this.paceView.stateChipFromEvent(event);
        if (!chip) {
          return;
        }

        this.paceView.showPacePreview(chip.dataset.paceStateKey);
        this.appTooltips.hide();

        try {
          chip.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is best-effort; click still provides timed restore.
        }
      });
      this.elements.paceStateStack.addEventListener(
        "pointercancel",
        this.paceView.restorePacePreview,
      );
      this.elements.paceStateStack.addEventListener("pointerup", (event) => {
        const chip = this.paceView.stateChipFromEvent(event);
        if (
          !chip ||
          chip.dataset.paceStateKey !== this.paceView.activePreviewKey
        ) {
          return;
        }

        this.paceView.schedulePacePreviewRestore();
      });
      this.elements.paceStateStack.addEventListener("click", (event) => {
        const chip = this.paceView.stateChipFromEvent(event);
        if (!chip) {
          return;
        }

        this.paceView.showPacePreview(chip.dataset.paceStateKey);
        this.paceView.schedulePacePreviewRestore();
        this.appTooltips.releasePointerClickFocus(event, chip);
      });
    },

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
        this.shellControls.toggleInfoPanel();
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

      if (this.paceView.activePreviewKey) {
        this.paceView.restorePacePreview();
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
          this.WINDOW_STORAGE_KEY,
          this.DEVELOPER_OPTIONS_STORAGE_KEY,
        ])
      );
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
      window.addEventListener("pagehide", () => {
        if (this.paceView.activePreviewKey) {
          this.dashboardStatus.restoreToolbarPreviewBadge();
        }
      });
    },

    bindEvents() {
      this.bindPacePreviewEvents();
      this.bindControlEvents();
      this.bindInfoPanelEvents();
      this.bindTooltipEvents();
      this.bindDocumentEvents();
      this.bindStorageEvents();
      this.bindWindowEvents();
    },
  });
})();
