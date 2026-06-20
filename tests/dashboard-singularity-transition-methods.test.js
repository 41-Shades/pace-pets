import fs from "node:fs";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const methodsSource = fs.readFileSync(
  new URL(
    "../collector/extension/dashboard-singularity-transition-methods.js",
    import.meta.url,
  ),
  "utf8",
);

function createHarness() {
  const calls = {
    bigBang: 0,
    singularity: 0,
  };
  const scene = {
    play: () => new Promise(() => {}),
    stopCount: 0,
    stop() {
      this.stopCount += 1;
    },
  };
  const documentState = {
    hidden: false,
  };
  const context = vm.createContext({
    console,
    document: documentState,
    PacePetsDashboardPaceController:
      function PacePetsDashboardPaceController() {},
    PacePetsDashboardPaceData: {
      PACE_STATES: {
        bigBang: { className: "pace-big-bang", key: "bigBang" },
        on: { className: "pace-on", key: "on" },
        singularity: { className: "pace-singularity", key: "singularity" },
      },
    },
    PacePetsDashboardPreferences: {
      motionPreferenceEnabled: () => true,
    },
    PacePetsDashboardBigBangTransitionRenderer: {
      create: () => {
        calls.bigBang += 1;
        return scene;
      },
    },
    PacePetsDashboardSingularityTransitionRenderer: {
      create: () => {
        calls.singularity += 1;
        return scene;
      },
    },
  });
  vm.runInContext(methodsSource, context);
  const states = context.PacePetsDashboardPaceData.PACE_STATES;

  const controller = Object.assign(
    Object.create(context.PacePetsDashboardPaceController.prototype),
    {
      singularityTransitionInFlight: false,
      singularityTransitionPending: false,
      singularityTransitionRunId: 0,
      singularityTransitionScene: null,
      specialTransitions: null,
    },
  );
  controller.currentPaceLevel = () => states.bigBang.className;
  controller.paceStateForClassName = (className) =>
    Object.values(states).find((state) => state.className === className);

  return {
    calls,
    controller,
    documentState,
    scene,
    states,
  };
}

describe("Singularity transition state updates", () => {
  it("keeps an active transition running when a later render leaves Singularity", () => {
    const { controller, states } = createHarness();
    const scene = {
      stopCount: 0,
      stop() {
        this.stopCount += 1;
      },
    };
    controller.singularityTransitionInFlight = true;
    controller.singularityTransitionPending = true;
    controller.singularityTransitionScene = scene;

    controller.updateSingularityTransitionState(states.singularity, states.on);

    expect(scene.stopCount).toBe(0);
    expect(controller.singularityTransitionInFlight).toBe(true);
    expect(controller.singularityTransitionPending).toBe(false);
    expect(controller.singularityTransitionScene).toBe(scene);
  });

  it("cancels a queued transition when Singularity exits before playback starts", () => {
    const { controller, states } = createHarness();
    const scene = {
      stopCount: 0,
      stop() {
        this.stopCount += 1;
      },
    };
    controller.singularityTransitionInFlight = false;
    controller.singularityTransitionPending = true;
    controller.singularityTransitionScene = scene;

    controller.updateSingularityTransitionState(states.singularity, states.on);

    expect(scene.stopCount).toBe(1);
    expect(controller.singularityTransitionInFlight).toBe(false);
    expect(controller.singularityTransitionPending).toBe(false);
    expect(controller.singularityTransitionScene).toBe(null);
  });

  it("queues Big Bang while hidden and plays it when visible", () => {
    const { calls, controller, documentState, states } = createHarness();
    documentState.hidden = true;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(controller.bigBangTransitionPending).toBe(true);
    expect(controller.bigBangTransitionInFlight).toBe(false);
    expect(calls.bigBang).toBe(0);

    documentState.hidden = false;
    controller.playPendingSpecialTransition();

    expect(calls.bigBang).toBe(1);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionInFlight).toBe(true);
  });

  it("does not start Big Bang while another special transition is active", () => {
    const { calls, controller, states } = createHarness();
    controller.singularityTransitionInFlight = true;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(calls.bigBang).toBe(0);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionInFlight).toBe(false);
  });
});
