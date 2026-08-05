(function attachCodexUsageHistory(root) {
  "use strict";

  const USAGE_WINDOWS = root.CodexUsageWindows;
  if (!USAGE_WINDOWS) {
    throw new Error(
      "Codex usage window contract must load before history-store.js.",
    );
  }
  const INTEGRATION_CONFIG = root.CodexIntegrationConfig;
  if (!INTEGRATION_CONFIG) {
    throw new Error(
      "Codex integration config must load before history-store.js.",
    );
  }
  const USAGE_PROVIDERS = root.CodexUsageProviders;
  if (!USAGE_PROVIDERS) {
    throw new Error("Codex usage providers must load before history-store.js.");
  }
  const USAGE_VALUES = root.CodexUsageValues;
  if (!USAGE_VALUES) {
    throw new Error(
      "Codex usage value helpers must load before history-store.js.",
    );
  }
  const PERSISTED_TEXT = root.CodexPersistedText;
  if (!PERSISTED_TEXT) {
    throw new Error("Codex persisted text must load before history-store.js.");
  }
  const REFRESH_STATUS = root.CodexRefreshStatus;
  if (!REFRESH_STATUS) {
    throw new Error(
      "Codex refresh status contract must load before history-store.js.",
    );
  }
  const EXTENSION_STORAGE = root.CodexExtensionStorage;
  if (!EXTENSION_STORAGE) {
    throw new Error("Codex storage adapter must load before history-store.js.");
  }

  const HISTORY_STORAGE_KEY = "codexUsageHistory";
  const REFRESH_STATUS_STORAGE_KEY = REFRESH_STATUS.REFRESH_STATUS_STORAGE_KEY;
  const HISTORY_VERSION = 1;
  const DEFAULT_SOURCE_MARKERS =
    USAGE_PROVIDERS.DEFAULT_USAGE_PROVIDER.sourceMarkers;
  const RETENTION_DAYS = 14;
  const MAX_SAMPLES = 500;
  const PLATEAU_SAMPLE_INTERVAL_MINUTES = 30;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const PLATEAU_SAMPLE_INTERVAL_MS =
    PLATEAU_SAMPLE_INTERVAL_MINUTES * 60 * 1000;
  const { dateMs, isoDate, normalizeStoredWindow } = USAGE_VALUES;
  const { safeText } = PERSISTED_TEXT;

  function collectorVersion() {
    return chrome.runtime.getManifest?.().version || "";
  }

  function normalizeStoredWindows(windows) {
    const normalized = {};
    for (const windowKey of USAGE_WINDOWS.WINDOW_KEYS) {
      const windowData = normalizeStoredWindow(windows?.[windowKey]);
      const spec = USAGE_WINDOWS.WINDOW_SPECS[windowKey];
      if (windowData?.windowMinutes === spec.durationMinutes) {
        normalized[windowKey] = windowData;
      }
    }
    return normalized;
  }

  function sampleIdentity(sample) {
    return JSON.stringify({
      windows: sample.windows,
    });
  }

  function samplesChanged(previousSample, nextSample) {
    return sampleIdentity(previousSample) !== sampleIdentity(nextSample);
  }

  function shouldKeepSample(previousSample, nextSample) {
    if (!previousSample) {
      return true;
    }

    if (samplesChanged(previousSample, nextSample)) {
      return true;
    }

    const previousMs = dateMs(previousSample.collectedAt);
    const nextMs = dateMs(nextSample.collectedAt);
    return (
      Number.isFinite(previousMs) &&
      Number.isFinite(nextMs) &&
      nextMs - previousMs >= PLATEAU_SAMPLE_INTERVAL_MS
    );
  }

  function normalizeSample(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const collectedAt = isoDate(value.collectedAt);
    if (!collectedAt) {
      return null;
    }

    const windows = normalizeStoredWindows(value.windows);
    if (!Object.keys(windows).length) {
      return null;
    }

    const sample = {
      id: safeText(value.id, collectedAt),
      collectedAt,
      source: safeText(value.source, DEFAULT_SOURCE_MARKERS.background),
      collectorVersion: safeText(value.collectorVersion, collectorVersion()),
      windows,
    };

    return {
      ...sample,
      id: sample.id || collectedAt,
    };
  }

  function sampleFromUsage(payload, collectedAt = new Date().toISOString()) {
    return normalizeSample({
      id: collectedAt,
      collectedAt,
      source: payload?.source || DEFAULT_SOURCE_MARKERS.background,
      collectorVersion: collectorVersion(),
      windows: payload?.windows,
    });
  }

  function pruneSamples(samples, nowMs = Date.now()) {
    const cutoffMs = nowMs - RETENTION_DAYS * DAY_MS;
    const deduped = new Map();

    for (const sample of samples) {
      const normalized = normalizeSample(sample);
      if (!normalized) {
        continue;
      }

      const collectedMs = dateMs(normalized.collectedAt);
      if (
        !Number.isFinite(collectedMs) ||
        collectedMs < cutoffMs ||
        collectedMs > nowMs
      ) {
        continue;
      }

      deduped.set(normalized.id, normalized);
    }

    const compacted = [];
    for (const sample of [...deduped.values()].sort(
      (a, b) => dateMs(a.collectedAt) - dateMs(b.collectedAt),
    )) {
      if (shouldKeepSample(compacted[compacted.length - 1], sample)) {
        compacted.push(sample);
      }
    }

    return compacted.slice(-MAX_SAMPLES);
  }

  function normalizeHistory(value, nowMs = Date.now()) {
    const samples = Array.isArray(value?.samples)
      ? pruneSamples(value.samples, nowMs)
      : [];
    return {
      historyVersion: HISTORY_VERSION,
      samples,
    };
  }

  const normalizeRefreshStatus = REFRESH_STATUS.normalizeRefreshStatus;

  function historyValuesEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function historySnapshot(items) {
    const hasStoredValue = Object.hasOwn(items || {}, HISTORY_STORAGE_KEY);
    const storedValue = hasStoredValue ? items[HISTORY_STORAGE_KEY] : undefined;
    return {
      hasStoredValue,
      history: normalizeHistory(storedValue),
      storedValue,
    };
  }

  async function persistHistoryChange(snapshot, history) {
    const normalized = normalizeHistory(history);
    if (
      snapshot.hasStoredValue &&
      historyValuesEqual(snapshot.storedValue, normalized)
    ) {
      return normalized;
    }

    await EXTENSION_STORAGE.setLocal({ [HISTORY_STORAGE_KEY]: normalized });
    return normalized;
  }

  async function readHistorySnapshot({ repair = true } = {}) {
    const items = await EXTENSION_STORAGE.getLocal(HISTORY_STORAGE_KEY);
    const snapshot = historySnapshot(items);
    if (
      repair &&
      snapshot.hasStoredValue &&
      !historyValuesEqual(snapshot.storedValue, snapshot.history)
    ) {
      await EXTENSION_STORAGE.setLocal({
        [HISTORY_STORAGE_KEY]: snapshot.history,
      });
    }
    return snapshot;
  }

  async function readHistoryInTransaction() {
    return (await readHistorySnapshot()).history;
  }

  async function writeHistoryInTransaction(history) {
    const snapshot = await readHistorySnapshot({ repair: false });
    return persistHistoryChange(snapshot, history);
  }

  async function readRefreshStatusInTransaction() {
    const items = await EXTENSION_STORAGE.getLocal(REFRESH_STATUS_STORAGE_KEY);
    return normalizeRefreshStatus(items[REFRESH_STATUS_STORAGE_KEY]);
  }

  async function writeRefreshStatusInTransaction(refreshStatus) {
    const normalized = normalizeRefreshStatus(refreshStatus);
    if (!normalized) {
      throw new Error("Refresh status did not include a valid checked time.");
    }

    await EXTENSION_STORAGE.setLocal({
      [REFRESH_STATUS_STORAGE_KEY]: normalized,
    });
    return normalized;
  }

  async function clearUsageDataInTransaction() {
    await EXTENSION_STORAGE.removeLocal([
      HISTORY_STORAGE_KEY,
      REFRESH_STATUS_STORAGE_KEY,
    ]);
    return {
      history: normalizeHistory(null),
      refreshStatus: null,
    };
  }

  async function appendUsageSnapshotInTransaction(
    payload,
    collectedAt = new Date().toISOString(),
  ) {
    const sample = sampleFromUsage(payload, collectedAt);
    if (!sample) {
      throw new Error(
        "Usage payload did not include a supported history sample.",
      );
    }

    const snapshot = await readHistorySnapshot({ repair: false });
    const updatedHistory = await persistHistoryChange(snapshot, {
      historyVersion: HISTORY_VERSION,
      samples: snapshot.history.samples.concat(sample),
    });
    const storedSample = updatedHistory.samples.find(
      (candidate) => candidate.id === sample.id,
    );
    const latestStoredSample = latestSample(updatedHistory);

    return {
      history: updatedHistory,
      sample: storedSample || latestStoredSample || sample,
      stored: Boolean(storedSample),
      checkedAt: sample.collectedAt,
    };
  }

  const USAGE_DATA_TRANSACTION = Object.freeze({
    appendUsageSnapshot: appendUsageSnapshotInTransaction,
    clearUsageData: clearUsageDataInTransaction,
    readHistory: readHistoryInTransaction,
    readRefreshStatus: readRefreshStatusInTransaction,
    writeHistory: writeHistoryInTransaction,
    writeRefreshStatus: writeRefreshStatusInTransaction,
  });

  function runUsageDataTransaction(operation) {
    return EXTENSION_STORAGE.runExclusiveLocalStorageOperation(() =>
      operation(USAGE_DATA_TRANSACTION),
    );
  }

  function readHistory() {
    return runUsageDataTransaction((usageData) => usageData.readHistory());
  }

  function writeHistory(history) {
    return runUsageDataTransaction((usageData) =>
      usageData.writeHistory(history),
    );
  }

  function readRefreshStatus() {
    return runUsageDataTransaction((usageData) =>
      usageData.readRefreshStatus(),
    );
  }

  function writeRefreshStatus(refreshStatus) {
    return runUsageDataTransaction((usageData) =>
      usageData.writeRefreshStatus(refreshStatus),
    );
  }

  function clearUsageData() {
    return runUsageDataTransaction((usageData) => usageData.clearUsageData());
  }

  function appendUsageSnapshot(payload, collectedAt) {
    return runUsageDataTransaction((usageData) =>
      usageData.appendUsageSnapshot(payload, collectedAt),
    );
  }

  function latestSample(history) {
    return history?.samples?.[history.samples.length - 1] || null;
  }

  root.CodexUsageHistory = {
    HISTORY_STORAGE_KEY,
    REFRESH_STATUS_STORAGE_KEY,
    HISTORY_VERSION,
    RETENTION_DAYS,
    MAX_SAMPLES,
    PLATEAU_SAMPLE_INTERVAL_MINUTES,
    appendUsageSnapshot,
    clearUsageData,
    latestSample,
    normalizeHistory,
    normalizeRefreshStatus,
    readHistory,
    readRefreshStatus,
    runUsageDataTransaction,
    writeRefreshStatus,
    writeHistory,
  };
})(globalThis);
