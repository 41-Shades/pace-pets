((root) => {
  "use strict";

  const VERTEX_SHADER_SOURCE = `
    precision highp float;

    attribute vec4 a_geometry;
    attribute vec4 a_meta;
    attribute vec4 a_motionA;
    attribute vec4 a_motionB;
    attribute vec4 a_timing;
    attribute vec4 a_tone;

    uniform float u_finishedAtMs;
    uniform float u_frameOpacity;
    uniform float u_halfSize;
    uniform float u_progress;
    uniform float u_radius;
    uniform float u_timeMs;

    varying float v_alpha;
    varying float v_baseHalfWidth;
    varying float v_blur;
    varying float v_cross;
    varying float v_gradientT;
    varying vec4 v_tone;
    varying float v_tipLightness;

    float smoothValue(float value) {
      return value * value * (3.0 - 2.0 * value);
    }

    float turnoverOpacity(float mode, float startedAtMs, float durationMs) {
      if (mode > 0.5) {
        float progress = clamp(
          (u_timeMs - startedAtMs) / durationMs / 0.42,
          0.0,
          1.0
        );
        return smoothValue(progress);
      }
      if (mode < -0.5) {
        float progress = smoothValue(
          clamp((u_timeMs - startedAtMs) / durationMs, 0.0, 1.0)
        );
        return 1.0 - smoothValue(clamp((progress - 0.24) / 0.76, 0.0, 1.0));
      }
      return 1.0;
    }

    float lengthScale() {
      if (u_finishedAtMs < 0.0 || u_progress < 1.0) {
        return 1.0;
      }
      float primary = sin(
        u_timeMs / a_motionA.y * 6.28318530718 + a_motionA.z
      ) * 0.72;
      float secondary = sin(
        u_timeMs / a_motionA.w * 6.28318530718 + a_motionB.x
      ) * 0.28;
      float target = clamp(1.0 + (primary + secondary) * a_motionA.x, 0.93, 1.08);
      float ramp = smoothValue(
        clamp((u_timeMs - u_finishedAtMs) / 4200.0, 0.0, 1.0)
      );
      return mix(1.0, target, ramp);
    }

    void main() {
      float isOuter = a_meta.x;
      float side = a_geometry.w;
      float rayProgress = smoothValue(
        clamp((u_progress - a_timing.x) / a_timing.y, 0.0, 1.0)
      );
      float radius = mix(
        u_radius * 0.03,
        u_radius * a_meta.z * lengthScale(),
        isOuter
      ) * rayProgress;
      float halfAngle = mix(
        a_geometry.y * a_geometry.z,
        a_geometry.y,
        isOuter
      );
      float baseCross = radius * sin(halfAngle);
      float blurOutset = a_timing.z * 3.0;
      float along = radius * cos(halfAngle);
      float cross = side * (baseCross + blurOutset);
      float cosine = cos(a_geometry.x);
      float sine = sin(a_geometry.x);
      vec2 position = vec2(
        along * cosine - cross * sine,
        along * sine + cross * cosine
      );

      gl_Position = vec4(
        position.x / u_halfSize,
        -position.y / u_halfSize,
        0.0,
        1.0
      );
      v_alpha = u_frameOpacity * a_meta.w * smoothValue(rayProgress) *
        turnoverOpacity(a_motionB.y, a_motionB.z, a_motionB.w);
      v_baseHalfWidth = baseCross;
      v_blur = a_timing.z;
      v_cross = cross;
      v_gradientT = a_meta.y;
      v_tipLightness = a_timing.w;
      v_tone = a_tone;
    }
  `;

  const FRAGMENT_SHADER_SOURCE = `
    precision mediump float;

    varying float v_alpha;
    varying float v_baseHalfWidth;
    varying float v_blur;
    varying float v_cross;
    varying float v_gradientT;
    varying vec4 v_tone;
    varying float v_tipLightness;

    vec3 hslToRgb(float hue, float saturation, float lightness) {
      vec3 channel = abs(mod(hue / 60.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0);
      vec3 rgb = clamp(channel - 1.0, 0.0, 1.0);
      float chroma = (1.0 - abs(2.0 * lightness - 1.0)) * saturation;
      return (rgb - 0.5) * chroma + lightness;
    }

    vec4 premultipliedStop(float lightness, float alpha) {
      vec3 rgb = hslToRgb(v_tone.x, v_tone.y, lightness);
      return vec4(rgb * alpha, alpha);
    }

    vec4 gradientColor(float progress) {
      vec4 clearStart = premultipliedStop(0.99, 0.0);
      vec4 highlight = premultipliedStop(v_tone.z, v_alpha * 0.74);
      vec4 body = premultipliedStop(v_tone.w, v_alpha);
      vec4 clearTip = premultipliedStop(v_tipLightness, 0.0);
      if (progress < 0.16) {
        return mix(clearStart, highlight, progress / 0.16);
      }
      if (progress < 0.62) {
        return mix(highlight, body, (progress - 0.16) / 0.46);
      }
      return mix(body, clearTip, (progress - 0.62) / 0.38);
    }

    void main() {
      float distanceFromEdge = abs(v_cross) - v_baseHalfWidth;
      float feather = max(v_blur, 0.75);
      float coverage = 1.0 - smoothstep(-feather, feather * 2.5, distanceFromEdge);
      gl_FragColor = gradientColor(clamp(v_gradientT, 0.0, 1.0)) * coverage;
    }
  `;

  root.PacePetsDashboardSyncSunburstShaders = Object.freeze({
    FRAGMENT_SHADER_SOURCE,
    VERTEX_SHADER_SOURCE,
  });
})(globalThis);
