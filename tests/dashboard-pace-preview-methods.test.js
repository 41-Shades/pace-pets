import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(pathToFileURL(path.join(projectRoot, source)));
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("collector/extension/usage-windows.js");
  await importExtensionScript(
    "collector/extension/dev-preview-action-registry.js",
  );
  await importExtensionScript("collector/extension/dashboard-time.js");
  await importExtensionScript("collector/extension/dashboard-preferences.js");
  await importExtensionScript("collector/extension/dashboard-pace-data.js");
  await importExtensionScript("collector/extension/dashboard-pace-core.js");
  await importExtensionScript(
    "collector/extension/dashboard-pace-icon-render-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-pace-icon-selection.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-pace-icon-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-pace-transition-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-pace-summary-methods.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-pace-preview-methods.js",
  );
});

function textElement() {
  return {
    hidden: false,
    textContent: "",
  };
}

function barElement() {
  return {
    style: {
      width: "",
    },
  };
}

function classElement() {
  return {
    classList: {
      add() {},
      contains: () => false,
      remove() {},
      toggle() {},
    },
    dataset: {},
    removeAttribute() {},
    style: {
      removeProperty() {},
    },
  };
}

function controllerElements() {
  return {
    paceCard: classElement(),
    paceBurnoutIn: textElement(),
    paceCopy: textElement(),
    paceIcon: classElement(),
    paceRatioStat: textElement(),
    paceRatioValue: textElement(),
    paceStats: textElement(),
    paceTitle: textElement(),
    resetProgressFill: {
      style: {
        setProperty() {},
      },
    },
    resetBudgetRate: textElement(),
    resetBudgetRateUnit: textElement(),
    resetBudgetRateValue: textElement(),
    resetsIn: textElement(),
    timeBar: barElement(),
    timePercent: textElement(),
    usageBar: barElement(),
    usagePercent: textElement(),
  };
}

function splatPreviewController() {
  const Controller = globalThis.PacePetsDashboardPaceController;
  const data = globalThis.PacePetsDashboardPaceData;
  const controller = new Controller({
    elements: controllerElements(),
  });
  controller.currentPaceLevel = () => data.PACE_STATES.splat.className;
  controller.paceStateForClassName = (className) =>
    className === data.PACE_STATES.splat.className
      ? data.PACE_STATES.splat
      : data.PACE_STATES.on;
  controller.clearSplatMaxBouncePreview = vi.fn();
  controller.clearSplatMaxThrow = vi.fn();
  return { controller, data };
}

describe("Dashboard forced pace previews", () => {
  it("makes forced Splat preview time available before replaying entry effects", () => {
    const Controller = globalThis.PacePetsDashboardPaceController;
    const data = globalThis.PacePetsDashboardPaceData;
    const controller = new Controller({
      elements: controllerElements(),
    });
    let timePercentAtReplay = null;

    controller.forcedPaceState = () => data.PACE_STATES.splat;
    controller.forcedPaceRatioForState = () => 0;
    controller.previewWindowForState = () => ({
      atMs: Date.parse("2026-05-25T12:00:00.000Z"),
      percentPair: {
        remainingPercent: 0,
        timePercent: 80,
      },
      windowData: {
        remainingPercent: 0,
        resetsAt: "2026-05-25T16:00:00.000Z",
        windowMinutes: 300,
      },
    });
    controller.currentPaceLevel = () => data.PACE_STATES.on.className;
    controller.paceStateForClassName = (className) =>
      className === data.PACE_STATES.splat.className
        ? data.PACE_STATES.splat
        : data.PACE_STATES.on;
    controller.setPaceLevel = () => {
      timePercentAtReplay = controller.currentPaceSummaryTimePercent;
    };
    controller.updateSprintSmokeIntensity = () => {};
    controller.renderPreviewChart = () => {};
    controller.applyPreviewResetTiming = () => {};
    controller.renderPaceAltRatio = () => {};
    controller.updateTabTitle = () => {};
    controller.updateSingularityTransitionState = () => {};

    expect(controller.renderForcedPaceStateOverride()).toBe(true);

    expect(timePercentAtReplay).toBe(80);
    expect(controller.elements.timePercent.textContent).toBe("80%");
  });

  it("replays forced Splat entry when the timing preview changes", () => {
    const Controller = globalThis.PacePetsDashboardPaceController;
    const data = globalThis.PacePetsDashboardPaceData;
    const controller = new Controller({
      elements: controllerElements(),
    });
    const replayValues = [];
    let splatTimeRemainingPreview = "over50";

    controller.forcedPaceState = () => data.PACE_STATES.splat;
    controller.forcedPaceRatioForState = () => 0;
    controller.getCurrentSplatTimeRemainingPreview = () =>
      splatTimeRemainingPreview;
    controller.previewWindowForState = () => ({
      atMs: Date.parse("2026-05-25T12:00:00.000Z"),
      percentPair: {
        remainingPercent: 0,
        timePercent: splatTimeRemainingPreview === "over50" ? 75 : 49,
      },
      windowData: {
        remainingPercent: 0,
        resetsAt: "2026-05-25T16:00:00.000Z",
        windowMinutes: 300,
      },
    });
    controller.currentPaceLevel = () => data.PACE_STATES.on.className;
    controller.paceStateForClassName = (className) =>
      className === data.PACE_STATES.splat.className
        ? data.PACE_STATES.splat
        : data.PACE_STATES.on;
    controller.setPaceLevel = (_className, options) => {
      replayValues.push(options.replaySplatFall);
    };
    controller.updateSprintSmokeIntensity = () => {};
    controller.renderPreviewChart = () => {};
    controller.applyPreviewResetTiming = () => {};
    controller.renderPaceAltRatio = () => {};
    controller.updateTabTitle = () => {};
    controller.updateSingularityTransitionState = () => {};

    controller.renderForcedPaceStateOverride();
    controller.renderForcedPaceStateOverride();
    splatTimeRemainingPreview = "under50";
    controller.renderForcedPaceStateOverride();

    expect(replayValues).toEqual([true, false, true]);
  });
});

describe("Splat preview cleanup", () => {
  it("clears stale Max Splat previews before replaying a Splat timing preview", () => {
    const { controller, data } = splatPreviewController();
    controller.renderPaceIcon = vi.fn();

    controller.setPaceLevel(data.PACE_STATES.splat.className, {
      playSplatFallOnEntry: false,
      replaySplatFall: true,
      updateTabIcon: false,
    });

    expect(controller.clearSplatMaxBouncePreview).toHaveBeenCalledOnce();
    expect(controller.elements.paceIcon.dataset.splatFallIntro).toBe("true");
  });

  it("clears the full Max Splat preview when hidden-tab motion pauses", () => {
    const { controller } = splatPreviewController();

    controller.pauseHiddenDocumentMotionEffects();

    expect(controller.clearSplatMaxBouncePreview).toHaveBeenCalledOnce();
    expect(controller.clearSplatMaxThrow).not.toHaveBeenCalled();
  });

  it("clears the full Max Splat preview when motion stops", () => {
    const { controller } = splatPreviewController();

    controller.stopMotionEffects();

    expect(controller.clearSplatMaxBouncePreview).toHaveBeenCalledOnce();
    expect(controller.clearSplatMaxThrow).not.toHaveBeenCalled();
  });
});
