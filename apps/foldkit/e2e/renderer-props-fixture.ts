import { decodeFlowDocument, getBezierPath } from '@flow/core'
import type { Viewport } from '@flow/core'
import {
  HostAction,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type {
  FoldkitConnectionPreviewRenderer,
  FoldkitEdgeTypes,
  FoldkitNodeTypes,
} from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

const documentInput = {
  nodes: [
    {
      id: 'a',
      label: 'A',
      type: 'probe',
      position: { x: 40, y: 60 },
      zIndex: 2,
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 420, y: 240 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
    {
      id: 'c',
      label: 'C',
      type: 'legacy',
      position: { x: 420, y: 40 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'custom',
      type: 'probe',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      path: 'bezier',
      markerEnd: 'arrowclosed',
    },
    {
      id: 'builtin',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      path: 'bezier',
    },
    {
      id: 'legacy',
      type: 'legacy',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      path: 'bezier',
    },
  ],
}

const nodeTypes: FoldkitNodeTypes = {
  probe: (node, h, props) =>
    h.div(
      [
        h.DataAttribute('testid', `probe-node-${props.id}`),
        h.DataAttribute('selected', String(props.selected)),
        h.DataAttribute('dragging', String(props.dragging)),
        h.DataAttribute('x', String(props.positionAbsoluteX)),
        h.DataAttribute('y', String(props.positionAbsoluteY)),
        h.DataAttribute('connectable', String(props.isConnectable)),
        h.DataAttribute('z', String(props.zIndex)),
        h.DataAttribute('size', `${props.width}x${props.height}`),
      ],
      [node.label]
    ),
  // Written against the original contract: two arguments, no props.
  legacy: (node, h) =>
    h.div([h.DataAttribute('testid', `legacy-node-${node.id}`)], [node.label]),
}

const edgeTypes: FoldkitEdgeTypes = {
  probe: (_edge, { props }, h, edgeLabelRenderer) => {
    const [path] = getBezierPath(props)

    edgeLabelRenderer(
      h.div(
        [
          h.DataAttribute('testid', 'probe-edge-label'),
          h.DataAttribute('label-x', String(props.labelX)),
          h.DataAttribute('label-y', String(props.labelY)),
          h.Style({
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${props.labelX}px, ${props.labelY}px)`,
            background: '#fde68a',
            padding: '4px',
            pointerEvents: 'all',
          }),
        ],
        [`label ${props.id}`]
      )
    )

    return h.path([
      h.DataAttribute('testid', 'probe-edge-path'),
      h.DataAttribute('selected', String(props.selected)),
      h.DataAttribute(
        'target-node',
        `${props.targetNode.id}:${props.targetNode.width}`
      ),
      h.D(path),
      h.Fill('none'),
      h.Stroke('#0f766e'),
      h.StrokeWidth('2'),
      ...(props.markerEnd === undefined ? [] : [h.MarkerEnd(props.markerEnd)]),
    ])
  },
}

const legacyEdgeTypes: FoldkitEdgeTypes = {
  ...edgeTypes,
  // Written against the original contract: it draws the geometry path.
  legacy: (edge, geometry, h) =>
    h.path([
      h.DataAttribute('testid', `legacy-edge-${edge.id}`),
      h.D(geometry.path),
      h.Fill('none'),
      h.Stroke('#64748b'),
    ]),
}

const probePreview: FoldkitConnectionPreviewRenderer = (state, h, line) =>
  h.svg(
    [
      h.Attribute('width', '960'),
      h.Attribute('height', '640'),
      h.ViewBox('0 0 960 640'),
      h.Style({ overflow: 'visible', pointerEvents: 'none' }),
    ],
    [
      h.path([
        h.DataAttribute('testid', 'probe-preview'),
        h.DataAttribute(
          'from',
          line === null ? '' : `${line.fromNode.id}:${line.fromHandle.id}`
        ),
        h.DataAttribute(
          'positions',
          line === null ? '' : `${line.fromPosition}-${line.toPosition}`
        ),
        h.DataAttribute('to-node', line?.toNode?.id ?? ''),
        h.DataAttribute('line-type', line?.connectionLineType ?? ''),
        h.DataAttribute('status', line?.connectionStatus ?? 'none'),
        h.D(line?.path ?? `M ${state.from.x} ${state.from.y}`),
        h.Fill('none'),
        h.Stroke('#7c3aed'),
      ]),
    ]
  )

export interface FoldkitRendererPropsFixture {
  readonly setViewport: (viewport: Viewport) => void
}

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

export const mountFoldkitRendererPropsFixture = (
  container: HTMLElement,
  options: { readonly customPreview: boolean }
): FoldkitRendererPropsFixture => {
  let zoom = 1
  // Foldkit's embed replaces the container, so observe its parent.
  const owner = container.parentElement ?? container

  const active = Runtime.embed(
    createProgram(
      container,
      Effect.runSync(decodeFlowDocument(documentInput)),
      { x: 0, y: 0, zoom: 1 },
      ['b', 'c'],
      'uncontrolled',
      'uncontrolled',
      options.customPreview
        ? {
            nodeTypes,
            edgeTypes: legacyEdgeTypes,
            connectionLineType: 'step',
            connectionPreview: probePreview,
          }
        : {
            nodeTypes,
            edgeTypes: legacyEdgeTypes,
            connectionLineType: 'bezier',
          },
      undefined,
      'full',
      defaultInteractionOptions
    )
  )

  createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => zoom,
    onMeasure: (requests) =>
      send(active.ports.actions.send(HostAction.MeasureNodes({ requests }))),
  })

  return {
    setViewport: (viewport) => {
      ;({ zoom } = viewport)
      send(active.ports.actions.send(HostAction.ReplaceViewport({ viewport })))
    },
  }
}
