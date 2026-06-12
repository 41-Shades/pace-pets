(function attachPacePetsDashboardSingularityBlackHoleV2Shaders(root) {
  "use strict";

  const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  const FRAGMENT_SHADER_SOURCE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_progress;
uniform float u_time;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float clampUnit(float value) {
  return clamp(value, 0.0, 1.0);
}

float easeInOut(float value) {
  float p = clampUnit(value);
  return p * p * (3.0 - 2.0 * p);
}

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 eased = local * local * (3.0 - 2.0 * local);

  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, eased.x), mix(c, d, eased.x), eased.y);
}

float ring(float radius, float target, float width) {
  float delta = (radius - target) / max(width, 0.0001);
  return exp(-delta * delta);
}

float lineGlow(float value, float width) {
  float boundedWidth = max(width, 0.0001);
  return exp(-(value * value) / (boundedWidth * boundedWidth));
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec3 plasmaColor(float angle, float grain, float front) {
  vec3 blue = vec3(0.08, 0.48, 1.0);
  vec3 gold = vec3(1.0, 0.62, 0.28);
  vec3 white = vec3(0.96, 0.98, 1.0);
  float heat = smoothstep(-0.4, 0.9, sin(angle * 1.8 + grain * 2.4));
  vec3 color = mix(blue, gold, heat);
  return mix(color, white, front * 0.34);
}

float glintFromCell(vec2 grid, vec2 cell) {
  float seed = hash(cell);
  float active = step(0.88, seed);
  vec2 offset = vec2(
    hash(cell + vec2(5.2, 1.3)),
    hash(cell + vec2(8.1, 2.7))
  ) - 0.5;
  vec2 point = cell + 0.5 + offset * 0.58;
  vec2 delta = grid - point;
  vec2 shaped = delta * vec2(1.0, 1.58);
  float core = exp(-dot(shaped, shaped) * 46.0);
  float twinkle = 0.62 + 0.38 * sin(u_time * 2.8 + seed * 18.0);
  return active * core * twinkle * (0.45 + seed * 0.55);
}

float infallGlints(vec2 fromCenter, float radius, float progress) {
  float localRadius = length(fromCenter) / max(radius, 0.0001);
  float visibleBand =
    smoothstep(1.46, 1.9, localRadius) *
    (1.0 - smoothstep(5.5, 6.4, localRadius));
  float reveal = smoothstep(0.46, 0.72, progress);
  float suction = smoothstep(0.72, 0.98, progress);
  vec2 planePoint = rotate2d(-0.14) * fromCenter;
  float planeMask = exp(
    -pow(planePoint.y / max(radius * 1.45, 0.0001), 2.0)
  );
  float angle = atan(fromCenter.y, fromCenter.x);
  float angleTrack =
    ((angle + PI) / TAU) * 46.0 +
    localRadius * suction * 1.36 -
    u_time * suction * 0.46;
  float radialTrack = (localRadius + u_time * suction * 0.24) * 4.3;
  vec2 grid = vec2(angleTrack, radialTrack);
  vec2 baseCell = floor(grid);
  float glints = 0.0;

  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      glints += glintFromCell(grid, baseCell + vec2(float(x), float(y)));
    }
  }

  return glints * visibleBand * mix(1.0, planeMask, suction * 0.82) * reveal * 0.72;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 space = uv * 2.0 - 1.0;
  space.x *= u_resolution.x / u_resolution.y;

  float progress = easeInOut(u_progress);
  vec2 center = mix(vec2(-0.22, 0.2), vec2(0.1, 0.02), progress);
  vec2 fromCenter = space - center;
  float distanceFromCenter = length(fromCenter);
  float radius = mix(0.012, 0.34, progress);
  float gravityPulse = exp(-pow((progress - 0.93) / 0.045, 2.0));

  vec2 diskPoint = rotate2d(-0.14 + sin(u_time * 0.16) * 0.025) * fromCenter;
  diskPoint.y /= 0.31;
  float diskRadius = length(diskPoint);
  float angle = atan(diskPoint.y, diskPoint.x);
  float swirl = angle * 2.2 + u_time * 0.82 - diskRadius * 6.4;
  float grain = noise(vec2(swirl, diskRadius * 14.0 - u_time * 0.42));
  float frontSide = smoothstep(-0.18, 0.86, sin(angle));
  float blueShift = smoothstep(-0.18, 0.95, cos(angle + 0.16));
  float warmTail = smoothstep(-0.08, 0.92, -cos(angle + 0.28));

  float approachMask = smoothstep(0.06, 0.38, progress);
  float innerDisk = ring(diskRadius, radius * 1.42, radius * 0.13);
  float outerDisk = ring(diskRadius, radius * 1.98, radius * 0.24);
  float diskEdge = ring(diskRadius, radius * 1.18, radius * 0.08);
  float arcBreakup = 0.52 + 0.48 * sin(swirl + grain * 5.0);
  float disk = (innerDisk * 1.16 + outerDisk * 0.44 + diskEdge * 0.18) * approachMask;
  disk *= 0.58 + frontSide * 0.64;
  disk *= 0.64 + arcBreakup * 0.36;
  disk *= 1.0 + gravityPulse * 0.12;

  float ellipseRadius = length(vec2(fromCenter.x, fromCenter.y / 0.62));
  float horizon = 1.0 - smoothstep(radius * 0.73, radius * 0.79, ellipseRadius);
  float ringAsymmetry = 0.66 + blueShift * 0.34 + frontSide * 0.14;
  ringAsymmetry *= 0.92 + 0.08 * sin(angle * 5.0 + grain * 3.0 + u_time * 0.5);
  float photonRing = ring(ellipseRadius, radius * 1.02, radius * 0.026);
  photonRing *=
    smoothstep(0.1, 0.32, progress) *
    (1.0 + gravityPulse * 0.42) *
    ringAsymmetry;
  float photonBloom = ring(ellipseRadius, radius * 1.06, radius * 0.12);
  photonBloom *= smoothstep(0.16, 0.38, progress) * (0.22 + blueShift * 0.16);

  float glow = 1.0 - smoothstep(0.0, radius * 4.3, distanceFromCenter);
  glow *= approachMask * (0.28 + gravityPulse * 0.08);
  float lens = ring(distanceFromCenter, radius * 2.8, radius * 0.75);
  lens *= approachMask * (0.28 + gravityPulse * 0.14);
  float gravityVeil =
    (1.0 - smoothstep(radius * 1.25, radius * 4.5, distanceFromCenter)) *
    approachMask *
    (0.05 + gravityPulse * 0.15);

  float normalizedY = fromCenter.y / max(radius, 0.0001);
  float jetWobble = sin(normalizedY * 4.1 + u_time * 1.7) * radius * 0.025;
  float jetCore = lineGlow(fromCenter.x + jetWobble, radius * 0.052);
  float jetSheath = lineGlow(
    fromCenter.x - jetWobble * 0.45,
    radius * 0.18
  );
  float jetReach = smoothstep(radius * 0.82, radius * 3.9, abs(fromCenter.y));
  float jetFade = 1.0 - smoothstep(radius * 5.2, radius * 6.3, abs(fromCenter.y));
  float jetNoise = 0.72 + 0.28 * noise(vec2(normalizedY * 2.3 + u_time * 0.45, fromCenter.x / max(radius, 0.0001) * 8.0));
  float jetAsymmetry = mix(
    0.54,
    1.0,
    smoothstep(-0.4, 1.0, fromCenter.y / max(radius * 4.2, 0.0001))
  );
  float jetMask = jetReach * jetFade * smoothstep(0.42, 0.82, progress);
  float jetCoreLight = jetCore * jetMask * jetNoise * jetAsymmetry;
  float jetSheathLight = jetSheath * jetMask * jetNoise * jetAsymmetry;
  float jets = jetCoreLight + jetSheathLight * 0.46;

  float glints = infallGlints(fromCenter, radius, progress);
  vec3 glintColor = mix(
    vec3(0.68, 0.9, 1.0),
    vec3(1.0, 0.72, 0.42),
    smoothstep(-0.2, 0.86, sin(angle * 1.7 + grain * 2.0))
  );
  vec3 diskColor = plasmaColor(angle, grain, frontSide);
  diskColor = mix(diskColor, vec3(0.1, 0.56, 1.0), blueShift * 0.46);
  diskColor = mix(diskColor, vec3(1.0, 0.48, 0.24), warmTail * 0.2);
  diskColor *= 0.68 + blueShift * 0.5 + frontSide * 0.16;

  vec3 color = vec3(0.0);
  color += vec3(0.08, 0.28, 0.78) * glow;
  color += vec3(0.3, 0.65, 1.0) * lens;
  color += vec3(0.88, 0.96, 1.0) * jetCoreLight * 0.78;
  color += vec3(0.36, 0.66, 1.0) * jetSheathLight * 0.42;
  color += diskColor * disk;
  color += vec3(0.55, 0.78, 1.0) * photonBloom;
  color += mix(vec3(1.0, 0.88, 0.72), vec3(0.86, 0.96, 1.0), blueShift) * photonRing * 1.34;
  color += glintColor * glints;
  color = mix(color, vec3(0.0), gravityVeil);
  color = mix(color, vec3(0.0), horizon);

  float alpha = max(glow, lens);
  alpha = max(alpha, gravityVeil);
  alpha = max(alpha, jetCoreLight * 0.72 + jetSheathLight * 0.34);
  alpha = max(alpha, disk * 0.88);
  alpha = max(alpha, photonBloom * 0.55);
  alpha = max(alpha, photonRing * 0.95);
  alpha = max(alpha, glints * 0.76);
  alpha = max(alpha, horizon);

  gl_FragColor = vec4(color, clampUnit(alpha));
}
`;

  root.PacePetsDashboardSingularityBlackHoleV2Shaders = Object.freeze({
    FRAGMENT_SHADER_SOURCE,
    VERTEX_SHADER_SOURCE,
  });
})(globalThis);
