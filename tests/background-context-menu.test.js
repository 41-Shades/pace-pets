import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(
    pathToFileURL(path.join(projectRoot, "collector/extension", source))
  );
}

beforeAll(async () => {
  await importExtensionScript("usage-windows.js");
  globalThis.CodexExtensionStorage = {
    callbackWithLastError: (operation) =>
      new Promise((resolve) => operation(resolve)),
  };
  globalThis.CodexProductMetadata = {
    CHECK_USAGE_NOW_MENU_TITLE: "Check now",
    OPEN_DASHBOARD_MENU_TITLE: "Open dashboard",
  };
  globalThis.chrome = {
    contextMenus: {
      create: vi.fn((properties, done) => done()),
      removeAll: vi.fn((done) => done()),
      update: vi.fn((id, properties, done) => done()),
    },
  };
  await importExtensionScript("background-context-menu.js");
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Pace Pets badge context menu", () => {
  it("keeps the paused 5h window visible but unselectable", async () => {
    const contextMenu = globalThis.PacePetsBackgroundContextMenu;

    await contextMenu.createBadgeContextMenus({ selectedWindowKey: "weekly" });

    const menuItems = globalThis.chrome.contextMenus.create.mock.calls.map(
      ([properties]) => properties,
    );
    expect(menuItems).toContainEqual(
      expect.objectContaining({
        enabled: false,
        id: "badge-window:fiveHour",
        title: "5h badge (temporarily unavailable)",
      }),
    );
    expect(
      contextMenu.badgeWindowKeyFromContextMenuId("badge-window:fiveHour"),
    ).toBeNull();
  });
});
