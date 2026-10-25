import {
  decodeFlowDocument,
  applySelectionSetChange,
  SelectionSetChangeSchema,
  flowHistoryDocument,
  NodeIdSchema,
  EdgeIdSchema,
} from '@flow/core'
import type {
  FlowDocument,
  FlowTransactionContext,
  FlowHistoryStatus,
  FlowEditOperation,
} from '@flow/core'
import {
  createProgram,
  createFoldkitHistoryClient,
  createFoldkitSnapshotClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './style.css'

const initial = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'Alpha',
        position: { x: 70, y: 65 },
        size: { width: 120, height: 48 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'b',
        label: 'Beta',
        position: { x: 370, y: 65 },
        size: { width: 120, height: 48 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
      {
        id: 'c',
        label: 'Gamma',
        position: { x: 370, y: 220 },
        size: { width: 120, height: 48 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'move',
        source: 'a',
        sourceHandle: 'out',
        target: 'b',
        targetHandle: 'in',
        reconnectable: true,
      },
    ],
  })
)

const root = document.querySelector('#app')

if (root === null) {
  throw new Error('Missing history root')
}

const capacity = Schema.decodeUnknownSync(
  Schema.Finite.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
)(Number(new URLSearchParams(location.search).get('capacity') ?? 100))

const mount = (name: string, controlled = false): (() => void) => {
  const section = document.createElement('section')
  section.dataset.testid = `history-${name}`
  section.innerHTML = `<h2>${name} history</h2><div class="history-toolbar"></div><div class="history-frame"><div id="history-runtime-${name}"></div></div><output data-testid="history-status"></output><output class="history-document" data-testid="saved-document"></output><output data-testid="proposal-status"></output>`
  root.append(section)
  const toolbar = section.querySelector('.history-toolbar')
  const frame = section.querySelector<HTMLElement>('.history-frame')

  const status = section.querySelector<HTMLOutputElement>(
    '[data-testid="history-status"]'
  )

  const saved = section.querySelector<HTMLOutputElement>(
    '[data-testid="saved-document"]'
  )

  const proposalStatus = section.querySelector<HTMLOutputElement>(
    '[data-testid="proposal-status"]'
  )

  if (
    toolbar === null ||
    frame === null ||
    status === null ||
    saved === null ||
    proposalStatus === null
  ) {
    throw new Error('Missing history elements')
  }

  const runtime = Runtime.embed(
    createProgram(
      section.querySelector(`#history-runtime-${name}`),
      initial,
      { x: 0, y: 0, zoom: 1 },
      [],
      controlled ? 'controlled' : 'uncontrolled',
      'uncontrolled',
      {},
      undefined,
      'full',
      { ...defaultInteractionOptions, autoPanOnNodeFocus: false },
      { historyCapacity: name === 'main' ? capacity : 100 }
    )
  )

  const history = createFoldkitHistoryClient(runtime.ports)
  const snapshots = createFoldkitSnapshotClient(runtime.ports)
  let current = initial
  let sequence = 0
  let disposed = false
  let rejectNext = false
  let hold = false

  let held:
    | {
        readonly document: FlowDocument
        readonly context?: FlowTransactionContext | undefined
      }
    | undefined

  const button = (label: string, action: () => void): HTMLButtonElement => {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.addEventListener('click', action)
    toolbar.append(element)

    return element
  }

  const undo = button('Undo', () => {
    void history.undo()
  })

  const redo = button('Redo', () => {
    void history.redo()
  })

  const renderStatus = (value: FlowHistoryStatus): void => {
    status.textContent = JSON.stringify(value)
    undo.disabled = !value.canUndo
    redo.disabled = !value.canRedo
    section.dataset.disposed = String(value.disposed)
  }

  const edit = (operations: readonly FlowEditOperation[]): void => {
    sequence += 1
    runtime.ports.editRequests.send({
      requestId: `${name}-${sequence}`,
      transaction: { operations },
    })
  }

  button('Add node', () =>
    edit([
      {
        kind: 'add-nodes',
        nodes: Effect.runSync(
          decodeFlowDocument({
            nodes: [
              {
                id: 'added',
                label: 'Added',
                position: { x: 640, y: 65 },
                size: { width: 120, height: 48 },
              },
            ],
            edges: [],
          })
        ).nodes,
      },
    ])
  )
  button('Add edge', () =>
    edit([
      {
        kind: 'add-edges',
        edges: Effect.runSync(
          decodeFlowDocument({
            nodes: current.nodes,
            edges: [
              {
                id: 'added-edge',
                source: 'a',
                sourceHandle: 'out',
                target: 'c',
                targetHandle: 'in',
              },
            ],
          })
        ).edges,
      },
    ])
  )
  button('Delete node', () =>
    edit([{ kind: 'delete-elements', nodeIds: [NodeIdSchema.make('b')] }])
  )
  button('Delete edge', () =>
    edit([{ kind: 'delete-elements', edgeIds: [EdgeIdSchema.make('move')] }])
  )

  const move = (): void =>
    edit([
      {
        kind: 'update-node',
        nodeId: NodeIdSchema.make('a'),
        patch: { position: { x: 150, y: 100 } },
      },
    ])

  button('Move node', move)
  button('Move edge', () =>
    edit([
      {
        kind: 'update-edge',
        edgeId: EdgeIdSchema.make('move'),
        patch: { target: 'c', targetHandle: 'in' },
      },
    ])
  )
  button('Reject edit', () => {
    if (controlled) {
      rejectNext = true
      move()
    } else {
      edit([
        {
          kind: 'add-nodes',
          nodes: initial.nodes,
        },
      ])
    }
  })

  if (controlled) {
    button('Hold replay', () => {
      hold = true
      proposalStatus.textContent = 'holding'
    })
    button('Accept replay', () => {
      hold = false

      if (held !== undefined) {
        runtime.ports.actions.send(HostAction.ReplaceDocument(held))
        held = undefined
        proposalStatus.textContent = 'accepted'
      }
    })
    button('Reject replay', () => {
      hold = false

      if (held?.context !== undefined) {
        void history.rejectHistory(held.context.transactionId)
      }

      held = undefined
      proposalStatus.textContent = 'rejected'
    })
  }

  const save = async (): Promise<void> => {
    const result = await snapshots.requestVersioned()

    if (result.status === 'succeeded') {
      saved.textContent = JSON.stringify(
        flowHistoryDocument(result.response.savedSession.document)
      )
    }
  }

  button('Save', () => {
    void save()
  })

  const input = document.createElement('input')
  input.setAttribute('aria-label', 'Native text')
  toolbar.append(input)

  const observer = createFoldkitNodeMeasurementObserver({
    owner: frame,
    zoom: () => 1,
    onMeasure: (requests) => {
      runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))
    },
  })

  const stops = [
    history.subscribeHistory(renderStatus),
    runtime.ports.editResults.subscribe((response) => {
      if ('error' in response) {
        proposalStatus.textContent = `rejected:${response.error._tag}`
      }
    }),
    runtime.ports.acceptedStates.subscribe(({ current: accepted }) => {
      current = Effect.runSync(decodeFlowDocument(accepted.document))
      saved.textContent = JSON.stringify(flowHistoryDocument(current))
    }),
    runtime.ports.changes.subscribe((change) => {
      if (!controlled) {
        return
      }

      if (change.kind === 'selection-set') {
        const document = applySelectionSetChange(
          current,
          Schema.decodeUnknownSync(SelectionSetChangeSchema)(change)
        )

        if (document !== undefined) {
          runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
        }

        return
      }

      if (change.kind !== 'edit-proposal') {
        return
      }

      if (rejectNext) {
        rejectNext = false

        if (change.context !== undefined) {
          void history.rejectHistory(change.context.transactionId)
        }

        proposalStatus.textContent = 'rejected'
      } else if (hold) {
        held = {
          document: Effect.runSync(decodeFlowDocument(change.document)),
          context: change.context,
        }
        proposalStatus.textContent = 'pending'
      } else {
        runtime.ports.actions.send(
          HostAction.ReplaceDocument({
            document: Effect.runSync(decodeFlowDocument(change.document)),
            context: change.context,
          })
        )
      }
    }),
  ]

  saved.textContent = JSON.stringify(flowHistoryDocument(initial))

  const refreshStatus = async (): Promise<void> => {
    renderStatus(await history.getStatus())
  }

  void refreshStatus()

  const dispose = (): void => {
    if (disposed) {
      return
    }

    disposed = true
    observer.dispose()

    for (const stop of stops) {
      stop()
    }

    history.dispose()
    snapshots.dispose()
    runtime.dispose()

    for (const element of toolbar.querySelectorAll('button')) {
      element.disabled = true
    }

    void refreshStatus()
  }

  button('Dispose', dispose)

  return dispose
}

const disposers = [mount('main'), mount('isolated'), mount('controlled', true)]

window.addEventListener(
  'pagehide',
  () => {
    for (const dispose of disposers) {
      dispose()
    }
  },
  { once: true }
)
