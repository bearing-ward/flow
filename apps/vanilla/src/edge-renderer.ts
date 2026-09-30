import {
  bezierEdgePath,
  applyDefaultEdgeOptions,
  createFlowGraph,
  edgeAttachmentPosition,
  edgeLabelPosition,
  orderFlowEdges,
  resolveEdgeHandles,
  smoothStepEdgePath,
  simpleBezierEdgePath,
  stepEdgePath,
  straightEdgePath,
} from '@flow/core'
import type {
  EdgeId,
  FlowDocument,
  FlowEdgeMarker,
  FlowNode,
  FlowDefaultEdgeOptions,
  FlowGraphView,
  HandleId,
  MeasuredHandle,
  NodeId,
  XYPosition,
} from '@flow/core'

import type {
  FlowEdgeRenderContext,
  FlowEdgeRenderer,
  FlowEdgeRendererInstance,
} from './mount-flow.ts'

const svgNamespace = 'http://www.w3.org/2000/svg'

const defaultStroke = '#64748b'

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

export const createEdgeRenderer = (
  viewport: HTMLElement,
  renderers: Readonly<Record<string, FlowEdgeRenderer>> = {},
  defaultEdgeOptions?: FlowDefaultEdgeOptions
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

  const anchorLayer = globalThis.document.createElementNS(svgNamespace, 'svg')
  anchorLayer.classList.add('flow-edge-anchor-layer')
  anchorLayer.dataset.testid = 'flow-edge-anchor-layer'
  viewport.append(anchorLayer)
  viewport.append(labelLayer)

  const measurements = new Map<NodeId, Map<HandleId, MeasuredHandle>>()
  const edges = new Map<EdgeId, EdgeElements>()
  const labels = new Map<EdgeId, HTMLDivElement>()

  const customRenderers = new Map<
    EdgeId,
    { readonly type: string; readonly renderer: FlowEdgeRendererInstance }
  >()

  const markers = new Map<string, SVGMarkerElement>()
  let visibleEdgeIds: ReadonlySet<EdgeId> | null = null
  let orderedEdges: readonly FlowDocument['edges'][number][] = []
  let edgeById = new Map<EdgeId, FlowDocument['edges'][number]>()
  let incidentEdges = new Map<NodeId, Set<EdgeId>>()
  let previousPositions = new Map<NodeId, XYPosition>()

  const ensureMarker = (kind: FlowEdgeMarker, color: string): string => {
    const id = `flow-marker-${markerScope}-${kind}-${color.slice(1).toLowerCase()}`

    if (!markers.has(id)) {
      const marker = globalThis.document.createElementNS(svgNamespace, 'marker')

      marker.id = id
      marker.setAttribute('markerWidth', '12.5')
      marker.setAttribute('markerHeight', '12.5')
      marker.setAttribute('viewBox', '-10 -10 20 20')
      marker.setAttribute('markerUnits', 'strokeWidth')
      marker.setAttribute('orient', 'auto-start-reverse')
      marker.setAttribute('refX', '0')
      marker.setAttribute('refY', '0')

      const arrow = globalThis.document.createElementNS(
        svgNamespace,
        'polyline'
      )

      arrow.setAttribute(
        'points',
        kind === 'arrow' ? '-5,-4 0,0 -5,4' : '-5,-4 0,0 -5,4 -5,-4'
      )
      arrow.setAttribute('stroke', color)
      arrow.setAttribute('fill', kind === 'arrow' ? 'none' : color)
      arrow.setAttribute('stroke-linecap', 'round')
      arrow.setAttribute('stroke-linejoin', 'round')
      marker.append(arrow)
      definitions.append(marker)
      markers.set(id, marker)
    }

    return id
  }

  const measureNode = (
    node: FlowNode,
    element: HTMLElement,
    zoom: number
  ): void => {
    const nodeBounds = element.getBoundingClientRect()
    const handles = new Map<HandleId, MeasuredHandle>()

    for (const handleElement of element.querySelectorAll<HTMLElement>(
      '.flow-handle'
    )) {
      const handle = node.handles?.find(
        (candidate) => candidate.id === handleElement.dataset.handleId
      )

      if (handle === undefined) {
        continue
      }

      const bounds = handleElement.getBoundingClientRect()

      handles.set(handle.id, {
        nodeId: node.id,
        handleId: handle.id,
        offset: {
          x: (bounds.left + bounds.width / 2 - nodeBounds.left) / zoom,
          y: (bounds.top + bounds.height / 2 - nodeBounds.top) / zoom,
        },
        width: bounds.width / zoom,
        height: bounds.height / zoom,
      })
    }

    measurements.set(node.id, handles)
  }

  // Reconciliation covers element reuse, visibility, path variants, and SVG decorations.
  // eslint-disable-next-line complexity
  const reconcile = (
    document: FlowDocument,
    renderedPositions: ReadonlyMap<NodeId, XYPosition>,
    suppliedGraph?: FlowGraphView,
    onlyEdges?: ReadonlySet<EdgeId>
  ) => {
    const visible = new Set<EdgeId>()
    const visibleLabels = new Set<EdgeId>()
    const visibleMarkers = new Set<string>()
    let added = 0
    let updated = 0
    let removed = 0
    let deferred = 0
    let previousGroup: SVGGElement | null = null

    const graph =
      suppliedGraph ?? createFlowGraph(document, new Map(), renderedPositions)

    if (suppliedGraph === undefined) {
      previousPositions = new Map(
        [...graph.nodes].map(([nodeId, node]) => [
          nodeId,
          node.absolutePosition,
        ])
      )
      orderedEdges = orderFlowEdges(
        document.edges.map((edge) =>
          applyDefaultEdgeOptions(edge, defaultEdgeOptions)
        )
      )
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
        ? measurements
            .get(resolved.sourceNode.id)
            ?.get(resolved.sourceHandle.id)
        : undefined

      const targetMeasured = resolved
        ? measurements
            .get(resolved.targetNode.id)
            ?.get(resolved.targetHandle.id)
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
        edge.type === undefined ? undefined : renderers[edge.type]

      const endpoints = {
        source,
        target,
        sourceSide: resolved.sourceHandle.side,
        targetSide: resolved.targetHandle.side,
      }

      const customGeometry = registeredRenderer?.geometry?.(edge, endpoints)

      if (customGeometry !== undefined) {
        const { pathData: customPathData } = customGeometry
        pathData = customPathData
      }

      const context: FlowEdgeRenderContext = {
        ...endpoints,
        pathData,
        labelAnchor:
          customGeometry?.labelAnchor ??
          edgeLabelPosition(
            source,
            target,
            edge.path ?? 'straight',
            resolved.sourceHandle.side,
            resolved.targetHandle.side
          ),
      }

      let elements = edges.get(edge.id)

      if (elements === undefined) {
        const group = globalThis.document.createElementNS(svgNamespace, 'g')
        group.classList.add('flow-edge-group')
        group.dataset.edgeId = edge.id
        group.dataset.testid = 'flow-edge-group'

        const anchorGroup = globalThis.document.createElementNS(
          svgNamespace,
          'g'
        )

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
        sourceAnchor.setAttribute('r', '8')

        const targetAnchor = globalThis.document.createElementNS(
          svgNamespace,
          'circle'
        )

        targetAnchor.classList.add('flow-edge-reconnect-anchor')
        targetAnchor.dataset.endpoint = 'target'
        targetAnchor.dataset.testid = 'flow-edge-reconnect-anchor'
        targetAnchor.setAttribute('r', '8')

        group.append(path, hit, visual)
        anchorGroup.append(sourceAnchor, targetAnchor)
        elements = {
          anchorGroup,
          group,
          hit,
          path,
          visual,
          sourceAnchor,
          targetAnchor,
        }
        edges.set(edge.id, elements)
        added += 1
      } else if (elements.path.getAttribute('d') !== pathData) {
        updated += 1
      }

      const {
        anchorGroup,
        group,
        hit,
        path,
        visual,
        sourceAnchor,
        targetAnchor,
      } = elements

      const currentRenderer = customRenderers.get(edge.id)

      if (currentRenderer !== undefined && currentRenderer.type !== edge.type) {
        currentRenderer.renderer.destroy()
        customRenderers.delete(edge.id)
        visual.replaceChildren()
      }

      if (edge.type === undefined || registeredRenderer?.render === undefined) {
        path.removeAttribute('display')
        currentRenderer?.renderer.destroy()
        customRenderers.delete(edge.id)
        visual.replaceChildren()
      } else {
        path.setAttribute('display', 'none')
        const active = customRenderers.get(edge.id)

        if (active === undefined) {
          customRenderers.set(edge.id, {
            type: edge.type,
            renderer: registeredRenderer.render(edge, context, visual),
          })
        } else {
          active.renderer.update(edge, context)
        }
      }

      path.setAttribute('d', pathData)
      hit.setAttribute('d', pathData)
      hit.setAttribute('stroke-width', String(edge.interactionWidth ?? 20))
      sourceAnchor.setAttribute('cx', String(source.x))
      sourceAnchor.setAttribute('cy', String(source.y))
      targetAnchor.setAttribute('cx', String(target.x))
      targetAnchor.setAttribute('cy', String(target.y))
      group.classList.toggle('selected', edge.selected === true)
      anchorGroup.classList.toggle(
        'selected',
        edge.selected === true && edge.reconnectable !== false
      )
      sourceAnchor.classList.toggle(
        'available',
        edge.reconnectable !== false && edge.reconnectable !== 'target'
      )
      targetAnchor.classList.toggle(
        'available',
        edge.reconnectable !== false && edge.reconnectable !== 'source'
      )
      group.setAttribute('tabindex', edge.focusable === false ? '-1' : '0')
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
      const stroke = edge.stroke ?? defaultStroke
      path.setAttribute('stroke', stroke)
      path.setAttribute('stroke-width', String(edge.strokeWidth ?? 2))

      for (const [attribute, kind] of [
        ['marker-start', edge.markerStart],
        ['marker-end', edge.markerEnd],
      ] as const) {
        if (kind === undefined) {
          path.removeAttribute(attribute)

          continue
        }

        const markerId = ensureMarker(kind, stroke)
        visibleMarkers.add(markerId)
        path.setAttribute(attribute, `url(#${markerId})`)
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

        let label = labels.get(edge.id)

        if (label === undefined) {
          label = globalThis.document.createElement('div')
          label.classList.add('flow-edge-label')
          label.dataset.edgeId = edge.id
          label.dataset.testid = 'flow-edge-label'
          labels.set(edge.id, label)
        }

        label.textContent = edge.label
        label.setAttribute('x', String(position.x))
        label.setAttribute('y', String(position.y))
        label.style.left = `${position.x}px`
        label.style.top = `${position.y}px`

        if (onlyEdges === undefined || label.parentElement === null) {
          labelLayer.append(label)
        }

        visibleLabels.add(edge.id)
      }
    }

    if (onlyEdges === undefined) {
      for (const [edgeId, elements] of edges) {
        if (visible.has(edgeId)) {
          continue
        }

        elements.group.remove()
        elements.anchorGroup.remove()
        customRenderers.get(edgeId)?.renderer.destroy()
        customRenderers.delete(edgeId)
        edges.delete(edgeId)
        removed += 1
      }
    }

    if (onlyEdges === undefined) {
      for (const [edgeId, label] of labels) {
        if (visibleLabels.has(edgeId)) {
          continue
        }

        label.remove()
        labels.delete(edgeId)
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
    document: FlowDocument,
    graph: FlowGraphView,
    renderedPositions: ReadonlyMap<NodeId, XYPosition>,
    movedNodeIds: ReadonlySet<NodeId>
  ) => {
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
      : reconcile(document, renderedPositions, graph, affected)
  }

  return {
    setVisibleEdges: (edgeIds: ReadonlySet<EdgeId> | null): void => {
      visibleEdgeIds = edgeIds
    },
    measureNode,
    forgetNode: (nodeId: NodeId): void => {
      measurements.delete(nodeId)
    },
    reconcile,
    updatePositions,
    destroy: (): void => {
      measurements.clear()
      previousPositions.clear()

      for (const { renderer } of customRenderers.values()) {
        renderer.destroy()
      }

      customRenderers.clear()
      edges.clear()
      labels.clear()
      markers.clear()
      layer.remove()
      anchorLayer.remove()
    },
  }
}
