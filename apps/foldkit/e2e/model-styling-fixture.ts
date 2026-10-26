import {
  applyFlowChangeToDocument,
  decodeFlowDocument,
  FlowChangeSchema,
} from '@flow/core'
import type {
  FlowColorMode,
  FlowNode,
  FlowResizeParams,
  Viewport,
} from '@flow/core'
import {
  createFoldkitDeleteClient,
  updateFoldkitRendererRegistry,
  createFoldkitNodeMeasurementObserver,
  createFoldkitNodeResizeControl,
  createFoldkitNodeResizer,
  createFoldkitSnapshotClient,
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type {
  EditResponse,
  FlowFitViewOptionsInput,
  FoldkitNodeTypes,
  FoldkitRendererRegistry,
  GraphInteractionOptions,
  InteractionEventSchema,
  ports,
} from '@flow/foldkit'
import { Effect, Exit, Schema } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'

type InteractionEvent = typeof InteractionEventSchema.Encoded

type Operations = Parameters<
  Runtime.EmbedHandle<typeof ports>['ports']['editRequests']['send']
>[0]['transaction']['operations']

export interface ResizeLogEntry {
  readonly name: string
  readonly nodeId: string
  readonly params: FlowResizeParams
}

export interface FoldkitModelStylingFixture {
  readonly nodeChanges: () => readonly (readonly unknown[])[]
  readonly callbackFailures: () => number
  readonly clearNodeChanges: () => void
  readonly removeNodes: () => void
  readonly unmount: () => void
  readonly deleteResults: () => number
  readonly deleteApprovals: () => number
  readonly replaceRenderers: () => void
  readonly events: () => readonly InteractionEvent[]
  readonly resizeLog: () => readonly ResizeLogEntry[]
  readonly changeKinds: () => readonly string[]
  readonly edit: (operations: Operations) => Promise<EditResponse>
  readonly setColorMode: (mode: FlowColorMode) => void
  readonly setViewport: (viewport: Viewport) => void
  readonly fitView: (options: FlowFitViewOptionsInput) => Promise<Viewport>
  readonly viewport: () => Promise<Viewport>
  readonly node: (nodeId: string) => Promise<FlowNode | null>
  /** Veto every `shouldResize` step while true. */
  readonly vetoResize: (veto: boolean) => void
}

export interface FoldkitModelStylingInput {
  readonly resizeEndThrows?: boolean
  readonly vetoWidthAbove?: number
  readonly documentMode?: 'controlled' | 'uncontrolled'
  readonly shadowCanvas?: boolean
  readonly initialPaneSize?: { readonly width: number; readonly height: number }
  readonly document: unknown
  readonly approveDeletion?: boolean
  readonly liveMessages?: boolean
  readonly options?: Partial<GraphInteractionOptions>
  readonly viewport?: Viewport
}

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

export const mountFoldkitModelStylingFixture = (
  container: HTMLElement,
  input: FoldkitModelStylingInput
): FoldkitModelStylingFixture => {
  const owner = container.parentElement ?? container

  const style = document.createElement('style')
  style.textContent = `.flow-foldkit-canvas { position: relative; width: ${input.initialPaneSize?.width ?? 800}px; height: ${input.initialPaneSize?.height ?? 500}px; overflow: hidden; } .flow-foldkit-node { box-sizing: border-box; }`
  const root = container.getRootNode()

  if (root instanceof ShadowRoot) {
    for (const sheet of document.querySelectorAll(
      'style, link[rel="stylesheet"]'
    )) {
      root.append(sheet.cloneNode(true))
    }

    root.append(style)
  } else {
    document.head.append(style)
  }

  const events: InteractionEvent[] = []
  const resizeLog: ResizeLogEntry[] = []
  const changeKinds: string[] = []
  const nodeChanges: (readonly unknown[])[] = []
  let callbackFailures = 0
  let veto = false
  let zoom = input.viewport?.zoom ?? 1

  const log =
    (name: string) =>
    (nodeId: string, params: FlowResizeParams): void => {
      resizeLog.push({ name, nodeId, params })

      if (name === 'onResizeEnd' && input.resizeEndThrows) {
        callbackFailures += 1
        throw new Error('Fixture resize end failure')
      }
    }

  // React Node Resizer example: a NodeResizer with limits on selection.
  const resizer = createFoldkitNodeResizer({
    minWidth: 80,
    minHeight: 40,
    maxWidth: 260,
    maxHeight: 200,
    color: 'rgb(255, 0, 113)',
    handleStyle: { width: 12, height: 12 },
    handleClassName: 'fixture-handle',
    lineStyle: { borderStyle: 'dashed' },
    lineClassName: 'fixture-line',
    shouldResize: (_nodeId, params) =>
      !veto && params.width <= (input.vetoWidthAbove ?? Number.MAX_VALUE),
    onResizeStart: log('onResizeStart'),
    onResize: log('onResize'),
    onResizeEnd: log('onResizeEnd'),
  })

  const plainResizer = createFoldkitNodeResizer()

  const aspectResizer = createFoldkitNodeResizer({
    keepAspectRatio: true,
    autoScale: false,
  })

  const lineControl = createFoldkitNodeResizeControl({
    position: 'right',
    variant: 'line',
    resizeDirection: 'horizontal',
    minWidth: 60,
    onResizeEnd: log('controlEnd'),
  })

  // React Node Resizer example: a NodeResizeControl with an icon child.
  const iconControl = createFoldkitNodeResizeControl({
    style: { background: 'transparent', border: 'none' },
    minWidth: 100,
    minHeight: 50,
    onResizeEnd: log('iconEnd'),
  })

  const nodeTypes = {
    icon: (node, h, props) =>
      h.div(
        [],
        [
          node.label,
          iconControl.view(h, {
            zoom: props.zoom,
            children: [
              h.svg(
                [
                  h.DataAttribute('testid', 'resize-icon'),
                  h.Attribute('width', '20'),
                  h.Attribute('height', '20'),
                  h.ViewBox('0 0 24 24'),
                ],
                [h.path([h.D('M16 20l4 0l0 -4'), h.Stroke('#ff0071')])]
              ),
            ],
          }),
        ]
      ),
    resizable: (node, h, props) =>
      h.div(
        [h.Class('fixture-resizable')],
        [node.label, ...resizer.view(h, props)]
      ),
    plain: (node, h, props) =>
      h.div([], [node.label, ...plainResizer.view(h, props)]),
    aspect: (node, h, props) =>
      h.div([], [node.label, ...aspectResizer.view(h, props)]),
    line: (node, h, props) =>
      h.div([], [node.label, lineControl.view(h, props)]),
    hidden: (node, h, props) =>
      h.div(
        [],
        [
          node.label,
          ...aspectResizer.view(h, {
            zoom: props.zoom,
            isVisible: props.selected,
          }),
        ]
      ),
    // React Contextual Zoom: details only when zoomed in.
    zoom: (node, h, props) =>
      h.div(
        [h.DataAttribute('testid', 'zoom-node')],
        props.zoom >= 0.9
          ? [h.span([h.DataAttribute('testid', 'zoom-detail')], [node.label])]
          : [h.span([h.DataAttribute('testid', 'zoom-placeholder')], ['…'])]
      ),
    handle: (node, h) =>
      h.div(
        [],
        [
          h.span([h.Class('custom-drag-handle')], ['drag']),
          h.span([h.DataAttribute('testid', 'body')], [node.label]),
        ]
      ),
  } satisfies FoldkitNodeTypes

  let ownedDocument = Effect.runSync(decodeFlowDocument(input.document))

  const viewport = input.viewport ?? { x: 0, y: 0, zoom: 1 }

  const ariaLabelConfig = { ...input.options?.ariaLabelConfig }

  if (input.liveMessages) {
    ariaLabelConfig['node.a11yDescription.ariaLiveMessage'] = ({
      direction,
      x,
      y,
    }) => `Live ${direction} ${x}/${y}`
  }

  const registry: FoldkitRendererRegistry = { nodeTypes }

  const active = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      container,
      ownedDocument,
      viewport,
      [],
      input.documentMode ?? 'uncontrolled',
      'uncontrolled',
      registry,
      undefined,
      'full',
      {
        ...defaultInteractionOptions,
        ...input.options,
        ariaLabelConfig,
      }
    )
  )

  let deleteApprovals = 0
  let deleteResults = 0

  active.ports.deleteResults.subscribe(() => {
    deleteResults += 1
  })

  createFoldkitDeleteClient(active, () => {
    deleteApprovals += 1

    return input.approveDeletion ?? true
  })

  const snapshots = createFoldkitSnapshotClient(active.ports)

  const pane = () =>
    document.querySelector<HTMLElement>('#app .flow-foldkit-canvas') ??
    container

  const viewportClient = createViewportClient(
    active.ports,
    () => {
      const bounds = pane().getBoundingClientRect()

      return {
        width: bounds.width,
        height: bounds.height,
        originX: bounds.left,
        originY: bounds.top,
      }
    },
    viewport
  )

  active.ports.interactionEvents.subscribe((batch) => {
    events.push(...batch)
  })
  active.ports.changes.subscribe((change) => {
    changeKinds.push(change.kind)

    if (input.documentMode === 'controlled') {
      const next = applyFlowChangeToDocument(
        ownedDocument,
        Schema.decodeUnknownSync(FlowChangeSchema)(change)
      )

      if (next !== undefined) {
        ownedDocument = next
        send(
          active.ports.actions.send(
            HostAction.ReplaceDocument({ document: next })
          )
        )
      }
    }
  })
  active.ports.elementChanges.subscribe((changes) => {
    nodeChanges.push(changes.nodes)
  })
  active.ports.acceptedStates.subscribe((state) => {
    ;({ zoom } = state.current.viewport)
  })
  active.ports.viewportResults.subscribe((response) => {
    ;({ zoom } = response.viewport)
  })

  const measurements = createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => zoom,
    onMeasure: (requests) =>
      send(active.ports.actions.send(HostAction.MeasureNodes({ requests }))),
  })

  let requestNumber = 0
  const pending = new Map<string, (response: EditResponse) => void>()

  active.ports.editResults.subscribe((response) => {
    pending.get(response.requestId)?.(response)
    pending.delete(response.requestId)
  })

  return {
    nodeChanges: () => nodeChanges,
    callbackFailures: () => callbackFailures,
    clearNodeChanges: () => {
      nodeChanges.length = 0
    },
    removeNodes: () => {
      ownedDocument = { ...ownedDocument, nodes: [], edges: [] }
      send(
        active.ports.actions.send(
          HostAction.ReplaceDocument({ document: ownedDocument })
        )
      )
    },
    unmount: () => {
      measurements.dispose()
      resizer.dispose()
      plainResizer.dispose()
      aspectResizer.dispose()
      lineControl.dispose()
      iconControl.dispose()
      active.dispose()
    },
    deleteResults: () => deleteResults,
    deleteApprovals: () => deleteApprovals,
    replaceRenderers: () =>
      updateFoldkitRendererRegistry(
        registry,
        {
          nodeTypes: {
            zoom: (node, h) =>
              h.div(
                [h.DataAttribute('testid', 'replaced-node')],
                [`Replacement ${node.label}`]
              ),
          },
          edgeTypes: {
            custom: (_edge, geometry, h) =>
              h.path([
                h.DataAttribute('testid', 'replaced-edge'),
                h.D(geometry.path),
                h.Stroke('red'),
              ]),
          },
        },
        active.ports.actions
      ),
    events: () => events,
    resizeLog: () => resizeLog,
    changeKinds: () => changeKinds,
    edit: (operations) => {
      requestNumber += 1
      const requestId = `model-styling-${requestNumber}`
      const { promise, resolve } = Promise.withResolvers<EditResponse>()
      pending.set(requestId, resolve)
      send(
        active.ports.editRequests.send({
          requestId,
          transaction: { operations },
        })
      )

      return promise
    },
    setColorMode: (mode) =>
      send(active.ports.actions.send(HostAction.SetColorMode({ mode }))),
    setViewport: (next) => {
      ;({ zoom } = next)
      send(
        active.ports.actions.send(
          HostAction.ReplaceViewport({ viewport: next })
        )
      )
    },
    fitView: async (options) => {
      const response = await viewportClient.fitView(options)

      return response.viewport
    },
    viewport: async () => {
      const response = await viewportClient.getViewport()

      return response.viewport
    },
    node: async (nodeId) => {
      const result = await snapshots.requestVersioned({ nodeId })

      return result.status === 'succeeded'
        ? (result.response.node ?? null)
        : null
    },
    vetoResize: (next) => {
      veto = next
    },
  }
}
