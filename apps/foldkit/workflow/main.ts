import '@flow/foldkit/style.css'
import { FlowStateChangeSchema } from '@flow/core'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createViewportClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type { FoldkitNodeRenderer } from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'
import {
  workflowValidationSnapshot,
  workflowDocumentChanged,
  workflowCanvasConnection,
} from '../../shared/workflow/validation.ts'

import '../../shared/workflow/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing workflow root')
}

const container = document.createElement('div')

container.id = 'workflow-runtime'

root.append(container)

const renderer: FoldkitNodeRenderer = (node, h) =>
  h.div([h.Class('workflow-card')], [workflowCaption(node)])

let current = workflowDocument()

let model = workflowValidationSnapshot(current, 0)

let zoom = 1

const runtime = Runtime.embed(
  createProgram(
    container,
    current,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    { nodeTypes: { workflow: renderer } },
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      autoPanOnNodeFocus: false,
      defaultEdgeOptions: { data: { workflow: { version: 1, kind: 'data' } } },
      isValidConnection: (candidate, document) =>
        workflowCanvasConnection(document, candidate),
      panOnDrag: true,
      zoomOnScroll: true,
      selectionOnDrag: false,
    }
  )
)

const viewport = createViewportClient(
  runtime.ports,
  () => ({
    width: root.clientWidth,
    height: root.clientHeight,
    originX: root.getBoundingClientRect().left,
    originY: root.getBoundingClientRect().top,
  }),
  { x: 0, y: 0, zoom: 1 }
)

const instance = createFoldkitFlowInstance(runtime.ports, { viewport })

const history = createFoldkitHistoryClient(runtime.ports)

const measurement = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

const stops = new Set<() => void>()

const controls = mountWorkflowControls({
  snapshot: () => Promise.resolve(model),
  replace: async (document) => {
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
    await instance.toObject()
  },
  document: async () => {
    const snapshot = await instance.toObject()

    return { ...current, nodes: snapshot.nodes, edges: snapshot.edges }
  },
  edit: async (transaction) => {
    const result = await instance.applyEdit(transaction.operations)

    if ('error' in result) {
      throw new Error(result.error._tag)
    }
  },
  flowToScreen: instance.flowToScreenPosition,
  screenToFlow: instance.screenToFlowPosition,
  viewport: async (value) => {
    ;({ zoom } = value)

    await viewport.setViewport(value)
  },
  undo: history.undo,
  redo: history.redo,
  dispose: () => {
    for (const stop of stops) {
      stop()
    }

    measurement.dispose()
    viewport.dispose()
    history.dispose()
    instance.dispose()
    runtime.dispose()
  },
})

stops.add(
  runtime.ports.acceptedStates.subscribe((input) => {
    const state = S.decodeUnknownSync(FlowStateChangeSchema)(input)
    current = state.current.document

    model = workflowValidationSnapshot(
      current,
      model.revision +
        (workflowDocumentChanged(state.previous.document, current) ? 1 : 0)
    )
    ;({ zoom } = state.current.viewport)
    void controls.refresh()
  })
)
