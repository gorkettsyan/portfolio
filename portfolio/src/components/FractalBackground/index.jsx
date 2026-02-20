import { useRef, useState, useEffect, useCallback } from 'react'
import { useFractalEngine } from './useFractalEngine'
import './style.css'

const FADE_DURATION = 1500

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * FractalCanvas — renders a single canvas with one fractal engine.
 * Uses React key={type} externally so canvas remounts on type change.
 */
function FractalCanvas({ type, mousePos, progress, style }) {
  const canvasRef = useRef(null)
  const { isReady, error } = useFractalEngine(canvasRef, type, { mousePos, progress })

  if (!type) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fractal-bg-canvas"
        style={style}
        aria-label="Fractal background"
      />
      {error && (
        <div className="fractal-error-fallback">
          {error}
        </div>
      )}
    </>
  )
}

/**
 * FractalBackground — orchestrates two FractalCanvas instances with
 * opacity cross-fade transitions between fractal types.
 */
export function FractalBackground({ type = 'mandelbrot', mousePos = null, progress = 0, reducedMotion = false }) {
  const [slotA, setSlotA] = useState({ type, opacity: 1 })
  const [slotB, setSlotB] = useState({ type: null, opacity: 0 })
  const [activeSlot, setActiveSlot] = useState('a') // which slot is currently showing
  const fadeRef = useRef(null)
  const prevTypeRef = useRef(type)

  const cancelFade = useCallback(() => {
    if (fadeRef.current) {
      cancelAnimationFrame(fadeRef.current)
      fadeRef.current = null
    }
  }, [])

  useEffect(() => {
    if (type === prevTypeRef.current) return
    prevTypeRef.current = type

    cancelFade()

    if (reducedMotion) {
      // Instant swap
      if (activeSlot === 'a') {
        setSlotB({ type, opacity: 1 })
        setSlotA({ type: null, opacity: 0 })
        setActiveSlot('b')
      } else {
        setSlotA({ type, opacity: 1 })
        setSlotB({ type: null, opacity: 0 })
        setActiveSlot('a')
      }
      return
    }

    // Start cross-fade: bring new type into inactive slot
    if (activeSlot === 'a') {
      setSlotB({ type, opacity: 0 })
    } else {
      setSlotA({ type, opacity: 0 })
    }

    const startTime = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / FADE_DURATION, 1)
      const eased = easeInOut(t)

      if (activeSlot === 'a') {
        setSlotA((prev) => ({ ...prev, opacity: 1 - eased }))
        setSlotB((prev) => ({ ...prev, opacity: eased }))
      } else {
        setSlotB((prev) => ({ ...prev, opacity: 1 - eased }))
        setSlotA((prev) => ({ ...prev, opacity: eased }))
      }

      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick)
      } else {
        // Fade complete — deactivate old slot
        fadeRef.current = null
        if (activeSlot === 'a') {
          setSlotA({ type: null, opacity: 0 })
          setActiveSlot('b')
        } else {
          setSlotB({ type: null, opacity: 0 })
          setActiveSlot('a')
        }
      }
    }

    fadeRef.current = requestAnimationFrame(tick)

    return cancelFade
  }, [type, reducedMotion, activeSlot, cancelFade])

  // Cleanup on unmount
  useEffect(() => cancelFade, [cancelFade])

  return (
    <>
      <FractalCanvas
        key={slotA.type ?? 'idle-a'}
        type={slotA.type}
        mousePos={mousePos}
        progress={progress}
        style={{ opacity: slotA.opacity }}
      />
      <FractalCanvas
        key={slotB.type ?? 'idle-b'}
        type={slotB.type}
        mousePos={mousePos}
        progress={progress}
        style={{ opacity: slotB.opacity }}
      />
    </>
  )
}

export default FractalBackground
