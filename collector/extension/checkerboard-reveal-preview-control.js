((root) => {
  "use strict";

  const REGISTRY = root.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Pace Pets dev preview action registry must load before checkerboard-reveal-preview-control.js.",
    );
  }

  root.PacePetsCheckerboardRevealPreviewControl = REGISTRY.controlForAction(
    REGISTRY.ACTION_KEYS.checkerboardReveal,
  );
})(globalThis);
