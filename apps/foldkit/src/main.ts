import {
  decodeFlowDocument,
  decodeSavedFlowDocument,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  SavedFlowDocumentSchema,
  ViewportSchema,
} from '@flow/core'
import type { FlowDocument, Viewport } from '@flow/core'
import { Effect, Exit, Schema } from 'effect'
import { Runtime } from 'foldkit'

import type { ports, SnapshotResponseSchema } from './application.ts'
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

root.innerHTML = `<main class="flow-foldkit-layout"><aside class="flow-foldkit-tools"><h1>Flow Foldkit playground</h1><p>Foldkit owns the graph model; selectors and typed ports expose state.</p><section class="flow-state-tools"><h2>State and persistence</h2><label>Node label <input aria-label="Node label" value="Validate"></label><button data-state="label">Update label</button><button data-state="hidden">Toggle hidden</button><button data-state="inspect">Inspect graph</button><button data-state="save">Save snapshot</button><button data-state="change">Change graph and viewport</button><button data-state="restore" disabled>Restore snapshot</button><button data-state="reset">Reset example</button><small>Saved in this page session only. Reloading discards the snapshot.</small><output aria-live="polite"></output></section></aside><div class="flow-foldkit-host"></div></main>`

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

const pendingSnapshots = new Map<
  string,
  (response: typeof SnapshotResponseSchema.Encoded) => void
>()

runtime.ports.snapshots.subscribe((response) => {
  pendingSnapshots.get(response.requestId)?.(response)
  pendingSnapshots.delete(response.requestId)
})

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

  switch (button.dataset.state) {
    case 'label': {
      const next = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === 'validate' ? { ...node, label: input.value } : node
        ),
      }

      await setDocument(Effect.runSync(decodeFlowDocument(next)))
      setStatus(`Updated Validate to ${input.value}`)
      break
    }

    case 'hidden': {
      const next = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === 'validate'
            ? { ...node, hidden: node.hidden !== true }
            : node
        ),
      }

      await setDocument(Effect.runSync(decodeFlowDocument(next)))
      setStatus(
        `Validate hidden=${String(selectedNode?.hidden !== true)}; incident edges=${getConnectedEdges(selectedNode === undefined ? [] : [selectedNode], graph.edges).filter((edge) => edge.hidden !== true).length}`
      )
      break
    }

    case 'inspect': {
      const node = selectedNode
      setStatus(
        JSON.stringify({
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          selected: node?.label,
          isSelected: node?.selected === true,
          hidden: node?.hidden === true,
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
      const next = {
        ...graph,
        nodes: graph.nodes.map((node) =>
          node.id === 'validate'
            ? { ...node, label: 'Changed after save', hidden: false }
            : node
        ),
      }

      await setDocument(Effect.runSync(decodeFlowDocument(next)))
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
