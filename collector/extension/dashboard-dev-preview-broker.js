(() => {
  "use strict";

  const REGISTRY = globalThis.PacePetsDevPreviewActionRegistry;
  if (!REGISTRY) {
    throw new Error(
      "Dev preview action registry must load before the dashboard preview broker.",
    );
  }

  const RECONNECT_DELAY_MS = 250;

  class DashboardDevPreviewBroker {
    constructor() {
      this.handlers = new Map();
      this.port = null;
      this.reconnectTimer = null;
      this.started = false;
    }

    registerHandler(actionKey, handler) {
      const action = REGISTRY.requireActionForKey(actionKey);
      if (!action.responseRequired || typeof handler !== "function") {
        throw new Error(`Invalid dashboard preview handler: ${actionKey}`);
      }

      this.handlers.set(actionKey, handler);
      return () => {
        if (this.handlers.get(actionKey) === handler) {
          this.handlers.delete(actionKey);
        }
      };
    }

    dashboardStatus() {
      return REGISTRY.dashboardStatusMessage({
        focused: globalThis.document?.hasFocus?.() === true,
        visible: globalThis.document?.hidden !== true,
      });
    }

    postStatus() {
      this.port?.postMessage(this.dashboardStatus());
    }

    scheduleReconnect() {
      if (!this.started || this.reconnectTimer !== null) {
        return;
      }
      this.reconnectTimer = globalThis.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, RECONNECT_DELAY_MS);
    }

    connect() {
      if (this.port || !globalThis.chrome?.runtime?.connect) {
        return;
      }

      const port = globalThis.chrome.runtime.connect({
        name: REGISTRY.BROKER.portName,
      });
      this.port = port;
      port.onMessage.addListener((message) => {
        this.handleExecution(port, message);
      });
      port.onDisconnect.addListener(() => {
        if (this.port === port) {
          this.port = null;
          this.scheduleReconnect();
        }
      });
      this.postStatus();
    }

    actionFallback(actionKey) {
      return {
        message: REGISTRY.fallbackErrorMessageForKey(actionKey),
        ok: false,
      };
    }

    async actionResponse(execution) {
      const handler = this.handlers.get(execution.actionKey);
      if (globalThis.document?.hidden === true || !handler) {
        return this.actionFallback(execution.actionKey);
      }

      try {
        return await handler();
      } catch (error) {
        console.warn("Pace Pets dashboard preview action failed:", error);
        return {
          ...this.actionFallback(execution.actionKey),
          retryable: false,
        };
      }
    }

    async handleExecution(port, execution) {
      if (this.port !== port || !REGISTRY.isBrokerExecution(execution)) {
        return;
      }

      const response = await this.actionResponse(execution);
      if (this.port === port) {
        port.postMessage(
          REGISTRY.brokerResultForExecution(execution, response),
        );
      }
    }

    bindStatusEvents() {
      const postStatus = () => this.postStatus();
      globalThis.addEventListener?.("focus", postStatus);
      globalThis.addEventListener?.("blur", postStatus);
      globalThis.document?.addEventListener?.("visibilitychange", postStatus);
    }

    start() {
      if (this.started) {
        return;
      }
      this.started = true;
      this.bindStatusEvents();
      this.connect();
    }
  }

  function createController() {
    const broker = new DashboardDevPreviewBroker();
    return Object.freeze({
      registerHandler: broker.registerHandler.bind(broker),
      start: broker.start.bind(broker),
    });
  }

  const controller = createController();
  globalThis.PacePetsDashboardDevPreviewBroker = Object.freeze({
    ...controller,
    createController,
  });
})();
