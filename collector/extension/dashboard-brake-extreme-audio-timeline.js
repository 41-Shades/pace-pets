(function attachPacePetsDashboardBrakeExtremeAudioTimeline(root) {
  "use strict";

  const BRAKE_EXTREME_AUDIO_GROUP = "brakeExtreme";
  const BRAKE_EXTREME_AUDIO_START_DELAY_MS = 0;
  const BRAKE_EXTREME_AUDIO_OFFSET_MS = 0;
  const BRAKE_EXTREME_AUDIO_DURATION_MS = 3750;
  const BRAKE_EXTREME_AUDIO_FADE_OUT_MS = 750;
  const BRAKE_EXTREME_AUDIO_VOLUME = 0.85;

  const BRAKE_EXTREME_TIMELINE = Object.freeze({
    group: BRAKE_EXTREME_AUDIO_GROUP,
    id: "brakeExtreme",
    steps: Object.freeze([
      Object.freeze({
        atMs: BRAKE_EXTREME_AUDIO_START_DELAY_MS,
        clipId: "brakeExtremeBurst",
        durationMs: BRAKE_EXTREME_AUDIO_DURATION_MS,
        fadeOutMs: BRAKE_EXTREME_AUDIO_FADE_OUT_MS,
        offsetMs: BRAKE_EXTREME_AUDIO_OFFSET_MS,
        volume: BRAKE_EXTREME_AUDIO_VOLUME,
      }),
    ]),
    stopFadeOutMs: BRAKE_EXTREME_AUDIO_FADE_OUT_MS,
  });

  const TIMELINES = Object.freeze({
    brakeExtreme: BRAKE_EXTREME_TIMELINE,
  });

  root.PacePetsDashboardBrakeExtremeAudioTimeline = Object.freeze({
    BRAKE_EXTREME_AUDIO_DURATION_MS,
    BRAKE_EXTREME_AUDIO_FADE_OUT_MS,
    BRAKE_EXTREME_AUDIO_OFFSET_MS,
    BRAKE_EXTREME_AUDIO_START_DELAY_MS,
    BRAKE_EXTREME_AUDIO_VOLUME,
    BRAKE_EXTREME_TIMELINE,
    TIMELINES,
  });
})(globalThis);
