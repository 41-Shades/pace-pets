(function attachPacePetsAudioClips(root) {
  "use strict";

  const AUDIO_BASE_PATH = "assets/audio";
  const AUDIO_CHANNELS = Object.freeze(["music", "effects"]);
  const DEFAULT_CHANNEL = "effects";
  const DEFAULT_GROUP = "global";
  const CLIPS = Object.freeze({
    brakeExtremeBurst: Object.freeze({
      channel: "effects",
      group: "brakeExtreme",
      path: `${AUDIO_BASE_PATH}/brake-extreme-burst.m4a`,
    }),
    bigBangReturn: Object.freeze({
      channel: "music",
      group: "bigBang",
      path: `${AUDIO_BASE_PATH}/the-great-beyond-60s-72p5s.m4a`,
    }),
    bigBangTransition: Object.freeze({
      channel: "music",
      group: "bigBang",
      path: `${AUDIO_BASE_PATH}/the-great-beyond-21s-31s.m4a`,
    }),
  });

  function normalizeChannel(channel) {
    return AUDIO_CHANNELS.includes(channel) ? channel : DEFAULT_CHANNEL;
  }

  function normalizeClip(id, clip) {
    if (!id || !clip?.path) {
      return null;
    }

    return Object.freeze({
      channel: normalizeChannel(clip.channel),
      group: clip.group || DEFAULT_GROUP,
      id,
      loop: clip.loop === true,
      path: clip.path,
      volume: Number.isFinite(clip.volume) ? clip.volume : 1,
    });
  }

  function clipForId(id, clips = CLIPS) {
    return normalizeClip(id, clips[id]);
  }

  function pathForClip(id, clips = CLIPS) {
    return clipForId(id, clips)?.path || null;
  }

  function urlForClip(id, clips = CLIPS, runtime = root.chrome?.runtime) {
    const path = pathForClip(id, clips);
    return path && runtime?.getURL ? runtime.getURL(path) : path;
  }

  root.PacePetsAudioClips = Object.freeze({
    AUDIO_BASE_PATH,
    AUDIO_CHANNELS,
    CLIPS,
    DEFAULT_CHANNEL,
    DEFAULT_GROUP,
    clipForId,
    normalizeChannel,
    pathForClip,
    urlForClip,
  });
})(globalThis);
