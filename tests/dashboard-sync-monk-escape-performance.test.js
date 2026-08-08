import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function runScript(context, fileName) {
  const source = fs.readFileSync(path.join(extensionRoot, fileName), "utf8");
  new vm.Script(source, { filename: fileName }).runInContext(context);
}

function createAnimation() {
  return {
    cancel: vi.fn(),
    currentTime: 0,
    pause: vi.fn(),
    play: vi.fn(),
    startTime: null,
  };
}

function createElement(tagName = "SPAN") {
  return {
    animate: vi.fn(function animate(keyframes, timing) {
      const animation = createAnimation();
      this.animationRecords.push({ animation, keyframes, timing });
      return animation;
    }),
    animationRecords: [],
    append: vi.fn(),
    className: "",
    remove: vi.fn(),
    setAttribute: vi.fn(),
    style: {},
    tagName,
  };
}

function createHarness() {
  const createdElements = [];
  const math = Object.create(Math);
  math.random = vi.fn().mockReturnValueOnce(0.75).mockReturnValueOnce(0.5);
  const sourceClone = createElement("IMG");
  sourceClone.removeAttribute = vi.fn();
  const source = {
    cloneNode: vi.fn(() => sourceClone),
    getBoundingClientRect: vi.fn(() => ({
      height: 40,
      left: 120,
      top: 160,
      width: 40,
    })),
  };
  let preferenceListener = null;
  let motionEnabled = true;
  const removePreferenceListener = vi.fn();
  const requestAnimationFrame = vi.fn();
  const document = {
    addEventListener: vi.fn(),
    body: {
      append: vi.fn(),
      classList: { add: vi.fn(), remove: vi.fn() },
    },
    createElement: vi.fn(() => {
      const element = createElement();
      createdElements.push(element);
      return element;
    }),
    documentElement: { clientHeight: 600, clientWidth: 800 },
    hidden: false,
    removeEventListener: vi.fn(),
    timeline: { currentTime: 500 },
  };
  const context = vm.createContext({
    Infinity,
    Math: math,
    PacePetsDashboardPreferences: {
      addMotionPreferenceChangeListener: vi.fn((listener) => {
        preferenceListener = listener;
        return removePreferenceListener;
      }),
      motionPreferenceEnabled: () => motionEnabled,
    },
    addEventListener: vi.fn(),
    document,
    getComputedStyle: () => ({ color: "rgb(1 2 3)" }),
    innerHeight: 600,
    innerWidth: 800,
    removeEventListener: vi.fn(),
    requestAnimationFrame,
  });
  runScript(context, "dashboard-sync-monk-escape-motion.js");
  runScript(context, "dashboard-sync-monk-escape-scene.js");
  return {
    context,
    createdElements,
    document,
    preferenceListener: () => preferenceListener,
    removePreferenceListener,
    requestAnimationFrame,
    setMotionEnabled: (enabled) => {
      motionEnabled = enabled;
    },
    source,
  };
}

describe("Perfect Sync monk compositor lifecycle", () => {
  it("uses retained transform animations and rebuilds without a resize jump", () => {
    const harness = createHarness();
    const onStop = vi.fn();
    const scene = harness.context.PacePetsDashboardSyncMonkEscape.create(
      { querySelector: () => harness.source },
      onStop,
    );
    const [horizontal, vertical] = harness.createdElements;

    expect(scene).not.toBeNull();
    expect(harness.requestAnimationFrame).not.toHaveBeenCalled();
    expect(horizontal.animationRecords).toHaveLength(1);
    expect(vertical.animationRecords).toHaveLength(1);
    for (const { animation, keyframes, timing } of [
      horizontal.animationRecords[0],
      vertical.animationRecords[0],
    ]) {
      expect(keyframes.every(({ transform }) => transform)).toBe(true);
      expect(timing).toMatchObject({
        easing: "linear",
        fill: "both",
        iterations: Infinity,
      });
      expect(animation.startTime).toBe(500);
      expect(animation.play).toHaveBeenCalledOnce();
    }

    const oldAnimations = [
      horizontal.animationRecords[0].animation,
      vertical.animationRecords[0].animation,
    ];
    oldAnimations[0].currentTime = 1_000;
    oldAnimations[1].currentTime = 1_000;
    const expectedX =
      harness.context.PacePetsDashboardSyncMonkEscapeMotion.stateAt(
        scene.axisMotions[0].track,
        1_000,
      );
    const expectedY =
      harness.context.PacePetsDashboardSyncMonkEscapeMotion.stateAt(
        scene.axisMotions[1].track,
        1_000,
      );
    harness.context.innerWidth = 500;
    harness.context.innerHeight = 400;
    scene.handleResize();

    expect(horizontal.animationRecords).toHaveLength(2);
    expect(vertical.animationRecords).toHaveLength(2);
    expect(
      oldAnimations.every(({ cancel }) => cancel.mock.calls.length === 1),
    ).toBe(true);
    expect(scene.axisMotions[0].track.position).toBeCloseTo(expectedX.position);
    expect(scene.axisMotions[0].track.velocity).toBeCloseTo(expectedX.velocity);
    expect(scene.axisMotions[1].track.position).toBeCloseTo(expectedY.position);
    expect(scene.axisMotions[1].track.velocity).toBeCloseTo(expectedY.velocity);
    expect(harness.requestAnimationFrame).not.toHaveBeenCalled();

    harness.document.hidden = true;
    scene.handleVisibilityChange();
    const resizedAnimations = [
      horizontal.animationRecords[1].animation,
      vertical.animationRecords[1].animation,
    ];
    expect(
      resizedAnimations.every(({ pause }) => pause.mock.calls.length === 1),
    ).toBe(true);
    harness.document.hidden = false;
    scene.handleVisibilityChange();
    expect(
      resizedAnimations.every(({ play }) => play.mock.calls.length === 2),
    ).toBe(true);

    harness.setMotionEnabled(false);
    harness.preferenceListener()();
    expect(
      resizedAnimations.every(({ cancel }) => cancel.mock.calls.length === 1),
    ).toBe(true);
    expect(harness.removePreferenceListener).toHaveBeenCalledOnce();
    expect(horizontal.remove).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledWith(scene);
  });

  it("pauses the fading source icon at its captured float position", () => {
    const css = fs.readFileSync(
      path.join(extensionRoot, "dashboard-sync-effects.css"),
      "utf8",
    );

    expect(css).toMatch(
      /body\.has-sync-monk-escape \.pace-card\.pace-sync \.pace-icon \{[\s\S]*?animation-play-state: paused;[\s\S]*?will-change: auto;[\s\S]*?\}/,
    );
  });
});
