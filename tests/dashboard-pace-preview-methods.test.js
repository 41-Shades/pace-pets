import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

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
  await importExtensionScript("collector/extension/dashboard-time.js");
  await importExtensionScript("collector/extension/dashboard-pace-data.js");
  await importExtensionScript("collector/extension/dashboard-pace-core.js");
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

function controllerElements() {
  return {
    paceBurnoutIn: textElement(),
    paceCopy: textElement(),
    paceRatioStat: textElement(),
    paceRatioValue: textElement(),
    paceStats: textElement(),
    paceTitle: textElement(),
    resetProgressFill: {
      style: {
        setProperty() {},
      },
    },
    resetsIn: textElement(),
    timeBar: barElement(),
    timePercent: textElement(),
    usageBar: barElement(),
    usagePercent: textElement(),
  };
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
});
