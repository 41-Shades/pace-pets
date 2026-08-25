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
  it("hides five-hour when the latest sample does not report it", async () => {
    const contextMenu = globalThis.PacePetsBackgroundContextMenu;

    await contextMenu.createBadgeContextMenus({
      selectedWindowKey: "weekly",
      windows: { weekly: {} },
    });

    const menuItems = globalThis.chrome.contextMenus.create.mock.calls.map(
      ([properties]) => properties,
    );
    expect(menuItems).toContainEqual(
      expect.objectContaining({
        enabled: false,
        id: "badge-window:fiveHour",
        title: "5h badge",
        visible: false,
      }),
    );
    expect(
      contextMenu.badgeWindowKeyFromContextMenuId("badge-window:fiveHour", {
        weekly: {},
      }),
    ).toBeNull();
  });

  it("offers and selects five-hour when the latest sample reports it", async () => {
    const contextMenu = globalThis.PacePetsBackgroundContextMenu;
    const windows = { fiveHour: {}, weekly: {} };

    await contextMenu.createBadgeContextMenus({
      selectedWindowKey: "fiveHour",
      windows,
    });

    const menuItems = globalThis.chrome.contextMenus.create.mock.calls.map(
      ([properties]) => properties,
    );
    expect(menuItems).toContainEqual(
      expect.objectContaining({
        checked: true,
        enabled: true,
        id: "badge-window:fiveHour",
        visible: true,
      }),
    );
    expect(
      contextMenu.badgeWindowKeyFromContextMenuId(
        "badge-window:fiveHour",
        windows,
      ),
    ).toBe("fiveHour");
  });

  it("updates visibility and selection when availability changes", async () => {
    const contextMenu = globalThis.PacePetsBackgroundContextMenu;

    await contextMenu.syncBadgeContextMenus({
      selectedWindowKey: "fiveHour",
      windows: { fiveHour: {}, weekly: {} },
    });
    await contextMenu.syncBadgeContextMenus({
      selectedWindowKey: "weekly",
      windows: { weekly: {} },
    });

    expect(globalThis.chrome.contextMenus.update).toHaveBeenCalledWith(
      "badge-window:fiveHour",
      expect.objectContaining({
        checked: false,
        enabled: false,
        visible: false,
      }),
      expect.any(Function),
    );
  });
});
