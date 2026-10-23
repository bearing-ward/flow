import {
  createFlowGraph,
  decodeFlowDocument,
  FlowStateChangeSchema,
} from '@flow/core'
import type {
  FlowEditTransactionInput,
  FlowInteractivity,
  FlowGraphView,
  FlowNode,
  MeasuredNode,
  NodeId,
  Viewport,
} from '@flow/core'
import {
  HostAction,
  createFlowControls,
  createFoldkitInteractivity,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  mountFlowDevTools,
  mountFlowNodeSearch,
  mountFlowZoomSelect,
  mountFlowZoomSlider,
} from '@flow/foldkit'
import { Effect, Exit, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

export interface FoldkitUiControlsFixture {
  readonly viewport: () => Viewport
  readonly setViewport: (viewport: Viewport) => void
  readonly nodes: () => readonly FlowNode[]
  readonly edgeCount: () => number
  readonly applyEdit: (transaction: FlowEditTransactionInput) => void
  readonly interactiveCalls: () => readonly boolean[]
  readonly interactivity: () => FlowInteractivity
  readonly disposeAll: () => void
}

const decodeChange = S.decodeUnknownSync(FlowStateChangeSchema)

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

/**
 * Embed the Runtime now; the returned function mounts the UI catalog once the
 * caller has seen the rendered canvas.
 */
export const mountFoldkitUiControlsFixture = (
  container: HTMLElement
): (() => FoldkitUiControlsFixture) => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 80, y: 120 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 400, y: 260 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        { id: 'c', label: 'Gamma', position: { x: 1100, y: 700 } },
      ],
      edges: [],
    })
  )

  const limits = { minZoom: 0.5, maxZoom: 2 }
  let viewport: Viewport = { x: 0, y: 0, zoom: 1 }

  const active = Runtime.embed(
    createProgram(
      container,
      document,
      viewport,
      ['b'],
      'uncontrolled',
      'uncontrolled',
      {},
      limits,
      'full',
      // Pointer drags over nodes that cannot be dragged pan the pane.
      { ...defaultInteractionOptions, panOnDrag: true }
    )
  )

  const measurements = new Map<NodeId, MeasuredNode>()

  createFoldkitNodeMeasurementObserver({
    owner: container.parentElement ?? container,
    zoom: () => viewport.zoom,
    onMeasure: (requests) => {
      for (const { measurement } of requests) {
        measurements.set(measurement.nodeId, measurement)
      }

      send(active.ports.actions.send(HostAction.MeasureNodes({ requests })))
    },
  })

  // The Runtime renders its canvas in place of the container.
  const host = container.parentElement ?? container.ownerDocument.body

  return () => {
    const pane = host.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (pane === null) {
      throw new Error('Foldkit canvas has not rendered')
    }

    const viewportClient = createViewportClient(
      active.ports,
      () => {
        const bounds = pane.getBoundingClientRect()

        return {
          width: bounds.width,
          height: bounds.height,
          originX: bounds.left,
          originY: bounds.top,
        }
      },
      viewport,
      limits
    )

    let current = document
    let graph: FlowGraphView = createFlowGraph(current, measurements)
    const interactiveCalls: boolean[] = []
    let editNumber = 0

    const applyEdit = (transaction: FlowEditTransactionInput): void => {
      editNumber += 1
      send(
        active.ports.editRequests.send({
          requestId: `ui-controls-${editNumber}`,
          transaction,
        })
      )
    }

    const interactivity = createFoldkitInteractivity(active.ports)

    const controls = createFlowControls(pane.ownerDocument, viewportClient, {
      interactivity,
      onInteractiveChange: (interactive) => interactiveCalls.push(interactive),
    })

    controls.element.classList.add(
      'flow-foldkit-panel',
      'flow-foldkit-panel-bottom-left'
    )
    pane.append(controls.element)

    const slider = mountFlowZoomSlider(pane, viewportClient, {
      position: 'bottom-right',
    })

    const select = mountFlowZoomSelect(pane, viewportClient, {
      position: 'top-center',
    })

    const search = mountFlowNodeSearch(pane, viewportClient, graph, {
      applyEdit,
    })

    const devtools = mountFlowDevTools(
      pane,
      { document: current, viewport },
      { position: 'top-right' }
    )

    // The fixture's own state view outlives the UI mounts.
    active.ports.acceptedStates.subscribe((accepted) => {
      ;({ viewport, document: current } = decodeChange(accepted).current)
    })

    const stopStates = active.ports.acceptedStates.subscribe((accepted) => {
      const change = decodeChange(accepted)
      graph = createFlowGraph(change.current.document, measurements)

      if (controls.element.parentElement !== pane) {
        pane.append(controls.element)
      }

      slider.update(change.current.viewport)
      select.update(change.current.viewport)
      search.update(graph)
      devtools.update(change)
    })

    const stopFrames = active.ports.viewportResults.subscribe((response) => {
      slider.update(response.viewport)
      select.update(response.viewport)
      devtools.updateViewport(response.viewport)
    })

    return {
      viewport: () => viewport,
      setViewport: (next) =>
        send(
          active.ports.actions.send(
            HostAction.ReplaceViewport({ viewport: next })
          )
        ),
      nodes: () => current.nodes,
      edgeCount: () => current.edges.length,
      applyEdit,
      interactiveCalls: () => interactiveCalls,
      interactivity: interactivity.get,
      disposeAll: () => {
        stopStates()
        stopFrames()

        for (const mount of [controls, slider, select, search, devtools]) {
          mount.dispose()
        }
      },
    }
  }
}
