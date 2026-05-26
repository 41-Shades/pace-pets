(function attachPacePetsBackgroundLogic(root) {
  "use strict";

  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before background-logic.js.",
    );
  }
  const INTEGRATION_CONFIG = root.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error(
      "Codex integration config must load before background-logic.js.",
    );
  }

  const DEFAULT_BADGE_WINDOW_KEY = USAGE_WINDOWS.DEFAULT_WINDOW_KEY;
  const BADGE_WINDOW_LABELS = USAGE_WINDOWS.WINDOW_BADGE_LABELS;
  const AUTH_SESSION_URLS = INTEGRATION_CONFIG.AUTH_SESSION_URLS;

  function extractAccessToken(data) {
    return (
      data?.accessToken ||
      data?.access_token ||
      data?.session?.accessToken ||
      data?.session?.access_token ||
      data?.token ||
      null
    );
  }

  async function extractAccessTokenFromSessionResponse(response) {
    if (!response?.ok) {
      return null;
    }

    try {
      return extractAccessToken(await response.json());
    } catch {
      return null;
    }
  }

  function usageHeaders(accessToken, uiLanguage = "en-US") {
    const headers = {
      Accept: "application/json",
      "oai-language": uiLanguage || "en-US",
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  function shouldRetryUsageResponse(status, accessToken) {
    return (status === 401 || status === 403) && Boolean(accessToken);
  }

  function normalizeBadgeWindowKey(value) {
    return USAGE_WINDOWS.normalizeWindowKey(value);
  }

  function selectedBadgeWindowKeyFromItems(items, storageKey) {
    return normalizeBadgeWindowKey(items?.[storageKey]);
  }

  function badgeWindowKey(windows, preferredWindowKey) {
    return USAGE_WINDOWS.firstAvailableWindowKey(windows, preferredWindowKey);
  }

  root.PacePetsBackgroundLogic = {
    AUTH_SESSION_URLS,
    BADGE_WINDOW_LABELS,
    DEFAULT_BADGE_WINDOW_KEY,
    badgeWindowKey,
    extractAccessToken,
    extractAccessTokenFromSessionResponse,
    selectedBadgeWindowKeyFromItems,
    shouldRetryUsageResponse,
    usageHeaders,
  };
})(globalThis);
