import {
  decodeFlowDocument,
  getBezierPath,
  getFloatingEdgeParams,
} from '@flow/core'
import type { FlowNodeRendererProps } from '@flow/core'
import {
  createFoldkitNodeMeasurementObserver,
  createFoldkitSnapshotClient,
  createProgram,
  defaultInteractionOptions,
  flowBaseEdge,
  HostAction,
} from '@flow/foldkit'
import type {
  ElementChangesSchema,
  FoldkitEdgeRenderer,
  FoldkitNodeRenderer,
  InteractionEventSchema,
} from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

type InteractionEvent = typeof InteractionEventSchema.Encoded

type ElementChanges = typeof ElementChangesSchema.Encoded

export interface FoldkitLiveDragFixture {
  readonly events: () => readonly InteractionEvent[]
  readonly deltas: () => readonly ElementChanges[]
  /** Node position and internal bounds from the public snapshot port. */
  readonly snapshotNode: (nodeId: string) => Promise<{
    readonly position: { readonly x: number; readonly y: number } | null
    readonly bounds: { readonly x: number; readonly y: number } | null
  }>
  /** Node renderer `dragging` props seen on the latest render, by node id. */
  readonly dragging: () => Readonly<Record<string, boolean>>
}

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const node = (id: string, x: number, y: number) => ({
  id,
  label: id.toUpperCase(),
  type: 'box',
  position: { x, y },
  size: { width: 120, height: 48 },
  handles,
})

const documentInput = {
  nodes: [node('a', 60, 60), node('b', 420, 60), node('c', 60, 420)],
  edges: [
    {
      id: 'built-in',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
    },
    {
      id: 'floating',
      type: 'floating',
      source: 'a',
      sourceHandle: 'out',
      target: 'c',
      targetHandle: 'in',
    },
  ],
}

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

const draggingProps: Record<string, boolean> = {}

const box: FoldkitNodeRenderer = (
  flowNode,
  h,
  props: FlowNodeRendererProps
) => {
  draggingProps[flowNode.id] = props.dragging

  return h.span(
    [h.DataAttribute('dragging', String(props.dragging))],
    [flowNode.label]
  )
}

/** Floating edge: border to border through the renderer's node bounds. */
const floating: FoldkitEdgeRenderer = (
  _edge,
  { props },
  h,
  _labels,
  edgeInteraction
) => {
  const [path] = getBezierPath(
    getFloatingEdgeParams(props.sourceNode, props.targetNode)
  )

  edgeInteraction(path)

  return flowBaseEdge(h, {
    path,
    attributes: { 'data-testid': 'floating-path' },
  })
}

export const mountFoldkitLiveDragFixture = (
  container: HTMLElement
): FoldkitLiveDragFixture => {
  const events: InteractionEvent[] = []
  const deltas: ElementChanges[] = []
  // The Runtime replaces its container, so observe the container's parent.
  const owner = container.parentElement ?? container

  const active = Runtime.embed(
    createProgram(
      container,
      Effect.runSync(decodeFlowDocument(documentInput)),
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      { nodeTypes: { box }, edgeTypes: { floating } },
      undefined,
      'full',
      defaultInteractionOptions
    )
  )

  active.ports.interactionEvents.subscribe((batch) => {
    events.push(...batch)
  })
  active.ports.elementChanges.subscribe((changes) => {
    deltas.push(changes)
  })

  createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => 1,
    onMeasure: ({ requestId, measurement }) =>
      send(
        active.ports.actions.send(
          HostAction.MeasureNode({ requestId, measurement })
        )
      ),
  })

  const snapshots = createFoldkitSnapshotClient(active.ports)

  return {
    events: () => events,
    deltas: () => deltas,
    snapshotNode: async (nodeId) => {
      const result = await snapshots.request({ nodeId })

      if (result.status !== 'succeeded') {
        return { position: null, bounds: null }
      }

      const { node: flowNode, internalNode } = result.response

      return {
        position: flowNode?.position ?? null,
        bounds: internalNode?.absolutePosition ?? null,
      }
    },
    dragging: () => ({ ...draggingProps }),
  }
}
