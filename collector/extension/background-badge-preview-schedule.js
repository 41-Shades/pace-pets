(function attachPacePetsBackgroundBadgePreviewSchedule(root) {
  "use strict";

  const STORAGE = root.CodexExtensionStorage;
  if (!STORAGE) {
    throw new Error(
      "Extension storage helpers must load before background-badge-preview-schedule.js.",
    );
  }
  const PREVIEW_CONTROL = root.PacePetsPreviewControl;
  if (!PREVIEW_CONTROL) {
    throw new Error(
      "Pace Pets preview controls must load before background-badge-preview-schedule.js.",
    );
  }

  const BADGE_PREVIEW_EXPIRES_STORAGE_KEY =
    PREVIEW_CONTROL.BADGE_PREVIEW_EXPIRES_STORAGE_KEY;
  const BADGE_PREVIEW_RESTORE_ALARM =
    PREVIEW_CONTROL.BADGE_PREVIEW_RESTORE_ALARM;

  function createAlarm(alarmName, alarmInfo) {
    return STORAGE.callbackWithLastError((done) => {
      chrome.alarms.create(alarmName, alarmInfo, done);
    });
  }

  function clearAlarm(alarmName) {
    return STORAGE.callbackWithLastError((done) => {
      chrome.alarms.clear(alarmName, done);
    });
  }

  async function readExpiresAtMs() {
    const items = await STORAGE.getLocal(BADGE_PREVIEW_EXPIRES_STORAGE_KEY);
    return PREVIEW_CONTROL.normalizeBadgePreviewExpiresAtMs(
      items?.[BADGE_PREVIEW_EXPIRES_STORAGE_KEY],
    );
  }

  async function scheduleRestore() {
    const expiresAtMs = PREVIEW_CONTROL.badgePreviewExpiresAtMs();
    await STORAGE.setLocal({
      [BADGE_PREVIEW_EXPIRES_STORAGE_KEY]: expiresAtMs,
    });
    await createAlarm(BADGE_PREVIEW_RESTORE_ALARM, { when: expiresAtMs });
  }

  async function clearRestore() {
    await Promise.all([
      clearAlarm(BADGE_PREVIEW_RESTORE_ALARM),
      STORAGE.removeLocal(BADGE_PREVIEW_EXPIRES_STORAGE_KEY),
    ]);
  }

  root.PacePetsBackgroundBadgePreviewSchedule = Object.freeze({
    RESTORE_ALARM: BADGE_PREVIEW_RESTORE_ALARM,
    clearRestore,
    createAlarm,
    readExpiresAtMs,
    scheduleRestore,
  });
})(globalThis);
