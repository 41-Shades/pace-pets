(function attachPacePetsPaceStateSpecialData(root) {
  "use strict";

  const THEME_ASSETS = root.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error(
      "Codex theme assets must load before pace-state-special-data.js.",
    );
  }
  const STATE_ART = root.PacePetsPaceStateArt;
  if (!STATE_ART) {
    throw new Error(
      "Pace state art must load before pace-state-special-data.js.",
    );
  }

  function bigBangState() {
    return Object.freeze({
      key: "bigBang",
      className: "pace-big-bang",
      title: "Big Bang",
      copy: "Everything begins again in infinite possibility.",
      ratioLabel: "Usage = Time = 100",
      previewRatioLabel: "All 100%",
      badgeColor: "#0369a1",
      favicon: {
        bg: "#07111f",
        color: "#e0f7ff",
        iconParts: [
          {
            tag: "circle",
            attrs: { cx: "12", cy: "12", fill: "#e0f7ff", r: "3.5" },
          },
          { tag: "path", attrs: { d: "M12 3.2v4" } },
          { tag: "path", attrs: { d: "M12 16.8v4" } },
          { tag: "path", attrs: { d: "M3.2 12h4" } },
          { tag: "path", attrs: { d: "M16.8 12h4" } },
          {
            tag: "circle",
            attrs: {
              cx: "6.7",
              cy: "6.7",
              fill: "#bae6fd",
              r: "0.9",
              stroke: "none",
            },
          },
          {
            tag: "circle",
            attrs: {
              cx: "17.6",
              cy: "7.4",
              fill: "#c4b5fd",
              r: "0.8",
              stroke: "none",
            },
          },
        ],
      },
      iconParts: [
        {
          tag: "circle",
          attrs: {
            cx: "12",
            cy: "12",
            fill: "#fef3c7",
            r: "3.3",
            stroke: "#bae6fd",
            "stroke-width": "1.4",
          },
        },
        { tag: "path", attrs: { d: "M4.5 13.3a8.4 8.4 0 0 1 6.1-7.9" } },
        { tag: "path", attrs: { d: "M14 4.8a8.4 8.4 0 0 1 5.5 5.8" } },
        { tag: "path", attrs: { d: "M19.4 14.2a8.4 8.4 0 0 1-7.6 5.8" } },
        { tag: "path", attrs: { d: "M7.5 7.4 4 5" } },
        { tag: "path", attrs: { d: "M16.2 8.2 20.5 6.5" } },
        { tag: "path", attrs: { d: "M15.8 16.2 19.5 19" } },
      ],
      playfulImage: THEME_ASSETS.paceIconPathForState("bigBang"),
    });
  }

  function syncState() {
    return Object.freeze({
      key: "sync",
      className: "pace-sync",
      title: "Perfect sync",
      copy: "Time and pace are in harmony. Ascendant.",
      ratioLabel: "Usage = Time",
      badgeColor: "#0f766e",
      favicon: { bg: "#edf6f4", color: "#0f766e" },
      playfulImage: THEME_ASSETS.paceIconPathForState("sync"),
      iconParts: [
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "8" } },
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } },
        { tag: "path", attrs: { d: "M12 2v3" } },
        { tag: "path", attrs: { d: "M12 19v3" } },
        { tag: "path", attrs: { d: "M2 12h3" } },
        { tag: "path", attrs: { d: "M19 12h3" } },
      ],
    });
  }

  function perfectZeroState() {
    return Object.freeze({
      key: "perfectZero",
      className: "pace-perfect-zero",
      title: "Perfect zero",
      copy: "A beautiful, unreasonable zero.",
      ratioLabel: "Usage = Time = 0",
      badgeColor: "#6b7280",
      favicon: {
        bg: "#020617",
        color: "#e5e7eb",
        iconParts: [
          {
            tag: "ellipse",
            attrs: { cx: "12", cy: "12", rx: "5.5", ry: "8" },
          },
        ],
      },
      playfulImage: THEME_ASSETS.paceIconPathForState("perfectZero"),
      iconParts: [
        {
          tag: "ellipse",
          attrs: { cx: "12", cy: "12", rx: "5.5", ry: "8" },
        },
        {
          tag: "path",
          attrs: {
            d: "M9 8.5c1.5-1.3 4.3-1.5 6-.2",
            "stroke-width": "2.2",
          },
        },
      ],
    });
  }

  function singularityState() {
    return Object.freeze({
      key: "singularity",
      className: "pace-singularity",
      title: "Singularity",
      copy: "It all ends in nothingness. Precisely.",
      ratioLabel: "Usage = Time = Reset = 0",
      previewRatioLabel: "All 0's",
      badgeColor: "#000000",
      favicon: {
        bg: "#111827",
        color: "#f8fafc",
        iconParts: [
          {
            tag: "ellipse",
            attrs: {
              cx: "12",
              cy: "12",
              rx: "9.3",
              ry: "3.7",
              stroke: "#67e8f9",
              "stroke-width": "2",
              transform: "rotate(-18 12 12)",
            },
          },
          {
            tag: "circle",
            attrs: {
              fill: "#000000",
              cx: "12",
              cy: "12",
              r: "5",
              stroke: "#f8fafc",
              "stroke-width": "1.35",
            },
          },
          {
            tag: "circle",
            attrs: {
              cx: "18.8",
              cy: "5.7",
              fill: "#fbbf24",
              r: "1",
              stroke: "none",
            },
          },
        ],
      },
      iconParts: [
        {
          tag: "ellipse",
          attrs: {
            cx: "12",
            cy: "12",
            rx: "9.5",
            ry: "3.8",
            stroke: "#67e8f9",
            "stroke-width": "2",
            transform: "rotate(-18 12 12)",
          },
        },
        {
          tag: "circle",
          attrs: {
            cx: "12",
            cy: "12",
            r: "5.4",
            fill: "#000000",
            stroke: "#f8fafc",
            "stroke-width": "1.35",
          },
        },
        {
          tag: "circle",
          attrs: {
            cx: "18.8",
            cy: "5.7",
            fill: "#fbbf24",
            r: "1.1",
            stroke: "none",
          },
        },
      ],
      playfulImage: STATE_ART.SINGULARITY_ICON_DATA_URL,
    });
  }

  function splatState() {
    return Object.freeze({
      key: "splat",
      className: "pace-splat",
      title: "Splat!",
      copy: "The gravity of usage defeats you. Try again.",
      ratioLabel: "Usage = 0",
      badgeColor: "#64748b",
      favicon: {
        bg: "#f8fafc",
        color: "#64748b",
        iconParts: [
          { tag: "path", attrs: { d: "M7.5 6.5 16.5 17.5" } },
          { tag: "path", attrs: { d: "M16.5 6.5 7.5 17.5" } },
          { tag: "path", attrs: { d: "M12 3.5v3" } },
          { tag: "path", attrs: { d: "M4.8 8 7 9.4" } },
          { tag: "path", attrs: { d: "M19.2 8 17 9.4" } },
        ],
      },
      iconParts: [
        { tag: "path", attrs: { d: "M7.5 6.5 16.5 17.5" } },
        { tag: "path", attrs: { d: "M16.5 6.5 7.5 17.5" } },
        { tag: "path", attrs: { d: "M12 3.5v3" } },
        { tag: "path", attrs: { d: "M4.8 8 7 9.4" } },
        { tag: "path", attrs: { d: "M19.2 8 17 9.4" } },
      ],
      playfulImage: THEME_ASSETS.paceIconPathForState("splat"),
    });
  }

  function nothingnessState() {
    return Object.freeze({
      key: "nothingness",
      className: "pace-nothingness",
      title: "Nothingness",
      copy: "Empty",
      copyByReason: Object.freeze({
        checkFailed: "Check failed in this void.",
        noHistory: "No history yet in this void.",
        resetTimingMissing: "Reset timing missing in this void.",
        signInNotFound: "ChatGPT sign-in not found in this void.",
        waitingForReading: "Waiting for reading in this void.",
        waitingForUsage: "Waiting for usage in this void.",
      }),
      ratioLabel: "The Void",
      badgeColor: "#000000",
      favicon: { bg: "#000000", color: "#f8fafc" },
      iconParts: [],
      iconPresentation: "outline",
      noPaceRatio: true,
      playfulImage: "",
    });
  }

  function specialPaceStates() {
    return Object.freeze({
      bigBang: bigBangState(),
      nothingness: nothingnessState(),
      sync: syncState(),
      perfectZero: perfectZeroState(),
      singularity: singularityState(),
      splat: splatState(),
    });
  }

  root.PacePetsPaceStateSpecialData = Object.freeze({
    specialPaceStates,
  });
})(globalThis);
