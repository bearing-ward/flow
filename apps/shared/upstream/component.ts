import { Schema as S } from 'effect'

import { FlowDocumentSchema } from '../../../packages/core/src/public.ts'
import type { FlowNode, Viewport } from '../../../packages/core/src/public.ts'

// examples/react/cypress/fixtures/simpleflow.ts:3,17
export const simpleDocument = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [
    {
      id: '1',
      label: 'Node 1',
      data: { label: 'Node 1' },
      position: { x: 0, y: 0 },
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
    {
      id: '2',
      label: 'Node 2',
      data: { label: 'Node 2' },
      position: { x: 200, y: 200 },
      sourcePosition: 'bottom',
      targetPosition: 'top',
    },
  ],
  edges: [{ id: 'e1', source: '1', target: '2' }],
})

const componentDocument = (id: number) => {
  let nodes = [...simpleDocument.nodes]

  const edgeCases = [
    1, 2, 17, 18, 19, 20, 24, 25, 30, 31, 34, 35, 36, 37, 38, 39, 42, 48, 49,
    50, 51, 52, 53, 54,
  ]

  let edges = edgeCases.includes(id) ? [...simpleDocument.edges] : []

  const empty = [
    5, 9, 10, 11, 12, 13, 14, 15, 16, 32, 33, 40, 41, 57, 58, 59, 60, 61, 62,
    71, 73, 74, 75, 76,
  ].includes(id)

  if (empty) {
    nodes = []
    edges = []
  }

  if ([3, 4].includes(id)) {
    nodes = nodes.map((n) => ({ ...n, style: { width: 100, height: 50 } }))
  }

  if (id >= 43 && id <= 47) {
    nodes = nodes.map((n, i) => ({
      ...n,
      style: i === 0 ? { width: 100, height: 40 } : { width: 80, height: 50 },
    }))
  }

  if (id >= 48 && id <= 50) {
    nodes = nodes.map((n) => ({
      ...n,
      type: 'checker',
      handles: [],
      data: { ...n.data, useLayout: id === 49 },
    }))
  }

  if (id === 28) {
    nodes = nodes.map((n) => ({ ...n, type: 'custom', handles: [] }))
  }

  if (id === 29) {
    nodes = nodes.map((n) => ({ ...n, type: 'invalid' }))
  }

  if (id === 30) {
    edges = edges.map((e) => ({ ...e, type: 'custom' }))
  }

  if (id === 31) {
    edges = edges.map((e) => ({ ...e, type: 'invalid' }))
  }

  if ([55, 56, 69, 70].includes(id)) {
    nodes = simpleDocument.nodes.map((n, i) => ({
      ...n,
      position: { x: i === 0 ? -500 : 500, y: 0 },
    }))

    if (id === 56) {
      nodes = nodes.slice(0, 1)
    }

    if (id === 70) {
      nodes = nodes.map((n) =>
        n.id === '1' ? { ...n, position: { x: 0, y: 0 } } : n
      )
    }

    edges = []
  }

  if (id === 72) {
    nodes = [
      {
        ...simpleDocument.nodes[0],
        id: '1',
        label: '1',
        data: { label: '1' },
        position: { x: 200, y: 200 },
      },
    ].flatMap(
      (n) =>
        S.decodeUnknownSync(FlowDocumentSchema)({ nodes: [n], edges: [] }).nodes
    )
  }

  return S.decodeUnknownSync(FlowDocumentSchema)({ nodes, edges })
}

const componentViewport = (id: number) => {
  let initial = { x: 0, y: 0, zoom: 1 }
  let minZoom = 0.5
  let maxZoom = 2

  if (id === 12 || id === 16) {
    initial = { x: 100, y: 100, zoom: 0.5 }
  }

  if (id === 57 || id === 55) {
    minZoom = 0.2
  }

  if (id === 58 || id === 59) {
    minZoom = 1
  }

  if (id === 59) {
    initial.zoom = 0.2
  }

  if (id === 60) {
    maxZoom = 1
  }

  if (id === 62) {
    maxZoom = 1.5
    initial.zoom = 2
  }

  if (id === 64) {
    initial.zoom = 1.5
  }

  if (id === 65) {
    initial = { x: 100, y: 100, zoom: 1.5 }
  }

  // ViewportSchema rejects non-positive zoom; preserve raw input for the host's public decoder.
  if (id === 66) {
    initial.zoom = -1
  }

  if (id === 67) {
    initial.zoom = 100
  }

  return { initial, minZoom, maxZoom }
}

interface ComponentCanvasOptions {
  nodeDragThreshold: number
  panOnDrag: boolean
  zoomOnScroll: boolean
  zoomOnDoubleClick: boolean
  deleteKeyCode: string
  snapToGrid?: boolean
  snapGrid?: [number, number]
  onlyRenderVisibleElements?: boolean
  translateExtent?: [[number, number], [number, number]]
  nodeExtent?: [[number, number], [number, number]]
  preventScrolling?: boolean
}

const componentOptions = (id: number) => {
  const options: ComponentCanvasOptions = {
    nodeDragThreshold:
      id === 8 || (id >= 17 && id <= 41) || (id >= 43 && id <= 47) || id >= 68
        ? 0
        : 1,
    panOnDrag: true,
    zoomOnScroll: true,
    zoomOnDoubleClick: true,
    deleteKeyCode: 'Backspace',
  }

  if (id === 68) {
    options.snapToGrid = true
    options.snapGrid = [100, 100]
  }

  if ([69, 70].includes(id)) {
    options.onlyRenderVisibleElements = true
  }

  if (id === 71) {
    options.translateExtent = [
      [0, 0],
      [1000, 1000],
    ]
  }

  if (id === 72) {
    options.nodeExtent = [
      [0, 0],
      [50, 50],
    ]
  }

  if (id === 73 || id === 74) {
    options.preventScrolling = id === 74
  }

  return options
}

export const componentConfig = (id: number) => {
  const defaults = [2, 4, 7, 17, 18, 42, 50, 51, 52, 53, 54].includes(id)
  const viewport = componentViewport(id)

  return {
    id,
    document: componentDocument(id),
    ...viewport,
    defaults,
    controlled: !defaults,
    applyNodes: id === 8 || (id >= 21 && id <= 47) || id >= 68,
    applyEdges: true,
    applyConnect: id !== 23,
    options: componentOptions(id),
    fit: id === 55 || id === 56,
    fitOptions: id === 56 ? { padding: 0.5 } : {},
  }
}

export type ComponentConfig = ReturnType<typeof componentConfig>

export interface ComponentReceipt {
  nodes: unknown[]
  edges: unknown[]
  initialized: boolean[]
  viewports: Viewport[]
  starts: Viewport[]
  changes: Viewport[]
  ends: Viewport[]
  nodeChanges: unknown[]
  events: Record<string, number>
  checks: { nodesLength: number; lookupSize: number }[]
  errors: string[]
  inputs: { type: string; x: number; y: number; target: string; hit: string }[]
}

declare global {
  interface Window {
    __component: ComponentReceipt
    __componentUpdate: () => void | Promise<void>
    __componentRemount: () => void | Promise<void>
  }
}

export const componentReceipt = (): ComponentReceipt => {
  const receipt: ComponentReceipt = {
    nodes: [],
    edges: [],
    initialized: [],
    viewports: [],
    starts: [],
    changes: [],
    ends: [],
    nodeChanges: [],
    events: {},
    checks: [],
    errors: [],
    inputs: [],
  }

  for (const type of [
    'pointerdown',
    'pointermove',
    'pointerup',
    'mousedown',
    'mousemove',
    'mouseup',
    'click',
    'wheel',
  ]) {
    window.addEventListener(
      type,
      (event) => {
        if (event instanceof MouseEvent) {
          const target =
            event.target instanceof Element
              ? event.target.outerHTML.slice(0, 250)
              : ''

          receipt.inputs.push({
            type,
            x: event.clientX,
            y: event.clientY,
            target,
            hit:
              document
                .elementFromPoint(event.clientX, event.clientY)
                ?.outerHTML.slice(0, 250) ?? '',
          })

          if (receipt.inputs.length > 100) {
            receipt.inputs.shift()
          }
        }
      },
      true
    )
  }

  window.__component = receipt
  window.addEventListener('error', (event) =>
    receipt.errors.push(event.message)
  )

  return receipt
}

export const recordEvent = (receipt: ComponentReceipt, name: string) => {
  receipt.events[name] = (receipt.events[name] ?? 0) + 1
}

export const recordDistinct = <T>(history: T[], value: T) => {
  const copy = value

  if (JSON.stringify(history.at(-1)) !== JSON.stringify(copy)) {
    history.push(copy)
  }
}

export const recordViewport = (receipt: ComponentReceipt, viewport: Viewport) =>
  recordDistinct(receipt.viewports, viewport)

export const recordNodes = (
  receipt: ComponentReceipt,
  nodes: readonly FlowNode[]
) => recordDistinct(receipt.nodes, nodes)

// examples/react/cypress/support/ControlledFlow.tsx:16-69. Hosts own controlled
// collections; apply only enabled change handlers. No implicit document repair.
export const controlledDocument = (config: ComponentConfig) => ({
  current: config.document,
})

export const componentCallbacks = (id: number): readonly string[] => {
  const callbacks: ReadonlyMap<number, readonly string[]> = new Map([
    [35, ['onNodeClick']],
    [36, ['onNodeDragStart', 'onNodeDrag', 'onNodeDragStop']],
    [
      37,
      [
        'onNodeMouseEnter',
        'onNodeMouseMove',
        'onNodeMouseLeave',
        'onNodeContextMenu',
        'onNodeDoubleClick',
      ],
    ],
    [38, ['onEdgeClick']],
    [
      39,
      [
        'onEdgeMouseEnter',
        'onEdgeMouseMove',
        'onEdgeMouseLeave',
        'onEdgeContextMenu',
        'onEdgeDoubleClick',
      ],
    ],
    [41, ['onPaneClick', 'onPaneContextMenu']],
  ])

  return callbacks.get(id) ?? []
}

// examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:117-132
// examples/react/cypress/components/reactflow/storeAvailabilityOnRemount.cy.tsx:119-140
export const mountComponentControls = (root: HTMLElement, id: number) => {
  if (id !== 44 && ![48, 49, 50].includes(id)) {
    return
  }

  const button = document.createElement('button')
  button.style.cssText = 'position:absolute;right:0;top:0;z-index:1000000'

  if (id === 44) {
    button.dataset.id = 'update-btn'
    button.textContent = 'update'
    button.addEventListener('click', () => {
      void window.__componentUpdate()
    })
  } else {
    button.dataset.testid = 'remount'
    button.textContent = 'Remount'
    button.addEventListener('click', () => {
      void window.__componentRemount()
    })
  }

  root.append(button)
}
