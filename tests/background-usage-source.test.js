import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function importExtensionScript(source) {
  await import(
    pathToFileURL(path.join(projectRoot, "collector/extension", source))
  );
}

installExtensionRuntimeHooks();

beforeAll(async () => {
  await importExtensionScript("background-usage-source.js");
});

beforeEach(() => {
  globalThis.chrome.i18n = {
    getUILanguage: () => "en-GB",
  };
  globalThis.fetch = vi.fn();
});

describe("PacePetsBackgroundUsageSource", () => {
  it("fetches usage through the provider registry", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    const provider = globalThis.CodexUsageProviders.DEFAULT_USAGE_PROVIDER;
    const rawUsage = { subscription: { primary: { remaining_percent: 42 } } };

    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => rawUsage,
        ok: true,
        status: 200,
      });

    await expect(source.fetchUsageForProviderKey(provider.key)).resolves.toBe(
      rawUsage,
    );
    expect(source.usageProviderForKey(provider.key)).toBe(provider);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      provider.authSessionUrls[0],
      expect.objectContaining({
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      provider.usageEndpoint,
      expect.objectContaining({
        credentials: "include",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer session-token",
          "oai-language": "en-GB",
        },
      }),
    );
  });

  it("retries provider usage once with a fresh token on auth failure", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    const provider = globalThis.CodexUsageProviders.DEFAULT_USAGE_PROVIDER;
    const rawUsage = { usage: { ok: true } };

    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "first-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({}),
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "fresh-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => rawUsage,
        ok: true,
        status: 200,
      });

    await expect(source.fetchUsageWithProvider(provider)).resolves.toBe(
      rawUsage,
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      4,
      provider.usageEndpoint,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-token",
        }),
      }),
    );
  });
});
