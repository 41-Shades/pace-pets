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
      path.join(projectRoot, "collector/extension/dev-flags-dom-contract.js"),
    )
  );
});

describe("PacePetsDevFlagsDom", () => {
  it("derives required dev control IDs from the selector contract", () => {
    const dom = globalThis.PacePetsDevFlagsDom;

    expect(dom.REQUIRED_DEV_FLAG_ELEMENT_IDS).toContain("reset-all");
    expect(dom.REQUIRED_DEV_FLAG_ELEMENT_IDS).toContain("status-message");
    expect(dom.REQUIRED_DEV_FLAG_ELEMENT_IDS).toContain("feature-preview-list");
    expect(dom.REQUIRED_DEV_FLAG_ELEMENT_IDS).toContain("theme-mode-list");
    expect(new Set(dom.REQUIRED_DEV_FLAG_ELEMENT_IDS).size).toBe(
      dom.REQUIRED_DEV_FLAG_ELEMENT_IDS.length,
    );
  });

  it("collects dev control elements and state groups from one selector map", () => {
    const dom = globalThis.PacePetsDevFlagsDom;
    const queriedSelectors = [];
    const documentRef = {
      querySelector(selector) {
        queriedSelectors.push(selector);
        return { selector };
      },
    };
    const developerOptions = {
      FORCEABLE_PACE_STATE_GROUPS: [
        { key: "paceLevels", listElementId: "pace-level-list" },
        { key: "perfectStates", listElementId: "perfect-state-list" },
      ],
    };

    const elements = dom.collectElements(documentRef, developerOptions);

    expect(Object.isFrozen(elements)).toBe(true);
    expect(Object.isFrozen(elements.stateGroupElements)).toBe(true);
    expect(elements.currentModeSummary).toEqual({
      selector: "#current-mode-summary",
    });
    expect(elements.stateGroupElements.paceLevels).toEqual({
      selector: "#pace-level-list",
    });
    expect(elements.stateGroupElements.perfectStates).toEqual({
      selector: "#perfect-state-list",
    });
    expect(queriedSelectors).toContain(".current-mode-panel");
    expect(queriedSelectors).toContain("#brake-intensity-preview-list");
    expect(queriedSelectors).toContain("#sprint-intensity-preview-list");
    expect(queriedSelectors).toContain("#theme-mode-list");
  });
});
