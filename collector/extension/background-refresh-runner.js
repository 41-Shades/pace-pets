(function attachPacePetsBackgroundRefreshRunner(root) {
  "use strict";

  const BADGE_PRESENTATION = root.PacePetsBackgroundBadgePresentation;
  const EXTENSION_STORAGE = root.CodexExtensionStorage;
  const PRODUCT_METADATA = root.CodexProductMetadata;
  const REFRESH_CONTROL = root.PacePetsRefreshControl;
  const REFRESH_STATUS = root.CodexRefreshStatus;
  const USAGE_HISTORY = root.CodexUsageHistory;
  const USAGE_PERMISSIONS = root.PacePetsUsagePermissions;
  const USAGE_PROVIDER = root.CodexWeeklyUsage?.DEFAULT_USAGE_PROVIDER;
  const USAGE_SOURCE = root.PacePetsBackgroundUsageSource;
  const WEEKLY_USAGE = root.CodexWeeklyUsage;
  const REQUIRED_DEPENDENCIES = Object.freeze([
    BADGE_PRESENTATION,
    EXTENSION_STORAGE,
    PRODUCT_METADATA,
    REFRESH_CONTROL,
    REFRESH_STATUS,
    USAGE_HISTORY,
    USAGE_PERMISSIONS,
    USAGE_PROVIDER,
    USAGE_SOURCE,
    WEEKLY_USAGE,
  ]);
  if (!REQUIRED_DEPENDENCIES.every(Boolean)) {
    throw new Error(
      "Pace Pets refresh dependencies must load before background-refresh-runner.js.",
    );
  }

  const MANUAL_REFRESH_COOLDOWN_STORAGE_KEY =
    REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_STORAGE_KEY;
  let lastRefreshState = REFRESH_STATUS.initialState();
  let scheduledRefreshPromise = null;
  let manualRefreshCooldownUntilMs = 0;

  function currentRefreshState() {
    return lastRefreshState;
  }

  function scheduledRefreshActive() {
    return scheduledRefreshPromise !== null;
  }

  async function persistRefreshStatus(refreshState) {
    try {
      await USAGE_HISTORY.writeRefreshStatus(refreshState);
    } catch (error) {
      console.warn("Could not store Codex usage refresh status:", error);
    }
  }

  async function updatePaceBadgeFromHistory({
    clearWhenEmpty = false,
    persistPresentation = true,
    refreshStatus = null,
  } = {}) {
    const history = await USAGE_HISTORY.readHistory();
    const sample = USAGE_HISTORY.latestSample(history);
    if (!sample) {
      await BADGE_PRESENTATION.updateEmptyBadge({ clearWhenEmpty });
      return;
    }

    const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
      sample.windows,
      history,
    );
    const presentationState = REFRESH_STATUS.statusWithPacePresentation(
      refreshStatus || lastRefreshState,
      {
        badgePaceRatio: badgeState.badgePaceRatio,
        badgeWindowKey: badgeState.windowKey,
        pacePresentationAt: badgeState.pacePresentationAt,
        pacePresentationSampleId: sample.id,
        sampleCount: history.samples.length,
      },
    );

    if (!persistPresentation || !presentationState) {
      return;
    }

    lastRefreshState = {
      ...presentationState,
      badgeWindowKey: badgeState.windowKey,
      badgePaceRatio: badgeState.badgePaceRatio,
      pacePresentationAt: badgeState.pacePresentationAt,
      pacePresentationSampleId: sample.id,
    };
    await persistRefreshStatus(lastRefreshState);
  }

  async function refreshUsage() {
    if (!(await USAGE_PERMISSIONS.hasChatGptHostPermission())) {
      throw USAGE_PERMISSIONS.chatGptAccessRequiredError();
    }

    const rawUsage = await USAGE_SOURCE.fetchUsageWithProvider(USAGE_PROVIDER);
    const payload = WEEKLY_USAGE.normalizeUsageWithProvider(
      rawUsage,
      USAGE_PROVIDER,
      { sourceMarkerKey: "background" },
    );
    const { history, sample, stored, checkedAt } =
      await USAGE_HISTORY.appendUsageSnapshot(payload);
    const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
      sample.windows,
      history,
    );
    lastRefreshState = REFRESH_STATUS.successState({
      badgePaceRatio: badgeState.badgePaceRatio,
      badgeWindowKey: badgeState.windowKey,
      pacePresentationAt: badgeState.pacePresentationAt,
      pacePresentationSampleId: sample.id,
      refreshedAt: checkedAt,
      sampleCount: history.samples.length,
      stored,
      windows: sample.windows,
    });
    await persistRefreshStatus(lastRefreshState);
    return lastRefreshState;
  }

  async function recordRefreshFailure(error) {
    lastRefreshState = REFRESH_STATUS.failureState(error);
    await persistRefreshStatus(lastRefreshState);
    await BADGE_PRESENTATION.setBadge(
      "!",
      "#b42318",
      PRODUCT_METADATA.REFRESH_FAILED_TITLE,
    ).catch(() => {});
    return lastRefreshState;
  }

  function runScheduledRefresh() {
    if (scheduledRefreshPromise) {
      return scheduledRefreshPromise;
    }

    scheduledRefreshPromise = USAGE_PERMISSIONS.hasChatGptHostPermission()
      .then((hasPermission) =>
        hasPermission ? refreshUsage() : lastRefreshState,
      )
      .catch((error) => {
        console.warn("Codex usage refresh failed:", error);
        return recordRefreshFailure(error).catch(() => {});
      })
      .finally(() => {
        scheduledRefreshPromise = null;
      });

    return scheduledRefreshPromise;
  }

  async function readManualRefreshCooldownUntilMs() {
    try {
      const items = await EXTENSION_STORAGE.getLocal(
        MANUAL_REFRESH_COOLDOWN_STORAGE_KEY,
      );
      return REFRESH_CONTROL.manualRefreshCooldownUntilMs(
        items[MANUAL_REFRESH_COOLDOWN_STORAGE_KEY],
      );
    } catch (error) {
      console.warn(
        "Could not read Codex usage manual refresh cooldown:",
        error,
      );
      return manualRefreshCooldownUntilMs;
    }
  }

  async function persistManualRefreshCooldownUntilMs(cooldownUntilMs) {
    manualRefreshCooldownUntilMs =
      REFRESH_CONTROL.manualRefreshCooldownUntilMs(cooldownUntilMs);
    const storedValue = REFRESH_CONTROL.manualRefreshCooldownStorageValue(
      manualRefreshCooldownUntilMs,
    );

    try {
      if (storedValue) {
        await EXTENSION_STORAGE.setLocal({
          [MANUAL_REFRESH_COOLDOWN_STORAGE_KEY]: storedValue,
        });
        return;
      }

      await EXTENSION_STORAGE.removeLocal(MANUAL_REFRESH_COOLDOWN_STORAGE_KEY);
    } catch (error) {
      console.warn(
        "Could not store Codex usage manual refresh cooldown:",
        error,
      );
    }
  }

  async function manualRefreshCooldownRemainingMs() {
    manualRefreshCooldownUntilMs = Math.max(
      manualRefreshCooldownUntilMs,
      await readManualRefreshCooldownUntilMs(),
    );
    return REFRESH_CONTROL.cooldownRemainingMs(manualRefreshCooldownUntilMs);
  }

  async function runManualRefresh() {
    if (!(await USAGE_PERMISSIONS.hasChatGptHostPermission())) {
      const refreshState = await recordRefreshFailure(
        USAGE_PERMISSIONS.chatGptAccessRequiredError(),
      );
      return REFRESH_CONTROL.refreshNowResponse(refreshState);
    }

    const remainingMs = await manualRefreshCooldownRemainingMs();
    if (remainingMs > 0) {
      return REFRESH_CONTROL.manualRefreshCooldownResponse(
        lastRefreshState,
        remainingMs,
      );
    }

    await persistManualRefreshCooldownUntilMs(
      Date.now() + REFRESH_CONTROL.MANUAL_REFRESH_COOLDOWN_MS,
    );
    return runScheduledRefresh().then(REFRESH_CONTROL.refreshNowResponse);
  }

  root.PacePetsBackgroundRefreshRunner = Object.freeze({
    currentRefreshState,
    runManualRefresh,
    runScheduledRefresh,
    scheduledRefreshActive,
    updatePaceBadgeFromHistory,
  });
})(globalThis);
