import {
  bezierEdgePath,
  applyDefaultEdgeOptions,
  edgeAttachmentPosition,
  inferHandleMeasurement,
  edgeLabelPosition,
  computeFlowStacking,
  flowSelectedElementZ,
  flowEdgeRendererProps,
  flowNodeBounds,
  flowNodeHandles,
  flowThemeValue,
  resolveFlowEdgeMarker,
  orderFlowEdges,
  sameFlowEdgeRendererProps,
  resolveEdgeHandles,
  smoothStepEdgePath,
  simpleBezierEdgePath,
  stepEdgePath,
  straightEdgePath,
} from '@flow/core'
import type {
  EdgeId,
  FlowDocument,
  FlowEdgeMarkerOption,
  FlowNode,
  FlowZIndexMode,
  ResolvedFlowEdgeMarker,
  FlowDefaultEdgeOptions,
  FlowEdgeRendererProps,
  FlowGraphView,
  HandleId,
  MeasuredHandle,
  MeasuredNode,
  NodeId,
  XYPosition,
  Viewport,
} from '@flow/core'
import { Effect, Exit, Scope } from 'effect'

import type {
  FlowEdgeRenderContext,
  FlowHostOptions,
  FlowEdgeRenderer,
  FlowEdgeRendererInstance,
} from './mount-flow.ts'
import {
  applyFlowClassName,
  applyFlowStyle,
  applyEdgeLabelPresentation,
} from './presentation.ts'

// Client rectangles use float coordinates after zoom. Normalize below CSS
// layout precision so translating a node cannot change its local handle offsets.
const localHandleCoordinate = (value: number): number =>
  Math.round(value * 1024) / 1024

export const measureNodeHandles = (
  node: FlowNode,
  element: HTMLElement,
  zoom: number
): readonly MeasuredHandle[] => {
  const nodeBounds = element.getBoundingClientRect()
  const handles = new Map<HandleId, MeasuredHandle>()

  for (const handleElement of element.querySelectorAll<HTMLElement>(
    '.flow-handle'
  )) {
    const handle = flowNodeHandles(node).find(
      (candidate) => candidate.id === handleElement.dataset.handleId
    )

    if (
      handle === undefined ||
      handleElement.closest('[data-testid="flow-node"]') !== element ||
      handleElement.getClientRects().length === 0
    ) {
      continue
    }

    const bounds = handleElement.getBoundingClientRect()

    handles.set(handle.id, {
      nodeId: node.id,
      handleId: handle.id,
      offset: {
        x: localHandleCoordinate(
          (bounds.left + bounds.width / 2 - nodeBounds.left) / zoom
        ),
        y: localHandleCoordinate(
          (bounds.top + bounds.height / 2 - nodeBounds.top) / zoom
        ),
      },
      width: bounds.width / zoom,
      height: bounds.height / zoom,
    })
  }

  return [...handles.values()]
}

const svgNamespace = 'http://www.w3.org/2000/svg'

/**
 * The path a custom edge is drawn along: the renderer's own
 * `interactionPath`, else the `createFlowBaseEdge` interaction path in its
 * visual. `undefined` keeps the handle route.
 */
const customInteraction = (
  instance: FlowEdgeRendererInstance,
  visual: SVGGElement,
  reportFailure: (label: string, error: Error) => void
): { readonly path: string; readonly width?: number } | undefined => {
  let returned: string | undefined

  try {
    returned = instance.interactionPath?.()
  } catch (error) {
    // A failing renderer callback keeps the handle route for this edge.
    reportFailure(
      'Edge interaction path',
      error instanceof Error ? error : new Error(String(error))
    )

    return undefined
  }

  if (returned !== undefined && returned.length > 0) {
    return { path: returned }
  }

  const drawn = visual.querySelector('.flow-edge-interaction')
  const path = drawn?.getAttribute('d')

  if (drawn === null || path === null || path === undefined || path === '') {
    return undefined
  }

  const width = Number(drawn.getAttribute('stroke-width'))

  return Number.isFinite(width) && width > 0 ? { path, width } : { path }
}

/** Canvas options the edge layer reads on every pass. */
export interface FlowEdgePresentationOptions {
  readonly zIndexMode: FlowZIndexMode | undefined
  readonly elevateEdgesOnSelect: boolean | undefined
  readonly defaultMarkerColor: string | undefined
  readonly edgesReconnectable: boolean | undefined
  readonly reconnectRadius: number | undefined
  readonly edgesFocusable: boolean | undefined
  readonly edgeDescriptionId: string | undefined
  readonly elementsSelectable: boolean
  readonly hasClickHandler: boolean
  readonly noPanClassName: string | undefined
}

/** Markers on edges without a stroke follow the themed edge stroke. */
const themedEdgeStroke = flowThemeValue('edge-stroke')

let nextMarkerScope = 0

interface EdgeElements {
  readonly anchorGroup: SVGGElement
  readonly group: SVGGElement
  readonly hit: SVGPathElement
  readonly path: SVGPathElement
  readonly visual: SVGGElement
  readonly sourceAnchor: SVGCircleElement
  readonly targetAnchor: SVGCircleElement
}

interface EdgeEntry {
  readonly elements: EdgeElements
  readonly scope: Scope.Closeable
  readonly type: string | undefined
  label: HTMLDivElement | undefined
  geometry:
    | {
        readonly edge: FlowDocument['edges'][number]
        readonly context: FlowEdgeRenderContext
      }
    | undefined
  state: 'owned' | 'retired'
  renderer:
    | { readonly kind: 'awaiting-factory' }
    | { readonly kind: 'default' }
    | { readonly kind: 'custom'; readonly instance: FlowEdgeRendererInstance }
}

type ReadyEdgeEntry = EdgeEntry & {
  renderer: Exclude<
    EdgeEntry['renderer'],
    { readonly kind: 'awaiting-factory' }
  >
}

type EdgeSlot =
  | { readonly kind: 'ready'; readonly entry: ReadyEdgeEntry }
  | {
      readonly kind: 'reserved'
      readonly entry: EdgeEntry
      readonly operation: 'geometry' | 'remove'
    }

type ExpectedEdgeSlot =
  | { readonly kind: 'absent' }
  | { readonly kind: 'present'; readonly slot: EdgeSlot }

type InitialEdgeReservation = Extract<
  EdgeSlot,
  { readonly kind: 'reserved' }
> & { readonly operation: 'geometry'; readonly old: undefined }

type EdgeSlotInstall =
  | {
      readonly expected: Extract<ExpectedEdgeSlot, { readonly kind: 'absent' }>
      readonly next: InitialEdgeReservation
    }
  | {
      readonly expected: Extract<ExpectedEdgeSlot, { readonly kind: 'present' }>
      readonly next: EdgeSlot
    }

type ProjectionDependency =
  | { readonly kind: 'node'; readonly id: NodeId }
  | { readonly kind: 'edge'; readonly id: EdgeId }
  | {
      readonly kind: 'graph' | 'visibility' | 'viewport' | 'toolbar' | 'minimap'
    }

interface Projection<Origin, NodeSlot, UIHandle> {
  readonly origin: Origin
  readonly graph: FlowGraphView
  readonly inputs: {
    readonly document: FlowDocument
    readonly measurements: ReadonlyMap<NodeId, MeasuredNode>
    readonly positions: ReadonlyMap<NodeId, XYPosition>
    readonly viewport: Viewport
    readonly pane: {
      readonly x: number
      readonly y: number
      readonly width: number
      readonly height: number
    }
    readonly renderOnlyVisible: boolean
    readonly nodeRenderers: ReadonlyMap<
      string,
      NonNullable<FlowHostOptions['nodeRenderers']>[string]
    >
    readonly edgeRenderers: ReadonlyMap<
      string,
      {
        readonly geometry: FlowEdgeRenderer['geometry']
        readonly render: FlowEdgeRenderer['render']
      }
    >
    readonly defaults: FlowDefaultEdgeOptions | undefined
    readonly ui: FlowHostOptions['ui']
    readonly uiHandle: UIHandle
  }
  readonly cohort: {
    readonly nodes: ReadonlyMap<NodeId, NodeSlot>
    readonly edges: ReadonlyMap<EdgeId, EdgeSlot>
  }
  readonly entryClaims: {
    readonly nodes: Map<NodeId, NodeSlot>
    readonly edges: Map<EdgeId, EdgeSlot>
  }
}

export const createEdgeRenderer = <Origin, NodeSlot, UIHandle>(
  viewport: HTMLElement,
  rendererScope: Scope.Scope,
  runEffect: <A>(effect: Effect.Effect<A>) => A,
  matches: (
    pass: Projection<Origin, NodeSlot, UIHandle>,
    dependency: ProjectionDependency
  ) => boolean,
  hostClosing: () => boolean,
  cleanupFailures: unknown[],
  reportCallbackFailure: (label: string, error: Error) => void,
  presentation: () => FlowEdgePresentationOptions
) => {
  nextMarkerScope += 1
  const markerScope = nextMarkerScope
  const layer = globalThis.document.createElementNS(svgNamespace, 'svg')
  layer.classList.add('flow-edges')
  layer.dataset.testid = 'flow-edges'
  const definitions = globalThis.document.createElementNS(svgNamespace, 'defs')
  const pathLayer = globalThis.document.createElementNS(svgNamespace, 'g')
  const labelLayer = globalThis.document.createElement('div')
  labelLayer.classList.add('flow-edge-labels')
  labelLayer.setAttribute('aria-hidden', 'true')
  layer.append(definitions, pathLayer)
  viewport.append(layer)

  // The props each custom edge renderer last received, to skip unchanged frames.
  const sentProps = new WeakMap<EdgeEntry, FlowEdgeRendererProps>()

  const edgeLabelRenderer = globalThis.document.createElement('div')
  edgeLabelRenderer.classList.add('flow-edge-label-renderer')
  edgeLabelRenderer.dataset.testid = 'flow-edge-label-renderer'
  viewport.append(edgeLabelRenderer)

  // The label layer is a live element, so it is non-enumerable: the rest of
  // the render context stays plain data that callers can clone or serialize.
  const withEdgeLabelRenderer = (
    context: Omit<FlowEdgeRenderContext, 'edgeLabelRenderer'>
  ): FlowEdgeRenderContext =>
    // SAFETY: defineProperty adds the one omitted field, completing the context.
    Object.defineProperty({ ...context }, 'edgeLabelRenderer', {
      value: edgeLabelRenderer,
      enumerable: false,
    }) as FlowEdgeRenderContext

  const anchorLayer = globalThis.document.createElementNS(svgNamespace, 'svg')
  anchorLayer.classList.add('flow-edge-anchor-layer')
  anchorLayer.dataset.testid = 'flow-edge-anchor-layer'
  viewport.append(anchorLayer)
  viewport.append(labelLayer)

  const slots = new Map<EdgeId, EdgeSlot>()
  let closed = false

  const installReservation = (
    id: EdgeId,
    transition: EdgeSlotInstall,
    pass: Projection<Origin, NodeSlot, UIHandle>
  ): boolean => {
    if (closed || hostClosing()) {
      return false
    }

    const slotMatches =
      transition.expected.kind === 'absent'
        ? !slots.has(id)
        : slots.get(id) === transition.expected.slot

    if (!slotMatches) {
      return false
    }

    slots.set(id, transition.next)
    pass.entryClaims.edges.set(id, transition.next)

    return true
  }

  const reserveGeometry = (
    id: EdgeId,
    expected: EdgeSlot | undefined,
    entry: EdgeEntry,
    pass: Projection<Origin, NodeSlot, UIHandle>
  ): Extract<EdgeSlot, { readonly kind: 'reserved' }> | undefined => {
    if (expected === undefined) {
      const initial: InitialEdgeReservation = {
        kind: 'reserved',
        operation: 'geometry',
        old: undefined,
        entry,
      }

      return installReservation(
        id,
        {
          expected: { kind: 'absent' },
          next: initial,
        },
        pass
      )
        ? initial
        : undefined
    }

    const present: Extract<EdgeSlot, { readonly kind: 'reserved' }> = {
      kind: 'reserved',
      operation: 'geometry',
      entry,
    }

    return installReservation(
      id,
      {
        expected: { kind: 'present', slot: expected },
        next: present,
      },
      pass
    )
      ? present
      : undefined
  }

  const closeEntry = (entry: EdgeEntry): void => {
    if (entry.state === 'retired') {
      return
    }

    entry.state = 'retired'

    try {
      runEffect(Scope.close(entry.scope, Exit.void))
    } finally {
      entry.elements.group.remove()
      entry.elements.anchorGroup.remove()
      entry.label?.remove()
    }
  }

  const markers = new Map<string, SVGMarkerElement>()
  let visibleEdgeIds: ReadonlySet<EdgeId> | null = null
  let orderedEdges: readonly FlowDocument['edges'][number][] = []
  let edgeZ: ReadonlyMap<EdgeId, number> = new Map()
  let edgeById = new Map<EdgeId, FlowDocument['edges'][number]>()
  let incidentEdges = new Map<NodeId, Set<EdgeId>>()
  let previousPositions = new Map<NodeId, XYPosition>()

  /** React `MarkerDefinitions`: one `<marker>` per resolved configuration. */
  const ensureMarker = (resolved: ResolvedFlowEdgeMarker): string => {
    const { id } = resolved

    if (!markers.has(id)) {
      const marker = globalThis.document.createElementNS(svgNamespace, 'marker')
      const color = resolved.color ?? themedEdgeStroke

      marker.id = id
      marker.dataset.markerType = resolved.type
      marker.setAttribute('markerWidth', String(resolved.width))
      marker.setAttribute('markerHeight', String(resolved.height))
      marker.setAttribute('viewBox', '-10 -10 20 20')
      marker.setAttribute('markerUnits', resolved.markerUnits)
      marker.setAttribute('orient', resolved.orient)
      marker.setAttribute('refX', '0')
      marker.setAttribute('refY', '0')

      const arrow = globalThis.document.createElementNS(
        svgNamespace,
        'polyline'
      )

      arrow.setAttribute(
        'points',
        resolved.type === 'arrow' ? '-5,-4 0,0 -5,4' : '-5,-4 0,0 -5,4 -5,-4'
      )
      const fill = resolved.type === 'arrow' ? 'none' : color

      // A themed `var(...)` color only resolves in CSS, not in attributes.
      if (color.startsWith('var(')) {
        arrow.style.stroke = color
        arrow.style.fill = fill
      } else {
        arrow.setAttribute('stroke', color)
        arrow.setAttribute('fill', fill)
      }

      arrow.setAttribute('stroke-width', String(resolved.strokeWidth))
      arrow.setAttribute('stroke-linecap', 'round')
      arrow.setAttribute('stroke-linejoin', 'round')
      marker.append(arrow)
      definitions.append(marker)
      markers.set(id, marker)
    }

    return id
  }

  const allocateEntry = (edge: FlowDocument['edges'][number]): EdgeEntry => {
    const group = globalThis.document.createElementNS(svgNamespace, 'g')
    group.classList.add('flow-edge-group')
    group.dataset.edgeId = edge.id
    group.dataset.testid = 'flow-edge-group'

    const anchorGroup = globalThis.document.createElementNS(svgNamespace, 'g')

    anchorGroup.classList.add('flow-edge-anchor-group')
    anchorGroup.dataset.edgeId = edge.id

    const path = globalThis.document.createElementNS(svgNamespace, 'path')
    path.classList.add('flow-edge-path')
    path.dataset.edgeId = edge.id
    path.dataset.testid = 'flow-edge-path'

    const hit = globalThis.document.createElementNS(svgNamespace, 'path')
    hit.classList.add('flow-edge-hit')
    hit.dataset.testid = 'flow-edge-hit'

    const visual = globalThis.document.createElementNS(svgNamespace, 'g')
    visual.classList.add('flow-edge-custom-visual')
    visual.setAttribute('aria-hidden', 'true')
    visual.setAttribute('pointer-events', 'none')

    const sourceAnchor = globalThis.document.createElementNS(
      svgNamespace,
      'circle'
    )

    sourceAnchor.classList.add('flow-edge-reconnect-anchor')
    sourceAnchor.dataset.endpoint = 'source'
    sourceAnchor.dataset.testid = 'flow-edge-reconnect-anchor'
    sourceAnchor.setAttribute('r', String(presentation().reconnectRadius ?? 8))

    const targetAnchor = globalThis.document.createElementNS(
      svgNamespace,
      'circle'
    )

    targetAnchor.classList.add('flow-edge-reconnect-anchor')
    targetAnchor.dataset.endpoint = 'target'
    targetAnchor.dataset.testid = 'flow-edge-reconnect-anchor'
    targetAnchor.setAttribute('r', String(presentation().reconnectRadius ?? 8))

    group.append(path, hit, visual)
    anchorGroup.append(sourceAnchor, targetAnchor)

    const elements: EdgeElements = {
      anchorGroup,
      group,
      hit,
      path,
      visual,
      sourceAnchor,
      targetAnchor,
    }

    const scope = runEffect(Scope.fork(rendererScope, 'sequential'))

    return {
      elements,
      scope,
      type: edge.type,
      label: undefined,
      geometry: undefined,
      state: 'owned',
      renderer: { kind: 'awaiting-factory' },
    }
  }

  // eslint-disable-next-line complexity
  const reconcile = (
    pass: Projection<Origin, NodeSlot, UIHandle>,
    onlyEdges?: ReadonlySet<EdgeId>,
    projectionOnly = false
  ) => {
    if (closed || hostClosing()) {
      return { added: 0, updated: 0, removed: 0, deferred: 0 }
    }

    const { document, measurements } = pass.inputs
    const { graph } = pass
    const passCurrent = (): boolean => matches(pass, { kind: 'visibility' })

    const visible = new Set<EdgeId>()
    const visibleLabels = new Set<EdgeId>()
    const visibleMarkers = new Set<string>()
    let added = 0
    let updated = 0
    let removed = 0
    let deferred = 0
    let previousGroup: SVGGElement | null = null

    if (onlyEdges === undefined && !projectionOnly) {
      previousPositions = new Map(
        [...graph.nodes].map(([id, node]) => [id, { ...node.absolutePosition }])
      )

      const withDefaults = document.edges.map((edge) =>
        applyDefaultEdgeOptions(edge, pass.inputs.defaults)
      )

      const canvasPresentation = presentation()

      // One SVG layer: edges paint in `computeFlowStacking` order within it.
      edgeZ = computeFlowStacking({
        nodes: document.nodes,
        edges: withDefaults,
        zIndexMode: canvasPresentation.zIndexMode ?? 'basic',
        elevateEdgesOnSelect: canvasPresentation.elevateEdgesOnSelect ?? false,
      }).edges

      // Vanilla still raises a selected edge within the edge layer.
      const layerZ = (edge: FlowDocument['edges'][number]): number =>
        (edgeZ.get(edge.id) ?? 0) +
        (edge.selected === true &&
        canvasPresentation.elevateEdgesOnSelect !== true &&
        canvasPresentation.zIndexMode !== 'manual'
          ? flowSelectedElementZ
          : 0)

      orderedEdges = orderFlowEdges(withDefaults)
        .map((edge, index) => ({ edge, index }))
        .toSorted(
          (first, second) =>
            layerZ(first.edge) - layerZ(second.edge) ||
            first.index - second.index
        )
        .map(({ edge }) => edge)
      edgeById = new Map(orderedEdges.map((edge) => [edge.id, edge]))
      incidentEdges = new Map()

      for (const edge of orderedEdges) {
        for (const nodeId of new Set([edge.source, edge.target])) {
          const incident = incidentEdges.get(nodeId) ?? new Set<EdgeId>()
          incident.add(edge.id)
          incidentEdges.set(nodeId, incident)
        }
      }
    }

    const edgesToPaint =
      onlyEdges === undefined
        ? orderedEdges
        : orderedEdges.filter(
            (edge) => onlyEdges.has(edge.id) && edgeById.has(edge.id)
          )

    for (const edge of edgesToPaint) {
      if (
        edge.hidden === true ||
        (visibleEdgeIds !== null && !visibleEdgeIds.has(edge.id))
      ) {
        continue
      }

      const resolved = resolveEdgeHandles(document, edge)

      const sourceGraphNode =
        resolved && graph.nodes.get(resolved.sourceNode.id)

      const targetGraphNode =
        resolved && graph.nodes.get(resolved.targetNode.id)

      if (
        sourceGraphNode?.hidden === true ||
        targetGraphNode?.hidden === true
      ) {
        continue
      }

      const sourceMeasured = resolved
        ? (measurements
            .get(resolved.sourceNode.id)
            ?.handles?.find(
              ({ handleId }) => handleId === resolved.sourceHandle.id
            ) ??
          (sourceGraphNode === undefined
            ? undefined
            : inferHandleMeasurement(
                resolved.sourceNode.id,
                resolved.sourceHandle,
                sourceGraphNode.dimensions
              )))
        : undefined

      const targetMeasured = resolved
        ? (measurements
            .get(resolved.targetNode.id)
            ?.handles?.find(
              ({ handleId }) => handleId === resolved.targetHandle.id
            ) ??
          (targetGraphNode === undefined
            ? undefined
            : inferHandleMeasurement(
                resolved.targetNode.id,
                resolved.targetHandle,
                targetGraphNode.dimensions
              )))
        : undefined

      if (
        resolved === undefined ||
        sourceGraphNode === undefined ||
        targetGraphNode === undefined ||
        sourceMeasured === undefined ||
        targetMeasured === undefined
      ) {
        deferred += 1

        continue
      }

      const source = edgeAttachmentPosition(
        sourceGraphNode.absolutePosition,
        resolved.sourceHandle,
        sourceMeasured
      )

      const target = edgeAttachmentPosition(
        targetGraphNode.absolutePosition,
        resolved.targetHandle,
        targetMeasured
      )

      let pathData = straightEdgePath(source, target)

      if (edge.path === 'bezier') {
        pathData = bezierEdgePath(
          source,
          target,
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        )
      } else if (edge.path === 'simplebezier') {
        pathData = simpleBezierEdgePath(
          source,
          target,
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        )
      } else if (edge.path === 'step') {
        pathData = stepEdgePath(
          source,
          target,
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        )
      } else if (edge.path === 'smoothstep') {
        pathData = smoothStepEdgePath(
          source,
          target,
          resolved.sourceHandle.side,
          resolved.targetHandle.side
        )
      }

      const registeredRenderer =
        edge.type === undefined
          ? undefined
          : pass.inputs.edgeRenderers.get(edge.type)

      const endpoints = {
        source,
        target,
        sourceSide: resolved.sourceHandle.side,
        targetSide: resolved.targetHandle.side,
      }

      const expected = pass.entryClaims.edges.get(edge.id)

      if (slots.get(edge.id) !== expected) {
        return { added, updated, removed, deferred }
      }

      if (
        projectionOnly &&
        (expected === undefined ||
          expected.entry.renderer.kind === 'awaiting-factory' ||
          expected.entry.state !== 'owned')
      ) {
        continue
      }

      const reusable =
        expected !== undefined &&
        expected.entry.type === edge.type &&
        expected.entry.renderer.kind !== 'awaiting-factory' &&
        (expected.kind === 'ready' || projectionOnly)

      const entry = reusable ? expected.entry : allocateEntry(edge)

      const reservation = projectionOnly
        ? expected
        : reserveGeometry(edge.id, expected, entry, pass)

      if (reservation === undefined) {
        if (!reusable) {
          closeEntry(entry)
        }

        return { added, updated, removed, deferred }
      }

      // eslint-disable-next-line no-loop-func -- This immediate entitlement check intentionally reads current host admission and exact slot identity.
      const owns = (): boolean =>
        !closed &&
        !hostClosing() &&
        slots.get(edge.id) === reservation &&
        entry.state === 'owned' &&
        matches(pass, { kind: 'edge', id: edge.id })

      const discardCalculation = (): void => {
        if (!reusable) {
          if (slots.get(edge.id) === reservation) {
            slots.delete(edge.id)
            pass.entryClaims.edges.delete(edge.id)
          }

          closeEntry(entry)
        } else if (
          !projectionOnly &&
          slots.get(edge.id) === reservation &&
          expected !== undefined
        ) {
          installReservation(
            edge.id,
            {
              expected: { kind: 'present', slot: reservation },
              next: expected,
            },
            pass
          )
        }
      }

      try {
        if (expected !== undefined && expected.entry !== entry) {
          closeEntry(expected.entry)
        }

        if (!owns()) {
          discardCalculation()

          return { added, updated, removed, deferred }
        }

        const completed =
          expected?.kind === 'ready' ? entry.geometry : undefined

        const retainedGeometry =
          completed?.edge === edge &&
          completed.context.source.x === source.x &&
          completed.context.source.y === source.y &&
          completed.context.target.x === target.x &&
          completed.context.target.y === target.y &&
          completed.context.sourceSide === endpoints.sourceSide &&
          completed.context.targetSide === endpoints.targetSide
            ? completed.context
            : undefined

        const customGeometry = projectionOnly
          ? retainedGeometry
          : registeredRenderer?.geometry?.(edge, endpoints)

        if (!owns()) {
          discardCalculation()

          return { added, updated, removed, deferred }
        }

        if (customGeometry !== undefined) {
          ;({ pathData } = customGeometry)
        }

        const canvasPresentation = presentation()

        const markerUrl = (marker: FlowEdgeMarkerOption | undefined) => {
          const resolvedMarker = resolveFlowEdgeMarker(marker, {
            scope: String(markerScope),
            // Without either, the marker follows the themed edge stroke.
            defaultColor: edge.stroke ?? canvasPresentation.defaultMarkerColor,
          })

          if (resolvedMarker === undefined) {
            return
          }

          const markerId = ensureMarker(resolvedMarker)
          visibleMarkers.add(markerId)

          return `url(#${markerId})`
        }

        const markerStart = markerUrl(edge.markerStart)
        const markerEnd = markerUrl(edge.markerEnd)

        const labelAnchor =
          customGeometry?.labelAnchor ??
          edgeLabelPosition(
            source,
            target,
            edge.path ?? 'straight',
            resolved.sourceHandle.side,
            resolved.targetHandle.side
          )

        const context = withEdgeLabelRenderer({
          props: flowEdgeRendererProps({
            edge,
            source,
            target,
            sourcePosition: resolved.sourceHandle.side,
            targetPosition: resolved.targetHandle.side,
            sourceHandleId: resolved.sourceHandle.id,
            targetHandleId: resolved.targetHandle.id,
            sourceNode: flowNodeBounds(sourceGraphNode),
            targetNode: flowNodeBounds(targetGraphNode),
            markerStart,
            markerEnd,
            defaultInteractionWidth: 20,
            labelPosition: labelAnchor,
          }),
          ...endpoints,
          pathData,
          labelAnchor,
        })

        const { path, visual } = entry.elements

        if (entry.renderer.kind === 'awaiting-factory') {
          const instance = registeredRenderer?.render?.(edge, context, visual)

          if (instance === undefined) {
            entry.renderer = { kind: 'default' }
          } else {
            sentProps.set(entry, context.props)
            runEffect(
              Scope.addFinalizer(
                entry.scope,
                Effect.sync(() => {
                  try {
                    instance.destroy()
                  } catch (error) {
                    if (hostClosing()) {
                      cleanupFailures.push(error)
                    } else {
                      throw error
                    }
                  }
                })
              )
            )
            entry.renderer = { kind: 'custom', instance }
          }

          added += 1
        } else if (entry.renderer.kind === 'custom') {
          const { instance } = entry.renderer
          const positionOnly = projectionOnly || onlyEdges !== undefined

          if (positionOnly && instance.updateProps !== undefined) {
            // Opted-in renderers get per-frame props instead of `update`.
            if (
              !sameFlowEdgeRendererProps(sentProps.get(entry), context.props)
            ) {
              sentProps.set(entry, context.props)
              instance.updateProps(context.props, context)
              updated += 1
            }
          } else if (!projectionOnly) {
            sentProps.set(entry, context.props)
            instance.update(edge, context)
            updated += 1
          }
        }

        if (!owns()) {
          discardCalculation()

          return { added, updated, removed, deferred }
        }

        if (entry.renderer.kind === 'custom') {
          path.setAttribute('display', 'none')
        } else {
          path.removeAttribute('display')
        }

        const { anchorGroup, group, hit, sourceAnchor, targetAnchor } =
          entry.elements

        const interaction =
          entry.renderer.kind === 'custom'
            ? customInteraction(
                entry.renderer.instance,
                visual,
                reportCallbackFailure
              )
            : undefined

        path.setAttribute('d', pathData)
        hit.setAttribute('d', interaction?.path ?? pathData)
        hit.setAttribute(
          'stroke-width',
          String(edge.interactionWidth ?? interaction?.width ?? 20)
        )
        sourceAnchor.setAttribute('cx', String(source.x))
        sourceAnchor.setAttribute('cy', String(source.y))
        targetAnchor.setAttribute('cx', String(target.x))
        targetAnchor.setAttribute('cy', String(target.y))
        group.classList.toggle('selected', edge.selected === true)
        anchorGroup.classList.toggle(
          'selected',
          edge.selected === true &&
            (edge.reconnectable ?? canvasPresentation.edgesReconnectable) !==
              false
        )
        sourceAnchor.classList.toggle(
          'available',
          (edge.reconnectable ?? canvasPresentation.edgesReconnectable) !==
            false && edge.reconnectable !== 'target'
        )
        targetAnchor.classList.toggle(
          'available',
          (edge.reconnectable ?? canvasPresentation.edgesReconnectable) !==
            false && edge.reconnectable !== 'source'
        )
        group.setAttribute(
          'tabindex',
          (edge.focusable ?? canvasPresentation.edgesFocusable) === false
            ? '-1'
            : '0'
        )
        applyFlowClassName(group, edge.className)
        group.classList.toggle('animated', edge.animated === true)

        const selectable =
          edge.selectable ?? canvasPresentation.elementsSelectable

        const userClasses = new Set(edge.className?.split(/\s+/u))

        group.classList.toggle(
          'selectable',
          selectable || userClasses.has('selectable')
        )
        group.classList.toggle(
          'inactive',
          (!selectable && !canvasPresentation.hasClickHandler) ||
            userClasses.has('inactive')
        )

        if (canvasPresentation.noPanClassName !== '') {
          group.classList.add(canvasPresentation.noPanClassName ?? 'nopan')
        }

        group.dataset.zIndex = String(edgeZ.get(edge.id) ?? 0)

        if (canvasPresentation.edgeDescriptionId === undefined) {
          group.removeAttribute('aria-describedby')
        } else {
          group.setAttribute(
            'aria-describedby',
            canvasPresentation.edgeDescriptionId
          )
        }

        group.setAttribute('role', edge.selectable === false ? 'img' : 'button')
        group.setAttribute('aria-roledescription', 'edge')

        if (edge.selectable === false) {
          group.removeAttribute('aria-pressed')
        } else {
          group.setAttribute('aria-pressed', String(edge.selected === true))
        }

        group.setAttribute(
          'aria-label',
          edge.ariaLabel ??
            `Edge from ${resolved.sourceNode.label} to ${resolved.targetNode.label}`
        )

        // Without an edge stroke, CSS paints the themed `edge-stroke`.
        if (edge.stroke === undefined) {
          path.removeAttribute('stroke')
        } else {
          path.setAttribute('stroke', edge.stroke)
        }

        path.setAttribute('stroke-width', String(edge.strokeWidth ?? 2))
        // React spreads `style` over the default stroke on the edge path.
        applyFlowStyle(path, edge.style)

        for (const [attribute, url] of [
          ['marker-start', markerStart],
          ['marker-end', markerEnd],
        ] as const) {
          if (url === undefined) {
            path.removeAttribute(attribute)
          } else {
            path.setAttribute(attribute, url)
          }
        }

        if (onlyEdges === undefined) {
          const nextGroup: Element | null =
            previousGroup === null
              ? pathLayer.firstElementChild
              : previousGroup.nextElementSibling

          if (nextGroup !== group) {
            if (nextGroup === null) {
              pathLayer.append(group)
            } else {
              nextGroup.before(group)
            }
          }

          previousGroup = group
          anchorLayer.append(anchorGroup)
        }

        visible.add(edge.id)

        if (edge.label !== undefined && edge.label.length > 0) {
          const position = context.labelAnchor

          let { label } = entry

          if (label === undefined) {
            label = globalThis.document.createElement('div')
            label.classList.add('flow-edge-label')
            label.dataset.edgeId = edge.id
            label.dataset.testid = 'flow-edge-label'
            entry.label = label
          }

          applyEdgeLabelPresentation(label, edge)
          label.setAttribute('x', String(position.x))
          label.setAttribute('y', String(position.y))
          label.style.left = `${position.x}px`
          label.style.top = `${position.y}px`

          if (onlyEdges === undefined || label.parentElement === null) {
            labelLayer.append(label)
          }

          visibleLabels.add(edge.id)
        } else {
          entry.label?.remove()
          entry.label = undefined
        }

        if (!projectionOnly && slots.get(edge.id) === reservation) {
          entry.geometry = { edge, context }

          const ready: ReadyEdgeEntry = Object.assign(entry, {
            renderer: entry.renderer,
          })

          installReservation(
            edge.id,
            {
              expected: { kind: 'present', slot: reservation },
              next: { kind: 'ready', entry: ready },
            },
            pass
          )
        }
      } catch (error) {
        const primaryError = error

        if (slots.get(edge.id) === reservation) {
          slots.delete(edge.id)
          pass.entryClaims.edges.delete(edge.id)
        }

        try {
          closeEntry(entry)
        } catch (cleanupError) {
          // eslint-disable-next-line preserve-caught-error -- Preserve the primary geometry or renderer error and retain the caught cleanup error in errors[1].
          throw new AggregateError(
            [primaryError, cleanupError],
            'Edge rendering and cleanup failed',
            { cause: primaryError }
          )
        }

        throw error
      }
    }

    if (onlyEdges === undefined && !projectionOnly) {
      for (const [edgeId, slot] of pass.cohort.edges) {
        if (visible.has(edgeId)) {
          continue
        }

        const reservation: Extract<EdgeSlot, { kind: 'reserved' }> = {
          kind: 'reserved',
          entry: slot.entry,
          operation: 'remove',
        }

        if (
          !installReservation(
            edgeId,
            {
              expected: { kind: 'present', slot },
              next: reservation,
            },
            pass
          )
        ) {
          continue
        }

        try {
          closeEntry(slot.entry)
        } finally {
          if (slots.get(edgeId) === reservation) {
            slots.delete(edgeId)
            pass.entryClaims.edges.delete(edgeId)
          }
        }

        removed += 1

        if (!passCurrent()) {
          return { added, updated, removed, deferred }
        }
      }
    }

    if (onlyEdges === undefined) {
      for (const [markerId, marker] of markers) {
        if (visibleMarkers.has(markerId)) {
          continue
        }

        marker.remove()
        markers.delete(markerId)
      }
    }

    return { added, updated, removed, deferred }
  }

  const updatePositions = (
    pass: Projection<Origin, NodeSlot, UIHandle>,
    movedNodeIds: ReadonlySet<NodeId>
  ) => {
    const { graph } = pass
    const changed = new Set<NodeId>()

    for (const [nodeId, node] of graph.nodes) {
      const previous = previousPositions.get(nodeId)
      const next = node.absolutePosition

      if (
        movedNodeIds.has(nodeId) ||
        (previous !== undefined &&
          (previous.x !== next.x || previous.y !== next.y))
      ) {
        changed.add(nodeId)
      }

      previousPositions.set(nodeId, next)
    }

    const affected = new Set<EdgeId>()

    for (const nodeId of changed) {
      for (const edgeId of incidentEdges.get(nodeId) ?? []) {
        affected.add(edgeId)
      }
    }

    return affected.size === 0
      ? { added: 0, updated: 0, removed: 0, deferred: 0 }
      : reconcile(pass, affected)
  }

  return {
    captureEntryCohort: (): ReadonlyMap<EdgeId, EdgeSlot> => new Map(slots),
    setVisibleEdges: (edgeIds: ReadonlySet<EdgeId> | null): void => {
      visibleEdgeIds = edgeIds
    },
    reconcile,
    updatePositions,
    destroy: (): void => {
      previousPositions.clear()

      closed = true
      const captured = [...slots.values()]
      slots.clear()

      for (const slot of captured) {
        closeEntry(slot.entry)
      }

      markers.clear()
      layer.remove()
      anchorLayer.remove()
      labelLayer.remove()
      edgeLabelRenderer.remove()
    },
  }
}
