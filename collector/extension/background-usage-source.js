(function attachPacePetsBackgroundUsageSource(root) {
  "use strict";

  const USAGE_PROVIDERS = root.CodexUsageProviders;
  if (!USAGE_PROVIDERS) {
    throw new Error(
      "Codex usage providers must load before background-usage-source.js.",
    );
  }

  const DEFAULT_USAGE_PROVIDER = USAGE_PROVIDERS.DEFAULT_USAGE_PROVIDER;
  const AUTH_SESSION_CHECK_FAILURE_MESSAGE =
    "ChatGPT usage auth session check failed.";
  const USAGE_REFRESH_DEADLINE_MS = 20 * 1000;
  const USAGE_REFRESH_TIMEOUT_MESSAGE = "ChatGPT usage check timed out.";
  const USAGE_RESPONSE_PARSE_FAILURE_MESSAGE =
    "ChatGPT usage response was not valid JSON.";

  function usageRefreshTimeoutError() {
    const error = new Error(USAGE_REFRESH_TIMEOUT_MESSAGE);
    error.timeout = true;
    return error;
  }

  function usageResponseParseFailureError() {
    return new Error(USAGE_RESPONSE_PARSE_FAILURE_MESSAGE);
  }

  function usageProviderForKey(providerKey = DEFAULT_USAGE_PROVIDER.key) {
    return USAGE_PROVIDERS.requireProviderForKey(providerKey);
  }

  async function fetchAccessToken(
    provider = DEFAULT_USAGE_PROVIDER,
    { signal } = {},
  ) {
    for (const url of provider.authSessionUrls) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal,
        });
        const token =
          await USAGE_PROVIDERS.extractAccessTokenFromSessionResponse(response);
        if (token) {
          return token;
        }
      } catch (error) {
        if (signal?.aborted) {
          throw error;
        }
        console.warn(AUTH_SESSION_CHECK_FAILURE_MESSAGE);
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
    const controller = new AbortController();
    const deadlineTimer = setTimeout(
      () => controller.abort(),
      USAGE_REFRESH_DEADLINE_MS,
    );

    try {
      let accessToken = await fetchAccessToken(provider, {
        signal: controller.signal,
      });
      let response = await fetch(provider.usageEndpoint, {
        cache: "no-store",
        credentials: "include",
        headers: usageHeaders(provider, accessToken),
        signal: controller.signal,
      });

      if (
        USAGE_PROVIDERS.shouldRetryUsageResponse(
          provider,
          response.status,
          accessToken,
        )
      ) {
        accessToken = await fetchAccessToken(provider, {
          signal: controller.signal,
        });
        response = await fetch(provider.usageEndpoint, {
          cache: "no-store",
          credentials: "include",
          headers: usageHeaders(provider, accessToken),
          signal: controller.signal,
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

      try {
        return await response.json();
      } catch {
        throw usageResponseParseFailureError();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw usageRefreshTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(deadlineTimer);
    }
  }

  function fetchUsageForProviderKey(providerKey = DEFAULT_USAGE_PROVIDER.key) {
    return fetchUsageWithProvider(usageProviderForKey(providerKey));
  }

  function fetchWhamUsage() {
    return fetchUsageWithProvider(DEFAULT_USAGE_PROVIDER);
  }

  root.PacePetsBackgroundUsageSource = Object.freeze({
    AUTH_SESSION_CHECK_FAILURE_MESSAGE,
    DEFAULT_USAGE_PROVIDER,
    USAGE_REFRESH_DEADLINE_MS,
    USAGE_REFRESH_TIMEOUT_MESSAGE,
    USAGE_RESPONSE_PARSE_FAILURE_MESSAGE,
    fetchAccessToken,
    fetchUsageForProviderKey,
    fetchUsageWithProvider,
    fetchWhamUsage,
    usageProviderForKey,
  });
})(globalThis);
