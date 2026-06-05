(function attachPacePetsBackgroundUsageSource(root) {
  "use strict";

  const BACKGROUND_LOGIC = root.PacePetsBackgroundLogic;
  if (!BACKGROUND_LOGIC) {
    throw new Error(
      "Pace Pets background logic must load before background-usage-source.js.",
    );
  }
  const WEEKLY_USAGE = root.CodexWeeklyUsage;
  if (!WEEKLY_USAGE) {
    throw new Error(
      "Codex usage helpers must load before background-usage-source.js.",
    );
  }

  async function fetchAccessToken() {
    for (const url of BACKGROUND_LOGIC.AUTH_SESSION_URLS) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });
        const token =
          await BACKGROUND_LOGIC.extractAccessTokenFromSessionResponse(
            response,
          );
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
    return BACKGROUND_LOGIC.usageHeaders(
      accessToken,
      chrome.i18n.getUILanguage?.() || "en-US",
    );
  }

  async function fetchWhamUsage() {
    let accessToken = await fetchAccessToken();
    let response = await fetch(WEEKLY_USAGE.USAGE_ENDPOINT, {
      cache: "no-store",
      credentials: "include",
      headers: usageHeaders(accessToken),
    });

    if (
      BACKGROUND_LOGIC.shouldRetryUsageResponse(response.status, accessToken)
    ) {
      accessToken = await fetchAccessToken();
      response = await fetch(WEEKLY_USAGE.USAGE_ENDPOINT, {
        cache: "no-store",
        credentials: "include",
        headers: usageHeaders(accessToken),
      });
    }

    if (!response.ok) {
      const error = new Error(
        accessToken
          ? `ChatGPT usage endpoint returned ${response.status} with session token.`
          : `Could not read ChatGPT session token; usage endpoint returned ${response.status}.`,
      );
      error.authFailure = response.status === 401 || response.status === 403;
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  root.PacePetsBackgroundUsageSource = Object.freeze({
    fetchWhamUsage,
  });
})(globalThis);
