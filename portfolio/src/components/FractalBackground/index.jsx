import { useRef } from 'react'
import { useFractalEngine } from './useFractalEngine'
import './style.css'

/**
 * FractalBackground component - renders a full-screen fractal background
 * Sits at z-index -1 behind all other content
 *
 * @param {Object} props
 * @param {string} props.type - Fractal type ('mandelbrot' or 'julia')
 * @param {Object} props.mousePos - Mouse position for Julia set interactive control
 */
export function FractalBackground({ type = 'mandelbrot', mousePos = null }) {
  const canvasRef = useRef(null)
  const { fps, isReady, error } = useFractalEngine(canvasRef, type, { mousePos })

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fractal-background-canvas"
        aria-label="Fractal background"
      />
      {error && (
        <div className="fractal-error-fallback">
          {error}
        </div>
      )}
      {process.env.NODE_ENV === 'development' && isReady && (
        <div className="fractal-fps-counter" style={{ pointerEvents: 'none' }}>
          {fps} FPS
        </div>
      )}
    </>
  )
}

export default FractalBackground
