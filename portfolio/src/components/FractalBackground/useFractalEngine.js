import { useEffect, useRef, useState } from 'react'
import { compileShader as compileShaderMandelbrot, createProgram, createQuadVAO, VERTEX_SHADER as VERTEX_SHADER_MANDELBROT, FRAGMENT_SHADER as FRAGMENT_SHADER_MANDELBROT } from '@/fractals/mandelbrot'
import { compileShader as compileShaderJulia, VERTEX_SHADER as VERTEX_SHADER_JULIA, FRAGMENT_SHADER as FRAGMENT_SHADER_JULIA } from '@/fractals/julia'
import { renderSierpinski } from '@/fractals/sierpinski'
import { renderLSystem } from '@/fractals/lsystem'

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
  const contextTypeRef = useRef(null) // Track whether we're using 'webgl' or 'canvas2d'

  // Animation state
  const animationStateRef = useRef({
    zoom: 1.0,
    centerX: -0.5,
    centerY: 0.0,
    targetZoom: 100000,
    zoomSpeed: 1.005, // ~0.5% per frame at 60fps
    progress: 0, // For Canvas 2D fractals (0-1)
  })

  const uniformsRef = useRef({
    resolution: [0, 0],
    center: [-0.5, 0.0],
    zoom: 1.0,
    maxIter: 256,
    c: [-0.7, 0.27], // Julia set default c value
  })

  // For smooth morphing of Julia's c parameter via easing
  const currentCRef = useRef([-0.7, 0.27])
  const targetCRef = useRef([-0.7, 0.27])

  // Keep mousePos in a ref so the animation loop always reads the latest value
  const mousePosRef = useRef(options.mousePos)
  mousePosRef.current = options.mousePos

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      setError('Canvas ref not provided')
      return
    }

    // Initialize canvas size with devicePixelRatio
    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2) // Cap at 2x
      const width = window.innerWidth
      const height = window.innerHeight

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      uniformsRef.current.resolution = [canvas.width, canvas.height]

      // Update WebGL viewport if context exists
      if (glRef.current) {
        glRef.current.viewport(0, 0, canvas.width, canvas.height)
      }
    }

    updateCanvasSize()

    // Initialize WebGL context
    let gl = glRef.current
    if (!gl) {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

      if (!gl) {
        setError('WebGL not supported - rendering static gradient fallback')
        console.warn('WebGL unavailable, falling back to gradient')
        // Render gradient fallback
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
    } else if (type === 'julia') {
      compileFn = compileShaderJulia
      vertexShader = compileFn(gl, VERTEX_SHADER_JULIA, gl.VERTEX_SHADER)
      fragmentShader = compileFn(gl, FRAGMENT_SHADER_JULIA, gl.FRAGMENT_SHADER)
    } else {
      setError(`Unknown fractal type: ${type}`)
      return
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

    // Create VAO
    const vao = createQuadVAO(gl)
    vaoRef.current = vao

    setIsReady(true)

    // Animation loop
    let lastFrameTime = performance.now()
    const animate = () => {
      const now = performance.now()
      const deltaTime = (now - lastFrameTime) / 1000 // seconds
      lastFrameTime = now

      // Update animation state
      const state = animationStateRef.current

      if (type === 'julia') {
        // Julia: fixed zoom showing full set, centered at origin
        const shortSide = Math.min(uniformsRef.current.resolution[0], uniformsRef.current.resolution[1])
        uniformsRef.current.zoom = shortSide / 4
        uniformsRef.current.center = [0, 0]
        uniformsRef.current.maxIter = 256
      } else {
        // Mandelbrot: auto-pan zoom animation
        state.zoom *= Math.pow(state.zoomSpeed, deltaTime * 60) // Frame-rate independent

        const targetCenterX = -0.7269
        const targetCenterY = 0.1889
        state.centerX += (targetCenterX - state.centerX) * 0.02
        state.centerY += (targetCenterY - state.centerY) * 0.02

        uniformsRef.current.zoom = state.zoom
        uniformsRef.current.center = [state.centerX, state.centerY]
        uniformsRef.current.maxIter = Math.min(256, Math.floor(100 + state.zoom / 100))
      }

      // For Julia: update c from mouse position with easing
      const mousePos = mousePosRef.current
      if (type === 'julia' && mousePos) {
        // Scale mouse coordinates by 0.5 to keep Julia sets beautiful
        targetCRef.current = [mousePos.x * 0.5, mousePos.y * 0.5]
      }

      // Smooth easing of c value (lerp)
      const easeFactor = 0.1
      currentCRef.current[0] += (targetCRef.current[0] - currentCRef.current[0]) * easeFactor
      currentCRef.current[1] += (targetCRef.current[1] - currentCRef.current[1]) * easeFactor
      uniformsRef.current.c = [...currentCRef.current]

      // Render
      renderFrame(gl, programRef.current, vaoRef.current, uniformsRef.current, type)

      // Update FPS counter
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

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize()
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      // Clean up GL resources
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
 * Render a single frame
 */
function renderFrame(gl, program, vao, uniforms, type = 'mandelbrot') {
  gl.useProgram(program)
  gl.bindVertexArray(vao)

  // Set uniforms common to all fractals
  const resLoc = gl.getUniformLocation(program, 'u_resolution')
  const centerLoc = gl.getUniformLocation(program, 'u_center')
  const zoomLoc = gl.getUniformLocation(program, 'u_zoom')
  const maxIterLoc = gl.getUniformLocation(program, 'u_maxIter')

  gl.uniform2f(resLoc, uniforms.resolution[0], uniforms.resolution[1])
  gl.uniform2f(centerLoc, uniforms.center[0], uniforms.center[1])
  gl.uniform1f(zoomLoc, uniforms.zoom)
  gl.uniform1i(maxIterLoc, uniforms.maxIter)

  // Julia-specific uniform
  if (type === 'julia') {
    const cLoc = gl.getUniformLocation(program, 'u_c')
    gl.uniform2f(cLoc, uniforms.c[0], uniforms.c[1])
  }

  // Draw full-screen quad (2 triangles = 6 vertices)
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
