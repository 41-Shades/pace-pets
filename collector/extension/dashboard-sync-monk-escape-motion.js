((root) => {
  "use strict";

  const MIN_MOVING_SPEED_PX_PER_SECOND = 0.000001;
  const POSITION_EPSILON_PX = 0.000001;

  function boundedMaximum(maximum) {
    return Number.isFinite(maximum) ? Math.max(0, maximum) : 0;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function finiteVelocity(velocity) {
    return Number.isFinite(velocity) ? velocity : 0;
  }

  function inwardVelocity(position, velocity, maximum) {
    const speed = Math.abs(velocity);
    if (position <= POSITION_EPSILON_PX && velocity < 0) {
      return speed;
    }
    if (maximum - position <= POSITION_EPSILON_PX && velocity > 0) {
      return -speed;
    }
    return velocity;
  }

  function fitAxisState(state, maximum) {
    const bounded = boundedMaximum(maximum);
    const position = clamp(
      Number.isFinite(state.position) ? state.position : 0,
      0,
      bounded,
    );
    return {
      position,
      velocity: inwardVelocity(
        position,
        finiteVelocity(state.velocity),
        bounded,
      ),
    };
  }

  function positiveTrackKeyframes(position, maximum) {
    const cycleDistance = maximum * 2;
    return [
      { offset: 0, position },
      { offset: (maximum - position) / cycleDistance, position: maximum },
      { offset: (cycleDistance - position) / cycleDistance, position: 0 },
      { offset: 1, position },
    ];
  }

  function negativeTrackKeyframes(position, maximum) {
    const cycleDistance = maximum * 2;
    return [
      { offset: 0, position },
      { offset: position / cycleDistance, position: 0 },
      { offset: (position + maximum) / cycleDistance, position: maximum },
      { offset: 1, position },
    ];
  }

  function movingKeyframes(position, velocity, maximum) {
    const keyframes =
      velocity > 0
        ? positiveTrackKeyframes(position, maximum)
        : negativeTrackKeyframes(position, maximum);
    return keyframes.filter(
      (keyframe, index) =>
        index === 0 || keyframe.offset > keyframes[index - 1].offset,
    );
  }

  function createAxisTrack({ maximum, position, velocity }) {
    const bounded = boundedMaximum(maximum);
    const fitted = fitAxisState({ position, velocity }, bounded);
    const speed = Math.abs(fitted.velocity);
    const moving =
      bounded > POSITION_EPSILON_PX && speed > MIN_MOVING_SPEED_PX_PER_SECOND;
    return Object.freeze({
      durationMs: moving ? ((bounded * 2) / speed) * 1000 : 0,
      keyframes: Object.freeze(
        moving
          ? movingKeyframes(fitted.position, fitted.velocity, bounded)
          : [
              { offset: 0, position: fitted.position },
              { offset: 1, position: fitted.position },
            ],
      ),
      maximum: bounded,
      moving,
      position: fitted.position,
      velocity: fitted.velocity,
    });
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function stateAt(track, elapsedMs) {
    if (!track.moving) {
      return { position: track.position, velocity: track.velocity };
    }

    const elapsedSeconds =
      (Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0) / 1000;
    const cycleDistance = track.maximum * 2;
    const phase = positiveModulo(
      track.position + track.velocity * elapsedSeconds,
      cycleDistance,
    );
    const speed = Math.abs(track.velocity);
    if (
      phase <= POSITION_EPSILON_PX ||
      cycleDistance - phase <= POSITION_EPSILON_PX
    ) {
      return { position: 0, velocity: speed };
    }
    if (Math.abs(phase - track.maximum) <= POSITION_EPSILON_PX) {
      return { position: track.maximum, velocity: -speed };
    }
    if (phase < track.maximum) {
      return { position: phase, velocity: track.velocity };
    }
    return {
      position: cycleDistance - phase,
      velocity: -track.velocity,
    };
  }

  root.PacePetsDashboardSyncMonkEscapeMotion = Object.freeze({
    createAxisTrack,
    fitAxisState,
    stateAt,
  });
})(globalThis);
