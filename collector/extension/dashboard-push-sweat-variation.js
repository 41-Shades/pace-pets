((root) => {
  "use strict";

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function pulseSeed(cycleIndex, salt) {
    return Math.imul((cycleIndex + 1) >>> 0, salt) >>> 0;
  }

  function randomSource(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomOffset(random, amount) {
    return (random() * 2 - 1) * amount;
  }

  function shuffledTracks(tracks, random) {
    const result = [...tracks];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function randomIntegerInRange(random, [min, max]) {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function selectedTrackCount(random, options) {
    if (options.countRange) {
      return randomIntegerInRange(random, options.countRange);
    }
    return options.count || null;
  }

  function selectTracks(sourceTracks, random, count) {
    if (!count) {
      return sourceTracks;
    }
    const result = [];
    while (result.length < count) {
      result.push(...shuffledTracks(sourceTracks, random));
    }
    return result
      .slice(0, count)
      .sort((first, second) => first.start - second.start);
  }

  function variedTrack(track, random, variation) {
    return {
      ...track,
      angle: track.angle + randomOffset(random, variation.angle),
      lift: track.lift * (1 + randomOffset(random, variation.lift)),
      size: track.size * (1 + randomOffset(random, variation.size)),
      spin: track.spin + randomOffset(random, variation.spin),
      start: clamp(
        track.start + randomOffset(random, variation.start),
        0.1,
        0.76,
      ),
      sway: Math.max(0, track.sway + randomOffset(random, variation.sway)),
      travelX: track.travelX * (1 + randomOffset(random, variation.travel)),
    };
  }

  function buildTracks(sourceTracks, seed, options) {
    const random = randomSource(seed);
    const selectedTracks = selectTracks(
      sourceTracks,
      random,
      selectedTrackCount(random, options),
    );
    return Object.freeze(
      selectedTracks.map((sourceTrack) =>
        Object.freeze(variedTrack(sourceTrack, random, options.variation)),
      ),
    );
  }

  function createTrackCache(sourceTracks, options) {
    const cache = new Map();
    return {
      forCycle(cycleIndex) {
        const seed = pulseSeed(cycleIndex, options.salt);
        if (!cache.has(seed)) {
          cache.set(seed, buildTracks(sourceTracks, seed, options));
        }
        if (cache.size > 4) {
          cache.delete(cache.keys().next().value);
        }
        return cache.get(seed);
      },
    };
  }

  root.PacePetsDashboardPushSweatVariation = Object.freeze({
    createTrackCache,
  });
})(globalThis);
