import '@/styles/tokens.css'
import '@/styles/global.css'
import { FractalBackground } from '@/components/FractalBackground'
import { useMousePosition } from '@/hooks/useMousePosition'

function App() {
  const mousePos = useMousePosition()

  return (
    <>
      <FractalBackground type="julia" mousePos={mousePos} />
      <main>
        <p>Portfolio — ready</p>
      </main>
    </>
  )
}

export default App
