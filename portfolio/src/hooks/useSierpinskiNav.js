import { useState, useRef, useCallback, useEffect } from 'react'
import { lerpTriangles } from '@/fractals/sierpinskiInteractive'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const ZOOM_DURATION = 600

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Scale a triangle by 2x from one of its own vertices.
 * This maps the sub-triangle at `anchorIndex` exactly onto the original triangle,
 * exploiting Sierpinski self-similarity.
 *
 *   scaleFrom(root, 0) → 2x from top vertex → sub-triangle 0 of result === root
 *   scaleFrom(root, 1) → 2x from bottom-left → sub-triangle 1 of result === root
 *   scaleFrom(root, 2) → 2x from bottom-right → sub-triangle 2 of result === root
 */
function scaleTriangleFromVertex(vertices, anchorIndex) {
  const anchor = vertices[anchorIndex]
  return vertices.map((v) => [
    anchor[0] + 2 * (v[0] - anchor[0]),
    anchor[1] + 2 * (v[1] - anchor[1]),
  ])
}

/**
 * Self-similar zoom state machine for Sierpinski navigation.
 *
 * Key insight: the fractal looks identical at every zoom level.
 * So we always render from the same root vertices — only the labels change.
 *
 * Zoom-in to sub i:
 *   Animate rootVertices → scaledVertices (2x from corner i).
 *   Sub-triangle i of the scaled version === rootVertices, so when
 *   animation completes we snap back to rootVertices seamlessly.
 *
 * Zoom-out from sub i:
 *   Start at scaledVertices (looks identical due to self-similarity),
 *   animate back to rootVertices (the parent shrinks into view).
 */
export function useSierpinskiNav(rootVertices) {
  const reducedMotion = useReducedMotion()

  const [currentAddress, setCurrentAddress] = useState([])
  const [renderVertices, setRenderVertices] = useState(rootVertices)
  const [hoveredIndex, setHoveredIndex] = useState(-1)
  const [isAnimating, setIsAnimating] = useState(false)

  const rafRef = useRef(null)

  // Sync when root changes (resize) and not animating
  useEffect(() => {
    if (!isAnimating && rootVertices) {
      setRenderVertices(rootVertices)
    }
  }, [rootVertices, isAnimating])

  const cancelAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => cancelAnimation, [cancelAnimation])

  const animateVertices = useCallback(
    (from, to, onComplete) => {
      if (reducedMotion) {
        setRenderVertices(to)
        onComplete()
        return
      }

      const startTime = performance.now()

      const tick = () => {
        const elapsed = performance.now() - startTime
        const t = Math.min(elapsed / ZOOM_DURATION, 1)
        const eased = easeInOut(t)

        setRenderVertices(lerpTriangles(from, to, eased))

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          rafRef.current = null
          onComplete()
        }
      }

      cancelAnimation()
      rafRef.current = requestAnimationFrame(tick)
    },
    [reducedMotion, cancelAnimation]
  )

  const zoomIn = useCallback(
    (subIndex) => {
      if (isAnimating || !rootVertices) return

      const newAddress = [...currentAddress, subIndex]
      const scaledVerts = scaleTriangleFromVertex(rootVertices, subIndex)

      setHoveredIndex(-1)
      setIsAnimating(true)

      // Animate: root → scaled (sub-triangle expands to fill viewport)
      // On complete: snap back to root (self-similar, seamless) & update address
      animateVertices(rootVertices, scaledVerts, () => {
        setCurrentAddress(newAddress)
        setRenderVertices(rootVertices)
        setIsAnimating(false)
      })
    },
    [isAnimating, rootVertices, currentAddress, animateVertices]
  )

  const zoomOut = useCallback(() => {
    if (isAnimating || currentAddress.length === 0 || !rootVertices) return

    const lastIdx = currentAddress[currentAddress.length - 1]
    const parentAddress = currentAddress.slice(0, -1)
    const scaledVerts = scaleTriangleFromVertex(rootVertices, lastIdx)

    setHoveredIndex(-1)
    setIsAnimating(true)
    setCurrentAddress(parentAddress)

    // Start from scaled (looks identical — self-similarity)
    // Animate: scaled → root (parent zooms out into view)
    animateVertices(scaledVerts, rootVertices, () => {
      setIsAnimating(false)
    })
  }, [isAnimating, currentAddress, rootVertices, animateVertices])

  const zoomToRoot = useCallback(() => {
    if (isAnimating || currentAddress.length === 0) return
    setHoveredIndex(-1)
    setCurrentAddress([])
    setRenderVertices(rootVertices)
  }, [isAnimating, currentAddress, rootVertices])

  const zoomToAddress = useCallback(
    (address) => {
      if (isAnimating) return
      setHoveredIndex(-1)
      setCurrentAddress(address)
      setRenderVertices(rootVertices)
    },
    [isAnimating, rootVertices]
  )

  return {
    currentAddress,
    renderVertices,
    hoveredIndex,
    isAnimating,
    setHoveredIndex,
    zoomIn,
    zoomOut,
    zoomToRoot,
    zoomToAddress,
  }
}
