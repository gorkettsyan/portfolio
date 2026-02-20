import { Link } from 'react-router-dom'
import './EdgeNav.css'

export function EdgeNav({ mousePos }) {
  const leftProximity   = Math.max(0, 1 - (mousePos.x + 1) / 0.6)
  const rightProximity  = Math.max(0, 1 - (1 - mousePos.x) / 0.6)
  // mousePos.y: +1 = top, -1 = bottom (WebGL convention)
  const bottomProximity = Math.max(0, 1 - (mousePos.y + 1) / 0.5)

  const leftOpacity   = 0.15 + 0.85 * leftProximity
  const rightOpacity  = 0.15 + 0.85 * rightProximity
  const bottomOpacity = 0.15 + 0.85 * bottomProximity

  const glow = (proximity) => {
    const blur   = 4 + proximity * 12
    const spread = proximity * 8
    return `0 0 ${blur}px ${spread}px rgba(0, 245, 212, ${proximity * 0.6})`
  }

  return (
    <div className="edge-nav">
      <Link
        to="/projects"
        className="edge-nav__label edge-nav__label--left"
        style={{ opacity: leftOpacity, textShadow: glow(leftProximity) }}
      >
        Projects
      </Link>
      <Link
        to="/contact"
        className="edge-nav__label edge-nav__label--right"
        style={{ opacity: rightOpacity, textShadow: glow(rightProximity) }}
      >
        Contact
      </Link>
      <Link
        to="/about"
        className="edge-nav__label edge-nav__label--bottom"
        style={{ opacity: bottomOpacity, textShadow: glow(bottomProximity) }}
      >
        About
      </Link>
    </div>
  )
}
