((root) => {
  "use strict";

  const CORE_FINAL_OPACITY = 0.8;
  const TWO_PI = Math.PI * 2;

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function smooth(value) {
    return value * value * (3 - 2 * value);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function pointFor(origin, angle, radius) {
    return {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
    };
  }

  function rgba({ hue, saturation }, lightness, alpha) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }

  function drawCore(context, frame) {
    const coreProgress = smooth(clamp(frame.progress / 0.74));
    const radius = frame.radius * mix(0.06, 0.42, coreProgress);
    const opacity = smooth(clamp(frame.progress / 0.62)) * CORE_FINAL_OPACITY;
    const gradient = context.createRadialGradient(
      frame.origin.x,
      frame.origin.y,
      0,
      frame.origin.x,
      frame.origin.y,
      radius,
    );
    gradient.addColorStop(0, `rgb(255 255 255 / ${opacity})`);
    gradient.addColorStop(0.18, `rgb(255 251 178 / ${opacity * 0.9})`);
    gradient.addColorStop(0.46, `rgb(255 219 21 / ${opacity * 0.46})`);
    gradient.addColorStop(1, "rgb(255 242 137 / 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(frame.origin.x, frame.origin.y, radius, 0, TWO_PI);
    context.fill();

    const bloomRadius = frame.radius * mix(0.06, 0.28, coreProgress);
    const bloom = context.createRadialGradient(
      frame.origin.x,
      frame.origin.y,
      0,
      frame.origin.x,
      frame.origin.y,
      bloomRadius,
    );
    bloom.addColorStop(0, `rgb(255 255 255 / ${opacity * 0.62})`);
    bloom.addColorStop(0.35, `rgb(255 238 93 / ${opacity * 0.28})`);
    bloom.addColorStop(1, "rgb(255 245 170 / 0)");
    context.fillStyle = bloom;
    context.beginPath();
    context.arc(frame.origin.x, frame.origin.y, bloomRadius, 0, TWO_PI);
    context.fill();
  }

  function drawRay(context, frame, ray) {
    const rayProgress = smooth(
      clamp((frame.progress - ray.delay) / ray.duration),
    );
    if (rayProgress <= 0) {
      return;
    }

    const innerRadius = frame.radius * 0.03 * rayProgress;
    const lengthMultiplier = frame.rayLengthMultipliers?.get(ray) ?? 1;
    const outerRadius =
      frame.radius * ray.length * lengthMultiplier * rayProgress;
    const innerWidth = ray.width * ray.innerWidth;
    const leftInner = pointFor(
      frame.origin,
      ray.angle - innerWidth,
      innerRadius,
    );
    const rightInner = pointFor(
      frame.origin,
      ray.angle + innerWidth,
      innerRadius,
    );
    const leftOuter = pointFor(
      frame.origin,
      ray.angle - ray.width,
      outerRadius,
    );
    const rightOuter = pointFor(
      frame.origin,
      ray.angle + ray.width,
      outerRadius,
    );
    const tip = pointFor(frame.origin, ray.angle, outerRadius);
    const gradient = context.createLinearGradient(
      frame.origin.x,
      frame.origin.y,
      tip.x,
      tip.y,
    );
    const opacityMultiplier = frame.rayOpacityMultipliers?.get(ray) ?? 1;
    const opacity =
      frame.opacity * ray.alpha * opacityMultiplier * smooth(rayProgress);

    gradient.addColorStop(0, rgba(ray, 99, 0));
    gradient.addColorStop(
      0.16,
      rgba(ray, ray.highlightLightness, opacity * 0.74),
    );
    gradient.addColorStop(0.62, rgba(ray, ray.bodyLightness, opacity));
    gradient.addColorStop(1, rgba(ray, ray.tipLightness, 0));

    context.save();
    context.filter = ray.blur > 0 ? `blur(${ray.blur}px)` : "none";
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(leftInner.x, leftInner.y);
    context.lineTo(leftOuter.x, leftOuter.y);
    context.lineTo(rightOuter.x, rightOuter.y);
    context.lineTo(rightInner.x, rightInner.y);
    context.closePath();
    context.fill();
    context.restore();
  }

  root.PacePetsDashboardSyncSunburstDraw = Object.freeze({
    drawCore,
    drawRay,
  });
})(globalThis);
