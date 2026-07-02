(function attachPacePetsDashboardTransitionAudio(root) {
  "use strict";

  const BIG_BANG_AUDIO_TIMELINE = root.PacePetsDashboardBigBangAudioTimeline;
  const DEFAULT_STOP_FADE_OUT_MS = 300;
  const TIMELINES = Object.freeze({
    ...(BIG_BANG_AUDIO_TIMELINE?.TIMELINES || {}),
  });

  function finiteMilliseconds(value, fallback = 0) {
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  }

  function optionalMilliseconds(value) {
    return Number.isFinite(value) ? Math.max(0, value) : undefined;
  }

  function normalizedStep(step) {
    if (!step?.clipId) {
      return null;
    }

    return Object.freeze({
      atMs: finiteMilliseconds(step.atMs),
      clipId: step.clipId,
      durationMs: optionalMilliseconds(step.durationMs),
      fadeInMs: finiteMilliseconds(step.fadeInMs),
      fadeOutMs: finiteMilliseconds(step.fadeOutMs),
      group: step.group || null,
      loop: step.loop === true ? true : undefined,
      offsetMs: finiteMilliseconds(step.offsetMs),
      volume: Number.isFinite(step.volume) ? step.volume : undefined,
    });
  }

  function normalizeTimeline(timelineOrId, timelines = TIMELINES) {
    const timeline =
      typeof timelineOrId === "string" ? timelines[timelineOrId] : timelineOrId;
    if (!timeline) {
      return null;
    }

    const id =
      timeline.id || (typeof timelineOrId === "string" ? timelineOrId : null);
    const steps = (Array.isArray(timeline.steps) ? timeline.steps : [])
      .map(normalizedStep)
      .filter(Boolean);
    if (!id || steps.length === 0) {
      return null;
    }

    return Object.freeze({
      group: timeline.group || id,
      id,
      steps: Object.freeze(steps),
      stopFadeOutMs: finiteMilliseconds(
        timeline.stopFadeOutMs,
        DEFAULT_STOP_FADE_OUT_MS,
      ),
    });
  }

  function timelineClipIds(timeline) {
    return [...new Set(timeline.steps.map((step) => step.clipId))];
  }

  class TransitionAudioPlayback {
    constructor({ audioManager, group, stopFadeOutMs }) {
      this.audioManager = audioManager;
      this.group = group;
      this.pending = new Set();
      this.stopFadeOutMs = stopFadeOutMs;
      this.stopped = false;
    }

    track(promise) {
      this.pending.add(promise);
      promise
        .then((handle) => {
          this.pending.delete(promise);
          if (handle && this.stopped) {
            this.audioManager.fadeOut(handle, {
              durationMs: this.stopFadeOutMs,
            });
          }
        })
        .catch((error) => {
          this.pending.delete(promise);
          console.warn("Pace Pets transition audio failed:", error);
        });
    }

    stop({ fadeOutMs = this.stopFadeOutMs } = {}) {
      if (this.stopped) {
        return;
      }

      this.stopped = true;
      this.stopFadeOutMs = finiteMilliseconds(fadeOutMs, this.stopFadeOutMs);
      this.audioManager.stopGroup(this.group, {
        fadeOutMs: this.stopFadeOutMs,
      });
    }
  }

  class TransitionAudioController {
    constructor({ audioManager = null, timelines = TIMELINES } = {}) {
      this.activeByGroup = new Map();
      this.audioManager = audioManager;
      this.timelines = timelines;
    }

    playTimeline(timelineOrId) {
      const timeline = normalizeTimeline(timelineOrId, this.timelines);
      if (!timeline || !this.audioManager) {
        return null;
      }

      const activePlayback = this.activeByGroup.get(timeline.group);
      if (activePlayback) {
        activePlayback.stop({ fadeOutMs: 0 });
        this.activeByGroup.delete(timeline.group);
      }

      const playback = new TransitionAudioPlayback({
        audioManager: this.audioManager,
        group: timeline.group,
        stopFadeOutMs: timeline.stopFadeOutMs,
      });
      this.activeByGroup.set(timeline.group, playback);

      const timelineStartAt = this.audioManager.timelineStartTime?.();
      for (const step of timeline.steps) {
        const group = step.group || timeline.group;
        const options = {
          atMs: step.atMs,
          durationMs: step.durationMs,
          fadeInMs: step.fadeInMs,
          fadeOutMs: step.fadeOutMs,
          group,
          loop: step.loop,
          offsetMs: step.offsetMs,
          volume: step.volume,
        };
        if (Number.isFinite(timelineStartAt)) {
          options.timelineStartAt = timelineStartAt;
        }
        const promise = this.audioManager.scheduleClip(step.clipId, options);
        playback.track(promise);
      }

      return Object.freeze({
        group: timeline.group,
        id: timeline.id,
        stop: (options) => {
          playback.stop(options);
          this.activeByGroup.delete(timeline.group);
        },
      });
    }

    stopTimeline(timelineOrId, { fadeOutMs = DEFAULT_STOP_FADE_OUT_MS } = {}) {
      const timeline = normalizeTimeline(timelineOrId, this.timelines);
      const group =
        timeline?.group ||
        (typeof timelineOrId === "string" ? timelineOrId : timelineOrId?.group);
      if (!group || !this.audioManager) {
        return;
      }

      const playback = this.activeByGroup.get(group);
      if (playback) {
        playback.stop({ fadeOutMs });
        this.activeByGroup.delete(group);
        return;
      }

      this.audioManager.stopGroup(group, { fadeOutMs });
    }

    preloadTimeline(timelineOrId) {
      const timeline = normalizeTimeline(timelineOrId, this.timelines);
      if (!timeline || !this.audioManager?.preloadClip) {
        return Promise.resolve([]);
      }

      return Promise.all(
        timelineClipIds(timeline).map((clipId) =>
          this.audioManager.preloadClip(clipId),
        ),
      );
    }
  }

  function createController(options) {
    return new TransitionAudioController(options);
  }

  root.PacePetsDashboardTransitionAudio = Object.freeze({
    DEFAULT_STOP_FADE_OUT_MS,
    TIMELINES,
    createController,
    normalizeTimeline,
  });
})(globalThis);
