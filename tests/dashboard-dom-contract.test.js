import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

beforeAll(async () => {
  await import(
    pathToFileURL(
      path.join(projectRoot, "collector/extension/dashboard-dom-contract.js"),
    )
  );
});

describe("PacePetsDashboardDom", () => {
  it("derives required dashboard IDs from the selector contract", () => {
    const dom = globalThis.PacePetsDashboardDom;

    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("pace-card");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("audio-control");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("audio-toggle");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("audio-volume");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("audio-volume-panel");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("audio-volume-rail");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("clear-data-button");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("dynamic-favicon");
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain(
      "manual-refresh-button",
    );
    expect(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).toContain("motion-toggle");
    expect(new Set(dom.REQUIRED_DASHBOARD_ELEMENT_IDS).size).toBe(
      dom.REQUIRED_DASHBOARD_ELEMENT_IDS.length,
    );
    expect(
      dom.REQUIRED_DASHBOARD_ELEMENT_IDS.includes("early-reset-popover"),
    ).toBe(true);
  });

  it("collects dashboard elements from one selector map", () => {
    const dom = globalThis.PacePetsDashboardDom;
    const queriedSelectors = [];
    const queriedAllSelectors = [];
    const documentRef = {
      querySelector(selector) {
        queriedSelectors.push(selector);
        return { selector };
      },
      querySelectorAll(selector) {
        queriedAllSelectors.push(selector);
        return [{ selector, type: "option" }];
      },
    };

    const elements = dom.collectElements(documentRef);

    expect(Object.isFrozen(elements)).toBe(true);
    expect(elements.paceCard).toEqual({ selector: "#pace-card" });
    expect(elements.audioControlGroup).toEqual({ selector: "#audio-control" });
    expect(elements.audioToggle).toEqual({ selector: "#audio-toggle" });
    expect(elements.audioVolume).toEqual({ selector: "#audio-volume" });
    expect(elements.audioVolumePanel).toEqual({
      selector: "#audio-volume-panel",
    });
    expect(elements.audioVolumeRail).toEqual({
      selector: "#audio-volume-rail",
    });
    expect(elements.clearDataButton).toEqual({
      selector: "#clear-data-button",
    });
    expect(elements.earlyResetPopoverText).toEqual({
      selector: "#early-reset-popover .early-reset-popover-text",
    });
    expect(elements.motionToggle).toEqual({ selector: "#motion-toggle" });
    expect(elements.windowOptions).toEqual([
      {
        selector: dom.WINDOW_OPTION_SELECTOR,
        type: "option",
      },
    ]);
    expect(queriedSelectors).toContain("#collection-pulse");
    expect(queriedAllSelectors).toEqual([dom.WINDOW_OPTION_SELECTOR]);
  });
});
