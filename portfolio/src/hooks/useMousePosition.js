import { useState, useEffect } from 'react'

/**
 * Returns normalized pointer position in [-1, 1] range.
 *
 * Desktop: tracks mouse movement.
 * Mobile:  two inputs, last one wins:
 *   1. Touch drag   — drag finger right = same as mouse right (always works)
 *   2. Device tilt  — tilt phone right  = same as mouse right (needs gyro + permission)
 *
 * iOS 13+: orientation permission is requested immediately (succeeds if previously
 * granted) and again on first tap (for first-time visitors).
 */
export function useMousePosition() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const isTouchDevice =
      window.matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0

    let rafId = null
    let lastTouchMs = 0  // tracks when user last dragged a finger

    // ── Desktop ──────────────────────────────────────────────────────────────
    if (!isTouchDevice) {
      let lastX = 0, lastY = 0

      const onMove = (e) => {
        lastX = e.clientX
        lastY = e.clientY
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            setMousePos({
              x: (lastX / window.innerWidth)  * 2 - 1,
              y: 1 - (lastY / window.innerHeight) * 2,
            })
            rafId = null
          })
        }
      }

      window.addEventListener('mousemove', onMove)
      return () => {
        window.removeEventListener('mousemove', onMove)
        if (rafId !== null) cancelAnimationFrame(rafId)
      }
    }

    // ── Mobile: touch drag ───────────────────────────────────────────────────
    // Drag finger right/up = same as moving mouse right/up. Always works, no
    // permissions needed. Gives priority over orientation for 600 ms after drag.
    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (!t) return
      lastTouchMs = Date.now()
      setMousePos({
        x: (t.clientX / window.innerWidth)  * 2 - 1,
        y: 1 - (t.clientY / window.innerHeight) * 2,
      })
    }
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    // ── Mobile: device tilt (gyroscope) ─────────────────────────────────────
    // Tilt phone right (+gamma) = same as mouse right. Overridden by active drag.
    const onOrientation = (e) => {
      if (e.gamma === null) return
      if (Date.now() - lastTouchMs < 600) return  // yield to active drag
      setMousePos({
        x: Math.max(-1, Math.min(1,  e.gamma / 30)),
        y: Math.max(-1, Math.min(1, -e.beta  / 30)),
      })
    }

    const listenOrientation = () => {
      window.addEventListener('deviceorientation',         onOrientation)
      window.addEventListener('deviceorientationabsolute', onOrientation)  // Chrome Android
    }

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      // iOS 13+: try immediately (works if permission was granted before)
      DeviceOrientationEvent.requestPermission()
        .then(s => { if (s === 'granted') listenOrientation() })
        .catch(() => {
          // Not yet granted — show dialog on first tap anywhere
          window.addEventListener('touchstart', () => {
            DeviceOrientationEvent.requestPermission()
              .then(s => { if (s === 'granted') listenOrientation() })
              .catch(() => {})
          }, { once: true })
        })
    } else {
      // Android + other browsers: no permission needed
      listenOrientation()
    }

    return () => {
      window.removeEventListener('touchmove',               onTouchMove)
      window.removeEventListener('deviceorientation',       onOrientation)
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return mousePos
}
