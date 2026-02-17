/**
 * Sierpinski Triangle Renderer - Chaos Game Algorithm
 * Uses iterative approach to generate a beautiful materializing triangle effect
 */

/**
 * Render Sierpinski triangle using chaos game algorithm
 * @param {HTMLCanvasElement} canvas - Canvas to render on
 * @param {Object} options - Configuration
 * @param {number} options.progress - Animation progress (0-1)
 * @param {number} options.depth - Max points to plot (default: 100000)
 * @param {string} options.color - Color for points (default: '#00f5d4')
 * @param {number} options.bgAlpha - Background alpha (default: 0)
 */
export function renderSierpinski(canvas, options = {}) {
  const {
    progress = 0,
    depth = 100000,
    color = '#00f5d4',
    bgAlpha = 0,
  } = options

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Define triangle vertices
  // Using a nice tall triangle centered in canvas
  const width = canvas.width
  const height = canvas.height
  const padding = Math.min(width, height) * 0.1

  const vertices = [
    { x: width / 2, y: padding }, // Top
    { x: padding, y: height - padding }, // Bottom-left
    { x: width - padding, y: height - padding }, // Bottom-right
  ]

  // Clear canvas with optional background
  if (bgAlpha > 0) {
    ctx.fillStyle = `rgba(5, 5, 8, ${bgAlpha})`
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  // Calculate how many points to render based on progress
  const pointsToRender = Math.floor(depth * progress)
  if (pointsToRender === 0) return

  // Use seeded random for deterministic chaos game
  // Start at a random point inside the triangle
  let x = Math.random() * width
  let y = Math.random() * height

  // Use a consistent seed per canvas for reproducible results
  const seed = width + height
  let rng = mulberry32(seed)

  // Set point color with slight alpha variation for subtle depth
  ctx.fillStyle = color

  // Iterate chaos game: pick random vertex, move halfway toward it, plot point
  for (let i = 0; i < pointsToRender; i++) {
    // Pick random vertex
    const vertex = vertices[Math.floor(rng() * 3)]

    // Move halfway toward the vertex
    x = (x + vertex.x) / 2
    y = (y + vertex.y) / 2

    // Skip first few points to avoid showing the starting region
    if (i < 10) continue

    // Draw point with slight alpha variation based on iteration count
    const alpha = 0.3 + Math.sin(i * 0.001) * 0.2 // Varies 0.1 to 0.5
    ctx.globalAlpha = alpha
    ctx.fillRect(x, y, 1, 1)
  }

  ctx.globalAlpha = 1
}

/**
 * Mulberry32 - Fast 32-bit seeded random number generator
 * Returns value in [0, 1) range
 */
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
