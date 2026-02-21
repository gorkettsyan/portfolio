import { useEffect } from 'react'
import { Mail, Github, Linkedin } from 'lucide-react'
import { BackButton } from '@/components/BackButton'
import { portfolio } from '@/data/portfolio'
import './Contact.css'

export default function Contact() {
  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])

  return (
    <section className="page contact-page">
      <BackButton />

      <div className="contact-card">
        <div className="contact-header">
          <h1 className="contact-name">{portfolio.name}</h1>
          <p className="contact-role">{portfolio.title}</p>
        </div>

        <div className="contact-rule" />

        <p className="contact-tagline">
          Open to interesting opportunities and collaborations.
        </p>

        <ul className="contact-links">
          <li>
            <a
              href={`mailto:${portfolio.email}`}
              className="contact-link"
            >
              <Mail size={15} strokeWidth={1.5} />
              <span>{portfolio.email}</span>
            </a>
          </li>
          <li>
            <a
              href={portfolio.github}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <Github size={15} strokeWidth={1.5} />
              <span>{portfolio.github.replace('https://', '')}</span>
            </a>
          </li>
          <li>
            <a
              href={portfolio.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <Linkedin size={15} strokeWidth={1.5} />
              <span>{portfolio.linkedin.replace('https://', '')}</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
