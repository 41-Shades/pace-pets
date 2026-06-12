(function attachPacePetsDashboardSingularityBlackHoleV2Scene(root) {
  "use strict";

  const SHADERS = root.PacePetsDashboardSingularityBlackHoleV2Shaders;
  if (!SHADERS) {
    throw new Error(
      "Singularity black-hole V2 shaders must load before dashboard-singularity-black-hole-v2-scene.js.",
    );
  }

  const APPROACH_DURATION_MS = 7600;
  const CANVAS_CLASS = "singularity-black-hole-v2-scene";
  const MAX_PIXEL_RATIO = 2;
  const WEBGL_CONTEXT_OPTIONS = Object.freeze({
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
  });

  function viewportSize() {
    const rootElement = document.documentElement;
    return {
      height: Math.max(1, root.innerHeight || rootElement.clientHeight || 1),
      width: Math.max(1, root.innerWidth || rootElement.clientWidth || 1),
    };
  }

  function configureCanvas(canvas, gl) {
    const { width, height } = viewportSize();
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    );
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }

    return { height, pixelHeight, pixelWidth, width };
  }

  function shaderInfoLog(gl, shader) {
    return gl.getShaderInfoLog(shader)?.trim() || "unknown shader error";
  }

  function programInfoLog(gl, program) {
    return gl.getProgramInfoLog(program)?.trim() || "unknown program error";
  }

  function compileShader(gl, shaderType, source) {
    const shader = gl.createShader(shaderType);
    if (!shader) {
      throw new Error("Could not create Singularity black-hole V2 shader.");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = shaderInfoLog(gl, shader);
      gl.deleteShader(shader);
      throw new Error(`Singularity black-hole V2 shader failed: ${message}`);
    }

    return shader;
  }

  function createProgram(gl) {
    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      SHADERS.VERTEX_SHADER_SOURCE,
    );
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      SHADERS.FRAGMENT_SHADER_SOURCE,
    );
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Could not create Singularity black-hole V2 program.");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = programInfoLog(gl, program);
      gl.deleteProgram(program);
      throw new Error(`Singularity black-hole V2 program failed: ${message}`);
    }

    return program;
  }

  function createQuadBuffer(gl) {
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Could not create Singularity black-hole V2 quad.");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    return buffer;
  }

  function requiredUniform(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
      throw new Error(`Singularity black-hole V2 uniform ${name} is missing.`);
    }
    return location;
  }

  function createResources(gl) {
    const program = createProgram(gl);
    const positionAttribute = gl.getAttribLocation(program, "a_position");
    if (positionAttribute < 0) {
      gl.deleteProgram(program);
      throw new Error(
        "Singularity black-hole V2 position attribute is missing.",
      );
    }

    return {
      positionAttribute,
      program,
      quadBuffer: createQuadBuffer(gl),
      progressUniform: requiredUniform(gl, program, "u_progress"),
      resolutionUniform: requiredUniform(gl, program, "u_resolution"),
      timeUniform: requiredUniform(gl, program, "u_time"),
    };
  }

  class BlackHoleScene {
    constructor({ reducedMotion = false } = {}) {
      this.canvas = null;
      this.contextLost = false;
      this.done = null;
      this.frameId = null;
      this.gl = null;
      this.isApproachComplete = false;
      this.isFinished = false;
      this.reducedMotion = reducedMotion;
      this.resolveDone = null;
      this.resources = null;
      this.size = { height: 1, pixelHeight: 1, pixelWidth: 1, width: 1 };
      this.startedAtMs = null;
      this.handleContextLost = this.handleContextLost.bind(this);
      this.handleContextRestored = this.handleContextRestored.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      this.renderFrame = this.renderFrame.bind(this);
    }

    play() {
      this.done = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
      if (this.reducedMotion) {
        this.finish(true);
        return this.done;
      }

      if (!this.mount()) {
        this.finish(false);
        return this.done;
      }

      root.addEventListener("resize", this.handleResize);
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.startedAtMs = root.performance?.now?.() ?? Date.now();
      this.requestFrame();
      return this.done;
    }

    mount() {
      this.canvas = document.createElement("canvas");
      this.canvas.className = CANVAS_CLASS;
      this.canvas.setAttribute("aria-hidden", "true");
      this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
      this.canvas.addEventListener(
        "webglcontextrestored",
        this.handleContextRestored,
      );
      this.gl =
        this.canvas.getContext("webgl", WEBGL_CONTEXT_OPTIONS) ||
        this.canvas.getContext("experimental-webgl", WEBGL_CONTEXT_OPTIONS);
      if (!this.gl) {
        console.warn("Pace Pets Singularity black-hole V2 WebGL unavailable.");
        this.canvas = null;
        return false;
      }

      try {
        this.initializeGl();
      } catch (error) {
        console.warn(
          "Pace Pets Singularity black-hole V2 setup failed:",
          error,
        );
        this.destroyGlResources();
        this.canvas = null;
        this.gl = null;
        return false;
      }

      const mountPoint = document.querySelector(".shell") || document.body;
      mountPoint.append(this.canvas);
      this.size = configureCanvas(this.canvas, this.gl);
      return true;
    }

    initializeGl() {
      this.resources = createResources(this.gl);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.disable(this.gl.CULL_FACE);
      this.gl.clearColor(0, 0, 0, 0);
    }

    requestFrame() {
      if (
        this.contextLost ||
        this.isFinished ||
        this.frameId !== null ||
        document.hidden
      ) {
        return;
      }

      this.frameId = root.requestAnimationFrame(this.renderFrame);
    }

    renderFrame(frameTimeMs) {
      this.frameId = null;
      if (
        this.contextLost ||
        this.isFinished ||
        !this.canvas ||
        !this.gl ||
        !this.resources
      ) {
        return;
      }

      this.size = configureCanvas(this.canvas, this.gl);
      const elapsedMs = Math.max(0, frameTimeMs - this.startedAtMs);
      this.drawFrame(elapsedMs);
      if (elapsedMs >= APPROACH_DURATION_MS) {
        this.complete(true);
      }
      this.requestFrame();
    }

    drawFrame(elapsedMs) {
      const gl = this.gl;
      const progress = Math.min(1, elapsedMs / APPROACH_DURATION_MS);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.resources.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.quadBuffer);
      gl.enableVertexAttribArray(this.resources.positionAttribute);
      gl.vertexAttribPointer(
        this.resources.positionAttribute,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.uniform2f(
        this.resources.resolutionUniform,
        this.size.pixelWidth,
        this.size.pixelHeight,
      );
      gl.uniform1f(this.resources.progressUniform, progress);
      gl.uniform1f(this.resources.timeUniform, elapsedMs / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    handleResize() {
      if (this.isFinished || !this.canvas || !this.gl || this.contextLost) {
        return;
      }

      this.size = configureCanvas(this.canvas, this.gl);
    }

    handleVisibilityChange() {
      this.cancelFrame();
      this.requestFrame();
    }

    handleContextLost(event) {
      event.preventDefault();
      this.contextLost = true;
      this.cancelFrame();
      this.resources = null;
      console.warn("Pace Pets Singularity black-hole V2 WebGL context lost.");
      this.finish(false);
    }

    handleContextRestored() {
      if (this.isFinished || !this.canvas) {
        return;
      }

      this.contextLost = false;
      this.gl =
        this.canvas.getContext("webgl", WEBGL_CONTEXT_OPTIONS) ||
        this.canvas.getContext("experimental-webgl", WEBGL_CONTEXT_OPTIONS);
      try {
        this.initializeGl();
        this.size = configureCanvas(this.canvas, this.gl);
        this.requestFrame();
      } catch (error) {
        console.warn(
          "Pace Pets Singularity black-hole V2 restore failed:",
          error,
        );
        this.finish(false);
      }
    }

    stop() {
      this.finish(false);
    }

    complete(completed) {
      if (!this.isApproachComplete) {
        this.isApproachComplete = true;
        this.resolveDone?.(completed);
        this.resolveDone = null;
      }
    }

    cancelFrame() {
      if (this.frameId !== null) {
        root.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }

    destroyGlResources() {
      if (!this.gl || !this.resources || this.contextLost) {
        return;
      }

      this.gl.deleteBuffer(this.resources.quadBuffer);
      this.gl.deleteProgram(this.resources.program);
      this.resources = null;
    }

    finish(completed) {
      if (this.isFinished) {
        return;
      }

      this.isFinished = true;
      this.cancelFrame();
      root.removeEventListener("resize", this.handleResize);
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      this.canvas?.removeEventListener(
        "webglcontextlost",
        this.handleContextLost,
      );
      this.canvas?.removeEventListener(
        "webglcontextrestored",
        this.handleContextRestored,
      );
      this.destroyGlResources();
      this.canvas?.remove();
      this.canvas = null;
      this.gl = null;
      this.complete(completed);
    }
  }

  root.PacePetsDashboardSingularityBlackHoleV2Scene = Object.freeze({
    create: (options) => new BlackHoleScene(options),
  });
})(globalThis);
