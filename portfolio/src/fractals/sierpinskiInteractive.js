/**
 * Sierpinski Triangle Interactive Geometry Module
 * Pure functions — no React, no DOM, no side effects.
 */

/**
 * Get the three sub-triangle vertex arrays from a parent triangle.
 * @param {number[][]} vertices - [[x,y], [x,y], [x,y]] for top, bottom-left, bottom-right
 * @returns {number[][][]} Array of 3 sub-triangles, each with 3 vertices
 */
export function getSubTriangles(vertices) {
  const [top, bl, br] = vertices
  const midTopBL = midpoint(top, bl)
  const midTopBR = midpoint(top, br)
  const midBLBR = midpoint(bl, br)

  return [
    [top, midTopBL, midTopBR],       // 0: top sub-triangle
    [midTopBL, bl, midBLBR],         // 1: bottom-left sub-triangle
    [midTopBR, midBLBR, br],         // 2: bottom-right sub-triangle
  ]
}

/**
 * Follow an address path to get the target triangle's vertices.
 * @param {number[][]} rootVertices - Root triangle vertices
 * @param {number[]} address - Path like [0, 2, 1]
 * @returns {number[][]} The target triangle's vertices
 */
export function getTriangleAtAddress(rootVertices, address) {
  let current = rootVertices
  for (const index of address) {
    current = getSubTriangles(current)[index]
  }
  return current
}

/**
 * Barycentric point-in-triangle test.
 * @param {number[]} point - [x, y]
 * @param {number[][]} triangle - [[x,y], [x,y], [x,y]]
 * @returns {boolean}
 */
export function pointInTriangle(point, triangle) {
  const [p, a, b, c] = [point, ...triangle]
  const v0 = [c[0] - a[0], c[1] - a[1]]
  const v1 = [b[0] - a[0], b[1] - a[1]]
  const v2 = [p[0] - a[0], p[1] - a[1]]

  const dot00 = v0[0] * v0[0] + v0[1] * v0[1]
  const dot01 = v0[0] * v1[0] + v0[1] * v1[1]
  const dot02 = v0[0] * v2[0] + v0[1] * v2[1]
  const dot11 = v1[0] * v1[0] + v1[1] * v1[1]
  const dot12 = v1[0] * v2[0] + v1[1] * v2[1]

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom

  return u >= 0 && v >= 0 && u + v <= 1
}

/**
 * Hit-test which of the 3 sub-triangles a point falls in.
 * Returns 0, 1, 2 for the sub-triangle index, or -1 if in the center void.
 * @param {number[]} point - [x, y]
 * @param {number[][]} viewTriangle - Current view triangle vertices
 * @returns {number} Sub-triangle index or -1
 */
export function hitTestSubTriangle(point, viewTriangle) {
  const subs = getSubTriangles(viewTriangle)
  for (let i = 0; i < 3; i++) {
    if (pointInTriangle(point, subs[i])) return i
  }
  return -1
}

/**
 * Compute centroid of a triangle.
 * @param {number[][]} vertices - [[x,y], [x,y], [x,y]]
 * @returns {number[]} [cx, cy]
 */
export function centroid(vertices) {
  return [
    (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
    (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
  ]
}

/**
 * Compute the area of a triangle (used for label visibility thresholds).
 * @param {number[][]} vertices
 * @returns {number} Absolute area
 */
export function triangleArea(vertices) {
  const [a, b, c] = vertices
  return Math.abs(
    (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
  ) / 2
}

/**
 * Render the Sierpinski triangle deterministically with recursive subdivision.
 * Draws filled sub-triangles and leaves center voids empty.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[][]} vertices - Triangle vertices
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @param {Object} options
 * @param {number} options.hoveredIndex - Index of hovered sub-triangle at depth 0 (-1 for none)
 * @param {number[]} options.hoveredAddress - Full address of current view for coloring
 */
export function renderSierpinskiDeterministic(ctx, vertices, depth, maxDepth, options = {}) {
  const { hoveredIndex = -1 } = options

  if (depth >= maxDepth) {
    // At max depth, fill the triangle
    drawFilledTriangle(ctx, vertices, 'rgba(0, 245, 212, 0.15)')
    return
  }

  const subs = getSubTriangles(vertices)

  for (let i = 0; i < 3; i++) {
    if (depth === 0 && i === hoveredIndex) {
      // Draw hovered sub-triangle with highlight
      renderSubTreeHighlighted(ctx, subs[i], 1, maxDepth)
    } else {
      renderSierpinskiDeterministic(ctx, subs[i], depth + 1, maxDepth, options)
    }
  }

  // Draw triangle outline at depth 0
  if (depth === 0) {
    drawTriangleOutline(ctx, vertices, 'rgba(0, 245, 212, 0.3)', 1.5)
  }
}

/**
 * Render a subtree with highlight effect.
 */
function renderSubTreeHighlighted(ctx, vertices, depth, maxDepth) {
  if (depth >= maxDepth) {
    drawFilledTriangle(ctx, vertices, 'rgba(0, 245, 212, 0.35)')
    return
  }

  const subs = getSubTriangles(vertices)
  for (let i = 0; i < 3; i++) {
    renderSubTreeHighlighted(ctx, subs[i], depth + 1, maxDepth)
  }
}

/**
 * Draw a filled triangle on canvas.
 */
function drawFilledTriangle(ctx, vertices, fillStyle) {
  ctx.beginPath()
  ctx.moveTo(vertices[0][0], vertices[0][1])
  ctx.lineTo(vertices[1][0], vertices[1][1])
  ctx.lineTo(vertices[2][0], vertices[2][1])
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
}

/**
 * Draw a triangle outline.
 */
function drawTriangleOutline(ctx, vertices, strokeStyle, lineWidth = 1) {
  ctx.beginPath()
  ctx.moveTo(vertices[0][0], vertices[0][1])
  ctx.lineTo(vertices[1][0], vertices[1][1])
  ctx.lineTo(vertices[2][0], vertices[2][1])
  ctx.closePath()
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

/**
 * Midpoint of two 2D points.
 */
function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

/**
 * Linearly interpolate between two sets of triangle vertices.
 * @param {number[][]} from - Start triangle
 * @param {number[][]} to - End triangle
 * @param {number} t - Interpolation factor [0, 1]
 * @returns {number[][]}
 */
export function lerpTriangles(from, to, t) {
  return from.map((v, i) => [
    v[0] + (to[i][0] - v[0]) * t,
    v[1] + (to[i][1] - v[1]) * t,
  ])
}
