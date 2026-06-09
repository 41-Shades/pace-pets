(function attachPacePetsBackgroundLogic(root) {
  "use strict";

  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before background-logic.js.",
    );
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before background-logic.js.",
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
  const PACE_LOGIC = root.PacePetsLogic;
  if (!PACE_LOGIC) {
    throw new Error(
      "Pace presentation logic must load before background-logic.js.",
    );
  }
  const PRODUCT_METADATA = root.CodexProductMetadata;
  if (!PRODUCT_METADATA) {
    throw new Error("Product metadata must load before background-logic.js.");
  }
  const PREVIEW_CONTROL = root.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace preview controls must load before background-logic.js.",
    );
  }

  const ATTENTION_BADGE_PREVIEW_STATE_KEY = "criticalBehind";
  const ATTENTION_BADGE_PREVIEW_BASE_STATE_KEY = "on";
  const MS_PER_MINUTE = 60 * 1000;
  const ACCESS_TOKEN_PATHS = Object.freeze([
    Object.freeze(["accessToken"]),
    Object.freeze(["access_token"]),
    Object.freeze(["session", "accessToken"]),
    Object.freeze(["session", "access_token"]),
    Object.freeze(["token"]),
  ]);

  function valueAtPath(data, path) {
    return path.reduce((value, key) => value?.[key], data);
  }

  function extractAccessToken(data) {
    return (
      ACCESS_TOKEN_PATHS.map((path) => valueAtPath(data, path)).find(Boolean) ||
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

  function badgePreviewWindowData(windowKey, stateKey, atMs) {
    const spec = USAGE_WINDOWS.WINDOW_SPECS[windowKey];
    const percentPair = PREVIEW_CONTROL.forcedPercentPairForState(stateKey);
    if (!spec || !percentPair) {
      return null;
    }

    const durationMs = spec.durationMinutes * MS_PER_MINUTE;
    const resetMs = atMs + (durationMs * percentPair.timePercent) / 100;
    return Object.freeze({
      remainingPercent: percentPair.remainingPercent,
      resetsAt: new Date(resetMs).toISOString(),
      usedPercent: USAGE_VALUES.percentComplement(percentPair.remainingPercent),
      windowMinutes: spec.durationMinutes,
    });
  }

  function criticalBadgePreviewWindowKey(preferredWindowKey) {
    const normalizedPreference = normalizeBadgeWindowKey(preferredWindowKey);
    return (
      USAGE_WINDOWS.alternateWindowKey(normalizedPreference) ||
      normalizedPreference
    );
  }

  function criticalBadgePreviewWindows(preferredWindowKey, atMs = Date.now()) {
    const criticalWindowKey = criticalBadgePreviewWindowKey(preferredWindowKey);
    return Object.freeze(
      Object.fromEntries(
        USAGE_WINDOWS.WINDOW_KEYS.map((windowKey) => [
          windowKey,
          badgePreviewWindowData(
            windowKey,
            windowKey === criticalWindowKey
              ? ATTENTION_BADGE_PREVIEW_STATE_KEY
              : ATTENTION_BADGE_PREVIEW_BASE_STATE_KEY,
            atMs,
          ),
        ]).filter((entry) => entry[1]),
      ),
    );
  }

  function badgeWindowKeys(windows, preferredWindowKey) {
    const availableWindowKeys = USAGE_WINDOWS.WINDOW_KEYS.filter(
      (windowKey) => windows?.[windowKey],
    );
    return availableWindowKeys.length > 0
      ? availableWindowKeys
      : [badgeWindowKey(windows, preferredWindowKey)];
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

  function candidateRatioRank(paceRatio) {
    return paceRatio === null ? 1 : 0;
  }

  function compareCandidateRatios(leftRatio, rightRatio) {
    const rankDifference =
      candidateRatioRank(leftRatio) - candidateRatioRank(rightRatio);
    if (rankDifference !== 0 || leftRatio === null) {
      return rankDifference;
    }

    return leftRatio - rightRatio;
  }

  function compareCandidatePreference(left, right, preferredWindowKey) {
    const normalizedPreference = normalizeBadgeWindowKey(preferredWindowKey);
    if (left?.windowKey === normalizedPreference) {
      return -1;
    }
    if (right?.windowKey === normalizedPreference) {
      return 1;
    }

    return badgeCandidateWindowIndex(left) - badgeCandidateWindowIndex(right);
  }

  function compareAttentionBadgeCandidates(left, right, preferredWindowKey) {
    return (
      compareCandidateRatios(
        candidatePaceRatio(left),
        candidatePaceRatio(right),
      ) || compareCandidatePreference(left, right, preferredWindowKey)
    );
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

  function badgeCandidateForWindow(windows, history, windowKey, atMs) {
    const windowData = windows?.[windowKey];
    const allowPerfectZero = PACE_LOGIC.allowsPerfectZeroForWindow(
      history,
      windowKey,
      windowData,
    );
    const controlledPresentation =
      PACE_LOGIC.controlledPacePresentationForWindow(windowData, {
        allowPerfectZero,
        atMs,
      });
    const paceRatio = PACE_LOGIC.paceRatioForWindow(windowData, atMs);
    const state =
      controlledPresentation?.state ||
      PACE_LOGIC.paceStatePresentationForRatio(paceRatio);
    const badgePaceRatio = controlledPresentation
      ? controlledPresentation.displayRatio
      : paceRatio;
    const label = BADGE_WINDOW_LABELS[windowKey] || "";
    const ratioBadgeText = PACE_LOGIC.badgeTextForPaceRatio(badgePaceRatio);
    const isAttentionBadge = isAttentionBadgeStateKey(state.key);

    return {
      badgeColor: controlledPresentation
        ? state.badgeColor
        : PACE_LOGIC.badgeColorForPaceRatio(paceRatio),
      badgePaceRatio,
      badgeText: isAttentionBadge ? label : ratioBadgeText,
      isAttentionBadge,
      label,
      paceRatio,
      ratioBadgeText,
      stateKey: state.key,
      stateTitle: state.title,
      windowKey,
    };
  }

  function badgeCandidatesForWindows(
    windows,
    history,
    preferredWindowKey,
    atMs,
  ) {
    return badgeWindowKeys(windows, preferredWindowKey).map((windowKey) =>
      badgeCandidateForWindow(windows, history, windowKey, atMs),
    );
  }

  function attentionBadgeTitleItems(attentionCandidates) {
    return attentionCandidates.map((candidate) => ({
      label: candidate.label,
      paceText: candidate.ratioBadgeText,
      title: candidate.stateTitle,
    }));
  }

  function badgeTitleForCandidate(candidate, attentionCandidates) {
    if (!candidate) {
      return PRODUCT_METADATA.ACTION_DEFAULT_TITLE;
    }
    if (candidate.isAttentionBadge) {
      return PRODUCT_METADATA.attentionBadgeTitle({
        items: attentionBadgeTitleItems(attentionCandidates),
      });
    }

    return PRODUCT_METADATA.badgeTitle(
      candidate.badgePaceRatio === null
        ? null
        : { badgeText: candidate.badgeText, label: candidate.label },
    );
  }

  function forcedBadgeDisplay(forcedBadgeState, paceRatio, windowKey) {
    return {
      badgeColor: forcedBadgeState.badgeColor,
      badgePaceRatio: forcedBadgeState.paceRatio,
      badgeText: forcedBadgeState.badgeText,
      paceRatio,
      title: PRODUCT_METADATA.stateOverrideBadgeTitle({
        badgeText: forcedBadgeState.badgeText,
        title: forcedBadgeState.state.title,
      }),
      windowKey,
    };
  }

  function selectedBadgeDisplay(candidate, attentionCandidates, windowKey) {
    return {
      badgeColor:
        candidate?.badgeColor || PACE_LOGIC.DEFAULT_BADGE_COLORS.muted,
      badgePaceRatio: candidate?.badgePaceRatio ?? null,
      badgeText: candidate?.badgeText || "",
      paceRatio: candidate?.paceRatio ?? null,
      title: badgeTitleForCandidate(candidate, attentionCandidates),
      windowKey,
    };
  }

  function badgeDisplayForSelection({
    attentionCandidates,
    candidate,
    forcedBadgeState,
    preferredWindowKey,
  }) {
    const paceRatio = candidate?.paceRatio ?? null;
    const windowKey = candidate?.windowKey || preferredWindowKey;
    return forcedBadgeState
      ? forcedBadgeDisplay(forcedBadgeState, paceRatio, windowKey)
      : selectedBadgeDisplay(candidate, attentionCandidates, windowKey);
  }

  function badgeDisplayForWindows({
    atMs,
    criticalBadgeWindow = false,
    forcedBadgeState,
    history,
    preferredWindowKey,
    windows,
  }) {
    const badgeWindows = criticalBadgeWindow
      ? criticalBadgePreviewWindows(preferredWindowKey, atMs)
      : windows;
    const badgeCandidates = badgeCandidatesForWindows(
      badgeWindows,
      criticalBadgeWindow ? null : history,
      preferredWindowKey,
      atMs,
    );
    return badgeDisplayForSelection({
      ...prioritizedBadgeSelection(badgeCandidates, preferredWindowKey),
      forcedBadgeState: criticalBadgeWindow ? null : forcedBadgeState,
      preferredWindowKey,
    });
  }

  root.PacePetsBackgroundLogic = {
    ATTENTION_BADGE_STATE_KEYS,
    AUTH_SESSION_URLS,
    BADGE_WINDOW_LABELS,
    DEFAULT_BADGE_WINDOW_KEY,
    badgeDisplayForWindows,
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
