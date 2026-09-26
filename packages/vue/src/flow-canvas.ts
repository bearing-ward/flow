import {
  applyNodePositionChange,
  bezierEdgePath,
  createFlowGraph,
  decodeFlowDocument,
  edgeAttachmentPosition,
  nextConnectionEdge,
  panViewport,
  resolveEdgeHandles,
  simpleBezierEdgePath,
  smoothStepEdgePath,
  straightEdgePath,
  stepEdgePath,
  validateFlowConnection,
  zoomViewportAt,
} from '@flow/core'
import type {
  FlowChange,
  FlowCommand,
  FlowDocument,
  FlowEdge,
  FlowEdgePath,
  FlowHandle,
  FlowNode,
  MeasuredHandle,
  Viewport,
} from '@flow/core'
import { Effect, Exit } from 'effect'
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  provide,
  shallowRef,
  watch,
} from 'vue'
import type {
  Component,
  ComponentPublicInstance,
  PropType,
  SlotsType,
  VNode,
} from 'vue'

import { FlowEditorKey } from './use-flow.ts'
import type { FlowEditor } from './use-flow.ts'

interface DragSession {
  readonly kind: 'node'
  readonly pointerId: number
  readonly node: FlowNode
  readonly element: HTMLElement
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly originX: number
  readonly originY: number
}

interface ConnectionSession {
  readonly kind: 'connection'
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly sourceNode: FlowNode
  readonly sourceHandle: string
  readonly start: { readonly x: number; readonly y: number }
  readonly pointer: { readonly x: number; readonly y: number }
}

interface PanSession {
  readonly kind: 'pan'
  readonly pointerId: number
  readonly captureTarget: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly viewportStart: Viewport
}

type Session = DragSession | ConnectionSession | PanSession

const viewportLimits = { minZoom: 0.4, maxZoom: 2 }

type NodeVisual = Component<{ readonly node: FlowNode }>

type EdgeVisual = Component<{ readonly edge: FlowEdge }>

const edgePath = (
  path: FlowEdgePath | undefined,
  source: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  sourceSide: FlowHandle['side'],
  targetSide: FlowHandle['side']
): string => {
  const selectedPath = path ?? 'straight'

  switch (selectedPath) {
    case 'bezier': {
      return bezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'simplebezier': {
      return simpleBezierEdgePath(source, target, sourceSide, targetSide)
    }

    case 'smoothstep': {
      return smoothStepEdgePath(source, target, sourceSide, targetSide)
    }

    case 'step': {
      return stepEdgePath(source, target, sourceSide, targetSide)
    }

    case 'straight': {
      return straightEdgePath(source, target)
    }

    default: {
      const exhaustive: never = selectedPath

      return exhaustive
    }
  }
}

const renderDefaultEdgePath = (
  edge: FlowEdge,
  sourcePosition: { readonly x: number; readonly y: number },
  targetPosition: { readonly x: number; readonly y: number },
  sourceHandle: FlowHandle,
  targetHandle: FlowHandle,
  sourceMeasured: MeasuredHandle,
  targetMeasured: MeasuredHandle
): VNode =>
  h('path', {
    class: 'flow-vue-edge-path',
    'data-testid': 'flow-edge-path',
    d: edgePath(
      edge.path,
      edgeAttachmentPosition(sourcePosition, sourceHandle, sourceMeasured),
      edgeAttachmentPosition(targetPosition, targetHandle, targetMeasured),
      sourceHandle.side,
      targetHandle.side
    ),
    fill: 'none',
    stroke: edge.stroke ?? '#64748b',
    'stroke-width': edge.strokeWidth ?? 1.5,
  })

// SAFETY: DefaultNode receives FlowNode values created from the decoded graph.
const DefaultNode = defineComponent({
  name: 'FlowDefaultNode',
  props: { node: { type: Object as PropType<FlowNode>, required: true } },
  setup(props) {
    return () => h('span', { class: 'flow-vue-node-label' }, props.node.label)
  },
})

// SAFETY: FlowCanvas decodes document, node, and edge props before graph use; Vue's PropType supplies their static contracts.
export const FlowCanvas = defineComponent({
  name: 'FlowCanvas',
  props: {
    document: { type: Object as PropType<FlowDocument>, default: undefined },
    defaultDocument: {
      type: Object as PropType<FlowDocument>,
      default: undefined,
    },
    documentMode: {
      type: String as PropType<'controlled' | 'uncontrolled'>,
      default: 'uncontrolled',
    },
    nodes: { type: Array as PropType<readonly FlowNode[]>, default: undefined },
    edges: { type: Array as PropType<readonly FlowEdge[]>, default: undefined },
    viewport: { type: Object as PropType<Viewport>, default: undefined },
    defaultViewport: {
      type: Object as PropType<Viewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 }),
    },
    viewportMode: {
      type: String as PropType<'controlled' | 'uncontrolled'>,
      default: 'uncontrolled',
    },
    nodeComponent: {
      type: [Object, Function] as PropType<NodeVisual>,
      default: undefined,
    },
    edgeComponent: {
      type: [Object, Function] as PropType<EdgeVisual>,
      default: undefined,
    },
    isValidConnection: {
      type: Function as PropType<(targetNodeId: string) => boolean>,
      default: () => true,
    },
    renderOnlyVisible: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: Record<string, never>
    node: { readonly node: FlowNode }
    edge: { readonly edge: FlowEdge }
  }>,
  emits: {
    change: (_change: FlowChange) => true,
    'update:document': (_document: FlowDocument) => true,
    'update:nodes': (_nodes: readonly FlowNode[]) => true,
    'update:edges': (_edges: readonly FlowEdge[]) => true,
    'update:viewport': (_viewport: Viewport) => true,
  },
  setup(props, { emit, slots, expose }) {
    const initialDocument = props.document ?? props.defaultDocument
    const hasSplitModel = props.nodes !== undefined || props.edges !== undefined

    if (
      hasSplitModel &&
      (props.nodes === undefined || props.edges === undefined)
    ) {
      throw new Error(
        'FlowCanvas requires both nodes and edges for split model binding'
      )
    }

    if (hasSplitModel && initialDocument !== undefined) {
      throw new Error(
        'FlowCanvas accepts either document or nodes/edges binding, not both'
      )
    }

    if (initialDocument === undefined && !hasSplitModel) {
      throw new Error(
        'FlowCanvas requires document/defaultDocument or nodes and edges'
      )
    }

    if (
      !hasSplitModel &&
      props.documentMode === 'controlled' &&
      props.document === undefined
    ) {
      throw new Error('Controlled FlowCanvas requires document')
    }

    const initialOwnedDocument =
      initialDocument ??
      (hasSplitModel
        ? Effect.runSync(
            decodeFlowDocument({
              nodes: props.nodes ?? [],
              edges: props.edges ?? [],
            })
          )
        : undefined)

    if (initialOwnedDocument === undefined) {
      throw new Error('FlowCanvas has no initial document state')
    }

    const ownedDocument = shallowRef(initialOwnedDocument)
    const ownedViewport = shallowRef(props.viewport ?? props.defaultViewport)

    const activeDocument = computed(() => {
      if (hasSplitModel) {
        return {
          ...ownedDocument.value,
          nodes: props.nodes ?? [],
          edges: props.edges ?? [],
        }
      }

      if (props.documentMode === 'controlled') {
        return props.document ?? ownedDocument.value
      }

      return ownedDocument.value
    })

    const activeViewport = computed(() =>
      props.viewportMode === 'controlled'
        ? (props.viewport ?? ownedViewport.value)
        : ownedViewport.value
    )

    const graph = computed(() => createFlowGraph(activeDocument.value))
    const session = shallowRef<Session>()
    const clickConnection = shallowRef<ConnectionSession>()
    const canvas = shallowRef<HTMLElement>()
    const canvasWidth = shallowRef(960)
    const canvasHeight = shallowRef(640)

    const measuredHandles = shallowRef<
      ReadonlyMap<string, ReadonlyMap<string, MeasuredHandle>>
    >(new Map())

    const nodeElements = new Map<string, HTMLElement>()

    const measureNodeHandles = (node: FlowNode, element: HTMLElement): void => {
      const nodeBounds = element.getBoundingClientRect()
      const { zoom } = activeViewport.value
      const measurements: [string, MeasuredHandle][] = []

      for (const handleElement of element.querySelectorAll<HTMLElement>(
        '[data-handle-id]'
      )) {
        const handle = node.handles?.find(
          (candidate) => candidate.id === handleElement.dataset.handleId
        )

        if (handle === undefined) {
          continue
        }

        const bounds = handleElement.getBoundingClientRect()
        measurements.push([
          handle.id,
          {
            nodeId: node.id,
            handleId: handle.id,
            offset: {
              x: (bounds.left + bounds.width / 2 - nodeBounds.left) / zoom,
              y: (bounds.top + bounds.height / 2 - nodeBounds.top) / zoom,
            },
            width: bounds.width / zoom,
            height: bounds.height / zoom,
          },
        ])
      }

      const handles = new Map(measurements)

      const previous = measuredHandles.value.get(node.id)

      const unchanged =
        previous?.size === handles.size &&
        [...handles].every(([id, next]) => {
          const old = previous.get(id)

          return (
            old !== undefined &&
            old.offset.x === next.offset.x &&
            old.offset.y === next.offset.y &&
            old.width === next.width &&
            old.height === next.height
          )
        })

      if (!unchanged) {
        const next = new Map([
          ...measuredHandles.value,
          [node.id, handles] as const,
        ])

        measuredHandles.value = next
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas.value) {
          canvasWidth.value = entry.contentRect.width
          canvasHeight.value = entry.contentRect.height
          continue
        }

        if (!(entry.target instanceof HTMLElement)) {
          continue
        }

        const { nodeId } = entry.target.dataset

        const node = activeDocument.value.nodes.find(
          (candidate) => candidate.id === nodeId
        )

        if (node !== undefined) {
          measureNodeHandles(node, entry.target)
        }
      }
    })

    watch(
      () => activeDocument.value.nodes,
      (nodes) => {
        for (const [nodeId, element] of nodeElements) {
          const node = nodes.find((candidate) => candidate.id === nodeId)

          if (node !== undefined) {
            measureNodeHandles(node, element)
          }
        }
      },
      { flush: 'post' }
    )

    const nodeRefCallbacks = new Map<
      string,
      (element: Element | ComponentPublicInstance | null) => void
    >()

    const nodeRef = (
      node: FlowNode
    ): ((element: Element | ComponentPublicInstance | null) => void) => {
      const existing = nodeRefCallbacks.get(node.id)

      if (existing !== undefined) {
        return existing
      }

      const callback = (element: Element | ComponentPublicInstance | null) => {
        if (element instanceof HTMLElement) {
          nodeElements.set(node.id, element)
          resizeObserver.observe(element)

          const currentNode = activeDocument.value.nodes.find(
            (candidate) => candidate.id === node.id
          )

          if (currentNode !== undefined) {
            measureNodeHandles(currentNode, element)
          }

          return
        }

        const previous = nodeElements.get(node.id)

        if (previous !== undefined) {
          resizeObserver.unobserve(previous)
          nodeElements.delete(node.id)
        }

        if (measuredHandles.value.has(node.id)) {
          const next = new Map(measuredHandles.value)
          next.delete(node.id)
          measuredHandles.value = next
        }
      }

      nodeRefCallbacks.set(node.id, callback)

      return callback
    }

    watch(
      () => props.document,
      (next) => {
        if (next !== undefined) {
          ownedDocument.value = next
        }
      }
    )
    watch(
      () => props.viewport,
      (next) => {
        if (next !== undefined) {
          ownedViewport.value = next
        }
      }
    )

    const publish = (change: FlowChange): void => {
      emit('change', change)

      if (hasSplitModel || props.documentMode === 'controlled') {
        let next: FlowDocument | undefined

        if (change.kind === 'node-position') {
          next = applyNodePositionChange(activeDocument.value, change)
        } else if (change.kind === 'edge-add') {
          next = {
            ...activeDocument.value,
            edges: [...activeDocument.value.edges, change.edge],
          }
        }

        if (next !== undefined && hasSplitModel) {
          if (change.kind === 'node-position') {
            emit('update:nodes', next.nodes)
          }

          if (change.kind === 'edge-add') {
            emit('update:edges', next.edges)
          }
        } else if (next !== undefined) {
          emit('update:document', next)
        }

        return
      }

      if (change.kind === 'node-position') {
        const updated = applyNodePositionChange(activeDocument.value, change)

        if (updated !== undefined) {
          ownedDocument.value = updated
        }
      } else if (change.kind === 'edge-add') {
        ownedDocument.value = {
          ...activeDocument.value,
          edges: [...activeDocument.value.edges, change.edge],
        }
      }
    }

    const updateDocument = (next: FlowDocument): void => {
      if (hasSplitModel) {
        emit('update:nodes', next.nodes)
        emit('update:edges', next.edges)
      } else if (props.documentMode === 'controlled') {
        emit('update:document', next)
      } else {
        ownedDocument.value = next
      }
    }

    const updateViewport = (next: Viewport): void => {
      if (props.viewportMode === 'controlled') {
        emit('update:viewport', next)
      } else {
        ownedViewport.value = next
      }
    }

    const cleanupPreview = (
      active: Session | undefined = session.value
    ): void => {
      if (active?.kind === 'node') {
        active.element.style.removeProperty('transform')
      }

      if (active?.captureTarget.hasPointerCapture?.(active.pointerId)) {
        active.captureTarget.releasePointerCapture?.(active.pointerId)
      }

      if (session.value === active) {
        session.value = undefined
      }
    }

    watch(
      () => activeDocument.value.nodes.map(({ id }) => id),
      (ids) => {
        const active = session.value
        const pending = clickConnection.value

        if (active?.kind === 'node' && !ids.includes(active.node.id)) {
          cleanupPreview(active)
        }

        if (pending !== undefined && !ids.includes(pending.sourceNode.id)) {
          clickConnection.value = undefined
        }
      }
    )

    const dispatch = (command: FlowCommand): void => {
      if (command.kind === 'set-viewport') {
        updateViewport(command.viewport)
      }

      if (command.kind === 'set-node-position') {
        const node = activeDocument.value.nodes.find(
          (candidate) => candidate.id === command.nodeId
        )

        if (node !== undefined) {
          publish({
            kind: 'node-position',
            nodeId: node.id,
            position: command.position,
          })
        }
      }
    }

    const editor: FlowEditor = {
      document: activeDocument,
      viewport: activeViewport,
      dispatch,
      updateDocument,
      updateViewport,
      publish,
    }

    provide(FlowEditorKey, editor)
    expose({ editor })

    const nodePosition = (node: FlowNode): { x: number; y: number } =>
      graph.value.nodes.get(node.id)?.absolutePosition ?? node.position

    const visible = (node: FlowNode): boolean => {
      if (graph.value.nodes.get(node.id)?.hidden === true) {
        return false
      }

      if (!props.renderOnlyVisible) {
        return true
      }

      const position = nodePosition(node)
      const viewport = activeViewport.value
      const left = position.x * viewport.zoom + viewport.x
      const top = position.y * viewport.zoom + viewport.y

      return (
        left < canvasWidth.value &&
        top < canvasHeight.value &&
        left + 150 * viewport.zoom > 0 &&
        top + 44 * viewport.zoom > 0
      )
    }

    const onPointerDown = (event: PointerEvent, node: FlowNode): void => {
      const { target } = event

      if (!(target instanceof HTMLElement)) {
        return
      }

      const handleId =
        target.closest<HTMLElement>('[data-handle-id]')?.dataset.handleId

      const { currentTarget } = event

      if (!(currentTarget instanceof HTMLElement)) {
        return
      }

      if (handleId === undefined) {
        session.value = {
          kind: 'node',
          pointerId: event.pointerId,
          node,
          element: currentTarget,
          captureTarget: currentTarget,
          startX: event.clientX,
          startY: event.clientY,
          originX: node.position.x,
          originY: node.position.y,
        }
      } else {
        const source = graph.value.nodes.get(node.id)

        const handle = node.handles?.find(
          (candidate) => candidate.id === handleId
        )

        const measured = measuredHandles.value.get(node.id)?.get(handleId)

        if (
          source === undefined ||
          handle === undefined ||
          measured === undefined
        ) {
          return
        }

        const start = edgeAttachmentPosition(
          source.absolutePosition,
          handle,
          measured
        )

        const bounds = canvas.value?.getBoundingClientRect()

        const viewport = activeViewport.value

        session.value = {
          kind: 'connection',
          pointerId: event.pointerId,
          captureTarget: currentTarget,
          sourceNode: node,
          sourceHandle: handleId,
          start,
          pointer:
            bounds === undefined
              ? start
              : {
                  x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                  y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                },
        }
      }

      currentTarget.setPointerCapture?.(event.pointerId)
    }

    const finishConnection = (
      event: PointerEvent,
      active: ConnectionSession
    ): void => {
      const pending = clickConnection.value

      cleanupPreview(active)

      const targetElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-handle-id]')

      const targetNodeElement =
        targetElement?.closest<HTMLElement>('[data-node-id]')

      const targetNodeId = targetNodeElement?.dataset.nodeId
      const targetHandleId = targetElement?.dataset.handleId

      if (targetNodeId === undefined || targetHandleId === undefined) {
        return
      }

      const source = pending ?? active

      if (targetNodeId === source.sourceNode.id) {
        const candidateHandle = source.sourceNode.handles?.find(
          (handle) =>
            handle.id === source.sourceHandle && handle.kind === 'source'
        )

        if (
          candidateHandle !== undefined &&
          targetHandleId === source.sourceHandle
        ) {
          clickConnection.value = source
        }

        return
      }

      clickConnection.value = undefined

      if (!props.isValidConnection(targetNodeId)) {
        return
      }

      const targetNode = activeDocument.value.nodes.find(
        (node) => node.id === targetNodeId
      )

      const sourceHandle = source.sourceNode.handles?.find(
        (handle) =>
          handle.id === source.sourceHandle && handle.kind === 'source'
      )

      const targetHandle = targetNode?.handles?.find(
        (handle) => handle.id === targetHandleId && handle.kind === 'target'
      )

      if (
        targetNode === undefined ||
        sourceHandle === undefined ||
        targetHandle === undefined
      ) {
        return
      }

      const connection = {
        source: source.sourceNode.id,
        sourceHandle: sourceHandle.id,
        target: targetNode.id,
        targetHandle: targetHandle.id,
      }

      if (
        Exit.isFailure(
          Effect.runSyncExit(
            validateFlowConnection(activeDocument.value, connection)
          )
        )
      ) {
        return
      }

      publish({
        kind: 'edge-add',
        edge: nextConnectionEdge(activeDocument.value, connection),
      })
    }

    const onPointerUp = (event: PointerEvent): void => {
      const active = session.value

      if (active === undefined || active.pointerId !== event.pointerId) {
        return
      }

      if (active.kind === 'connection') {
        finishConnection(event, active)

        return
      }

      if (active.kind === 'pan') {
        updateViewport(
          panViewport(active.viewportStart, {
            x: event.clientX - active.startX,
            y: event.clientY - active.startY,
          })
        )
        cleanupPreview(active)

        return
      }

      cleanupPreview(active)
      const dx = (event.clientX - active.startX) / activeViewport.value.zoom
      const dy = (event.clientY - active.startY) / activeViewport.value.zoom

      if (Math.hypot(dx, dy) < 8) {
        return
      }

      publish({
        kind: 'node-position',
        nodeId: active.node.id,
        position: { x: active.originX + dx, y: active.originY + dy },
      })
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        cleanupPreview()
        clickConnection.value = undefined
      }
    }

    const onCanvasPointerDown = (event: PointerEvent): void => {
      const { target, currentTarget } = event

      if (
        event.button !== 0 ||
        session.value !== undefined ||
        !(target instanceof Element) ||
        !(currentTarget instanceof HTMLElement) ||
        target.closest('[data-node-id]') !== null
      ) {
        return
      }

      session.value = {
        kind: 'pan',
        pointerId: event.pointerId,
        captureTarget: currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        viewportStart: activeViewport.value,
      }
      currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent): void => {
      const bounds = canvas.value?.getBoundingClientRect()

      if (bounds === undefined) {
        return
      }

      const anchor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }

      const zoom = activeViewport.value.zoom * Math.exp(-event.deltaY * 0.001)

      updateViewport(
        zoomViewportAt(activeViewport.value, zoom, anchor, viewportLimits)
      )
      event.preventDefault()
    }

    const renderNode = (node: FlowNode): VNode | null => {
      if (graph.value.nodes.get(node.id)?.hidden === true || !visible(node)) {
        return null
      }

      const position = nodePosition(node)
      const Node: NodeVisual = props.nodeComponent ?? DefaultNode

      const nodeSlots =
        slots.node === undefined
          ? undefined
          : { default: () => slots.node?.({ node }) }

      const handleChildren = (node.handles ?? []).map((handle) =>
        h('button', {
          key: handle.id,
          type: 'button',
          class: ['flow-vue-handle', `flow-vue-handle-${handle.side}`],
          'data-handle-id': handle.id,
          'aria-label': `${handle.kind} handle ${handle.id}`,
        })
      )

      return h(
        'div',
        {
          key: node.id,
          class: 'flow-vue-node',
          'data-testid': 'flow-node',
          'data-node-id': node.id,
          ref: nodeRef(node),
          style: { left: `${position.x}px`, top: `${position.y}px` },
          onPointerdown: (event: PointerEvent) => onPointerDown(event, node),
        },
        [
          h(Node, { node, key: `visual-${node.id}` }, nodeSlots),
          ...handleChildren,
        ]
      )
    }

    const renderEdge = (edge: FlowEdge): VNode | null => {
      const source = graph.value.nodes.get(edge.source)
      const target = graph.value.nodes.get(edge.target)

      if (
        edge.hidden === true ||
        source?.hidden === true ||
        target?.hidden === true
      ) {
        return null
      }

      const Edge = props.edgeComponent

      const edgeSlots =
        slots.edge === undefined
          ? undefined
          : { default: () => slots.edge?.({ edge }) }

      const resolved = resolveEdgeHandles(activeDocument.value, edge)

      const sourceNode =
        resolved === undefined
          ? undefined
          : graph.value.nodes.get(resolved.sourceNode.id)

      const targetNode =
        resolved === undefined
          ? undefined
          : graph.value.nodes.get(resolved.targetNode.id)

      const sourceMeasured =
        resolved === undefined
          ? undefined
          : measuredHandles.value
              .get(resolved.sourceNode.id)
              ?.get(resolved.sourceHandle.id)

      const targetMeasured =
        resolved === undefined
          ? undefined
          : measuredHandles.value
              .get(resolved.targetNode.id)
              ?.get(resolved.targetHandle.id)

      let edgeChildren: VNode[] = []

      if (Edge !== undefined) {
        edgeChildren = [h(Edge, { edge }, edgeSlots)]
      } else if (
        resolved !== undefined &&
        sourceNode !== undefined &&
        targetNode !== undefined &&
        sourceMeasured !== undefined &&
        targetMeasured !== undefined
      ) {
        edgeChildren = [
          renderDefaultEdgePath(
            edge,
            sourceNode.absolutePosition,
            targetNode.absolutePosition,
            resolved.sourceHandle,
            resolved.targetHandle,
            sourceMeasured,
            targetMeasured
          ),
        ]
      }

      return h(
        'g',
        { key: edge.id, 'data-testid': 'flow-edge', 'data-edge-id': edge.id },
        edgeChildren
      )
    }

    onBeforeUnmount(() => {
      if (canvas.value !== undefined) {
        resizeObserver.unobserve(canvas.value)
      }

      resizeObserver.disconnect()
      globalThis.removeEventListener('keydown', onKeyDown, true)
      cleanupPreview()
    })

    return () => {
      const connection =
        session.value?.kind === 'connection'
          ? session.value
          : clickConnection.value

      const connectionPreview =
        connection === undefined
          ? []
          : [
              h('path', {
                class: 'flow-vue-connection-preview',
                'data-testid': 'flow-connection-preview',
                d: straightEdgePath(connection.start, connection.pointer),
              }),
            ]

      return h(
        'div',
        {
          ref: (element: Element | ComponentPublicInstance | null) => {
            if (element instanceof HTMLElement && canvas.value !== element) {
              if (canvas.value !== undefined) {
                resizeObserver.unobserve(canvas.value)
              }

              canvas.value = element
              resizeObserver.observe(element)
              globalThis.addEventListener('keydown', onKeyDown, true)
            }
          },
          class: 'flow-vue-canvas',
          'data-testid': 'flow-canvas',
          onPointermove: (event: PointerEvent) => {
            const active = session.value

            if (
              active === undefined &&
              clickConnection.value !== undefined &&
              canvas.value !== undefined
            ) {
              const bounds = canvas.value.getBoundingClientRect()
              const viewport = activeViewport.value
              const pending = clickConnection.value

              clickConnection.value = {
                ...pending,
                pointer: {
                  x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                  y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                },
              }

              return
            }

            if (active === undefined || active.pointerId !== event.pointerId) {
              return
            }

            if (active.kind === 'pan') {
              updateViewport(
                panViewport(active.viewportStart, {
                  x: event.clientX - active.startX,
                  y: event.clientY - active.startY,
                })
              )

              return
            }

            if (active.kind === 'connection') {
              const bounds = canvas.value?.getBoundingClientRect()

              if (bounds !== undefined) {
                const viewport = activeViewport.value

                session.value = {
                  ...active,
                  pointer: {
                    x:
                      (event.clientX - bounds.left - viewport.x) /
                      viewport.zoom,
                    y:
                      (event.clientY - bounds.top - viewport.y) / viewport.zoom,
                  },
                }
              }

              return
            }

            const dx =
              (event.clientX - active.startX) / activeViewport.value.zoom

            const dy =
              (event.clientY - active.startY) / activeViewport.value.zoom

            active.element.style.transform = `translate(${dx}px, ${dy}px)`
          },
          onPointerdown: onCanvasPointerDown,
          onPointerup: onPointerUp,
          onWheel,
          onPointercancel: (event: PointerEvent) => {
            if (session.value?.pointerId === event.pointerId) {
              cleanupPreview()
              clickConnection.value = undefined
            }
          },
        },
        [
          h(
            'svg',
            {
              class: 'flow-vue-edges',
              'aria-hidden': 'true',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
                transformOrigin: '0 0',
              },
            },
            [
              ...activeDocument.value.edges.map(renderEdge),
              ...connectionPreview,
            ]
          ),
          h(
            'div',
            {
              class: 'flow-vue-viewport',
              style: {
                transform: `translate(${activeViewport.value.x}px, ${activeViewport.value.y}px) scale(${activeViewport.value.zoom})`,
              },
            },
            graph.value.orderedNodes.map(({ node }) => renderNode(node))
          ),
          slots.default?.({}),
        ]
      )
    }
  },
})
