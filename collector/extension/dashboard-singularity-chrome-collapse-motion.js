(function attachPacePetsDashboardSingularityChromeCollapseMotion(root) {
  "use strict";

  const INNER_FRAGMENT_DELAY_MS = 740;
  const PULL_DURATION_MS = 10800;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function seededUnit(index, salt) {
    const value = Math.sin((index + 1) * (salt + 6.37) * 71.9) * 10000;
    return value - Math.floor(value);
  }

  function rounded(value, precision) {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  function fragmentSeed(fragment) {
    return fragment.parentIndex * 31 + fragment.index;
  }

  function viewportSize() {
    const rootElement = document.documentElement;
    return {
      height: Math.max(1, root.innerHeight || rootElement.clientHeight || 1),
      width: Math.max(1, root.innerWidth || rootElement.clientWidth || 1),
    };
  }

  function blackHoleTarget() {
    const { height, width } = viewportSize();
    const aspect = width / height;
    return {
      x: width * ((0.1 / aspect + 1) / 2),
      y: height * 0.49,
    };
  }

  function rectCenter(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function vectorToTarget(rect, target) {
    const center = rectCenter(rect);
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

  function vectorFromContainerCenter(fragment, container) {
    const fragmentCenter = rectCenter(fragment.rect);
    const containerCenter = rectCenter(container.rect);
    const from = {
      x: fragmentCenter.x - containerCenter.x,
      y: fragmentCenter.y - containerCenter.y,
    };
    const distance = Math.max(1, Math.hypot(from.x, from.y));
    return {
      distance,
      unit: {
        x: from.x / distance,
        y: from.y / distance,
      },
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
      `translate3d(${rounded(x, 1)}px, ${rounded(y, 1)}px, 0) ` +
      `rotate(${rounded(angleDeg, 2)}deg) skewX(${rounded(skew, 2)}deg) ` +
      `scale(${rounded(scaleX, 3)}, ${rounded(scaleY, 3)})`
    );
  }

  function pathPoint(pull, orbit, sign, inward, around) {
    return {
      x: pull.to.x * inward + pull.tangent.x * orbit * around * sign,
      y: pull.to.y * inward + pull.tangent.y * orbit * around * sign,
    };
  }

  function fragmentPathPoint(pull, local, orbit, sign, path) {
    return {
      x:
        pull.to.x * path.inward +
        pull.tangent.x * orbit * path.around * sign +
        local.unit.x * path.scatter,
      y:
        pull.to.y * path.inward +
        pull.tangent.y * orbit * path.around * sign +
        local.unit.y * path.scatter,
    };
  }

  function angleBetween(startAngle, endAngle, amount) {
    return startAngle + (endAngle - startAngle) * amount;
  }

  function fragmentFrame(frame) {
    return { ...frame, transformOrigin: "50% 50%" };
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

  function innerFragmentKeyframes(fragment, container, target) {
    const seed = fragmentSeed(fragment);
    const pull = vectorToTarget(fragment.rect, target);
    const local = vectorFromContainerCenter(fragment, container);
    const sign = seededUnit(seed, 13) > 0.5 ? 1 : -1;
    const orbit = clamp(
      pull.distance * (0.08 + seededUnit(seed, 14) * 0.08),
      18,
      96,
    );
    const scatter = clamp(
      local.distance * (0.18 + seededUnit(seed, 15) * 0.18),
      6,
      32,
    );
    const skew = sign * (4 + seededUnit(seed, 16) * 10);
    const stretch = 1.14 + seededUnit(seed, 17) * 0.44;
    const tangentAngle =
      pull.angleDeg + sign * (28 + seededUnit(seed, 18) * 46);
    const point = (inward, around, scatterAmount) =>
      fragmentPathPoint(pull, local, orbit, sign, {
        around,
        inward,
        scatter: scatterAmount,
      });

    return [
      fragmentFrame({
        filter: "brightness(1)",
        opacity: 1,
        transform: "none",
      }),
      fragmentFrame({
        filter: "brightness(1.1)",
        offset: 0.16,
        opacity: 0.96,
        transform: transformFor({
          angleDeg: angleBetween(sign * 4, tangentAngle, 0.22),
          scaleX: 1.02,
          scaleY: 0.98,
          skew: skew * 0.2,
          ...point(0.03, 0.4, scatter),
        }),
      }),
      fragmentFrame({
        filter: "blur(0.08px) brightness(1.22) saturate(1.08)",
        offset: 0.38,
        opacity: 0.88,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.22),
          scaleX: stretch,
          scaleY: 0.76,
          skew: skew * 0.62,
          ...point(0.08, 1, scatter * 1.3),
        }),
      }),
      fragmentFrame({
        filter: "blur(0.28px) brightness(1.18) saturate(0.92)",
        offset: 0.66,
        opacity: 0.66,
        transform: transformFor({
          angleDeg: angleBetween(tangentAngle, pull.angleDeg, 0.58),
          scaleX: stretch * 0.86,
          scaleY: 0.44,
          skew: skew * 0.78,
          ...point(0.16, -0.72, scatter * 0.72),
        }),
      }),
      fragmentFrame({
        filter: "blur(0.6px) brightness(0.74) saturate(0.62)",
        offset: 0.86,
        opacity: 0.34,
        transform: transformFor({
          angleDeg: pull.angleDeg + sign * 14,
          scaleX: stretch * 0.42,
          scaleY: 0.18,
          skew: skew * 0.42,
          ...point(0.24, 0.16, scatter * 0.2),
        }),
      }),
      fragmentFrame({
        filter: "blur(0.9px) brightness(0.28) saturate(0.4)",
        opacity: 0,
        transform: transformFor({
          angleDeg: pull.angleDeg,
          scaleX: 0.04,
          scaleY: 0.04,
          skew: 0,
          ...point(0.3, 0, 0),
        }),
      }),
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

  function innerFragmentTiming(fragment, parentTiming) {
    const seed = fragmentSeed(fragment);
    return {
      delay:
        parentTiming.delay +
        INNER_FRAGMENT_DELAY_MS +
        Math.round(seededUnit(seed, 19) * 920),
      duration:
        parentTiming.duration - 920 + Math.round(seededUnit(seed, 20) * 1180),
      easing: "cubic-bezier(0.12, 0.68, 0.14, 1)",
      fill: "forwards",
    };
  }

  function startContainerPullAnimations(containers) {
    const target = blackHoleTarget();
    const animations = [];
    containers.forEach((container) => {
      const timing = containerTiming(container, target);
      animations.push(
        container.element.animate(
          containerKeyframes(container, target),
          timing,
        ),
      );
      (container.innerFragments ?? []).forEach((fragment) => {
        animations.push(
          fragment.element.animate(
            innerFragmentKeyframes(fragment, container, target),
            innerFragmentTiming(fragment, timing),
          ),
        );
      });
    });
    return { animations };
  }

  root.PacePetsDashboardSingularityChromeCollapseMotion = Object.freeze({
    startContainerPullAnimations,
  });
})(globalThis);
