(function attachPacePetsDashboardBigBangWebglRenderer(root) {
  "use strict";

  const SHADERS = root.PacePetsDashboardBigBangWebglShaders;
  if (!SHADERS) {
    throw new Error(
      "Big Bang WebGL shaders must load before dashboard-big-bang-webgl-renderer.js.",
    );
  }

  const MAX_PIXEL_RATIO = 1.25;
  const START_MS = 520;
  const WEBGL_CONTEXT_OPTIONS = Object.freeze({
    alpha: true,
    antialias: false,
    depth: false,
    desynchronized: true,
    powerPreference: "high-performance",
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
    const { height, width } = viewportSize();
    const pixelRatio = Math.max(
      1,
      Math.min(root.devicePixelRatio || 1, MAX_PIXEL_RATIO),
    );
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }

    return { pixelHeight, pixelWidth };
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
      throw new Error("Could not create Big Bang WebGL shader.");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = shaderInfoLog(gl, shader);
      gl.deleteShader(shader);
      throw new Error(`Big Bang WebGL shader failed: ${message}`);
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
      throw new Error("Could not create Big Bang WebGL program.");
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = programInfoLog(gl, program);
      gl.deleteProgram(program);
      throw new Error(`Big Bang WebGL program failed: ${message}`);
    }

    return program;
  }

  function createQuadBuffer(gl) {
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Could not create Big Bang WebGL quad.");
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
      throw new Error(`Big Bang WebGL uniform ${name} is missing.`);
    }
    return location;
  }

  function createResources(gl) {
    const program = createProgram(gl);
    const positionAttribute = gl.getAttribLocation(program, "a_position");
    if (positionAttribute < 0) {
      gl.deleteProgram(program);
      throw new Error("Big Bang WebGL position attribute is missing.");
    }

    return {
      localMsUniform: requiredUniform(gl, program, "u_localMs"),
      opacityUniform: requiredUniform(gl, program, "u_opacity"),
      positionAttribute,
      program,
      quadBuffer: createQuadBuffer(gl),
      resolutionUniform: requiredUniform(gl, program, "u_resolution"),
      seedUniform: requiredUniform(gl, program, "u_seed"),
      timeUniform: requiredUniform(gl, program, "u_time"),
    };
  }

  class BigBangWebglRenderer {
    constructor({ seed }) {
      this.canvas = null;
      this.contextLost = false;
      this.gl = null;
      this.resources = null;
      this.seed = (seed % 65536) / 65536;
      this.size = { pixelHeight: 1, pixelWidth: 1 };
      this.handleContextLost = this.handleContextLost.bind(this);
    }

    mount(canvas) {
      this.canvas = canvas;
      this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
      this.gl =
        canvas.getContext("webgl", WEBGL_CONTEXT_OPTIONS) ||
        canvas.getContext("experimental-webgl", WEBGL_CONTEXT_OPTIONS);
      if (!this.gl) {
        console.warn("Pace Pets Big Bang WebGL unavailable.");
        this.destroy();
        return false;
      }

      try {
        this.resources = createResources(this.gl);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.clearColor(0, 0, 0, 0);
        this.size = configureCanvas(this.canvas, this.gl);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        return true;
      } catch (error) {
        console.warn("Pace Pets Big Bang WebGL setup failed:", error);
        this.destroy();
        return false;
      }
    }

    render(elapsedMs, opacity) {
      if (
        this.contextLost ||
        !this.canvas ||
        !this.gl ||
        !this.resources ||
        elapsedMs < START_MS
      ) {
        return;
      }

      const gl = this.gl;
      const localMs = elapsedMs - START_MS;
      this.size = configureCanvas(this.canvas, gl);
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
      gl.uniform1f(this.resources.localMsUniform, localMs);
      gl.uniform1f(this.resources.opacityUniform, opacity);
      gl.uniform1f(this.resources.seedUniform, this.seed);
      gl.uniform1f(this.resources.timeUniform, elapsedMs / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    handleContextLost(event) {
      event.preventDefault();
      this.contextLost = true;
      this.resources = null;
      console.warn("Pace Pets Big Bang WebGL context lost.");
    }

    destroy() {
      if (this.canvas) {
        this.canvas.removeEventListener(
          "webglcontextlost",
          this.handleContextLost,
        );
      }
      if (this.gl && this.resources && !this.contextLost) {
        this.gl.deleteBuffer(this.resources.quadBuffer);
        this.gl.deleteProgram(this.resources.program);
      }
      this.canvas = null;
      this.gl = null;
      this.resources = null;
    }
  }

  root.PacePetsDashboardBigBangWebglRenderer = Object.freeze({
    create: (options) => new BigBangWebglRenderer(options),
  });
})(globalThis);
