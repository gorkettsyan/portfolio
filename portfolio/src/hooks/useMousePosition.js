import { useState, useEffect } from 'react'

/**
 * Returns normalized pointer position in [-1, 1] range.
 * Desktop: tracks mouse (x: left→right, y: bottom→top WebGL convention).
 * Mobile:  tracks device tilt via DeviceOrientationEvent (gamma/beta).
 *          On iOS 13+, permission is requested on first touch.
 */
export function useMousePosition() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const isTouchDevice =
      window.matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 0

    let rafId = null
    const cleanups = []

    if (!isTouchDevice) {
      // ── Desktop: mouse tracking ──
      let lastX = 0, lastY = 0

      const handleMouseMove = (e) => {
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

      window.addEventListener('mousemove', handleMouseMove)
      cleanups.push(() => window.removeEventListener('mousemove', handleMouseMove))

    } else {
      // ── Mobile: device orientation (tilt to control) ──
      const handleOrientation = (e) => {
        if (e.gamma === null || rafId !== null) return
        const gamma = e.gamma  // left-right tilt: -90..90°
        const beta  = e.beta   // forward-back tilt: -180..180°
        rafId = requestAnimationFrame(() => {
          setMousePos({
            x: Math.max(-1, Math.min(1,  gamma / 30)),
            y: Math.max(-1, Math.min(1, -beta  / 30)),
          })
          rafId = null
        })
      }

      const startListening = () =>
        window.addEventListener('deviceorientation', handleOrientation)

      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        // iOS 13+: needs a user gesture before requestPermission can be called
        const onFirstTouch = () => {
          DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') startListening() })
            .catch(() => {})
        }
        window.addEventListener('touchstart', onFirstTouch, { once: true })
        cleanups.push(() => window.removeEventListener('touchstart', onFirstTouch))
      } else {
        startListening()
      }

      cleanups.push(() => window.removeEventListener('deviceorientation', handleOrientation))
    }

    return () => {
      cleanups.forEach(fn => fn())
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return mousePos
}
