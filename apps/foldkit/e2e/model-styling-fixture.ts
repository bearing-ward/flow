import { decodeFlowDocument } from '@flow/core'
import type {
  FlowColorMode,
  FlowNode,
  FlowResizeParams,
  Viewport,
} from '@flow/core'
import {
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
  GraphInteractionOptions,
  InteractionEventSchema,
  ports,
} from '@flow/foldkit'
import { Effect, Exit } from 'effect'
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
  readonly document: unknown
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
  const style = document.createElement('style')
  style.textContent =
    '#app .flow-foldkit-canvas { position: relative; width: 800px; height: 500px; overflow: hidden; } #app .flow-foldkit-node { box-sizing: border-box; }'
  document.head.append(style)

  const events: InteractionEvent[] = []
  const resizeLog: ResizeLogEntry[] = []
  const changeKinds: string[] = []
  let veto = false
  let zoom = input.viewport?.zoom ?? 1

  const log =
    (name: string) =>
    (nodeId: string, params: FlowResizeParams): void => {
      resizeLog.push({ name, nodeId, params })
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
    shouldResize: () => !veto,
    onResizeStart: log('onResizeStart'),
    onResize: log('onResize'),
    onResizeEnd: log('onResizeEnd'),
  })

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

  const nodeTypes = {
    resizable: (node, h, props) =>
      h.div(
        [h.Class('fixture-resizable')],
        [node.label, ...resizer.view(h, props)]
      ),
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

  const viewport = input.viewport ?? { x: 0, y: 0, zoom: 1 }

  const active = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      container,
      Effect.runSync(decodeFlowDocument(input.document)),
      viewport,
      [],
      'uncontrolled',
      'uncontrolled',
      { nodeTypes },
      undefined,
      'full',
      { ...defaultInteractionOptions, ...input.options }
    )
  )

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
  })
  active.ports.viewportResults.subscribe((response) => {
    ;({ zoom } = response.viewport)
  })

  createFoldkitNodeMeasurementObserver({
    owner: container,
    zoom: () => zoom,
    onMeasure: ({ requestId, measurement }) =>
      send(
        active.ports.actions.send(
          HostAction.MeasureNode({ requestId, measurement })
        )
      ),
  })

  let requestNumber = 0
  const pending = new Map<string, (response: EditResponse) => void>()

  active.ports.editResults.subscribe((response) => {
    pending.get(response.requestId)?.(response)
    pending.delete(response.requestId)
  })

  return {
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
