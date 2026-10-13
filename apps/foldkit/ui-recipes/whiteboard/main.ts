import {
  flowMeasurementsFromInternalNodes,
  getEdgePolylines,
  getEdgesGeometry,
  getFreehandPath,
  getNodesInsideLasso,
  getPointsBounds,
  getRectFromPoints,
  polylineIntersectsRect,
  polylinesIntersect,
  translatePoints,
} from '@flow/core'
import type { FlowDocument, FlowNode, FlowRect, XYPosition } from '@flow/core'
import type { FoldkitNodeRenderer } from '@flow/foldkit'
import { Option, Schema as S } from 'effect'

import { measuredBounds, mountRecipeHost } from '../recipe-host.ts'
import type { MeasuredState } from '../recipe-host.ts'

import './whiteboard.css'

const tools = ['select', 'lasso', 'eraser', 'rectangle', 'freehand'] as const

type Tool = (typeof tools)[number]

/** Flow units around a freehand stroke, so the round line caps stay inside the node. */
const strokePadding = 4

const sourceHandle = { id: 'out', kind: 'source', side: 'right' } as const

const targetHandle = { id: 'in', kind: 'target', side: 'left' } as const

const node = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 100, height: 50 },
  handles: [targetHandle, sourceHandle],
})

const edge = (source: string, target: string) => ({
  id: `e-${source}-${target}`.toLowerCase(),
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const FreehandDataSchema = S.Struct({
  points: S.Array(S.Tuple([S.Finite, S.Finite])),
})

const freehandPoints = (data: FlowNode['data']): readonly XYPosition[] =>
  Option.match(S.decodeUnknownOption(FreehandDataSchema)(data), {
    onNone: () => [],
    onSome: ({ points }) => points.map(([x, y]) => ({ x, y })),
  })

const rectangleNode: FoldkitNodeRenderer = (_node, h) =>
  h.div([h.Class('whiteboard-rectangle')], [])

const freehandNode: FoldkitNodeRenderer = (flowNode, h) =>
  h.svg(
    [h.Class('whiteboard-freehand'), h.Attribute('aria-hidden', 'true')],
    [
      h.path([
        h.DataAttribute('testid', 'freehand-path'),
        h.D(getFreehandPath(freehandPoints(flowNode.data))),
        h.Fill('none'),
        h.Stroke('#0f172a'),
        h.StrokeWidth('3'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-linejoin', 'round'),
      ]),
    ]
  )

const host = mountRecipeHost({
  page: 'whiteboard-page',
  // Selected nodes show their resize controls, which mark the lasso result.
  interaction: { nodesResizable: true },
  // A non-identity viewport proves the screen-to-flow conversion.
  viewport: { x: 40, y: 30, zoom: 1.25 },
  document: {
    nodes: [
      node('A', 20, 20),
      node('B', 180, 20),
      node('C', 340, 20),
      node('X', 20, 300),
      node('Y', 560, 300),
    ],
    edges: [edge('A', 'B'), edge('B', 'C'), edge('X', 'A'), edge('C', 'Y')],
  },
  registry: {
    nodeTypes: { rectangle: rectangleNode, freehand: freehandNode },
  },
})

const { frame, status } = host

let tool: Tool = 'select'

let partial = false

let created = 0

// The pane tool overlay owns its pointer events while a tool is active.
const overlay = document.createElement('div')

overlay.className = 'tool-overlay'

overlay.dataset.testid = 'tool-overlay'

overlay.innerHTML =
  '<svg class="tool-preview" aria-hidden="true"><path class="tool-preview-path"></path></svg>'

frame.append(overlay)

const previewPath = overlay.querySelector<SVGPathElement>('path')

if (previewPath === null) {
  throw new Error('Missing tool preview')
}

const toolButtons: HTMLButtonElement[] = []

const renderTool = (): void => {
  overlay.dataset.tool = tool
  overlay.style.pointerEvents = tool === 'select' ? 'none' : 'auto'
  status.dataset.tool = tool

  for (const [index, button] of toolButtons.entries()) {
    button.setAttribute('aria-pressed', String(tools[index] === tool))
  }
}

const selectTool = (name: Tool): void => {
  tool = name
  renderTool()
}

for (const name of tools) {
  const button = host.button(`tool-${name}`, name)
  button.addEventListener('click', () => selectTool(name))
  toolButtons.push(button)
}

renderTool()

const partialLabel = document.createElement('label')

const partialInput = document.createElement('input')

partialInput.type = 'checkbox'

partialInput.dataset.testid = 'lasso-partial'

partialInput.addEventListener('change', () => {
  partial = partialInput.checked
})

partialLabel.append(partialInput, ' partial lasso')

status.before(partialLabel)

const render = (document: FlowDocument): void => {
  status.dataset.nodes = document.nodes
    .map(({ id }) => id)
    .toSorted()
    .join(',')
  status.dataset.edges = document.edges
    .map(({ id }) => id)
    .toSorted()
    .join(',')
  status.dataset.selected = document.nodes
    .filter(({ selected }) => selected === true)
    .map(({ id }) => id)
    .toSorted()
    .join(',')
  status.value = `nodes:${status.dataset.nodes}`
}

render(host.document())

host.onAccepted(render)

/** What an eraser trail can hit: measured node bounds and rendered edge paths. */
interface Erasable {
  readonly bounds: ReadonlyMap<string, FlowRect>
  readonly edges: readonly {
    readonly id: string
    readonly polylines: readonly (readonly XYPosition[])[]
  }[]
}

/** Hit targets from the public snapshot port and the core edge-geometry query. */
const erasable = ({ document, internals }: MeasuredState): Erasable => ({
  bounds: measuredBounds(internals),
  edges: getEdgesGeometry(document, {
    measurements: flowMeasurementsFromInternalNodes(internals.values()),
  }).map((geometry) => ({
    id: geometry.id,
    polylines: getEdgePolylines(geometry),
  })),
})

interface Stroke {
  readonly pointerId: number
  readonly client: XYPosition[]
  readonly flow: XYPosition[]
  targets: Erasable
}

let stroke: Stroke | undefined

const overlayPoint = (point: XYPosition): XYPosition => {
  const rect = overlay.getBoundingClientRect()

  return { x: point.x - rect.left, y: point.y - rect.top }
}

const drawPreview = (current: Stroke): void => {
  const points = current.client.map(overlayPoint)

  const [first] = points

  const last = points.at(-1)

  if (first === undefined || last === undefined) {
    previewPath.setAttribute('d', '')

    return
  }

  if (tool === 'rectangle') {
    const rect = getRectFromPoints(first, last)
    previewPath.setAttribute(
      'd',
      `M ${rect.x} ${rect.y} h ${rect.width} v ${rect.height} h ${-rect.width} Z`
    )

    return
  }

  previewPath.setAttribute(
    'd',
    `M ${points.map(({ x, y }) => `${x} ${y}`).join(' L ')}${tool === 'lasso' ? ' Z' : ''}`
  )
}

/** Nodes and edges an eraser trail crosses. */
const erasedBy = (trail: readonly XYPosition[], targets: Erasable) => ({
  nodeIds: [...targets.bounds].flatMap(([id, rect]) =>
    polylineIntersectsRect(trail, rect) ? [id] : []
  ),
  edgeIds: targets.edges.flatMap(({ id, polylines }) =>
    polylines.some((points) => polylinesIntersect(trail, points)) ? [id] : []
  ),
})

const markErased = (marked: { nodeIds: string[]; edgeIds: string[] }) => {
  for (const element of frame.querySelectorAll<HTMLElement | SVGElement>(
    '[data-node-id], [data-testid="flow-edge"]'
  )) {
    const id = element.dataset.nodeId ?? element.dataset.edgeId ?? ''

    element.classList.toggle(
      'eraser-marked',
      element.dataset.nodeId === undefined
        ? marked.edgeIds.includes(id)
        : marked.nodeIds.includes(id)
    )
  }

  status.dataset.marked = [...marked.nodeIds, ...marked.edgeIds]
    .toSorted()
    .join(',')
}

/** Cache hit targets for live eraser marking. */
const loadTargets = async (target: Stroke): Promise<void> => {
  target.targets = erasable(await host.measuredState())
}

overlay.addEventListener('pointerdown', (event) => {
  if (tool === 'select' || event.button !== 0 || stroke !== undefined) {
    return
  }

  event.preventDefault()
  overlay.setPointerCapture(event.pointerId)
  const client = { x: event.clientX, y: event.clientY }

  const started: Stroke = {
    pointerId: event.pointerId,
    client: [client],
    flow: [host.screenToFlow(client)],
    targets: { bounds: new Map(), edges: [] },
  }

  stroke = started
  drawPreview(started)

  void loadTargets(started)
})

overlay.addEventListener('pointermove', (event) => {
  if (stroke?.pointerId !== event.pointerId) {
    return
  }

  const client = { x: event.clientX, y: event.clientY }
  stroke.client.push(client)
  stroke.flow.push(host.screenToFlow(client))
  drawPreview(stroke)

  if (tool === 'eraser') {
    markErased(erasedBy(stroke.flow, stroke.targets))
  }
})

const finishLasso = async (polygon: readonly XYPosition[]) => {
  const { document, internals } = await host.measuredState()

  const candidates = [...measuredBounds(internals)].map(([id, bounds]) => ({
    id,
    bounds,
  }))

  const inside = new Set(
    getNodesInsideLasso(candidates, polygon, { partial }).map(({ id }) => id)
  )

  await host.edit(
    document.nodes.map(({ id }) => ({
      kind: 'update-node' as const,
      nodeId: id,
      patch: { selected: inside.has(id) },
    }))
  )
}

const finishEraser = async (trail: readonly XYPosition[]) => {
  const erased = erasedBy(trail, erasable(await host.measuredState()))
  markErased({ nodeIds: [], edgeIds: [] })

  if (erased.nodeIds.length > 0 || erased.edgeIds.length > 0) {
    await host.edit([{ kind: 'delete-elements', ...erased }])
  }
}

const finishRectangle = async (current: Stroke) => {
  const [startClient] = current.client
  const endClient = current.client.at(-1)
  const [start] = current.flow
  const end = current.flow.at(-1)

  if (
    startClient === undefined ||
    endClient === undefined ||
    start === undefined ||
    end === undefined
  ) {
    return
  }

  const screen = getRectFromPoints(startClient, endClient)

  // Ignore clicks and tiny drags, like the React Flow Rectangle example.
  if (screen.width < 5 || screen.height < 5) {
    return
  }

  const rect = getRectFromPoints(start, end)
  created += 1

  await host.edit([
    {
      kind: 'add-nodes',
      nodes: [
        {
          id: `rectangle-${created}`,
          label: `rectangle-${created}`,
          type: 'rectangle',
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
        },
      ],
    },
  ])
}

const finishFreehand = async (points: readonly XYPosition[]) => {
  const bounds = getPointsBounds(points)

  if (bounds === undefined) {
    return
  }

  const position = { x: bounds.x - strokePadding, y: bounds.y - strokePadding }
  created += 1

  await host.edit([
    {
      kind: 'add-nodes',
      nodes: [
        {
          id: `freehand-${created}`,
          label: `freehand-${created}`,
          type: 'freehand',
          position,
          size: {
            width: bounds.width + strokePadding * 2,
            height: bounds.height + strokePadding * 2,
          },
          data: {
            points: translatePoints(points, position).map(({ x, y }) => [
              Math.round(x * 100) / 100,
              Math.round(y * 100) / 100,
            ]),
          },
        },
      ],
    },
  ])
}

const finish = (event: PointerEvent, cancelled: boolean): void => {
  if (stroke?.pointerId !== event.pointerId) {
    return
  }

  const current = stroke
  stroke = undefined
  previewPath.setAttribute('d', '')

  if (overlay.hasPointerCapture(event.pointerId)) {
    overlay.releasePointerCapture(event.pointerId)
  }

  if (cancelled) {
    markErased({ nodeIds: [], edgeIds: [] })

    return
  }

  switch (tool) {
    case 'lasso': {
      void finishLasso(current.flow)
      break
    }

    case 'eraser': {
      void finishEraser(current.flow)
      break
    }

    case 'rectangle': {
      void finishRectangle(current)
      break
    }

    case 'freehand': {
      void finishFreehand(current.flow)
      break
    }

    default: {
      break
    }
  }
}

overlay.addEventListener('pointerup', (event) => finish(event, false))

overlay.addEventListener('pointercancel', (event) => finish(event, true))
