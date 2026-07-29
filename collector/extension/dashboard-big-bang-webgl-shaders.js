(function attachPacePetsDashboardBigBangWebglShaders(root) {
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
uniform float u_localMs;
uniform float u_opacity;
uniform float u_seed;
uniform float u_time;

const float PI = 3.141592653589793;
float clampUnit(float value) {
  return clamp(value, 0.0, 1.0);
}
float easeOutCubic(float value) {
  float p = clampUnit(value);
  return 1.0 - pow(1.0 - p, 3.0);
}
float hash(vec2 point) {
  return fract(sin(dot(point + u_seed, vec2(127.1, 311.7))) * 43758.5453123);
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
float fbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 twist = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < 5; i += 1) {
    value += amplitude * noise(point);
    point = twist * point * 2.04 + vec2(13.7, 5.1);
    amplitude *= 0.52;
  }
  return value;
}
float ridge(float value) {
  return 1.0 - abs(value * 2.0 - 1.0);
}
float gaussian(float value, float width) {
  float boundedWidth = max(width, 0.0001);
  float shaped = value / boundedWidth;
  return exp(-shaped * shaped);
}
float seedHash(float salt) {
  return fract(sin((u_seed + salt) * 437.31) * 24634.6345);
}
float angularDelta(float angle, float target) {
  return abs(atan(sin(angle - target), cos(angle - target)));
}
float pulseWindow(
  float localSeconds,
  float start,
  float attack,
  float hold,
  float release
) {
  return smoothstep(start, start + attack, localSeconds) *
    (1.0 - smoothstep(start + attack + hold, start + attack + hold + release, localSeconds));
}
vec3 spectralColor(float angle, float radius, float grain) {
  vec3 blue = vec3(0.18, 0.42, 1.0);
  vec3 cyan = vec3(0.48, 0.9, 1.0);
  vec3 magenta = vec3(1.0, 0.22, 0.84);
  vec3 violet = vec3(0.5, 0.25, 1.0);
  vec3 gold = vec3(1.0, 0.78, 0.18);
  float warmBand = smoothstep(0.18, 0.95, sin(angle * 1.35 + grain * 4.0));
  float blueBand = smoothstep(-0.35, 0.95, cos(angle - 0.08));
  float pinkBand = smoothstep(-0.2, 0.9, sin(angle * 2.1 + radius * 2.8));
  vec3 color = mix(violet, magenta, pinkBand);
  color = mix(color, gold, warmBand * 0.58);
  return mix(color, mix(blue, cyan, grain), blueBand * 0.68);
}
vec3 temperatureShift(vec3 color, float bias, float strength) {
  return mix(color, color * mix(vec3(0.76, 0.9, 1.18), vec3(1.18, 0.96, 0.74), bias), strength);
}
float matterStar(vec2 grid, vec2 cell, float reveal, float fade) {
  float seed = hash(cell);
  float active = step(0.962, seed);
  vec2 offset = vec2(
    hash(cell + vec2(4.2, 8.7)),
    hash(cell + vec2(9.1, 2.4))
  );
  vec2 delta = grid - (cell + offset);
  float size = mix(160.0, 460.0, hash(cell + vec2(5.7, 1.9)));
  float twinkle = 0.72 + 0.28 * sin(u_time * 3.8 + seed * 19.0);
  return active * exp(-dot(delta, delta) * size) * twinkle * reveal * fade;
}
float matterField(vec2 fromCenter, float localSeconds) {
  float reveal = smoothstep(5.0, 8.2, localSeconds);
  float lateSparse = mix(1.0, 0.24, smoothstep(7.2, 10.1, localSeconds));
  float fade = (1.0 - smoothstep(9.15, 10.35, localSeconds)) * lateSparse;
  float drift = 1.0 + easeOutCubic((localSeconds - 4.0) / 8.2) * 0.86;
  vec2 grid = fromCenter / drift * mix(28.0, 54.0, reveal);
  vec2 baseCell = floor(grid);
  float stars = 0.0;
  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      stars += matterStar(grid, baseCell + vec2(float(x), float(y)), reveal, fade);
    }
  }
  return stars;
}
float crackRayEvent(
  float angle,
  float radius,
  float localSeconds,
  float rayAngle,
  float start,
  float reach,
  float width,
  float intensity
) {
  float age = max(0.0, localSeconds - start);
  float pulse = pulseWindow(localSeconds, start, 0.025, 0.16, 0.42);
  float head = mix(0.08, reach, easeOutCubic(age / 0.34));
  float radialGate =
    smoothstep(0.018, 0.075, radius) *
    (1.0 - smoothstep(head, head + 0.24, radius));
  float crooked =
    (fbm(vec2(radius * 5.8 + start * 5.7, rayAngle * 1.9)) - 0.5) *
    width *
    1.05;
  float trunk = gaussian(angularDelta(angle, rayAngle + crooked), width);
  float forkSeed = hash(vec2(start * 11.0, intensity * 3.7));
  float forkAngleA = rayAngle + mix(0.08, 0.22, forkSeed);
  float forkAngleB = rayAngle - mix(0.1, 0.26, hash(vec2(start * 7.3, reach)));
  float forkGate =
    smoothstep(0.05, 0.2, age) *
    smoothstep(0.18, 0.38, radius) *
    (1.0 - smoothstep(head * 0.82, head + 0.12, radius));
  float forks =
    gaussian(angularDelta(angle, forkAngleA - crooked * 0.18), width * 0.5) +
    gaussian(angularDelta(angle, forkAngleB + crooked * 0.16), width * 0.44);
  float broken =
    0.62 +
    0.38 * ridge(fbm(vec2(radius * 24.0 - age * 16.0, angle * 11.0 + start)));
  float sparks =
    pow(max(0.0, ridge(fbm(vec2(radius * 64.0 - age * 42.0, angle * 38.0))) - 0.2), 2.2);
  float gaps =
    smoothstep(0.08, 0.62, ridge(fbm(vec2(radius * 36.0 - age * 28.0, angle * 7.0))));
  return (trunk * 1.1 + forks * forkGate * 0.5 + sparks * 0.18) * broken * gaps * radialGate * pulse * intensity;
}
float volleyRayEvent(
  float angle,
  float radius,
  float localSeconds,
  float rayAngle,
  float start,
  float reach,
  float width,
  float intensity
) {
  float age = max(0.0, localSeconds - start);
  float pulse = pulseWindow(localSeconds, start, 0.018, 0.12, 0.34);
  float head = mix(0.07, reach, easeOutCubic(age / 0.24));
  float radialGate =
    smoothstep(0.018, 0.08, radius) *
    (1.0 - smoothstep(head, head + 0.16, radius));
  float shimmer = sin(radius * 13.0 + start * 29.0) * width * 0.22;
  float line = gaussian(angularDelta(angle, rayAngle + shimmer), width);
  float beads =
    pow(max(0.0, sin(radius * 86.0 - age * 52.0 + rayAngle * 11.0) * 0.5 - 0.12), 2.0);
  return line * (0.78 + beads) * radialGate * pulse * intensity;
}
float crackRayBurst(float angle, float radius, float localSeconds) {
  float joltAngle = -0.4 + hash(vec2(91.0, 4.0)) * 0.8;
  float cracks =
    crackRayEvent(angle, radius, localSeconds, joltAngle, 0.04, 1.85, 0.018, 3.1) +
    crackRayEvent(angle, radius, localSeconds, joltAngle + 1.72, 0.18, 1.42, 0.022, 1.65) +
    crackRayEvent(angle, radius, localSeconds, joltAngle - 2.08, 0.28, 1.54, 0.02, 1.52);

  float density = seedHash(71.0), cascade = 0.0;
  for (int i = 0; i < 42; i += 1) {
    float index = float(i);
    float seed = hash(vec2(index * 2.7, 5.9 + u_seed * 7.0));
    float rayAngle = -PI + 2.0 * PI * seed;
    float wave = floor(index / 9.0);
    float start = 0.26 + wave * 0.19 + hash(vec2(index, 3.4)) * 0.22;
    float reach = mix(1.08, 2.38, hash(vec2(index, 8.8)));
    float width = mix(0.006, 0.022, hash(vec2(index, 12.6)));
    float intensity = mix(0.46, 1.46, hash(vec2(index, 1.7))) * mix(0.82, 1.28, density) * mix(0.75, 1.35, smoothstep(0.3, 1.58, start));
    cascade += volleyRayEvent(
      angle,
      radius,
      localSeconds,
      rayAngle,
      start,
      reach,
      width,
      intensity * step(0.14 - density * 0.14, hash(vec2(index, 19.4)))
    );
  }

  float speedComb =
    pow(max(0.0, ridge(fbm(vec2(angle * 92.0 + u_seed * 5.0, radius * 1.6 - localSeconds * 3.0))) - 0.18), 2.1) *
    smoothstep(0.08, 0.3, radius) *
    (1.0 - smoothstep(2.18, 2.72, radius)) *
    pulseWindow(localSeconds, 1.05, 0.08, 0.34, 0.62);
  float crescendo = smoothstep(0.28, 1.5, localSeconds);
  float fade = 1.0 - smoothstep(2.18, 2.72, localSeconds);
  return (cracks + cascade * crescendo + speedComb * mix(0.98, 1.34, density)) * fade;
}
float hardRayBurst(float angle, float radius, float localSeconds) {
  float ignite =
    smoothstep(1.86, 2.28, localSeconds) *
    (1.0 - smoothstep(3.4, 4.55, localSeconds));
  float rayReach = mix(0.12, 3.0, easeOutCubic((localSeconds - 1.82) / 1.95));
  float reachGate =
    smoothstep(0.02, 0.12, radius) *
    (1.0 - smoothstep(rayReach, rayReach + 0.26, radius));
  float thickLane =
    pow(max(0.0, ridge(fbm(vec2(angle * 4.6 + u_seed * 3.0, 0.17))) - 0.34), 1.62);
  float midLane =
    pow(max(0.0, ridge(fbm(vec2(angle * 13.0 + u_seed, radius * 0.55))) - 0.32), 1.88);
  float hairline =
    pow(max(0.0, ridge(fbm(vec2(angle * 70.0, radius * 1.4 - localSeconds * 1.2))) - 0.3), 2.35);
  float segment =
    0.56 +
    0.44 * ridge(fbm(vec2(angle * 24.0, radius * 9.0 - localSeconds * 7.5)));
  float asymmetricGate = mix(
    pow(max(0.0, ridge(fbm(vec2(angle * 3.4 + u_seed * 4.0, 1.7))) - 0.14), 0.72),
    1.0,
    smoothstep(2.68, 3.16, localSeconds)
  );
  return (thickLane * 1.42 + midLane * 0.72 + hairline * 0.56) * segment * reachGate * ignite * asymmetricGate;
}
float beamCell(vec2 grid, vec2 cell, float burst) {
  float seed = hash(cell);
  float active = step(0.48, seed);
  float angularCenter = cell.x + hash(cell + vec2(8.1, 2.9));
  float radialCenter = cell.y + hash(cell + vec2(1.7, 9.4));
  float angularWidth = mix(0.012, 0.072, hash(cell + vec2(2.3, 6.8)));
  float radialWidth = mix(0.58, 2.1, hash(cell + vec2(7.6, 4.1)));
  float angular = gaussian(grid.x - angularCenter, angularWidth);
  float radial = gaussian(grid.y - radialCenter, radialWidth);
  return active * angular * mix(0.34, 0.94, radial) * mix(0.42, 1.18, burst);
}
float radialBeamField(float angle, float radius, float localSeconds, float burst) {
  float radialGate =
    smoothstep(0.035, 0.22, radius) *
    (1.0 - smoothstep(2.25, 2.72, radius));
  float angularJitter =
    fbm(vec2(angle * 0.9 + u_seed * 4.0, radius * 1.6 - localSeconds * 0.42));
  vec2 grid = vec2(
    angle * mix(46.0, 104.0, burst) + angularJitter * 3.4,
    radius * mix(3.5, 8.8, burst) - localSeconds * 1.2
  );
  vec2 baseCell = floor(grid);
  float beams = 0.0;
  for (int y = -1; y <= 1; y += 1) {
    for (int x = -1; x <= 1; x += 1) {
      beams += beamCell(grid, baseCell + vec2(float(x), float(y)), burst);
    }
  }
  float speedLine =
    pow(max(0.0, ridge(fbm(vec2(angle * 18.0, radius * 8.0 - localSeconds * 3.4))) - 0.28), 1.85);
  return (beams * 0.7 + speedLine * 0.82) * radialGate;
}

float broadRayVeil(float angle, float radius, float localSeconds, float burst) {
  float veil =
    pow(max(0.0, ridge(fbm(vec2(angle * 5.2, radius * 1.5 - localSeconds * 0.5))) - 0.12), 1.55);
  return
    veil *
    smoothstep(0.08, 0.42, radius) *
    (1.0 - smoothstep(2.05, 2.8, radius)) *
    mix(0.1, 0.78, burst);
}

void main() {
  float localSeconds = u_localMs * 0.001;
  if (localSeconds >= 10.35) { gl_FragColor = vec4(0.0); return; }
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 space = uv * 2.0 - 1.0;
  space.x *= u_resolution.x / u_resolution.y;

  vec2 center = vec2(
    -0.12 + 0.028 * sin(u_seed * 0.013),
    -0.02 + 0.022 * cos(u_seed * 0.017)
  );
  vec2 fromCenter = space - center;
  float radius = length(fromCenter);
  vec2 direction = fromCenter / max(radius, 0.0001);
  float angle = atan(fromCenter.y, fromCenter.x);

  float attack = smoothstep(0.0, 0.34, localSeconds);
  float crackBurst = 0.0;
  if (localSeconds > 0.04 && localSeconds < 2.72)
    crackBurst = crackRayBurst(angle, radius, localSeconds);
  float rayBurst = 0.0;
  if (localSeconds > 1.86 && localSeconds < 4.55)
    rayBurst = hardRayBurst(angle, radius, localSeconds);
  float burst = easeOutCubic((localSeconds - 2.0) / 4.0);
  float reach = mix(0.14, 2.55, easeOutCubic((localSeconds - 2.0) / 4.7));
  float reached = 1.0 - smoothstep(reach, reach + 0.36, radius);
  float leadingFront =
    smoothstep(reach - 0.42, reach, radius) *
    (1.0 - smoothstep(reach, reach + 0.18, radius));
  float impact = smoothstep(1.85, 2.65, localSeconds);
  float plasmaFade = 1.0 - smoothstep(6.2, 9.05, localSeconds);
  float cssFade = clampUnit(u_opacity);
  float visible = attack * cssFade;

  vec2 warpA = vec2(
    fbm(space * 1.1 + vec2(localSeconds * 0.12, -localSeconds * 0.08)),
    fbm(space * 1.0 + vec2(-localSeconds * 0.07, localSeconds * 0.11))
  ) - 0.5;
  vec2 tornSpace = space + warpA * (0.22 + burst * 0.28);
  float grain = fbm(tornSpace * 3.2 - direction * localSeconds * 0.45);
  float reachEnergy = reached * impact * plasmaFade;
  float beams = 0.0, veil = 0.0, filaments = 0.0;
  float filamentRange =
    smoothstep(0.04, 0.2, radius) *
    (1.0 - smoothstep(2.0, 2.75, radius));
  if (localSeconds > 1.85 && localSeconds < 9.05) {
    beams = radialBeamField(angle, radius, localSeconds, burst) * reachEnergy;
    veil = broadRayVeil(angle, radius, localSeconds, burst) * reachEnergy;
    float fine = fbm(tornSpace * 12.0 + direction * localSeconds * 1.6);
    filaments =
      pow(max(0.0, ridge(fine) - 0.18), 2.0) *
      filamentRange *
      (0.28 + burst * 1.42) *
      reachEnergy;
  }
  float shockFront = 0.0;
  if (localSeconds > 1.85 && localSeconds < 7.1)
    shockFront = leadingFront * impact *
      (1.0 - smoothstep(4.9, 7.1, localSeconds));
  float core = 0.0;
  if (localSeconds < 7.55)
    core =
      gaussian(radius, mix(0.055, 0.44, smoothstep(0.0, 4.1, localSeconds))) *
      (1.0 - smoothstep(4.9, 7.55, localSeconds)) *
      2.55;
  float whiteBloom = 0.0;
  if (localSeconds > 2.05 && localSeconds < 7.3)
    whiteBloom =
      gaussian(radius, mix(0.16, 0.84, burst)) *
      smoothstep(2.05, 3.02, localSeconds) *
      (1.0 - smoothstep(5.1, 7.3, localSeconds)) *
      0.92;
  float residue = 0.0;
  if (localSeconds > 2.6 && localSeconds < 9.4) {
    residue =
      pow(max(0.0, fbm(tornSpace * 8.0 + localSeconds * 0.18) - 0.42), 2.1) *
      smoothstep(2.6, 5.8, localSeconds) *
      (1.0 - smoothstep(7.0, 9.4, localSeconds)) *
      filamentRange;
  }
  float matter = 0.0;
  if (localSeconds > 5.0 && localSeconds < 10.35)
    matter = matterField(fromCenter, localSeconds);
  float temperatureBias = seedHash(23.7);

  vec3 plasma = temperatureShift(spectralColor(angle, radius, grain), temperatureBias, 0.34);
  vec3 rayWhite = temperatureShift(vec3(0.74, 0.92, 1.0), temperatureBias, 0.22);
  vec3 rayColor = mix(plasma, rayWhite, whiteBloom * 0.55);
  vec3 matterColor = mix(
    temperatureShift(vec3(0.7, 0.9, 1.0), temperatureBias, 0.2),
    temperatureShift(vec3(1.0, 0.86, 0.48), temperatureBias, 0.24),
    hash(floor(fromCenter * 22.0))
  );
  vec3 color =
    vec3(1.0) * (core * 1.55 + whiteBloom * 1.2) +
    rayColor * (crackBurst * 1.25 + rayBurst * 1.72 + shockFront * 1.05 + beams * 1.28 + veil * 0.52 + filaments * 0.72 + residue * 0.46) +
    matterColor * matter * 1.7;

  float alpha =
    clamp(core * 0.58 + whiteBloom * 0.44 + crackBurst * 0.42 + rayBurst * 0.68 + shockFront * 0.42 + beams * 0.48 + veil * 0.22 + filaments * 0.28 + residue * 0.2 + matter, 0.0, 1.0) *
    visible;
  gl_FragColor = vec4(color * visible, alpha);
}
`;

  root.PacePetsDashboardBigBangWebglShaders = Object.freeze({
    FRAGMENT_SHADER_SOURCE,
    VERTEX_SHADER_SOURCE,
  });
})(globalThis);
