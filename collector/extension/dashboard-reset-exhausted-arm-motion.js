(() => {
  "use strict";

  const DURATION_MS = 10_900;
  const REST_POINTS = Object.freeze([286, 132, 241, 195, 206.8, 214.8]);
  const MID_POINTS = Object.freeze([286, 132, 240.1, 163.5, 193.3, 187.8]);
  const RAISED_POINTS = Object.freeze([286, 132, 238.3, 134.7, 187.9, 112.2]);
  const KEYFRAMES = Object.freeze([
    Object.freeze({ points: REST_POINTS, progress: 0 }),
    Object.freeze({ points: REST_POINTS, progress: 0.426 }),
    Object.freeze({ points: MID_POINTS, progress: 0.491 }),
    Object.freeze({ points: RAISED_POINTS, progress: 0.565 }),
    Object.freeze({ points: RAISED_POINTS, progress: 0.796 }),
    Object.freeze({ points: MID_POINTS, progress: 0.843 }),
    Object.freeze({ points: REST_POINTS, progress: 0.89 }),
    Object.freeze({ points: REST_POINTS, progress: 1 }),
  ]);

  function pathForPoints(points) {
    return [
      `M ${points[0]} ${points[1]}`,
      `L ${points[2]} ${points[3]}`,
      `L ${points[4]} ${points[5]}`,
    ].join(" ");
  }

  function formattedPathNumber(value) {
    return Number(value.toFixed(1));
  }

  function interpolatedPoints(startPoints, endPoints, ratio) {
    return startPoints.map((startPoint, index) =>
      formattedPathNumber(startPoint + (endPoints[index] - startPoint) * ratio),
    );
  }

  function keyframePairAtProgress(progress) {
    for (let index = 1; index < KEYFRAMES.length; index += 1) {
      const next = KEYFRAMES[index];
      if (progress <= next.progress) {
        return [KEYFRAMES[index - 1], next];
      }
    }

    const finalKeyframe = KEYFRAMES[KEYFRAMES.length - 1];
    return [finalKeyframe, finalKeyframe];
  }

  function pathAtProgress(progress) {
    const [previous, next] = keyframePairAtProgress(progress);
    const span = next.progress - previous.progress;
    if (span <= 0) {
      return pathForPoints(next.points);
    }

    return pathForPoints(
      interpolatedPoints(
        previous.points,
        next.points,
        (progress - previous.progress) / span,
      ),
    );
  }

  globalThis.PacePetsResetExhaustedArmMotion = Object.freeze({
    DURATION_MS,
    REST_PATH: pathForPoints(REST_POINTS),
    pathAtProgress,
  });
})();
