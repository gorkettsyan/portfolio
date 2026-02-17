import '@/styles/tokens.css'
import '@/styles/global.css'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { FractalBackground } from '@/components/FractalBackground'
import { useMousePosition } from '@/hooks/useMousePosition'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import Hero from '@/pages/Hero'
import About from '@/pages/About'
import Projects from '@/pages/Projects'
import Contact from '@/pages/Contact'

const ROUTE_FRACTAL = {
  '/': 'mandelbrot',
  '/about': 'julia',
  '/projects': null,
  '/contact': 'network',
}

function useTimeProgress(type) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    const isCanvas2D = type === 'sierpinski' || type === 'lsystem' || type === 'network'
    if (!isCanvas2D) {
      setProgress(0)
      return
    }

    startRef.current = performance.now()
    const duration = 4000

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      const t = Math.min(elapsed / duration, 1)
      setProgress(t)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [type])

  return progress
}

function AppShell() {
  const location = useLocation()
  const mousePos = useMousePosition()
  const reducedMotion = useReducedMotion()
  const fractalType = location.pathname in ROUTE_FRACTAL
    ? ROUTE_FRACTAL[location.pathname]
    : 'mandelbrot'
  const progress = useTimeProgress(fractalType)

  return (
    <>
      <FractalBackground
        type={fractalType}
        mousePos={mousePos}
        progress={progress}
        reducedMotion={reducedMotion}
      />
      <main>
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/about" element={<About />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
