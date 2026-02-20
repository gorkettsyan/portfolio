import { Link } from 'react-router-dom'
import './EdgeNav.css'

export function EdgeNav({ mousePos }) {
  const leftProximity = Math.max(0, 1 - (mousePos.x + 1) / 0.6)
  const rightProximity = Math.max(0, 1 - (1 - mousePos.x) / 0.6)

  const leftOpacity = 0.15 + 0.85 * leftProximity
  const rightOpacity = 0.15 + 0.85 * rightProximity

  const glowIntensity = (proximity) => {
    const blur = 4 + proximity * 12
    const spread = proximity * 8
    return `0 0 ${blur}px ${spread}px rgba(0, 245, 212, ${proximity * 0.6})`
  }

  return (
    <div className="edge-nav">
      <Link
        to="/projects"
        className="edge-nav__label edge-nav__label--left"
        style={{
          opacity: leftOpacity,
          textShadow: glowIntensity(leftProximity),
        }}
      >
        Projects
      </Link>
      <Link
        to="/contact"
        className="edge-nav__label edge-nav__label--right"
        style={{
          opacity: rightOpacity,
          textShadow: glowIntensity(rightProximity),
        }}
      >
        Contact
      </Link>
    </div>
  )
}
