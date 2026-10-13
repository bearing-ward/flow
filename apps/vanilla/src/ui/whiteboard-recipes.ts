import {
  flowMeasurementsFromInternalNodes,
  getEdgePolylines,
  getEdgesGeometry,
  getFreehandPath,
  getInternalNodeBounds,
  getNodesInsideLasso,
  getPointsBounds,
  getRectFromPoints,
  polylineIntersectsRect,
  polylinesIntersect,
  translatePoints,
} from '@flow/core'
import type { FlowIntersectionCandidate, XYPosition } from '@flow/core'
import { mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'
import { Schema } from 'effect'

import { createRecipePage, measuredNode } from './recipe-page.ts'

import './whiteboard-recipes.css'

/*
 * Whiteboard recipes: a pane tool overlay owns pointer input while a tool is
 * active. Lasso selects, the eraser deletes what its trail crosses, and the
 * rectangle and freehand tools create nodes. Hit tests use measured node
 * bounds and the public edge-geometry query, in flow coordinates.
 */

const svgNamespace = 'http://www.w3.org/2000/svg'

const { canvas, status, toolbar } = createRecipePage('whiteboard')

const ToolSchema = Schema.Literals([
  'select',
  'lasso',
  'eraser',
  'rectangle',
  'freehand',
])

type Tool = typeof ToolSchema.Type

/** Flow units between a freehand stroke and its node border. */
const strokePadding = 4

const PointsSchema = Schema.Array(Schema.Tuple([Schema.Finite, Schema.Finite]))

const rectangleNode: FlowNodeRenderer = (node, content) => {
  const fill = document.createElement('div')

  fill.className = 'wb-rectangle'
  fill.setAttribute('aria-label', node.label)
  content.append(fill)

  return {
    update: (next) => fill.setAttribute('aria-label', next.label),
    destroy: () => fill.remove(),
  }
}

const freehandNode: FlowNodeRenderer = (node, content) => {
  const svg = document.createElementNS(svgNamespace, 'svg')
  const path = document.createElementNS(svgNamespace, 'path')

  svg.classList.add('wb-freehand')
  path.dataset.testid = 'freehand-path'
  svg.append(path)
  content.append(svg)

  const paint = (next: typeof node): void => {
    const raw = next.data?.points
    const points = Schema.is(PointsSchema)(raw) ? raw : []

    svg.setAttribute(
      'viewBox',
      `0 0 ${next.size?.width ?? 1} ${next.size?.height ?? 1}`
    )
    path.setAttribute('d', getFreehandPath(points.map(([x, y]) => ({ x, y }))))
  }

  paint(node)

  return { update: paint, destroy: () => svg.remove() }
}

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const box = (id: string, x: number, y: number) => ({
  id,
  label: `Node ${id}`,
  position: { x, y },
  size: { width: 100, height: 40 },
  handles,
})

const controller = mountFlow(
  canvas,
  {
    nodes: [
      box('A', 20, 20),
      box('B', 160, 20),
      box('C', 20, 140),
      box('X', 300, 140),
      box('Y', 560, 320),
    ],
    edges: [
      { id: 'e-a-b', source: 'A', target: 'B' },
      { id: 'e-a-c', source: 'A', target: 'C' },
      { id: 'e-b-x', source: 'B', target: 'X' },
      { id: 'e-c-y', source: 'C', target: 'Y' },
    ].map((edge) => ({ ...edge, sourceHandle: 'out', targetHandle: 'in' })),
  },
  {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 40, y: 30, zoom: 1.25 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    nodeRenderers: { rectangle: rectangleNode, freehand: freehandNode },
  }
)

/* Tool bar. */

let tool: Tool = 'select'

const toolButtons = ToolSchema.literals.map((name) => {
  const button = document.createElement('button')

  button.type = 'button'
  button.dataset.testid = `tool-${name}`
  button.dataset.tool = name
  button.textContent = name

  return button
})

const partialLabel = document.createElement('label')

const partialInput = document.createElement('input')

partialInput.type = 'checkbox'

partialInput.dataset.testid = 'lasso-partial'

partialLabel.append(partialInput, ' partial lasso')

toolbar.append(...toolButtons, partialLabel)

/* Pane tool overlay: screen-space preview, flow-space hit tests. */

const overlay = document.createElement('div')

const preview = document.createElementNS(svgNamespace, 'svg')

const previewPath = document.createElementNS(svgNamespace, 'path')

overlay.className = 'wb-overlay'

overlay.dataset.testid = 'tool-overlay'

preview.classList.add('wb-preview')

preview.append(previewPath)

overlay.append(preview)

canvas.append(overlay)

const setTool = (next: Tool): void => {
  tool = next
  overlay.dataset.tool = next
  overlay.style.pointerEvents = next === 'select' ? 'none' : 'auto'
  status.dataset.tool = next

  for (const button of toolButtons) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.testid === `tool-${next}`)
    )
  }
}

setTool('select')

toolbar.addEventListener('click', (event) => {
  const name =
    event.target instanceof HTMLElement ? event.target.dataset.tool : undefined

  if (Schema.is(ToolSchema)(name)) {
    setTool(name)
  }
})

interface Stroke {
  readonly pointerId: number
  readonly tool: Tool
  readonly screen: XYPosition[]
  readonly flow: XYPosition[]
}

let stroke: Stroke | undefined

const local = (event: PointerEvent): XYPosition => {
  const rect = overlay.getBoundingClientRect()

  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

const toFlow = (event: PointerEvent): XYPosition =>
  controller.screenToFlowPosition({ x: event.clientX, y: event.clientY })

const nodeCandidates = (): readonly FlowIntersectionCandidate[] =>
  controller.getNodes().flatMap(({ id }) => {
    const internal = measuredNode(controller, id)

    return internal === undefined ? [] : [getInternalNodeBounds(internal)]
  })

/** Rendered edge paths as flow-space polylines, from the public geometry query. */
const edgePolylines = (): readonly {
  readonly id: string
  readonly polylines: readonly (readonly XYPosition[])[]
}[] => {
  const { document: flowDocument } = controller.getSnapshot()

  const measurements = flowMeasurementsFromInternalNodes(
    flowDocument.nodes.map(({ id }) => controller.getInternalNode(id))
  )

  return getEdgesGeometry(flowDocument, { measurements }).map((geometry) => ({
    id: geometry.id,
    polylines: getEdgePolylines(geometry),
  }))
}

const eraserHits = (trail: readonly XYPosition[]) => ({
  nodeIds: nodeCandidates()
    .filter(({ bounds }) => polylineIntersectsRect(trail, bounds))
    .map(({ id }) => id),
  edgeIds: edgePolylines()
    .filter(({ polylines }) =>
      polylines.some((points) => polylinesIntersect(trail, points))
    )
    .map(({ id }) => id),
})

const markErased = (hits: ReturnType<typeof eraserHits>): void => {
  const nodeIds = new Set(hits.nodeIds)
  const edgeIds = new Set(hits.edgeIds)

  for (const element of canvas.querySelectorAll<HTMLElement>(
    '.flow-node[data-node-id]'
  )) {
    element.classList.toggle(
      'eraser-marked',
      nodeIds.has(element.dataset.nodeId ?? '')
    )
  }

  for (const element of canvas.querySelectorAll<SVGGElement>(
    '.flow-edge-group[data-edge-id]'
  )) {
    element.classList.toggle(
      'eraser-marked',
      edgeIds.has(element.dataset.edgeId ?? '')
    )
  }
}

const drawPreview = (current: Stroke): void => {
  const [first] = current.screen
  const last = current.screen.at(-1)

  if (first === undefined || last === undefined) {
    previewPath.removeAttribute('d')

    return
  }

  if (current.tool === 'rectangle') {
    const { x, y, width, height } = getRectFromPoints(first, last)

    previewPath.setAttribute(
      'd',
      `M ${x} ${y} h ${width} v ${height} h ${-width} Z`
    )

    return
  }

  const line = current.screen.map(({ x, y }) => `${x} ${y}`).join(' L ')

  previewPath.setAttribute(
    'd',
    current.tool === 'lasso' ? `M ${line} Z` : `M ${line}`
  )
}

let createdCount = 0

const nextId = (prefix: string): string => {
  createdCount += 1

  return `${prefix}-${createdCount}`
}

const finishLasso = (polygon: readonly XYPosition[]): void => {
  const selected = new Set(
    getNodesInsideLasso(nodeCandidates(), polygon, {
      partial: partialInput.checked,
    }).map(({ id }) => id)
  )

  void controller.setNodes((nodes) =>
    nodes.map((node) => ({ ...node, selected: selected.has(node.id) }))
  )
}

const finishRectangle = (current: Stroke): void => {
  const [screenStart] = current.screen
  const screenEnd = current.screen.at(-1)
  const [start] = current.flow
  const end = current.flow.at(-1)

  if (
    screenStart === undefined ||
    screenEnd === undefined ||
    start === undefined ||
    end === undefined
  ) {
    return
  }

  const screenRect = getRectFromPoints(screenStart, screenEnd)

  if (screenRect.width < 5 || screenRect.height < 5) {
    return
  }

  const { x, y, width, height } = getRectFromPoints(start, end)

  void controller.addNodes({
    id: nextId('rectangle'),
    type: 'rectangle',
    label: 'Rectangle',
    position: { x, y },
    size: { width, height },
  })
}

const round = (value: number): number => Math.round(value * 100) / 100

const finishFreehand = (points: readonly XYPosition[]): void => {
  const bounds = getPointsBounds(points)

  if (bounds === undefined) {
    return
  }

  const origin = {
    x: bounds.x - strokePadding,
    y: bounds.y - strokePadding,
  }

  void controller.addNodes({
    id: nextId('freehand'),
    type: 'freehand',
    label: 'Drawing',
    position: origin,
    size: {
      width: bounds.width + strokePadding * 2,
      height: bounds.height + strokePadding * 2,
    },
    data: {
      points: translatePoints(points, origin).map(({ x, y }) => [
        round(x),
        round(y),
      ]),
    },
  })
}

const finish = (current: Stroke): void => {
  switch (current.tool) {
    case 'lasso': {
      finishLasso(current.flow)
      break
    }

    case 'eraser': {
      const hits = eraserHits(current.flow)

      markErased({ nodeIds: [], edgeIds: [] })

      if (hits.nodeIds.length > 0 || hits.edgeIds.length > 0) {
        void controller.deleteElements(hits)
      }

      break
    }

    case 'rectangle': {
      finishRectangle(current)
      break
    }

    case 'freehand': {
      finishFreehand(current.flow)
      break
    }

    default: {
      break
    }
  }
}

overlay.addEventListener('pointerdown', (event) => {
  if (tool === 'select' || event.button !== 0 || stroke !== undefined) {
    return
  }

  event.preventDefault()
  overlay.setPointerCapture(event.pointerId)
  stroke = {
    pointerId: event.pointerId,
    tool,
    screen: [local(event)],
    flow: [toFlow(event)],
  }
  drawPreview(stroke)
})

overlay.addEventListener('pointermove', (event) => {
  if (stroke?.pointerId !== event.pointerId) {
    return
  }

  stroke.screen.push(local(event))
  stroke.flow.push(toFlow(event))
  drawPreview(stroke)

  if (stroke.tool === 'eraser') {
    markErased(eraserHits(stroke.flow))
  }
})

const end = (event: PointerEvent, commit: boolean): void => {
  if (stroke?.pointerId !== event.pointerId) {
    return
  }

  const current = stroke

  stroke = undefined
  previewPath.removeAttribute('d')

  if (overlay.hasPointerCapture(event.pointerId)) {
    overlay.releasePointerCapture(event.pointerId)
  }

  if (commit) {
    current.screen.push(local(event))
    current.flow.push(toFlow(event))
    finish(current)
  } else {
    markErased({ nodeIds: [], edgeIds: [] })
  }
}

overlay.addEventListener('pointerup', (event) => end(event, true))

overlay.addEventListener('pointercancel', (event) => end(event, false))

/* Status. */

const report = (): void => {
  const nodes = controller.getNodes()

  status.value = `nodes:${nodes.length}`
  status.dataset.nodes = nodes.map(({ id }) => id).join(',')
  status.dataset.edges = controller
    .getEdges()
    .map(({ id }) => id)
    .join(',')
  status.dataset.selected = nodes
    .filter(({ selected }) => selected === true)
    .map(({ id }) => id)
    .join(',')
}

report()

controller.subscribeState(report)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
