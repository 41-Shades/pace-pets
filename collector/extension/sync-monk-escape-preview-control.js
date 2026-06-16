((root) => {
  "use strict";

  const REGISTRY = root.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Pace Pets dev preview action registry must load before sync-monk-escape-preview-control.js.",
    );
  }

  root.PacePetsSyncMonkEscapePreviewControl = REGISTRY.controlForAction(
    REGISTRY.ACTION_KEYS.monkEscape,
  );
})(globalThis);
