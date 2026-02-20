import { useEffect, useRef, useState } from 'react'
import { compileShader, createProgram, createQuadVAO, VERTEX_SHADER, FRAGMENT_SHADER } from '@/fractals/julia'
import { renderNetworkGraph } from '@/fractals/networkGraph'

/**
 * Custom hook for managing fractal renderer lifecycle (WebGL or Canvas 2D)
 * @param {React.RefObject} canvasRef
 * @param {string} type - 'julia' | 'network'
 * @param {Object} options
 * @returns {{ isReady: boolean, error: string | null }}
 */
export function useFractalEngine(canvasRef, type = 'julia', options = {}) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError]     = useState(null)

  const glRef          = useRef(null)
  const programRef     = useRef(null)
  const vaoRef         = useRef(null)
  const animationIdRef = useRef(null)

  const currentCRef = useRef([-0.7, 0.27])
  const targetCRef  = useRef([-0.7, 0.27])

  const userInteractedRef = useRef(false)
  const mouseBlendRef     = useRef(0)

  const mousePosRef = useRef(options.mousePos)
  mousePosRef.current = options.mousePos

  const progressRef = useRef(options.progress ?? 0)
  progressRef.current = options.progress ?? 0

  useEffect(() => {
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
      const dpr    = Math.min(window.devicePixelRatio, 2)
      const width  = window.innerWidth
      const height = window.innerHeight

      canvas.width  = width  * dpr
      canvas.height = height * dpr
      canvas.style.width  = `${width}px`
      canvas.style.height = `${height}px`

      if (glRef.current) {
        glRef.current.viewport(0, 0, canvas.width, canvas.height)
      }
    }

    updateCanvasSize()

    // ── Canvas 2D: network ──
    if (type === 'network') {
      setIsReady(true)

      const animate = () => {
        renderNetworkGraph(canvas, {
          progress: progressRef.current,
          mousePos: mousePosRef.current,
        })
        animationIdRef.current = requestAnimationFrame(animate)
      }

      animationIdRef.current = requestAnimationFrame(animate)
      window.addEventListener('resize', updateCanvasSize)

      return () => {
        window.removeEventListener('resize', updateCanvasSize)
        if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      }
    }

    // ── WebGL: julia ──
    if (type !== 'julia') {
      setError(`Unknown fractal type: ${type}`)
      return
    }

    let gl = glRef.current
    if (!gl) {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) {
        setError('WebGL not supported')
        return
      }
      glRef.current = gl
    }

    const vertexShader   = compileShader(gl, VERTEX_SHADER,   gl.VERTEX_SHADER)
    const fragmentShader = compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER)
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

    vaoRef.current = createQuadVAO(gl)
    setIsReady(true)

    let lastFrameTime = performance.now()
    const animate = () => {
      const now       = performance.now()
      const deltaTime = (now - lastFrameTime) / 1000
      lastFrameTime   = now

      // Zoom/center fixed for Julia
      const shortSide = Math.min(canvas.width, canvas.height)
      const uniforms  = {
        resolution: [canvas.width, canvas.height],
        center:     [0, 0],
        zoom:       shortSide / 4,
        maxIter:    256,
        c:          [...currentCRef.current],
      }

      const mousePos = mousePosRef.current
      const t        = now / 1000

      // Slow Lissajous auto-orbit through visually rich Julia parameter space
      const autoC = [
        -0.5 + Math.cos(t * 0.15) * 0.22,
        0.1  + Math.sin(t * 0.15 * 1.618) * 0.13,
      ]

      if (mousePos && (Math.abs(mousePos.x) > 0.015 || Math.abs(mousePos.y) > 0.015)) {
        userInteractedRef.current = true
      }
      if (userInteractedRef.current) {
        mouseBlendRef.current = Math.min(1, mouseBlendRef.current + 0.006)
      }

      const mouseC = mousePos
        ? [mousePos.x * 0.7 - 0.3, mousePos.y * 0.45]
        : autoC

      const blend = mouseBlendRef.current
      targetCRef.current = [
        autoC[0] * (1 - blend) + mouseC[0] * blend,
        autoC[1] * (1 - blend) + mouseC[1] * blend,
      ]

      const ease = 0.1
      currentCRef.current[0] += (targetCRef.current[0] - currentCRef.current[0]) * ease
      currentCRef.current[1] += (targetCRef.current[1] - currentCRef.current[1]) * ease
      uniforms.c = [...currentCRef.current]

      renderFrame(gl, programRef.current, vaoRef.current, uniforms)

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)
    window.addEventListener('resize', updateCanvasSize)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current)
      if (glRef.current && programRef.current) glRef.current.deleteProgram(programRef.current)
      if (glRef.current && vaoRef.current)    glRef.current.deleteVertexArray(vaoRef.current)
    }
  }, [canvasRef, type])

  return { isReady, error }
}

function renderFrame(gl, program, vao, uniforms) {
  gl.useProgram(program)
  gl.bindVertexArray(vao)

  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), uniforms.resolution[0], uniforms.resolution[1])
  gl.uniform2f(gl.getUniformLocation(program, 'u_center'),     uniforms.center[0],     uniforms.center[1])
  gl.uniform1f(gl.getUniformLocation(program, 'u_zoom'),       uniforms.zoom)
  gl.uniform1i(gl.getUniformLocation(program, 'u_maxIter'),    uniforms.maxIter)
  gl.uniform2f(gl.getUniformLocation(program, 'u_c'),          uniforms.c[0],          uniforms.c[1])

  gl.drawArrays(gl.TRIANGLES, 0, 6)
}
