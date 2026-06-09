import { installExtensionRuntimeHooks } from "./helpers/extension-runtime.js";

import { describe, expect, it } from "vitest";

installExtensionRuntimeHooks();

describe("CodexUsageProviders", () => {
  it("links the default provider to integration config and parser adapter", () => {
    const providers = globalThis.CodexUsageProviders;
    const config = globalThis.CodexIntegrationConfig;
    const adapters = globalThis.CodexUsageIntegrationAdapters;
    const provider = providers.DEFAULT_USAGE_PROVIDER;

    expect(provider).toBe(providers.CHATGPT_WHAM_PROVIDER);
    expect(provider.key).toBe(providers.CHATGPT_WHAM_PROVIDER_KEY);
    expect(provider.hostPermission).toBe(config.CHATGPT_HOST_PERMISSION);
    expect(provider.usageEndpoint).toBe(config.CHATGPT_USAGE_ENDPOINT);
    expect(provider.authSessionUrls).toEqual(config.AUTH_SESSION_URLS);
    expect(provider.adapter).toBe(adapters.DEFAULT_USAGE_ADAPTER);
    expect(provider.adapterKey).toBe(adapters.CHATGPT_WHAM_ADAPTER_KEY);
    expect(provider.sourceMarkers).toBe(config.SOURCE_MARKERS);
    expect(providers.providerForKey(provider.key)).toBe(provider);
  });

  it("owns auth token extraction, request headers, and retry policy", async () => {
    const providers = globalThis.CodexUsageProviders;
    const provider = providers.DEFAULT_USAGE_PROVIDER;

    expect(
      providers.extractAccessToken({
        session: {
          access_token: "session-token",
        },
      }),
    ).toBe("session-token");
    await expect(
      providers.extractAccessTokenFromSessionResponse({
        ok: true,
        json: async () => ({ accessToken: "root-token" }),
      }),
    ).resolves.toBe("root-token");
    expect(providers.usageHeaders(provider, "token", "en-US")).toEqual({
      Accept: "application/json",
      Authorization: "Bearer token",
      "oai-language": "en-US",
    });
    expect(providers.shouldRetryUsageResponse(provider, 401, "token")).toBe(
      true,
    );
    expect(providers.shouldRetryUsageResponse(provider, 500, "token")).toBe(
      false,
    );
    expect(providers.isAuthFailureStatus(provider, 403)).toBe(true);
  });
});
