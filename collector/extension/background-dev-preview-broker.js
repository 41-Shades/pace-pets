(() => {
  "use strict";

  const REGISTRY = globalThis.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Dev preview action registry must load before the background preview broker.",
    );
  }

  const REQUEST_TIMEOUT_MS = 5000;
  const INVALID_REQUEST_MESSAGE = "Invalid dashboard preview request.";
  const REQUEST_TIMEOUT_MESSAGE =
    "The dashboard did not respond to the preview request.";

  class BackgroundDevPreviewBroker {
    constructor() {
      this.activitySequence = 0;
      this.dashboardConnections = new Map();
      this.pendingRequests = new Map();
    }

    connectDashboard(port) {
      if (port?.name !== REGISTRY.BROKER.portName) {
        return false;
      }

      const connection = {
        activityOrder: 0,
        connectedOrder: ++this.activitySequence,
        focused: false,
        port,
        visible: false,
      };
      this.dashboardConnections.set(port, connection);
      port.onMessage.addListener((message) => {
        this.handleDashboardMessage(connection, message);
      });
      port.onDisconnect.addListener(() => {
        this.disconnectDashboard(connection);
      });
      return true;
    }

    handleDashboardStatus(connection, message) {
      connection.focused = message.focused;
      connection.visible = message.visible;
      if (message.focused && message.visible) {
        connection.activityOrder = ++this.activitySequence;
      }
    }

    handleDashboardMessage(connection, message) {
      if (!this.dashboardConnections.has(connection.port)) {
        return;
      }
      if (REGISTRY.isDashboardStatusMessage(message)) {
        this.handleDashboardStatus(connection, message);
        return;
      }
      if (!REGISTRY.isBrokerResult(message)) {
        return;
      }

      const pending = this.pendingRequests.get(message.requestId);
      if (
        pending?.connection !== connection ||
        pending.request.actionKey !== message.actionKey
      ) {
        return;
      }
      if (message.response.ok) {
        this.finishRequest(pending, message.response);
        return;
      }
      if (!message.retryable) {
        this.finishRequest(pending, message.response);
        return;
      }
      this.dispatchNextDashboard(pending, message.response);
    }

    rankedDashboardConnections() {
      return [...this.dashboardConnections.values()].sort(
        (left, right) =>
          Number(right.visible) - Number(left.visible) ||
          Number(right.focused) - Number(left.focused) ||
          right.activityOrder - left.activityOrder ||
          right.connectedOrder - left.connectedOrder,
      );
    }

    finishRequest(pending, response) {
      if (this.pendingRequests.get(pending.request.requestId) !== pending) {
        return;
      }
      this.pendingRequests.delete(pending.request.requestId);
      globalThis.clearTimeout(pending.timeoutId);
      pending.sendResponse(
        REGISTRY.brokerResponseForRequest(pending.request, response),
      );
    }

    failRequest(pending, message) {
      this.finishRequest(pending, { message, ok: false });
    }

    dispatchNextDashboard(pending, fallbackResponse) {
      globalThis.clearTimeout(pending.timeoutId);
      let connection = pending.connections.shift() || null;
      while (connection && !this.dashboardConnections.has(connection.port)) {
        connection = pending.connections.shift() || null;
      }
      if (!connection) {
        this.finishRequest(pending, fallbackResponse);
        return;
      }

      pending.connection = connection;
      pending.timeoutId = globalThis.setTimeout(() => {
        this.failRequest(pending, REQUEST_TIMEOUT_MESSAGE);
      }, REQUEST_TIMEOUT_MS);
      try {
        connection.port.postMessage(
          REGISTRY.brokerExecutionForRequest(pending.request),
        );
      } catch {
        this.dispatchNextDashboard(pending, {
          message: "The dashboard could not receive the preview request.",
          ok: false,
        });
      }
    }

    disconnectDashboard(connection) {
      if (this.dashboardConnections.get(connection.port) !== connection) {
        return;
      }
      this.dashboardConnections.delete(connection.port);
      for (const pending of [...this.pendingRequests.values()]) {
        if (pending.connection === connection) {
          this.failRequest(
            pending,
            "The dashboard closed before the preview completed.",
          );
        }
      }
    }

    invalidRequestResponse(message) {
      return {
        message: INVALID_REQUEST_MESSAGE,
        ok: false,
        requestId:
          typeof message?.requestId === "string" ? message.requestId : null,
      };
    }

    handleRequest(message, sendResponse) {
      if (message?.type !== REGISTRY.BROKER.requestType) {
        return false;
      }
      if (!REGISTRY.isBrokerRequest(message)) {
        sendResponse(this.invalidRequestResponse(message));
        return true;
      }
      if (this.pendingRequests.has(message.requestId)) {
        sendResponse(
          REGISTRY.brokerResponseForRequest(message, {
            message: "A preview request with this ID is already running.",
            ok: false,
          }),
        );
        return true;
      }

      const connections = this.rankedDashboardConnections();
      if (connections.length === 0) {
        sendResponse(REGISTRY.brokerResponseForRequest(message, { ok: false }));
        return true;
      }

      const pending = {
        connection: null,
        connections,
        request: message,
        sendResponse,
        timeoutId: null,
      };
      this.pendingRequests.set(message.requestId, pending);
      this.dispatchNextDashboard(pending, { ok: false });
      return true;
    }
  }

  function createController() {
    const broker = new BackgroundDevPreviewBroker();
    return Object.freeze({
      connectDashboard: broker.connectDashboard.bind(broker),
      handleRequest: broker.handleRequest.bind(broker),
    });
  }

  globalThis.PacePetsBackgroundDevPreviewBroker = Object.freeze({
    REQUEST_TIMEOUT_MS,
    createController,
  });
})();
