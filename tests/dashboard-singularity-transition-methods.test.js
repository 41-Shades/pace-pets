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
  const scene = {
    play: () => Promise.resolve(true),
    stopCount: 0,
    stop() {
      this.stopCount += 1;
    },
  };
  const context = vm.createContext({
    console,
    document: {
      hidden: false,
    },
    PacePetsDashboardPaceController:
      function PacePetsDashboardPaceController() {},
    PacePetsDashboardPaceData: {
      PACE_STATES: {
        on: { className: "pace-on", key: "on" },
        singularity: { className: "pace-singularity", key: "singularity" },
      },
    },
    PacePetsDashboardPreferences: {
      motionPreferenceEnabled: () => true,
    },
    PacePetsDashboardSingularityTransitionRenderer: {
      create: () => scene,
    },
  });
  vm.runInContext(methodsSource, context);

  const controller = Object.assign(
    Object.create(context.PacePetsDashboardPaceController.prototype),
    {
      singularityTransitionInFlight: false,
      singularityTransitionPending: false,
      singularityTransitionRunId: 0,
      singularityTransitionScene: null,
    },
  );

  return {
    controller,
    states: context.PacePetsDashboardPaceData.PACE_STATES,
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
});
