((root) => {
  "use strict";

  function create(canvas, relativeElement = null) {
    let cached = null;
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
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width * nextPixelRatio));
        const height = Math.max(1, Math.round(rect.height * nextPixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const relativeRect =
          rect.height > 0 ? relativeElement?.getBoundingClientRect() : null;
        const rectScale = height / rect.height;
        cached = {
          height,
          relativeBottom: relativeRect
            ? (relativeRect.bottom - rect.top) * rectScale
            : height,
          relativeHeight: relativeRect ? relativeRect.height * rectScale : 0,
          width,
        };
        pixelRatio = nextPixelRatio;
        return cached;
      },
      invalidate() {
        cached = null;
      },
    };
  }

  root.PacePetsDashboardPushCanvasLayout = Object.freeze({ create });
})(globalThis);
