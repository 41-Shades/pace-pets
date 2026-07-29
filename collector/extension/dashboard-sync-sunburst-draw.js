((root) => {
  "use strict";

  const CORE_FINAL_OPACITY = 0.8;
  const CORE_FINAL_RADIUS_SCALE = 0.42;
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

  function rgba({ hue, saturation }, lightness, alpha) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }

  function drawCore(context, frame) {
    const coreProgress = smooth(clamp(frame.progress / 0.74));
    const radius =
      frame.radius * mix(0.06, CORE_FINAL_RADIUS_SCALE, coreProgress);
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
    const outerRadius =
      frame.radius * ray.length * frame.rayLengthMultiplier * rayProgress;
    const { x: originX, y: originY } = frame.origin;
    const geometry = ray.geometry;
    const tipX = originX + geometry.tip.x * outerRadius;
    const tipY = originY + geometry.tip.y * outerRadius;
    const gradient = context.createLinearGradient(originX, originY, tipX, tipY);
    const opacity =
      frame.opacity *
      ray.alpha *
      frame.rayOpacityMultiplier *
      smooth(rayProgress);

    gradient.addColorStop(0, rgba(ray, 99, 0));
    gradient.addColorStop(
      0.16,
      rgba(ray, ray.highlightLightness, opacity * 0.74),
    );
    gradient.addColorStop(0.62, rgba(ray, ray.bodyLightness, opacity));
    gradient.addColorStop(1, rgba(ray, ray.tipLightness, 0));

    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(
      originX + geometry.leftInner.x * innerRadius,
      originY + geometry.leftInner.y * innerRadius,
    );
    context.lineTo(
      originX + geometry.leftOuter.x * outerRadius,
      originY + geometry.leftOuter.y * outerRadius,
    );
    context.lineTo(
      originX + geometry.rightOuter.x * outerRadius,
      originY + geometry.rightOuter.y * outerRadius,
    );
    context.lineTo(
      originX + geometry.rightInner.x * innerRadius,
      originY + geometry.rightInner.y * innerRadius,
    );
    context.closePath();
    if (ray.blur <= 0) {
      context.fill();
      return;
    }

    context.save();
    context.filter = `blur(${ray.blur}px)`;
    context.fill();
    context.restore();
  }

  root.PacePetsDashboardSyncSunburstDraw = Object.freeze({
    CORE_FINAL_RADIUS_SCALE,
    drawCore,
    drawRay,
  });
})(globalThis);
