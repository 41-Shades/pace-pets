((root) => {
  "use strict";

  const REGISTRY = root.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Pace Pets dev preview action registry must load before splat-bounce-preview-control.js.",
    );
  }

  root.PacePetsSplatBouncePreviewControl = REGISTRY.controlForAction(
    REGISTRY.ACTION_KEYS.maxSplatBounce,
  );
})(globalThis);
