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
  const EDGE_CASE_GROUP_KEYS = Object.freeze(["perfect-sync", "splat"]);
  const SCENARIO_GROUP_KEYS = Object.freeze([
    "push-harder",
    "brake-hard",
    ...EDGE_CASE_GROUP_KEYS,
  ]);
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
      key: "splat",
      optionKeys: [DEVELOPER_OPTIONS.RESET_EXHAUSTED_PREVIEW_KEY],
      stateKey: PACE_STATES.splat.key,
    }),
    featurePreviewGroup({
      actionKeys: [
        ACTION_KEYS.paceStateTransition,
        ACTION_KEYS.checkerboardReveal,
      ],
      key: "global-previews",
      optionKeys: [DEVELOPER_OPTIONS.CHECKERBOARD_REVEAL_WHITE_TRANSPARENT_KEY],
      title: "Global Previews",
    }),
    featurePreviewGroup({
      key: "other-previews",
      optionKeys: [
        DEVELOPER_OPTIONS.BADGE_HIDDEN_KEY,
        DEVELOPER_OPTIONS.CRITICAL_BADGE_WINDOW_KEY,
        DEVELOPER_OPTIONS.MANUAL_REFRESH_LEAD_WINDOW_KEY,
        DEVELOPER_OPTIONS.RAIL_HIDDEN_KEY,
      ],
      title: "Other Previews",
    }),
  ]);

  function stateLabelForKey(stateKey) {
    return PACE_STATES[stateKey]?.title || "Unknown state";
  }

  function featurePreviewTitle(group) {
    return group.title || stateLabelForKey(group.stateKey);
  }

  function featurePreviewOptionRow(preview, context) {
    return context.optionRow({
      indicator: false,
      pressed: Boolean(context.currentOptions[preview.key]),
      onClick: async ({ pressed }) => {
        const enabled = !pressed;
        await context.persistDeveloperOptions({ [preview.key]: enabled });
        context.setStatus(
          enabled ? preview.enableStatus : preview.disableStatus,
        );
      },
      labelText:
        context.currentOptions[preview.key] && preview.activeLabel
          ? preview.activeLabel
          : preview.label,
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
    title.textContent = featurePreviewTitle(group);
    list.className = "option-list";
    list.replaceChildren(...rows);
    section.append(title, list);
    return section;
  }

  function featurePreviewCard({ key, title: titleText }, rows) {
    const card = document.createElement("section");
    const title = document.createElement("h3");
    const list = document.createElement("div");
    const titleId = `${key}-trigger-title`;
    card.className = "scenario-trigger-card";
    card.setAttribute("aria-labelledby", titleId);
    title.id = titleId;
    title.textContent = titleText;
    list.className = "option-list scenario-trigger-options";
    list.replaceChildren(...rows);
    card.append(title, list);
    return card;
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
    const renderedGroups = FEATURE_PREVIEW_GROUPS.map((group) => {
      const rows = featurePreviewRowsForGroup(group, renderContext);
      return { group, rows };
    }).filter(({ rows }) => rows.length > 0);
    const renderedGroupByKey = new Map(
      renderedGroups.map((renderedGroup) => [
        renderedGroup.group.key,
        renderedGroup,
      ]),
    );
    const edgeCaseRows = EDGE_CASE_GROUP_KEYS.flatMap(
      (key) => renderedGroupByKey.get(key)?.rows || [],
    );
    const scenarioCards = SCENARIO_GROUP_KEYS.filter(
      (key) => !EDGE_CASE_GROUP_KEYS.includes(key),
    )
      .map((key) => renderedGroupByKey.get(key))
      .filter(Boolean)
      .map(({ group, rows: groupRows }) =>
        featurePreviewCard(
          { key: group.key, title: featurePreviewTitle(group) },
          groupRows,
        ),
      );
    if (edgeCaseRows.length > 0) {
      scenarioCards.push(
        featurePreviewCard(
          { key: "edge-cases", title: "Edge cases" },
          edgeCaseRows,
        ),
      );
    }
    const panels = renderedGroups
      .filter(
        ({ group }) =>
          !group.stateKey && !SCENARIO_GROUP_KEYS.includes(group.key),
      )
      .map(({ group, rows: groupRows }) =>
        featurePreviewPanel(group, groupRows),
      );
    context.scenarioContainer.replaceChildren(...scenarioCards);
    context.container.replaceChildren(...panels);
  }

  globalThis.PacePetsDevFlagsFeaturePreviews = Object.freeze({
    renderFeaturePreviews,
  });
})();
