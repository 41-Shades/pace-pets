importScripts("runtime-manifest.js");
importScripts(...CodexExtensionRuntime.BACKGROUND_SCRIPT_SOURCES);

const POLL_ALARM = "refresh-codex-weekly-usage";
const BADGE_PRESENTATION_ALARM = "refresh-pace-badge-presentation";
const POLL_MINUTES = 5;
const BADGE_PRESENTATION_MINUTES = 1;
const INITIAL_REFRESH_DELAY_MINUTES = 1;
const DASHBOARD_PATH = CodexProductMetadata.DASHBOARD_PATH;
const BADGE_WINDOW_STORAGE_KEY = CodexUsageWindows.BADGE_WINDOW_STORAGE_KEY;
const DEVELOPER_OPTIONS_STORAGE_KEY = PacePetsDeveloperOptions.STORAGE_KEY;
let lastRefreshState = CodexRefreshStatus.initialState();
let scheduledRefreshPromise = null;
let manualRefreshCooldownUntilMs = 0;

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

async function readDeveloperOptions() {
  try {
    const items = await CodexExtensionStorage.getLocal(
      DEVELOPER_OPTIONS_STORAGE_KEY,
    );
    return PacePetsDeveloperOptions.developerOptionsFromStorageItems(items);
  } catch (error) {
    console.warn("Could not read developer options:", error);
    return PacePetsDeveloperOptions.normalizeDeveloperOptions(null);
  }
}

async function createBadgeContextMenus() {
  await PacePetsBackgroundContextMenu.createBadgeContextMenus(
    await selectedBadgeWindowKey(),
  );
}

async function syncBadgeContextMenuSelection() {
  await PacePetsBackgroundContextMenu.syncBadgeContextMenuSelection(
    await selectedBadgeWindowKey(),
  );
}

async function updatePaceBadge(windows, history = null) {
  const { criticalBadgeWindow, forcedPaceStateKey, sprintIntensityPreview } =
    await readDeveloperOptions();
  const preferredWindowKey = await selectedBadgeWindowKey();
  const badgeDisplay = PacePetsBackgroundLogic.badgeDisplayForWindows({
    atMs: Date.now(),
    criticalBadgeWindow,
    forcedBadgeState: PacePetsPreviewControl.forcedBadgeState(
      forcedPaceStateKey,
      {
        sprintIntensityPreview,
      },
    ),
    history,
    preferredWindowKey,
    windows,
  });

  await setBadge(
    badgeDisplay.badgeText,
    badgeDisplay.badgeColor,
    badgeDisplay.title,
  );
  return {
    badgePaceRatio: badgeDisplay.badgePaceRatio,
    paceRatio: badgeDisplay.paceRatio,
    windowKey: badgeDisplay.windowKey,
  };
}

async function updatePaceBadgeFromHistory({ clearWhenEmpty = false } = {}) {
  const history = await CodexUsageHistory.readHistory();
  const sample = CodexUsageHistory.latestSample(history);
  if (!sample) {
    const developerOptions = await readDeveloperOptions();
    if (developerOptions.criticalBadgeWindow) {
      await updatePaceBadge({});
      return;
    }
    const forcedBadgeState = PacePetsPreviewControl.forcedBadgeState(
      developerOptions.forcedPaceStateKey,
      {
        sprintIntensityPreview: developerOptions.sprintIntensityPreview,
      },
    );
    if (forcedBadgeState) {
      await setBadge(
        forcedBadgeState.badgeText,
        forcedBadgeState.badgeColor,
        CodexProductMetadata.stateOverrideBadgeTitle({
          badgeText: forcedBadgeState.badgeText,
          title: forcedBadgeState.state.title,
        }),
      );
      return;
    }

    if (clearWhenEmpty) {
      await setBadge(
        "",
        PacePetsLogic.DEFAULT_BADGE_COLORS.muted,
        CodexProductMetadata.ACTION_DEFAULT_TITLE,
      );
    }
    return;
  }

  const badgeState = await updatePaceBadge(sample.windows, history);

  lastRefreshState = {
    ...lastRefreshState,
    badgeWindowKey: badgeState.windowKey,
    badgePaceRatio: badgeState.badgePaceRatio,
  };
}

async function refreshUsage() {
  const rawUsage = await PacePetsBackgroundUsageSource.fetchWhamUsage();
  const payload = CodexWeeklyUsage.normalizeWhamUsage(rawUsage);
  payload.source =
    CodexWeeklyUsage.DEFAULT_USAGE_PROVIDER.sourceMarkers.background;
  const { history, sample, stored, checkedAt } =
    await CodexUsageHistory.appendUsageSnapshot(payload);
  const badgeState = await updatePaceBadge(sample.windows, history);
  lastRefreshState = CodexRefreshStatus.successState({
    badgePaceRatio: badgeState.badgePaceRatio,
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

function shouldSkipBadgePresentationRefresh() {
  return (
    scheduledRefreshPromise !== null ||
    (lastRefreshState.refreshedAt && lastRefreshState.ok === false)
  );
}

function runBadgePresentationRefresh() {
  if (shouldSkipBadgePresentationRefresh()) {
    return Promise.resolve();
  }

  return updatePaceBadgeFromHistory();
}

function manualRefreshCooldownRemainingMs() {
  return PacePetsRefreshControl.cooldownRemainingMs(
    manualRefreshCooldownUntilMs,
  );
}

function runManualRefresh() {
  const remainingMs = manualRefreshCooldownRemainingMs();
  if (remainingMs > 0) {
    return Promise.resolve(
      PacePetsRefreshControl.manualRefreshCooldownResponse(
        lastRefreshState,
        remainingMs,
      ),
    );
  }

  manualRefreshCooldownUntilMs =
    Date.now() + PacePetsRefreshControl.MANUAL_REFRESH_COOLDOWN_MS;
  return runScheduledRefresh().then(PacePetsRefreshControl.refreshNowResponse);
}

function scheduleRefresh() {
  chrome.alarms.create(POLL_ALARM, {
    delayInMinutes: INITIAL_REFRESH_DELAY_MINUTES,
    periodInMinutes: POLL_MINUTES,
  });
  chrome.alarms.create(BADGE_PRESENTATION_ALARM, {
    delayInMinutes: BADGE_PRESENTATION_MINUTES,
    periodInMinutes: BADGE_PRESENTATION_MINUTES,
  });
  runBadgePresentationRefresh().catch((error) => {
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (PacePetsRefreshControl.isRefreshNowMessage(message)) {
    runManualRefresh()
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse(PacePetsRefreshControl.refreshErrorResponse(error));
      });

    return true;
  }

  return false;
});
chrome.contextMenus?.onClicked?.addListener((info) => {
  if (PacePetsBackgroundContextMenu.isOpenDashboardMenuItem(info.menuItemId)) {
    openDashboard();
    return;
  }

  const windowKey =
    PacePetsBackgroundContextMenu.badgeWindowKeyFromContextMenuId(
      info.menuItemId,
    );
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
  if (alarm.name === POLL_ALARM) {
    runScheduledRefresh();
    return;
  }

  if (alarm.name === BADGE_PRESENTATION_ALARM) {
    runBadgePresentationRefresh().catch((error) => {
      console.warn("Codex usage badge presentation update failed:", error);
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (!CodexExtensionStorage.isLocalArea(areaName)) {
    return;
  }

  const badgeWindowChanged = CodexExtensionStorage.hasChange(
    changes,
    BADGE_WINDOW_STORAGE_KEY,
  );
  const developerOptionsChanged =
    PacePetsDeveloperOptions.hasDeveloperOptionsChange(changes);
  if (!badgeWindowChanged && !developerOptionsChanged) {
    return;
  }

  updatePaceBadgeFromHistory({
    clearWhenEmpty: developerOptionsChanged,
  }).catch((error) => {
    console.warn("Codex usage badge update failed:", error);
  });
  if (badgeWindowChanged) {
    syncBadgeContextMenuSelection().catch((error) => {
      console.warn("Codex usage badge menu sync failed:", error);
    });
  }
});
