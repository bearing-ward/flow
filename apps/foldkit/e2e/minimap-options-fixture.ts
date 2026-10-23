import {
  createFlowGraph,
  decodeFlowDocument,
  FlowStateChangeSchema,
} from '@flow/core'
import type { FlowGraphView, MeasuredNode, NodeId, Viewport } from '@flow/core'
import {
  createFlowControls,
  createFlowMiniMap,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  HostAction,
  mountFlowPanel,
} from '@flow/foldkit'
import type { FlowControlsMount, FlowMiniMapMount } from '@flow/foldkit'
import { Effect, Exit, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

export interface FoldkitMiniMapOptionsFixture {
  readonly viewport: () => Viewport
  readonly setViewport: (viewport: Viewport) => void
  /** Flow points passed to the custom minimap's `onClick`. */
  readonly clicks: () => readonly { readonly x: number; readonly y: number }[]
  /** Node ids passed to the custom minimap's `onNodeClick`. */
  readonly nodeClicks: () => readonly string[]
  /** Minimap redraws fed by live `onNodeDrag` positions. */
  readonly dragUpdates: () => number
  readonly disposeAll: () => void
}

const decodeChange = S.decodeUnknownSync(FlowStateChangeSchema)

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

const svgNamespace = 'http://www.w3.org/2000/svg'

/**
 * Embed the Runtime now; the returned function mounts two option-driven
 * minimaps, ariaLabelConfig controls and a center-right panel once the
 * canvas has rendered.
 */
export const mountFoldkitMiniMapOptionsFixture = (
  container: HTMLElement
): (() => FoldkitMiniMapOptionsFixture) => {
  const document = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'a', label: 'Alpha', position: { x: 0, y: 0 }, selected: true },
        { id: 'b', label: 'Beta', position: { x: 600, y: 400 } },
      ],
      edges: [],
    })
  )

  // Foldkit replaces the container, so keep the stable #app host.
  const host = container.parentElement ?? container.ownerDocument.body
  const limits = { minZoom: 0.25, maxZoom: 4 }
  let viewport: Viewport = { x: 0, y: 0, zoom: 1 }

  const active = Runtime.embed(
    createProgram(
      container,
      document,
      viewport,
      [],
      'uncontrolled',
      'uncontrolled',
      {},
      limits,
      'full',
      defaultInteractionOptions
    )
  )

  const measurements = new Map<NodeId, MeasuredNode>()
  const mounts: (FlowMiniMapMount | FlowControlsMount)[] = []

  createFoldkitNodeMeasurementObserver({
    owner: host,
    zoom: () => viewport.zoom,
    onMeasure: (requests) => {
      for (const { measurement } of requests) {
        measurements.set(measurement.nodeId, measurement)
      }

      send(active.ports.actions.send(HostAction.MeasureNodes({ requests })))
    },
  })

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
    let graph: FlowGraphView = createFlowGraph(document, measurements)
    const clicks: { x: number; y: number }[] = []
    const nodeClicks: string[] = []
    let dragUpdates = 0

    const styled = createFlowMiniMap(
      pane.ownerDocument,
      pane,
      viewportClient,
      graph,
      viewport,
      {
        nodeColor: (node) =>
          node.id === 'a' ? 'rgb(255, 0, 0)' : 'rgb(0, 128, 0)',
        nodeStrokeColor: (node) =>
          node.selected === true ? 'rgb(0, 0, 255)' : 'rgb(1, 2, 3)',
        nodeClassName: (node) => `fixture-node-${node.id}`,
        nodeBorderRadius: 7,
        nodeStrokeWidth: 3,
        maskColor: 'rgba(10, 20, 30, 0.5)',
        maskStrokeColor: 'rgb(200, 0, 200)',
        maskStrokeWidth: 2,
        bgColor: 'rgb(250, 240, 230)',
        position: 'center-right',
        pannable: true,
        zoomable: true,
        zoomStep: 2,
        ariaLabelConfig: { 'minimap.ariaLabel': 'Übersicht' },
      }
    )

    styled.element.dataset.testid = 'styled-minimap'

    const custom = createFlowMiniMap(
      pane.ownerDocument,
      pane,
      viewportClient,
      graph,
      viewport,
      {
        position: 'top-left',
        ariaLabel: null,
        onClick: (_event, point) => clicks.push({ ...point }),
        onNodeClick: (_event, node) => nodeClicks.push(node.id),
        nodeComponent: (props, owner) => {
          const circle = owner.createElementNS(svgNamespace, 'circle')
          circle.setAttribute('class', 'fixture-custom-node')
          circle.setAttribute('cx', String(props.x + props.width / 2))
          circle.setAttribute('cy', String(props.y + props.height / 2))
          circle.setAttribute(
            'r',
            String(Math.min(props.width, props.height) / 2)
          )
          circle.dataset.selected = String(props.selected)

          return circle
        },
      }
    )

    custom.element.dataset.testid = 'custom-minimap'

    const controls = createFlowControls(pane.ownerDocument, viewportClient, {
      position: 'center-left',
      ariaLabelConfig: {
        'controls.ariaLabel': 'Steuerung',
        'controls.zoomIn.ariaLabel': 'Vergrößern',
        'controls.zoomOut.ariaLabel': 'Verkleinern',
        'controls.fitView.ariaLabel': 'Einpassen',
        'controls.interactive.ariaLabel': 'Interaktivität umschalten',
      },
      fitViewOptions: { nodes: [{ id: 'b' }], padding: 0.1 },
    })

    pane.append(controls.element)

    const panelContent = pane.ownerDocument.createElement('span')
    panelContent.textContent = 'Center right panel'

    const panel = mountFlowPanel(pane, panelContent, {
      position: 'center-right',
      ariaLabel: 'Center panel',
    })

    mounts.push(styled, custom, controls)

    const update = (): void => {
      for (const minimap of [styled, custom]) {
        minimap.update(graph, viewport)
      }
    }

    const stopStates = active.ports.acceptedStates.subscribe((accepted) => {
      const change = decodeChange(accepted)

      ;({ viewport, document: current } = change.current)
      graph = createFlowGraph(current, measurements)
      update()
    })

    // Live drag positions arrive with onNodeDrag before the drag commits.
    const stopEvents = active.ports.interactionEvents.subscribe((batch) => {
      for (const event of batch) {
        const positions = new Map(
          (event.name === 'onNodeDrag' ? (event.nodePositions ?? []) : []).map(
            (entry) => [entry.nodeId, entry.position]
          )
        )

        if (positions.size > 0) {
          const live = {
            ...current,
            nodes: current.nodes.map((node) => {
              const position = positions.get(node.id)

              return position === undefined ? node : { ...node, position }
            }),
          }

          graph = createFlowGraph(live, measurements)
          dragUpdates += 1
          update()
        }
      }
    })

    const stopFrames = active.ports.viewportResults.subscribe((response) => {
      ;({ viewport } = response)
      update()
    })

    return {
      viewport: () => viewport,
      setViewport: (next) =>
        send(
          active.ports.actions.send(
            HostAction.ReplaceViewport({ viewport: next })
          )
        ),
      clicks: () => clicks,
      nodeClicks: () => nodeClicks,
      dragUpdates: () => dragUpdates,
      disposeAll: () => {
        stopEvents()
        stopStates()
        stopFrames()
        panel.dispose()

        for (const mount of mounts) {
          mount.dispose()
        }
      },
    }
  }
}
