(() => {
  "use strict";

  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error(
      "Codex theme assets must load before dashboard-cart-spill-data.js.",
    );
  }

  const SPILL_PROFILES = Object.freeze({
    extreme: Object.freeze({
      countRange: Object.freeze([5, 7]),
      delayRangeMs: Object.freeze([300, 460]),
      durationRangeMs: Object.freeze([1800, 2450]),
      endScaleRange: Object.freeze([78, 104]),
      flightTailMs: 2300,
      staggerRangeMs: Object.freeze([0, 90]),
      liftRangePx: Object.freeze([120, 240]),
      sizePx: 36,
      spinRangeDeg: Object.freeze([-920, 920]),
      targetXRangePx: Object.freeze([220, 420]),
      targetYRangePx: Object.freeze([-280, 240]),
    }),
    normal: Object.freeze({
      countRange: Object.freeze([1, 3]),
      delayRangeMs: Object.freeze([350, 430]),
      durationRangeMs: Object.freeze([1450, 1900]),
      endScaleRange: Object.freeze([92, 108]),
      flightTailMs: 1900,
      staggerRangeMs: Object.freeze([0, 20]),
      liftRangePx: Object.freeze([35, 80]),
      sizePx: 36,
      spinRangeDeg: Object.freeze([-220, 220]),
      targetXRangePx: Object.freeze([70, 150]),
      targetYRangePx: Object.freeze([-70, 90]),
    }),
  });

  function groceryIcon(file) {
    return Object.freeze({
      key: file.replace(/\.png$/, ""),
      src: THEME_ASSETS.cartSpillGroceryIconPath(file),
    });
  }

  globalThis.PacePetsDashboardCartSpillData = Object.freeze({
    ICONS: Object.freeze(
      THEME_ASSETS.CART_SPILL_GROCERY_ICON_FILES.map(groceryIcon),
    ),
    SPILL_PROFILES,
  });
})();
