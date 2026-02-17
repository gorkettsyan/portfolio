import { useRef, useState, useEffect, useCallback } from 'react'
import { useSierpinskiNav } from '@/hooks/useSierpinskiNav'
import { hasChildren, getProjectsAt, getProjectAtAddress } from '@/data/projects'
import { SierpinskiCanvas } from './SierpinskiCanvas'
import { ProjectOverlay } from './ProjectOverlay'
import { SierpinskiBreadcrumb } from './SierpinskiBreadcrumb'
import './SierpinskiNav.css'

const PADDING_RATIO = 0.08

/**
 * Compute an equilateral-ish triangle that fits the container.
 */
function computeRootVertices(width, height) {
  const padding = Math.min(width, height) * PADDING_RATIO
  const topMargin = padding + 60

  const availW = width - padding * 2
  const availH = height - topMargin - padding

  const sideByW = availW
  const sideByH = (availH * 2) / Math.sqrt(3)
  const side = Math.min(sideByW, sideByH)
  const triH = (side * Math.sqrt(3)) / 2

  const cx = width / 2
  const topY = topMargin + (availH - triH) / 2

  return [
    [cx, topY],
    [cx - side / 2, topY + triH],
    [cx + side / 2, topY + triH],
  ]
}

/**
 * SierpinskiNav — Orchestrator component.
 * The fractal always looks the same (self-similar). Only labels change per level.
 */
export function SierpinskiNav() {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rootVertices = size.width > 0
    ? computeRootVertices(size.width, size.height)
    : null

  const nav = useSierpinskiNav(rootVertices)

  const handleClick = useCallback(
    (subIndex) => {
      const childAddress = [...nav.currentAddress, subIndex]
      const project = getProjectAtAddress(childAddress)

      // Leaf project with URL and no children → open it
      if (project?.url && !hasChildren(childAddress)) {
        window.open(project.url, '_blank', 'noopener,noreferrer')
        return
      }

      // Otherwise zoom deeper
      nav.zoomIn(subIndex)
    },
    [nav]
  )

  if (!rootVertices) {
    return <div ref={containerRef} className="sierpinski-nav" />
  }

  return (
    <div ref={containerRef} className="sierpinski-nav">
      <SierpinskiCanvas
        renderVertices={nav.renderVertices}
        hoveredIndex={nav.hoveredIndex}
        isAnimating={nav.isAnimating}
        onHover={nav.setHoveredIndex}
        onClick={handleClick}
        width={size.width}
        height={size.height}
      />
      <ProjectOverlay
        rootVertices={rootVertices}
        currentAddress={nav.currentAddress}
        hoveredIndex={nav.hoveredIndex}
        isAnimating={nav.isAnimating}
        onProjectClick={handleClick}
      />
      {nav.currentAddress.length > 0 ? (
        <SierpinskiBreadcrumb
          currentAddress={nav.currentAddress}
          onZoomToAddress={nav.zoomToAddress}
          onZoomOut={nav.zoomOut}
        />
      ) : (
        <h2 className="sierpinski-nav__title">Projects</h2>
      )}
    </div>
  )
}
