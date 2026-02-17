import { getProjectAtAddress } from '@/data/projects'

const SUB_NAMES = ['Top', 'Left', 'Right']

/**
 * Breadcrumb navigation for Sierpinski zoom levels.
 * Shows path like: All Projects / Web Apps / Portfolio
 * Includes a zoom-out button.
 */
export function SierpinskiBreadcrumb({ currentAddress, onZoomToAddress, onZoomOut }) {
  const segments = [{ label: 'All Projects', address: [] }]

  for (let i = 0; i < currentAddress.length; i++) {
    const addr = currentAddress.slice(0, i + 1)
    const project = getProjectAtAddress(addr)
    const label = project?.title ?? SUB_NAMES[currentAddress[i]]
    segments.push({ label, address: addr })
  }

  return (
    <nav className="sierpinski-breadcrumb glass" aria-label="Project navigation">
      {currentAddress.length > 0 && (
        <button
          className="sierpinski-breadcrumb__back"
          onClick={onZoomOut}
          aria-label="Zoom out"
        >
          &larr;
        </button>
      )}
      <ol className="sierpinski-breadcrumb__list">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          return (
            <li key={i} className="sierpinski-breadcrumb__item">
              {isLast ? (
                <span className="sierpinski-breadcrumb__current" aria-current="location">
                  {seg.label}
                </span>
              ) : (
                <>
                  <button
                    className="sierpinski-breadcrumb__link"
                    onClick={() => onZoomToAddress(seg.address)}
                  >
                    {seg.label}
                  </button>
                  <span className="sierpinski-breadcrumb__sep" aria-hidden="true">
                    /
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
