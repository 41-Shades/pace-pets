(function attachPacePetsBackgroundUsageSource(root) {
  "use strict";

  const USAGE_PROVIDERS = root.CodexUsageProviders;
  if (!USAGE_PROVIDERS) {
    throw new Error(
      "Codex usage providers must load before background-usage-source.js.",
    );
  }

  const DEFAULT_USAGE_PROVIDER = USAGE_PROVIDERS.DEFAULT_USAGE_PROVIDER;

  function usageProviderForKey(providerKey = DEFAULT_USAGE_PROVIDER.key) {
    return USAGE_PROVIDERS.requireProviderForKey(providerKey);
  }

  async function fetchAccessToken(provider = DEFAULT_USAGE_PROVIDER) {
    for (const url of provider.authSessionUrls) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });
        const token =
          await USAGE_PROVIDERS.extractAccessTokenFromSessionResponse(response);
        if (token) {
          return token;
        }
      } catch (error) {
        console.warn(
          "Codex usage auth session check failed:",
          error?.message || "unknown error",
        );
      }
    }

    return null;
  }

  function usageHeaders(provider, accessToken) {
    return USAGE_PROVIDERS.usageHeaders(
      provider,
      accessToken,
      chrome.i18n.getUILanguage?.() || "en-US",
    );
  }

  async function fetchUsageWithProvider(provider = DEFAULT_USAGE_PROVIDER) {
    let accessToken = await fetchAccessToken(provider);
    let response = await fetch(provider.usageEndpoint, {
      cache: "no-store",
      credentials: "include",
      headers: usageHeaders(provider, accessToken),
    });

    if (
      USAGE_PROVIDERS.shouldRetryUsageResponse(
        provider,
        response.status,
        accessToken,
      )
    ) {
      accessToken = await fetchAccessToken(provider);
      response = await fetch(provider.usageEndpoint, {
        cache: "no-store",
        credentials: "include",
        headers: usageHeaders(provider, accessToken),
      });
    }

    if (!response.ok) {
      const error = new Error(
        USAGE_PROVIDERS.usageFailureMessage(
          provider,
          response.status,
          accessToken,
        ),
      );
      error.authFailure = USAGE_PROVIDERS.isAuthFailureStatus(
        provider,
        response.status,
      );
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  function fetchUsageForProviderKey(providerKey = DEFAULT_USAGE_PROVIDER.key) {
    return fetchUsageWithProvider(usageProviderForKey(providerKey));
  }

  function fetchWhamUsage() {
    return fetchUsageWithProvider(DEFAULT_USAGE_PROVIDER);
  }

  root.PacePetsBackgroundUsageSource = Object.freeze({
    DEFAULT_USAGE_PROVIDER,
    fetchAccessToken,
    fetchUsageForProviderKey,
    fetchUsageWithProvider,
    fetchWhamUsage,
    usageProviderForKey,
  });
})(globalThis);
