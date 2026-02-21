import { BackButton } from '@/components/BackButton'
import './About.css'

const experience = [
  {
    company: 'Overe',
    role: 'Senior Software Engineer',
    period: 'May 2024 – Present',
    points: [
      'Designed scalable microservices for security posture assessment, policy enforcement, and tenant configuration management',
      'Built Microsoft 365 integrations — Graph API, Exchange Online, SharePoint — handling auth, permissions, and throttling',
      'Deployed containerised services to AWS ECS/Fargate with SQS queue-depth autoscaling',
      'Maintained CI/CD pipelines with GitHub Actions; logging, monitoring, and alerting across distributed services',
      'Code reviews, backend architecture and engineering standards',
    ],
  },
  {
    company: 'GrowthFoundry',
    role: 'Software Engineer',
    period: 'Oct 2021 – May 2024',
    points: [
      'Built an on-page SEO tool that compares pages against SERP rankings using data-driven analysis',
      'Developed page scraping microservice and analytics dashboard',
      'Designed infrastructure with Terraform; deployed to Fargate with SQS-based autoscaling',
      'CI/CD with GitHub Actions and AWS Elastic Container Service',
    ],
  },
  {
    company: 'VXSoft',
    role: 'Software Engineer',
    period: 'Mar 2019 – Aug 2021',
    points: [
      'Developed Mulberry 2.0 — workflow automation platform reducing processing time 1.5–3×',
      'Built Community Revenue Management System and Meeting Management Plugin',
      'Designed REST API and JSONRPC services with documentation',
    ],
  },
  {
    company: 'CyberVision',
    role: 'Software Engineer',
    period: 'Nov 2018 – Mar 2019',
    points: [
      'Developed backend applications with Python, Django and PostgreSQL',
    ],
  },
]

const skills = [
  { label: 'Backend',  items: ['Python', 'Django', 'FastAPI', 'Flask', 'Redis'] },
  { label: 'Cloud',    items: ['AWS', 'ECS', 'Fargate', 'SQS', 'EC2', 'Terraform', 'Docker'] },
  { label: 'Database', items: ['PostgreSQL', 'MongoDB', 'DynamoDB'] },
  { label: 'Frontend', items: ['JavaScript', 'ReactJS', 'VueJS'] },
  { label: 'Systems',  items: ['Linux', 'C'] },
]

const education = [
  {
    degree: 'BSc Computer Science',
    institution: 'University of London',
    period: '2023 – 2026',
  },
  {
    degree: 'Actuarial & Financial Mathematics',
    institution: 'Yerevan State University',
    period: '2016 – 2017',
  },
]

const languages = ['Armenian', 'English', 'Russian', 'German']

export default function About() {
  return (
    <div className="about-wrap">
      <BackButton />

      <div className="about-container">

        <header className="about-header">
          <h1 className="about-name">Gor</h1>
          <p className="about-role">Senior Software Engineer</p>
          <p className="about-bio">
            7 years building scalable backend systems, cloud infrastructure, and creative web experiences.
            Solid foundation in mathematics with a proven track record across security, SaaS, and enterprise platforms.
          </p>
        </header>

        <section className="about-section" style={{ animationDelay: '0.2s' }}>
          <h2 className="about-section-title">Experience</h2>
          <div className="about-timeline">
            {experience.map((job, i) => (
              <div key={i} className="about-tl-item">
                <div className="about-tl-dot" />
                <div className="about-tl-content">
                  <div className="about-tl-meta">
                    <span className="about-tl-company">{job.company}</span>
                    <span className="about-tl-period">{job.period}</span>
                  </div>
                  <div className="about-tl-role">{job.role}</div>
                  <ul className="about-tl-points">
                    {job.points.map((p, j) => <li key={j}>{p}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section" style={{ animationDelay: '0.35s' }}>
          <h2 className="about-section-title">Skills</h2>
          <div className="about-skills">
            {skills.map((group, i) => (
              <div key={i} className="about-skill-row">
                <span className="about-skill-label">{group.label}</span>
                <div className="about-chips">
                  {group.items.map((s, j) => (
                    <span key={j} className="about-chip">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section" style={{ animationDelay: '0.5s' }}>
          <h2 className="about-section-title">Education</h2>
          <div className="about-education">
            {education.map((e, i) => (
              <div key={i} className="about-edu-item">
                <span className="about-edu-degree">{e.degree}</span>
                <span className="about-edu-inst">{e.institution}</span>
                <span className="about-edu-period">{e.period}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section" style={{ animationDelay: '0.6s' }}>
          <h2 className="about-section-title">Languages</h2>
          <div className="about-chips">
            {languages.map((l, i) => (
              <span key={i} className="about-chip">{l}</span>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
