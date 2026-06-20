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
    bigBang: "pace-icons/big-bang.png",
    sync: "pace-icons/perfect-sync.png",
    perfectZero: "pace-icons/perfect-zero.png",
    splat: "pace-icons/06-slow-down-splat-transparent.png",
  });
  const PACE_ICON_VARIANT_FILES = Object.freeze({
    perfectZeroGlow: "pace-icons/perfect-zero-glow.png",
    splatFreeFall: "pace-icons/06-slow-down-free-fall-transparent.png",
  });
  const EFFECT_ASSET_FILES = Object.freeze({
    resetExhaustedPerson: "effects/reset-exhausted/exhausted-person.png",
  });
  const CART_SPILL_GROCERY_ICON_FILES = Object.freeze([
    "apple.png",
    "bananas.png",
    "bread.png",
    "butter.png",
    "cereal.png",
    "cheese.png",
    "chips.png",
    "chocolate.png",
    "cleaner.png",
    "coffee.png",
    "biscuit.png",
    "detergent.png",
    "eggs.png",
    "frozen_vegetables.png",
    "jam.png",
    "lettuce.png",
    "milk.png",
    "olive_oil.png",
    "orange.png",
    "paper_towels.png",
    "pasta.png",
    "peanut_butter.png",
    "rice.png",
    "soup.png",
    "tea.png",
    "toilet_paper.png",
    "water.png",
    "yogurt.png",
  ]);
  const PUSH_TANK_OCEAN_ICON_FILES_BY_KEY = Object.freeze({
    blue_tang: "ocean-icons/blue_tang.png",
    clownfish: "ocean-icons/clownfish.png",
    coral: "ocean-icons/coral.png",
    crab: "ocean-icons/crab.png",
    jellyfish: "ocean-icons/jellyfish.png",
    pufferfish: "ocean-icons/pufferfish.png",
    sea_turtle: "ocean-icons/sea_turtle.png",
    sea_urchin: "ocean-icons/sea_urchin.png",
    seahorse: "ocean-icons/seahorse.png",
    seaweed: "ocean-icons/seaweed.png",
    shark: "ocean-icons/shark.png",
    shrimp: "ocean-icons/shrimp.png",
    starfish: "ocean-icons/starfish.png",
    whale: "ocean-icons/whale.png",
    yellow_tang: "ocean-icons/yellow_tang.png",
  });
  const PACE_ICON_STATE_EXCLUSIONS = Object.freeze({
    muted: "No playful image.",
    singularity: "Uses generated in-memory art.",
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

  function effectAssetFile(assetKey) {
    return EFFECT_ASSET_FILES[assetKey] || "";
  }

  function effectAssetPath(assetKey) {
    return themedPath(effectAssetFile(assetKey));
  }

  function cartSpillGroceryIconFile(file) {
    return CART_SPILL_GROCERY_ICON_FILES.includes(file)
      ? `grocery_icons/${file}`
      : "";
  }

  function cartSpillGroceryIconPath(file) {
    return themedPath(cartSpillGroceryIconFile(file));
  }

  function pushTankOceanIconFile(assetKey) {
    return PUSH_TANK_OCEAN_ICON_FILES_BY_KEY[assetKey] || "";
  }

  function pushTankOceanIconPath(assetKey) {
    return themedPath(pushTankOceanIconFile(assetKey));
  }

  function isPackagedPaceIconState(stateKey) {
    return (
      Boolean(stateKey) &&
      !Object.prototype.hasOwnProperty.call(
        PACE_ICON_STATE_EXCLUSIONS,
        stateKey,
      )
    );
  }

  function packagedPaceIconStateKeys(paceStatesByKey) {
    return Object.freeze(
      Object.values(paceStatesByKey || {})
        .map((state) => state?.key || "")
        .filter(isPackagedPaceIconState),
    );
  }

  root.CodexThemeAssets = Object.freeze({
    THEME_ID,
    THEME_BASE_PATH,
    APP_ICON_FILES,
    APP_ICON_FILES_BY_SIZE,
    CART_SPILL_GROCERY_ICON_FILES,
    EFFECT_ASSET_FILES,
    PACE_ICON_FILES,
    PACE_ICON_FILES_BY_STATE,
    PACE_ICON_STATE_EXCLUSIONS,
    PACE_ICON_VARIANT_FILES,
    PUSH_TANK_OCEAN_ICON_FILES_BY_KEY,
    appIconFileForSize,
    appIconPathForSize,
    cartSpillGroceryIconFile,
    cartSpillGroceryIconPath,
    effectAssetFile,
    effectAssetPath,
    isPackagedPaceIconState,
    packagedPaceIconStateKeys,
    paceIconVariantFile,
    paceIconVariantPath,
    paceIconFileForState,
    paceIconPathForState,
    pushTankOceanIconFile,
    pushTankOceanIconPath,
  });
})(globalThis);
