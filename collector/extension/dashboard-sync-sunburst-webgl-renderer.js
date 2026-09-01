((root) => {
  "use strict";

  const RAYS = root.PacePetsDashboardSyncSunburstRays;
  const SHADERS = root.PacePetsDashboardSyncSunburstShaders;
  if (!RAYS || !SHADERS) {
    throw new Error(
      "Sync sunburst rays and shaders must load before its WebGL renderer.",
    );
  }

  const ATTRIBUTE_FLOATS = 24;
  const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
  const STRIDE_BYTES = ATTRIBUTE_FLOATS * FLOAT_BYTES;
  const VERTICES_PER_RAY = 6;
  const WEBGL_CONTEXT_OPTIONS = Object.freeze({
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
  });
  const ATTRIBUTE_LAYOUT = Object.freeze([
    ["a_geometry", 4, 0],
    ["a_meta", 4, 4],
    ["a_timing", 4, 8],
    ["a_motionA", 4, 12],
    ["a_motionB", 4, 16],
    ["a_tone", 4, 20],
  ]);

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Could not create a sync sunburst shader.");
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader)?.trim() || "unknown error";
      gl.deleteShader(shader);
      throw new Error(`Sync sunburst shader failed: ${message}`);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = compileShader(
      gl,
      gl.VERTEX_SHADER,
      SHADERS.VERTEX_SHADER_SOURCE,
    );
    let fragment;
    try {
      fragment = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        SHADERS.FRAGMENT_SHADER_SOURCE,
      );
    } catch (error) {
      gl.deleteShader(vertex);
      throw error;
    }
    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      throw new Error("Could not create the sync sunburst program.");
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program)?.trim() || "unknown error";
      gl.deleteProgram(program);
      throw new Error(`Sync sunburst program failed: ${message}`);
    }
    return program;
  }

  function requiredUniform(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
      throw new Error(`Sync sunburst uniform ${name} is missing.`);
    }
    return location;
  }

  function createResources(gl) {
    const program = createProgram(gl);
    let buffer = null;
    try {
      buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error("Could not create the sync sunburst ray buffer.");
      }
      const attributes = new Map();
      for (const [name, size, offset] of ATTRIBUTE_LAYOUT) {
        const location = gl.getAttribLocation(program, name);
        if (location < 0) {
          throw new Error(`Sync sunburst attribute ${name} is missing.`);
        }
        attributes.set(name, { location, offset, size });
      }
      const uniforms = Object.fromEntries(
        [
          "u_finishedAtMs",
          "u_frameOpacity",
          "u_halfSize",
          "u_progress",
          "u_radius",
          "u_timeMs",
        ].map((name) => [name, requiredUniform(gl, program, name)]),
      );
      return { attributes, buffer, program, uniforms };
    } catch (error) {
      if (buffer) {
        gl.deleteBuffer(buffer);
      }
      gl.deleteProgram(program);
      throw error;
    }
  }

  function writeVertex(data, offset, ray, corner, turnover) {
    const [side, isOuter] = corner;
    const fade = turnover.fadeState(ray);
    data.set([ray.angle, ray.width, ray.innerWidthScale, side], offset);
    data.set([isOuter, isOuter, ray.length, ray.alpha], offset + 4);
    data.set(
      [ray.delay, ray.duration, ray.blur, ray.tipLightness / 100],
      offset + 8,
    );
    data.set(
      [
        ray.lengthMotionAmplitude,
        ray.lengthMotionDurationMs,
        ray.lengthMotionPhase,
        ray.lengthMotionSecondaryDurationMs,
      ],
      offset + 12,
    );
    data.set(
      [
        ray.lengthMotionSecondaryPhase,
        fade?.mode || 0,
        fade?.startedAtMs || 0,
        fade?.durationMs || 1,
      ],
      offset + 16,
    );
    data.set(
      [
        ray.hue,
        ray.saturation / 100,
        ray.highlightLightness / 100,
        ray.bodyLightness / 100,
      ],
      offset + 20,
    );
  }

  function rayBufferData(rays, turnover) {
    const data = new Float32Array(
      rays.length * VERTICES_PER_RAY * ATTRIBUTE_FLOATS,
    );
    const corners = [
      [-1, 0],
      [-1, 1],
      [1, 1],
      [-1, 0],
      [1, 1],
      [1, 0],
    ];
    let offset = 0;
    for (const ray of rays) {
      for (const corner of corners) {
        writeVertex(data, offset, ray, corner, turnover);
        offset += ATTRIBUTE_FLOATS;
      }
    }
    return data;
  }

  class SyncSunburstWebglRenderer {
    constructor(canvas, callbacks) {
      this.callbacks = callbacks;
      this.canvas = canvas;
      this.contextLost = false;
      this.gl = null;
      this.halfSize = 1;
      this.rays = [];
      this.resources = null;
      this.turnover = null;
      this.uniformValues = null;
      this.vertexCount = 0;
      this.handleContextLost = this.handleContextLost.bind(this);
      this.handleContextRestored = this.handleContextRestored.bind(this);
    }

    mount() {
      this.canvas.addEventListener("webglcontextlost", this.handleContextLost);
      this.canvas.addEventListener(
        "webglcontextrestored",
        this.handleContextRestored,
      );
      return this.initialize();
    }

    initialize() {
      this.gl =
        this.canvas.getContext("webgl", WEBGL_CONTEXT_OPTIONS) ||
        this.canvas.getContext("experimental-webgl", WEBGL_CONTEXT_OPTIONS);
      if (!this.gl) {
        return false;
      }
      try {
        this.resources = createResources(this.gl);
        const gl = this.gl;
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.useProgram(this.resources.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.buffer);
        for (const {
          location,
          offset,
          size,
        } of this.resources.attributes.values()) {
          gl.enableVertexAttribArray(location);
          gl.vertexAttribPointer(
            location,
            size,
            gl.FLOAT,
            false,
            STRIDE_BYTES,
            offset * FLOAT_BYTES,
          );
        }
        this.uniformValues = Object.create(null);
        return true;
      } catch (error) {
        root.console.warn("Pace Pets sync sunburst WebGL setup failed:", error);
        this.releaseResources();
        return false;
      }
    }

    resize(layout, origin) {
      const blurPadding = RAYS.MAX_BLUR_PX * 3;
      this.halfSize = Math.ceil(
        layout.radius * RAYS.MAX_EXTENT_SCALE + blurPadding,
      );
      const cssSize = this.halfSize * 2;
      const pixelSize = Math.round(cssSize * layout.pixelRatio);
      this.canvas.style.height = `${cssSize}px`;
      this.canvas.style.left = `${origin.x - this.halfSize}px`;
      this.canvas.style.top = `${origin.y - this.halfSize}px`;
      this.canvas.style.width = `${cssSize}px`;
      if (this.canvas.width !== pixelSize || this.canvas.height !== pixelSize) {
        this.canvas.width = pixelSize;
        this.canvas.height = pixelSize;
        this.gl?.viewport(0, 0, pixelSize, pixelSize);
      }
    }

    uploadRays(rays, turnover) {
      this.rays = rays;
      this.turnover = turnover;
      this.vertexCount = rays.length * VERTICES_PER_RAY;
      if (!this.gl || !this.resources || this.contextLost) {
        return;
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.resources.buffer);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        rayBufferData(rays, turnover),
        this.gl.DYNAMIC_DRAW,
      );
    }

    uploadUniformIfChanged(name, value) {
      if (this.uniformValues[name] === value) {
        return;
      }
      this.gl.uniform1f(this.resources.uniforms[name], value);
      this.uniformValues[name] = value;
    }

    render(frame) {
      if (
        !this.gl ||
        !this.resources ||
        !this.uniformValues ||
        this.contextLost
      ) {
        return false;
      }
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.uploadUniformIfChanged("u_finishedAtMs", frame.finishedAtMs ?? -1);
      this.uploadUniformIfChanged("u_frameOpacity", frame.opacity);
      this.uploadUniformIfChanged("u_halfSize", this.halfSize);
      this.uploadUniformIfChanged("u_progress", frame.progress);
      this.uploadUniformIfChanged("u_radius", frame.radius);
      this.uploadUniformIfChanged("u_timeMs", frame.timestamp);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
      return true;
    }

    handleContextLost(event) {
      event.preventDefault();
      this.contextLost = true;
      this.resources = null;
      this.uniformValues = null;
      this.callbacks.onContextLost();
      root.console.warn("Pace Pets sync sunburst WebGL context lost.");
    }

    handleContextRestored() {
      this.contextLost = false;
      if (!this.initialize()) {
        this.callbacks.onRestoreFailed();
        return;
      }
      this.uploadRays(this.rays, this.turnover);
      this.callbacks.onContextRestored();
    }

    releaseResources() {
      if (this.gl && this.resources && !this.contextLost) {
        this.gl.deleteBuffer(this.resources.buffer);
        this.gl.deleteProgram(this.resources.program);
      }
      this.resources = null;
      this.uniformValues = null;
    }

    destroy() {
      this.canvas.removeEventListener(
        "webglcontextlost",
        this.handleContextLost,
      );
      this.canvas.removeEventListener(
        "webglcontextrestored",
        this.handleContextRestored,
      );
      this.releaseResources();
      this.gl = null;
      this.rays = [];
      this.turnover = null;
    }
  }

  function create(canvas, callbacks) {
    const renderer = new SyncSunburstWebglRenderer(canvas, callbacks);
    if (!renderer.mount()) {
      renderer.destroy();
      root.console.warn("Pace Pets sync sunburst WebGL unavailable.");
      return null;
    }
    return renderer;
  }

  root.PacePetsDashboardSyncSunburstWebglRenderer = Object.freeze({ create });
})(globalThis);
