import type { FlowEditTransactionInput } from './flow-edit.schema.ts'
import type { Viewport, ViewportLimits } from './flow-runtime.schema.ts'
import type { FlowStateChange } from './flow-snapshot.ts'
import type { FlowEdge, FlowNode } from './flow.schema.ts'

/** Rounded percentage label used by zoom slider and zoom select controls. */
export const zoomPercentLabel = (zoom: number): string =>
  `${Math.round(zoom * 100)}%`

/** Clamp a requested zoom into the canvas limits. */
export const clampZoom = (zoom: number, limits: ViewportLimits): number =>
  Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom))

export interface FlowZoomPreset {
  readonly value: 'fit' | number
  readonly label: string
}

/** React Flow UI Zoom Select presets: fit view, then 50% to 200%. */
export const flowZoomPresets: readonly FlowZoomPreset[] = [
  { value: 'fit', label: 'Fit view' },
  { value: 0.5, label: '50%' },
  { value: 1, label: '100%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
]

/** Parse a zoom select option value produced from `flowZoomPresets`. */
export const parseZoomPresetValue = (
  value: string
): 'fit' | number | undefined => {
  if (value === 'fit') {
    return 'fit'
  }

  const zoom = Number(value)

  return Number.isFinite(zoom) && zoom > 0 ? zoom : undefined
}

export interface FlowNodeSearchResult {
  readonly id: string
  readonly label: string
}

/**
 * React Flow UI Node Search default: lowercase label inclusion. Hidden nodes
 * and blank queries produce no results.
 */
export const searchFlowNodes = (
  nodes: readonly Pick<FlowNode, 'id' | 'label' | 'hidden'>[],
  query: string,
  limit = 20
): readonly FlowNodeSearchResult[] => {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return []
  }

  return nodes
    .filter(
      (node) =>
        node.hidden !== true && node.label.toLowerCase().includes(needle)
    )
    .slice(0, limit)
    .map((node) => ({ id: node.id, label: node.label }))
}

/** Edit transaction that leaves exactly one selected node and no selected edges. */
export const selectOnlyNodeTransaction = (
  document: {
    readonly nodes: readonly Pick<FlowNode, 'id' | 'selected'>[]
    readonly edges: readonly Pick<FlowEdge, 'id' | 'selected'>[]
  },
  nodeId: string
): FlowEditTransactionInput => ({
  operations: [
    ...document.nodes
      .filter((node) => (node.selected === true) !== (node.id === nodeId))
      .map((node) => ({
        kind: 'update-node' as const,
        nodeId: node.id,
        patch: { selected: node.id === nodeId },
      })),
    ...document.edges
      .filter((edge) => edge.selected === true)
      .map((edge) => ({
        kind: 'update-edge' as const,
        edgeId: edge.id,
        patch: { selected: false },
      })),
  ],
})

/** Move an active list index for ArrowUp, ArrowDown, Home and End. */
export const nextListIndex = (
  current: number,
  count: number,
  key: string
): number | undefined => {
  if (count === 0) {
    return undefined
  }

  switch (key) {
    case 'ArrowDown': {
      return current < 0 ? 0 : (current + 1) % count
    }

    case 'ArrowUp': {
      return current <= 0 ? count - 1 : current - 1
    }

    case 'Home': {
      return 0
    }

    case 'End': {
      return count - 1
    }

    default: {
      return undefined
    }
  }
}

export interface FlowDevToolsNodeRow {
  readonly id: string
  readonly label: string
  readonly type: string
  readonly x: number
  readonly y: number
  readonly selected: boolean
  readonly hidden: boolean
}

export const devToolsNodeRows = (document: {
  readonly nodes: readonly Pick<
    FlowNode,
    'id' | 'label' | 'type' | 'position' | 'selected' | 'hidden'
  >[]
}): readonly FlowDevToolsNodeRow[] =>
  document.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: node.type ?? 'default',
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    selected: node.selected === true,
    hidden: node.hidden === true,
  }))

export interface FlowDevToolsEdgeRow {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly selected: boolean
}

export const devToolsEdgeRows = (document: {
  readonly edges: readonly Pick<
    FlowEdge,
    'id' | 'source' | 'target' | 'selected'
  >[]
}): readonly FlowDevToolsEdgeRow[] =>
  document.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    selected: edge.selected === true,
  }))

const round = (value: number, digits: number): number => {
  const scale = 10 ** digits

  return Math.round(value * scale) / scale
}

export const formatViewportLog = (viewport: Viewport): string =>
  `x: ${round(viewport.x, 1)}, y: ${round(viewport.y, 1)}, zoom: ${round(viewport.zoom, 2)}`

export type FlowChangeLogKind =
  | 'add'
  | 'remove'
  | 'position'
  | 'select'
  | 'data'
  | 'replace'

export interface FlowChangeLogEntry {
  readonly element: 'node' | 'edge'
  readonly kind: FlowChangeLogKind
  readonly id: string
  readonly text: string
}

const sameJson = <Value>(left: Value, right: Value): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const nodeChangeKinds = (
  previous: FlowNode,
  current: FlowNode
): readonly FlowChangeLogKind[] => {
  const kinds: FlowChangeLogKind[] = []

  if (
    previous.position.x !== current.position.x ||
    previous.position.y !== current.position.y
  ) {
    kinds.push('position')
  }

  if ((previous.selected === true) !== (current.selected === true)) {
    kinds.push('select')
  }

  if (!sameJson(previous.data, current.data)) {
    kinds.push('data')
  }

  if (
    kinds.length === 0 &&
    !sameJson(
      { ...previous, position: undefined, selected: undefined },
      { ...current, position: undefined, selected: undefined }
    )
  ) {
    kinds.push('replace')
  }

  return kinds
}

const edgeChangeKinds = (
  previous: FlowEdge,
  current: FlowEdge
): readonly FlowChangeLogKind[] => {
  const kinds: FlowChangeLogKind[] = []

  if ((previous.selected === true) !== (current.selected === true)) {
    kinds.push('select')
  }

  if (!sameJson(previous.data, current.data)) {
    kinds.push('data')
  }

  if (
    kinds.length === 0 &&
    !sameJson(
      { ...previous, selected: undefined },
      { ...current, selected: undefined }
    )
  ) {
    kinds.push('replace')
  }

  return kinds
}

const entryText = (
  element: 'node' | 'edge',
  kind: FlowChangeLogKind,
  id: string,
  current?: FlowNode | FlowEdge
): string => {
  if (kind === 'select') {
    return `${element} ${id} ${current?.selected === true ? 'selected' : 'deselected'}`
  }

  if (kind === 'position' && current !== undefined && 'position' in current) {
    return `${element} ${id} position ${Math.round(current.position.x)}, ${Math.round(current.position.y)}`
  }

  return `${element} ${id} ${kind}`
}

const diffElements = <Item extends FlowNode | FlowEdge>(
  element: 'node' | 'edge',
  previous: readonly Item[],
  current: readonly Item[],
  kindsOf: (before: Item, after: Item) => readonly FlowChangeLogKind[]
): readonly FlowChangeLogEntry[] => {
  const before = new Map(previous.map((item) => [item.id, item]))
  const after = new Map(current.map((item) => [item.id, item]))
  const entries: FlowChangeLogEntry[] = []

  for (const item of current) {
    const old = before.get(item.id)
    const kinds = old === undefined ? (['add'] as const) : kindsOf(old, item)

    for (const kind of kinds) {
      entries.push({
        element,
        kind,
        id: item.id,
        text: entryText(element, kind, item.id, item),
      })
    }
  }

  for (const item of previous) {
    if (!after.has(item.id)) {
      entries.push({
        element,
        kind: 'remove',
        id: item.id,
        text: entryText(element, 'remove', item.id),
      })
    }
  }

  return entries
}

/**
 * Summarize the node and edge changes between two accepted public snapshots.
 * Viewport-only updates produce no entries; DevTools shows them separately.
 */
export const describeFlowStateChange = (
  change: Pick<FlowStateChange, 'previous' | 'current'>
): readonly FlowChangeLogEntry[] => {
  const { previous, current } = change

  if (previous.document === current.document) {
    return []
  }

  return [
    ...diffElements(
      'node',
      previous.document.nodes,
      current.document.nodes,
      nodeChangeKinds
    ),
    ...diffElements(
      'edge',
      previous.document.edges,
      current.document.edges,
      edgeChangeKinds
    ),
  ]
}

/** Where a DOM event landed, as classified by a host's interactivity lock. */
export type FlowLockTarget = 'node' | 'edge' | 'handle' | 'exempt' | 'other'

/** Event types a host lock listens to while the canvas is not interactive. */
export const flowLockEventTypes = [
  'pointerdown',
  'mousedown',
  'touchstart',
  'click',
  'dblclick',
  'keydown',
] as const

export type FlowLockEventType = (typeof flowLockEventTypes)[number]

const lockedKeys = new Set([
  'Enter',
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

/**
 * @deprecated Controls now set the runtime `FlowInteractivity` switches
 * (Plan 108); hosts no longer gate DOM events. Kept for compatibility.
 *
 * Whether a locked canvas blocks an event. Locking stands in for React Flow's
 * nodesDraggable, nodesConnectable and elementsSelectable all being false:
 * element gestures and activation keys are blocked; the pane, its pan and
 * zoom, and form or no-drag content inside nodes remain usable.
 */
export const blocksLockedInteraction = (input: {
  readonly type: FlowLockEventType
  readonly target: FlowLockTarget
  readonly key?: string | undefined
}): boolean => {
  if (input.target === 'exempt' || input.target === 'other') {
    return false
  }

  if (input.type === 'keydown') {
    return input.key !== undefined && lockedKeys.has(input.key)
  }

  return true
}
