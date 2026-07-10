((root) => {
  "use strict";

  const ACTION_KEYS = Object.freeze({
    bigBangReplay: "bigBangReplay",
    brakeMaxBurst: "brakeMaxBurst",
    checkerboardReveal: "checkerboardReveal",
    monkEscape: "monkEscape",
    paceStateTransition: "paceStateTransition",
    rareSweat: "rareSweat",
  });
  const ACTION_ORDER = Object.freeze([
    ACTION_KEYS.bigBangReplay,
    ACTION_KEYS.brakeMaxBurst,
    ACTION_KEYS.rareSweat,
    ACTION_KEYS.monkEscape,
    ACTION_KEYS.paceStateTransition,
    ACTION_KEYS.checkerboardReveal,
  ]);
  const BROKER = Object.freeze({
    executionType: "pacePets.devPreview.execute",
    portName: "pacePets.devPreview.dashboard",
    requestType: "pacePets.devPreview.request",
    resultType: "pacePets.devPreview.result",
    statusType: "pacePets.devPreview.dashboardStatus",
  });
  let requestSequence = 0;

  function previewAction(action) {
    return Object.freeze(action);
  }

  const ACTIONS = Object.freeze({
    [ACTION_KEYS.bigBangReplay]: previewAction({
      fallbackErrorMessage:
        "Open the dashboard on Big Bang before replaying Big Bang.",
      key: ACTION_KEYS.bigBangReplay,
      label: "Replay Big Bang",
      responseRequired: true,
      status: "Big Bang replay requested.",
    }),
    [ACTION_KEYS.brakeMaxBurst]: previewAction({
      fallbackErrorMessage:
        "Open the dashboard on Brake hard before previewing Max debris burst.",
      key: ACTION_KEYS.brakeMaxBurst,
      label: "Max debris burst",
      responseRequired: true,
      status: "Max debris burst preview requested.",
    }),
    [ACTION_KEYS.rareSweat]: previewAction({
      fallbackErrorMessage:
        "Open the dashboard on Push harder before previewing Rare burst (5%).",
      key: ACTION_KEYS.rareSweat,
      label: "Rare burst (5%)",
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
      fallbackErrorMessage:
        "Open the dashboard with motion on before previewing Pace transition.",
      key: ACTION_KEYS.paceStateTransition,
      label: "Pace transition",
      responseRequired: true,
      status: "Pace transition preview requested.",
    }),
    [ACTION_KEYS.checkerboardReveal]: previewAction({
      fallbackErrorMessage:
        "Open the dashboard before previewing Checkerboard reveal.",
      key: ACTION_KEYS.checkerboardReveal,
      label: "Checkerboard reveal",
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
    return Object.freeze({
      type: requireDirectMessageActionForKey(actionKey).messageType,
    });
  }

  function isMessageForKey(actionKey, message) {
    return (
      message?.type === requireDirectMessageActionForKey(actionKey).messageType
    );
  }

  function responseErrorMessage(actionKey, response) {
    return response?.message || fallbackErrorMessageForKey(actionKey);
  }

  function fallbackErrorMessageForKey(actionKey) {
    return requireActionForKey(actionKey).fallbackErrorMessage;
  }

  function requireResponseActionForKey(actionKey) {
    const action = requireActionForKey(actionKey);
    if (!action.responseRequired) {
      throw new Error(`Preview action does not use the broker: ${actionKey}`);
    }
    return action;
  }

  function requireDirectMessageActionForKey(actionKey) {
    const action = requireActionForKey(actionKey);
    if (action.responseRequired) {
      throw new Error(`Preview action requires the broker: ${actionKey}`);
    }
    return action;
  }

  function validRequestId(requestId) {
    return typeof requestId === "string" && requestId.length > 0;
  }

  function createRequestId() {
    requestSequence += 1;
    const uuid = root.crypto?.randomUUID?.();
    return uuid || `preview-${Date.now().toString(36)}-${requestSequence}`;
  }

  function brokerRequestForKey(actionKey, requestId = createRequestId()) {
    requireResponseActionForKey(actionKey);
    if (!validRequestId(requestId)) {
      throw new Error("Dev preview request ID must be a non-empty string.");
    }
    return Object.freeze({
      actionKey,
      requestId,
      type: BROKER.requestType,
    });
  }

  function isBrokerRequest(message) {
    return (
      message?.type === BROKER.requestType &&
      validRequestId(message.requestId) &&
      actionForKey(message.actionKey)?.responseRequired === true
    );
  }

  function brokerExecutionForRequest(request) {
    if (!isBrokerRequest(request)) {
      throw new Error("Invalid dev preview broker request.");
    }
    return Object.freeze({
      actionKey: request.actionKey,
      requestId: request.requestId,
      type: BROKER.executionType,
    });
  }

  function isBrokerExecution(message) {
    return (
      message?.type === BROKER.executionType &&
      validRequestId(message.requestId) &&
      actionForKey(message.actionKey)?.responseRequired === true
    );
  }

  function actionResponseForKey(actionKey, response) {
    requireResponseActionForKey(actionKey);
    return response?.ok === true
      ? Object.freeze({ ok: true })
      : Object.freeze({
          message: responseErrorMessage(actionKey, response),
          ok: false,
        });
  }

  function brokerResultForExecution(execution, response) {
    if (!isBrokerExecution(execution)) {
      throw new Error("Invalid dev preview broker execution.");
    }
    return Object.freeze({
      actionKey: execution.actionKey,
      requestId: execution.requestId,
      response: actionResponseForKey(execution.actionKey, response),
      retryable: response?.ok !== true && response?.retryable !== false,
      type: BROKER.resultType,
    });
  }

  function isBrokerResult(message) {
    return (
      message?.type === BROKER.resultType &&
      validRequestId(message.requestId) &&
      actionForKey(message.actionKey)?.responseRequired === true &&
      typeof message.response?.ok === "boolean" &&
      typeof message.retryable === "boolean"
    );
  }

  function brokerResponseForRequest(request, response) {
    if (!isBrokerRequest(request)) {
      throw new Error("Invalid dev preview broker request.");
    }
    return Object.freeze({
      ...actionResponseForKey(request.actionKey, response),
      requestId: request.requestId,
    });
  }

  function dashboardStatusMessage({ focused, visible }) {
    return Object.freeze({
      focused: focused === true,
      type: BROKER.statusType,
      visible: visible === true,
    });
  }

  function isDashboardStatusMessage(message) {
    return (
      message?.type === BROKER.statusType &&
      typeof message.focused === "boolean" &&
      typeof message.visible === "boolean"
    );
  }

  function controlForAction(actionKey) {
    const action = requireActionForKey(actionKey);
    const control = {
      actionKey: action.key,
      fallbackErrorMessage: fallbackErrorMessageForKey(action.key),
    };
    if (action.responseRequired) {
      return Object.freeze(control);
    }
    return Object.freeze({
      ...control,
      [action.controlMessageName]: () => messageForKey(action.key),
      [action.controlPredicateName]: (message) =>
        isMessageForKey(action.key, message),
    });
  }

  root.PacePetsDevPreviewActionRegistry = Object.freeze({
    ACTION_KEYS,
    ACTION_ORDER,
    ACTIONS,
    BROKER,
    actionResponseForKey,
    actionForKey,
    brokerExecutionForRequest,
    brokerRequestForKey,
    brokerResponseForRequest,
    brokerResultForExecution,
    controlForAction,
    dashboardStatusMessage,
    fallbackErrorMessageForKey,
    isBrokerExecution,
    isBrokerRequest,
    isBrokerResult,
    isDashboardStatusMessage,
    isMessageForKey,
    messageForKey,
    requireActionForKey,
    requireDirectMessageActionForKey,
    responseErrorMessage,
  });
})(globalThis);
