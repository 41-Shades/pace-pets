import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function classList() {
  const values = new Set();
  return {
    add: vi.fn((...names) => names.forEach((name) => values.add(name))),
    contains: (name) => values.has(name),
    remove: vi.fn((...names) => names.forEach((name) => values.delete(name))),
    toggle: vi.fn((name, force) => {
      if (force) {
        values.add(name);
      } else {
        values.delete(name);
      }
    }),
  };
}

function paceElement() {
  const dataset = {};
  return {
    classList: classList(),
    closest: () => null,
    dataset,
    removeAttribute: vi.fn((name) => {
      if (name === "data-brake-wobble-range") {
        delete dataset.brakeWobbleRange;
      }
      if (name === "data-brake-wobble-shakes") {
        delete dataset.brakeWobbleShakes;
      }
    }),
    style: { removeProperty: vi.fn(), setProperty: vi.fn() },
  };
}

function createController() {
  const Controller = globalThis.PacePetsDashboardPaceController;
  const data = globalThis.PacePetsDashboardPaceData;
  const paceIcon = paceElement();
  const paceCard = paceElement();
  paceCard.classList.add(data.PACE_STATES.criticalBehind.className);
  const controller = new Controller();
  controller.brakeExtremePreviewState = null;
  controller.elements = { paceCard, paceIcon };
  controller.paceIconEffectCleanups = new WeakMap();
  controller.currentPaceLevel = () =>
    data.PACE_CLASSES.find((name) => paceCard.classList.contains(name));
  controller.paceStateForClassName = (className) =>
    Object.values(data.PACE_STATES).find(
      (state) => state.className === className,
    ) || data.PACE_STATES.on;
  controller.motionPreferenceEnabled = () => true;
  controller.launchBrakeDebrisBurst = vi.fn(() => 4140);
  controller.clearBrakeDebrisLayers = vi.fn();
  controller.renderPaceIcon = vi.fn();
  controller.updateFavicon = vi.fn();
  return { controller, data, paceCard, paceIcon };
}

beforeAll(async () => {
  const states = {
    bigBang: { className: "pace-big-bang", key: "bigBang" },
    criticalBehind: {
      className: "pace-critical-behind",
      key: "criticalBehind",
    },
    nothingness: { className: "pace-nothingness", key: "nothingness" },
    on: { className: "pace-on", key: "on" },
    perfectZero: { className: "pace-perfect-zero", key: "perfectZero" },
    singularity: { className: "pace-singularity", key: "singularity" },
    splat: { className: "pace-splat", key: "splat" },
    sync: { className: "pace-sync", key: "sync" },
  };
  globalThis.PacePetsDashboardPaceData = {
    BRAKE_EXTREME_CANVAS_BURST_PROFILE: { COUNT_RANGE: [10, 20] },
    BRAKE_INTENSITY: {
      BURST_CHANCE_RANGES_PERCENT: { extreme: [3, 25] },
      EXTREME_PARTICLE_COUNT_RANGE: [80, 140],
      REPEAT_DELAY_RANGE_MS: [1200, 2600],
    },
    BRAKE_WOBBLE_BURST_CHANCES_PERCENT: [
      { chancePercent: 3, rangeKey: "extreme" },
    ],
    BRAKE_WOBBLE_DURATION_MS_BY_SHAKE_COUNT: { 2: 800, 4: 1200 },
    BRAKE_WOBBLE_EXTREME_SHAKE_COUNT_RANGE: [2, 4],
    BRAKE_WOBBLE_REPEAT_DELAY_RANGE_MS: [1600, 3400],
    PACE_CLASSES: Object.values(states).map((state) => state.className),
    PACE_ICON_EFFECTS_BY_STATE: {},
    PACE_STATES: states,
  };
  globalThis.PacePetsBrakeIntensity = {};
  globalThis.PacePetsBrakeExtremePreviewControl = {
    actionKey: "brakeMaxBurst",
    fallbackErrorMessage: "Open the dashboard on Brake hard.",
  };
  globalThis.PacePetsDashboardDevPreviewBroker = {
    registerHandler: vi.fn(),
  };
  globalThis.PacePetsDashboardPreferences = {
    motionPreferenceEnabled: () => true,
  };
  globalThis.PacePetsDashboardPaceIconSelection = {
    hasMatchingRenderedPaceIcon: () => false,
    renderSelectedPaceIcon: vi.fn(),
  };
  globalThis.PacePetsDashboardPaceController = class {};
  for (const source of [
    "dashboard-pace-wobble-methods.js",
    "dashboard-pace-icon-methods.js",
  ]) {
    await import(
      pathToFileURL(path.join(projectRoot, "collector/extension", source))
    );
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.window = {
    clearTimeout: globalThis.clearTimeout,
    setTimeout: globalThis.setTimeout,
  };
  globalThis.document = {
    body: { classList: { toggle: vi.fn() } },
    hidden: false,
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Brake extreme preview lifecycle", () => {
  it("cancels the previous owner before launching a repeated preview", () => {
    const { controller } = createController();
    controller.launchBrakeExtremeDebrisPreview();
    const firstState = controller.brakeExtremePreviewState;

    controller.launchBrakeExtremeDebrisPreview();

    expect(firstState.isActive).toBe(false);
    expect(controller.clearBrakeDebrisLayers).toHaveBeenCalledWith(firstState);
    expect(controller.brakeExtremePreviewState).not.toBe(firstState);
    expect(vi.getTimerCount()).toBe(2);
  });

  it("releases owned work after the longest preview task completes", () => {
    const { controller, paceIcon } = createController();
    controller.launchBrakeExtremeDebrisPreview();
    const state = controller.brakeExtremePreviewState;

    vi.advanceTimersByTime(4140);

    expect(controller.brakeExtremePreviewState).toBeNull();
    expect(controller.clearBrakeDebrisLayers).toHaveBeenCalledWith(state);
    expect(paceIcon.classList.contains("is-brake-wobbling")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels preview work when the pace leaves Brake hard", () => {
    const { controller, data, paceIcon } = createController();
    controller.launchBrakeExtremeDebrisPreview();
    const state = controller.brakeExtremePreviewState;

    controller.setPaceLevel(data.PACE_STATES.on.className);

    expect(controller.brakeExtremePreviewState).toBeNull();
    expect(controller.clearBrakeDebrisLayers).toHaveBeenCalledWith(state);
    expect(paceIcon.classList.contains("is-brake-wobbling")).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
