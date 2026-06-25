(function attachPacePetsBackgroundBadgePresentation(root) {
  "use strict";

  const PRODUCT_METADATA = root.CodexProductMetadata;
  const USAGE_WINDOWS = root.CodexUsageWindows;
  const EXTENSION_STORAGE = root.CodexExtensionStorage;
  const BACKGROUND_LOGIC = root.PacePetsBackgroundLogic;
  const DEVELOPER_OPTIONS = root.PacePetsDeveloperOptions;
  const PACE_LOGIC = root.PacePetsLogic;
  const PREVIEW_CONTROL = root.PacePetsPreviewControl;
  if (
    !PRODUCT_METADATA ||
    !USAGE_WINDOWS ||
    !EXTENSION_STORAGE ||
    !BACKGROUND_LOGIC ||
    !DEVELOPER_OPTIONS ||
    !PACE_LOGIC ||
    !PREVIEW_CONTROL
  ) {
    throw new Error(
      "Background badge dependencies must load before background-badge-presentation.js.",
    );
  }

  const BADGE_WINDOW_STORAGE_KEY = USAGE_WINDOWS.BADGE_WINDOW_STORAGE_KEY;
  const DEVELOPER_OPTIONS_STORAGE_KEY = DEVELOPER_OPTIONS.STORAGE_KEY;

  async function setBadge(
    text,
    color,
    title = PRODUCT_METADATA.ACTION_DEFAULT_TITLE,
  ) {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setTitle({ title });
  }

  async function selectedBadgeWindowKey() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(BADGE_WINDOW_STORAGE_KEY);
      return BACKGROUND_LOGIC.selectedBadgeWindowKeyFromItems(
        items,
        BADGE_WINDOW_STORAGE_KEY,
      );
    } catch (error) {
      console.warn("Could not read badge window preference:", error);
      return BACKGROUND_LOGIC.DEFAULT_BADGE_WINDOW_KEY;
    }
  }

  async function readDeveloperOptions() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(
        DEVELOPER_OPTIONS_STORAGE_KEY,
      );
      return DEVELOPER_OPTIONS.developerOptionsFromStorageItems(items);
    } catch (error) {
      console.warn("Could not read developer options:", error);
      return DEVELOPER_OPTIONS.normalizeDeveloperOptions(null);
    }
  }

  function forcedBadgeState(developerOptions) {
    return PREVIEW_CONTROL.forcedBadgeState(
      developerOptions.forcedPaceStateKey,
      {
        sprintIntensityPreview: developerOptions.sprintIntensityPreview,
      },
    );
  }

  async function updatePaceBadge(windows, history = null, atMs = Date.now()) {
    const developerOptions = await readDeveloperOptions();
    const preferredWindowKey = await selectedBadgeWindowKey();
    const badgeDisplay = BACKGROUND_LOGIC.badgeDisplayForWindows({
      atMs,
      criticalBadgeWindow: developerOptions.criticalBadgeWindow,
      forcedBadgeState: forcedBadgeState(developerOptions),
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
      pacePresentationAt: new Date(atMs).toISOString(),
      windowKey: badgeDisplay.windowKey,
    };
  }

  async function updateEmptyBadge({ clearWhenEmpty = false } = {}) {
    const developerOptions = await readDeveloperOptions();
    if (developerOptions.criticalBadgeWindow) {
      await updatePaceBadge({});
      return;
    }

    const forcedState = forcedBadgeState(developerOptions);
    if (forcedState) {
      await setBadge(
        forcedState.badgeText,
        forcedState.badgeColor,
        PRODUCT_METADATA.stateOverrideBadgeTitle({
          badgeText: forcedState.badgeText,
          title: forcedState.state.title,
        }),
      );
      return;
    }

    if (clearWhenEmpty) {
      await setBadge(
        "",
        PACE_LOGIC.DEFAULT_BADGE_COLORS.muted,
        PRODUCT_METADATA.ACTION_DEFAULT_TITLE,
      );
    }
  }

  root.PacePetsBackgroundBadgePresentation = Object.freeze({
    selectedBadgeWindowKey,
    setBadge,
    updateEmptyBadge,
    updatePaceBadge,
  });
})(globalThis);
