(() => {
  "use strict";

  const DEVELOPER_OPTIONS = globalThis.PacePetsDeveloperOptions;
  const PACE_STATE_DATA = globalThis.PacePetsPaceStateData;
  const PREVIEW_ACTION_REGISTRY = globalThis.PacePetsDevPreviewActionRegistry;
  const PREVIEW_ACTIONS = globalThis.PacePetsDevFlagsPreviewActions;
  if (
    !DEVELOPER_OPTIONS ||
    !PACE_STATE_DATA ||
    !PREVIEW_ACTION_REGISTRY ||
    !PREVIEW_ACTIONS
  ) {
    throw new Error("Dev feature preview dependencies did not load.");
  }

  const ACTION_KEYS = PREVIEW_ACTION_REGISTRY.ACTION_KEYS;
  const PACE_STATES = PACE_STATE_DATA.PACE_STATES;

  function featurePreviewGroup({
    actionKeys = [],
    key,
    optionKeys = [],
    stateKey = null,
    title = null,
  }) {
    return Object.freeze({
      actionKeys: Object.freeze(actionKeys),
      key,
      optionKeys: Object.freeze(optionKeys),
      stateKey,
      title,
    });
  }

  function featurePreviewAction(actionKey) {
    const action = PREVIEW_ACTION_REGISTRY.requireActionForKey(actionKey);
    return Object.freeze({
      key: action.key,
      label: action.label,
      run: () => PREVIEW_ACTIONS.requestPreviewAction(action.key),
      status: action.status,
    });
  }

  const FEATURE_PREVIEW_ACTIONS = Object.freeze(
    PREVIEW_ACTION_REGISTRY.ACTION_ORDER.map(featurePreviewAction),
  );
  const FEATURE_PREVIEW_GROUPS = Object.freeze([
    featurePreviewGroup({
      actionKeys: [ACTION_KEYS.brakeMaxBurst],
      key: "brake-hard",
      stateKey: PACE_STATES.criticalBehind.key,
    }),
    featurePreviewGroup({
      actionKeys: [ACTION_KEYS.rareSweat],
      key: "push-harder",
      optionKeys: [DEVELOPER_OPTIONS.MAX_POOL_FILL_KEY],
      stateKey: PACE_STATES.strongAhead.key,
    }),
    featurePreviewGroup({
      actionKeys: [ACTION_KEYS.monkEscape],
      key: "perfect-sync",
      stateKey: PACE_STATES.sync.key,
    }),
    featurePreviewGroup({
      actionKeys: [ACTION_KEYS.maxSplatBounce],
      key: "splat",
      optionKeys: [DEVELOPER_OPTIONS.RESET_EXHAUSTED_PREVIEW_KEY],
      stateKey: PACE_STATES.splat.key,
    }),
    featurePreviewGroup({
      key: "other-previews",
      optionKeys: [
        DEVELOPER_OPTIONS.CRITICAL_BADGE_WINDOW_KEY,
        DEVELOPER_OPTIONS.MANUAL_REFRESH_LEAD_WINDOW_KEY,
      ],
      title: "Other Previews",
    }),
  ]);

  function stateLabelForKey(stateKey) {
    return PACE_STATES[stateKey]?.title || "Unknown state";
  }

  function featurePreviewOptionRow(preview, context) {
    return context.optionRow({
      indicator: false,
      labelText: preview.label,
      pressed: Boolean(context.currentOptions[preview.key]),
      onClick: async ({ pressed }) => {
        const enabled = !pressed;
        await context.persistDeveloperOptions({ [preview.key]: enabled });
        context.setStatus(
          enabled ? preview.enableStatus : preview.disableStatus,
        );
      },
    });
  }

  function featurePreviewActionRow(preview, context) {
    return context.optionRow({
      action: true,
      indicator: false,
      labelText: preview.label,
      onClick: async () => {
        await preview.run();
        context.setStatus(preview.status);
      },
    });
  }

  function featurePreviewPanel(group, rows) {
    const section = document.createElement("section");
    const title = document.createElement("h2");
    const list = document.createElement("div");
    const titleId = `${group.key}-preview-title`;
    section.className = "state-column state-column-wrap-options";
    section.setAttribute("aria-labelledby", titleId);
    title.id = titleId;
    title.textContent = group.title || stateLabelForKey(group.stateKey);
    list.className = "option-list";
    list.replaceChildren(...rows);
    section.append(title, list);
    return section;
  }

  function featurePreviewRowsForGroup(group, context) {
    const optionRows = group.optionKeys
      .map((key) => context.optionByKey.get(key))
      .filter(Boolean)
      .map((preview) => featurePreviewOptionRow(preview, context));
    const actionRows = group.actionKeys
      .map((key) => context.actionByKey.get(key))
      .filter(Boolean)
      .map((preview) => featurePreviewActionRow(preview, context));
    return [...optionRows, ...actionRows];
  }

  function renderFeaturePreviews(context) {
    const renderContext = {
      ...context,
      actionByKey: new Map(
        FEATURE_PREVIEW_ACTIONS.map((preview) => [preview.key, preview]),
      ),
      optionByKey: new Map(
        DEVELOPER_OPTIONS.FEATURE_PREVIEW_OPTIONS.map((preview) => [
          preview.key,
          preview,
        ]),
      ),
    };
    const panels = FEATURE_PREVIEW_GROUPS.flatMap((group) => {
      const rows = featurePreviewRowsForGroup(group, renderContext);
      return rows.length > 0 ? [featurePreviewPanel(group, rows)] : [];
    });
    context.container.replaceChildren(...panels);
  }

  globalThis.PacePetsDevFlagsFeaturePreviews = Object.freeze({
    renderFeaturePreviews,
  });
})();
