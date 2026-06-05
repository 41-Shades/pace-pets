import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, beforeAll, beforeEach, vi } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

async function importExtensionScript(relativePath) {
  await import(pathToFileURL(path.join(projectRoot, relativePath)));
}

export function installExtensionRuntimeHooks() {
  beforeAll(async () => {
    globalThis.chrome = {
      runtime: {
        getManifest: () => ({ version: "0.1.0" }),
        lastError: null,
      },
      storage: {
        local: {
          get: vi.fn(),
          remove: vi.fn(),
          set: vi.fn(),
        },
      },
    };

    await importExtensionScript("collector/extension/product-metadata.js");
    await importExtensionScript("collector/extension/integration-config.js");
    await importExtensionScript("collector/extension/usage-windows.js");
    await importExtensionScript("collector/extension/usage-values.js");
    await importExtensionScript("collector/extension/refresh-status.js");
    await importExtensionScript("collector/extension/storage-adapter.js");
    await importExtensionScript(
      "collector/extension/usage-integration-adapters.js",
    );
    await importExtensionScript(
      "collector/extension/themes/default/asset-manifest.js",
    );
    await importExtensionScript("collector/extension/developer-options.js");
    await importExtensionScript("collector/extension/pace-state-data.js");
    await importExtensionScript("collector/extension/pace-logic.js");
    await importExtensionScript("collector/extension/preview-control.js");
    await importExtensionScript("collector/extension/usage.js");
    await importExtensionScript("collector/extension/history-store.js");
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));
    vi.clearAllMocks();
    globalThis.chrome.runtime.lastError = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.chrome.runtime.lastError = null;
  });
}
