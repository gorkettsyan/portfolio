import { useEffect, useRef, useState } from 'react'
import { compileShader as compileShaderMandelbrot, createProgram, createQuadVAO, VERTEX_SHADER as VERTEX_SHADER_MANDELBROT, FRAGMENT_SHADER as FRAGMENT_SHADER_MANDELBROT } from '@/fractals/mandelbrot'
import { compileShader as compileShaderJulia, VERTEX_SHADER as VERTEX_SHADER_JULIA, FRAGMENT_SHADER as FRAGMENT_SHADER_JULIA } from '@/fractals/julia'
import { renderSierpinski } from '@/fractals/sierpinski'
import { renderLSystem } from '@/fractals/lsystem'
import { renderNetworkGraph } from '@/fractals/networkGraph'

const WEBGL_TYPES = new Set(['mandelbrot', 'julia'])
const CANVAS2D_TYPES = new Set(['sierpinski', 'lsystem', 'network'])

/**
 * Custom hook for managing fractal renderer lifecycle (WebGL or Canvas 2D)
 * @param {React.RefObject} canvasRef - Reference to canvas element
 * @param {string} type - Fractal type ('mandelbrot', 'julia', 'sierpinski', 'lsystem')
 * @param {Object} options - Configuration options
 * @returns {{ fps: number, isReady: boolean, error: string | null }}
 */
export function useFractalEngine(canvasRef, type = 'mandelbrot', options = {}) {
  const [fps, setFps] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  const glRef = useRef(null)
  const programRef = useRef(null)
  const vaoRef = useRef(null)
  const animationIdRef = useRef(null)
  const fpsCounterRef = useRef({ frameCount: 0, lastTime: performance.now(), fps: 0 })

  // Animation state (WebGL fractals)
  const animationStateRef = useRef({
    zoom: 1.0,
    centerX: -0.5,
    centerY: 0.0,
    zoomSpeed: 1.02,
    maxZoom: 40000, // float32 precision limit
  })

  const uniformsRef = useRef({
    resolution: [0, 0],
    center: [-0.5, 0.0],
    zoom: 1.0,
    maxIter: 256,
    c: [-0.7, 0.27],
  })

  // For smooth morphing of Julia's c parameter via easing
  const currentCRef = useRef([-0.7, 0.27])
  const targetCRef = useRef([-0.7, 0.27])

  // Keep mousePos and progress in refs so the animation loop reads latest values
  const mousePosRef = useRef(options.mousePos)
  mousePosRef.current = options.mousePos

  const progressRef = useRef(options.progress ?? 0)
  progressRef.current = options.progress ?? 0

  useEffect(() => {
    // Idle when type is null (inactive cross-fade slot)
    if (!type) {
      setIsReady(false)
      setError(null)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      setError('Canvas ref not provided')
      return
    }

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const width = window.innerWidth
      const height = window.innerHeight

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      uniformsRef.current.resolution = [canvas.width, canvas.height]

      if (glRef.current) {
        glRef.current.viewport(0, 0, canvas.width, canvas.height)
      }
    }

    updateCanvasSize()

    // ── Canvas 2D path (sierpinski, lsystem) ──
    if (CANVAS2D_TYPES.has(type)) {
      setIsReady(true)

      const animate = () => {
        const now = performance.now()
        const progress = progressRef.current

        if (type === 'sierpinski') {
          renderSierpinski(canvas, { progress })
        } else if (type === 'lsystem') {
          renderLSystem(canvas, { progress })
        } else if (type === 'network') {
          renderNetworkGraph(canvas, { progress })
        }

        // FPS counter
        const counter = fpsCounterRef.current
        counter.frameCount++
        const elapsed = now - counter.lastTime
        if (elapsed >= 1000) {
          setFps(counter.frameCount)
          counter.frameCount = 0
          counter.lastTime = now
        }

        animationIdRef.current = requestAnimationFrame(animate)
      }

      animationIdRef.current = requestAnimationFrame(animate)

      window.addEventListener('resize', updateCanvasSize)

      return () => {
        window.removeEventListener('resize', updateCanvasSize)
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current)
        }
      }
    }

    // ── WebGL path (mandelbrot, julia) ──
    if (!WEBGL_TYPES.has(type)) {
      setError(`Unknown fractal type: ${type}`)
      return
    }

    let gl = glRef.current
    if (!gl) {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

      if (!gl) {
        setError('WebGL not supported - rendering static gradient fallback')
        console.warn('WebGL unavailable, falling back to gradient')
        renderGradientFallback(canvas)
        return
      }

      glRef.current = gl
    }

    // Compile shaders based on type
    let vertexShader, fragmentShader, compileFn
    if (type === 'mandelbrot') {
      compileFn = compileShaderMandelbrot
      vertexShader = compileFn(gl, VERTEX_SHADER_MANDELBROT, gl.VERTEX_SHADER)
      fragmentShader = compileFn(gl, FRAGMENT_SHADER_MANDELBROT, gl.FRAGMENT_SHADER)
    } else {
      compileFn = compileShaderJulia
      vertexShader = compileFn(gl, VERTEX_SHADER_JULIA, gl.VERTEX_SHADER)
      fragmentShader = compileFn(gl, FRAGMENT_SHADER_JULIA, gl.FRAGMENT_SHADER)
    }

    if (!vertexShader || !fragmentShader) {
      setError('Failed to compile shaders')
      return
    }

    const program = createProgram(gl, vertexShader, fragmentShader)
    if (!program) {
      setError('Failed to link WebGL program')
      return
    }

    programRef.current = program
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    const vao = createQuadVAO(gl)
    vaoRef.current = vao

    setIsReady(true)

    let lastFrameTime = performance.now()
    const animate = () => {
      const now = performance.now()
      const deltaTime = (now - lastFrameTime) / 1000
      lastFrameTime = now

      const state = animationStateRef.current

      if (type === 'julia') {
        const shortSide = Math.min(uniformsRef.current.resolution[0], uniformsRef.current.resolution[1])
        uniformsRef.current.zoom = shortSide / 4
        uniformsRef.current.center = [0, 0]
        uniformsRef.current.maxIter = 256
      } else {
        if (state.zoom < state.maxZoom) {
          state.zoom = Math.min(
            state.zoom * Math.pow(state.zoomSpeed, deltaTime * 60),
            state.maxZoom
          )
        }

        const targetCenterX = -0.7269
        const targetCenterY = 0.1889
        state.centerX += (targetCenterX - state.centerX) * 0.02
        state.centerY += (targetCenterY - state.centerY) * 0.02

        uniformsRef.current.zoom = state.zoom
        uniformsRef.current.center = [state.centerX, state.centerY]
        uniformsRef.current.maxIter = Math.min(256, Math.floor(100 + state.zoom / 100))
      }

      const mousePos = mousePosRef.current
      if (type === 'julia' && mousePos) {
        targetCRef.current = [mousePos.x * 0.5, mousePos.y * 0.5]
      }

      const easeFactor = 0.1
      currentCRef.current[0] += (targetCRef.current[0] - currentCRef.current[0]) * easeFactor
      currentCRef.current[1] += (targetCRef.current[1] - currentCRef.current[1]) * easeFactor
      uniformsRef.current.c = [...currentCRef.current]

      renderFrame(gl, programRef.current, vaoRef.current, uniformsRef.current, type)

      const counter = fpsCounterRef.current
      counter.frameCount++
      const elapsed = now - counter.lastTime
      if (elapsed >= 1000) {
        setFps(counter.frameCount)
        counter.frameCount = 0
        counter.lastTime = now
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    window.addEventListener('resize', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (glRef.current && programRef.current) {
        glRef.current.deleteProgram(programRef.current)
      }
      if (glRef.current && vaoRef.current) {
        glRef.current.deleteVertexArray(vaoRef.current)
      }
    }
  }, [canvasRef, type])

  return { fps, isReady, error }
}

/**
 * Render a single WebGL frame
 */
function renderFrame(gl, program, vao, uniforms, type = 'mandelbrot') {
  gl.useProgram(program)
  gl.bindVertexArray(vao)

  const resLoc = gl.getUniformLocation(program, 'u_resolution')
  const centerLoc = gl.getUniformLocation(program, 'u_center')
  const zoomLoc = gl.getUniformLocation(program, 'u_zoom')
  const maxIterLoc = gl.getUniformLocation(program, 'u_maxIter')

  gl.uniform2f(resLoc, uniforms.resolution[0], uniforms.resolution[1])
  gl.uniform2f(centerLoc, uniforms.center[0], uniforms.center[1])
  gl.uniform1f(zoomLoc, uniforms.zoom)
  gl.uniform1i(maxIterLoc, uniforms.maxIter)

  if (type === 'julia') {
    const cLoc = gl.getUniformLocation(program, 'u_c')
    gl.uniform2f(cLoc, uniforms.c[0], uniforms.c[1])
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

/**
 * Render a static gradient fallback when WebGL is unavailable
 */
function renderGradientFallback(canvas) {
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#050508')
  gradient.addColorStop(0.5, '#00a896')
  gradient.addColorStop(1, '#00f5d4')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
