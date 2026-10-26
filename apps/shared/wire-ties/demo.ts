import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type {
  FlowEditTransactionInput,
  FlowHistoryStatus,
  FlowSnapshot,
  FlowObject,
} from '@flow/core'
import { createLibavoidRouter } from '@flow/routing-libavoid'
import wasmUrl from '@flow/routing-libavoid/libavoid.wasm?url'
import { Effect } from 'effect'

import { mountWireTieTool } from './tool.ts'
import type { WireTieHost } from './tool.ts'

import './style.css'

export interface WireTiesDemo {
  readonly object: () => Promise<FlowObject>
  readonly snapshot: () => Promise<FlowSnapshot>
  readonly apply: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly refresh: () => Promise<void>
  readonly dispose: () => void
}

declare global {
  var flowWireTiesDemo: WireTiesDemo | undefined
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Promise rejections enter at this recipe boundary and are normalized for structured telemetry.
const reportWireTieFailure = (failure: unknown): void => {
  Effect.runSync(
    Effect.logWarning('Wire tie recipe action failed').pipe(
      Effect.annotateLogs({
        [FlowAttribute.failureMessage]: String(failure),
      }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

export const mountWireTiesDemo = async (
  host: WireTieHost & {
    readonly object: () => Promise<FlowObject>
    readonly history: () => Promise<FlowHistoryStatus>
    readonly undo: () => void
    readonly redo: () => void
    readonly copy: () => void
    readonly paste: () => void
    readonly dispose: () => void
  }
) => {
  const routingState = document.createElement('div')
  routingState.id = 'wire-routing-state'
  routingState.setAttribute('aria-live', 'polite')
  document.querySelector('h1')?.after(routingState)

  const router = new URLSearchParams(location.search).has('router')
    ? createLibavoidRouter({ wasmUrl })
    : undefined

  const tool = await mountWireTieTool({ ...host, router, routingState })
  const toolbar = document.querySelector('#wire-controls')

  if (toolbar === null) {
    throw new Error('Missing wire controls')
  }

  let saved: ReturnType<typeof encodeVersionedFlowDocument> | undefined
  let enabled = false
  let disposed = false
  const listeners = new AbortController()

  const dispose = (): void => {
    if (disposed) {
      return
    }

    disposed = true
    tool.dispose()
    listeners.abort()
    host.dispose()
  }

  const actions: readonly (readonly [string, () => void | Promise<void>])[] = [
    [
      'Tie wires',
      () => {
        enabled = !enabled
        tool.enabled(enabled)
        toolbar
          .querySelector('button')
          ?.setAttribute('aria-pressed', String(enabled))
      },
    ],
    ['Undo', host.undo],
    ['Redo', host.redo],
    [
      'Remove selected edge from bundle',
      async () => {
        const snapshot = await host.read()

        const selectedEdge = snapshot.document.edges.find(
          (edge) =>
            edge.selected &&
            snapshot.document.bundles?.some(({ edgeIds }) =>
              edgeIds.includes(edge.id)
            )
        )

        if (selectedEdge !== undefined) {
          await tool.removeEdge({
            kind: 'remove-edge',
            edgeId: selectedEdge.id,
          })
        }
      },
    ],
    [
      'Save',
      async () => {
        const snapshot = await host.read()
        saved = encodeVersionedFlowDocument(snapshot.document)
      },
    ],
    [
      'Load',
      async () => {
        if (saved === undefined) {
          return
        }

        const document = Effect.runSync(decodeVersionedFlowDocument(saved))
        await host.apply({
          operations: [
            { kind: 'set-nodes', nodes: document.nodes },
            { kind: 'set-edges', edges: document.edges },
            { kind: 'set-bundles', bundles: document.bundles ?? [] },
          ],
        })
      },
    ],
    ['Copy', host.copy],
    ['Paste', host.paste],
    ['Transform viewport', () => host.viewport({ x: 70, y: 35, zoom: 0.8 })],
    [
      'Move endpoint',
      async () => {
        await host.apply({
          operations: [
            {
              kind: 'update-node',
              nodeId: 'a',
              patch: { position: { x: 100, y: 150 } },
            },
          ],
        })
      },
    ],
    [
      'Reconnect',
      async () => {
        await host.apply({
          operations: [
            {
              kind: 'update-edge',
              edgeId: 'purple',
              patch: { target: 'b', targetHandle: 'in' },
            },
          ],
        })
      },
    ],
    [
      'Delete edge',
      async () => {
        await host.apply({
          operations: [{ kind: 'delete-elements', edgeIds: ['purple'] }],
        })
      },
    ],
    ['Dispose', dispose],
  ]

  const buttons = actions.map(([label, action]) => {
    const button = document.createElement('button')
    button.textContent = label
    button.addEventListener(
      'click',
      () => {
        void Promise.resolve(action())
          .then(tool.refresh)
          .catch(reportWireTieFailure)
      },
      { signal: listeners.signal }
    )
    toolbar.append(button)

    return button
  })

  const [toggle] = buttons

  if (toggle === undefined) {
    throw new Error('Missing tie button')
  }

  toggle.setAttribute('aria-pressed', 'false')
  globalThis.flowWireTiesDemo = {
    snapshot: host.read,
    object: host.object,
    apply: host.apply,
    history: host.history,
    refresh: tool.refresh,
    dispose,
  }
  window.addEventListener('pagehide', dispose, {
    once: true,
    signal: listeners.signal,
  })

  return dispose
}
