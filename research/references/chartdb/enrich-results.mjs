import { readFile, writeFile } from 'node:fs/promises'

// Endpoint direction comes from the recorded SVG's outward terminal segments, not application state.
const direction = (from, to) =>
  Math.abs(to.x - from.x) > Math.abs(to.y - from.y)
    ? to.x > from.x
      ? 'right'
      : 'left'
    : to.y > from.y
      ? 'bottom'
      : 'top'
for (const name of [
  'import',
  'fixture',
  ...Array.from({ length: 16 }, (_, i) => `S${i + 1}`),
]) {
  const url = new URL(`results/${name}.json`, import.meta.url)
  const record = JSON.parse(await readFile(url, 'utf8'))
  const definitions =
    record.markers ?? record.after?.markers ?? record.before?.markers ?? []
  const markerType = (value) => {
    if (!value) return { kind: 'none' }
    const id = value.match(/^url\(#(.+)\)$/)?.[1]
    const definition = definitions.find((m) => m.id === id)
    return definition
      ? {
          kind: 'circle-text',
          text: definition.text,
          circleRadius: Number(definition.circleRadius),
          id,
        }
      : { kind: 'unverified', id }
  }
  const walk = (value) => {
    if (!value || typeof value !== 'object') return
    if (typeof value.path === 'string' && 'markerStart' in value) {
      const points = [
        ...value.path.matchAll(/[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/g),
      ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }))
      if (points.length < 4)
        throw new Error(
          `Missing terminal line segments in ${name}: ${value.id}`
        )
      value.sourceSide ??= direction(points[0], points[1])
      value.targetSide ??= direction(points.at(-1), points.at(-2))
      value.sideEvidence = value.markerStart
        ? 'SVG marker variant'
        : 'outward tangent of recorded SVG terminal segments'
      value.markerStartType = markerType(value.markerStart)
      value.markerEndType = markerType(value.markerEnd)
    }
    for (const child of Object.values(value)) walk(child)
  }
  walk(record)
  await writeFile(url, `${JSON.stringify(record, null, 2)}\n`)
}
