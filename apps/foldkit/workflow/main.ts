import {
  FlowStateChangeSchema,
  getFlowLayoutInput,
  flowTreeCollapsedIds,
} from '@flow/core'

import '@flow/foldkit/style.css'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createViewportClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
  createFoldkitStatusIndicator,
} from '@flow/foldkit'
import type { FoldkitNodeRenderer } from '@flow/foldkit'
import { makeLocalWorkflowAiProvider } from '@flow/workflow'
import type { WorkflowRunState } from '@flow/workflow'
import { Effect, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import {
  mountWorkflowControls,
  workflowDocument,
  workflowCaption,
} from '../../shared/workflow/demo.ts'
import {
  waitWorkflowFrame,
  waitWorkflowViewport,
} from '../../shared/workflow/editor-controls.ts'
import {
  createWorkflowRunOwner,
  workflowStatus,
} from '../../shared/workflow/run-owner.ts'

import '../../shared/workflow/style.css'
import {
  workflowValidationSnapshot,
  workflowDocumentChanged,
  workflowCanvasConnection,
} from '../../shared/workflow/validation.ts'
import type { WorkflowValidationSnapshot } from '../../shared/workflow/validation.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing workflow root')
}

const container = document.createElement('div')

container.id = 'workflow-runtime'

root.append(container)

let current = workflowDocument()

let model: WorkflowValidationSnapshot & {
  readonly run: WorkflowRunState | null
} = {
  ...workflowValidationSnapshot(current, 0),
  run: null,
}

const renderer: FoldkitNodeRenderer = (node, h) => {
  const state = model.run?.nodes[node.id]?.state

  return h.div(
    [],
    [
      h.div([h.Class('workflow-card')], [workflowCaption(node)]),
      createFoldkitStatusIndicator(
        state === undefined ? 'waiting' : workflowStatus(state),
        h,
        state ?? 'No run'
      ),
    ]
  )
}

const failure = new URLSearchParams(location.search).get('local-failure')

const provider = Effect.runSync(
  makeLocalWorkflowAiProvider(
    failure === 'text' || failure === 'image'
      ? { delayMillis: 250, fail: failure }
      : { delayMillis: 250 }
  )
)

const runs = createWorkflowRunOwner(() => model.revision, provider)

let zoom = 1

const runtime = Runtime.embed(
  createProgram(
    container,
    current,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    { nodeTypes: { workflow: renderer, default: renderer } },
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

const stops = new Set<() => void>([
  runs.subscribe(() => {
    model = { ...model, run: runs.state() }
    runtime.ports.actions.send(HostAction.RefreshRenderers({}))
  }),
])

const controls = mountWorkflowControls({
  runs,
  layoutInput: async () => {
    await instance.toObject()
    const internals = await instance.getInternalNodes()

    const lookup = new Map<string, (typeof internals)[number]>(
      internals.map((internal) => [internal.node.id, internal])
    )

    return {
      document: current,
      input: getFlowLayoutInput(current, (id) => lookup.get(id)),
    }
  },
  fit: async (signal) => {
    const collapsed = flowTreeCollapsedIds(current)

    const nodes = current.nodes.filter(
      (node) =>
        node.hidden !== true &&
        node.parentId === undefined &&
        !collapsed.has(node.id)
    )

    await waitWorkflowFrame(
      () =>
        nodes.every((node) => {
          const element = [
            ...root.querySelectorAll<HTMLElement>('[data-testid="flow-node"]'),
          ].find((item) => item.dataset.nodeId === node.id)

          return (
            element?.style.left === `${node.position.x}px` &&
            element.style.top === `${node.position.y}px` &&
            (node.handles ?? []).every((handle) =>
              [
                ...element.querySelectorAll<HTMLElement>('[data-handle-id]'),
              ].some(
                (item) =>
                  item.dataset.handleId === handle.id &&
                  item.dataset.handleSide === handle.side
              )
            )
          )
        }),
      signal
    )
    const fitted = await viewport.fitView('all', 0.1)
    await waitWorkflowViewport(root, fitted.viewport, signal)
  },
  theme: (mode) =>
    runtime.ports.actions.send(HostAction.SetColorMode({ mode })),
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
    controls.dispose()

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

    model = {
      ...workflowValidationSnapshot(
        current,
        model.revision +
          (workflowDocumentChanged(state.previous.document, current) ? 1 : 0)
      ),
      run: model.run,
    }
    runs.invalidate()
    ;({ zoom } = state.current.viewport)
    void controls.refresh()
  })
)
