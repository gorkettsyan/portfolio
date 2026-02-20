import data from './projects.yaml'

export const projects = data

export function getProjectsAt(address) {
  const depth = address.length + 1
  return projects.filter(
    (p) =>
      p.address.length === depth &&
      address.every((v, i) => p.address[i] === v)
  )
}

export function getProjectAtAddress(address) {
  return projects.find(
    (p) =>
      p.address.length === address.length &&
      address.every((v, i) => p.address[i] === v)
  )
}

export function hasChildren(address) {
  return getProjectsAt(address).length > 0
}
