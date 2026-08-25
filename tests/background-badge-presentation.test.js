import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const extensionStorage = {
  getLocal: vi.fn(),
  setLocal: vi.fn(),
};

beforeAll(async () => {
  await importExtensionScript("collector/extension/usage-windows.js");
  globalThis.CodexExtensionStorage = extensionStorage;
  globalThis.CodexProductMetadata = { ACTION_DEFAULT_TITLE: "Pace Pets" };
  globalThis.PacePetsBackgroundLogic = {
    DEFAULT_BADGE_WINDOW_KEY: "weekly",
    selectedBadgeWindowKeyFromItems: (items, storageKey) =>
      globalThis.CodexUsageWindows.normalizeWindowKey(items?.[storageKey]),
  };
  globalThis.PacePetsDeveloperOptions = { STORAGE_KEY: "developer-options" };
  globalThis.PacePetsLogic = {};
  globalThis.PacePetsPreviewControl = {};
  await importExtensionScript(
    "collector/extension/background-badge-presentation.js",
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  extensionStorage.setLocal.mockResolvedValue();
});

describe("Pace Pets badge window availability", () => {
  it("replaces a stored five-hour selection when the window disappears", async () => {
    extensionStorage.getLocal.mockResolvedValue({
      "codex-usage-window": "fiveHour",
    });

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        weekly: {},
      }),
    ).resolves.toBe("weekly");
    expect(extensionStorage.setLocal).toHaveBeenCalledWith({
      "codex-usage-window": "weekly",
    });
  });

  it("keeps five-hour selected while the latest sample reports it", async () => {
    extensionStorage.getLocal.mockResolvedValue({
      "codex-usage-window": "fiveHour",
    });

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        fiveHour: {},
        weekly: {},
      }),
    ).resolves.toBe("fiveHour");
    expect(extensionStorage.setLocal).not.toHaveBeenCalled();
  });

  it("does not select five-hour automatically when it appears", async () => {
    extensionStorage.getLocal.mockResolvedValue({
      "codex-usage-window": "weekly",
    });

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        fiveHour: {},
        weekly: {},
      }),
    ).resolves.toBe("weekly");
    expect(extensionStorage.setLocal).not.toHaveBeenCalled();
  });

  it("persists an initially resolved five-hour selection", async () => {
    const storedItems = {};
    extensionStorage.getLocal.mockImplementation(async () => ({
      ...storedItems,
    }));
    extensionStorage.setLocal.mockImplementation(async (items) => {
      Object.assign(storedItems, items);
    });

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        fiveHour: {},
      }),
    ).resolves.toBe("fiveHour");
    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        fiveHour: {},
        weekly: {},
      }),
    ).resolves.toBe("fiveHour");

    expect(extensionStorage.setLocal).toHaveBeenCalledTimes(1);
    expect(extensionStorage.setLocal).toHaveBeenCalledWith({
      "codex-usage-window": "fiveHour",
    });
  });

  it("replaces an invalid preference with an available window", async () => {
    extensionStorage.getLocal.mockResolvedValue({
      "codex-usage-window": "unsupported",
    });

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey({
        weekly: {},
      }),
    ).resolves.toBe("weekly");
    expect(extensionStorage.setLocal).toHaveBeenCalledWith({
      "codex-usage-window": "weekly",
    });
  });

  it("does not persist the default window without real usage", async () => {
    extensionStorage.getLocal.mockResolvedValue({});

    await expect(
      globalThis.PacePetsBackgroundBadgePresentation.selectedBadgeWindowKey(),
    ).resolves.toBe("weekly");
    expect(extensionStorage.setLocal).not.toHaveBeenCalled();
  });
});
