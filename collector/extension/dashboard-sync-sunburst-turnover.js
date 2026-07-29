((root) => {
  "use strict";

  const CATCH_UP_RESET_MS = 900;
  const FADE_DURATION_MAX_MS = 980;
  const FADE_DURATION_MIN_MS = 720;
  const INCOMING_FADE_PORTION = 0.42;
  const MAX_ACTIVE_SWAPS = 10;
  const OUTGOING_FADE_DELAY = 0.24;
  const SWAP_INTERVAL_MAX_MS = 520;
  const SWAP_INTERVAL_MIN_MS = 150;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function randomBetween(from, to) {
    return mix(from, to, Math.random());
  }

  function randomIndex(length) {
    return Math.floor(Math.random() * length);
  }

  function intensityFor(progress) {
    if (progress < 0.5) {
      return 0;
    }
    if (progress < 0.8) {
      return mix(0.16, 0.4, smooth((progress - 0.5) / 0.3));
    }
    return mix(0.4, 1, smooth((progress - 0.8) / 0.2));
  }

  function nextSwapAt(timestamp, intensity) {
    return (
      timestamp +
      randomBetween(SWAP_INTERVAL_MIN_MS, SWAP_INTERVAL_MAX_MS) /
        clamp(intensity, 0.16, 1)
    );
  }

  function rayLayerCompare(first, second) {
    return first.layer - second.layer;
  }

  function activeRays(swaps) {
    return new Set(swaps.flatMap((swap) => [swap.inRay, swap.outRay]));
  }

  function candidateRays(rays, swaps) {
    const active = activeRays(swaps);
    return rays.filter((ray) => !active.has(ray));
  }

  function createSwap(timestamp, rays, swaps, createRay) {
    const candidates = candidateRays(rays, swaps);
    if (candidates.length === 0) {
      return null;
    }

    const outRay = candidates[randomIndex(candidates.length)];
    const inRay = createRay();
    const durationMs = randomBetween(
      FADE_DURATION_MIN_MS,
      FADE_DURATION_MAX_MS,
    );
    rays.push(inRay);
    rays.sort(rayLayerCompare);
    return {
      durationMs,
      inRay,
      outRay,
      startedAtMs: timestamp,
    };
  }

  function retireFinishedSwaps(state, timestamp, rays) {
    for (let index = state.activeSwaps.length - 1; index >= 0; index -= 1) {
      const swap = state.activeSwaps[index];
      if (timestamp - swap.startedAtMs < swap.durationMs) {
        continue;
      }

      const rayIndex = rays.indexOf(swap.outRay);
      if (rayIndex !== -1) {
        rays.splice(rayIndex, 1);
      }
      state.activeSwaps.splice(index, 1);
    }
  }

  function emitDueSwaps(state, timestamp, rays, createRay, intensity) {
    if (state.nextSwapAtMs === 0) {
      state.nextSwapAtMs = nextSwapAt(timestamp, intensity);
    }
    if (timestamp - state.nextSwapAtMs > CATCH_UP_RESET_MS) {
      state.nextSwapAtMs = timestamp;
    }

    let swapPasses = 0;
    const activeSwapLimit = Math.max(
      1,
      Math.round(MAX_ACTIVE_SWAPS * intensity),
    );
    while (
      timestamp >= state.nextSwapAtMs &&
      state.activeSwaps.length < activeSwapLimit &&
      swapPasses < 3
    ) {
      const swap = createSwap(timestamp, rays, state.activeSwaps, createRay);
      if (!swap) {
        break;
      }
      state.activeSwaps.push(swap);
      state.nextSwapAtMs = nextSwapAt(timestamp, intensity);
      swapPasses += 1;
    }
  }

  function fadeProgress(timestamp, swap) {
    return smooth(clamp((timestamp - swap.startedAtMs) / swap.durationMs));
  }

  function incomingOpacity(timestamp, swap) {
    return smooth(
      clamp(
        (timestamp - swap.startedAtMs) /
          swap.durationMs /
          INCOMING_FADE_PORTION,
      ),
    );
  }

  function outgoingOpacity(timestamp, swap) {
    return (
      1 -
      smooth(
        clamp(
          (fadeProgress(timestamp, swap) - OUTGOING_FADE_DELAY) /
            (1 - OUTGOING_FADE_DELAY),
        ),
      )
    );
  }

  function create() {
    const state = {
      activeSwaps: [],
      nextSwapAtMs: 0,
      opacities: new Map(),
    };

    return Object.freeze({
      opacities(timestamp, rays, createRay, progress) {
        const opacities = state.opacities;
        opacities.clear();
        const intensity = intensityFor(progress);
        retireFinishedSwaps(state, timestamp, rays);
        if (intensity <= 0) {
          return null;
        }
        emitDueSwaps(state, timestamp, rays, createRay, intensity);
        if (state.activeSwaps.length === 0) {
          return null;
        }

        for (const swap of state.activeSwaps) {
          opacities.set(swap.inRay, incomingOpacity(timestamp, swap));
          opacities.set(swap.outRay, outgoingOpacity(timestamp, swap));
        }
        return opacities;
      },
    });
  }

  root.PacePetsDashboardSyncSunburstTurnover = Object.freeze({ create });
})(globalThis);
