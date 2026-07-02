import { beforeAll, describe, expect, it, vi } from "vitest";

import { importExtensionScript } from "./helpers/extension-runtime.js";

beforeAll(async () => {
  await importExtensionScript(
    "collector/extension/dashboard-big-bang-audio-timeline.js",
  );
  await importExtensionScript(
    "collector/extension/dashboard-transition-audio.js",
  );
});

describe("Dashboard transition audio timeline normalization", () => {
  it("normalizes declarative timeline definitions", () => {
    const transitionAudio = globalThis.PacePetsDashboardTransitionAudio;

    const timeline = transitionAudio.normalizeTimeline({
      group: "special",
      id: "bigBang",
      steps: [
        { atMs: 120, clipId: "intro", fadeInMs: 80, volume: 0.5 },
        { clipId: null },
        { atMs: -20, clipId: "return" },
      ],
    });

    expect(timeline).toEqual({
      group: "special",
      id: "bigBang",
      steps: [
        {
          atMs: 120,
          clipId: "intro",
          durationMs: undefined,
          fadeInMs: 80,
          fadeOutMs: 0,
          group: null,
          loop: undefined,
          offsetMs: 0,
          volume: 0.5,
        },
        {
          atMs: 0,
          clipId: "return",
          durationMs: undefined,
          fadeInMs: 0,
          fadeOutMs: 0,
          group: null,
          loop: undefined,
          offsetMs: 0,
          volume: undefined,
        },
      ],
      stopFadeOutMs: 300,
    });
  });
});

describe("Dashboard transition audio default timelines", () => {
  it("includes the Big Bang two-part music timeline", () => {
    const transitionAudio = globalThis.PacePetsDashboardTransitionAudio;

    expect(transitionAudio.normalizeTimeline("bigBang")).toMatchObject({
      group: "bigBang",
      id: "bigBang",
      steps: [
        {
          atMs: 1000,
          clipId: "bigBangTransition",
          durationMs: 10000,
          fadeInMs: 500,
          fadeOutMs: 500,
        },
        {
          atMs: 10500,
          clipId: "bigBangReturn",
          durationMs: 12500,
          fadeInMs: 500,
          fadeOutMs: 2500,
        },
      ],
    });
  });
});

describe("Dashboard transition audio playback scheduling", () => {
  it("schedules timeline clips through the audio manager", () => {
    const transitionAudio = globalThis.PacePetsDashboardTransitionAudio;
    const audioManager = {
      scheduleClip: vi.fn(() => Promise.resolve(null)),
      stopGroup: vi.fn(),
      timelineStartTime: vi.fn(() => 24),
    };
    const controller = transitionAudio.createController({ audioManager });

    const handle = controller.playTimeline({
      group: "bigBang",
      id: "bigBang",
      steps: [
        { clipId: "bigBangTransition", fadeInMs: 120 },
        { atMs: 14000, clipId: "bigBangReturn", volume: 0.6 },
      ],
    });

    expect(handle).toMatchObject({ group: "bigBang", id: "bigBang" });
    expect(audioManager.scheduleClip).toHaveBeenCalledTimes(2);
    expect(audioManager.scheduleClip).toHaveBeenNthCalledWith(
      1,
      "bigBangTransition",
      {
        atMs: 0,
        durationMs: undefined,
        fadeInMs: 120,
        fadeOutMs: 0,
        group: "bigBang",
        loop: undefined,
        offsetMs: 0,
        timelineStartAt: 24,
        volume: undefined,
      },
    );
    expect(audioManager.scheduleClip).toHaveBeenNthCalledWith(
      2,
      "bigBangReturn",
      {
        atMs: 14000,
        durationMs: undefined,
        fadeInMs: 0,
        fadeOutMs: 0,
        group: "bigBang",
        loop: undefined,
        offsetMs: 0,
        timelineStartAt: 24,
        volume: 0.6,
      },
    );
  });

  it("preloads unique timeline clips through the audio manager", async () => {
    const transitionAudio = globalThis.PacePetsDashboardTransitionAudio;
    const audioManager = {
      preloadClip: vi.fn(() => Promise.resolve(null)),
    };
    const controller = transitionAudio.createController({ audioManager });

    await controller.preloadTimeline({
      group: "bigBang",
      id: "bigBang",
      steps: [
        { clipId: "bigBangTransition" },
        { atMs: 120, clipId: "bigBangTransition" },
        { clipId: "bigBangReturn" },
      ],
    });

    expect(audioManager.preloadClip).toHaveBeenCalledTimes(2);
    expect(audioManager.preloadClip).toHaveBeenNthCalledWith(
      1,
      "bigBangTransition",
    );
    expect(audioManager.preloadClip).toHaveBeenNthCalledWith(
      2,
      "bigBangReturn",
    );
  });
});

describe("Dashboard transition audio playback stop", () => {
  it("stops pending playback idempotently and fades handles that arrive later", async () => {
    const transitionAudio = globalThis.PacePetsDashboardTransitionAudio;
    let resolveHandle;
    const handle = {};
    const audioManager = {
      fadeOut: vi.fn(),
      scheduleClip: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveHandle = resolve;
          }),
      ),
      stopGroup: vi.fn(),
    };
    const controller = transitionAudio.createController({ audioManager });

    const playback = controller.playTimeline({
      group: "bigBang",
      id: "bigBang",
      stopFadeOutMs: 450,
      steps: [{ clipId: "bigBangTransition" }],
    });

    playback.stop({ fadeOutMs: 500 });
    playback.stop({ fadeOutMs: 800 });
    resolveHandle(handle);
    await Promise.resolve();

    expect(audioManager.stopGroup).toHaveBeenCalledTimes(1);
    expect(audioManager.stopGroup).toHaveBeenCalledWith("bigBang", {
      fadeOutMs: 500,
    });
    expect(audioManager.fadeOut).toHaveBeenCalledWith(handle, {
      durationMs: 500,
    });
  });
});
