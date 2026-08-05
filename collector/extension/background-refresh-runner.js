(function attachPacePetsBackgroundRefreshRunner(root) {
  "use strict";

  const BADGE_PRESENTATION = root.PacePetsBackgroundBadgePresentation;
  const EXTENSION_STORAGE = root.CodexExtensionStorage;
  const PRODUCT_METADATA = root.CodexProductMetadata;
  const HELD_ZERO_STATE = root.PacePetsHeldZeroState;
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
    HELD_ZERO_STATE,
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
  let scheduledRefresh = null;
  let manualRefreshCooldownUntilMs = 0;
  let usageDataGeneration = 0;

  function currentRefreshState() {
    return lastRefreshState;
  }

  function scheduledRefreshActive() {
    return scheduledRefresh?.generation === usageDataGeneration;
  }

  function isCurrentUsageDataGeneration(generation) {
    return generation === usageDataGeneration;
  }

  async function persistRefreshStatus(usageData, refreshState) {
    try {
      await usageData.writeRefreshStatus(refreshState);
    } catch (error) {
      console.warn("Could not store Codex usage refresh status:", error);
    }
  }

  async function priorRefreshStatus(usageData, fallback = lastRefreshState) {
    return (await usageData.readRefreshStatus()) || fallback;
  }

  function evolvedHeldZeroStates(previousStatus, sample, badgeState) {
    return HELD_ZERO_STATE.nextHeldZeroStates(
      previousStatus?.heldZeroStates,
      sample.windows,
      badgeState.presentedStateKeysByWindow,
      badgeState.presentedAtMs,
    );
  }

  async function updatePaceBadgeFromHistory({
    clearWhenEmpty = false,
    persistPresentation = true,
    refreshStatus = null,
  } = {}) {
    return USAGE_HISTORY.runUsageDataTransaction(async (usageData) => {
      const previousStatus = await priorRefreshStatus(
        usageData,
        refreshStatus || lastRefreshState,
      );
      if (previousStatus?.ok === false && previousStatus.refreshedAt) {
        return;
      }

      const history = await usageData.readHistory();
      const sample = USAGE_HISTORY.latestSample(history);
      if (!sample) {
        await BADGE_PRESENTATION.updateEmptyBadge({ clearWhenEmpty });
        return;
      }

      const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
        sample.windows,
        history,
      );
      const presentationState = REFRESH_STATUS.statusWithBadgePresentation(
        previousStatus,
        {
          badgePaceRatio: badgeState.badgePaceRatio,
          badgeWindowKey: badgeState.windowKey,
          heldZeroStates: evolvedHeldZeroStates(
            previousStatus,
            sample,
            badgeState,
          ),
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
      };
      await persistRefreshStatus(usageData, lastRefreshState);
    });
  }

  async function refreshUsage(refreshGeneration) {
    if (!(await USAGE_PERMISSIONS.hasChatGptHostPermission())) {
      throw USAGE_PERMISSIONS.chatGptAccessRequiredError();
    }

    const rawUsage = await USAGE_SOURCE.fetchUsageWithProvider(USAGE_PROVIDER);
    const payload = WEEKLY_USAGE.normalizeUsageWithProvider(
      rawUsage,
      USAGE_PROVIDER,
      { sourceMarkerKey: "background" },
    );
    return USAGE_HISTORY.runUsageDataTransaction(async (usageData) => {
      if (!isCurrentUsageDataGeneration(refreshGeneration)) {
        return lastRefreshState;
      }

      const { history, sample, stored, checkedAt } =
        await usageData.appendUsageSnapshot(payload);
      if (!isCurrentUsageDataGeneration(refreshGeneration)) {
        return lastRefreshState;
      }

      const badgeState = await BADGE_PRESENTATION.updatePaceBadge(
        sample.windows,
        history,
      );
      if (!isCurrentUsageDataGeneration(refreshGeneration)) {
        return lastRefreshState;
      }

      const previousStatus = await priorRefreshStatus(usageData);
      lastRefreshState = REFRESH_STATUS.successState({
        badgePaceRatio: badgeState.badgePaceRatio,
        badgeWindowKey: badgeState.windowKey,
        heldZeroStates: evolvedHeldZeroStates(
          previousStatus,
          sample,
          badgeState,
        ),
        refreshedAt: checkedAt,
        sampleCount: history.samples.length,
        stored,
        windows: sample.windows,
      });
      await persistRefreshStatus(usageData, lastRefreshState);
      return lastRefreshState;
    });
  }

  function recordRefreshFailure(error, refreshGeneration) {
    return USAGE_HISTORY.runUsageDataTransaction(async (usageData) => {
      if (!isCurrentUsageDataGeneration(refreshGeneration)) {
        return lastRefreshState;
      }

      const previousStatus = await priorRefreshStatus(usageData);
      lastRefreshState = REFRESH_STATUS.failureState(error, {
        heldZeroStates: previousStatus?.heldZeroStates,
      });
      await persistRefreshStatus(usageData, lastRefreshState);
      await BADGE_PRESENTATION.setBadge(
        "!",
        "#b42318",
        PRODUCT_METADATA.REFRESH_FAILED_TITLE,
      ).catch(() => {});
      return lastRefreshState;
    });
  }

  function runScheduledRefresh() {
    const refreshGeneration = usageDataGeneration;
    if (scheduledRefresh?.generation === refreshGeneration) {
      return scheduledRefresh.promise;
    }

    const refreshPromise = USAGE_PERMISSIONS.hasChatGptHostPermission()
      .then(async (hasPermission) => {
        if (hasPermission) {
          return refreshUsage(refreshGeneration);
        }
        if (isCurrentUsageDataGeneration(refreshGeneration)) {
          await updatePaceBadgeFromHistory();
        }
        return lastRefreshState;
      })
      .catch((error) => {
        if (!isCurrentUsageDataGeneration(refreshGeneration)) {
          return lastRefreshState;
        }
        console.warn("Codex usage refresh failed:", error);
        return recordRefreshFailure(error, refreshGeneration).catch(() => {});
      })
      .finally(() => {
        if (scheduledRefresh?.promise === refreshPromise) {
          scheduledRefresh = null;
        }
      });

    scheduledRefresh = Object.freeze({
      generation: refreshGeneration,
      promise: refreshPromise,
    });
    return refreshPromise;
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
    const refreshGeneration = usageDataGeneration;
    if (!(await USAGE_PERMISSIONS.hasChatGptHostPermission())) {
      const refreshState = await recordRefreshFailure(
        USAGE_PERMISSIONS.chatGptAccessRequiredError(),
        refreshGeneration,
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

  function runClearUsageData() {
    usageDataGeneration += 1;
    return USAGE_HISTORY.runUsageDataTransaction(async (usageData) => {
      const result = await usageData.clearUsageData();
      lastRefreshState = REFRESH_STATUS.initialState();
      await BADGE_PRESENTATION.updateEmptyBadge({ clearWhenEmpty: true }).catch(
        (error) => {
          console.warn("Could not clear the Pace Pets badge:", error);
        },
      );
      return result;
    });
  }

  root.PacePetsBackgroundRefreshRunner = Object.freeze({
    currentRefreshState,
    runClearUsageData,
    runManualRefresh,
    runScheduledRefresh,
    scheduledRefreshActive,
    updatePaceBadgeFromHistory,
  });
})(globalThis);
