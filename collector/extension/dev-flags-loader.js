(() => {
  "use strict";

  const RUNTIME = globalThis.CodexExtensionRuntime;
  if (!RUNTIME) {
    throw new Error(
      "Codex extension runtime manifest must load before dev-flags-loader.js.",
    );
  }

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

  async function loadDevFlagScripts() {
    for (const src of RUNTIME.DEV_FLAGS_SCRIPT_SOURCES) {
      await loadScript(src);
    }
  }

  loadDevFlagScripts().catch((error) => {
    console.error("Pace Pets dev controls failed to load:", error);
  });
})();
