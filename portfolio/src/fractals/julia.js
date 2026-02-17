/**
 * Julia set renderer using raw WebGL
 * Provides shader source code and WebGL setup helpers
 */

// Vertex shader - renders a full-screen quad covering NDC space
export const VERTEX_SHADER = `#version 300 es
precision highp float;

void main() {
  // Full-screen quad: two triangles, 6 vertices
  const vec2 pos[6] = vec2[6](
    vec2(-1, -1), vec2( 1, -1), vec2(-1,  1),
    vec2(-1,  1), vec2( 1, -1), vec2( 1,  1)
  );
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}
`

// Fragment shader - renders the Julia set with smooth coloring
// Key difference from Mandelbrot: c is a uniform (from mouse), z is derived from pixel position
export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform vec2 u_c;
uniform int u_maxIter;

vec2 complexMul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float julia(vec2 z) {
  for (int i = 0; i < 256; i++) {
    if (i >= u_maxIter) break;

    z = complexMul(z, z) + u_c;

    if (dot(z, z) > 4.0) {
      // Smooth iteration count using continuous escape time
      float zlen = length(z);
      float smoothVal = float(i) - log2(max(zlen, 1.0));
      return smoothVal;
    }
  }
  return 0.0; // Inside the set
}

// Sinusoidal color mapping producing deep teals, electric cyans, and near-black voids
// Same palette as Mandelbrot for visual continuity
vec3 palette(float t) {
  // Normalized iteration value
  float x = t * 0.1;

  // Sinusoidal RGB functions for smooth, branching color transitions
  vec3 color = vec3(
    0.5 + 0.5 * sin(x * 3.14159 + 0.0),      // Red channel
    0.5 + 0.5 * sin(x * 3.14159 + 2.0),      // Green channel
    0.5 + 0.5 * sin(x * 3.14159 + 4.0)       // Blue channel
  );

  // Enhance cyan/teal tones by boosting green and blue, reducing red in lower iterations
  color.r *= 0.7;
  color.g = mix(color.g, 1.0, 0.3);
  color.b = mix(color.b, 1.0, 0.4);

  // Add more saturation and depth for "void" effect in the set interior
  if (t < 0.1) {
    color = mix(color, vec3(0.0), 0.8);
  }

  return color;
}

void main() {
  // Map pixel coordinates to complex plane
  // For Julia sets, this becomes the initial z value
  vec2 pixelCoord = gl_FragCoord.xy;
  vec2 centerPixel = u_resolution * 0.5;
  vec2 offsetFromCenter = pixelCoord - centerPixel;

  // Scale by zoom and aspect ratio
  vec2 z = offsetFromCenter / u_zoom;

  // Apply center pan
  z += u_center;

  // Compute Julia set
  float val = julia(z);

  // Map iteration count to color
  vec3 col = palette(val);

  outColor = vec4(col, 1.0);
}
`

/**
 * Compile a GLSL shader
 * @param {WebGLRenderingContext} gl
 * @param {string} source
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @returns {WebGLShader}
 */
export function compileShader(gl, source, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    console.error(
      `Failed to compile ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:`,
      error
    )
    return null
  }

  return shader
}

/**
 * Create and link a WebGL program
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader} vertexShader
 * @param {WebGLShader} fragmentShader
 * @returns {WebGLProgram}
 */
export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    console.error('Failed to link WebGL program:', error)
    return null
  }

  return program
}

/**
 * Create a VAO for a full-screen quad
 * @param {WebGLRenderingContext} gl
 * @returns {WebGLVertexArrayObject}
 */
export function createQuadVAO(gl) {
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  // No buffer needed - we generate vertices in the vertex shader using gl_VertexID
  gl.bindVertexArray(null)
  return vao
}
