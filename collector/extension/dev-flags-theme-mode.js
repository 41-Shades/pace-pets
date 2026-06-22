(() => {
  "use strict";

  const DASHBOARD_PREFERENCES = globalThis.PacePetsDashboardPreferences;
  if (!DASHBOARD_PREFERENCES) {
    throw new Error(
      "Pace Pets dashboard preferences must load before dev-flags-theme-mode.js.",
    );
  }

  const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
  const THEME_OPTIONS = Object.freeze([
    Object.freeze({ label: "Light", value: "light" }),
    Object.freeze({ label: "Dark", value: "dark" }),
  ]);

  function createThemeModeControl({ listElement, optionRow, setStatus }) {
    const colorSchemeMedia = window.matchMedia(COLOR_SCHEME_QUERY);
    let currentThemePreference =
      DASHBOARD_PREFERENCES.readThemePreference().value;

    function systemTheme() {
      return colorSchemeMedia.matches ? "dark" : "light";
    }

    function currentThemeMode() {
      return currentThemePreference || systemTheme();
    }

    function applyThemeMode() {
      document.documentElement.dataset.theme = currentThemeMode();
    }

    function persistThemeMode(theme) {
      const result = DASHBOARD_PREFERENCES.storeThemePreference(theme);
      if (!result.ok) {
        throw result.error || new Error("Could not update theme mode.");
      }
      currentThemePreference = theme;
      applyThemeMode();
    }

    function render() {
      applyThemeMode();
      listElement.replaceChildren(
        ...THEME_OPTIONS.map((theme) =>
          optionRow({
            labelText: theme.label,
            pressed: currentThemeMode() === theme.value,
            onClick: async ({ pressed }) => {
              if (pressed) {
                return;
              }

              persistThemeMode(theme.value);
              setStatus(`Theme mode: ${theme.label}.`);
              render();
            },
          }),
        ),
      );
    }

    colorSchemeMedia.addEventListener("change", () => {
      if (!currentThemePreference) {
        render();
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== DASHBOARD_PREFERENCES.THEME_STORAGE_KEY) {
        return;
      }

      currentThemePreference = DASHBOARD_PREFERENCES.normalizeTheme(
        event.newValue,
      );
      render();
    });

    applyThemeMode();
    return Object.freeze({ render });
  }

  globalThis.PacePetsDevFlagsThemeMode = Object.freeze({
    createThemeModeControl,
  });
})();
