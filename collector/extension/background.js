importScripts("runtime-manifest.js");
importScripts(...CodexExtensionRuntime.BACKGROUND_SCRIPT_SOURCES);

const DASHBOARD_PATH = CodexProductMetadata.DASHBOARD_PATH;
const BADGE_WINDOW_STORAGE_KEY = CodexUsageWindows.BADGE_WINDOW_STORAGE_KEY;
const BADGE_PRESENTATION = PacePetsBackgroundBadgePresentation;
const HISTORY_STORAGE_KEY = CodexUsageHistory.HISTORY_STORAGE_KEY;
const REFRESH_RUNNER = PacePetsBackgroundRefreshRunner;

async function createBadgeContextMenus() {
  const selectedWindowKey = await BADGE_PRESENTATION.selectedBadgeWindowKey();
  await PacePetsBackgroundContextMenu.createBadgeContextMenus({
    selectedWindowKey,
  });
}

async function syncBadgeContextMenuSelection() {
  await PacePetsBackgroundContextMenu.syncBadgeContextMenuSelection(
    await BADGE_PRESENTATION.selectedBadgeWindowKey(),
  );
}

async function runBadgePresentationRefresh() {
  return PacePetsBackgroundTransitionRefresh.run({
    lastRefreshState: REFRESH_RUNNER.currentRefreshState(),
    readHistory: CodexUsageHistory.readHistory,
    readRefreshStatus: CodexUsageHistory.readRefreshStatus,
    runScheduledRefresh: REFRESH_RUNNER.runScheduledRefresh,
    scheduledRefreshActive: REFRESH_RUNNER.scheduledRefreshActive,
    updatePaceBadgeFromHistory: REFRESH_RUNNER.updatePaceBadgeFromHistory,
  });
}

async function runContextMenuRefresh() {
  const response = await REFRESH_RUNNER.runManualRefresh();
  const responseMessage = response?.message || response?.refreshStatus?.message;
  if (
    responseMessage === PacePetsUsagePermissions.CHATGPT_ACCESS_REQUIRED_MESSAGE
  ) {
    openDashboard();
  }
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
  REFRESH_RUNNER.updatePaceBadgeFromHistory({
    clearWhenEmpty: historyChanged || developerOptionsChanged,
    persistPresentation: !REFRESH_RUNNER.scheduledRefreshActive(),
  }).catch((error) => {
    console.warn("Codex usage badge update failed:", error);
  });
}

function syncContextMenusForStorageChange({ badgeWindowChanged }) {
  if (badgeWindowChanged) {
    syncBadgeContextMenuSelection().catch((error) => {
      console.warn("Codex usage badge menu sync failed:", error);
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
    REFRESH_RUNNER.runManualRefresh()
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
    runContextMenuRefresh().catch((error) => {
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
    REFRESH_RUNNER.runScheduledRefresh();
    return;
  }

  if (alarm.name === PacePetsRefreshSchedule.BADGE_PRESENTATION_ALARM_NAME) {
    runBadgePresentationRefresh().catch((error) => {
      console.warn("Codex usage badge presentation update failed:", error);
    });
  }
});

chrome.storage.onChanged.addListener(handleStorageChange);
