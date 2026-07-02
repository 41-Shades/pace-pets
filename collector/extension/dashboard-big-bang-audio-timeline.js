(function attachPacePetsDashboardBigBangAudioTimeline(root) {
  "use strict";

  const BIG_BANG_AUDIO_GROUP = "bigBang";
  const BIG_BANG_AUDIO_START_DELAY_MS = 1000;
  const BIG_BANG_CLIP_FADE_MS = 500;
  const BIG_BANG_FIRST_CLIP_DURATION_MS = 10000;
  const BIG_BANG_SECOND_CLIP_AT_MS =
    BIG_BANG_AUDIO_START_DELAY_MS +
    BIG_BANG_FIRST_CLIP_DURATION_MS -
    BIG_BANG_CLIP_FADE_MS;
  const BIG_BANG_SECOND_CLIP_DURATION_MS = 12500;
  const BIG_BANG_FINAL_FADE_MS = 2500;

  const BIG_BANG_TIMELINE = Object.freeze({
    group: BIG_BANG_AUDIO_GROUP,
    id: "bigBang",
    steps: Object.freeze([
      Object.freeze({
        atMs: BIG_BANG_AUDIO_START_DELAY_MS,
        clipId: "bigBangTransition",
        durationMs: BIG_BANG_FIRST_CLIP_DURATION_MS,
        fadeInMs: BIG_BANG_CLIP_FADE_MS,
        fadeOutMs: BIG_BANG_CLIP_FADE_MS,
      }),
      Object.freeze({
        atMs: BIG_BANG_SECOND_CLIP_AT_MS,
        clipId: "bigBangReturn",
        durationMs: BIG_BANG_SECOND_CLIP_DURATION_MS,
        fadeInMs: BIG_BANG_CLIP_FADE_MS,
        fadeOutMs: BIG_BANG_FINAL_FADE_MS,
      }),
    ]),
    stopFadeOutMs: 300,
  });

  const TIMELINES = Object.freeze({
    bigBang: BIG_BANG_TIMELINE,
  });

  root.PacePetsDashboardBigBangAudioTimeline = Object.freeze({
    BIG_BANG_CLIP_FADE_MS,
    BIG_BANG_FINAL_FADE_MS,
    BIG_BANG_AUDIO_START_DELAY_MS,
    BIG_BANG_FIRST_CLIP_DURATION_MS,
    BIG_BANG_SECOND_CLIP_AT_MS,
    BIG_BANG_SECOND_CLIP_DURATION_MS,
    BIG_BANG_TIMELINE,
    TIMELINES,
  });
})(globalThis);
