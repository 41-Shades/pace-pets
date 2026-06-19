import fs from "node:fs";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const methodsSource = fs.readFileSync(
  new URL(
    "../collector/extension/dashboard-splat-fall-methods.js",
    import.meta.url,
  ),
  "utf8",
);

class FakeElement {
  constructor(tagName) {
    this.children = [];
    this.dataset = {};
    this.eventListeners = new Map();
    this.removed = false;
    this.style = {
      setProperty: (property, value) => {
        this.style[property] = value;
      },
    };
    this.tagName = tagName;
    this.textContent = "";
    this.classList = {
      add: (...classNames) => {
        this.className = [this.className, ...classNames]
          .filter(Boolean)
          .join(" ");
      },
      remove: (...classNames) => {
        const removeSet = new Set(classNames);
        this.className = (this.className || "")
          .split(" ")
          .filter((className) => className && !removeSet.has(className))
          .join(" ");
      },
    };
  }

  addEventListener(eventName, callback) {
    this.eventListeners.set(eventName, callback);
  }

  append(...children) {
    this.children.push(...children);
  }

  remove() {
    this.removed = true;
  }

  getBoundingClientRect() {
    return {
      height: 10,
      left: 0,
      top: 0,
      width: 10,
    };
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

function createSplatEntryPlayback(overrides = {}) {
  return {
    maxSplatFallTiming: {},
    ratioOriginRect: (controller) => {
      const rect = controller.elements.paceRatioValue?.getBoundingClientRect();
      return rect
        ? {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          }
        : null;
    },
    resolve: () => ({
      fallTiming: {},
      impactProfile: {},
    }),
    ...overrides,
  };
}

function createSplatFallProfile(overrides = {}) {
  return {
    applyCardImpactProfile() {},
    clearCardImpact() {},
    extremeCardImpactProfile: () => ({
      durationMs: 640,
    }),
    extremeRatioSlamProfile: () => ({
      durationMs: 2400,
      peakScale: 1.24,
      peakXPx: 0,
      peakYPx: -5000,
      reboundScale: 0.9,
      reboundXPx: 0,
      reboundYPx: 138,
      secondYPx: -62,
      settleYPx: 0,
      slamDescentFinalYPx: -48,
      slamDescentHighYPx: -960,
      slamDescentMidYPx: -520,
      slamDescentNearYPx: -220,
      slamImpactDelayMs: 1824,
      slamSettleYPx: 36,
      slamSmallBounceYPx: -12,
      slamYPx: 138,
      typeClass: "is-splat-ratio-extreme-slam",
    }),
    randomRatioBounceProfile: () => ({
      durationMs: 1000,
      peakScale: 1,
      peakXPx: 0,
      peakYPx: -100,
      reboundScale: 1,
      reboundXPx: 0,
      reboundYPx: 20,
      secondYPx: -10,
      settleYPx: 2,
    }),
    ...overrides,
  };
}

function createVmContext({
  appended,
  splatEntryPlayback,
  splatFallProfile,
  timeouts,
}) {
  return vm.createContext({
    document: {
      body: {
        append(element) {
          appended.push(element);
        },
      },
      createElement(tagName) {
        return new FakeElement(tagName);
      },
    },
    getComputedStyle: () => ({
      color: "rgb(1 2 3)",
      fontFamily: "Inter",
      fontSize: "20px",
      fontStyle: "normal",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "800",
      letterSpacing: "0px",
      lineHeight: "24px",
    }),
    innerHeight: 800,
    PacePetsDashboardPaceController:
      function PacePetsDashboardPaceController() {},
    PacePetsDashboardPaceData: {
      PACE_STATES: {
        splat: { className: "pace-splat" },
      },
      SPLAT_FREE_FALL_IMAGE: "free-fall.png",
    },
    PacePetsDashboardPreferences: {
      motionPreferenceEnabled: () => true,
    },
    PacePetsDashboardSplatEntryPlayback:
      createSplatEntryPlayback(splatEntryPlayback),
    PacePetsDashboardSplatFallProfile: createSplatFallProfile(splatFallProfile),
    window: {
      clearTimeout() {},
      setTimeout(callback, delay) {
        timeouts.push({ callback, delay });
        return timeouts.length;
      },
    },
  });
}

function createSourceElement() {
  const source = new FakeElement("strong");
  source.textContent = "0.00";
  source.getBoundingClientRect = () => ({
    height: 24,
    left: 20,
    top: 30,
    width: 56,
  });
  return source;
}

function createController(context, source) {
  return Object.assign(
    Object.create(context.PacePetsDashboardPaceController.prototype),
    {
      elements: {
        paceCard: new FakeElement("section"),
        paceIcon: new FakeElement("div"),
        paceRatioValue: source,
      },
      paceIconEffectCleanups: new Map(),
    },
  );
}

function createHarness(options = {}) {
  const appended = [];
  const timeouts = [];
  const context = createVmContext({ appended, timeouts, ...options });
  vm.runInContext(methodsSource, context);

  const controller = createController(context, createSourceElement());

  return { appended, controller, timeouts };
}

describe("Splat ratio clone lifecycle", () => {
  it("removes regular ratio clones when their own animation ends", () => {
    const { appended, controller, timeouts } = createHarness();

    controller.renderSplatRatioBounceClone();

    expect(appended).toHaveLength(1);
    expect(timeouts[0].delay).toBe(1080);

    const clone = appended[0];
    expect(clone.removed).toBe(false);

    clone.eventListeners.get("animationend")();

    expect(clone.removed).toBe(true);
  });

  it("keeps long-lived Max Splat ratio clones visible after animation end", () => {
    const { appended, controller, timeouts } = createHarness();

    controller.renderSplatRatioBounceClone({
      durationMs: 2400,
      peakScale: 1.24,
      peakXPx: 0,
      peakYPx: -5000,
      reboundScale: 0.9,
      reboundXPx: 0,
      reboundYPx: 138,
      removeDelayMs: 9000,
      secondYPx: -62,
      settleYPx: 0,
      slamDescentFinalYPx: -48,
      slamDescentHighYPx: -960,
      slamDescentMidYPx: -520,
      slamDescentNearYPx: -220,
      slamSettleYPx: 36,
      slamSmallBounceYPx: -12,
      slamYPx: 138,
      typeClass: "is-splat-ratio-extreme-slam",
    });

    expect(appended).toHaveLength(1);
    expect(timeouts[0].delay).toBe(9080);

    const clone = appended[0];
    expect(clone.textContent).toBe("0.00");
    expect(clone.removed).toBe(false);
    expect(clone.eventListeners.has("animationend")).toBe(false);

    timeouts[0].callback();

    expect(clone.removed).toBe(true);
  });

  it("removes tracked Max Splat ratio clones when clearing the preview", () => {
    const { appended, controller } = createHarness();

    controller.renderSplatRatioBounceClone({
      durationMs: 2400,
      peakScale: 1.24,
      peakXPx: 0,
      peakYPx: -5000,
      reboundScale: 0.9,
      reboundXPx: 0,
      reboundYPx: 138,
      removeDelayMs: 9000,
      secondYPx: -62,
      settleYPx: 0,
      slamDescentFinalYPx: -48,
      slamDescentHighYPx: -960,
      slamDescentMidYPx: -520,
      slamDescentNearYPx: -220,
      slamSettleYPx: 36,
      slamSmallBounceYPx: -12,
      slamYPx: 138,
      typeClass: "is-splat-ratio-extreme-slam",
    });

    const clone = appended[0];
    expect(controller.splatMaxBounceRatioClone).toBe(clone);

    controller.clearSplatMaxBouncePreview();

    expect(clone.removed).toBe(true);
    expect(controller.splatMaxBounceRatioClone).toBeNull();
  });

  it("falls back to the live ratio rect when a cached origin has no layout", () => {
    const { appended, controller } = createHarness();

    controller.renderSplatRatioBounceClone({
      durationMs: 1000,
      originRect: { height: 0, left: 0, top: 0, width: 0 },
      peakScale: 1,
      peakXPx: 0,
      peakYPx: -100,
      reboundScale: 1,
      reboundXPx: 0,
      reboundYPx: 20,
      secondYPx: -10,
      settleYPx: 2,
    });

    expect(appended).toHaveLength(1);
    expect(appended[0].style.left).toBe("20px");
    expect(appended[0].style.top).toBe("30px");
    expect(appended[0].style.width).toBe("56px");
    expect(appended[0].style.height).toBe("24px");
  });
});

describe("Max Splat ratio clone origin", () => {
  it("captures Max Splat origins after layout and before card impact transforms", () => {
    let controllerRef = null;
    let originBeforeCardImpact = null;
    const { controller, timeouts } = createHarness({
      splatEntryPlayback: {
        resolve: () => ({
          captureRatioOriginBeforeImpact: true,
          fallTiming: { cleanupMs: 20, durationMs: 20, impactMs: 10 },
          impactProfile: { card: {}, ratio: null },
        }),
      },
      splatFallProfile: {
        applyCardImpactProfile() {
          originBeforeCardImpact = controllerRef.splatMaxBounceRatioOriginRect;
        },
      },
    });
    controllerRef = controller;
    controller.elements.paceIcon.dataset.splatFallIntro = "true";

    controller.renderSplatFallEffect(controller.elements.paceIcon);
    timeouts.find(({ delay }) => delay === 10).callback();

    expect(originBeforeCardImpact).toEqual({
      height: 24,
      left: 20,
      top: 30,
      width: 56,
    });
  });

  it("launches Max Splat slams from the cached pre-transform origin", () => {
    const { appended, controller } = createHarness();
    controller.splatMaxBounceRatioOriginRect = {
      height: 24,
      left: 6,
      top: 7,
      width: 56,
    };

    controller.playSplatMaxBounceSlam();

    expect(appended).toHaveLength(1);
    expect(appended[0].style.left).toBe("6px");
    expect(appended[0].style.top).toBe("7px");
    expect(appended[0].style.width).toBe("56px");
    expect(appended[0].style.height).toBe("24px");
  });
});
