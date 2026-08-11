((root) => {
  "use strict";

  const AXIS_ANGLE_RAD = (-52 * Math.PI) / 180;
  const AXIS_LENGTH = 0.69;
  const IMAGE_OUTSET = 0.03;
  const MESH_COLUMNS = 28;
  const MESH_ROWS = 28;
  const PULSE_DURATION_MS = 2150;
  const ROOT = Object.freeze({ x: 0.2, y: 0.84 });
  const SURFACE_PADDING = 0.02;
  const IMAGE_RECT = Object.freeze({
    size: 1 + IMAGE_OUTSET * 2,
    x: -IMAGE_OUTSET,
    y: -IMAGE_OUTSET,
  });
  const NORMAL_AXIS_DELTA = Object.freeze({
    x: Math.cos(AXIS_ANGLE_RAD) * AXIS_LENGTH,
    y: Math.sin(AXIS_ANGLE_RAD) * AXIS_LENGTH,
  });
  const EXTREME_AXIS_DELTA = Object.freeze({
    x: NORMAL_AXIS_DELTA.x * 2.5,
    y: NORMAL_AXIS_DELTA.y * 2.1,
  });
  const RARE_AXIS_DELTA = Object.freeze({
    x: NORMAL_AXIS_DELTA.x * 9.210915,
    y: NORMAL_AXIS_DELTA.y * 5.534298,
  });

  function createScaleGeometry(delta) {
    const length = Math.hypot(delta.x, delta.y) || 1;
    const axis = Object.freeze({ x: delta.x / length, y: delta.y / length });
    return Object.freeze({
      axis,
      perp: Object.freeze({ x: -axis.y, y: axis.x }),
      progressLength: AXIS_LENGTH,
    });
  }

  function createAttachedGeometry(delta) {
    const source = createScaleGeometry(NORMAL_AXIS_DELTA);
    const target = createScaleGeometry(delta);
    const sourceLength = AXIS_LENGTH;
    const targetLength = Math.hypot(delta.x, delta.y) || 1;
    return Object.freeze({
      coneWidthGrowth: targetLength / sourceLength - 1,
      mode: "attached",
      sourceAxis: source.axis,
      sourceLength,
      sourcePerp: source.perp,
      targetAxis: target.axis,
      targetLength,
      targetPerp: target.perp,
    });
  }

  const ATTACHED_KEYFRAMES = Object.freeze([
    [0, 0],
    [0.16, 0],
    [0.28, 0.2],
    [0.52, 1],
    [0.68, 0.46],
    [0.82, 0.08],
    [0.9, 0],
    [1, 0],
  ]);
  const NORMAL_PROFILE = Object.freeze({
    activeStart: 0.08,
    axisScale: 0.38,
    exponent: 1.28,
    geometry: createScaleGeometry(NORMAL_AXIS_DELTA),
    keyframes: Object.freeze([
      [0, 0],
      [0.18, 0],
      [0.3, 0.18],
      [0.52, 1],
      [0.66, 0.58],
      [0.8, 0.12],
      [0.88, 0],
      [1, 0],
    ]),
    perpScale: 0.24,
  });
  const EXTREME_PROFILE = Object.freeze({
    activeStart: 0.18,
    exponent: 0.72,
    geometry: createAttachedGeometry(EXTREME_AXIS_DELTA),
    keyframes: ATTACHED_KEYFRAMES,
  });
  const RARE_PROFILE = Object.freeze({
    activeStart: 0.18,
    exponent: 0.72,
    geometry: createAttachedGeometry(RARE_AXIS_DELTA),
    keyframes: ATTACHED_KEYFRAMES,
  });
  const PROFILES = Object.freeze([
    NORMAL_PROFILE,
    EXTREME_PROFILE,
    RARE_PROFILE,
  ]);

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function interpolate(from, to, amount) {
    const eased = amount * amount * (3 - 2 * amount);
    return from + (to - from) * eased;
  }

  function pulseAmount(profile, phase) {
    for (let index = 1; index < profile.keyframes.length; index += 1) {
      const [time, value] = profile.keyframes[index];
      if (phase <= time) {
        const [previousTime, previousValue] = profile.keyframes[index - 1];
        const span = time - previousTime || 1;
        return interpolate(previousValue, value, (phase - previousTime) / span);
      }
    }
    return 0;
  }

  function strengthForProgress(progress, profile) {
    const active = clamp(
      (progress - profile.activeStart) / (1 - profile.activeStart),
    );
    return active ** profile.exponent;
  }

  function transformScalePoint(rect, profile, amount, point, result) {
    const { axis, perp, progressLength } = profile.geometry;
    const rootX = rect.x + ROOT.x * rect.size;
    const rootY = rect.y + ROOT.y * rect.size;
    const dx = point.x - rootX;
    const dy = point.y - rootY;
    const along = dx * axis.x + dy * axis.y;
    const across = dx * perp.x + dy * perp.y;
    const progress = clamp(along / (progressLength * rect.size));
    const strength = strengthForProgress(progress, profile) * amount;
    const stretchedAlong = along * (1 + profile.axisScale * strength);
    const stretchedAcross = across * (1 + profile.perpScale * strength);
    result.x = rootX + axis.x * stretchedAlong + perp.x * stretchedAcross;
    result.y = rootY + axis.y * stretchedAlong + perp.y * stretchedAcross;
    return result;
  }

  function transformAttachedPoint(rect, profile, amount, point, result) {
    const geometry = profile.geometry;
    const rootX = rect.x + ROOT.x * rect.size;
    const rootY = rect.y + ROOT.y * rect.size;
    const dx = point.x - rootX;
    const dy = point.y - rootY;
    const along = dx * geometry.sourceAxis.x + dy * geometry.sourceAxis.y;
    const across = dx * geometry.sourcePerp.x + dy * geometry.sourcePerp.y;
    const progress = clamp(along / (geometry.sourceLength * rect.size));
    const strength = strengthForProgress(progress, profile) * amount;
    const targetAlong = along * (geometry.targetLength / geometry.sourceLength);
    const targetAcross = across * (1 + geometry.coneWidthGrowth * progress);
    const targetX =
      rootX +
      geometry.targetAxis.x * targetAlong +
      geometry.targetPerp.x * targetAcross;
    const targetY =
      rootY +
      geometry.targetAxis.y * targetAlong +
      geometry.targetPerp.y * targetAcross;
    result.x = interpolate(point.x, targetX, strength);
    result.y = interpolate(point.y, targetY, strength);
    return result;
  }

  function transformPoint(rect, profile, amount, point, result = {}) {
    if (profile.geometry.mode === "attached") {
      return transformAttachedPoint(rect, profile, amount, point, result);
    }
    return transformScalePoint(rect, profile, amount, point, result);
  }

  function transformImagePoint(profile, amount, point, result = {}) {
    result.x = IMAGE_RECT.x + point.x * IMAGE_RECT.size;
    result.y = IMAGE_RECT.y + point.y * IMAGE_RECT.size;
    return transformPoint(IMAGE_RECT, profile, amount, result, result);
  }

  function includePoint(bounds, point) {
    bounds.left = Math.min(bounds.left, point.x);
    bounds.right = Math.max(bounds.right, point.x);
    bounds.top = Math.min(bounds.top, point.y);
    bounds.bottom = Math.max(bounds.bottom, point.y);
  }

  function boundsForPoint(point) {
    const bounds = {
      bottom: -Infinity,
      left: Infinity,
      right: -Infinity,
      top: Infinity,
    };
    for (const profile of PROFILES) {
      includePoint(bounds, transformImagePoint(profile, 0, point));
      includePoint(bounds, transformImagePoint(profile, 1, point));
    }
    return Object.freeze(bounds);
  }

  function createSurfaceBounds() {
    const bounds = {
      bottom: -Infinity,
      left: Infinity,
      right: -Infinity,
      top: Infinity,
    };
    const point = { x: 0, y: 0 };
    const transformed = { x: 0, y: 0 };
    for (const profile of PROFILES) {
      for (const amount of [0, 1]) {
        for (let row = 0; row <= MESH_ROWS; row += 1) {
          for (let column = 0; column <= MESH_COLUMNS; column += 1) {
            point.x = IMAGE_RECT.x + (column / MESH_COLUMNS) * IMAGE_RECT.size;
            point.y = IMAGE_RECT.y + (row / MESH_ROWS) * IMAGE_RECT.size;
            includePoint(
              bounds,
              transformPoint(IMAGE_RECT, profile, amount, point, transformed),
            );
          }
        }
      }
    }
    return Object.freeze({
      bottom: bounds.bottom + SURFACE_PADDING,
      left: bounds.left - SURFACE_PADDING,
      right: bounds.right + SURFACE_PADDING,
      top: bounds.top - SURFACE_PADDING,
    });
  }

  root.PacePetsDashboardPushStretchGeometry = Object.freeze({
    EXTREME_PROFILE,
    IMAGE_RECT,
    MESH_COLUMNS,
    MESH_ROWS,
    NORMAL_PROFILE,
    PULSE_DURATION_MS,
    RARE_PROFILE,
    SURFACE_BOUNDS: createSurfaceBounds(),
    boundsForPoint,
    pulseAmount,
    transformImagePoint,
    transformPoint,
  });
})(globalThis);
