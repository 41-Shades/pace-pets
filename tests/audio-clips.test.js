import { importExtensionScript } from "./helpers/extension-runtime.js";

import { beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  globalThis.chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://pace-pets/${path}`,
    },
  };
  await importExtensionScript("collector/extension/audio-clips.js");
});

describe("PacePetsAudioClips", () => {
  it("owns the packaged audio registry defaults", () => {
    const clips = globalThis.PacePetsAudioClips;

    expect(clips.AUDIO_BASE_PATH).toBe("assets/audio");
    expect(clips.AUDIO_CHANNELS).toEqual(["music", "effects"]);
    expect(clips.DEFAULT_CHANNEL).toBe("effects");
    expect(clips.CLIPS).toMatchObject({
      bigBangReturn: {
        channel: "music",
        group: "bigBang",
        path: "assets/audio/the-great-beyond-60s-72p5s.m4a",
      },
      bigBangTransition: {
        channel: "music",
        group: "bigBang",
        path: "assets/audio/the-great-beyond-21s-31s.m4a",
      },
    });
    expect(clips.pathForClip("bigBangTransition")).toBe(
      "assets/audio/the-great-beyond-21s-31s.m4a",
    );
  });

  it("normalizes clip metadata and resolves extension URLs", () => {
    const clips = globalThis.PacePetsAudioClips;
    const registry = {
      chime: {
        channel: "music",
        group: "bigBang",
        loop: true,
        path: "assets/audio/chime.webm",
        volume: 0.5,
      },
      fallback: {
        channel: "unsupported",
        path: "assets/audio/fallback.webm",
      },
    };

    expect(clips.clipForId("chime", registry)).toEqual({
      channel: "music",
      group: "bigBang",
      id: "chime",
      loop: true,
      path: "assets/audio/chime.webm",
      volume: 0.5,
    });
    expect(clips.clipForId("fallback", registry)).toEqual({
      channel: "effects",
      group: "global",
      id: "fallback",
      loop: false,
      path: "assets/audio/fallback.webm",
      volume: 1,
    });
    expect(clips.urlForClip("chime", registry)).toBe(
      "chrome-extension://pace-pets/assets/audio/chime.webm",
    );
  });
});
