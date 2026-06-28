((root) => {
  "use strict";

  const USAGE_REFRESH_ALARM_NAME = "refresh-codex-weekly-usage";
  const BADGE_PRESENTATION_ALARM_NAME = "refresh-pace-badge-presentation";
  const USAGE_REFRESH_INITIAL_DELAY_MINUTES = 1;
  const USAGE_REFRESH_PERIOD_MINUTES = 5;
  const BADGE_PRESENTATION_PERIOD_MINUTES = 1;
  const TRANSITION_USAGE_REFRESH_PERIOD_MINUTES = 1;
  const TRANSITION_USAGE_REMAINING_PERCENT = 2;
  const TRANSITION_TIME_REMAINING_DISPLAY_PERCENT = 0;

  const ALARMS = Object.freeze({
    badgePresentation: Object.freeze({
      delayInMinutes: BADGE_PRESENTATION_PERIOD_MINUTES,
      name: BADGE_PRESENTATION_ALARM_NAME,
      periodInMinutes: BADGE_PRESENTATION_PERIOD_MINUTES,
    }),
    usageRefresh: Object.freeze({
      delayInMinutes: USAGE_REFRESH_INITIAL_DELAY_MINUTES,
      name: USAGE_REFRESH_ALARM_NAME,
      periodInMinutes: USAGE_REFRESH_PERIOD_MINUTES,
    }),
  });

  function alarmCreateOptions(alarm) {
    return Object.freeze({
      delayInMinutes: alarm.delayInMinutes,
      periodInMinutes: alarm.periodInMinutes,
    });
  }

  function compactMinutesLabel(minutes) {
    return `${minutes}m`;
  }

  function minutesLabel(minutes) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  root.PacePetsRefreshSchedule = Object.freeze({
    ALARMS,
    AUTO_CHECKS_STATUS_TOOLTIP: `Auto-checks every ${compactMinutesLabel(
      USAGE_REFRESH_PERIOD_MINUTES,
    )}; ${compactMinutesLabel(
      TRANSITION_USAGE_REFRESH_PERIOD_MINUTES,
    )} near transitions`,
    BADGE_PRESENTATION_ALARM_NAME,
    BADGE_PRESENTATION_PERIOD_MINUTES,
    CHECKS_EVERY_ARIA: `Checks every ${minutesLabel(
      USAGE_REFRESH_PERIOD_MINUTES,
    )}, or every ${minutesLabel(
      TRANSITION_USAGE_REFRESH_PERIOD_MINUTES,
    )} near usage and reset transitions.`,
    TRANSITION_TIME_REMAINING_DISPLAY_PERCENT,
    TRANSITION_USAGE_REFRESH_PERIOD_MINUTES,
    TRANSITION_USAGE_REMAINING_PERCENT,
    USAGE_REFRESH_ALARM_NAME,
    USAGE_REFRESH_INITIAL_DELAY_MINUTES,
    USAGE_REFRESH_PERIOD_MINUTES,
    alarmCreateOptions,
  });
})(globalThis);
