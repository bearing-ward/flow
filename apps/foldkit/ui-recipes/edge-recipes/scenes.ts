import {
  getBezierPath,
  getFloatingEdgeParams,
  getSimpleFloatingEdgeParams,
  getStraightPath,
} from '@flow/core'
import type { FlowEdgeRendererProps, XYPosition } from '@flow/core'
import { flowBaseEdge } from '@flow/foldkit'
import type {
  FoldkitConnectionPreviewRenderer,
  FoldkitEdgeRenderer,
  FoldkitRendererRegistry,
} from '@flow/foldkit'
import { Schema as S } from 'effect'

export const sceneNames = [
  'button-edge',
  'data-edge',
  'animated-svg-edge',
  'floating-edges',
  'simple-floating-edges',
  'easy-connect',
  'edge-markers',
  'multi-connection-line',
] as const

export type SceneName = (typeof sceneNames)[number]

export const SceneNameSchema = S.Literals(sceneNames)

/** Page state the renderers read; the page owns it and keeps it current. */
export interface RecipeState {
  /** Selected node ids, from accepted state. */
  readonly selected: Set<string>
  /** Absolute flow-space handle centers keyed by `nodeId:handleId`, from internal nodes. */
  readonly handleCenters: Map<string, XYPosition>
}

const sourceHandle = { id: 'out', kind: 'source', side: 'right' } as const

const targetHandle = { id: 'in', kind: 'target', side: 'left' } as const

const box = { width: 120, height: 48 }

const node = (
  id: string,
  x: number,
  y: number,
  handles: readonly (typeof sourceHandle | typeof targetHandle)[],
  extra: {
    readonly data?: { readonly value: string }
    readonly selected?: boolean
  } = {}
) => ({
  id,
  label: id,
  position: { x, y },
  size: box,
  handles,
  ...extra,
})

const edgePath = (props: FlowEdgeRendererProps) => ({
  'data-testid': 'recipe-edge-path',
  'data-recipe-edge-id': props.id,
})

const htmlAtLabel = (x: number, y: number) => ({
  position: 'absolute',
  left: '0',
  top: '0',
  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
  pointerEvents: 'all',
})

const buttonEdge: FoldkitEdgeRenderer = (_edge, { props }, h, labels) => {
  const [path, labelX, labelY] = getBezierPath(props)

  labels(
    h.button(
      [
        h.Attribute('type', 'button'),
        h.Class('edge-recipe-delete'),
        h.DataAttribute('testid', 'button-edge-delete'),
        h.DataAttribute('edge-id', props.id),
        h.AriaLabel(`Delete edge ${props.id}`),
        h.Style(htmlAtLabel(labelX, labelY)),
      ],
      ['×']
    )
  )

  return flowBaseEdge(h, {
    path,
    markerEnd: props.markerEnd,
    attributes: edgePath(props),
  })
}

const DataEdgeSchema = S.Struct({ key: S.String })

const dataEdge: FoldkitEdgeRenderer = (edge, { props }, h, labels) => {
  const [path, labelX, labelY] = getBezierPath(props)
  const { key } = S.decodeUnknownSync(DataEdgeSchema)(edge.data)

  labels(
    h.div(
      [
        h.Class('edge-recipe-data-label'),
        h.DataAttribute('testid', 'data-edge-label'),
        h.Style(htmlAtLabel(labelX, labelY)),
      ],
      [String(props.sourceNode.node.data?.[key])]
    )
  )

  return flowBaseEdge(h, { path, attributes: edgePath(props) })
}

const MotionSchema = S.Struct({ reducedMotion: S.Boolean })

const animatedSvgEdge: FoldkitEdgeRenderer = (edge, { props }, h) => {
  const [path, labelX, labelY] = getBezierPath(props)
  const { reducedMotion } = S.decodeUnknownSync(MotionSchema)(edge.data)

  const mover = reducedMotion
    ? h.circle([
        h.DataAttribute('testid', 'animated-svg-shape'),
        h.R('5'),
        h.Cx(String(labelX)),
        h.Cy(String(labelY)),
        h.Fill('#e11d48'),
      ])
    : h.circle(
        [
          h.DataAttribute('testid', 'animated-svg-shape'),
          h.R('5'),
          h.Fill('#e11d48'),
        ],
        [
          h.animateMotion([
            h.Attribute('dur', '2s'),
            h.Attribute('repeatCount', 'indefinite'),
            h.Attribute('path', path),
          ]),
        ]
      )

  return h.g(
    [],
    [flowBaseEdge(h, { path, attributes: edgePath(props) }), mover]
  )
}

const floatingEdge =
  (params: typeof getFloatingEdgeParams): FoldkitEdgeRenderer =>
  (_edge, { props }, h, _labels, edgeInteraction) => {
    const [path] = getBezierPath(params(props.sourceNode, props.targetNode))

    // The hit area follows the floating path, as React's BaseEdge does.
    edgeInteraction(path)

    return flowBaseEdge(h, {
      path,
      markerEnd: props.markerEnd,
      attributes: edgePath(props),
    })
  }

const MarkerDataSchema = S.Struct({
  start: S.Literals(['circle', 'diamond']),
  end: S.Literals(['circle', 'diamond']),
  color: S.String,
  size: S.Finite,
})

const markerEdge =
  (scope: string): FoldkitEdgeRenderer =>
  (edge, { props }, h) => {
    const [path] = getBezierPath(props)
    const data = S.decodeUnknownSync(MarkerDataSchema)(edge.data)

    const marker = (end: 'start' | 'end', glyph: 'circle' | 'diamond') =>
      h.marker(
        [
          h.Id(`${scope}-${props.id}-${end}`),
          h.DataAttribute('testid', 'custom-marker'),
          h.ViewBox('0 0 10 10'),
          h.Attribute('refX', '5'),
          h.Attribute('refY', '5'),
          h.Attribute('markerWidth', String(data.size)),
          h.Attribute('markerHeight', String(data.size)),
          h.Attribute('markerUnits', 'userSpaceOnUse'),
          h.Attribute('orient', 'auto-start-reverse'),
        ],
        [
          glyph === 'circle'
            ? h.circle([h.Cx('5'), h.Cy('5'), h.R('4'), h.Fill(data.color)])
            : h.path([h.D('M 0 5 L 5 0 L 10 5 L 5 10 Z'), h.Fill(data.color)]),
        ]
      )

    return h.g(
      [],
      [
        h.defs([], [marker('start', data.start), marker('end', data.end)]),
        flowBaseEdge(h, {
          path,
          markerStart: `url(#${scope}-${props.id}-start)`,
          markerEnd: `url(#${scope}-${props.id}-end)`,
          attributes: { ...edgePath(props), stroke: data.color },
        }),
      ]
    )
  }

const previewSvg = (
  h: Parameters<FoldkitConnectionPreviewRenderer>[1],
  children: Parameters<typeof h.svg>[1]
) =>
  h.svg(
    [
      h.Attribute('width', '960'),
      h.Attribute('height', '640'),
      h.ViewBox('0 0 960 640'),
      h.Style({
        position: 'absolute',
        left: '0',
        top: '0',
        overflow: 'visible',
        pointerEvents: 'none',
      }),
    ],
    children
  )

/** Easy Connect's line: straight from the node to the pointer, with a cursor dot. */
const easyConnectionLine: FoldkitConnectionPreviewRenderer = (
  state,
  h,
  line
) => {
  const from = line === null ? state.from : { x: line.fromX, y: line.fromY }
  const to = line === null ? state.to : { x: line.toX, y: line.toY }

  const [path] = getStraightPath({
    sourceX: from.x,
    sourceY: from.y,
    targetX: to.x,
    targetY: to.y,
  })

  return previewSvg(h, [
    h.path([
      h.DataAttribute('testid', 'easy-connection-line'),
      h.D(path),
      h.Fill('none'),
      h.Stroke('#222'),
      h.StrokeWidth('2'),
    ]),
    h.circle([
      h.DataAttribute('testid', 'easy-connection-cursor'),
      h.Cx(String(to.x)),
      h.Cy(String(to.y)),
      h.R('3'),
      h.Fill('#fff'),
      h.Stroke('#222'),
    ]),
  ])
}

/** One line from every selected node's matching handle to the pointer. */
const multiConnectionLine =
  (state: RecipeState): FoldkitConnectionPreviewRenderer =>
  (_preview, h, line) => {
    if (line === null) {
      return previewSvg(h, [])
    }

    const origin = line.fromNode.id

    const ids = state.selected.has(origin)
      ? [...state.selected].toSorted()
      : [origin]

    return previewSvg(
      h,
      ids.flatMap((id) => {
        const from =
          state.handleCenters.get(`${id}:${line.fromHandle.id}`) ??
          (id === origin ? { x: line.fromX, y: line.fromY } : undefined)

        if (from === undefined) {
          return []
        }

        return [
          h.path([
            h.DataAttribute('testid', 'multi-connection-line'),
            h.DataAttribute('node-id', id),
            h.D(`M ${from.x} ${from.y} L ${line.toX} ${line.toY}`),
            h.Fill('none'),
            h.Stroke('#7c3aed'),
            h.StrokeWidth('2'),
          ]),
        ]
      })
    )
  }

export interface SceneDefinition {
  readonly document: unknown
  readonly registry: FoldkitRendererRegistry
  /** Nodes that accept connections (Foldkit's `createProgram` allow-list). */
  readonly allowedTargets: readonly string[]
  readonly defaultEdgeOptions?: {
    readonly type: string
    readonly markerEnd: 'arrowclosed'
  }
}

const floatingLayout = (type: string) => ({
  nodes: [
    node('target', 390, 236, [targetHandle]),
    node('s-top', 390, 40, [sourceHandle]),
    node('s-right', 700, 236, [sourceHandle]),
    node('s-bottom', 390, 420, [sourceHandle]),
    node('s-left', 80, 236, [sourceHandle]),
  ],
  edges: ['s-top', 's-right', 's-bottom', 's-left'].map((source, index) => ({
    id: `e-${index + 1}`,
    type,
    source,
    sourceHandle: 'out',
    target: 'target',
    targetHandle: 'in',
    markerEnd: 'arrowclosed',
  })),
})

const markerNodes = ['1', '2', '3', '4'].flatMap((row, index) => [
  node(`l${row}`, 80, 40 + index * 120, [sourceHandle]),
  node(`r${row}`, 600, 40 + index * 120, [targetHandle]),
])

const edgeBetween = (
  id: string,
  source: string,
  target: string,
  extra: {
    readonly type?: string
    readonly data?: Record<string, string | number>
    readonly markerStart?: 'arrow' | 'arrowclosed'
    readonly markerEnd?: 'arrow' | 'arrowclosed'
    readonly stroke?: string
  }
) => ({
  id,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
  path: 'bezier',
  ...extra,
})

const easyNode = (id: string, x: number, y: number) => ({
  id,
  label: id,
  type: 'easy',
  position: { x, y },
  size: { width: 150, height: 80 },
  // The target handle comes first so the source handle stacks on top. A drop
  // back on the node lands on its own source handle, which Flow rejects.
  handles: [
    { id: 'target', kind: 'target', side: 'left' },
    { id: 'source', kind: 'source', side: 'right' },
  ],
})

export const sceneDefinition = (
  scene: SceneName,
  state: RecipeState,
  options: { readonly reducedMotion: boolean; readonly markerScope: string }
): SceneDefinition => {
  switch (scene) {
    case 'button-edge': {
      return {
        document: {
          nodes: [
            node('a', 60, 80, [sourceHandle]),
            node('b', 360, 260, [targetHandle, sourceHandle]),
            node('c', 660, 80, [targetHandle]),
          ],
          edges: [
            { id: 'e-ab', type: 'button', source: 'a', target: 'b' },
            { id: 'e-bc', type: 'button', source: 'b', target: 'c' },
          ],
        },
        registry: { edgeTypes: { button: buttonEdge } },
        allowedTargets: [],
      }
    }

    case 'data-edge': {
      return {
        document: {
          nodes: [
            node('a', 80, 80, [sourceHandle], { data: { value: 'alpha' } }),
            node('b', 560, 300, [targetHandle]),
          ],
          edges: [
            {
              id: 'e-ab',
              type: 'data',
              source: 'a',
              target: 'b',
              data: { key: 'value' },
            },
          ],
        },
        registry: { edgeTypes: { data: dataEdge } },
        allowedTargets: [],
      }
    }

    case 'animated-svg-edge': {
      return {
        document: {
          nodes: [
            node('a', 80, 80, [sourceHandle]),
            node('b', 560, 300, [targetHandle]),
          ],
          edges: [
            {
              id: 'e-ab',
              type: 'animated-svg',
              source: 'a',
              target: 'b',
              data: { reducedMotion: options.reducedMotion },
            },
          ],
        },
        registry: { edgeTypes: { 'animated-svg': animatedSvgEdge } },
        allowedTargets: [],
      }
    }

    case 'floating-edges': {
      return {
        document: floatingLayout('floating'),
        registry: {
          edgeTypes: { floating: floatingEdge(getFloatingEdgeParams) },
        },
        allowedTargets: [],
      }
    }

    case 'simple-floating-edges': {
      return {
        document: floatingLayout('simple-floating'),
        registry: {
          edgeTypes: {
            'simple-floating': floatingEdge(getSimpleFloatingEdgeParams),
          },
        },
        allowedTargets: [],
      }
    }

    case 'easy-connect': {
      return {
        document: {
          nodes: [
            easyNode('n1', 80, 60),
            easyNode('n2', 560, 60),
            easyNode('n3', 80, 380),
            easyNode('n4', 560, 380),
          ],
          edges: [],
        },
        registry: {
          nodeTypes: {
            easy: (flowNode, h) =>
              h.div(
                [h.Class('easy-node-body')],
                [
                  h.div(
                    [
                      h.Class('easy-drag-strip'),
                      h.DataAttribute('testid', 'easy-drag-strip'),
                      h.DataAttribute('flow-drag-handle', ''),
                    ],
                    []
                  ),
                  h.span([h.Class('easy-node-label')], [flowNode.label]),
                ]
              ),
          },
          edgeTypes: { floating: floatingEdge(getFloatingEdgeParams) },
          connectionPreview: easyConnectionLine,
        },
        allowedTargets: ['n1', 'n2', 'n3', 'n4'],
        defaultEdgeOptions: { type: 'floating', markerEnd: 'arrowclosed' },
      }
    }

    case 'edge-markers': {
      return {
        document: {
          nodes: markerNodes,
          edges: [
            edgeBetween('mk-arrow', 'l1', 'r1', {
              markerEnd: 'arrow',
              stroke: '#2563eb',
            }),
            edgeBetween('mk-closed', 'l2', 'r2', {
              markerEnd: 'arrowclosed',
              stroke: '#16a34a',
            }),
            edgeBetween('mk-both', 'l3', 'r3', {
              markerStart: 'arrow',
              markerEnd: 'arrowclosed',
              stroke: '#f59e0b',
            }),
            edgeBetween('mk-custom', 'l4', 'r4', {
              type: 'marker',
              data: {
                start: 'circle',
                end: 'diamond',
                color: '#e11d48',
                size: 16,
              },
            }),
          ],
        },
        registry: { edgeTypes: { marker: markerEdge(options.markerScope) } },
        allowedTargets: [],
      }
    }

    case 'multi-connection-line': {
      return {
        document: {
          nodes: [
            node('s1', 80, 60, [sourceHandle], { selected: true }),
            node('s2', 80, 240, [sourceHandle], { selected: true }),
            node('s3', 80, 420, [sourceHandle]),
            node('t', 600, 240, [targetHandle]),
          ],
          edges: [],
        },
        registry: { connectionPreview: multiConnectionLine(state) },
        allowedTargets: ['t'],
      }
    }

    default: {
      const exhaustive: never = scene
      throw new Error(`Unknown scene ${String(exhaustive)}`)
    }
  }
}
