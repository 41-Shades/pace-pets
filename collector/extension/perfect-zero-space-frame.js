(function attachPacePetsPerfectZeroSpaceFrame(root) {
  "use strict";

  const DEVICE_PAD_PX = 2;
  const SHAPE_RADIUS_RATIO = 0.75;

  function roundedRectPath(context, rect) {
    const { height, radius, width, x, y } = rect;
    const cornerRadius = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + cornerRadius, y);
    context.lineTo(x + width - cornerRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    context.lineTo(x + width, y + height - cornerRadius);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - cornerRadius,
      y + height,
    );
    context.lineTo(x + cornerRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    context.lineTo(x, y + cornerRadius);
    context.quadraticCurveTo(x, y, x + cornerRadius, y);
    context.closePath();
  }

  function scenePath(context, frame, width, height) {
    if (frame.type === "fullBleed") {
      context.rect(0, 0, width, height);
      return;
    }

    roundedRectPath(context, {
      height: height * frame.heightRatio,
      radius: Math.min(width, height) * frame.radiusRatio,
      width: width * frame.widthRatio,
      x: width * frame.insetXRatio,
      y: height * frame.insetYRatio,
    });
  }

  function backgroundGradient(context, scene, width, height) {
    const gradient = scene.gradient;
    const result = context.createRadialGradient(
      width * gradient.centerXRatio,
      height * gradient.centerYRatio,
      0,
      width * gradient.outerXRatio,
      height * gradient.outerYRatio,
      Math.max(width, height) * gradient.radiusRatio,
    );
    result.addColorStop(0, gradient.innerColor);
    result.addColorStop(
      gradient.middleStop,
      gradient.middleColor || scene.background,
    );
    result.addColorStop(1, gradient.outerColor);
    return result;
  }

  function drawBackdrop(context, scene, sceneState) {
    const { height, width } = sceneState;
    context.beginPath();
    scenePath(context, scene.frame, width, height);
    context.fillStyle = backgroundGradient(context, scene, width, height);
    context.fill();

    context.save();
    context.beginPath();
    scenePath(context, scene.frame, width, height);
    context.clip();
    for (const star of sceneState.stars) {
      if (star.sparkleEnabled) {
        continue;
      }

      context.beginPath();
      context.fillStyle = `rgba(255, 255, 255, ${star.baseOpacity})`;
      context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function createWorkspace() {
    const frameRegions = [[], []];
    return {
      currentFrameState: null,
      devicePool: [],
      deviceRegions: [],
      dirtyPool: [],
      dirtyRegions: [],
      frameIndex: 1,
      framePools: [[], []],
      frameRegions,
      frameStates: frameRegions.map((dynamicRegions) => ({ dynamicRegions })),
      logicalPool: [],
      logicalRegions: [],
    };
  }

  function pooledRect(pool, index) {
    pool[index] ||= { bottom: 0, left: 0, right: 0, top: 0 };
    return pool[index];
  }

  function setRect(result, bottom, left, right, top) {
    result.bottom = bottom;
    result.left = left;
    result.right = right;
    result.top = top;
    return result;
  }

  function rectAround(centerX, centerY, radius, result) {
    return setRect(
      result,
      centerY + radius,
      centerX - radius,
      centerX + radius,
      centerY - radius,
    );
  }

  function cometRect(comet, elapsedMs, result) {
    if (!comet) {
      return false;
    }

    const progress = Math.min(
      Math.max((elapsedMs - comet.startedAtMs) / comet.durationMs, 0),
      1,
    );
    const x = comet.start.x + (comet.end.x - comet.start.x) * progress;
    const y = comet.start.y + (comet.end.y - comet.start.y) * progress;
    const distance = Math.max(
      Math.hypot(comet.end.x - comet.start.x, comet.end.y - comet.start.y),
      1,
    );
    const tailX =
      x - ((comet.end.x - comet.start.x) / distance) * comet.tailLength;
    const tailY =
      y - ((comet.end.y - comet.start.y) / distance) * comet.tailLength;
    const shadowPad = 8;

    setRect(
      result,
      Math.max(y, tailY) + shadowPad,
      Math.min(x, tailX) - shadowPad,
      Math.max(x, tailX) + shadowPad,
      Math.min(y, tailY) - shadowPad,
    );
    return true;
  }

  function logicalRegions(sceneState, stars, elapsedMs, workspace) {
    const regions = workspace.logicalRegions;
    regions.length = 0;
    let regionIndex = 0;
    for (const { progress, star } of stars) {
      const region = pooledRect(workspace.logicalPool, regionIndex);
      rectAround(star.x, star.y, star.size * progress.scale + 2, region);
      regions.push(region);
      regionIndex += 1;
    }
    for (const shape of sceneState.shapes) {
      const half = shape.size / 2;
      const region = pooledRect(workspace.logicalPool, regionIndex);
      rectAround(
        shape.x + half,
        shape.y + half,
        shape.size * SHAPE_RADIUS_RATIO + 2,
        region,
      );
      regions.push(region);
      regionIndex += 1;
    }

    const comet = pooledRect(workspace.logicalPool, regionIndex);
    if (cometRect(sceneState.comet, elapsedMs, comet)) {
      regions.push(comet);
    }
    return regions;
  }

  function deviceRect(rect, pixelRatio, pixelWidth, pixelHeight, result) {
    const left = Math.max(
      0,
      Math.floor(rect.left * pixelRatio) - DEVICE_PAD_PX,
    );
    const top = Math.max(0, Math.floor(rect.top * pixelRatio) - DEVICE_PAD_PX);
    const right = Math.min(
      pixelWidth,
      Math.ceil(rect.right * pixelRatio) + DEVICE_PAD_PX,
    );
    const bottom = Math.min(
      pixelHeight,
      Math.ceil(rect.bottom * pixelRatio) + DEVICE_PAD_PX,
    );
    if (right <= left || bottom <= top) {
      return false;
    }
    setRect(result, bottom, left, right, top);
    return true;
  }

  function overlaps(first, second) {
    return !(
      first.right < second.left ||
      second.right < first.left ||
      first.bottom < second.top ||
      second.bottom < first.top
    );
  }

  function removeRegionAt(regions, index) {
    for (let next = index + 1; next < regions.length; next += 1) {
      regions[next - 1] = regions[next];
    }
    regions.length -= 1;
  }

  function mergeRegion(merged, pool, source, sourceIndex) {
    const region = pooledRect(pool, sourceIndex);
    setRect(region, source.bottom, source.left, source.right, source.top);
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      if (!overlaps(region, merged[index])) {
        continue;
      }

      const match = merged[index];
      region.bottom = Math.max(region.bottom, match.bottom);
      region.left = Math.min(region.left, match.left);
      region.right = Math.max(region.right, match.right);
      region.top = Math.min(region.top, match.top);
      removeRegionAt(merged, index);
    }
    merged.push(region);
  }

  function mergeRegionSet(regions, merged, pool, sourceIndex) {
    if (!regions) {
      return sourceIndex;
    }
    for (const source of regions) {
      mergeRegion(merged, pool, source, sourceIndex);
      sourceIndex += 1;
    }
    return sourceIndex;
  }

  function mergeRegionSets(first, second, merged, pool) {
    merged.length = 0;
    const sourceIndex = mergeRegionSet(first, merged, pool, 0);
    mergeRegionSet(second, merged, pool, sourceIndex);
    return merged;
  }

  function mergedRegions(regions, workspace, additionalRegions = null) {
    const activeWorkspace = workspace || createWorkspace();
    return mergeRegionSets(
      regions,
      additionalRegions,
      activeWorkspace.dirtyRegions,
      activeWorkspace.dirtyPool,
    );
  }

  function dynamicFrame(sceneState, stars, elapsedMs, frameOptions) {
    const { backdropLayer: layer, pixelRatio } = frameOptions;
    const workspace = frameOptions.workspace.frame;
    const deviceRegions = workspace.deviceRegions;
    deviceRegions.length = 0;
    let regionIndex = 0;
    for (const region of logicalRegions(
      sceneState,
      stars,
      elapsedMs,
      workspace,
    )) {
      const deviceRegion = pooledRect(workspace.devicePool, regionIndex);
      if (
        deviceRect(region, pixelRatio, layer.width, layer.height, deviceRegion)
      ) {
        deviceRegions.push(deviceRegion);
        regionIndex += 1;
      }
    }

    workspace.frameIndex = workspace.frameIndex === 0 ? 1 : 0;
    mergeRegionSets(
      deviceRegions,
      null,
      workspace.frameRegions[workspace.frameIndex],
      workspace.framePools[workspace.frameIndex],
    );
    workspace.currentFrameState = workspace.frameStates[workspace.frameIndex];
    return workspace.currentFrameState;
  }

  function restoreBackdrop(context, layer, regions, fullFrame) {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    if (fullFrame) {
      context.clearRect(0, 0, layer.width, layer.height);
      context.drawImage(layer, 0, 0);
    } else {
      for (const region of regions) {
        const width = region.right - region.left;
        const height = region.bottom - region.top;
        context.clearRect(region.left, region.top, width, height);
        context.drawImage(
          layer,
          region.left,
          region.top,
          width,
          height,
          region.left,
          region.top,
          width,
          height,
        );
      }
    }
    context.restore();
  }

  function clipRegions(context, regions, pixelRatio) {
    context.beginPath();
    for (const region of regions) {
      context.rect(
        region.left / pixelRatio,
        region.top / pixelRatio,
        (region.right - region.left) / pixelRatio,
        (region.bottom - region.top) / pixelRatio,
      );
    }
    context.clip();
  }

  function clipScene(context, scene, sceneState) {
    context.beginPath();
    scenePath(context, scene.frame, sceneState.width, sceneState.height);
    context.clip();
  }

  function drawEdgeGlow(context, scene, sceneState) {
    if (!scene.frame.edgeGlow) {
      return;
    }
    context.beginPath();
    scenePath(context, scene.frame, sceneState.width, sceneState.height);
    context.strokeStyle = scene.frame.edgeGlow;
    context.lineWidth = 1;
    context.stroke();
  }

  root.PacePetsPerfectZeroSpaceFrame = Object.freeze({
    clipRegions,
    clipScene,
    createWorkspace,
    drawBackdrop,
    drawEdgeGlow,
    dynamicFrame,
    mergedRegions,
    restoreBackdrop,
  });
})(globalThis);
