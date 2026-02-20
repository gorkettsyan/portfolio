/**
 * Network Graph Renderer — Canvas 2D
 * Animated connected-nodes visualization for the Contact page.
 * Mouse-reactive: cursor becomes a bright node that connects to nearby nodes.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateNodes(width, height, count, rng) {
  const nodes = []
  const padX = width * 0.06
  const padY = height * 0.06
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: padX + rng() * (width - 2 * padX),
      y: padY + rng() * (height - 2 * padY),
      radius: 2 + rng() * 3,
      phase: rng() * Math.PI * 2,
    })
  }
  return nodes
}

function generateEdges(nodes, maxDist) {
  const edges = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < maxDist) {
        edges.push({ from: i, to: j, dist })
      }
    }
  }
  edges.sort((a, b) => a.dist - b.dist)
  return edges
}

/**
 * Render a network graph with progressive animation and mouse reactivity.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} options.progress - Build-up progress 0→1
 * @param {Object|null} options.mousePos - Normalized mouse pos {x, y} in [-1, 1]
 */
export function renderNetworkGraph(canvas, options = {}) {
  const { progress = 0, mousePos = null } = options
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)
  if (progress === 0) return

  // Cache geometry per canvas size
  if (
    !canvas._networkCache ||
    canvas._networkCache.w !== width ||
    canvas._networkCache.h !== height
  ) {
    const rng = mulberry32(42)
    const nodeCount = 70
    const nodes = generateNodes(width, height, nodeCount, rng)
    const maxDist = Math.min(width, height) * 0.2
    const edges = generateEdges(nodes, maxDist)
    canvas._networkCache = { w: width, h: height, nodes, edges }
  }

  const { nodes, edges } = canvas._networkCache
  const now = performance.now() / 1000
  const maxDist = Math.min(width, height) * 0.2

  // Convert normalized mousePos [-1, 1] → canvas pixel coords
  // mousePos.x: -1 = left, +1 = right
  // mousePos.y: -1 = bottom, +1 = top (WebGL convention, flip Y)
  let mouseX = null
  let mouseY = null
  if (mousePos) {
    mouseX = (mousePos.x * 0.5 + 0.5) * width
    mouseY = (0.5 - mousePos.y * 0.5) * height
  }

  // Progressive reveal
  const nodeProgress = Math.min(progress / 0.5, 1)
  const edgeProgress = Math.max(0, (progress - 0.25) / 0.75)
  const visibleNodes = Math.floor(nodes.length * nodeProgress)
  const visibleEdges = Math.floor(edges.length * edgeProgress)

  // Mouse influence per node (0..1)
  const mouseInfluence = new Array(nodes.length).fill(0)
  const cursorReach = Math.min(width, height) * 0.28
  if (mouseX !== null) {
    for (let i = 0; i < visibleNodes; i++) {
      const node = nodes[i]
      const dx = node.x - mouseX
      const dy = node.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < cursorReach) {
        mouseInfluence[i] = 1 - dist / cursorReach
      }
    }
  }

  // Draw static edges
  ctx.lineCap = 'round'
  for (let i = 0; i < visibleEdges; i++) {
    const edge = edges[i]
    if (edge.from >= visibleNodes || edge.to >= visibleNodes) continue

    const a = nodes[edge.from]
    const b = nodes[edge.to]
    const closeness = 1 - edge.dist / maxDist
    const inf = Math.max(mouseInfluence[edge.from], mouseInfluence[edge.to])
    const alpha = Math.min((0.15 + 0.3 * closeness) * (1 + inf * 2.5), 0.95)

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`
    ctx.lineWidth = 0.8 + closeness * 1.5 + inf * 2.5
    ctx.stroke()
  }

  // Draw cursor → node connections
  if (mouseX !== null && progress >= 0.5) {
    for (let i = 0; i < visibleNodes; i++) {
      const inf = mouseInfluence[i]
      if (inf <= 0) continue
      const node = nodes[i]

      ctx.beginPath()
      ctx.moveTo(mouseX, mouseY)
      ctx.lineTo(node.x, node.y)
      ctx.strokeStyle = `rgba(0, 245, 212, ${0.35 + inf * 0.6})`
      ctx.lineWidth = 0.8 + inf * 3.5
      ctx.stroke()
    }
  }

  // Draw nodes
  for (let i = 0; i < visibleNodes; i++) {
    const node = nodes[i]
    const pulse = Math.sin(now * 1.4 + node.phase) * 0.4
    const inf = mouseInfluence[i]
    const r = node.radius + pulse + inf * node.radius * 1.8

    // Glow halo
    const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 5)
    grd.addColorStop(0, `rgba(0, 245, 212, ${0.18 + inf * 0.4})`)
    grd.addColorStop(1, 'rgba(0, 245, 212, 0)')
    ctx.beginPath()
    ctx.arc(node.x, node.y, r * 5, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    // Core dot
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0, 245, 212, ${0.65 + inf * 0.35})`
    ctx.fill()
  }

  // Draw cursor node
  if (mouseX !== null && progress >= 0.5) {
    const cp = Math.sin(now * 3) * 0.4
    const cr = 5 + cp

    // Outer ring
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, cr * 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Glow
    const grd = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, cr * 7)
    grd.addColorStop(0, 'rgba(0, 245, 212, 0.55)')
    grd.addColorStop(1, 'rgba(0, 245, 212, 0)')
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, cr * 7, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.fill()

    // Core
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, cr, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 245, 212, 1)'
    ctx.fill()
  }
}
