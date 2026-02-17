import {
  getSubTriangles,
  centroid,
  triangleArea,
} from '@/fractals/sierpinskiInteractive'
import { getProjectsAt } from '@/data/projects'

const MIN_AREA_FOR_LABEL = 4000

/**
 * HTML overlay that places project labels at sub-triangle centroids.
 * Uses rootVertices (stable, viewport-sized) for positioning —
 * the fractal always looks the same due to self-similarity.
 */
export function ProjectOverlay({
  rootVertices,
  currentAddress,
  hoveredIndex,
  isAnimating,
  onProjectClick,
}) {
  if (isAnimating || !rootVertices) return null

  const subs = getSubTriangles(rootVertices)
  const childProjects = getProjectsAt(currentAddress)

  return (
    <div className="sierpinski-overlay" aria-label="Project labels">
      {subs.map((subVerts, i) => {
        const area = triangleArea(subVerts)
        if (area < MIN_AREA_FOR_LABEL) return null

        const [cx, cy] = centroid(subVerts)
        const childAddress = [...currentAddress, i]
        const project = childProjects.find(
          (p) =>
            p.address.length === childAddress.length &&
            childAddress.every((v, j) => p.address[j] === v)
        )

        if (!project) return null

        const isHovered = hoveredIndex === i

        return (
          <button
            key={childAddress.join('-')}
            className={`sierpinski-label${isHovered ? ' sierpinski-label--active' : ''}`}
            style={{ left: cx, top: cy }}
            onClick={(e) => {
              e.stopPropagation()
              onProjectClick(i)
            }}
            aria-label={`${project.title}: ${project.description}`}
          >
            <span className="sierpinski-label__title">{project.title}</span>
            {isHovered && (
              <span className="sierpinski-label__desc">{project.description}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
