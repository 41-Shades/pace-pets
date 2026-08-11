((root) => {
  "use strict";

  const CanvasLayout = root.PacePetsDashboardPushCanvasLayout;
  const Geometry = root.PacePetsDashboardPushStretchGeometry;
  if (!CanvasLayout || !Geometry) {
    throw new Error(
      "Pace push canvas layout and stretch geometry must load before stretch renderer.",
    );
  }

  const VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;
  const FRAGMENT_SHADER = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `;

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
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) {
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function surfacePosition(point, result) {
    const bounds = Geometry.SURFACE_BOUNDS;
    result.x = (point.x - bounds.left) / (bounds.right - bounds.left);
    result.y = (point.y - bounds.top) / (bounds.bottom - bounds.top);
    return result;
  }

  function createMesh() {
    const {
      IMAGE_RECT: rect,
      MESH_COLUMNS: columns,
      MESH_ROWS: rows,
    } = Geometry;
    const vertexCount = (columns + 1) * (rows + 1);
    const base = new Float32Array(vertexCount * 2);
    const positions = new Float32Array(vertexCount * 2);
    const texCoords = new Float32Array(vertexCount * 2);
    const indices = [];
    let vertex = 0;
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const u = column / columns;
        const v = row / rows;
        base[vertex * 2] = rect.x + u * rect.size;
        base[vertex * 2 + 1] = rect.y + v * rect.size;
        texCoords[vertex * 2] = u;
        texCoords[vertex * 2 + 1] = v;
        vertex += 1;
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const topLeft = row * (columns + 1) + column;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + columns + 1;
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
      lastAmount: null,
      lastProfile: null,
      next: { x: 0, y: 0 },
      point: { x: 0, y: 0 },
      positions,
      texCoords,
    };
  }

  function updateMesh(mesh, profile, amount) {
    if (amount === 0 && mesh.lastAmount === 0 && mesh.lastProfile === profile) {
      return false;
    }
    for (let index = 0; index < mesh.base.length; index += 2) {
      mesh.point.x = mesh.base[index];
      mesh.point.y = mesh.base[index + 1];
      Geometry.transformPoint(
        Geometry.IMAGE_RECT,
        profile,
        amount,
        mesh.point,
        mesh.next,
      );
      surfacePosition(mesh.next, mesh.next);
      mesh.positions[index] = mesh.next.x * 2 - 1;
      mesh.positions[index + 1] = 1 - mesh.next.y * 2;
    }
    mesh.lastAmount = amount;
    mesh.lastProfile = profile;
    return true;
  }

  function sizeCanvasSurface(canvas) {
    const bounds = Geometry.SURFACE_BOUNDS;
    canvas.style.left = `${bounds.left * 100}%`;
    canvas.style.top = `${bounds.top * 100}%`;
    canvas.style.width = `${(bounds.right - bounds.left) * 100}%`;
    canvas.style.height = `${(bounds.bottom - bounds.top) * 100}%`;
  }

  function configureBuffers(gl, program, mesh) {
    const position = gl.createBuffer();
    const texCoord = gl.createBuffer();
    const index = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.texCoords, gl.STATIC_DRAW);
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions.byteLength, gl.DYNAMIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    return { index, position, texCoord };
  }

  function createTexture(gl, image) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    return texture;
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
    sizeCanvasSurface(canvas);
    const mesh = createMesh();
    const buffers = configureBuffers(gl, program, mesh);
    const texture = createTexture(gl, image);
    const layout = CanvasLayout.create(canvas);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return {
      destroy() {
        gl.deleteBuffer(buffers.position);
        gl.deleteBuffer(buffers.texCoord);
        gl.deleteBuffer(buffers.index);
        gl.deleteTexture(texture);
        gl.deleteProgram(program);
      },
      imageUnit() {
        return Geometry.IMAGE_RECT.size;
      },
      invalidateLayout() {
        layout.invalidate();
      },
      pointFor(profile, amount, point, result) {
        return Geometry.transformImagePoint(profile, amount, point, result);
      },
      render(profile, amount) {
        const dimensions = layout.current();
        gl.viewport(0, 0, dimensions.width, dimensions.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (updateMesh(mesh, profile, amount)) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
          gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.positions);
        }
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
    EXTREME_PROFILE: Geometry.EXTREME_PROFILE,
    NORMAL_PROFILE: Geometry.NORMAL_PROFILE,
    PULSE_DURATION_MS: Geometry.PULSE_DURATION_MS,
    RARE_PROFILE: Geometry.RARE_PROFILE,
    SURFACE_BOUNDS: Geometry.SURFACE_BOUNDS,
    createRenderer,
    pulseAmount: Geometry.pulseAmount,
  });
})(globalThis);
