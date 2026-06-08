(() => {
  "use strict";

  const PACE_STATES = PacePetsLogic.PACE_STATES;
  const PACE_CLASSES = PacePetsLogic.PACE_CLASS_NAMES;
  const SINGULARITY_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="core" cx="50%" cy="45%" r="62%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="62%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#000000"/>
        </radialGradient>
        <linearGradient id="ring" x1="7" y1="28" x2="57" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#67e8f9"/>
          <stop offset="48%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-45%" width="160%" height="190%">
          <feGaussianBlur stdDeviation="2.1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="48" cy="15" r="1.8" fill="#fbbf24"/>
      <circle cx="15" cy="21" r="1.5" fill="#67e8f9"/>
      <circle cx="48.5" cy="49" r="1.2" fill="#f8fafc"/>
      <ellipse cx="32" cy="32" rx="25" ry="9.5" fill="none" stroke="url(#ring)" stroke-width="5.5" stroke-linecap="round" filter="url(#glow)" transform="rotate(-18 32 32)"/>
      <circle cx="32" cy="32" r="13.5" fill="url(#core)" stroke="#f8fafc" stroke-opacity="0.88" stroke-width="2.6"/>
      <path d="M13.2 35.8c8.6 8 28.4 9.2 39.1.1" fill="none" stroke="#67e8f9" stroke-width="3.6" stroke-linecap="round" opacity="0.92" transform="rotate(-18 32 32)"/>
    </svg>`,
  )}`;
  const DASHBOARD_RAIL_STATES = Object.freeze({
    singularity: Object.freeze({
      key: "singularity",
      className: "pace-singularity",
      title: "Singularity",
      copy: "It all ends in nothingness. Maybe.",
      ratioLabel: "Usage = Time = Resets In = 0",
      previewRatioLabel: "The black hole of zero",
      badgeColor: "#000000",
      favicon: Object.freeze({
        bg: "#111827",
        color: "#f8fafc",
        iconParts: Object.freeze([
          Object.freeze({
            tag: "ellipse",
            attrs: Object.freeze({
              cx: "12",
              cy: "12",
              rx: "9.3",
              ry: "3.7",
              stroke: "#67e8f9",
              "stroke-width": "2",
              transform: "rotate(-18 12 12)",
            }),
          }),
          Object.freeze({
            tag: "circle",
            attrs: Object.freeze({
              fill: "#000000",
              cx: "12",
              cy: "12",
              r: "5",
              stroke: "#f8fafc",
              "stroke-width": "1.35",
            }),
          }),
          Object.freeze({
            tag: "circle",
            attrs: Object.freeze({
              cx: "18.8",
              cy: "5.7",
              fill: "#fbbf24",
              r: "1",
              stroke: "none",
            }),
          }),
        ]),
      }),
      iconParts: Object.freeze([
        Object.freeze({
          tag: "ellipse",
          attrs: Object.freeze({
            cx: "12",
            cy: "12",
            rx: "9.5",
            ry: "3.8",
            stroke: "#67e8f9",
            "stroke-width": "2",
            transform: "rotate(-18 12 12)",
          }),
        }),
        Object.freeze({
          tag: "circle",
          attrs: Object.freeze({
            cx: "12",
            cy: "12",
            r: "5.4",
            fill: "#000000",
            stroke: "#f8fafc",
            "stroke-width": "1.35",
          }),
        }),
        Object.freeze({
          tag: "circle",
          attrs: Object.freeze({
            cx: "18.8",
            cy: "5.7",
            fill: "#fbbf24",
            r: "1.1",
            stroke: "none",
          }),
        }),
      ]),
      playfulImage: SINGULARITY_ICON_DATA_URL,
    }),
  });
  const DASHBOARD_RAIL_STATES_BY_CLASS = Object.freeze(
    Object.fromEntries(
      Object.values(DASHBOARD_RAIL_STATES).map((state) => [
        state.className,
        state,
      ]),
    ),
  );
  const DASHBOARD_RAIL_PACE_CLASSES = Object.freeze(
    Object.values(DASHBOARD_RAIL_STATES).map((state) => state.className),
  );

  globalThis.PacePetsDashboardPaceData = Object.freeze({
    BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT: Object.freeze({
      1: 320,
      2: 520,
      3: 720,
    }),
    BRAKE_DEBRIS_BURST_PROFILES: Object.freeze({
      escape: Object.freeze({
        ANGLE_RANGE_DEG: Object.freeze([158, 382]),
        COUNT_RANGE: Object.freeze([26, 38]),
        CURVE_DRIFT_RANGE_PX: Object.freeze([-130, 130]),
        CURVE_LIFT_RANGE_PX: Object.freeze([80, 210]),
        DELAY_RANGE_MS: Object.freeze([0, 170]),
        DURATION_RANGE_MS: Object.freeze([2400, 3400]),
        FALL_DRIFT_RANGE_PX: Object.freeze([-150, 150]),
        FALL_OVERSHOOT_RANGE_PX: Object.freeze([110, 260]),
        LAUNCH_RADIUS_RANGE_PX: Object.freeze([135, 380]),
        ORIGIN_JITTER_RANGE_PX: Object.freeze([-24, 24]),
        SIZE_RANGE_PX: Object.freeze([5, 14]),
        SPIN_RANGE_DEG: Object.freeze([-980, 980]),
      }),
      wide: Object.freeze({
        ANGLE_RANGE_DEG: Object.freeze([185, 355]),
        COUNT_RANGE: Object.freeze([6, 10]),
        CURVE_DRIFT_RANGE_PX: Object.freeze([-58, 58]),
        CURVE_LIFT_RANGE_PX: Object.freeze([54, 132]),
        DELAY_RANGE_MS: Object.freeze([0, 110]),
        DURATION_RANGE_MS: Object.freeze([1900, 2650]),
        FALL_DRIFT_RANGE_PX: Object.freeze([-78, 78]),
        FALL_OVERSHOOT_RANGE_PX: Object.freeze([92, 180]),
        LAUNCH_RADIUS_RANGE_PX: Object.freeze([82, 172]),
        ORIGIN_JITTER_RANGE_PX: Object.freeze([-14, 14]),
        SIZE_RANGE_PX: Object.freeze([6, 12]),
        SPIN_RANGE_DEG: Object.freeze([-520, 520]),
      }),
    }),
    BRAKE_WOBBLE_INITIAL_DELAY_RANGE_MS: Object.freeze([650, 1400]),
    BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS: Object.freeze([1600, 3400]),
    BRAKE_WOBBLE_WIDE_BURST_INTERVAL_RANGE: Object.freeze([2, 4]),
    DASHBOARD_RAIL_PACE_CLASSES,
    DASHBOARD_RAIL_STATES,
    DASHBOARD_RAIL_STATES_BY_CLASS,
    MUTED_PACE_CLASS: PACE_STATES.muted.className,
    PACE_CLASSES,
    PACE_ICON_EFFECTS_BY_STATE: Object.freeze({
      [PACE_STATES.wellAhead.key]: "sprint-smoke",
      [PACE_STATES.criticalBehind.key]: "brake-wobble",
    }),
    SPRINT_BOUNCE_PROFILE_DELAY_RANGE_MS: Object.freeze([700, 1500]),
    SPRINT_SPEED_BUMP_DELAY_RANGE_MS: Object.freeze([8000, 12000]),
    SPRINT_SPEED_BUMP_DURATION_MS: 920,
    SPRINT_SMOKE_VARIATION: Object.freeze({
      BLUR_JITTER_CENTIPX: Object.freeze([-4, 4]),
      DRIFT_X_JITTER_PX: Object.freeze([-4, 4]),
      DRIFT_Y_JITTER_PX: Object.freeze([-2, 2]),
      END_SCALE_JITTER_PERCENT: Object.freeze([-5, 5]),
      MID_OPACITY_JITTER_PERCENT: Object.freeze([-5, 5]),
      PEAK_OPACITY_JITTER_PERCENT: Object.freeze([-4, 4]),
      Y_OFFSET_JITTER_PX: Object.freeze([-2, 2]),
    }),
    PACE_LEVEL_LEGEND_STATE_KEYS: Object.freeze([
      PACE_STATES.wellAhead.key,
      PACE_STATES.strongAhead.key,
      PACE_STATES.ahead.key,
      PACE_STATES.on.key,
      PACE_STATES.behind.key,
      PACE_STATES.wellBehind.key,
      PACE_STATES.criticalBehind.key,
    ]),
    PACE_PERFECT_LEGEND_STATE_KEYS: Object.freeze([
      PACE_STATES.sync.key,
      PACE_STATES.perfectZero.key,
      "singularity",
    ]),
    PACE_STATES,
    SINGULARITY_RESET_COUNTDOWN_TEXT: "0d 0h 0m",
    USE_PLAYFUL_PACE_ICONS: true,
  });
})();
