(() => {
  "use strict";

  const THEME_ASSETS = globalThis.CodexThemeAssets;
  if (!THEME_ASSETS) {
    throw new Error(
      "Codex theme assets must load before dashboard-cart-spill-data.js.",
    );
  }

  const GROCERY_ICON_FILES = Object.freeze([
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
    "cookies.png",
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

  const SPILL_PROFILES = Object.freeze({
    extreme: Object.freeze({
      countRange: Object.freeze([5, 7]),
      delayRangeMs: Object.freeze([300, 460]),
      durationRangeMs: Object.freeze([1500, 2200]),
      endScaleRange: Object.freeze([78, 104]),
      flightTailMs: 1200,
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
      flightTailMs: 900,
      staggerRangeMs: Object.freeze([0, 20]),
      liftRangePx: Object.freeze([35, 80]),
      sizePx: 36,
      spinRangeDeg: Object.freeze([-220, 220]),
      targetXRangePx: Object.freeze([70, 150]),
      targetYRangePx: Object.freeze([-70, 90]),
    }),
  });

  function groceryIconPath(file) {
    return `${THEME_ASSETS.THEME_BASE_PATH}/grocery_icons/${file}`;
  }

  function groceryIcon(file) {
    return Object.freeze({
      key: file.replace(/\.png$/, ""),
      src: groceryIconPath(file),
    });
  }

  globalThis.PacePetsDashboardCartSpillData = Object.freeze({
    ICONS: Object.freeze(GROCERY_ICON_FILES.map(groceryIcon)),
    SPILL_PROFILES,
  });
})();
