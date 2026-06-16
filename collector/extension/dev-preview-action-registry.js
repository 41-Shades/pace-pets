((root) => {
  "use strict";

  const ACTION_KEYS = Object.freeze({
    brakeMaxBurst: "brakeMaxBurst",
    maxSplatBounce: "maxSplatBounce",
    monkEscape: "monkEscape",
    rareSweat: "rareSweat",
  });
  const ACTION_ORDER = Object.freeze([
    ACTION_KEYS.brakeMaxBurst,
    ACTION_KEYS.rareSweat,
    ACTION_KEYS.maxSplatBounce,
    ACTION_KEYS.monkEscape,
  ]);

  function previewAction(action) {
    return Object.freeze(action);
  }

  const ACTIONS = Object.freeze({
    [ACTION_KEYS.brakeMaxBurst]: previewAction({
      controlMessageName: "maxBurstMessage",
      controlPredicateName: "isMaxBurstMessage",
      fallbackErrorMessage:
        "Open the dashboard on Brake hard before previewing Max debris burst.",
      key: ACTION_KEYS.brakeMaxBurst,
      label: "Max debris burst",
      messageType: "pacePets.brakeExtremePreview.max",
      responseRequired: true,
      status: "Max debris burst preview requested.",
    }),
    [ACTION_KEYS.rareSweat]: previewAction({
      controlMessageName: "forceRareMessage",
      controlPredicateName: "isForceRareMessage",
      fallbackErrorMessage:
        "Open the dashboard on Push harder before previewing Rare burst (5%).",
      key: ACTION_KEYS.rareSweat,
      label: "Rare burst (5%)",
      messageType: "pacePets.pushSweatPreview.rare",
      responseRequired: true,
      status: "Rare burst (5%) requested.",
    }),
    [ACTION_KEYS.maxSplatBounce]: previewAction({
      controlMessageName: "maxBounceMessage",
      controlPredicateName: "isMaxBounceMessage",
      fallbackErrorMessage:
        "Open the dashboard on Splat before previewing Max Splat bounce.",
      key: ACTION_KEYS.maxSplatBounce,
      label: "Max Splat bounce",
      messageType: "pacePets.splatBouncePreview.max",
      responseRequired: true,
      status: "Max Splat bounce preview requested.",
    }),
    [ACTION_KEYS.monkEscape]: previewAction({
      controlMessageName: "launchMessage",
      controlPredicateName: "isLaunchMessage",
      fallbackErrorMessage: "Open the dashboard on Perfect sync.",
      key: ACTION_KEYS.monkEscape,
      label: "Monk escape",
      messageType: "pacePets.syncMonkEscapePreview.launch",
      responseRequired: false,
      status: "Monk escape launch requested.",
    }),
  });

  function actionForKey(actionKey) {
    return ACTIONS[actionKey] || null;
  }

  function requireActionForKey(actionKey) {
    const action = actionForKey(actionKey);
    if (!action) {
      throw new Error(`Unknown dev preview action: ${actionKey}`);
    }
    return action;
  }

  function messageForKey(actionKey) {
    return Object.freeze({ type: requireActionForKey(actionKey).messageType });
  }

  function isMessageForKey(actionKey, message) {
    return message?.type === requireActionForKey(actionKey).messageType;
  }

  function responseErrorMessage(actionKey, response) {
    return response?.message || fallbackErrorMessageForKey(actionKey);
  }

  function fallbackErrorMessageForKey(actionKey) {
    return requireActionForKey(actionKey).fallbackErrorMessage;
  }

  function controlForAction(actionKey) {
    const action = requireActionForKey(actionKey);
    return Object.freeze({
      fallbackErrorMessage: fallbackErrorMessageForKey(action.key),
      [action.controlMessageName]: () => messageForKey(action.key),
      [action.controlPredicateName]: (message) =>
        isMessageForKey(action.key, message),
    });
  }

  root.PacePetsDevPreviewActionRegistry = Object.freeze({
    ACTION_KEYS,
    ACTION_ORDER,
    ACTIONS,
    actionForKey,
    controlForAction,
    fallbackErrorMessageForKey,
    isMessageForKey,
    messageForKey,
    requireActionForKey,
    responseErrorMessage,
  });
})(globalThis);
