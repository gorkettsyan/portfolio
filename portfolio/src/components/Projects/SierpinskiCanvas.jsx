import { useRef, useEffect, useCallback } from 'react'
import {
  renderSierpinskiDeterministic,
  hitTestSubTriangle,
} from '@/fractals/sierpinskiInteractive'

const MAX_DEPTH = 6

/**
 * Canvas component for the interactive Sierpinski triangle.
 * `renderVertices` may be larger than viewport during zoom animations.
 * Hit-testing uses the stable root-sized triangle derived from the render state.
 */
export function SierpinskiCanvas({
  renderVertices,
  hoveredIndex,
  isAnimating,
  onHover,
  onClick,
  width,
  height,
}) {
  const canvasRef = useRef(null)
  const dprRef = useRef(Math.min(window.devicePixelRatio, 2))

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !renderVertices) return

    const ctx = canvas.getContext('2d')
    const dpr = dprRef.current

    canvas.width = width * dpr
    canvas.height = height * dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    renderSierpinskiDeterministic(ctx, renderVertices, 0, MAX_DEPTH, {
      hoveredIndex: isAnimating ? -1 : hoveredIndex,
    })
  }, [renderVertices, hoveredIndex, isAnimating, width, height])

  useEffect(() => {
    draw()
  }, [draw])

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }, [])

  // Hit-test against renderVertices (which equals rootVertices when not animating)
  const handlePointerMove = useCallback(
    (e) => {
      if (isAnimating) return
      const point = getCanvasPoint(e)
      if (!point) return
      const idx = hitTestSubTriangle(point, renderVertices)
      onHover(idx)
    },
    [isAnimating, renderVertices, onHover, getCanvasPoint]
  )

  const handlePointerLeave = useCallback(() => {
    onHover(-1)
  }, [onHover])

  const handleClick = useCallback(
    (e) => {
      if (isAnimating) return
      const point = getCanvasPoint(e)
      if (!point) return
      const idx = hitTestSubTriangle(point, renderVertices)
      if (idx !== -1) onClick(idx)
    },
    [isAnimating, renderVertices, onClick, getCanvasPoint]
  )

  return (
    <canvas
      ref={canvasRef}
      className="sierpinski-canvas"
      style={{ width, height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      aria-label="Interactive Sierpinski triangle navigation"
      role="img"
    />
  )
}
