(() => {
  "use strict";

  const RATIO_RANGE = Object.freeze([1.55, 7]);
  const PREVIEW_RATIOS = Object.freeze([1.55, 2, 3, 4, 5, 6, 7]);

  function boundedIntensity(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue)
      ? Math.max(0, Math.min(1, numericValue))
      : null;
  }

  function ratioForIntensity(value) {
    const intensity = boundedIntensity(value);
    if (intensity === null) {
      return null;
    }

    const [floorRatio, capRatio] = RATIO_RANGE;
    return floorRatio + (capRatio - floorRatio) * intensity;
  }

  function intensityForRatio(paceRatio) {
    const numericRatio = Number(paceRatio);
    if (!Number.isFinite(numericRatio)) {
      return 0;
    }

    const [floorRatio, capRatio] = RATIO_RANGE;
    if (capRatio <= floorRatio) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(1, (numericRatio - floorRatio) / (capRatio - floorRatio)),
    );
  }

  function ratioString(value) {
    return Number(value).toFixed(2);
  }

  function previewOption(ratio) {
    const formattedRatio = ratioString(ratio);
    return Object.freeze({
      intensity: intensityForRatio(ratio),
      label: `Pace ${formattedRatio}`,
      ratio,
      status: `Sprint faster intensity preview selected: ${formattedRatio}.`,
      value: formattedRatio,
    });
  }

  const PREVIEW_OPTIONS = Object.freeze(PREVIEW_RATIOS.map(previewOption));
  const PREVIEW_VALUES = Object.freeze(
    PREVIEW_OPTIONS.map((option) => option.value),
  );
  const PREVIEW_OPTIONS_BY_VALUE = Object.freeze(
    Object.fromEntries(PREVIEW_OPTIONS.map((option) => [option.value, option])),
  );

  function normalizePreviewValue(value) {
    return PREVIEW_OPTIONS_BY_VALUE[value]?.value || null;
  }

  function previewOptionForValue(value) {
    return PREVIEW_OPTIONS_BY_VALUE[normalizePreviewValue(value)] || null;
  }

  function previewRatioForValue(value) {
    return previewOptionForValue(value)?.ratio ?? null;
  }

  globalThis.PacePetsSprintIntensity = Object.freeze({
    PREVIEW_OPTIONS,
    PREVIEW_OPTIONS_BY_VALUE,
    PREVIEW_VALUES,
    PREVIEW_RATIOS,
    RATIO_RANGE,
    boundedIntensity,
    intensityForRatio,
    normalizePreviewValue,
    previewOptionForValue,
    previewRatioForValue,
    ratioForIntensity,
  });
})();
