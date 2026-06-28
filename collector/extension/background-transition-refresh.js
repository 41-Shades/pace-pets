(function attachPacePetsBackgroundTransitionRefresh(root) {
  "use strict";

  const PACE_LOGIC = root.PacePetsLogic;
  const REFRESH_SCHEDULE = root.PacePetsRefreshSchedule;
  if (!PACE_LOGIC || !REFRESH_SCHEDULE) {
    throw new Error(
      "Pace logic and refresh schedule must load before background-transition-refresh.js.",
    );
  }

  const MS_PER_MINUTE = 60 * 1000;
  const TRANSITION_REFRESH_INTERVAL_MS =
    REFRESH_SCHEDULE.TRANSITION_USAGE_REFRESH_PERIOD_MINUTES * MS_PER_MINUTE;
  const TRANSITION_USAGE_REMAINING_PERCENT =
    REFRESH_SCHEDULE.TRANSITION_USAGE_REMAINING_PERCENT;

  function hasResetTiming(windowData) {
    return (
      PACE_LOGIC.dateMs(windowData?.resetsAt) !== null &&
      PACE_LOGIC.windowStartMs(windowData) !== null
    );
  }

  function isTransitionWatchWindow(windowData) {
    const remainingPercent = PACE_LOGIC.boundedPercent(
      windowData?.remainingPercent,
    );
    return (
      hasResetTiming(windowData) &&
      remainingPercent !== null &&
      remainingPercent <= TRANSITION_USAGE_REMAINING_PERCENT
    );
  }

  function transitionWatchWindowKeys(windows) {
    return Object.entries(windows || {})
      .filter((entry) => isTransitionWatchWindow(entry[1]))
      .map((entry) => entry[0]);
  }

  function transitionRefreshDue(refreshStatus, atMs = Date.now()) {
    if (refreshStatus?.ok === false) {
      return false;
    }

    const refreshedMs = PACE_LOGIC.dateMs(refreshStatus?.refreshedAt);
    return (
      refreshedMs === null ||
      atMs - refreshedMs >= TRANSITION_REFRESH_INTERVAL_MS
    );
  }

  function shouldRunTransitionRefresh({
    atMs = Date.now(),
    refreshStatus = null,
    windows = null,
  } = {}) {
    return (
      transitionRefreshDue(refreshStatus, atMs) &&
      transitionWatchWindowKeys(windows).length > 0
    );
  }

  function latestSample(history) {
    return history?.samples?.[history.samples.length - 1] || null;
  }

  async function run({
    lastRefreshState,
    readHistory,
    readRefreshStatus,
    runScheduledRefresh,
    scheduledRefreshActive,
    updatePaceBadgeFromHistory,
  }) {
    const refreshStatus = await readRefreshStatus().catch(() => null);
    const effectiveRefreshStatus = refreshStatus || lastRefreshState;
    if (scheduledRefreshActive()) {
      return Promise.resolve();
    }

    const history = await readHistory();
    if (
      shouldRunTransitionRefresh({
        refreshStatus: effectiveRefreshStatus,
        windows: latestSample(history)?.windows,
      })
    ) {
      return runScheduledRefresh();
    }

    if (
      effectiveRefreshStatus?.refreshedAt &&
      effectiveRefreshStatus.ok === false
    ) {
      return Promise.resolve();
    }

    return updatePaceBadgeFromHistory({ refreshStatus });
  }

  root.PacePetsBackgroundTransitionRefresh = Object.freeze({
    isTransitionWatchWindow,
    run,
    shouldRunTransitionRefresh,
    transitionRefreshDue,
    transitionWatchWindowKeys,
  });
})(globalThis);
