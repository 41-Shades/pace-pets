((root) => {
  "use strict";

  const REGISTRY = root.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Pace Pets dev preview action registry must load before brake-extreme-preview-control.js.",
    );
  }

  root.PacePetsBrakeExtremePreviewControl = REGISTRY.controlForAction(
    REGISTRY.ACTION_KEYS.brakeMaxBurst,
  );
})(globalThis);
