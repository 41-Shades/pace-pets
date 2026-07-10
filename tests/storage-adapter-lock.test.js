import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexExtensionStorage mutation lock", () => {
  it("fails observably in an extension runtime without cross-context locks", async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator",
    );
    const originalRuntimeId = globalThis.chrome.runtime.id;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    globalThis.chrome.runtime.id = "pace-pets-test";

    try {
      await expect(
        globalThis.CodexExtensionStorage.runExclusiveLocalStorageOperation(
          async () => true,
        ),
      ).rejects.toThrow(
        globalThis.CodexExtensionStorage.LOCAL_STORAGE_LOCK_REQUIRED_MESSAGE,
      );
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, "navigator", originalNavigator);
      } else {
        delete globalThis.navigator;
      }
      if (originalRuntimeId === undefined) {
        delete globalThis.chrome.runtime.id;
      } else {
        globalThis.chrome.runtime.id = originalRuntimeId;
      }
    }
  });
});
