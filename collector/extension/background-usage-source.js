(function attachPacePetsBackgroundUsageSource(root) {
  "use strict";

  const USAGE_PROVIDERS = root.CodexUsageProviders;
  if (!USAGE_PROVIDERS) {
    throw new Error(
      "Codex usage providers must load before background-usage-source.js.",
    );
  }

  const USAGE_PROVIDER = USAGE_PROVIDERS.DEFAULT_USAGE_PROVIDER;

  async function fetchAccessToken() {
    for (const url of USAGE_PROVIDER.authSessionUrls) {
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

  function usageHeaders(accessToken) {
    return USAGE_PROVIDERS.usageHeaders(
      USAGE_PROVIDER,
      accessToken,
      chrome.i18n.getUILanguage?.() || "en-US",
    );
  }

  async function fetchWhamUsage() {
    let accessToken = await fetchAccessToken();
    let response = await fetch(USAGE_PROVIDER.usageEndpoint, {
      cache: "no-store",
      credentials: "include",
      headers: usageHeaders(accessToken),
    });

    if (
      USAGE_PROVIDERS.shouldRetryUsageResponse(
        USAGE_PROVIDER,
        response.status,
        accessToken,
      )
    ) {
      accessToken = await fetchAccessToken();
      response = await fetch(USAGE_PROVIDER.usageEndpoint, {
        cache: "no-store",
        credentials: "include",
        headers: usageHeaders(accessToken),
      });
    }

    if (!response.ok) {
      const error = new Error(
        USAGE_PROVIDERS.usageFailureMessage(
          USAGE_PROVIDER,
          response.status,
          accessToken,
        ),
      );
      error.authFailure = USAGE_PROVIDERS.isAuthFailureStatus(
        USAGE_PROVIDER,
        response.status,
      );
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  root.PacePetsBackgroundUsageSource = Object.freeze({
    fetchWhamUsage,
  });
})(globalThis);
