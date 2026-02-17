/**
 * Project data with Sierpinski triangle addresses.
 * Each address is an array of [0, 1, 2] mapping to sub-triangles:
 *   0 = top, 1 = bottom-left, 2 = bottom-right
 *
 * Depth-0: root (All Projects)
 * Depth-1: three main categories
 * Depth-2+: individual projects within categories
 */

export const projects = [
  // Top category — Web Applications
  {
    address: [0],
    title: 'Web Apps',
    description: 'Full-stack web applications',
  },
  {
    address: [0, 0],
    title: 'Portfolio',
    description: 'This fractal portfolio site',
    url: 'https://github.com',
  },
  {
    address: [0, 1],
    title: 'Task Tracker',
    description: 'Kanban-style project management',
    url: 'https://github.com',
  },
  {
    address: [0, 2],
    title: 'Chat App',
    description: 'Real-time messaging platform',
    url: 'https://github.com',
  },

  // Bottom-left category — Creative & Visuals
  {
    address: [1],
    title: 'Creative',
    description: 'Visual experiments & generative art',
  },
  {
    address: [1, 0],
    title: 'Fractal Gen',
    description: 'GPU-accelerated fractal generator',
    url: 'https://github.com',
  },
  {
    address: [1, 1],
    title: 'Shader Lab',
    description: 'Interactive GLSL playground',
    url: 'https://github.com',
  },
  {
    address: [1, 2],
    title: 'Particle Sim',
    description: 'Physics-based particle system',
    url: 'https://github.com',
  },

  // Bottom-right category — Tools & Libraries
  {
    address: [2],
    title: 'Tools',
    description: 'Developer tools & utilities',
  },
  {
    address: [2, 0],
    title: 'CLI Utils',
    description: 'Command-line productivity tools',
    url: 'https://github.com',
  },
  {
    address: [2, 1],
    title: 'Data Viz',
    description: 'Chart & graph library',
    url: 'https://github.com',
  },
  {
    address: [2, 2],
    title: 'API Kit',
    description: 'REST API scaffolding toolkit',
    url: 'https://github.com',
  },
]

/**
 * Get projects at a given address (direct children).
 * e.g. getProjectsAt([0]) returns projects whose address starts with [0]
 * and has exactly one more element.
 */
export function getProjectsAt(address) {
  const depth = address.length + 1
  return projects.filter(
    (p) =>
      p.address.length === depth &&
      address.every((v, i) => p.address[i] === v)
  )
}

/**
 * Get the project/category at an exact address.
 */
export function getProjectAtAddress(address) {
  return projects.find(
    (p) =>
      p.address.length === address.length &&
      address.every((v, i) => p.address[i] === v)
  )
}

/**
 * Check if an address has children (is a category, not a leaf).
 */
export function hasChildren(address) {
  return getProjectsAt(address).length > 0
}
