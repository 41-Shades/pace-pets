importScripts("runtime-manifest.js");
importScripts(...CodexExtensionRuntime.BACKGROUND_SCRIPT_SOURCES);

const DASHBOARD_PATH = CodexProductMetadata.DASHBOARD_PATH;
const BADGE_WINDOW_STORAGE_KEY = CodexUsageWindows.BADGE_WINDOW_STORAGE_KEY;
const DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY =
  CodexUsageWindows.DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY;
const BADGE_PRESENTATION = PacePetsBackgroundBadgePresentation;
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

async function createBadgeContextMenus() {
  const [selectedWindowKey, syncDashboardBadgeWindow] = await Promise.all([
    BADGE_PRESENTATION.selectedBadgeWindowKey(),
    readDashboardBadgeWindowSyncEnabled(),
  ]);
  await PacePetsBackgroundContextMenu.createBadgeContextMenus({
    selectedWindowKey,
    syncDashboardBadgeWindow,
  });
}

async function syncBadgeContextMenuSelection() {
  await PacePetsBackgroundContextMenu.syncBadgeContextMenuSelection(
    await BADGE_PRESENTATION.selectedBadgeWindowKey(),
  );
}

async function readDashboardBadgeWindowSyncEnabled() {
  try {
    const items = await CodexExtensionStorage.getLocal(
      DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY,
    );
    return CodexUsageWindows.dashboardBadgeWindowSyncEnabled(
      items[DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY],
    );
  } catch (error) {
    console.warn("Could not read dashboard badge sync preference:", error);
    return CodexUsageWindows.DEFAULT_DASHBOARD_BADGE_WINDOW_SYNC_ENABLED;
  }
}

async function syncDashboardBadgeWindowContextMenu() {
  await PacePetsBackgroundContextMenu.syncDashboardBadgeWindowContextMenu(
    await readDashboardBadgeWindowSyncEnabled(),
  );
}

async function updatePaceBadgeFromHistory({
  clearWhenEmpty = false,
  persistPresentation = true,
  refreshStatus = null,
} = {}) {
  const history = await CodexUsageHistory.readHistory();
  const sample = CodexUsageHistory.latestSample(history);
  if (!sample) {
    await BADGE_PRESENTATION.updateEmptyBadge({ clearWhenEmpty });
    return;
  }

  const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
    sample.windows,
    history,
  );
  const presentationState = CodexRefreshStatus.statusWithPacePresentation(
    refreshStatus || lastRefreshState,
    {
      badgePaceRatio: badgeState.badgePaceRatio,
      badgeWindowKey: badgeState.windowKey,
      pacePresentationAt: badgeState.pacePresentationAt,
      pacePresentationSampleId: sample.id,
      sampleCount: history.samples.length,
    },
  );

  if (!persistPresentation || !presentationState) {
    return;
  }

  lastRefreshState = {
    ...presentationState,
    badgeWindowKey: badgeState.windowKey,
    badgePaceRatio: badgeState.badgePaceRatio,
    pacePresentationAt: badgeState.pacePresentationAt,
    pacePresentationSampleId: sample.id,
  };
  await persistRefreshStatus(lastRefreshState);
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
  const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
    sample.windows,
    history,
  );
  lastRefreshState = CodexRefreshStatus.successState({
    badgePaceRatio: badgeState.badgePaceRatio,
    badgeWindowKey: badgeState.windowKey,
    pacePresentationAt: badgeState.pacePresentationAt,
    pacePresentationSampleId: sample.id,
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
  await BADGE_PRESENTATION.setBadge(
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

function shouldSkipBadgePresentationRefresh(refreshStatus = lastRefreshState) {
  return (
    scheduledRefreshPromise !== null ||
    (refreshStatus?.refreshedAt && refreshStatus.ok === false)
  );
}

async function runBadgePresentationRefresh() {
  const refreshStatus = await CodexUsageHistory.readRefreshStatus().catch(
    () => null,
  );
  if (shouldSkipBadgePresentationRefresh(refreshStatus || lastRefreshState)) {
    return Promise.resolve();
  }

  return updatePaceBadgeFromHistory({ refreshStatus });
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

function storageChangeFlags(changes) {
  return Object.freeze({
    badgeWindowChanged: CodexExtensionStorage.hasChange(
      changes,
      BADGE_WINDOW_STORAGE_KEY,
    ),
    developerOptionsChanged:
      PacePetsDeveloperOptions.hasDeveloperOptionsChange(changes),
    historyChanged: CodexExtensionStorage.hasChange(
      changes,
      HISTORY_STORAGE_KEY,
    ),
    syncPreferenceChanged: CodexExtensionStorage.hasChange(
      changes,
      DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY,
    ),
  });
}

function handleBadgeStorageChange({
  badgeWindowChanged,
  developerOptionsChanged,
  historyChanged,
}) {
  if (!badgeWindowChanged && !historyChanged && !developerOptionsChanged) {
    return;
  }
  updatePaceBadgeFromHistory({
    clearWhenEmpty: historyChanged || developerOptionsChanged,
    persistPresentation: scheduledRefreshPromise === null,
  }).catch((error) => {
    console.warn("Codex usage badge update failed:", error);
  });
}

function syncContextMenusForStorageChange({
  badgeWindowChanged,
  syncPreferenceChanged,
}) {
  if (badgeWindowChanged) {
    syncBadgeContextMenuSelection().catch((error) => {
      console.warn("Codex usage badge menu sync failed:", error);
    });
  }
  if (syncPreferenceChanged) {
    syncDashboardBadgeWindowContextMenu().catch((error) => {
      console.warn("Codex usage badge sync menu update failed:", error);
    });
  }
}

function handleStorageChange(changes, areaName) {
  if (!CodexExtensionStorage.isLocalArea(areaName)) {
    return;
  }
  const flags = storageChangeFlags(changes);
  if (!Object.values(flags).some(Boolean)) {
    return;
  }
  handleBadgeStorageChange(flags);
  syncContextMenusForStorageChange(flags);
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

  if (
    PacePetsBackgroundContextMenu.isSyncDashboardBadgeWindowMenuItem(
      info.menuItemId,
    )
  ) {
    CodexExtensionStorage.setLocal({
      [DASHBOARD_BADGE_WINDOW_SYNC_STORAGE_KEY]: info.checked !== false,
    }).catch((error) => {
      console.warn("Codex usage badge sync update failed:", error);
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

chrome.storage.onChanged.addListener(handleStorageChange);
