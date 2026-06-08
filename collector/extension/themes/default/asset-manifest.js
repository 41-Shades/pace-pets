(function attachCodexThemeAssets(root) {
  "use strict";

  const THEME_ID = "default";
  const THEME_BASE_PATH = "./themes/default";

  const APP_ICON_FILES_BY_SIZE = Object.freeze({
    16: "app-icons/icon16.png",
    32: "app-icons/icon32.png",
    48: "app-icons/icon48.png",
    128: "app-icons/icon128.png",
  });

  const PACE_ICON_FILES_BY_STATE = Object.freeze({
    wellAhead: "pace-icons/sprint-faster.png",
    strongAhead: "pace-icons/push-harder.png",
    ahead: "pace-icons/pick-up-speed.png",
    on: "pace-icons/keep-pace.png",
    behind: "pace-icons/ease-up.png",
    wellBehind: "pace-icons/slow-down-shopping-cart.png",
    criticalBehind: "pace-icons/brake-hard.png",
    sync: "pace-icons/perfect-sync.png",
    perfectZero: "pace-icons/perfect-zero.png",
  });
  const PACE_ICON_VARIANT_FILES = Object.freeze({
    perfectZeroGlow: "pace-icons/perfect-zero-glow.png",
  });

  const APP_ICON_FILES = Object.freeze(Object.values(APP_ICON_FILES_BY_SIZE));
  const PACE_ICON_FILES = Object.freeze(
    Object.values(PACE_ICON_FILES_BY_STATE),
  );

  function themedPath(relativePath) {
    return relativePath ? `${THEME_BASE_PATH}/${relativePath}` : "";
  }

  function appIconFileForSize(size) {
    return APP_ICON_FILES_BY_SIZE[String(size)] || "";
  }

  function appIconPathForSize(size) {
    return themedPath(appIconFileForSize(size));
  }

  function paceIconFileForState(stateKey) {
    return PACE_ICON_FILES_BY_STATE[stateKey] || "";
  }

  function paceIconPathForState(stateKey) {
    return themedPath(paceIconFileForState(stateKey));
  }

  function paceIconVariantFile(variantKey) {
    return PACE_ICON_VARIANT_FILES[variantKey] || "";
  }

  function paceIconVariantPath(variantKey) {
    return themedPath(paceIconVariantFile(variantKey));
  }

  root.CodexThemeAssets = Object.freeze({
    THEME_ID,
    THEME_BASE_PATH,
    APP_ICON_FILES,
    APP_ICON_FILES_BY_SIZE,
    PACE_ICON_FILES,
    PACE_ICON_FILES_BY_STATE,
    PACE_ICON_VARIANT_FILES,
    appIconFileForSize,
    appIconPathForSize,
    paceIconVariantFile,
    paceIconVariantPath,
    paceIconFileForState,
    paceIconPathForState,
  });
})(globalThis);
