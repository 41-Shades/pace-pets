(function attachPacePetsLogicWindowHistory(root) {
  "use strict";

  const LOGIC = root.PacePetsLogic;
  if (!LOGIC) {
    throw new Error("Pace logic must load before pace-window-history.js.");
  }

  function usageZeroedBeforeFinalTimeBand(windowData, atMs) {
    const remainingDisplayPercent = LOGIC.roundedDisplayPercent(
      windowData?.remainingPercent,
    );
    const timeDisplayPercent = LOGIC.roundedDisplayPercent(
      LOGIC.timeRemainingPercentAt(windowData, atMs),
    );
    return (
      remainingDisplayPercent === 0 &&
      timeDisplayPercent !== null &&
      timeDisplayPercent > 0
    );
  }

  function resetWindowBounds(windowData) {
    const min = LOGIC.windowStartMs(windowData);
    const max = LOGIC.dateMs(windowData?.resetsAt);
    if (min === null || max === null || min >= max) {
      return null;
    }
    return { min, max };
  }

  function resetWindowSamples(history, windowKey, windowData) {
    const bounds = resetWindowBounds(windowData);
    if (!bounds || !Array.isArray(history?.samples)) {
      return [];
    }

    return history.samples
      .filter((sample) => {
        const collectedMs = LOGIC.dateMs(sample?.collectedAt);
        return (
          sample?.windows?.[windowKey] &&
          collectedMs !== null &&
          collectedMs >= bounds.min &&
          collectedMs <= bounds.max
        );
      })
      .sort(
        (a, b) => LOGIC.dateMs(a.collectedAt) - LOGIC.dateMs(b.collectedAt),
      );
  }

  function allowsPerfectZeroForWindow(history, windowKey, windowData) {
    return !resetWindowSamples(history, windowKey, windowData).some(
      (sample) => {
        const collectedMs = LOGIC.dateMs(sample.collectedAt);
        return (
          collectedMs !== null &&
          usageZeroedBeforeFinalTimeBand(sample.windows[windowKey], collectedMs)
        );
      },
    );
  }

  Object.assign(LOGIC, {
    allowsPerfectZeroForWindow,
    resetWindowBounds,
    resetWindowSamples,
    usageZeroedBeforeFinalTimeBand,
  });
})(globalThis);
