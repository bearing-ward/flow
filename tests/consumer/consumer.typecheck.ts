import { decodeFlowDocument } from '@flow/core'
import type { FlowChange, FlowDocument } from '@flow/core'
import { createFlow, mountFlow } from '@flow/vanilla'
import type { JavaScriptFlowController } from '@flow/vanilla'
import { Effect } from 'effect'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      { id: 'consumer-node', label: 'Consumer', position: { x: 10, y: 20 } },
    ],
    edges: [],
  })
)

const viewport = {
  mode: 'uncontrolled' as const,
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.5, maxZoom: 2 },
}

const options = { documentMode: 'controlled' as const, viewport }

const onChange = (_change: FlowChange): void => undefined

export const syncMount: typeof mountFlow = mountFlow

export const asyncMount: typeof createFlow = createFlow

export const controllerPromise: Promise<JavaScriptFlowController> = createFlow(
  globalThis.document.body,
  document,
  { ...options, onChange }
)
