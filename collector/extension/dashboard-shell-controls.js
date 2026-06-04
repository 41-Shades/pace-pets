(() => {
  "use strict";

  const THEME_STORAGE_KEY = "codex-usage-theme";
  const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
  const THEME_VALUES = new Set(["light", "dark"]);
  const INFO_PANEL_FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  function storedThemePreference() {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_VALUES.has(value) ? value : null;
    } catch {
      return null;
    }
  }

  function storeThemePreference(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Local storage can be unavailable in strict browser contexts.
    }
  }

  function isInputLike(element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      (element instanceof HTMLElement && element.isContentEditable)
    );
  }

  function createController({
    appTooltips,
    earlyReset,
    elements,
    refreshThemeSensitiveViews,
  }) {
    const colorSchemeMedia = window.matchMedia(COLOR_SCHEME_QUERY);
    let explicitTheme = storedThemePreference();
    let infoPanelReturnFocus = null;

    function systemTheme() {
      return colorSchemeMedia.matches ? "dark" : "light";
    }

    function resolvedTheme() {
      return explicitTheme || systemTheme();
    }

    function oppositeTheme(theme) {
      return theme === "dark" ? "light" : "dark";
    }

    function updateThemeToggle(theme) {
      if (!elements.themeToggle) {
        return;
      }

      const nextTheme = oppositeTheme(theme);
      const label = `Switch to ${nextTheme} theme`;
      elements.themeToggle.setAttribute(
        "aria-pressed",
        String(theme === "dark"),
      );
      elements.themeToggle.setAttribute("aria-label", label);
      appTooltips.setText(elements.themeToggle, label);
    }

    function applyResolvedTheme({ refresh = false } = {}) {
      const theme = resolvedTheme();
      document.documentElement.dataset.theme = theme;
      updateThemeToggle(theme);

      if (refresh) {
        refreshThemeSensitiveViews();
      }
    }

    function toggleTheme() {
      explicitTheme = oppositeTheme(resolvedTheme());
      storeThemePreference(explicitTheme);
      applyResolvedTheme({ refresh: true });
    }

    function isInfoPanelOpen() {
      return Boolean(elements.infoOverlay && !elements.infoOverlay.hidden);
    }

    function infoPanelFocusableElements() {
      if (!elements.infoPanel) {
        return [];
      }

      return [
        ...elements.infoPanel.querySelectorAll(INFO_PANEL_FOCUSABLE_SELECTOR),
      ].filter((element) => element instanceof HTMLElement);
    }

    function showInfoPanel() {
      if (!elements.infoOverlay || isInfoPanelOpen()) {
        return;
      }

      infoPanelReturnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      appTooltips.hide();
      earlyReset.hide();
      elements.infoOverlay.hidden = false;
      elements.infoToggle?.setAttribute("aria-expanded", "true");

      window.requestAnimationFrame(() => {
        const [firstFocusable] = infoPanelFocusableElements();
        firstFocusable?.focus();
      });
    }

    function hideInfoPanel({ restoreFocus = true } = {}) {
      if (!elements.infoOverlay || !isInfoPanelOpen()) {
        return;
      }

      elements.infoOverlay.hidden = true;
      elements.infoToggle?.setAttribute("aria-expanded", "false");
      appTooltips.suppressTemporarily();
      appTooltips.hide();

      if (restoreFocus && infoPanelReturnFocus?.isConnected) {
        infoPanelReturnFocus.focus();
      } else if (
        document.activeElement instanceof HTMLElement &&
        elements.infoOverlay.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
      infoPanelReturnFocus = null;
    }

    function toggleInfoPanel() {
      if (isInfoPanelOpen()) {
        hideInfoPanel();
        return;
      }

      showInfoPanel();
    }

    function trapInfoPanelFocus(event) {
      if (!isInfoPanelOpen() || event.key !== "Tab") {
        return;
      }

      const focusableElements = infoPanelFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        elements.infoPanel?.focus();
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

    function hasSingleKeyShortcutBlocker(event) {
      return (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isInputLike(document.activeElement)
      );
    }

    colorSchemeMedia.addEventListener("change", () => {
      if (!explicitTheme) {
        applyResolvedTheme({ refresh: true });
      }
    });
    applyResolvedTheme();

    return Object.freeze({
      hasSingleKeyShortcutBlocker,
      hideInfoPanel,
      isInfoPanelOpen,
      toggleInfoPanel,
      toggleTheme,
      trapInfoPanelFocus,
    });
  }

  globalThis.PacePetsDashboardShellControls = Object.freeze({
    createController,
  });
})();
