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
  const BADGE_CONTEXT_MENU_SEPARATOR_ID = "badge-window-separator";
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

  async function createBadgeContextMenus(selectedWindowKey) {
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
      id: BADGE_CONTEXT_MENU_SEPARATOR_ID,
      type: "separator",
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

  root.PacePetsBackgroundContextMenu = Object.freeze({
    badgeWindowKeyFromContextMenuId,
    createBadgeContextMenus,
    isOpenDashboardMenuItem: (menuItemId) =>
      menuItemId === OPEN_DASHBOARD_CONTEXT_MENU_ID,
    syncBadgeContextMenuSelection,
  });
})(globalThis);
