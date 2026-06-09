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

async function importRuntimeManifest() {
  await importExtensionScript("collector/extension/runtime-manifest.js");
  const runtimeManifest = globalThis.CodexExtensionRuntime;
  if (!Array.isArray(runtimeManifest?.COMMON_SCRIPT_SOURCES)) {
    throw new Error("Extension runtime manifest common sources are not wired.");
  }
  return runtimeManifest;
}

async function importCommonExtensionScripts() {
  const runtimeManifest = await importRuntimeManifest();
  for (const source of runtimeManifest.COMMON_SCRIPT_SOURCES) {
    await importExtensionScript(`collector/extension/${source}`);
  }
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

    await importCommonExtensionScripts();
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
