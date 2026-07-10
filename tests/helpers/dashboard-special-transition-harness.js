import fs from "node:fs";
import vm from "node:vm";

import { vi } from "vitest";

const methodsSource = fs.readFileSync(
  new URL(
    "../../collector/extension/dashboard-singularity-transition-methods.js",
    import.meta.url,
  ),
  "utf8",
);
const paceIconMethodsSource = fs.readFileSync(
  new URL(
    "../../collector/extension/dashboard-pace-icon-methods.js",
    import.meta.url,
  ),
  "utf8",
);

export function createSpecialTransitionHarness({
  motionEnabled = true,
  transitionAudio = null,
} = {}) {
  const calls = { bigBang: 0, singularity: 0 };
  const scene = {
    play: () => new Promise(() => {}),
    stopCount: 0,
    stop() {
      this.stopCount += 1;
    },
  };
  const documentState = { hidden: false };
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
      motionPreferenceEnabled: () => motionEnabled,
    },
    PacePetsDashboardPaceIconSelection: {},
    PacePetsDashboardDevPreviewBroker: {
      registerHandler: vi.fn(),
    },
    PacePetsDevPreviewActionRegistry: {
      ACTION_KEYS: { bigBangReplay: "bigBangReplay" },
      controlForAction: () => ({
        fallbackErrorMessage:
          "Open the dashboard on Big Bang before replaying Big Bang.",
      }),
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
  vm.runInContext(paceIconMethodsSource, context);
  const states = context.PacePetsDashboardPaceData.PACE_STATES;
  const controller = Object.assign(
    Object.create(context.PacePetsDashboardPaceController.prototype),
    {
      bigBangTransitionInFlight: false,
      bigBangTransitionPending: false,
      bigBangTransitionRunId: 0,
      bigBangTransitionScene: null,
      clearPaceChangePulse: vi.fn(),
      clearPaceIconEffects: vi.fn(),
      clearPaceStateCardTransition: vi.fn(),
      elements: { paceIcon: {} },
      singularityTransitionInFlight: false,
      singularityTransitionPending: false,
      singularityTransitionRunId: 0,
      singularityTransitionScene: null,
      specialTransitions: null,
      transitionAudio,
    },
  );
  controller.currentPaceLevel = () => states.bigBang.className;
  controller.paceStateForClassName = (className) =>
    Object.values(states).find((state) => state.className === className);

  return { calls, controller, documentState, scene, states };
}
