(function attachPacePetsDashboardSingularityChromeCollapseMotion(root) {
  "use strict";

  const PULL_DURATION_MS = 10800;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function seededUnit(index, salt) {
    const value = Math.sin((index + 1) * (salt + 6.37) * 71.9) * 10000;
    return value - Math.floor(value);
  }

  function viewportSize() {
    const rootElement = document.documentElement;
    return {
      height: Math.max(1, root.innerHeight || rootElement.clientHeight || 1),
      width: Math.max(1, root.innerWidth || rootElement.clientWidth || 1),
    };
  }

  function blackHoleTarget(blackHoleVersion) {
    const { height, width } = viewportSize();
    if (blackHoleVersion === "v2") {
      const aspect = width / height;
      return {
        x: width * ((0.1 / aspect + 1) / 2),
        y: height * 0.49,
      };
    }

    return {
      x: width * 0.58,
      y: height * 0.43,
    };
  }

  function vectorToTarget(rect, target) {
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const to = { x: target.x - center.x, y: target.y - center.y };
    const distance = Math.max(1, Math.hypot(to.x, to.y));
    return {
      angleDeg: (Math.atan2(to.y, to.x) * 180) / Math.PI,
      distance,
      tangent: { x: -to.y / distance, y: to.x / distance },
      to,
      unit: { x: to.x / distance, y: to.y / distance },
    };
  }

  function transformFor({
    angleDeg = 0,
    scaleX = 1,
    scaleY = 1,
    skew = 0,
    x = 0,
    y = 0,
  }) {
    return (
      `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) ` +
      `rotate(${Math.round(angleDeg)}deg) skewX(${skew}deg) ` +
      `scale(${scaleX}, ${scaleY})`
    );
  }

  function pathPoint(pull, orbit, sign, inward, around) {
    return {
      x: pull.to.x * inward + pull.tangent.x * orbit * around * sign,
      y: pull.to.y * inward + pull.tangent.y * orbit * around * sign,
    };
  }

  function angleBetween(startAngle, endAngle, amount) {
    return startAngle + (endAngle - startAngle) * amount;
  }

  function containerKeyframes(container, target) {
    const pull = vectorToTarget(container.rect, target);
    const sign = seededUnit(container.index, 2) > 0.5 ? 1 : -1;
    const orbit = clamp(
      pull.distance * (0.2 + seededUnit(container.index, 3) * 0.18),
      48,
      220,
    );
    const tangentAngle = pull.angleDeg + sign * 88;
    const skew = sign * (5 + seededUnit(container.index, 4) * 9);
    const stretch = 1.34 + seededUnit(container.index, 5) * 0.34;

    return [
      { filter: "brightness(1)", opacity: 1, transform: "none" },
      {
        filter: "brightness(1.08)",
        offset: 0.08,
        opacity: 0.98,
        transform: transformFor({
          angleDeg: angleBetween(sign * 2, tangentAngle, 0.18),
          scaleX: 1.03,
          scaleY: 0.99,
          skew: skew * 0.12,
          ...pathPoint(pull, orbit, sign, 0.09, 0.44),
        }),
      },
      {
        filter: "brightness(1.12) saturate(1.04)",
        offset: 0.24,
        opacity: 0.96,
        transform: transformFor({
          angleDeg: angleBetween(sign * 2, tangentAngle, 0.44),
          scaleX: 1.08,
          scaleY: 0.96,
          skew: skew * 0.3,
          ...pathPoint(pull, orbit, sign, 0.25, 1),
        }),
      },
      {
        filter: "blur(0.12px) brightness(1.18) saturate(1.08)",
        offset: 0.43,
        opacity: 0.9,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.16),
          scaleX: 1.14,
          scaleY: 0.9,
          skew: skew * 0.48,
          ...pathPoint(pull, orbit, sign, 0.47, -0.62),
        }),
      },
      {
        filter: "blur(0.24px) brightness(1.28) saturate(1.14)",
        offset: 0.63,
        opacity: 0.82,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.38),
          scaleX: stretch * 0.96,
          scaleY: 0.76,
          skew: skew * 0.7,
          ...pathPoint(pull, orbit, sign, 0.67, -1),
        }),
      },
      {
        filter: "blur(0.64px) brightness(1.1) saturate(0.88)",
        offset: 0.82,
        opacity: 0.52,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.64),
          scaleX: stretch * 1.14,
          scaleY: 0.5,
          skew: skew * 0.9,
          ...pathPoint(pull, orbit, sign, 0.86, 0.28),
        }),
      },
      {
        filter: "blur(0.9px) brightness(0.72) saturate(0.68)",
        offset: 0.94,
        opacity: 0.34,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.84),
          scaleX: stretch * 0.82,
          scaleY: 0.32,
          skew: skew * 0.62,
          ...pathPoint(pull, orbit, sign, 0.96, -0.08),
        }),
      },
      {
        filter: "blur(1.4px) brightness(0.32) saturate(0.45)",
        opacity: 0,
        transform: transformFor({
          angleDeg: pull.angleDeg + sign * 18,
          scaleX: 0.05,
          scaleY: 0.04,
          skew: skew * 0.3,
          ...pathPoint(pull, orbit, sign, 1.02, 0),
        }),
      },
    ];
  }

  function containerTiming(container, target) {
    const pull = vectorToTarget(container.rect, target);
    return {
      delay: Math.round(
        seededUnit(container.index, 9) * 110 +
          Math.min(80, pull.distance * 0.025),
      ),
      duration:
        PULL_DURATION_MS + Math.round(seededUnit(container.index, 10) * 1100),
      easing: "cubic-bezier(0.16, 0.62, 0.22, 1)",
      fill: "forwards",
    };
  }

  function startContainerPullAnimations(containers, blackHoleVersion) {
    const target = blackHoleTarget(blackHoleVersion);
    const animations = containers.map((container) => {
      return container.element.animate(
        containerKeyframes(container, target),
        containerTiming(container, target),
      );
    });
    return { animations };
  }

  root.PacePetsDashboardSingularityChromeCollapseMotion = Object.freeze({
    startContainerPullAnimations,
  });
})(globalThis);
