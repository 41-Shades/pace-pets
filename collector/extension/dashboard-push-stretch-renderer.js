((root) => {
  "use strict";

  const AXIS_ANGLE_RAD = (-52 * Math.PI) / 180;
  const AXIS_LENGTH = 0.69;
  const EXTREME_INTERVAL_RANGE = Object.freeze([4, 6]);
  const IMAGE_OUTSET = 0.03;
  const LAYER_OUTSET = 3;
  const MESH_COLUMNS = 28;
  const MESH_ROWS = 28;
  const PULSE_DURATION_MS = 2150;
  const ROOT = Object.freeze({ x: 0.2, y: 0.84 });
  const AXIS = Object.freeze({
    x: Math.cos(AXIS_ANGLE_RAD),
    y: Math.sin(AXIS_ANGLE_RAD),
  });
  const PERP = Object.freeze({ x: -AXIS.y, y: AXIS.x });
  const NORMAL_PROFILE = Object.freeze({
    activeStart: 0.08,
    axisScale: 0.38,
    exponent: 1.28,
    keyframes: Object.freeze([
      [0, 0],
      [0.18, 0],
      [0.3, 0.18],
      [0.52, 1],
      [0.66, 0.58],
      [0.8, 0.12],
      [0.88, 0],
      [1, 0],
    ]),
    perpScale: 0.24,
  });
  const EXTREME_PROFILE = Object.freeze({
    activeStart: 0.18,
    axisScale: 1.68,
    exponent: 0.72,
    keyframes: Object.freeze([
      [0, 0],
      [0.16, 0],
      [0.28, 0.2],
      [0.52, 1],
      [0.68, 0.46],
      [0.82, 0.08],
      [0.9, 0],
      [1, 0],
    ]),
    perpScale: 1.05,
  });
  const VERTEX_SHADER_SOURCE = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  const FRAGMENT_SHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `;

  function imageRect() {
    const layerSize = 1 + LAYER_OUTSET * 2;
    return {
      size: (1 + IMAGE_OUTSET * 2) / layerSize,
      x: (LAYER_OUTSET - IMAGE_OUTSET) / layerSize,
      y: (LAYER_OUTSET - IMAGE_OUTSET) / layerSize,
    };
  }

  function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function interpolate(from, to, amount) {
    const eased = amount * amount * (3 - 2 * amount);
    return from + (to - from) * eased;
  }

  function pulseAmount(profile, phase) {
    for (let index = 1; index < profile.keyframes.length; index += 1) {
      const [time, value] = profile.keyframes[index];
      if (phase <= time) {
        const [previousTime, previousValue] = profile.keyframes[index - 1];
        const span = time - previousTime || 1;
        return interpolate(previousValue, value, (phase - previousTime) / span);
      }
    }
    return 0;
  }

  function strengthForProgress(progress, profile) {
    const activeProgress = clamp(
      (progress - profile.activeStart) / (1 - profile.activeStart),
    );
    return activeProgress ** profile.exponent;
  }

  function transformLayerPoint(rect, profile, amount, x, y) {
    const root = {
      x: rect.x + ROOT.x * rect.size,
      y: rect.y + ROOT.y * rect.size,
    };
    const dx = x - root.x;
    const dy = y - root.y;
    const along = dx * AXIS.x + dy * AXIS.y;
    const across = dx * PERP.x + dy * PERP.y;
    const progress = clamp(along / (AXIS_LENGTH * rect.size));
    const strength = strengthForProgress(progress, profile) * amount;
    const stretchedAlong = along * (1 + profile.axisScale * strength);
    const stretchedAcross = across * (1 + profile.perpScale * strength);
    return {
      x: root.x + AXIS.x * stretchedAlong + PERP.x * stretchedAcross,
      y: root.y + AXIS.y * stretchedAlong + PERP.y * stretchedAcross,
    };
  }

  function transformImagePoint(rect, profile, amount, point) {
    return transformLayerPoint(
      rect,
      profile,
      amount,
      rect.x + point.x * rect.size,
      rect.y + point.y * rect.size,
    );
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl) {
    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      VERTEX_SHADER_SOURCE,
    );
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER_SOURCE,
    );
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function createMesh() {
    const rect = imageRect();
    const vertexCount = (MESH_COLUMNS + 1) * (MESH_ROWS + 1);
    const base = new Float32Array(vertexCount * 2);
    const positions = new Float32Array(vertexCount * 2);
    const texCoords = new Float32Array(vertexCount * 2);
    const indices = [];
    let vertex = 0;
    for (let row = 0; row <= MESH_ROWS; row += 1) {
      for (let column = 0; column <= MESH_COLUMNS; column += 1) {
        const u = column / MESH_COLUMNS;
        const v = row / MESH_ROWS;
        base[vertex * 2] = rect.x + u * rect.size;
        base[vertex * 2 + 1] = rect.y + v * rect.size;
        texCoords[vertex * 2] = u;
        texCoords[vertex * 2 + 1] = v;
        vertex += 1;
      }
    }
    for (let row = 0; row < MESH_ROWS; row += 1) {
      for (let column = 0; column < MESH_COLUMNS; column += 1) {
        const topLeft = row * (MESH_COLUMNS + 1) + column;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + MESH_COLUMNS + 1;
        const bottomRight = bottomLeft + 1;
        indices.push(
          topLeft,
          bottomLeft,
          topRight,
          topRight,
          bottomLeft,
          bottomRight,
        );
      }
    }
    return {
      base,
      indices: new Uint16Array(indices),
      positions,
      rect,
      texCoords,
    };
  }

  function updateMesh(mesh, profile, amount) {
    for (let index = 0; index < mesh.base.length; index += 2) {
      const next = transformLayerPoint(
        mesh.rect,
        profile,
        amount,
        mesh.base[index],
        mesh.base[index + 1],
      );
      mesh.positions[index] = next.x * 2 - 1;
      mesh.positions[index + 1] = 1 - next.y * 2;
    }
  }

  function createRenderer(canvas, image) {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) {
      return null;
    }
    const program = createProgram(gl);
    if (!program) {
      return null;
    }
    const mesh = createMesh();
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    return {
      destroy() {
        gl.deleteBuffer(positionBuffer);
        gl.deleteBuffer(texCoordBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
      },
      imageUnit() {
        return mesh.rect.size;
      },
      pointFor(profile, amount, point) {
        return transformImagePoint(mesh.rect, profile, amount, point);
      },
      render(profile, amount) {
        const rect = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width * pixelRatio));
        const height = Math.max(1, Math.round(rect.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        updateMesh(mesh, profile, amount);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.drawElements(
          gl.TRIANGLES,
          mesh.indices.length,
          gl.UNSIGNED_SHORT,
          0,
        );
      },
    };
  }

  root.PacePetsDashboardPushStretch = Object.freeze({
    EXTREME_INTERVAL_RANGE,
    EXTREME_PROFILE,
    NORMAL_PROFILE,
    PULSE_DURATION_MS,
    createRenderer,
    pulseAmount,
  });
})(globalThis);
