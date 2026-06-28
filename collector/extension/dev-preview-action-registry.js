((root) => {
  "use strict";

  const ACTION_KEYS = Object.freeze({
    brakeMaxBurst: "brakeMaxBurst",
    checkerboardReveal: "checkerboardReveal",
    monkEscape: "monkEscape",
    paceStateTransition: "paceStateTransition",
    rareSweat: "rareSweat",
  });
  const ACTION_ORDER = Object.freeze([
    ACTION_KEYS.brakeMaxBurst,
    ACTION_KEYS.rareSweat,
    ACTION_KEYS.monkEscape,
    ACTION_KEYS.paceStateTransition,
    ACTION_KEYS.checkerboardReveal,
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
    [ACTION_KEYS.paceStateTransition]: previewAction({
      controlMessageName: "playMessage",
      controlPredicateName: "isPlayMessage",
      fallbackErrorMessage:
        "Open the dashboard with motion on before previewing Pace transition.",
      key: ACTION_KEYS.paceStateTransition,
      label: "Pace transition",
      messageType: "pacePets.paceStateTransitionPreview.play",
      responseRequired: true,
      status: "Pace transition preview requested.",
    }),
    [ACTION_KEYS.checkerboardReveal]: previewAction({
      controlMessageName: "playMessage",
      controlPredicateName: "isPlayMessage",
      fallbackErrorMessage:
        "Open the dashboard before previewing Checkerboard reveal.",
      key: ACTION_KEYS.checkerboardReveal,
      label: "Checkerboard reveal",
      messageType: "pacePets.checkerboardRevealPreview.play",
      responseRequired: true,
      status: "Checkerboard reveal requested.",
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
