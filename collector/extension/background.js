importScripts("runtime-manifest.js");
importScripts(...CodexExtensionRuntime.BACKGROUND_SCRIPT_SOURCES);

const POLL_ALARM = "refresh-codex-weekly-usage";
const POLL_MINUTES = 5;
const INITIAL_REFRESH_DELAY_MINUTES = 1;
const DASHBOARD_PATH = CodexProductMetadata.DASHBOARD_PATH;
const BADGE_WINDOW_STORAGE_KEY = CodexUsageWindows.WINDOW_STORAGE_KEY;
const OPEN_DASHBOARD_CONTEXT_MENU_ID = "open-dashboard";
const BADGE_CONTEXT_MENU_SEPARATOR_ID = "badge-window-separator";
const BADGE_CONTEXT_MENU_ID_PREFIX = "badge-window:";
const BADGE_CONTEXT_MENU_CONTEXTS = ["action"];
let lastRefreshState = CodexRefreshStatus.initialState();
let scheduledRefreshPromise = null;
let manualRefreshCooldownUntilMs = 0;

async function fetchAccessToken() {
  for (const url of PacePetsBackgroundLogic.AUTH_SESSION_URLS) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      const token =
        await PacePetsBackgroundLogic.extractAccessTokenFromSessionResponse(
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
      continue;
    }
  }

  return null;
}

function usageHeaders(accessToken) {
  return PacePetsBackgroundLogic.usageHeaders(
    accessToken,
    chrome.i18n.getUILanguage?.() || "en-US",
  );
}

async function fetchWhamUsage() {
  let accessToken = await fetchAccessToken();
  let response = await fetch(CodexWeeklyUsage.USAGE_ENDPOINT, {
    cache: "no-store",
    credentials: "include",
    headers: usageHeaders(accessToken),
  });

  if (
    PacePetsBackgroundLogic.shouldRetryUsageResponse(
      response.status,
      accessToken,
    )
  ) {
    accessToken = await fetchAccessToken();
    response = await fetch(CodexWeeklyUsage.USAGE_ENDPOINT, {
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

async function persistRefreshStatus(refreshState) {
  try {
    await CodexUsageHistory.writeRefreshStatus(refreshState);
  } catch (error) {
    console.warn("Could not store Codex usage refresh status:", error);
  }
}

async function setBadge(
  text,
  color,
  title = CodexProductMetadata.ACTION_DEFAULT_TITLE,
) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setTitle({ title });
}

function paceRatioForWindow(windowData) {
  return PacePetsLogic.paceRatioForWindow(windowData);
}

function badgeTextForPaceRatio(paceRatio) {
  return PacePetsLogic.badgeTextForPaceRatio(paceRatio);
}

function badgeColorForPaceRatio(paceRatio) {
  return PacePetsLogic.badgeColorForPaceRatio(paceRatio);
}

async function selectedBadgeWindowKey() {
  try {
    const items = await CodexExtensionStorage.getLocal(
      BADGE_WINDOW_STORAGE_KEY,
    );
    return PacePetsBackgroundLogic.selectedBadgeWindowKeyFromItems(
      items,
      BADGE_WINDOW_STORAGE_KEY,
    );
  } catch (error) {
    console.warn("Could not read badge window preference:", error);
    return PacePetsBackgroundLogic.DEFAULT_BADGE_WINDOW_KEY;
  }
}

function badgeContextMenuId(windowKey) {
  return `${BADGE_CONTEXT_MENU_ID_PREFIX}${windowKey}`;
}

function badgeWindowKeyFromContextMenuId(menuItemId) {
  if (
    typeof menuItemId !== "string" ||
    !menuItemId.startsWith(BADGE_CONTEXT_MENU_ID_PREFIX)
  ) {
    return null;
  }

  const windowKey = menuItemId.slice(BADGE_CONTEXT_MENU_ID_PREFIX.length);
  return CodexUsageWindows.isSupportedWindowKey(windowKey) ? windowKey : null;
}

function contextMenusAvailable() {
  return Boolean(
    chrome.contextMenus?.create &&
    chrome.contextMenus?.removeAll &&
    chrome.contextMenus?.update,
  );
}

function removeAllContextMenus() {
  return CodexExtensionStorage.callbackWithLastError((done) => {
    chrome.contextMenus.removeAll(done);
  });
}

function createContextMenu(properties) {
  return CodexExtensionStorage.callbackWithLastError((done) => {
    chrome.contextMenus.create(properties, done);
  });
}

function updateContextMenu(menuItemId, properties) {
  return CodexExtensionStorage.callbackWithLastError((done) => {
    chrome.contextMenus.update(menuItemId, properties, done);
  });
}

async function createBadgeContextMenus() {
  if (!contextMenusAvailable()) {
    return;
  }

  const selectedWindowKey = await selectedBadgeWindowKey();
  await removeAllContextMenus();
  await createContextMenu({
    contexts: BADGE_CONTEXT_MENU_CONTEXTS,
    id: OPEN_DASHBOARD_CONTEXT_MENU_ID,
    title: CodexProductMetadata.OPEN_DASHBOARD_MENU_TITLE,
  });
  await createContextMenu({
    contexts: BADGE_CONTEXT_MENU_CONTEXTS,
    id: BADGE_CONTEXT_MENU_SEPARATOR_ID,
    type: "separator",
  });

  for (const windowKey of CodexUsageWindows.WINDOW_KEYS) {
    await createContextMenu({
      checked: windowKey === selectedWindowKey,
      contexts: BADGE_CONTEXT_MENU_CONTEXTS,
      id: badgeContextMenuId(windowKey),
      title: `${CodexUsageWindows.WINDOW_SPECS[windowKey].badge} badge`,
      type: "radio",
    });
  }
}

async function syncBadgeContextMenuSelection() {
  if (!contextMenusAvailable()) {
    return;
  }

  const selectedWindowKey = await selectedBadgeWindowKey();
  for (const windowKey of CodexUsageWindows.WINDOW_KEYS) {
    await updateContextMenu(badgeContextMenuId(windowKey), {
      checked: windowKey === selectedWindowKey,
    });
  }
}

async function updatePaceBadge(windows) {
  const preferredWindowKey = await selectedBadgeWindowKey();
  const windowKey = PacePetsBackgroundLogic.badgeWindowKey(
    windows,
    preferredWindowKey,
  );
  const paceRatio = paceRatioForWindow(windows?.[windowKey]);
  const label = PacePetsBackgroundLogic.BADGE_WINDOW_LABELS[windowKey] || "";
  const badgeText = badgeTextForPaceRatio(paceRatio);
  const title = CodexProductMetadata.badgeTitle(
    paceRatio === null ? null : { badgeText, label },
  );

  await setBadge(badgeText, badgeColorForPaceRatio(paceRatio), title);
  return { windowKey, paceRatio };
}

async function updatePaceBadgeFromHistory() {
  const history = await CodexUsageHistory.readHistory();
  const sample = CodexUsageHistory.latestSample(history);
  if (!sample) {
    return;
  }

  const badgeState = await updatePaceBadge(sample.windows);

  lastRefreshState = {
    ...lastRefreshState,
    badgeWindowKey: badgeState.windowKey,
    badgePaceRatio: badgeState.paceRatio,
  };
}

async function refreshUsage() {
  const rawUsage = await fetchWhamUsage();
  const payload = CodexWeeklyUsage.normalizeWhamUsage(rawUsage);
  payload.source = CodexIntegrationConfig.SOURCE_MARKERS.background;
  const { history, sample, stored, checkedAt } =
    await CodexUsageHistory.appendUsageSnapshot(payload);
  const badgeState = await updatePaceBadge(sample.windows);
  lastRefreshState = CodexRefreshStatus.successState({
    badgePaceRatio: badgeState.paceRatio,
    badgeWindowKey: badgeState.windowKey,
    refreshedAt: checkedAt,
    sampleCount: history.samples.length,
    stored,
    windows: sample.windows,
  });
  await persistRefreshStatus(lastRefreshState);
  return lastRefreshState;
}

async function recordRefreshFailure(error) {
  lastRefreshState = CodexRefreshStatus.failureState(error);
  await persistRefreshStatus(lastRefreshState);
  await setBadge(
    "!",
    "#b42318",
    CodexProductMetadata.REFRESH_FAILED_TITLE,
  ).catch(() => {});
  return lastRefreshState;
}

function runScheduledRefresh() {
  if (scheduledRefreshPromise) {
    return scheduledRefreshPromise;
  }

  scheduledRefreshPromise = refreshUsage()
    .catch((error) => {
      console.warn("Codex usage refresh failed:", error);
      return recordRefreshFailure(error).catch(() => {});
    })
    .finally(() => {
      scheduledRefreshPromise = null;
    });

  return scheduledRefreshPromise;
}

function refreshNowResponse(refreshState) {
  const refreshStatus = CodexRefreshStatus.normalizeRefreshStatus(refreshState);
  return {
    ok: refreshStatus?.ok === true,
    refreshStatus,
  };
}

function manualRefreshCooldownRemainingMs() {
  return Math.max(0, manualRefreshCooldownUntilMs - Date.now());
}

function manualRefreshCooldownResponse(remainingMs) {
  return {
    ok: false,
    refreshStatus: CodexRefreshStatus.normalizeRefreshStatus(lastRefreshState),
    cooldownRemainingMs: remainingMs,
  };
}

function runManualRefresh() {
  const remainingMs = manualRefreshCooldownRemainingMs();
  if (remainingMs > 0) {
    return Promise.resolve(manualRefreshCooldownResponse(remainingMs));
  }

  manualRefreshCooldownUntilMs =
    Date.now() + PacePetsRefreshControl.MANUAL_REFRESH_COOLDOWN_MS;
  return runScheduledRefresh().then(refreshNowResponse);
}

function scheduleRefresh() {
  chrome.alarms.create(POLL_ALARM, {
    delayInMinutes: INITIAL_REFRESH_DELAY_MINUTES,
    periodInMinutes: POLL_MINUTES,
  });
  updatePaceBadgeFromHistory().catch((error) => {
    console.warn("Codex usage badge restore failed:", error);
  });
}

function initializeExtension() {
  scheduleRefresh();
  createBadgeContextMenus().catch((error) => {
    console.warn("Codex usage badge menu setup failed:", error);
  });
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL(DASHBOARD_PATH) });
}

chrome.runtime.onInstalled.addListener(initializeExtension);
chrome.runtime.onStartup.addListener(initializeExtension);
chrome.action.onClicked.addListener(openDashboard);
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!PacePetsRefreshControl.isRefreshNowMessage(message)) {
    return false;
  }

  runManualRefresh()
    .then((response) => {
      sendResponse(response);
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        refreshStatus: null,
        message: CodexRefreshStatus.safeFailureMessage(error),
      });
    });

  return true;
});
chrome.contextMenus?.onClicked?.addListener((info) => {
  if (info.menuItemId === OPEN_DASHBOARD_CONTEXT_MENU_ID) {
    openDashboard();
    return;
  }

  const windowKey = badgeWindowKeyFromContextMenuId(info.menuItemId);
  if (!windowKey) {
    return;
  }

  CodexExtensionStorage.setLocal({
    [BADGE_WINDOW_STORAGE_KEY]: windowKey,
  }).catch((error) => {
    console.warn("Codex usage badge window update failed:", error);
  });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== POLL_ALARM) {
    return;
  }

  runScheduledRefresh();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    !CodexExtensionStorage.isLocalArea(areaName) ||
    !CodexExtensionStorage.hasChange(changes, BADGE_WINDOW_STORAGE_KEY)
  ) {
    return;
  }

  updatePaceBadgeFromHistory().catch((error) => {
    console.warn("Codex usage badge update failed:", error);
  });
  syncBadgeContextMenuSelection().catch((error) => {
    console.warn("Codex usage badge menu sync failed:", error);
  });
});
