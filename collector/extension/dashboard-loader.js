(() => {
  "use strict";

  const RUNTIME = globalThis.CodexExtensionRuntime;
  if (!RUNTIME) {
    throw new Error(
      "Codex extension runtime manifest must load before dashboard-loader.js.",
    );
  }
  const OPTIONAL_DASHBOARD_SCRIPT_SOURCES = new Set(
    Array.isArray(RUNTIME.OPTIONAL_DASHBOARD_SCRIPT_SOURCES)
      ? RUNTIME.OPTIONAL_DASHBOARD_SCRIPT_SOURCES
      : [],
  );

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = false;
      script.src = src;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener(
        "error",
        () => {
          reject(new Error(`Could not load extension script: ${src}`));
        },
        { once: true },
      );
      document.body.append(script);
    });
  }

  async function loadDashboardScripts() {
    for (const src of RUNTIME.DASHBOARD_SCRIPT_SOURCES) {
      try {
        await loadScript(src);
      } catch (error) {
        if (OPTIONAL_DASHBOARD_SCRIPT_SOURCES.has(src)) {
          console.warn("Optional Pace Pets dashboard script failed:", error);
          continue;
        }

        throw error;
      }
    }
  }

  loadDashboardScripts().catch((error) => {
    console.error("Pace Pets dashboard failed to load:", error);
  });
})();
