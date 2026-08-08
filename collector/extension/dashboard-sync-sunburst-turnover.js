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
    let changed = false;
    for (let index = state.activeSwaps.length - 1; index >= 0; index -= 1) {
      const swap = state.activeSwaps[index];
      if (timestamp - swap.startedAtMs < swap.durationMs) {
        continue;
      }

      const rayIndex = rays.indexOf(swap.outRay);
      if (rayIndex !== -1) {
        rays.splice(rayIndex, 1);
        changed = true;
      }
      state.activeSwaps.splice(index, 1);
    }
    return changed;
  }

  function emitDueSwaps(state, timestamp, rays, createRay, intensity) {
    let changed = false;
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
      changed = true;
    }
    return changed;
  }

  function create() {
    const state = {
      activeSwaps: [],
      nextSwapAtMs: 0,
    };

    return Object.freeze({
      fadeState(ray) {
        for (const swap of state.activeSwaps) {
          if (swap.inRay === ray) {
            return Object.freeze({
              durationMs: swap.durationMs,
              mode: 1,
              startedAtMs: swap.startedAtMs,
            });
          }
          if (swap.outRay === ray) {
            return Object.freeze({
              durationMs: swap.durationMs,
              mode: -1,
              startedAtMs: swap.startedAtMs,
            });
          }
        }
        return null;
      },
      update(timestamp, rays, createRay, progress) {
        const intensity = intensityFor(progress);
        let changed = retireFinishedSwaps(state, timestamp, rays);
        if (intensity <= 0) {
          return changed;
        }
        changed =
          emitDueSwaps(state, timestamp, rays, createRay, intensity) || changed;
        return changed;
      },
    });
  }

  root.PacePetsDashboardSyncSunburstTurnover = Object.freeze({
    INCOMING_FADE_PORTION,
    OUTGOING_FADE_DELAY,
    create,
  });
})(globalThis);
