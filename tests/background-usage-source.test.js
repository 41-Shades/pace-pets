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

function rejectWhenAborted(signal) {
  return new Promise((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
  });
}

async function expectRefreshTimeout(source, expectedFetchCount) {
  const refreshPromise = source.fetchUsageWithProvider();
  const rejection = expect(refreshPromise).rejects.toMatchObject({
    message: source.USAGE_REFRESH_TIMEOUT_MESSAGE,
    timeout: true,
  });
  await vi.advanceTimersByTimeAsync(source.USAGE_REFRESH_DEADLINE_MS);

  await rejection;
  expect(globalThis.fetch).toHaveBeenCalledTimes(expectedFetchCount);
}

describe("PacePetsBackgroundUsageSource deadline", () => {
  it("times out while probing the auth session", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    globalThis.fetch.mockImplementation((_url, options) =>
      rejectWhenAborted(options.signal),
    );

    await expectRefreshTimeout(source, 1);
    expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("applies the same total deadline to the usage request", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockImplementationOnce((_url, options) =>
        rejectWhenAborted(options.signal),
      );

    await expectRefreshTimeout(source, 2);
  });

  it("keeps the deadline active while parsing usage JSON", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockImplementationOnce(async (_url, options) => ({
        json: () => rejectWhenAborted(options.signal),
        ok: true,
        status: 200,
      }));

    await expectRefreshTimeout(source, 2);
  });
});

describe("PacePetsBackgroundUsageSource provider fetch", () => {
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

describe("PacePetsBackgroundUsageSource safe error boundary", () => {
  it("replaces marker-bearing native usage parse failures with a safe error", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    const nativeMarker = "RAW_USAGE_RESPONSE_MARKER_7bda4e";
    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => {
          throw new SyntaxError(`Unexpected token near ${nativeMarker}`);
        },
        ok: true,
        status: 200,
      });

    const error = await source
      .fetchUsageWithProvider()
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(source.USAGE_RESPONSE_PARSE_FAILURE_MESSAGE);
    expect(error.message).not.toContain(nativeMarker);
    expect(error.stack).not.toContain(nativeMarker);
    expect(error).not.toHaveProperty("authFailure");
    expect(error).not.toHaveProperty("statusCode");
  });

  it("does not log marker-bearing auth response parse failures", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    const provider = globalThis.CodexUsageProviders.DEFAULT_USAGE_PROVIDER;
    const nativeMarker = "RAW_AUTH_RESPONSE_MARKER_a3f127";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch
      .mockResolvedValueOnce({
        json: async () => {
          throw new SyntaxError(`Unexpected token near ${nativeMarker}`);
        },
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ usage: { ok: true } }),
        ok: true,
        status: 200,
      });

    await expect(source.fetchUsageWithProvider(provider)).resolves.toEqual({
      usage: { ok: true },
    });
    expect(warn).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(nativeMarker);
    warn.mockRestore();
  });

  it("logs only a stable warning for marker-bearing auth probe failures", async () => {
    const source = globalThis.PacePetsBackgroundUsageSource;
    const nativeMarker = "RAW_AUTH_PROBE_MARKER_c81e52";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch
      .mockRejectedValueOnce(new Error(`Network failure near ${nativeMarker}`))
      .mockResolvedValueOnce({
        json: async () => ({ accessToken: "session-token" }),
        ok: true,
      })
      .mockResolvedValueOnce({
        json: async () => ({ usage: { ok: true } }),
        ok: true,
        status: 200,
      });

    await expect(source.fetchUsageWithProvider()).resolves.toEqual({
      usage: { ok: true },
    });
    expect(warn.mock.calls).toEqual([
      [source.AUTH_SESSION_CHECK_FAILURE_MESSAGE],
    ]);
    expect(warn.mock.calls.flat().map(String).join(" ")).not.toContain(
      nativeMarker,
    );
    warn.mockRestore();
  });
});
