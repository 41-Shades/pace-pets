((root) => {
  "use strict";

  const ANTIALIAS_PADDING_PX = 1;

  function setCanvasBox(canvas, box) {
    canvas.style.left = `${box.left}px`;
    canvas.style.top = `${box.top}px`;
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;
  }

  function measureSurface(
    canvas,
    groundElement,
    bounds,
    pixelRatio,
    generation,
  ) {
    const iconRect = canvas.parentElement.getBoundingClientRect();
    const groundRect = groundElement?.getBoundingClientRect() || null;
    const iconWidth = Math.max(1, iconRect.width);
    const iconHeight = Math.max(1, iconRect.height);
    const groundBottomWorld = groundRect
      ? (groundRect.bottom - iconRect.top) / iconHeight
      : bounds.bottom;
    const bottom = Math.max(
      bounds.bottom,
      groundBottomWorld + bounds.bottomPadding,
    );
    const box = {
      height: (bottom - bounds.top) * iconHeight,
      left: bounds.left * iconWidth,
      top: bounds.top * iconHeight,
      width: (bounds.right - bounds.left) * iconWidth,
    };
    setCanvasBox(canvas, box);
    const width = Math.max(1, Math.round(box.width * pixelRatio));
    const height = Math.max(1, Math.round(box.height * pixelRatio));
    let nextGeneration = generation;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      nextGeneration += 1;
    }
    const scaleX = width / box.width;
    const scaleY = height / box.height;
    return {
      generation: nextGeneration,
      height,
      relativeBottom: groundRect
        ? (groundRect.bottom - iconRect.top - box.top) * scaleY
        : height,
      relativeHeight: groundRect ? groundRect.height * scaleY : 0,
      unitX: iconWidth * scaleX,
      unitY: iconHeight * scaleY,
      width,
      worldLeft: bounds.left,
      worldTop: bounds.top,
    };
  }

  function createLayout(canvas, groundElement, bounds) {
    let cached = null;
    let generation = 0;
    let pixelRatio = null;

    return {
      current() {
        const nextPixelRatio = root.devicePixelRatio || 1;
        if (pixelRatio !== nextPixelRatio) {
          cached = null;
        }
        if (cached) {
          return cached;
        }
        cached = measureSurface(
          canvas,
          groundElement,
          bounds,
          nextPixelRatio,
          generation,
        );
        generation = cached.generation;
        pixelRatio = nextPixelRatio;
        return cached;
      },
      invalidate() {
        cached = null;
      },
    };
  }

  function dropRegion(drop) {
    const strokeRadius = Math.max(1.2, drop.size * 0.2) / 2;
    const radius = drop.size * 1.16 + strokeRadius + ANTIALIAS_PADDING_PX;
    return {
      bottom: Math.ceil(drop.y + radius),
      left: Math.floor(drop.x - radius),
      right: Math.ceil(drop.x + radius),
      top: Math.floor(drop.y - radius),
    };
  }

  function includeRegion(current, next) {
    if (!current) {
      return next;
    }
    current.bottom = Math.max(current.bottom, next.bottom);
    current.left = Math.min(current.left, next.left);
    current.right = Math.max(current.right, next.right);
    current.top = Math.min(current.top, next.top);
    return current;
  }

  function create(canvas, groundElement, bounds) {
    const layout = createLayout(canvas, groundElement, bounds);
    let currentRegion = null;
    let previousGeneration = -1;
    let previousRegion = null;

    return {
      beginFrame(context, dimensions) {
        if (dimensions.generation !== previousGeneration) {
          previousRegion = null;
          previousGeneration = dimensions.generation;
        }
        if (previousRegion) {
          context.clearRect(
            previousRegion.left,
            previousRegion.top,
            previousRegion.right - previousRegion.left,
            previousRegion.bottom - previousRegion.top,
          );
        }
        currentRegion = null;
      },
      current: layout.current,
      finishFrame() {
        previousRegion = currentRegion;
      },
      includeDrop(drop) {
        currentRegion = includeRegion(currentRegion, dropRegion(drop));
      },
      invalidate: layout.invalidate,
    };
  }

  root.PacePetsDashboardPushSweatSurface = Object.freeze({ create });
})(globalThis);
