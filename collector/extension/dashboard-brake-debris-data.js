(() => {
  "use strict";

  const KIND_KEYS_BY_RANGE = Object.freeze({
    escape: Object.freeze([
      "fin",
      "fin",
      "panel",
      "panel",
      "panel",
      "spark",
      "spark",
      "spark",
      "smoke",
      "outline",
    ]),
    wide: Object.freeze(["fin", "panel", "panel", "spark", "smoke", "outline"]),
  });
  const SHAPES = Object.freeze({
    fin: Object.freeze([
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M3.1 15.4 6.5 3.4 17.1 8.2 10.1 18.1Z",
            fill: "#ef4444",
            stroke: "#1f2937",
            "stroke-linejoin": "round",
            "stroke-width": "1.8",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M6.4 11.7 13.8 8.4",
            fill: "none",
            stroke: "#fecaca",
            "stroke-linecap": "round",
            "stroke-width": "1.2",
          }),
        }),
      ]),
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M4.2 4.1 16.8 6.5 12.2 17.4 3.4 12.2Z",
            fill: "#dc2626",
            stroke: "#111827",
            "stroke-linejoin": "round",
            "stroke-width": "1.7",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M6.4 6.9 12.8 8.1",
            fill: "none",
            stroke: "#fca5a5",
            "stroke-linecap": "round",
            "stroke-width": "1.1",
          }),
        }),
      ]),
    ]),
    outline: Object.freeze([
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M4.5 13.8 8.3 4.6 16.2 7.1 12 15.9Z",
            fill: "#334155",
            stroke: "#111827",
            "stroke-linejoin": "round",
            "stroke-width": "1.7",
          }),
        }),
      ]),
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M3.7 9.8 7.8 5.1 16.1 10.4 11.5 15.5Z",
            fill: "#475569",
            stroke: "#111827",
            "stroke-linejoin": "round",
            "stroke-width": "1.5",
          }),
        }),
      ]),
    ]),
    panel: Object.freeze([
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M4.1 5.6 13.8 2.9 17.3 13.1 7 17.3Z",
            fill: "#cbd5e1",
            stroke: "#1f2937",
            "stroke-linejoin": "round",
            "stroke-width": "1.7",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M6.5 7.8 14.5 5.7",
            fill: "none",
            stroke: "#64748b",
            "stroke-linecap": "round",
            "stroke-width": "1.1",
          }),
        }),
      ]),
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M5.3 3.8 15.9 6.6 13.6 16.8 4.6 12.8Z",
            fill: "#e5e7eb",
            stroke: "#111827",
            "stroke-linejoin": "round",
            "stroke-width": "1.6",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M8.1 5.9 13.8 7.4",
            fill: "none",
            stroke: "#94a3b8",
            "stroke-linecap": "round",
            "stroke-width": "1.1",
          }),
        }),
      ]),
    ]),
    smoke: Object.freeze([
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M3.3 12.4C3.4 8.4 6.2 6.1 9.1 7c1-2.3 4.1-2.5 5.5-.5 2.7.1 4.3 2.1 3.7 4.5-.5 2-2.2 3.7-5.6 4.1-4 .5-8.4.4-9.4-2.7Z",
            fill: "#cbd5e1",
            stroke: "#1f2937",
            "stroke-linejoin": "round",
            "stroke-width": "1.4",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M6.4 12.4c2.7.9 5.2.9 8.1.1",
            fill: "none",
            stroke: "#64748b",
            "stroke-linecap": "round",
            "stroke-width": "1",
          }),
        }),
      ]),
    ]),
    spark: Object.freeze([
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M7.2 2.9 16.2 8.8 11.8 17.1 4.6 11.6Z",
            fill: "#fb923c",
            stroke: "#1f2937",
            "stroke-linejoin": "round",
            "stroke-width": "1.6",
          }),
        }),
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M8.8 6.8 13.2 9.4",
            fill: "none",
            stroke: "#fed7aa",
            "stroke-linecap": "round",
            "stroke-width": "1.1",
          }),
        }),
      ]),
      Object.freeze([
        Object.freeze({
          tag: "path",
          attrs: Object.freeze({
            d: "M10 2.5 12.7 8 18 10.1 12.6 12.8 10.1 18 7.5 12.7 2.7 10.2 7.6 7.8Z",
            fill: "#f97316",
            stroke: "#111827",
            "stroke-linejoin": "round",
            "stroke-width": "1.4",
          }),
        }),
      ]),
    ]),
  });

  globalThis.PacePetsDashboardBrakeDebrisData = Object.freeze({
    KIND_KEYS_BY_RANGE,
    SHAPES,
  });
})();
