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
  const ATTENTION_BADGE_STATE_KEYS = Object.freeze(["criticalBehind"]);

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

  function isAttentionBadgeStateKey(stateKey) {
    return ATTENTION_BADGE_STATE_KEYS.includes(stateKey);
  }

  function badgeCandidateWindowIndex(candidate) {
    const index = USAGE_WINDOWS.WINDOW_KEYS.indexOf(candidate?.windowKey);
    return index === -1 ? USAGE_WINDOWS.WINDOW_KEYS.length : index;
  }

  function candidatePaceRatio(candidate) {
    const paceRatio = Number(candidate?.paceRatio);
    return Number.isFinite(paceRatio) ? paceRatio : null;
  }

  function compareAttentionBadgeCandidates(left, right, preferredWindowKey) {
    const leftRatio = candidatePaceRatio(left);
    const rightRatio = candidatePaceRatio(right);
    if (leftRatio !== null && rightRatio !== null && leftRatio !== rightRatio) {
      return leftRatio - rightRatio;
    }
    if (leftRatio !== null && rightRatio === null) {
      return -1;
    }
    if (leftRatio === null && rightRatio !== null) {
      return 1;
    }

    const normalizedPreference = normalizeBadgeWindowKey(preferredWindowKey);
    if (left?.windowKey === normalizedPreference) {
      return -1;
    }
    if (right?.windowKey === normalizedPreference) {
      return 1;
    }

    return badgeCandidateWindowIndex(left) - badgeCandidateWindowIndex(right);
  }

  function sortedAttentionBadgeCandidates(candidates, preferredWindowKey) {
    return candidates
      .filter((candidate) => isAttentionBadgeStateKey(candidate?.stateKey))
      .slice()
      .sort((left, right) =>
        compareAttentionBadgeCandidates(left, right, preferredWindowKey),
      );
  }

  function prioritizedBadgeSelection(candidates, preferredWindowKey) {
    const availableCandidates = Array.isArray(candidates) ? candidates : [];
    const attentionCandidates = sortedAttentionBadgeCandidates(
      availableCandidates,
      preferredWindowKey,
    );
    if (attentionCandidates.length > 0) {
      return {
        attentionCandidates,
        candidate: attentionCandidates[0],
      };
    }

    const normalizedPreference = normalizeBadgeWindowKey(preferredWindowKey);
    return {
      attentionCandidates,
      candidate:
        availableCandidates.find(
          (candidate) => candidate?.windowKey === normalizedPreference,
        ) ||
        availableCandidates[0] ||
        null,
    };
  }

  root.PacePetsBackgroundLogic = {
    ATTENTION_BADGE_STATE_KEYS,
    AUTH_SESSION_URLS,
    BADGE_WINDOW_LABELS,
    DEFAULT_BADGE_WINDOW_KEY,
    badgeWindowKey,
    extractAccessToken,
    extractAccessTokenFromSessionResponse,
    isAttentionBadgeStateKey,
    prioritizedBadgeSelection,
    selectedBadgeWindowKeyFromItems,
    shouldRetryUsageResponse,
    usageHeaders,
  };
})(globalThis);
