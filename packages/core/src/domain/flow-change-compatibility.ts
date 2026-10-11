import { Schema as S } from 'effect'

import type { GetStraightPathParams } from './flow-edge-path.ts'
import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'
import type { EdgeId, NodeId } from './flow-values.ts'
import { FlowEdgeSchema, FlowNodeSchema } from './flow.schema.ts'
import type { FlowEdge, FlowNode } from './flow.schema.ts'

const DimensionsSchema = S.Struct({ width: S.Number, height: S.Number })

export const NodeDimensionsChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('dimensions'),
  dimensions: S.optional(DimensionsSchema),
  resizing: S.optional(S.Boolean),
  setAttributes: S.optional(
    S.Union([S.Boolean, S.Literals(['width', 'height'])])
  ),
})

export type NodeDimensionsChange = typeof NodeDimensionsChangeSchema.Type

export const NodePositionArrayChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('position'),
  position: S.optional(S.Struct({ x: S.Number, y: S.Number })),
  positionAbsolute: S.optional(S.Struct({ x: S.Number, y: S.Number })),
  dragging: S.optional(S.Boolean),
})

export type NodePositionArrayChange = typeof NodePositionArrayChangeSchema.Type

export const NodeSelectArrayChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('select'),
  selected: S.Boolean,
})

export const NodeRemoveArrayChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('remove'),
})

export const NodeAddArrayChangeSchema = S.Struct({
  item: FlowNodeSchema,
  type: S.Literal('add'),
  index: S.optional(S.Int),
})

export const NodeReplaceArrayChangeSchema = S.Struct({
  id: NodeIdSchema,
  item: FlowNodeSchema,
  type: S.Literal('replace'),
})

export const NodeChangeSchema = S.Union([
  NodeDimensionsChangeSchema,
  NodePositionArrayChangeSchema,
  NodeSelectArrayChangeSchema,
  NodeRemoveArrayChangeSchema,
  NodeAddArrayChangeSchema,
  NodeReplaceArrayChangeSchema,
])

export type NodeChange<N extends FlowNode = FlowNode> =
  | Exclude<typeof NodeChangeSchema.Type, { readonly type: 'add' | 'replace' }>
  | { readonly item: N; readonly type: 'add'; readonly index?: number }
  | { readonly id: NodeId; readonly item: N; readonly type: 'replace' }

export const EdgeSelectArrayChangeSchema = S.Struct({
  id: EdgeIdSchema,
  type: S.Literal('select'),
  selected: S.Boolean,
})

export const EdgeRemoveArrayChangeSchema = S.Struct({
  id: EdgeIdSchema,
  type: S.Literal('remove'),
})

export const EdgeAddArrayChangeSchema = S.Struct({
  item: FlowEdgeSchema,
  type: S.Literal('add'),
  index: S.optional(S.Int),
})

export const EdgeReplaceArrayChangeSchema = S.Struct({
  id: EdgeIdSchema,
  item: FlowEdgeSchema,
  type: S.Literal('replace'),
})

export const EdgeChangeSchema = S.Union([
  EdgeSelectArrayChangeSchema,
  EdgeRemoveArrayChangeSchema,
  EdgeAddArrayChangeSchema,
  EdgeReplaceArrayChangeSchema,
])

export type EdgeChange<E extends FlowEdge = FlowEdge> =
  | Exclude<typeof EdgeChangeSchema.Type, { readonly type: 'add' | 'replace' }>
  | { readonly item: E; readonly type: 'add'; readonly index?: number }
  | { readonly id: EdgeId; readonly item: E; readonly type: 'replace' }

interface Identified {
  readonly id: string
}

type NodeUtilityItem = FlowNode & {
  readonly measured?: { readonly width: number; readonly height: number }
  readonly width?: number
  readonly height?: number
  readonly resizing?: boolean
  readonly dragging?: boolean
}

const applyArrayChanges = <
  T extends Identified,
  C extends { readonly type: string },
>(
  changes: readonly C[],
  elements: readonly T[],
  apply: (change: C, element: T) => T
): T[] => {
  const byId = new Map<string, C[]>()
  const additions: C[] = []

  for (const change of changes) {
    // SAFETY: Each public variant is a discriminated change. This structural view reads only the fields shared by those variants.
    const item = change as C & {
      readonly id?: string
      readonly item?: T
      readonly index?: number
    }

    if (item.type === 'add') {
      additions.push(change)
      continue
    }

    if (item.type === 'remove' || item.type === 'replace') {
      if (item.id !== undefined) {
        byId.set(item.id, [change])
      }

      continue
    }

    if (item.id !== undefined) {
      byId.set(item.id, [...(byId.get(item.id) ?? []), change])
    }
  }

  const result: T[] = []

  for (const element of elements) {
    const sequence = byId.get(element.id)

    if (sequence === undefined) {
      result.push(element)
      continue
    }

    // SAFETY: A sequence is created only from changes carrying the current element ID.
    const first = sequence[0] as C & {
      readonly type: string
      readonly item?: T
    }

    if (first.type === 'remove') {
      continue
    }

    if (first.type === 'replace') {
      if (first.item !== undefined) {
        result.push({ ...first.item })
      }

      continue
    }

    let updated = { ...element }

    for (const change of sequence) {
      updated = apply(change, updated)
    }

    result.push(updated)
  }

  for (const change of additions) {
    // SAFETY: The additions queue only receives changes whose `type` is `add`.
    const addition = change as C & { readonly item: T; readonly index?: number }
    const item = { ...addition.item }

    if (addition.index === undefined) {
      result.push(item)
    } else {
      result.splice(addition.index, 0, item)
    }
  }

  return result
}

export const applyNodeChanges = <N extends NodeUtilityItem = NodeUtilityItem>(
  changes: readonly NodeChange<N>[],
  nodes: readonly N[]
): N[] =>
  applyArrayChanges<N, NodeChange<N>>(changes, nodes, (change, element) => {
    switch (change.type) {
      case 'select': {
        return { ...element, selected: change.selected }
      }

      case 'position': {
        const updated = { ...element }

        if (change.position !== undefined) {
          Object.assign(updated, { position: change.position })
        }

        if (change.dragging !== undefined) {
          Object.assign(updated, { dragging: change.dragging })
        }

        return updated
      }

      case 'dimensions': {
        const { dimensions } = change

        const updated = { ...element }

        if (dimensions !== undefined) {
          Object.assign(updated, { measured: { ...dimensions } })

          if (
            change.setAttributes === true ||
            change.setAttributes === 'width'
          ) {
            Object.assign(updated, { width: dimensions.width })
          }

          if (
            change.setAttributes === true ||
            change.setAttributes === 'height'
          ) {
            Object.assign(updated, { height: dimensions.height })
          }
        }

        if (change.resizing !== undefined) {
          Object.assign(updated, { resizing: change.resizing })
        }

        return updated
      }

      default: {
        return element
      }
    }
  })

export const applyEdgeChanges = <E extends FlowEdge = FlowEdge>(
  changes: readonly EdgeChange<E>[],
  edges: readonly E[]
): E[] =>
  applyArrayChanges<E, EdgeChange<E>>(changes, edges, (change, edge) =>
    change.type === 'select' ? { ...edge, selected: change.selected } : edge
  )

const HasNodeIdentitySchema = S.Struct({ id: S.Unknown, position: S.Unknown })

const HasSourceSchema = S.Struct({ source: S.Unknown })

const HasTargetSchema = S.Struct({ target: S.Unknown })

const HasEdgeIdentitySchema = S.Struct({
  id: S.Unknown,
  source: S.Unknown,
  target: S.Unknown,
})

export const isNode = <N extends FlowNode = FlowNode>(
  value: unknown
): value is N =>
  S.is(HasNodeIdentitySchema)(value) &&
  !S.is(HasSourceSchema)(value) &&
  !S.is(HasTargetSchema)(value)

export const isEdge = <E extends FlowEdge = FlowEdge>(
  value: unknown
): value is E => S.is(HasEdgeIdentitySchema)(value)

export interface FlowConnectionInput {
  readonly source: NodeId
  readonly target: NodeId
  readonly sourceHandle?: string | null | undefined
  readonly targetHandle?: string | null | undefined
}

export interface AddEdgeOptions<E extends FlowEdge = FlowEdge> {
  readonly getEdgeId?: (connection: FlowConnectionInput | E) => string
  readonly onError?: (code: '006', message: string) => void
}

export interface ReconnectEdgeOptions<E extends FlowEdge = FlowEdge> {
  readonly shouldReplaceId?: boolean
  readonly getEdgeId?: (connection: FlowConnectionInput | E) => string
  readonly onError?: (code: '006' | '007', message: string) => void
}

/** Utility output may retain null or undefined handles supplied by the caller. */
export type ReconnectedEdge<E extends FlowEdge = FlowEdge> = Omit<
  E,
  'sourceHandle' | 'targetHandle'
> & {
  readonly sourceHandle?: E['sourceHandle'] | null | undefined
  readonly targetHandle?: E['targetHandle'] | null | undefined
}

export const getFlowEdgeId = ({
  source,
  sourceHandle,
  target,
  targetHandle,
}: FlowConnectionInput): EdgeId =>
  S.decodeUnknownSync(EdgeIdSchema)(
    `xy-edge__${source}${sourceHandle || ''}-${target}${targetHandle || ''}`
  )

const generateEdgeId = <E extends FlowEdge>(
  connection: FlowConnectionInput | E,
  options: AddEdgeOptions<E> | ReconnectEdgeOptions<E>
): EdgeId =>
  S.decodeUnknownSync(EdgeIdSchema)(
    (options.getEdgeId ?? getFlowEdgeId)(connection)
  )

const sameEndpoints = (a: FlowEdge, b: FlowConnectionInput): boolean =>
  a.source === b.source &&
  a.target === b.target &&
  (a.sourceHandle === b.sourceHandle || (!a.sourceHandle && !b.sourceHandle)) &&
  (a.targetHandle === b.targetHandle || (!a.targetHandle && !b.targetHandle))

const defaultAddEdgeOptions: AddEdgeOptions = {}

const defaultReconnectEdgeOptions: ReconnectEdgeOptions = {
  shouldReplaceId: true,
}

export function addEdge<E extends FlowEdge = FlowEdge>(
  edgeParams: E | FlowConnectionInput,
  edges: E[],
  options?: AddEdgeOptions<E>
): E[]
export function addEdge<E extends FlowEdge = FlowEdge>(
  edgeParams: E | FlowConnectionInput,
  edges: readonly E[],
  options?: AddEdgeOptions<E>
): readonly E[]
export function addEdge<E extends FlowEdge = FlowEdge>(
  edgeParams: E | FlowConnectionInput,
  edges: readonly E[],
  options: AddEdgeOptions<E> = defaultAddEdgeOptions
): readonly E[] {
  if (!edgeParams.source || !edgeParams.target) {
    options.onError?.(
      '006',
      "Can't create edge. An edge needs a source and a target."
    )

    return edges
  }

  // SAFETY: Presence of `id` distinguishes a complete edge; a connection receives a generated identity, and both branches preserve the declared generic fields.
  const complete: E =
    'id' in edgeParams
      ? ({ ...edgeParams } as E)
      : ({
          ...edgeParams,
          id: generateEdgeId(edgeParams, options),
        } as E)

  if (edges.some((edge) => sameEndpoints(edge, complete))) {
    return edges
  }

  if (complete.sourceHandle === null) {
    // SAFETY: `complete` is a shallow copy, so removing a null optional handle cannot mutate the caller's input.
    delete (complete as { sourceHandle?: string | null }).sourceHandle
  }

  if (complete.targetHandle === null) {
    // SAFETY: `complete` is a shallow copy, so removing a null optional handle cannot mutate the caller's input.
    delete (complete as { targetHandle?: string | null }).targetHandle
  }

  return [...edges, complete]
}

export function reconnectEdge<E extends FlowEdge = FlowEdge>(
  oldEdge: E,
  connection: FlowConnectionInput,
  edges: E[],
  options?: ReconnectEdgeOptions<E>
): ReconnectedEdge<E>[]
export function reconnectEdge<E extends FlowEdge = FlowEdge>(
  oldEdge: E,
  connection: FlowConnectionInput,
  edges: readonly E[],
  options?: ReconnectEdgeOptions<E>
): readonly ReconnectedEdge<E>[]
export function reconnectEdge<E extends FlowEdge = FlowEdge>(
  oldEdge: E,
  connection: FlowConnectionInput,
  edges: readonly E[],
  options: ReconnectEdgeOptions<E> = defaultReconnectEdgeOptions
): readonly ReconnectedEdge<E>[] {
  if (!connection.source || !connection.target) {
    options.onError?.(
      '006',
      "Can't create edge. An edge needs a source and a target."
    )

    return edges
  }

  if (!edges.some((edge) => edge.id === oldEdge.id)) {
    options.onError?.(
      '007',
      `The old edge with id=${oldEdge.id} does not exist.`
    )

    return edges
  }

  const {
    id: _oldId,
    sourceHandle: _oldSourceHandle,
    targetHandle: _oldTargetHandle,
    ...metadata
  } = oldEdge

  // SAFETY: The returned edge preserves prior metadata; connection handles intentionally retain null/undefined utility values.
  const replacement = {
    ...metadata,
    id: options.shouldReplaceId
      ? generateEdgeId(connection, options)
      : oldEdge.id,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  } as ReconnectedEdge<E>

  return [...edges.filter((edge) => edge.id !== oldEdge.id), replacement]
}

export interface GeometryRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

const EdgeCenterResultSchema = S.mutable(
  S.Tuple([S.Number, S.Number, S.Number, S.Number])
)

export const getEdgeCenter = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: GetStraightPathParams): typeof EdgeCenterResultSchema.Type => {
  const xOffset = Math.abs(targetX - sourceX) / 2
  const yOffset = Math.abs(targetY - sourceY) / 2

  return [
    targetX < sourceX ? targetX + xOffset : targetX - xOffset,
    targetY < sourceY ? targetY + yOffset : targetY - yOffset,
    xOffset,
    yOffset,
  ]
}
