(() => {
  "use strict";

  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  if (!DASHBOARD_PREFERENCES) {
    throw new Error(
      "Pace Pets dashboard preferences must load before dashboard-shell-controls.js.",
    );
  }

  const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
  const INFO_PANEL_FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function storedThemePreference() {
    return DASHBOARD_PREFERENCES.readThemePreference().value;
  }

  function storeThemePreference(theme) {
    DASHBOARD_PREFERENCES.storeThemePreference(theme);
  }

  function isInputLike(element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      (element instanceof HTMLElement && element.isContentEditable)
    );
  }

  class ShellControls {
    constructor({
      appTooltips,
      earlyReset,
      elements,
      refreshThemeSensitiveViews,
    }) {
      this.appTooltips = appTooltips;
      this.colorSchemeMedia = window.matchMedia(COLOR_SCHEME_QUERY);
      this.earlyReset = earlyReset;
      this.elements = elements;
      this.explicitTheme = storedThemePreference();
      this.infoPanelReturnFocus = null;
      this.refreshThemeSensitiveViews = refreshThemeSensitiveViews;
      this.colorSchemeMedia.addEventListener("change", () => {
        if (!this.explicitTheme) {
          this.applyResolvedTheme({ refresh: true });
        }
      });
      this.applyResolvedTheme();
    }

    systemTheme() {
      return this.colorSchemeMedia.matches ? "dark" : "light";
    }

    resolvedTheme() {
      return this.explicitTheme || this.systemTheme();
    }

    oppositeTheme(theme) {
      return theme === "dark" ? "light" : "dark";
    }

    updateThemeToggle(theme) {
      if (!this.elements.themeToggle) {
        return;
      }

      const nextTheme = this.oppositeTheme(theme);
      const label = `Switch to ${nextTheme} theme`;
      this.elements.themeToggle.setAttribute(
        "aria-pressed",
        String(theme === "dark"),
      );
      this.elements.themeToggle.setAttribute("aria-label", label);
      this.appTooltips.setText(this.elements.themeToggle, label);
    }

    applyResolvedTheme({ refresh = false } = {}) {
      const theme = this.resolvedTheme();
      document.documentElement.dataset.theme = theme;
      this.updateThemeToggle(theme);

      if (refresh) {
        this.refreshThemeSensitiveViews();
      }
    }

    toggleTheme() {
      this.explicitTheme = this.oppositeTheme(this.resolvedTheme());
      storeThemePreference(this.explicitTheme);
      this.applyResolvedTheme({ refresh: true });
    }

    isInfoPanelOpen() {
      return Boolean(
        this.elements.infoOverlay && !this.elements.infoOverlay.hidden,
      );
    }

    infoPanelFocusableElements() {
      if (!this.elements.infoPanel) {
        return [];
      }

      return [
        ...this.elements.infoPanel.querySelectorAll(
          INFO_PANEL_FOCUSABLE_SELECTOR,
        ),
      ].filter((element) => element instanceof HTMLElement);
    }

    showInfoPanel() {
      if (!this.elements.infoOverlay || this.isInfoPanelOpen()) {
        return;
      }

      this.infoPanelReturnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      this.appTooltips.hide();
      this.earlyReset.hide();
      this.elements.infoOverlay.hidden = false;
      this.elements.infoToggle?.setAttribute("aria-expanded", "true");

      window.requestAnimationFrame(() => {
        const [firstFocusable] = this.infoPanelFocusableElements();
        firstFocusable?.focus();
      });
    }

    restoreInfoPanelFocus(restoreFocus) {
      const activeElement = document.activeElement;
      const activeElementInOverlay =
        activeElement instanceof HTMLElement &&
        this.elements.infoOverlay.contains(activeElement);

      if (restoreFocus && this.infoPanelReturnFocus?.isConnected) {
        this.infoPanelReturnFocus.focus();
      } else if (activeElementInOverlay) {
        activeElement.blur();
      }
    }

    hideInfoPanel({ restoreFocus = true } = {}) {
      if (!this.elements.infoOverlay || !this.isInfoPanelOpen()) {
        return;
      }

      this.elements.infoOverlay.hidden = true;
      this.elements.infoToggle?.setAttribute("aria-expanded", "false");
      this.appTooltips.suppressTemporarily();
      this.appTooltips.hide();
      this.restoreInfoPanelFocus(restoreFocus);
      this.infoPanelReturnFocus = null;
    }

    toggleInfoPanel() {
      if (this.isInfoPanelOpen()) {
        this.hideInfoPanel();
        return;
      }

      this.showInfoPanel();
    }

    trapInfoPanelFocus(event) {
      if (!this.isInfoPanelOpen() || event.key !== "Tab") {
        return;
      }

      const focusableElements = this.infoPanelFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        this.elements.infoPanel?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    hasSingleKeyShortcutBlocker(event) {
      return (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInputLike(document.activeElement)
      );
    }
  }

  function createController(options) {
    const controls = new ShellControls(options);
    return Object.freeze({
      hasSingleKeyShortcutBlocker:
        controls.hasSingleKeyShortcutBlocker.bind(controls),
      hideInfoPanel: controls.hideInfoPanel.bind(controls),
      isInfoPanelOpen: controls.isInfoPanelOpen.bind(controls),
      toggleInfoPanel: controls.toggleInfoPanel.bind(controls),
      toggleTheme: controls.toggleTheme.bind(controls),
      trapInfoPanelFocus: controls.trapInfoPanelFocus.bind(controls),
    });
  }

  globalThis.PacePetsDashboardShellControls = Object.freeze({
    createController,
  });
})();
