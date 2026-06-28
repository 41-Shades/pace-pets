(function attachPacePetsBackgroundContextMenu(root) {
  "use strict";

  const STORAGE = root.CodexExtensionStorage;
  if (!STORAGE) {
    throw new Error(
      "Extension storage helpers must load before background-context-menu.js.",
    );
  }
  const PRODUCT_METADATA = root.CodexProductMetadata;
  if (!PRODUCT_METADATA) {
    throw new Error(
      "Product metadata must load before background-context-menu.js.",
    );
  }
  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Usage window helpers must load before background-context-menu.js.",
    );
  }

  const OPEN_DASHBOARD_CONTEXT_MENU_ID = "open-dashboard";
  const CHECK_USAGE_NOW_CONTEXT_MENU_ID = "check-usage-now";
  const BADGE_CONTEXT_MENU_SEPARATOR_ID = "badge-window-separator";
  const SYNC_DASHBOARD_BADGE_WINDOW_CONTEXT_MENU_ID =
    "sync-dashboard-badge-window";
  const BADGE_CONTEXT_MENU_ID_PREFIX = "badge-window:";
  const BADGE_CONTEXT_MENU_CONTEXTS = Object.freeze(["action"]);

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
    return USAGE_WINDOWS.isSupportedWindowKey(windowKey) ? windowKey : null;
  }

  function contextMenusAvailable() {
    return Boolean(
      chrome.contextMenus?.create &&
      chrome.contextMenus?.removeAll &&
      chrome.contextMenus?.update,
    );
  }

  function removeAllContextMenus() {
    return STORAGE.callbackWithLastError((done) => {
      chrome.contextMenus.removeAll(done);
    });
  }

  function createContextMenu(properties) {
    return STORAGE.callbackWithLastError((done) => {
      chrome.contextMenus.create(properties, done);
    });
  }

  function updateContextMenu(menuItemId, properties) {
    return STORAGE.callbackWithLastError((done) => {
      chrome.contextMenus.update(menuItemId, properties, done);
    });
  }

  async function createBadgeContextMenus({
    selectedWindowKey,
    syncDashboardBadgeWindow,
  }) {
    if (!contextMenusAvailable()) {
      return;
    }

    await removeAllContextMenus();
    await createContextMenu({
      contexts: BADGE_CONTEXT_MENU_CONTEXTS,
      id: OPEN_DASHBOARD_CONTEXT_MENU_ID,
      title: PRODUCT_METADATA.OPEN_DASHBOARD_MENU_TITLE,
    });
    await createContextMenu({
      contexts: BADGE_CONTEXT_MENU_CONTEXTS,
      id: CHECK_USAGE_NOW_CONTEXT_MENU_ID,
      title: PRODUCT_METADATA.CHECK_USAGE_NOW_MENU_TITLE,
    });
    await createContextMenu({
      contexts: BADGE_CONTEXT_MENU_CONTEXTS,
      id: BADGE_CONTEXT_MENU_SEPARATOR_ID,
      type: "separator",
    });
    await createContextMenu({
      checked: syncDashboardBadgeWindow,
      contexts: BADGE_CONTEXT_MENU_CONTEXTS,
      id: SYNC_DASHBOARD_BADGE_WINDOW_CONTEXT_MENU_ID,
      title: "Sync dashboard and badge",
      type: "checkbox",
    });

    for (const windowKey of USAGE_WINDOWS.WINDOW_KEYS) {
      await createContextMenu({
        checked: windowKey === selectedWindowKey,
        contexts: BADGE_CONTEXT_MENU_CONTEXTS,
        id: badgeContextMenuId(windowKey),
        title: `${USAGE_WINDOWS.WINDOW_SPECS[windowKey].badge} badge`,
        type: "radio",
      });
    }
  }

  async function syncBadgeContextMenuSelection(selectedWindowKey) {
    if (!contextMenusAvailable()) {
      return;
    }

    for (const windowKey of USAGE_WINDOWS.WINDOW_KEYS) {
      await updateContextMenu(badgeContextMenuId(windowKey), {
        checked: windowKey === selectedWindowKey,
      });
    }
  }

  async function syncDashboardBadgeWindowContextMenu(enabled) {
    if (!contextMenusAvailable()) {
      return;
    }

    await updateContextMenu(SYNC_DASHBOARD_BADGE_WINDOW_CONTEXT_MENU_ID, {
      checked: enabled,
    });
  }

  root.PacePetsBackgroundContextMenu = Object.freeze({
    badgeWindowKeyFromContextMenuId,
    createBadgeContextMenus,
    isCheckUsageNowMenuItem: (menuItemId) =>
      menuItemId === CHECK_USAGE_NOW_CONTEXT_MENU_ID,
    isOpenDashboardMenuItem: (menuItemId) =>
      menuItemId === OPEN_DASHBOARD_CONTEXT_MENU_ID,
    isSyncDashboardBadgeWindowMenuItem: (menuItemId) =>
      menuItemId === SYNC_DASHBOARD_BADGE_WINDOW_CONTEXT_MENU_ID,
    syncBadgeContextMenuSelection,
    syncDashboardBadgeWindowContextMenu,
  });
})(globalThis);
