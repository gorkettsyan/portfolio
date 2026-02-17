/**
 * Network Graph Renderer — Canvas 2D
 * Animated connected-nodes visualization for the Contact page.
 * Nodes and edges form progressively, representing connections.
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
      radius: 1.5 + rng() * 2.5,
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
  // Sort shorter edges first for nicer progressive reveal
  edges.sort((a, b) => a.dist - b.dist)
  return edges
}

/**
 * Render a network graph with progressive animation.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @param {number} options.progress - Build-up progress 0→1
 */
export function renderNetworkGraph(canvas, options = {}) {
  const { progress = 0 } = options
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
    const nodeCount = 55
    const nodes = generateNodes(width, height, nodeCount, rng)
    const maxDist = Math.min(width, height) * 0.17
    const edges = generateEdges(nodes, maxDist)
    canvas._networkCache = { w: width, h: height, nodes, edges }
  }

  const { nodes, edges } = canvas._networkCache
  const now = performance.now() / 1000

  // Progressive reveal: nodes 0→50%, edges 25→100%
  const nodeProgress = Math.min(progress / 0.5, 1)
  const edgeProgress = Math.max(0, (progress - 0.25) / 0.75)

  const visibleNodes = Math.floor(nodes.length * nodeProgress)
  const visibleEdges = Math.floor(edges.length * edgeProgress)

  // Draw edges first (behind nodes)
  ctx.lineCap = 'round'
  for (let i = 0; i < visibleEdges; i++) {
    const edge = edges[i]
    if (edge.from >= visibleNodes || edge.to >= visibleNodes) continue

    const a = nodes[edge.from]
    const b = nodes[edge.to]
    const maxDist = Math.min(width, height) * 0.17
    const closeness = 1 - edge.dist / maxDist
    const alpha = 0.06 + 0.12 * closeness

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`
    ctx.lineWidth = 0.5 + closeness * 0.8
    ctx.stroke()
  }

  // Draw nodes
  for (let i = 0; i < visibleNodes; i++) {
    const node = nodes[i]

    // Gentle pulse after build-up completes
    const pulse = progress >= 1 ? Math.sin(now * 1.2 + node.phase) * 0.4 : 0
    const r = node.radius + pulse

    // Soft glow
    ctx.beginPath()
    ctx.arc(node.x, node.y, r * 3.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 245, 212, 0.03)'
    ctx.fill()

    // Core dot
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 245, 212, 0.45)'
    ctx.fill()
  }
}
