((root) => {
  "use strict";

  const REGISTRY = root.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Pace Pets dev preview action registry must load before push-sweat-preview-control.js.",
    );
  }

  root.PacePetsPushSweatPreviewControl = REGISTRY.controlForAction(
    REGISTRY.ACTION_KEYS.rareSweat,
  );
})(globalThis);
