import { describe, expect, it, vi } from "vitest";

import { createSpecialTransitionHarness as createHarness } from "./helpers/dashboard-special-transition-harness.js";

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

    controller.settleHiddenSpecialTransitions();
    expect(controller.bigBangTransitionPending).toBe(true);

    documentState.hidden = false;
    controller.playPendingSpecialTransition();

    expect(calls.bigBang).toBe(1);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionInFlight).toBe(true);
  });

  it("queues Big Bang until special-transition readiness is released", () => {
    const transitionAudio = {
      playTimeline: vi.fn(() => null),
    };
    const { calls, controller, states } = createHarness({ transitionAudio });
    let ready = false;
    const audioAllowed = vi.fn(() => true);
    controller.specialTransitionAudioAllowed = audioAllowed;
    controller.specialTransitionAudioReady = () => ready;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(controller.bigBangTransitionPending).toBe(true);
    expect(controller.bigBangTransitionInFlight).toBe(false);
    expect(calls.bigBang).toBe(0);
    expect(transitionAudio.playTimeline).not.toHaveBeenCalled();
    expect(audioAllowed).not.toHaveBeenCalled();

    controller.playPendingSpecialTransition();
    expect(calls.bigBang).toBe(0);
    expect(audioAllowed).not.toHaveBeenCalled();

    ready = true;
    controller.playPendingSpecialTransition();

    expect(calls.bigBang).toBe(1);
    expect(transitionAudio.playTimeline).toHaveBeenCalledWith("bigBang");
    expect(audioAllowed).toHaveBeenCalledOnce();
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionInFlight).toBe(true);
  });
});

describe("Special transition readiness", () => {
  it("does not launch when audio settles during a newer dashboard load", () => {
    const transitionAudio = { playTimeline: vi.fn(() => null) };
    const { calls, controller, states } = createHarness({ transitionAudio });
    let audioReady = false;
    let dashboardReady = false;
    controller.specialTransitionAudioReady = () => audioReady;
    controller.specialTransitionStateReady = () => dashboardReady;

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    audioReady = true;
    controller.playPendingSpecialTransition();

    expect(calls.bigBang).toBe(0);
    expect(controller.bigBangTransitionPending).toBe(true);

    controller.currentPaceLevel = () => states.on.className;
    controller.updateSpecialTransitionState(states.bigBang, states.on);
    dashboardReady = true;
    controller.playPendingSpecialTransition();

    expect(calls.bigBang).toBe(0);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(transitionAudio.playTimeline).not.toHaveBeenCalled();
  });

  it("uses live audio after waiting only for dashboard state", () => {
    const transitionAudio = { playTimeline: vi.fn(() => null) };
    const { controller, states } = createHarness({ transitionAudio });
    let dashboardReady = false;
    controller.specialTransitionAudioAllowed = vi.fn(() => false);
    controller.specialTransitionAudioReady = () => true;
    controller.specialTransitionStateReady = () => dashboardReady;
    controller.specialTransitionUsesStartupAudioOutcome = () => false;

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    dashboardReady = true;
    controller.playPendingSpecialTransition();

    expect(transitionAudio.playTimeline).toHaveBeenCalledWith("bigBang");
    expect(controller.specialTransitionAudioAllowed).not.toHaveBeenCalled();
  });
});

describe("Special transition startup audio outcome", () => {
  it("does not consume a startup outcome after the gate has already settled", () => {
    const { calls, controller } = createHarness();
    controller.specialTransitionAudioAllowed = vi.fn(() => false);

    controller.playSingularityTransition();

    expect(calls.singularity).toBe(1);
    expect(controller.specialTransitionAudioAllowed).not.toHaveBeenCalled();
    expect(controller.singularityTransitionInFlight).toBe(true);
  });
});

describe("Big Bang transition playback", () => {
  it("does not start Big Bang while another special transition is active", () => {
    const { calls, controller, states } = createHarness();
    controller.singularityTransitionInFlight = true;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(calls.bigBang).toBe(0);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionInFlight).toBe(false);
  });

  it("requests the Big Bang audio timeline when motion is enabled", () => {
    const transitionAudio = {
      playTimeline: vi.fn(() => null),
    };
    const { controller, states } = createHarness({ transitionAudio });

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(transitionAudio.playTimeline).toHaveBeenCalledWith("bigBang");
  });

  it("replays Big Bang when the dashboard is already in Big Bang", () => {
    const { calls, controller, scene, states } = createHarness();

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    const response = controller.replayBigBangTransition();

    expect(response).toEqual({ ok: true });
    expect(scene.stopCount).toBe(1);
    expect(calls.bigBang).toBe(2);
    expect(controller.bigBangTransitionInFlight).toBe(true);
  });

  it("rejects Big Bang replay when another state is visible", () => {
    const { calls, controller, states } = createHarness();
    controller.currentPaceLevel = () => states.on.className;

    const response = controller.replayBigBangTransition();

    expect(response).toEqual({
      ok: false,
      message: "Open the dashboard on Big Bang before replaying Big Bang.",
    });
    expect(calls.bigBang).toBe(0);
    expect(controller.bigBangTransitionInFlight).toBe(false);
  });

  it("does not request transition audio when motion is disabled", () => {
    const transitionAudio = {
      playTimeline: vi.fn(() => null),
    };
    const { controller, states } = createHarness({
      motionEnabled: false,
      transitionAudio,
    });

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(transitionAudio.playTimeline).not.toHaveBeenCalled();
  });

  it("uses a settled false outcome for the initial special-state render", () => {
    const transitionAudio = {
      playTimeline: vi.fn(() => null),
    };
    const { calls, controller, states } = createHarness({ transitionAudio });
    controller.specialTransitionAudioAllowed = vi.fn(() => false);
    controller.specialTransitionAudioReady = () => true;
    controller.specialTransitionUsesStartupAudioOutcome = () => true;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(calls.bigBang).toBe(1);
    expect(controller.specialTransitionAudioAllowed).toHaveBeenCalledOnce();
    expect(transitionAudio.playTimeline).not.toHaveBeenCalled();
    expect(controller.bigBangTransitionInFlight).toBe(true);
  });

  it("uses live audio when the first trigger occurs after preparation", () => {
    const transitionAudio = { playTimeline: vi.fn(() => null) };
    const { controller, states } = createHarness({ transitionAudio });
    controller.specialTransitionAudioAllowed = vi.fn(() => false);
    controller.specialTransitionAudioReady = () => true;
    controller.specialTransitionUsesStartupAudioOutcome = () => false;

    controller.updateSpecialTransitionState(states.on, states.bigBang);

    expect(transitionAudio.playTimeline).toHaveBeenCalledWith("bigBang");
    expect(controller.specialTransitionAudioAllowed).not.toHaveBeenCalled();
  });

  it("stops active transition audio when special transitions stop", () => {
    const audioHandle = { stop: vi.fn() };
    const transitionAudio = {
      playTimeline: vi.fn(() => audioHandle),
    };
    const { controller, states } = createHarness({ transitionAudio });

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    controller.stopSpecialTransitions();

    expect(audioHandle.stop).toHaveBeenCalledWith({ fadeOutMs: 300 });
  });
});

describe("Special transition hidden lifecycle", () => {
  it("settles active Big Bang immediately when the dashboard becomes hidden", async () => {
    const audioHandle = { stop: vi.fn() };
    const transitionAudio = {
      playTimeline: vi.fn(() => audioHandle),
    };
    const { calls, controller, documentState, scene, states } = createHarness({
      transitionAudio,
    });
    let finishScene;
    scene.play = () =>
      new Promise((resolve) => {
        finishScene = resolve;
      });

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    documentState.hidden = true;
    controller.pauseHiddenDocumentMotionEffects();

    expect(scene.stopCount).toBe(1);
    expect(audioHandle.stop).toHaveBeenCalledWith({ fadeOutMs: 0 });
    expect(controller.bigBangTransitionRunId).toBe(2);
    finishScene(true);
    await Promise.resolve();
    expect(controller.bigBangTransitionInFlight).toBe(false);
    expect(controller.bigBangTransitionPending).toBe(false);
    expect(controller.bigBangTransitionScene).toBe(null);

    documentState.hidden = false;
    controller.playPendingSpecialTransition();
    expect(calls.bigBang).toBe(1);
  });

  it("stops a Big Bang audio tail after its visual has completed", async () => {
    const audioHandle = { stop: vi.fn() };
    const { controller, documentState, scene, states } = createHarness({
      transitionAudio: { playTimeline: () => audioHandle },
    });
    scene.play = () => Promise.resolve(true);

    controller.updateSpecialTransitionState(states.on, states.bigBang);
    await vi.waitFor(() =>
      expect(controller.bigBangTransitionInFlight).toBe(false),
    );

    documentState.hidden = true;
    controller.pauseHiddenDocumentMotionEffects();

    expect(audioHandle.stop).toHaveBeenCalledWith({ fadeOutMs: 0 });
    expect(controller.bigBangTransitionPending).toBe(false);
  });

  it("settles active Singularity without queueing a visible-tab replay", () => {
    const { calls, controller, documentState, scene, states } = createHarness();
    controller.currentPaceLevel = () => states.singularity.className;

    controller.playSingularityTransition();
    documentState.hidden = true;
    controller.pauseHiddenDocumentMotionEffects();

    expect(scene.stopCount).toBe(1);
    expect(controller.singularityTransitionInFlight).toBe(false);
    expect(controller.singularityTransitionPending).toBe(false);
    expect(controller.singularityTransitionRunId).toBe(2);
    expect(controller.singularityTransitionScene).toBe(null);

    documentState.hidden = false;
    controller.playPendingSpecialTransition();
    expect(calls.singularity).toBe(1);
  });
});
