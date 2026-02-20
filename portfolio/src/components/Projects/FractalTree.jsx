import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { projects } from '@/data/projects'
import './FractalTree.css'

const DPR          = Math.min(window.devicePixelRatio, 2)
const GROW_DURATION = 4.5
const MAX_DEPTH    = 3   // 0 = trunk, 1 = category, 2 = project (leaf)

function rng(seed) {
  let s = seed
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296
  }
}

function easeOut(t) { return 1 - Math.pow(1 - t, 2.5) }

// ── Build tree once per canvas size ──
function buildTree(w, h) {
  const rand      = rng(7331)
  const cx        = w / 2
  const baseY     = h * 0.93
  const trunkLen  = h * 0.27
  const leafSize  = h * 0.03   // base leaf size

  const CHILDREN  = [3, 3]
  const SPREADS   = [0.38, 0.30].map(s => s * Math.PI)
  const LEN_SCALE = [0.68, 0.72]

  function node(x1, y1, angle, length, depth, ci, pi) {
    const jitter = depth > 0 ? (rand() - 0.5) * 0.18 : 0
    const a = angle + jitter
    const x2 = x1 + Math.cos(a) * length
    const y2 = y1 + Math.sin(a) * length

    let data = null
    if (depth === 1) data = projects.find(p => p.address.length === 1 && p.address[0] === ci)
    if (depth === 2) data = projects.find(p => p.address.length === 2 && p.address[0] === ci && p.address[1] === pi)

    const n = { x1, y1, x2, y2, angle: a, length, depth,
                phase: rand() * Math.PI * 2, ci, pi, data, children: [] }

    if (depth < MAX_DEPTH - 1) {
      const nc = CHILDREN[depth]
      const spread = SPREADS[depth]
      const cl = length * LEN_SCALE[depth]
      for (let i = 0; i < nc; i++) {
        const sa = nc === 1 ? 0 : -spread / 2 + spread / (nc - 1) * i
        n.children.push(node(x2, y2, a + sa, cl, depth + 1,
          depth === 0 ? i : ci, depth === 1 ? i : pi))
      }
    }

    // Pre-generate leaf cluster for project nodes
    if (depth === MAX_DEPTH - 1) {
      const count = 4 + Math.floor(rand() * 3)  // 4–6 leaves
      n.leaves = Array.from({ length: count }, () => ({
        angleOffset: (rand() - 0.5) * Math.PI * 0.75,
        size:        leafSize * (0.55 + rand() * 0.9),
        phase:       rand() * Math.PI * 2,
        opacity:     0.55 + rand() * 0.45,
      }))
    }

    return n
  }

  return node(cx, baseY, -Math.PI / 2, trunkLen, 0, -1, -1)
}

// ── Draw one organic leaf shape ──
function drawLeaf(ctx, x, y, angle, size, alpha) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo( size * 0.3, -size * 0.38,  size * 0.78, -size * 0.26,  size, 0)
  ctx.bezierCurveTo( size * 0.78, size * 0.26,  size * 0.3,  size * 0.38,   0, 0)
  ctx.closePath()
  ctx.fillStyle = `rgba(0,245,212,${alpha * 0.72})`
  ctx.fill()

  // Central vein
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(size * 0.82, 0)
  ctx.strokeStyle = `rgba(0,245,212,${alpha * 0.38})`
  ctx.lineWidth = 0.5
  ctx.stroke()

  ctx.restore()
}

// ── Falling particle ──
function makeParticle(x, y, wind, size) {
  return {
    x, y,
    vx:    wind * 0.5 + (Math.random() - 0.5) * 0.8,
    vy:    0.35 + Math.random() * 0.9,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.06,
    size:  size * (0.3 + Math.random() * 0.5),
    life:  1.0,
  }
}

// ── Main component ──
export function FractalTree() {
  const canvasRef    = useRef(null)
  const mouseRef     = useRef({ x: 0.5, y: 0.5 })
  const particlesRef = useRef([])
  const leafPosRef   = useRef([])
  const rafRef       = useRef(null)
  const startRef     = useRef(null)
  const hoveredRef   = useRef(null)

  const [dims, setDims]     = useState({ w: window.innerWidth, h: window.innerHeight })
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const h = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const tree = useMemo(() => buildTree(dims.w, dims.h), [dims])

  // ── Animation loop ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = dims.w * DPR
    canvas.height = dims.h * DPR
    const ctx = canvas.getContext('2d')
    ctx.scale(DPR, DPR)

    startRef.current     = performance.now()
    particlesRef.current = []

    function drawBranch(node, t, wind, growth, sx, sy) {
      const dStart = node.depth * 0.26
      const local  = easeOut(Math.min(1, Math.max(0, (growth - dStart) / 0.32)))
      if (local <= 0) return

      // Wind sway — multi-frequency, stronger at tips
      const df   = node.depth / (MAX_DEPTH - 1)
      const sway = wind * df * 0.6 * (
        Math.sin(t * 0.65 + node.phase) +
        Math.sin(t * 1.4  + node.phase * 1.8) * 0.4 +
        Math.sin(t * 2.2  + node.phase * 0.6) * 0.15
      )

      const angle = node.angle + sway
      const len   = node.length * local
      const ex = sx + Math.cos(angle) * len
      const ey = sy + Math.sin(angle) * len

      // Organic curve bow
      const bow = node.length * 0.18 * (sway + Math.sin(t * 0.35 + node.phase) * 0.28)
      const cpx = sx + (ex - sx) * 0.5 + Math.cos(angle + Math.PI / 2) * bow
      const cpy = sy + (ey - sy) * 0.5 + Math.sin(angle + Math.PI / 2) * bow

      // Color: deep teal → bright cyan
      const tc    = node.depth / (MAX_DEPTH - 1)
      const g     = Math.round(175 + tc * 70)
      const b     = Math.round(135 + tc * 77)
      const alpha = 0.28 + tc * 0.52

      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo(cpx, cpy, ex, ey)
      ctx.strokeStyle = `rgba(0,${g},${b},${alpha})`
      ctx.lineWidth   = Math.max(0.5, Math.pow(MAX_DEPTH - node.depth, 1.5) * 0.85)
      ctx.lineCap     = 'round'
      ctx.stroke()

      // ── Leaf cluster at project nodes ──
      if (node.leaves && local > 0.65) {
        const la        = Math.min(1, (local - 0.65) / 0.35)
        const isHovered = hoveredRef.current &&
          hoveredRef.current.ci === node.ci && hoveredRef.current.pi === node.pi

        for (const leaf of node.leaves) {
          // Each leaf sways independently
          const flutter    = wind * 0.35 * Math.sin(t * 2.1 + leaf.phase)
          const leafAngle  = angle + leaf.angleOffset + flutter
          const leafScale  = la * (isHovered ? 1.35 : 1.0)
          const leafAlpha  = leaf.opacity * la * (isHovered ? 1.0 : 0.85)

          // Soft glow behind hovered leaves
          if (isHovered) {
            const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, leaf.size * 1.8)
            grd.addColorStop(0, 'rgba(0,245,212,0.18)')
            grd.addColorStop(1, 'rgba(0,245,212,0)')
            ctx.beginPath()
            ctx.arc(ex, ey, leaf.size * 1.8, 0, Math.PI * 2)
            ctx.fillStyle = grd
            ctx.fill()
          }

          drawLeaf(ctx, ex, ey, leafAngle, leaf.size * leafScale, leafAlpha)
        }

        // Track for hover detection
        leafPosRef.current.push({ x: ex, y: ey, node })

        // Spawn falling leaf particles
        if (la >= 1 && Math.random() < 0.003 && particlesRef.current.length < 80) {
          const ref = node.leaves[Math.floor(Math.random() * node.leaves.length)]
          particlesRef.current.push(makeParticle(ex, ey, wind, ref.size))
        }
        return
      }

      if (local > 0.28) {
        for (const child of node.children) drawBranch(child, t, wind, growth, ex, ey)
      }
    }

    function drawParticles(wind) {
      particlesRef.current = particlesRef.current.filter(p => p.life > 0 && p.y < dims.h + 30)
      for (const p of particlesRef.current) {
        p.x     += p.vx + wind * 0.22
        p.y     += p.vy
        p.angle += p.spin
        p.vy     = Math.min(p.vy + 0.012, 2.5)
        p.vx    *= 0.997
        p.life  -= 0.005

        drawLeaf(ctx, p.x, p.y, p.angle, p.size, p.life * 0.65)
      }
    }

    const animate = () => {
      const elapsed = (performance.now() - startRef.current) / 1000
      const growth  = Math.min(elapsed / GROW_DURATION, 1)
      const wind    = (mouseRef.current.x - 0.5) * 2.2

      ctx.clearRect(0, 0, dims.w, dims.h)
      leafPosRef.current = []

      drawBranch(tree, elapsed, wind, growth, tree.x1, tree.y1)
      drawParticles(wind)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [tree, dims])

  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX / dims.w, y: e.clientY / dims.h }

    let best = null, bestD = 42
    for (const leaf of leafPosRef.current) {
      const d = Math.hypot(leaf.x - e.clientX, leaf.y - e.clientY)
      if (d < bestD) { bestD = d; best = leaf }
    }
    hoveredRef.current = best?.node ?? null
    setHovered(best)
  }, [dims])

  const handleClick = useCallback(() => {
    if (hovered?.node?.data?.url) window.open(hovered.node.data.url, '_blank', 'noopener,noreferrer')
  }, [hovered])

  return (
    <div className="ft-wrap" onMouseMove={handleMouseMove} onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="ft-canvas"
        style={{ width: dims.w, height: dims.h, cursor: hovered?.node?.data?.url ? 'pointer' : 'default' }}
      />
      {hovered?.node?.data && (
        <div className="ft-tooltip" style={{ left: hovered.x + 14, top: hovered.y - 40 }}>
          <span className="ft-tt-title">{hovered.node.data.title}</span>
          {hovered.node.data.description && (
            <span className="ft-tt-desc">{hovered.node.data.description}</span>
          )}
          {hovered.node.data.tech?.length > 0 && (
            <div className="ft-tt-tech">
              {hovered.node.data.tech.map(t => (
                <span key={t} className="ft-tt-chip">{t}</span>
              ))}
            </div>
          )}
          {hovered.node.data.private && (
            <span className="ft-tt-private">private repo</span>
          )}
        </div>
      )}
      <span className="ft-page-label">Projects</span>
    </div>
  )
}
