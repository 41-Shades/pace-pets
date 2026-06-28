import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";
import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

const AT_MS = Date.parse("2026-05-25T12:00:00.000Z");
const DURATION_MINUTES = 300;

describe("PacePetsPreviewControl", () => {
  it("shares synthetic ratios while preserving special forced states", () => {
    const preview = globalThis.PacePetsPreviewControl;

    expect(preview.forcedPaceRatioForState("sync")).toBe(1);
    expect(preview.forcedPaceRatioForState("wellAhead")).toBe(1.8);
    expect(preview.forcedPaceRatioForState("unsupported")).toBeNull();
    expect(preview.forcedBadgeState("perfectZero")).toMatchObject({
      badgeText: "0.00",
      stateKey: "perfectZero",
    });
    expect(preview.forcedPercentPairForState("wellAhead")).toEqual({
      remainingPercent: 90,
      timePercent: 50,
    });
    expect(preview.forcedPercentPairForState("bigBang")).toEqual({
      remainingPercent: 100,
      timePercent: 100,
    });
    expect(preview.forcedPercentPairForState("perfectZero")).toEqual({
      remainingPercent: 0.4,
      timePercent: 0.4,
    });
    expect(preview.forcedPercentPairForState("singularity")).toEqual({
      remainingPercent: 0,
      timePercent: 0,
    });
  });

  it("applies brake intensity percent previews", () => {
    const preview = globalThis.PacePetsPreviewControl;

    expect(
      preview.forcedPaceRatioForState("criticalBehind", {
        brakeIntensityPreview: "0.25",
      }),
    ).toBe(0.25);
    expect(
      preview.forcedPercentPairForState("criticalBehind", {
        brakeIntensityPreview: "0.00",
      }),
    ).toEqual({
      remainingPercent: 0,
      timePercent: 50,
    });
  });

  it("applies splat percent previews", () => {
    const preview = globalThis.PacePetsPreviewControl;

    expect(
      preview.forcedPercentPairForState("splat", {
        splatTimeRemainingPreview: "over50",
      }),
    ).toEqual({
      remainingPercent: 0,
      timePercent: 75,
    });
    expect(
      preview.forcedPercentPairForState("splat", {
        splatTimeRemainingPreview: "under50",
      }),
    ).toEqual({
      remainingPercent: 0,
      timePercent: 49,
    });
  });
});

describe("PacePetsPreviewControl forced windows", () => {
  it("builds forced preview windows from synthetic ratio pairs", () => {
    const preview = globalThis.PacePetsPreviewControl;

    expect(
      preview.forcedPreviewWindowForState("wellAhead", {
        atMs: AT_MS,
        durationMinutes: DURATION_MINUTES,
      }),
    ).toMatchObject({
      percentPair: {
        remainingPercent: 90,
        timePercent: 50,
      },
      windowData: {
        remainingPercent: 90,
        resetsAt: "2026-05-25T14:30:00.000Z",
        usedPercent: 10,
        windowMinutes: 300,
      },
    });
  });

  it("preserves live splat timing unless a preview overrides it", () => {
    const preview = globalThis.PacePetsPreviewControl;
    const liveSplatPreview = preview.forcedPreviewWindowForState("splat", {
      atMs: AT_MS,
      durationMinutes: DURATION_MINUTES,
      windowData: {
        remainingPercent: 44,
        resetsAt: "2026-05-25T13:00:00.000Z",
        windowMinutes: 300,
      },
    });
    expect(liveSplatPreview.percentPair).toEqual({
      remainingPercent: 0,
      timePercent: 20,
    });
    expect(liveSplatPreview.windowData).toMatchObject({
      remainingPercent: 0,
      resetsAt: "2026-05-25T13:00:00.000Z",
      usedPercent: 100,
      windowMinutes: 300,
    });
    expect(
      preview.forcedPreviewWindowForState("splat", {
        atMs: AT_MS,
        durationMinutes: DURATION_MINUTES,
        splatTimeRemainingPreview: "over50",
        windowData: {
          remainingPercent: 44,
          resetsAt: "2026-05-25T13:00:00.000Z",
          windowMinutes: 300,
        },
      }),
    ).toMatchObject({
      percentPair: {
        remainingPercent: 0,
        timePercent: 75,
      },
      windowData: {
        remainingPercent: 0,
        resetsAt: "2026-05-25T15:45:00.000Z",
        usedPercent: 100,
        windowMinutes: 300,
      },
    });
  });
});
