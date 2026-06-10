(function attachPacePetsDashboardSingularityTransitionData(root) {
  "use strict";

  const TIMELINE = Object.freeze({
    bangMs: 1180,
    fadeMs: 620,
    gravityMs: 360,
    holdMs: 680,
    intakeMs: 2380,
    tunnelMs: 1080,
  });

  root.PacePetsDashboardSingularityTransitionData = Object.freeze({
    BACKDROP_FADE_OPACITY: 0.96,
    BODY_CLASS: "is-singularity-transitioning",
    MAX_PIXEL_RATIO: 1.5,
    MIN_TILE_SIZE_PX: 18,
    REDUCED_MOTION_QUERY: "(prefers-reduced-motion: reduce)",
    TILE_COLUMNS: 38,
    TILE_ROWS: 24,
    TIMELINE,
    TOTAL_DURATION_MS:
      TIMELINE.gravityMs +
      TIMELINE.intakeMs +
      TIMELINE.tunnelMs +
      TIMELINE.holdMs +
      TIMELINE.bangMs +
      TIMELINE.fadeMs,
  });
})(globalThis);
