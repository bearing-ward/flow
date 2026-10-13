import { graphlib, layout as dagreRun } from '@dagrejs/dagre'
import { getFlowLayoutInput, layoutCenterToTopLeft } from '@flow/core'
import type {
  FlowLayoutDirection,
  FlowLayoutHandle,
  FlowLayoutInput,
  XYPosition,
} from '@flow/core'
import type { FlowActions } from '@flow/vue'
import type { ElkExtendedEdge, ElkNode, ElkPort } from 'elkjs/lib/elk-api'
import ELK from 'elkjs/lib/elk.bundled.js'
import { onScopeDispose } from 'vue'

/** Top-left layout positions by node id. */
export type LayoutPositions = ReadonlyMap<string, XYPosition>

/** Example "Dagre Tree": dagre ranks the measured nodes; centers become top-left positions. */
export const dagreLayout = (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection
): LayoutPositions => {
  const graph = new graphlib.Graph()

  graph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 60 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const { id, width, height } of input.nodes) {
    graph.setNode(id, { width, height })
  }

  for (const { source, target } of input.edges) {
    graph.setEdge(source, target)
  }

  dagreRun(graph)

  return new Map(
    input.nodes.map((node) => {
      const { x, y } = graph.node(node.id)

      return [node.id, layoutCenterToTopLeft({ x, y }, node)]
    })
  )
}

const elk = new ELK()

const portSide = (side: FlowLayoutHandle['side']): string => {
  switch (side) {
    case 'top': {
      return 'NORTH'
    }

    case 'bottom': {
      return 'SOUTH'
    }

    case 'left': {
      return 'WEST'
    }

    default: {
      return 'EAST'
    }
  }
}

/** ELK port id for one measured handle. */
export const elkPortId = (nodeId: string, handleId: string): string =>
  `${nodeId}:${handleId}`

const endpoint = (nodeId: string, handleId: string | undefined): string =>
  handleId === undefined ? nodeId : elkPortId(nodeId, handleId)

/**
 * Example "Elkjs Tree" and "Elkjs Multiple Handles": ELK layered with the
 * measured node sizes, and with `ports` each measured handle box as a fixed port.
 */
export const elkLayout = async (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection,
  options: { readonly ports: boolean }
): Promise<LayoutPositions> => {
  const children: ElkNode[] = input.nodes.map((node) => {
    const ports: ElkPort[] = node.handles.map((handle) => ({
      id: elkPortId(node.id, handle.id),
      x: handle.x,
      y: handle.y,
      width: handle.width,
      height: handle.height,
      layoutOptions: { 'org.eclipse.elk.port.side': portSide(handle.side) },
    }))

    return options.ports
      ? {
          id: node.id,
          width: node.width,
          height: node.height,
          ports,
          layoutOptions: { 'org.eclipse.elk.portConstraints': 'FIXED_POS' },
        }
      : { id: node.id, width: node.width, height: node.height }
  })

  const edges: ElkExtendedEdge[] = input.edges.map((edge) =>
    options.ports
      ? {
          id: edge.id,
          sources: [endpoint(edge.source, edge.sourceHandle)],
          targets: [endpoint(edge.target, edge.targetHandle)],
        }
      : { id: edge.id, sources: [edge.source], targets: [edge.target] }
  )

  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    },
    children,
    edges,
  })

  return new Map(
    (result.children ?? []).map(({ id, x, y }) => [
      id,
      { x: x ?? 0, y: y ?? 0 },
    ])
  )
}

/**
 * Element changes the canvas reports through `nodesChange` and `edgesChange`,
 * including the `dimensions` changes of each new measurement.
 */
const elementChangeListeners = new Set<() => void>()

/** Forward a canvas change event to the layouts waiting on measurements. */
export const notifyElementChanges = (): void => {
  for (const listener of elementChangeListeners) {
    listener()
  }
}

const onElementChanges = (listener: () => void): void => {
  elementChangeListeners.add(listener)
  onScopeDispose(() => elementChangeListeners.delete(listener))
}

/** Layout input once every visible node is measured; undefined until then. */
export const getMeasuredLayoutInput = (
  flow: FlowActions
): FlowLayoutInput | undefined => {
  const input = getFlowLayoutInput(flow.document.value, flow.getInternalNode)

  return input.unmeasured.length === 0 && input.nodes.length > 0
    ? input
    : undefined
}

/** Call `ready` with the layout input once every visible node is measured. */
export const whenMeasured = (
  flow: FlowActions,
  ready: (input: FlowLayoutInput) => void
): void => {
  let done = false

  const check = (): void => {
    const input = done ? undefined : getMeasuredLayoutInput(flow)

    if (input !== undefined) {
      done = true
      ready(input)
    }
  }

  onElementChanges(check)
  check()
}

const signature = (input: FlowLayoutInput): string =>
  [
    ...input.nodes.map(
      ({ id, width, height }) =>
        `${id}:${Math.round(width)}x${Math.round(height)}`
    ),
    ...input.edges.map(({ id }) => id),
  ].join('|')

/**
 * Run `layout` once every visible node is measured, and again whenever the
 * node or edge set or a measured node size changes. The canvas reports each
 * measurement as a `dimensions` change, so this waits on change events
 * instead of sampling every frame.
 */
export const useMeasuredLayout = (
  flow: FlowActions,
  layout: (input: FlowLayoutInput) => Promise<void>
): void => {
  let last = ''
  let busy = false
  let again = false

  const check = async (): Promise<void> => {
    if (busy) {
      again = true

      return
    }

    const input = getMeasuredLayoutInput(flow)

    if (input === undefined) {
      return
    }

    const next = signature(input)

    if (next === last) {
      return
    }

    last = next
    busy = true

    try {
      await layout(input)
    } finally {
      busy = false
    }

    if (again) {
      again = false
      await check()
    }
  }

  onElementChanges(() => {
    void check()
  })
  void check()
}
