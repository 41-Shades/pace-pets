(function attachCodexProductMetadata(root) {
  "use strict";

  const NAME = "Pace Pets";
  const DASHBOARD_PATH = "dashboard.html";
  const DASHBOARD_DESCRIPTION = "Codex usage, pace, and reset timing.";
  const ACTION_DEFAULT_TITLE = NAME;
  const OPEN_DASHBOARD_MENU_TITLE = `Open ${NAME}`;
  const CHECK_USAGE_NOW_MENU_TITLE = "Check usage now";
  const REFRESH_FAILED_TITLE = `${NAME} - refresh failed`;

  function badgeTitle({ badgeText, label } = {}) {
    return badgeText && label ? `${NAME} - ${label} pace ${badgeText}` : NAME;
  }

  function attentionBadgeTitle({ items } = {}) {
    const text = Array.isArray(items)
      ? items
          .filter((item) => item?.label && item?.paceText && item?.title)
          .map((item) => `${item.label} ${item.title} pace ${item.paceText}`)
          .join("; ")
      : "";

    return text ? `${NAME} - ${text}` : NAME;
  }

  function stateOverrideBadgeTitle({ badgeText, title } = {}) {
    return badgeText && title
      ? `${NAME} - ${title} override ${badgeText}`
      : NAME;
  }

  root.CodexProductMetadata = Object.freeze({
    ACTION_DEFAULT_TITLE,
    CHECK_USAGE_NOW_MENU_TITLE,
    DASHBOARD_DESCRIPTION,
    DASHBOARD_PATH,
    NAME,
    OPEN_DASHBOARD_MENU_TITLE,
    REFRESH_FAILED_TITLE,
    attentionBadgeTitle,
    badgeTitle,
    stateOverrideBadgeTitle,
  });
})(globalThis);
