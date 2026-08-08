import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const extensionRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../collector/extension",
);

function loadMotion() {
  const context = vm.createContext({});
  const source = fs.readFileSync(
    path.join(extensionRoot, "dashboard-sync-monk-escape-motion.js"),
    "utf8",
  );
  new vm.Script(source, {
    filename: "dashboard-sync-monk-escape-motion.js",
  }).runInContext(context);
  return context.PacePetsDashboardSyncMonkEscapeMotion;
}

describe("Perfect Sync monk compositor trajectory", () => {
  it("creates constant-speed loops through both walls", () => {
    const motion = loadMotion();
    const positive = motion.createAxisTrack({
      maximum: 100,
      position: 30,
      velocity: 10,
    });
    const negative = motion.createAxisTrack({
      maximum: 100,
      position: 30,
      velocity: -10,
    });

    expect(positive.durationMs).toBe(20_000);
    expect(positive.keyframes).toEqual([
      { offset: 0, position: 30 },
      { offset: 0.35, position: 100 },
      { offset: 0.85, position: 0 },
      { offset: 1, position: 30 },
    ]);
    expect(negative.keyframes).toEqual([
      { offset: 0, position: 30 },
      { offset: 0.15, position: 0 },
      { offset: 0.65, position: 100 },
      { offset: 1, position: 30 },
    ]);
  });

  it("projects exact positions and outgoing directions across repeated bounces", () => {
    const motion = loadMotion();
    const track = motion.createAxisTrack({
      maximum: 100,
      position: 30,
      velocity: 10,
    });

    expect(motion.stateAt(track, 6_000)).toEqual({
      position: 90,
      velocity: 10,
    });
    expect(motion.stateAt(track, 7_000)).toEqual({
      position: 100,
      velocity: -10,
    });
    expect(motion.stateAt(track, 8_000)).toEqual({
      position: 90,
      velocity: -10,
    });
    expect(motion.stateAt(track, 17_000)).toEqual({
      position: 0,
      velocity: 10,
    });
    expect(motion.stateAt(track, 46_000)).toEqual({
      position: 90,
      velocity: 10,
    });
  });

  it("contains resized tracks and keeps numerically static axes still", () => {
    const motion = loadMotion();

    expect(motion.fitAxisState({ position: 80, velocity: 12 }, 50)).toEqual({
      position: 50,
      velocity: -12,
    });
    expect(motion.fitAxisState({ position: -5, velocity: -12 }, 50)).toEqual({
      position: 0,
      velocity: 12,
    });

    const staticTrack = motion.createAxisTrack({
      maximum: 100,
      position: 40,
      velocity: 0.0000001,
    });
    expect(staticTrack.moving).toBe(false);
    expect(staticTrack.durationMs).toBe(0);
    expect(motion.stateAt(staticTrack, 1_000_000)).toEqual({
      position: 40,
      velocity: 0.0000001,
    });
  });
});
