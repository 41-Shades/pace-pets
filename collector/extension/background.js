importScripts("runtime-manifest.js");
importScripts(...CodexExtensionRuntime.BACKGROUND_SCRIPT_SOURCES);

const DASHBOARD_PATH = CodexProductMetadata.DASHBOARD_PATH;
const BADGE_WINDOW_STORAGE_KEY = CodexUsageWindows.BADGE_WINDOW_STORAGE_KEY;
const DEVELOPER_OPTIONS_STORAGE_KEY = PacePetsDeveloperOptions.STORAGE_KEY;
const HISTORY_STORAGE_KEY = CodexUsageHistory.HISTORY_STORAGE_KEY;
const MANUAL_REFRESH_COOLDOWN_STORAGE_KEY =
  PacePetsRefreshControl.MANUAL_REFRESH_COOLDOWN_STORAGE_KEY;
const USAGE_PROVIDER = CodexWeeklyUsage.DEFAULT_USAGE_PROVIDER;
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
  const rawUsage =
    await PacePetsBackgroundUsageSource.fetchUsageWithProvider(USAGE_PROVIDER);
  const payload = CodexWeeklyUsage.normalizeUsageWithProvider(
    rawUsage,
    USAGE_PROVIDER,
    { sourceMarkerKey: "background" },
  );
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

async function readManualRefreshCooldownUntilMs() {
  try {
    const items = await CodexExtensionStorage.getLocal(
      MANUAL_REFRESH_COOLDOWN_STORAGE_KEY,
    );
    return PacePetsRefreshControl.manualRefreshCooldownUntilMs(
      items[MANUAL_REFRESH_COOLDOWN_STORAGE_KEY],
    );
  } catch (error) {
    console.warn("Could not read Codex usage manual refresh cooldown:", error);
    return manualRefreshCooldownUntilMs;
  }
}

async function persistManualRefreshCooldownUntilMs(cooldownUntilMs) {
  manualRefreshCooldownUntilMs =
    PacePetsRefreshControl.manualRefreshCooldownUntilMs(cooldownUntilMs);
  const storedValue = PacePetsRefreshControl.manualRefreshCooldownStorageValue(
    manualRefreshCooldownUntilMs,
  );

  try {
    if (storedValue) {
      await CodexExtensionStorage.setLocal({
        [MANUAL_REFRESH_COOLDOWN_STORAGE_KEY]: storedValue,
      });
      return;
    }

    await CodexExtensionStorage.removeLocal(
      MANUAL_REFRESH_COOLDOWN_STORAGE_KEY,
    );
  } catch (error) {
    console.warn("Could not store Codex usage manual refresh cooldown:", error);
  }
}

async function manualRefreshCooldownRemainingMs() {
  manualRefreshCooldownUntilMs = Math.max(
    manualRefreshCooldownUntilMs,
    await readManualRefreshCooldownUntilMs(),
  );
  return PacePetsRefreshControl.cooldownRemainingMs(
    manualRefreshCooldownUntilMs,
  );
}

async function runManualRefresh() {
  const remainingMs = await manualRefreshCooldownRemainingMs();
  if (remainingMs > 0) {
    return PacePetsRefreshControl.manualRefreshCooldownResponse(
      lastRefreshState,
      remainingMs,
    );
  }

  await persistManualRefreshCooldownUntilMs(
    Date.now() + PacePetsRefreshControl.MANUAL_REFRESH_COOLDOWN_MS,
  );
  return runScheduledRefresh().then(PacePetsRefreshControl.refreshNowResponse);
}

function scheduleRefresh() {
  const { badgePresentation, usageRefresh } = PacePetsRefreshSchedule.ALARMS;
  chrome.alarms.create(
    usageRefresh.name,
    PacePetsRefreshSchedule.alarmCreateOptions(usageRefresh),
  );
  chrome.alarms.create(
    badgePresentation.name,
    PacePetsRefreshSchedule.alarmCreateOptions(badgePresentation),
  );
  runBadgePresentationRefresh().catch((error) => {
    console.warn("Codex usage badge presentation refresh failed:", error);
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

  if (PacePetsBackgroundContextMenu.isCheckUsageNowMenuItem(info.menuItemId)) {
    runManualRefresh().catch((error) => {
      console.warn("Codex usage context-menu refresh failed:", error);
    });
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
  if (alarm.name === PacePetsRefreshSchedule.USAGE_REFRESH_ALARM_NAME) {
    runScheduledRefresh();
    return;
  }

  if (alarm.name === PacePetsRefreshSchedule.BADGE_PRESENTATION_ALARM_NAME) {
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
  const historyChanged = CodexExtensionStorage.hasChange(
    changes,
    HISTORY_STORAGE_KEY,
  );
  const developerOptionsChanged =
    PacePetsDeveloperOptions.hasDeveloperOptionsChange(changes);
  if (!badgeWindowChanged && !historyChanged && !developerOptionsChanged) {
    return;
  }

  updatePaceBadgeFromHistory({
    clearWhenEmpty: historyChanged || developerOptionsChanged,
  }).catch((error) => {
    console.warn("Codex usage badge update failed:", error);
  });
  if (badgeWindowChanged) {
    syncBadgeContextMenuSelection().catch((error) => {
      console.warn("Codex usage badge menu sync failed:", error);
    });
  }
});
