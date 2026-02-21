import { useEffect } from 'react'
import { portfolio } from '@/data/portfolio'
import './Hero.css'

export default function Hero() {
  // Prevent iOS Safari rubber-band scroll while on the hero page.
  // The touchmove listener in useMousePosition still fires — only the
  // browser's default scroll/bounce behaviour is suppressed.
  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])
  const nameDelay  = 0.6   // seconds before first character appears
  const ruleDelay  = nameDelay + portfolio.name.length * 0.08 + 0.2
  const titleDelay = ruleDelay + 0.4
  const scrollDelay = titleDelay + 0.8

  return (
    <section className="page hero-page">
      <div className="hero-identity">
        <h1 className="hero-name" aria-label={portfolio.name}>
          {portfolio.name.split('').map((ch, i) => (
            <span
              key={i}
              className="hero-char"
              style={{ animationDelay: `${nameDelay + i * 0.08}s` }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>

        <div
          className="hero-rule"
          style={{ animationDelay: `${ruleDelay}s` }}
        />

        <p
          className="hero-title"
          style={{ animationDelay: `${titleDelay}s` }}
        >
          {portfolio.title}
        </p>
      </div>

      <p
        className="hero-scroll"
        style={{ animationDelay: `${scrollDelay}s` }}
      >
        move mouse to explore
      </p>
    </section>
  )
}
