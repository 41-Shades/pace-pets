import fs from "node:fs";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const methodsSource = fs.readFileSync(
  new URL(
    "../collector/extension/dashboard-reset-exhausted-methods.js",
    import.meta.url,
  ),
  "utf8",
);

function createTimerController() {
  let nextId = 1;
  const timers = new Map();
  const frames = new Map();
  return {
    activeTimer(id) {
      return timers.has(id);
    },
    activeTimerCount() {
      return timers.size;
    },
    clearFrame(id) {
      frames.delete(id);
    },
    clearTimer(id) {
      timers.delete(id);
    },
    runFrame(id, now = 0) {
      const callback = frames.get(id);
      frames.delete(id);
      callback(now);
    },
    runTimer(id) {
      const callback = timers.get(id);
      timers.delete(id);
      callback();
    },
    setFrame(callback) {
      const id = nextId;
      nextId += 1;
      frames.set(id, callback);
      return id;
    },
    setTimer(callback) {
      const id = nextId;
      nextId += 1;
      timers.set(id, callback);
      return id;
    },
  };
}

function createHarness({ splatCurrent = false } = {}) {
  const timerController = createTimerController();
  const armPath = {
    attributes: [],
    setAttribute(name, value) {
      this.attributes.push([name, value]);
    },
  };
  const context = vm.createContext({
    PacePetsDashboardApp: function PacePetsDashboardApp() {},
    PacePetsDashboardPaceData: {
      PACE_STATES: {
        on: { key: "on" },
        splat: { className: "pace-splat", key: "splat" },
      },
    },
    PacePetsResetExhaustedArmMotion: {
      DURATION_MS: 10_900,
      REST_PATH: "REST",
      pathAtProgress(progress) {
        return `P${progress}`;
      },
    },
    PacePetsResetExhaustedFigure: {
      createFigure() {
        return {
          hidden: true,
          isConnected: false,
          querySelector(selector) {
            return selector === ".reset-exhausted-free-arm" ? armPath : null;
          },
          remove() {
            this.isConnected = false;
          },
        };
      },
      createMessage() {
        return {
          hidden: true,
          isConnected: false,
          remove() {
            this.isConnected = false;
          },
        };
      },
    },
    window: {
      cancelAnimationFrame(id) {
        timerController.clearFrame(id);
      },
      clearTimeout(id) {
        timerController.clearTimer(id);
      },
      requestAnimationFrame(callback) {
        return timerController.setFrame(callback);
      },
      setTimeout(callback, delay) {
        return timerController.setTimer(callback, delay);
      },
    },
  });
  vm.runInContext(methodsSource, context);

  const card = {
    classList: {
      remove() {},
      toggle() {},
    },
    ownerDocument: {},
    append(...nodes) {
      nodes.forEach((node) => {
        node.isConnected = true;
      });
    },
  };
  const app = Object.assign(
    Object.create(context.PacePetsDashboardApp.prototype),
    {
      currentResetExhaustedPreview: true,
      currentResetExhaustedSplatActive: false,
      elements: {
        paceCard: {
          classList: {
            contains: () => splatCurrent,
          },
        },
        resetCountdownCard: card,
      },
      motionPreferenceEnabled: () => true,
      resetExhaustedArmAnimationFrame: null,
      resetExhaustedPreviewRepeatTimer: null,
      resetExhaustedSplatLaunchTimer: null,
      resetExhaustedSplatRepeatTimer: null,
      resetExhaustedSequenceStartTimer: null,
    },
  );

  return { app, armPath, timerController };
}

describe("exhausted man developer preview", () => {
  it("keeps the dev preview arm sequence alive through non-Splat pace renders", () => {
    const { app, armPath, timerController } = createHarness();

    app.renderResetExhaustedPreview();
    const sequenceTimer = app.resetExhaustedSequenceStartTimer;
    const repeatTimer = app.resetExhaustedPreviewRepeatTimer;
    app.handlePaceStateChanged({
      previousState: { key: "on" },
      state: { key: "on" },
    });

    expect(timerController.activeTimer(sequenceTimer)).toBe(true);
    expect(app.resetExhaustedPreviewRepeatTimer).toBe(repeatTimer);

    timerController.runTimer(sequenceTimer);
    timerController.runFrame(app.resetExhaustedArmAnimationFrame);

    expect(armPath.attributes).toContainEqual(["d", "REST"]);
    expect(armPath.attributes).toContainEqual(["d", "P0"]);
  });

  it("restarts the full dev preview sequence on the bounded repeat timer", () => {
    const { app, timerController } = createHarness();

    app.renderResetExhaustedPreview();
    const initialFigure = app.resetExhaustedFigure;
    const firstRepeatTimer = app.resetExhaustedPreviewRepeatTimer;

    timerController.runTimer(firstRepeatTimer);

    expect(app.resetExhaustedFigure).not.toBe(initialFigure);
    expect(app.resetExhaustedSequenceStartTimer).not.toBeNull();
    expect(app.resetExhaustedPreviewRepeatTimer).not.toBeNull();
    expect(app.resetExhaustedPreviewRepeatTimer).not.toBe(firstRepeatTimer);
  });

  it("leaves repeat ownership with the Splat sequence while Splat is current", () => {
    const { app, timerController } = createHarness({ splatCurrent: true });

    app.renderResetExhaustedPreview();

    expect(app.resetExhaustedPreviewRepeatTimer).toBeNull();
    expect(timerController.activeTimerCount()).toBe(1);
  });
});
