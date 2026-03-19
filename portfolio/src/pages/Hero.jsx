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
  const ruleDelay  = 0.6
  const titleDelay = ruleDelay + 0.4
  const scrollDelay = titleDelay + 0.8

  return (
    <section className="page hero-page">
      <div className="hero-identity">
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
