import {
  decodeFlowDocument,
  decodeSavedFlowDocument,
  FlowEditDisposedSchema,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  SavedFlowDocumentSchema,
  ViewportSchema,
} from '@flow/core'
import type {
  FlowDocument,
  Viewport,
  FlowEditTransactionSchema,
} from '@flow/core'
import { Effect, Exit, Schema } from 'effect'
import { Runtime } from 'foldkit'

import type {
  EditResponse,
  ports,
  SnapshotResponseSchema,
} from './application.ts'
import { createProgram, HostAction } from './application.ts'

import './style.css'

const original = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'source',
        label: 'Source',
        position: { x: 100, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'validate',
        label: 'Validate',
        position: { x: 420, y: 120 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 420, y: 300 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'source-validate',
        source: 'source',
        target: 'validate',
        path: 'bezier',
      },
      {
        id: 'validate-target',
        source: 'validate',
        target: 'target',
        path: 'step',
      },
    ],
  })
)

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML = `<main class="flow-foldkit-layout"><aside class="flow-foldkit-tools"><h1>Flow Foldkit playground</h1><p>Foldkit owns the graph model; selectors and typed ports expose state.</p><section class="flow-state-tools"><h2>State and persistence</h2><label>Node label <input aria-label="Node label" value="Validate"></label><button data-state="label">Update label</button><button data-state="hidden">Toggle hidden</button><button data-state="node-data">Update node data</button><button data-state="edge-data">Update edge data</button><button data-state="add-node">Add node</button><button data-state="remove-node">Remove added node</button><button data-state="add-protected">Add protected node</button><button data-state="protected-delete">Try protected delete</button><button data-state="reconnect-middle">Delete middle and reconnect</button><button data-state="inspect">Inspect graph</button><button data-state="save">Save snapshot</button><button data-state="change">Change graph and viewport</button><button data-state="restore" disabled>Restore snapshot</button><button data-state="reset">Reset example</button><small>Saved in this page session only. Reloading discards the snapshot.</small><output aria-live="polite"></output></section></aside><div class="flow-foldkit-host"></div></main>`

const canvas = root.querySelector<HTMLElement>('.flow-foldkit-host')

const input = root.querySelector<HTMLInputElement>('input')

const output = root.querySelector<HTMLOutputElement>('output')

const restore = root.querySelector<HTMLButtonElement>('[data-state="restore"]')

const tools = root.querySelector<HTMLElement>('.flow-state-tools')

if (
  canvas === null ||
  input === null ||
  output === null ||
  restore === null ||
  tools === null
) {
  throw new Error('Missing state demo elements')
}

canvas.id = 'flow-foldkit-runtime'

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(canvas, original, { x: 0, y: 0, zoom: 1 }, ['target'])
)

const nextAnimationFrame = (): Promise<undefined> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

const envelope = Schema.Struct({
  version: Schema.Literal(1),
  savedDocument: SavedFlowDocumentSchema,
  viewport: ViewportSchema,
})

let saved: unknown

let requestNumber = 0

let editRequestNumber = 0

let runtimeDisposed = false

const pendingSnapshots = new Map<
  string,
  (response: typeof SnapshotResponseSchema.Encoded) => void
>()

const pendingEditRequests = new Map<string, (response: EditResponse) => void>()

runtime.ports.snapshots.subscribe((response) => {
  pendingSnapshots.get(response.requestId)?.(response)
  pendingSnapshots.delete(response.requestId)
})

runtime.ports.editResults.subscribe((response) => {
  if (runtimeDisposed) {
    return
  }

  pendingEditRequests.get(response.requestId)?.(response)
  pendingEditRequests.delete(response.requestId)
})

const disposeRuntime = (): void => {
  if (runtimeDisposed) {
    return
  }

  runtimeDisposed = true

  for (const [requestId, resolve] of pendingEditRequests) {
    resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
  }

  pendingEditRequests.clear()
  runtime.dispose()
}

globalThis.addEventListener('pagehide', disposeRuntime, { once: true })

const snapshot = (): Promise<typeof SnapshotResponseSchema.Encoded> => {
  requestNumber += 1
  const requestId = `state-${requestNumber}`

  const { promise, resolve } =
    Promise.withResolvers<typeof SnapshotResponseSchema.Encoded>()

  pendingSnapshots.set(requestId, resolve)

  const sent = runtime.ports.snapshotRequests.send({
    requestId,
    nodeId: 'validate',
  })

  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected the state snapshot request')
  }

  return promise
}

const requestEdit = (
  transaction: typeof FlowEditTransactionSchema.Encoded
): Promise<EditResponse> => {
  editRequestNumber += 1
  const requestId = `edit-${editRequestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()

  if (runtimeDisposed) {
    resolve({ requestId, error: FlowEditDisposedSchema.make({}) })

    return promise
  }

  pendingEditRequests.set(requestId, resolve)
  const sent = runtime.ports.editRequests.send({ requestId, transaction })

  if (Exit.isFailure(sent)) {
    pendingEditRequests.delete(requestId)
    throw new Error('Foldkit rejected the graph edit request')
  }

  return promise
}

const settleRuntime = async (): Promise<void> => {
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const setDocument = async (document: FlowDocument): Promise<void> => {
  runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
  await settleRuntime()
}

const setViewport = async (viewport: Viewport): Promise<void> => {
  runtime.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
  await settleRuntime()
}

const setStatus = (message: string): void => {
  output.textContent = message
}

const handleAdditionalGraphEdit = async (state: string): Promise<boolean> => {
  switch (state) {
    case 'node-data': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node-data',
            nodeId: 'playground-edit-node',
            data: { editedInPlayground: true },
          },
        ],
      })

      setStatus('result' in result ? 'Updated node data' : result.error._tag)

      return true
    }

    case 'add-protected': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: 'protected-node',
                label: 'Protected',
                position: { x: 100, y: 500 },
                deletable: false,
              },
            ],
          },
        ],
      })

      setStatus('result' in result ? 'Added protected node' : result.error._tag)

      return true
    }

    case 'protected-delete': {
      const result = await requestEdit({
        operations: [{ kind: 'delete-elements', nodeIds: ['protected-node'] }],
      })

      setStatus(
        'result' in result
          ? 'Protected delete unexpectedly succeeded'
          : result.error._tag
      )

      return true
    }

    default: {
      return false
    }
  }
}

const handleGraphEdit = async (
  state: string,
  graph: FlowDocument,
  selectedNode: FlowDocument['nodes'][number] | undefined
): Promise<boolean> => {
  if (await handleAdditionalGraphEdit(state)) {
    return true
  }

  switch (state) {
    case 'label': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { label: input.value },
          },
        ],
      })

      setStatus(
        'result' in result
          ? `Updated Validate to ${input.value}`
          : result.error._tag
      )

      return true
    }

    case 'hidden': {
      const nextHidden = selectedNode?.hidden !== true

      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { hidden: nextHidden },
          },
        ],
      })

      setStatus(
        'result' in result
          ? `Validate hidden=${String(nextHidden)}; incident edges=${getConnectedEdges(selectedNode === undefined ? [] : [selectedNode], graph.edges).filter((edge) => edge.hidden !== true).length}`
          : result.error._tag
      )

      return true
    }

    case 'edge-data': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-edge-data',
            edgeId: 'validate-target',
            data: { editedInPlayground: true },
          },
        ],
      })

      setStatus('result' in result ? 'Updated edge data' : result.error._tag)

      return true
    }

    case 'add-node': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: 'playground-edit-node',
                label: 'Added through Foldkit edit port',
                position: { x: 560, y: 300 },
                data: { source: 'playground' },
              },
            ],
          },
        ],
      })

      setStatus('result' in result ? 'Added node' : result.error._tag)

      return true
    }

    case 'remove-node': {
      const result = await requestEdit({
        operations: [
          { kind: 'delete-elements', nodeIds: ['playground-edit-node'] },
        ],
      })

      setStatus(
        'result' in result
          ? `Removed ${result.result.deletion.deletedNodeIds.join(', ')}`
          : result.error._tag
      )

      return true
    }

    case 'reconnect-middle': {
      if (selectedNode === undefined) {
        setStatus('Middle node is already removed; reset to try again')

        return true
      }

      const incoming = getIncomers(selectedNode, graph.nodes, graph.edges)
      const outgoing = getOutgoers(selectedNode, graph.nodes, graph.edges)

      const edges = incoming.flatMap((source) =>
        outgoing.map((target) => ({
          id: `reconnected-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          path: 'bezier' as const,
        }))
      )

      const result = await requestEdit({
        operations: [
          { kind: 'delete-elements', nodeIds: [selectedNode.id] },
          { kind: 'add-edges', edges },
        ],
      })

      setStatus(
        'result' in result
          ? `Removed ${result.result.deletion.deletedNodeIds.join(', ')}; connected ${incoming.map(({ id }) => id).join(', ')} to ${outgoing.map(({ id }) => id).join(', ')}`
          : result.error._tag
      )

      return true
    }

    default: {
      return false
    }
  }
}

tools.addEventListener('pointerdown', (event) => event.stopPropagation())

tools.addEventListener('click', async (event) => {
  const button =
    event.target instanceof HTMLElement
      ? event.target.closest<HTMLButtonElement>('button[data-state]')
      : null

  if (button === null) {
    return
  }

  await nextAnimationFrame()
  const current = await snapshot()
  const graph = Effect.runSync(decodeFlowDocument(current.snapshot.document))
  const selectedNode = graph.nodes.find((node) => node.id === 'validate')

  if (await handleGraphEdit(button.dataset.state ?? '', graph, selectedNode)) {
    return
  }

  switch (button.dataset.state) {
    case 'inspect': {
      const node = selectedNode
      setStatus(
        JSON.stringify({
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          selected: node?.label,
          isSelected: node?.selected === true,
          hidden: node?.hidden === true,
          nodeData: graph.nodes.find(
            (item) => item.id === 'playground-edit-node'
          )?.data,
          protectedNode: graph.nodes.find(
            (item) => item.id === 'protected-node'
          )?.id,
          edgeData: graph.edges.find((edge) => edge.id === 'validate-target')
            ?.data,
          viewport: current.snapshot.viewport,
          incomers:
            node === undefined
              ? []
              : getIncomers(node, graph.nodes, graph.edges).map(
                  (item) => item.id
                ),
          outgoers:
            node === undefined
              ? []
              : getOutgoers(node, graph.nodes, graph.edges).map(
                  (item) => item.id
                ),
        })
      )
      break
    }

    case 'save': {
      saved = Schema.encodeSync(envelope)({
        version: 1,
        savedDocument: { version: 1, document: graph },
        viewport: current.snapshot.viewport,
      })
      restore.disabled = false
      setStatus('Snapshot saved for this session')
      break
    }

    case 'change': {
      await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { label: 'Changed after save', hidden: false },
          },
          {
            kind: 'update-edge-data',
            edgeId: 'validate-target',
            data: { changedAfterSave: true },
            replace: true,
          },
        ],
      })
      await setViewport({ x: -80, y: 30, zoom: 0.9 })
      setStatus('Changed label, visibility, and viewport')
      break
    }

    case 'restore': {
      if (saved === undefined) {
        setStatus('No snapshot saved')
        break
      }

      const state = Schema.decodeUnknownSync(envelope)(saved)
      await setDocument(
        Effect.runSync(decodeSavedFlowDocument(state.savedDocument))
      )
      await setViewport(state.viewport)
      setStatus('Restored document and viewport; selection is transient')
      break
    }

    case 'reset': {
      saved = undefined
      restore.disabled = true
      input.value = 'Validate'
      await setDocument(original)
      await setViewport({ x: 0, y: 0, zoom: 1 })
      setStatus('Reset to the original example')
      break
    }

    default: {
      break
    }
  }
})
