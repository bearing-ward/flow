import type {
  FlowEdge,
  FlowEdgeMarker,
  FlowEdgeMarkerConfiguration,
  FlowEdgeMarkerOption,
} from './flow.schema.ts'

/** A marker with React Flow `Marker` defaults applied, ready to render as SVG. */
export interface ResolvedFlowEdgeMarker {
  /** Stable, DOM-safe id within `scope`; equal configurations share an id. */
  readonly id: string
  readonly type: FlowEdgeMarker
  /** `undefined` means "use the edge stroke", as hosts draw literal markers. */
  readonly color: string | undefined
  readonly width: number
  readonly height: number
  readonly markerUnits: string
  readonly orient: string
  readonly strokeWidth: number
}

/** React Flow `Marker` defaults (`MarkerDefinitions.tsx`). */
export const flowEdgeMarkerDefaults = {
  width: 12.5,
  height: 12.5,
  markerUnits: 'strokeWidth',
  orient: 'auto-start-reverse',
  strokeWidth: 1,
} as const

/** The built-in marker kind of a literal or configured marker. */
export const flowEdgeMarkerType = (
  marker?: FlowEdgeMarkerOption
): FlowEdgeMarker | undefined =>
  marker === undefined || marker === 'arrow' || marker === 'arrowclosed'
    ? marker
    : marker.type

const idSegment = (value: string): string =>
  value.replaceAll(
    /[^A-Za-z0-9_-]/gu,
    (character) => `_${(character.codePointAt(0) ?? 0).toString(16)}_`
  )

/**
 * React `getMarkerId` equivalent: sorted `key=value` pairs, made DOM-safe so
 * the id can be used in `url(#id)` without quoting.
 */
export const flowEdgeMarkerId = (
  marker: FlowEdgeMarkerOption,
  scope = ''
): string => {
  const prefix =
    scope === '' ? 'flow-marker' : `flow-marker-${idSegment(scope)}`

  if (marker === 'arrow' || marker === 'arrowclosed') {
    return `${prefix}__${marker}`
  }

  const pairs = Object.entries(marker)
    .filter(([key]) => key !== 'colorPresence')
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&')

  return `${prefix}__${idSegment(pairs)}`
}

/**
 * Resolve a marker option with React defaults. A configured `color` wins;
 * `null` or a missing color falls back to `defaultColor` (the edge stroke).
 */
export const resolveFlowEdgeMarker = (
  marker?: FlowEdgeMarkerOption,
  options: {
    readonly scope?: string | undefined
    readonly defaultColor?: string | undefined
  } = {}
): ResolvedFlowEdgeMarker | undefined => {
  if (marker === undefined) {
    return undefined
  }

  const configuration: FlowEdgeMarkerConfiguration =
    marker === 'arrow' || marker === 'arrowclosed' ? { type: marker } : marker

  const color = configuration.color ?? options.defaultColor

  return {
    id: flowEdgeMarkerId(
      color === undefined ? marker : { ...configuration, color },
      options.scope
    ),
    type: configuration.type,
    color,
    width: configuration.width ?? flowEdgeMarkerDefaults.width,
    height: configuration.height ?? flowEdgeMarkerDefaults.height,
    markerUnits:
      configuration.markerUnits ?? flowEdgeMarkerDefaults.markerUnits,
    orient: configuration.orient ?? flowEdgeMarkerDefaults.orient,
    strokeWidth:
      configuration.strokeWidth ?? flowEdgeMarkerDefaults.strokeWidth,
  }
}

/**
 * React `createMarkerIds` equivalent: the unique markers used by `edges`,
 * applying default start/end markers and sorting by id.
 */
export const collectFlowEdgeMarkers = (
  edges: readonly Pick<FlowEdge, 'markerStart' | 'markerEnd' | 'stroke'>[],
  options: {
    readonly scope?: string
    readonly defaultColor?: string
    readonly defaultMarkerStart?: FlowEdgeMarkerOption
    readonly defaultMarkerEnd?: FlowEdgeMarkerOption
  } = {}
): readonly ResolvedFlowEdgeMarker[] => {
  const markers = new Map<string, ResolvedFlowEdgeMarker>()

  for (const edge of edges) {
    const defaultColor = edge.stroke ?? options.defaultColor

    for (const marker of [
      edge.markerStart ?? options.defaultMarkerStart,
      edge.markerEnd ?? options.defaultMarkerEnd,
    ]) {
      const resolved = resolveFlowEdgeMarker(marker, {
        scope: options.scope,
        defaultColor,
      })

      if (resolved !== undefined && !markers.has(resolved.id)) {
        markers.set(resolved.id, resolved)
      }
    }
  }

  return [...markers.values()].toSorted((left, right) =>
    left.id.localeCompare(right.id)
  )
}
