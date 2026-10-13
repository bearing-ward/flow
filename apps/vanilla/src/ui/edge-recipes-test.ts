import {
  getBezierPath,
  getFloatingConnectionStart,
  getFloatingEdgeParams,
  getSimpleFloatingEdgeParams,
  getStraightPath,
} from '@flow/core'
import type {
  FlowEdge,
  FlowFloatingEdgeParams,
  FlowFloatingRect,
} from '@flow/core'
import { createFlowBaseEdge, mountFlow } from '@flow/vanilla'
import type {
  FlowBaseEdgeOptions,
  FlowConnectionPreviewRenderer,
  FlowEdgeRenderer,
  FlowEdgeRendererProps,
  FlowNodeRenderer,
  JavaScriptFlowController,
} from '@flow/vanilla'
import { Schema } from 'effect'

import '../style.css'
import './edge-recipes.css'

const svgNamespace = 'http://www.w3.org/2000/svg'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing edge recipes root')
}

root.innerHTML =
  '<main class="edge-recipes-page"><div class="edge-recipes-toolbar"></div><div id="canvas"></div><output data-testid="recipe-status" aria-live="polite"></output></main>'

const toolbar = root.querySelector<HTMLElement>('.edge-recipes-toolbar')

const canvas = root.querySelector<HTMLElement>('#canvas')

const status = root.querySelector<HTMLOutputElement>('output')

if (toolbar === null || canvas === null || status === null) {
  throw new Error('Missing edge recipes route elements')
}

/** Owns the mounted canvas so renderers and page controls can reach it after mount. */
interface RecipeCanvasOwner {
  current: JavaScriptFlowController | undefined
}

const flow: RecipeCanvasOwner = { current: undefined }

/** Prefix for marker ids, unique per mounted canvas. */
const canvasKey = `edge-recipes-${globalThis.crypto.randomUUID().slice(0, 8)}`

const placeLabel = (element: HTMLElement, x: number, y: number): void => {
  element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
  element.dataset.labelX = String(x)
  element.dataset.labelY = String(y)
}

const bezierOptions = (
  props: FlowEdgeRendererProps
): FlowBaseEdgeOptions & {
  readonly labelX: number
  readonly labelY: number
} => {
  const [path, labelX, labelY] = getBezierPath(props)

  return {
    path,
    labelX,
    labelY,
    markerStart: props.markerStart,
    markerEnd: props.markerEnd,
    attributes: { 'data-testid': `recipe-edge-${props.id}` },
  }
}

/** Edge with Button: BaseEdge plus a delete button in the edge label layer. */
const buttonEdge: FlowEdgeRenderer = {
  render: (edge, context, visual) => {
    const mount = createFlowBaseEdge(document, bezierOptions(context.props))
    const button = document.createElement('button')

    button.type = 'button'
    button.className = 'edge-recipe-delete nodrag nopan'
    button.dataset.testid = 'button-edge-delete'
    button.setAttribute('aria-label', `Delete edge ${edge.id}`)
    button.textContent = '×'
    button.addEventListener('click', () => {
      void flow.current?.deleteElements({ edgeIds: [edge.id] })
    })

    const paint = (props: FlowEdgeRendererProps): void => {
      const options = bezierOptions(props)

      mount.update(options)
      placeLabel(button, options.labelX, options.labelY)
    }

    visual.append(mount.element)
    context.edgeLabelRenderer.append(button)
    paint(context.props)

    return {
      update: (_next, nextContext) => paint(nextContext.props),
      updateProps: paint,
      destroy: () => {
        mount.dispose()
        button.remove()
      },
    }
  },
}

const nodeDataText = (props: FlowEdgeRendererProps): string => {
  const key = props.data?.key

  if (!Schema.is(Schema.String)(key)) {
    return ''
  }

  return String(props.sourceNode.node.data?.[key] ?? '')
}

/** Edge with Node Data: the label shows a source node data field. */
const dataEdge: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const mount = createFlowBaseEdge(document, bezierOptions(context.props))
    const label = document.createElement('div')

    label.className = 'edge-recipe-data-label nodrag nopan'
    label.dataset.testid = 'data-edge-label'

    const paint = (props: FlowEdgeRendererProps): void => {
      const options = bezierOptions(props)

      mount.update(options)
      label.textContent = nodeDataText(props)
      placeLabel(label, options.labelX, options.labelY)
    }

    visual.append(mount.element)
    context.edgeLabelRenderer.append(label)
    paint(context.props)

    return {
      update: (_next, nextContext) => paint(nextContext.props),
      updateProps: paint,
      destroy: () => {
        mount.dispose()
        label.remove()
      },
    }
  },
}

/** Animated SVG Edge: a circle follows the path unless reduced motion is requested. */
const animatedSvgEdge: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const reducedMotion = globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    const mount = createFlowBaseEdge(document, bezierOptions(context.props))
    const glyph = document.createElementNS(svgNamespace, 'circle')
    const motion = document.createElementNS(svgNamespace, 'animateMotion')
    let { props } = context

    glyph.dataset.testid = 'animated-svg-shape'
    glyph.setAttribute('r', '5')
    glyph.setAttribute('fill', '#ff0073')
    motion.setAttribute('dur', '2s')
    motion.setAttribute('repeatCount', 'indefinite')

    const paint = (): void => {
      const options = bezierOptions(props)

      mount.update(options)

      if (reducedMotion.matches) {
        motion.remove()
        glyph.setAttribute('cx', String(options.labelX))
        glyph.setAttribute('cy', String(options.labelY))

        return
      }

      glyph.removeAttribute('cx')
      glyph.removeAttribute('cy')
      motion.setAttribute('path', options.path)

      if (motion.parentNode !== glyph) {
        glyph.append(motion)
      }
    }

    reducedMotion.addEventListener('change', paint)
    visual.append(mount.element, glyph)
    paint()

    return {
      update: (_next, nextContext) => {
        ;({ props } = nextContext)
        paint()
      },
      updateProps: (next) => {
        props = next
        paint()
      },
      destroy: () => {
        reducedMotion.removeEventListener('change', paint)
        mount.dispose()
        glyph.remove()
      },
    }
  },
}

/** Floating edges attach to the node borders instead of handle positions. */
const floatingEdge = (
  params: (
    source: FlowFloatingRect,
    target: FlowFloatingRect
  ) => FlowFloatingEdgeParams
): FlowEdgeRenderer => {
  const options = (props: FlowEdgeRendererProps): FlowBaseEdgeOptions => {
    const [path] = getBezierPath(params(props.sourceNode, props.targetNode))

    return {
      path,
      markerEnd: props.markerEnd,
      attributes: { 'data-testid': `floating-edge-${props.id}` },
    }
  }

  return {
    render: (_edge, context, visual) => {
      const mount = createFlowBaseEdge(document, options(context.props))

      visual.append(mount.element)

      return {
        update: (_next, nextContext) =>
          mount.update(options(nextContext.props)),
        // Drag frames only deliver fresh props here, so the edge follows live.
        updateProps: (props) => mount.update(options(props)),
        destroy: () => mount.dispose(),
      }
    },
  }
}

const markerGlyphs = {
  circle: (color: string) => {
    const circle = document.createElementNS(svgNamespace, 'circle')

    circle.setAttribute('r', '8')
    circle.setAttribute('fill', color)

    return circle
  },
  diamond: (color: string) => {
    const diamond = document.createElementNS(svgNamespace, 'polygon')

    diamond.setAttribute('points', '0,-9 9,0 0,9 -9,0')
    diamond.setAttribute('fill', color)

    return diamond
  },
  arrow: (color: string) => {
    const arrow = document.createElementNS(svgNamespace, 'polygon')

    arrow.setAttribute('points', '-9,-7 9,0 -9,7')
    arrow.setAttribute('fill', color)

    return arrow
  },
} as const

const MarkerGlyphSchema = Schema.Literals(['circle', 'diamond', 'arrow'])

const markerData = (edge: FlowEdge) => {
  const data = edge.data ?? {}
  const color = Schema.is(Schema.String)(data.color) ? data.color : '#e11d48'
  const size = Schema.is(Schema.Finite)(data.size) ? data.size : 16

  return {
    color,
    size,
    start: Schema.is(MarkerGlyphSchema)(data.start) ? data.start : undefined,
    end: Schema.is(MarkerGlyphSchema)(data.end) ? data.end : undefined,
  }
}

/** Edge Markers: a custom edge that owns its `<marker>` definitions. */
const markerEdge: FlowEdgeRenderer = {
  render: (edge, context, visual) => {
    const definitions = document.createElementNS(svgNamespace, 'defs')
    const mount = createFlowBaseEdge(document, bezierOptions(context.props))

    const marker = (end: 'start' | 'end', next: FlowEdge) => {
      const config = markerData(next)
      const glyph = end === 'start' ? config.start : config.end

      if (glyph === undefined) {
        return
      }

      const element = document.createElementNS(svgNamespace, 'marker')
      const id = `${canvasKey}-${next.id}-${end}`

      element.id = id
      element.dataset.testid = 'custom-marker'
      element.setAttribute('viewBox', '-10 -10 20 20')
      element.setAttribute('markerWidth', String(config.size))
      element.setAttribute('markerHeight', String(config.size))
      element.setAttribute('markerUnits', 'userSpaceOnUse')
      element.setAttribute('orient', 'auto-start-reverse')
      element.setAttribute('refX', '0')
      element.setAttribute('refY', '0')
      element.append(markerGlyphs[glyph](config.color))
      definitions.append(element)

      return `url(#${id})`
    }

    const paint = (next: FlowEdge, props: FlowEdgeRendererProps): void => {
      definitions.replaceChildren()

      const { color } = markerData(next)

      mount.update({
        ...bezierOptions(props),
        markerStart: marker('start', next),
        markerEnd: marker('end', next),
        attributes: {
          'data-testid': `recipe-edge-${props.id}`,
          stroke: color,
        },
      })
    }

    let current = edge

    visual.append(definitions, mount.element)
    paint(edge, context.props)

    return {
      update: (next, nextContext) => {
        current = next
        paint(next, nextContext.props)
      },
      updateProps: (props) => paint(current, props),
      destroy: () => {
        definitions.remove()
        mount.dispose()
      },
    }
  },
}

/** Easy Connect node: a drag strip on top of a body-sized connection handle. */
const easyNode: FlowNodeRenderer = (node, content) => {
  const shell = document.createElement('div')
  const strip = document.createElement('div')
  const label = document.createElement('div')

  shell.className = 'edge-recipe-easy'
  strip.className = 'edge-recipe-easy-strip'
  strip.dataset.flowDragHandle = ''
  strip.dataset.testid = 'easy-drag-strip'
  label.className = 'edge-recipe-easy-label'
  label.textContent = node.label
  shell.append(strip, label)
  content.append(shell)

  return {
    update: (next) => {
      label.textContent = next.label
    },
    destroy: () => shell.remove(),
  }
}

const previewElement = <Name extends 'path' | 'circle'>(
  container: SVGSVGElement,
  name: Name,
  testId: string
): SVGElementTagNameMap[Name] => {
  const existing = container.querySelector<SVGElementTagNameMap[Name]>(
    `[data-testid="${testId}"]`
  )

  if (existing !== null) {
    return existing
  }

  const created = document.createElementNS(svgNamespace, name)

  created.dataset.testid = testId
  container.append(created)

  return created
}

const easyConnectionLine: FlowConnectionPreviewRenderer = (
  preview,
  container,
  line
) => {
  if (preview === null || line === null) {
    for (const element of container.querySelectorAll(
      '[data-testid^="easy-connection"]'
    )) {
      element.remove()
    }

    return
  }

  const start = getFloatingConnectionStart(line.fromNode, {
    x: line.toX,
    y: line.toY,
  })

  const [d] = getStraightPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: line.toX,
    targetY: line.toY,
  })

  const path = previewElement(container, 'path', 'easy-connection-line')
  const cursor = previewElement(container, 'circle', 'easy-connection-cursor')

  path.setAttribute('d', d)
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', '#334155')
  path.setAttribute('stroke-width', '2')
  cursor.setAttribute('cx', String(line.toX))
  cursor.setAttribute('cy', String(line.toY))
  cursor.setAttribute('r', '3')
  cursor.setAttribute('fill', '#fff')
  cursor.setAttribute('stroke', '#334155')
}

const handleCenter = (
  nodeId: string,
  handleId: string
): { readonly x: number; readonly y: number } | undefined => {
  const internal = flow.current?.getInternalNode(nodeId)

  const handle = internal?.handles.find(
    (candidate) => candidate.handleId === handleId
  )

  if (internal === undefined || handle === undefined) {
    return
  }

  return {
    x: internal.absolutePosition.x + handle.offset.x,
    y: internal.absolutePosition.y + handle.offset.y,
  }
}

const multiOrigins = (origin: string): readonly string[] => {
  const selected = (flow.current?.getNodes() ?? [])
    .filter((node) => node.selected === true)
    .map((node): string => node.id)

  return selected.includes(origin) ? selected : [origin]
}

/** Multi Connection Line: one line from every selected node's matching handle. */
const multiConnectionLine: FlowConnectionPreviewRenderer = (
  preview,
  container,
  line
) => {
  const existing = new Map(
    [
      ...container.querySelectorAll<SVGPathElement>(
        '[data-testid="multi-connection-line"]'
      ),
    ].map((path) => [path.dataset.nodeId, path])
  )

  const wanted = new Set<string>()

  if (preview !== null && line !== null) {
    for (const nodeId of multiOrigins(line.fromNode.id)) {
      const from = handleCenter(nodeId, line.fromHandle.id)

      if (from === undefined) {
        continue
      }

      const path =
        existing.get(nodeId) ?? document.createElementNS(svgNamespace, 'path')

      const [d] = getStraightPath({
        sourceX: from.x,
        sourceY: from.y,
        targetX: line.toX,
        targetY: line.toY,
      })

      path.dataset.testid = 'multi-connection-line'
      path.dataset.nodeId = nodeId
      path.setAttribute('d', d)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', '#7c3aed')
      path.setAttribute('stroke-width', '2')
      wanted.add(nodeId)

      if (!path.isConnected) {
        container.append(path)
      }
    }
  }

  for (const [nodeId, path] of existing) {
    if (nodeId === undefined || !wanted.has(nodeId)) {
      path.remove()
    }
  }
}

const handles = {
  out: { id: 'out', kind: 'source', side: 'right' },
  in: { id: 'in', kind: 'target', side: 'left' },
} as const

const chain = (
  edges: readonly {
    readonly id: string
    readonly source: string
    readonly target: string
    readonly type: string
    readonly data?: Readonly<Record<string, string | number>>
  }[]
) =>
  edges.map((edge) => ({
    ...edge,
    sourceHandle: 'out',
    targetHandle: 'in',
  }))

const floatingLayout = (type: string) => ({
  nodes: [
    {
      id: 'target',
      label: 'Target',
      position: { x: 390, y: 236 },
      size: { width: 120, height: 48 },
      handles: [handles.in],
    },
    ...[
      { id: 'left', x: 100, y: 240 },
      { id: 'right', x: 700, y: 240 },
      { id: 'top', x: 400, y: 40 },
      { id: 'bottom', x: 400, y: 440 },
    ].map(({ id, x, y }) => ({
      id,
      label: id,
      position: { x, y },
      size: { width: 100, height: 40 },
      handles: [handles.out],
    })),
  ],
  edges: ['left', 'right', 'top', 'bottom'].map((source, index) => ({
    id: `e-${index}`,
    type,
    source,
    sourceHandle: 'out',
    target: 'target',
    targetHandle: 'in',
    markerEnd: 'arrowclosed' as const,
  })),
})

interface Scene {
  readonly document: Parameters<typeof mountFlow>[1]
  readonly options?: Partial<Parameters<typeof mountFlow>[2]>
  readonly controls?: readonly HTMLElement[]
}

const pageButton = (testId: string, text: string, onClick: () => void) => {
  const button = document.createElement('button')

  button.type = 'button'
  button.dataset.testid = testId
  button.textContent = text
  button.addEventListener('click', onClick)

  return button
}

const scenes = {
  'button-edge': () => ({
    document: {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 60, y: 120 },
          handles: [handles.out],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 360, y: 220 },
          handles: [handles.in, handles.out],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 660, y: 120 },
          handles: [handles.in],
        },
      ],
      edges: chain([
        { id: 'e-ab', source: 'a', target: 'b', type: 'button' },
        { id: 'e-bc', source: 'b', target: 'c', type: 'button' },
      ]),
    },
    options: { edgeRenderers: { button: buttonEdge } },
  }),
  'data-edge': () => ({
    document: {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 80, y: 120 },
          data: { value: 'alpha' },
          handles: [handles.out],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 560, y: 300 },
          handles: [handles.in],
        },
      ],
      edges: chain([
        {
          id: 'e-ab',
          source: 'a',
          target: 'b',
          type: 'data',
          data: { key: 'value' },
        },
      ]),
    },
    options: { edgeRenderers: { data: dataEdge } },
    controls: [
      pageButton('update-node-data', 'Set node A to beta', () => {
        void flow.current?.updateNodeData('a', { value: 'beta' })
      }),
    ],
  }),
  'animated-svg-edge': () => ({
    document: {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 80, y: 120 },
          handles: [handles.out],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 560, y: 300 },
          handles: [handles.in],
        },
      ],
      edges: chain([
        { id: 'e-ab', source: 'a', target: 'b', type: 'animated-svg' },
      ]),
    },
    options: { edgeRenderers: { 'animated-svg': animatedSvgEdge } },
  }),
  'floating-edges': () => ({
    document: floatingLayout('floating'),
    options: {
      edgeRenderers: { floating: floatingEdge(getFloatingEdgeParams) },
    },
  }),
  'simple-floating-edges': () => ({
    document: floatingLayout('floating'),
    options: {
      edgeRenderers: { floating: floatingEdge(getSimpleFloatingEdgeParams) },
    },
  }),
  'easy-connect': () => ({
    document: {
      nodes: [
        { id: '1', x: 80, y: 80 },
        { id: '2', x: 520, y: 80 },
        { id: '3', x: 80, y: 360 },
        { id: '4', x: 520, y: 360 },
      ].map(({ id, x, y }) => ({
        id,
        label: `Node ${id}`,
        type: 'easy',
        position: { x, y },
        size: { width: 150, height: 80 },
        handles: [
          { id: 'body', kind: 'source' as const, side: 'top' as const },
        ],
      })),
      edges: [],
    },
    options: {
      connectionMode: 'loose',
      connectionPreview: easyConnectionLine,
      isValidConnection: (connection) =>
        connection.source !== connection.target,
      defaultEdgeOptions: { type: 'floating', markerEnd: 'arrowclosed' },
      nodeRenderers: { easy: easyNode },
      edgeRenderers: { floating: floatingEdge(getFloatingEdgeParams) },
    },
  }),
  'edge-markers': () => ({
    document: {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 60, y: 60 },
          handles: [handles.out],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 560, y: 60 },
          handles: [handles.in],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 60, y: 300 },
          handles: [handles.out],
        },
        {
          id: 'd',
          label: 'D',
          position: { x: 560, y: 300 },
          handles: [handles.in],
        },
      ],
      edges: [
        {
          id: 'm-arrow',
          source: 'a',
          target: 'b',
          markerEnd: 'arrow' as const,
          stroke: '#2563eb',
        },
        {
          id: 'm-closed',
          source: 'a',
          target: 'd',
          markerEnd: 'arrowclosed' as const,
          stroke: '#16a34a',
        },
        {
          id: 'm-both',
          source: 'c',
          target: 'b',
          markerStart: 'arrow' as const,
          markerEnd: 'arrowclosed' as const,
          stroke: '#9333ea',
        },
        ...chain([
          {
            id: 'm-custom-1',
            source: 'c',
            target: 'd',
            type: 'marker',
            data: {
              start: 'circle',
              end: 'diamond',
              color: '#e11d48',
              size: 16,
            },
          },
          {
            id: 'm-custom-2',
            source: 'a',
            target: 'b',
            type: 'marker',
            data: {
              start: 'diamond',
              end: 'arrow',
              color: '#0ea5e9',
              size: 12,
            },
          },
        ]),
      ].map((edge) => ({ path: 'bezier' as const, ...edge })),
    },
    options: { edgeRenderers: { marker: markerEdge } },
  }),
  'multi-connection-line': () => ({
    document: {
      nodes: [
        ...[
          { id: 's1', y: 60, selected: true },
          { id: 's2', y: 220, selected: true },
          { id: 's3', y: 380, selected: false },
        ].map(({ id, y, selected }) => ({
          id,
          label: id,
          position: { x: 80, y },
          selected,
          handles: [handles.out],
        })),
        {
          id: 't',
          label: 't',
          position: { x: 600, y: 220 },
          handles: [handles.in],
        },
      ],
      edges: [],
    },
    options: {
      connectionPreview: multiConnectionLine,
      onConnect: (connection) => {
        const extra = multiOrigins(connection.source)
          .filter((nodeId) => nodeId !== connection.source)
          .map((nodeId) => ({
            id: `multi-${nodeId}-${connection.target}`,
            source: nodeId,
            sourceHandle: connection.sourceHandle,
            target: connection.target,
            targetHandle: connection.targetHandle,
          }))

        if (extra.length > 0) {
          void flow.current?.addEdges(extra)
        }
      },
    },
  }),
} satisfies Readonly<Record<string, () => Scene>>

const sceneName =
  new URLSearchParams(globalThis.location.search).get('scene') ?? 'button-edge'

const sceneFactory: (() => Scene) | undefined = Object.entries(scenes).find(
  ([name]) => name === sceneName
)?.[1]

const scene = sceneFactory?.()

if (scene === undefined) {
  throw new Error(`Unknown edge recipe scene: ${sceneName}`)
}

root.dataset.scene = sceneName

toolbar.append(...(scene.controls ?? []))

const report = (edges: readonly FlowEdge[]): void => {
  status.value = `edges:${edges.map(({ id }) => id).join(',')}`
  status.dataset.pairs = edges
    .map(({ source, target }) => `${source}>${target}`)
    .join(',')
}

const controller = mountFlow(canvas, scene.document, {
  documentMode: 'uncontrolled',
  // React Flow's edge examples add no NodeResizer.
  nodeResizeControls: false,
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
  ...scene.options,
})

flow.current = controller

report(controller.getEdges())

controller.subscribeState(({ current }) => report(current.document.edges))

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})
