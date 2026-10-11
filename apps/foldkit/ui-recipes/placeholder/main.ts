import { decodeFlowDocument, FlowEditDisposedSchema } from '@flow/core'
import {
  createFoldkitPlaceholder,
  createFoldkitSnapshotClient,
  createProgram,
  defaultInteractionOptions,
} from '@flow/foldkit'
import type { EditResponse, ports } from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './placeholder.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Foldkit Placeholder root')
}

root.innerHTML =
  '<main class="flow-foldkit-placeholder-page"><div class="flow-foldkit-placeholder-canvas"><div class="flow-foldkit-placeholder-empty" data-empty-state></div><div class="flow-foldkit-placeholder-runtime" data-runtime></div></div><button type="button" data-check-selection>Check keyboard selection</button><output aria-live="polite"></output></main>'

const canvas = root.querySelector<HTMLElement>('[data-runtime]')

const emptyState = root.querySelector<HTMLElement>('[data-empty-state]')

const output = root.querySelector<HTMLOutputElement>('output')

const checkSelection = root.querySelector<HTMLButtonElement>(
  '[data-check-selection]'
)

if (
  canvas === null ||
  emptyState === null ||
  output === null ||
  checkSelection === null
) {
  throw new Error('Missing Foldkit Placeholder route elements')
}

canvas.id = 'flow-foldkit-placeholder-runtime'

const documentModel = Effect.runSync(
  decodeFlowDocument({ nodes: [], edges: [] })
)

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    canvas,
    documentModel,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    undefined,
    undefined,
    undefined,
    defaultInteractionOptions
  )
)

let requestNumber = 0

const snapshotClient = createFoldkitSnapshotClient(runtime.ports)

let disposed = false

const pending = new Map<string, (response: EditResponse) => void>()

let activating = false

const handlers = {
  activate: (): void => {
    output.value = 'rejected'
  },
}

const action = createFoldkitPlaceholder(document, {
  onActivate: () => {
    void handlers.activate()
  },
})

emptyState.append(action)

const stopEdits = runtime.ports.editResults.subscribe((response) => {
  pending.get(response.requestId)?.(response)
  pending.delete(response.requestId)
})

handlers.activate = async (): Promise<void> => {
  if (activating || disposed) {
    return
  }

  activating = true
  action.disabled = true
  requestNumber += 1
  const requestId = `placeholder-${requestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()
  pending.set(requestId, resolve)

  const sent = runtime.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'add-nodes',
          nodes: [
            {
              id: 'placeholder-created',
              label: 'Created from empty state',
              position: { x: 120, y: 120 },
            },
          ],
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    pending.delete(requestId)
    activating = false
    action.disabled = false
    output.value = 'rejected'

    return
  }

  const response = await promise

  if (disposed) {
    return
  }

  if ('result' in response) {
    emptyState.replaceChildren()
    output.value = `accepted:${response.result.document.nodes.length}`
  } else {
    activating = false
    action.disabled = false
    output.value = response.error._tag
  }
}

checkSelection.addEventListener('click', async () => {
  if (disposed) {
    return
  }

  const result = await snapshotClient.requestVersioned({
    nodeId: 'placeholder-created',
  })

  if (disposed) {
    return
  }

  switch (result.status) {
    case 'succeeded': {
      output.value = `selected:${result.response.node?.selected === true}`
      break
    }

    case 'failed': {
      output.value = `snapshot-failed:${result.reason}`
      break
    }

    case 'disposed': {
      output.value = 'snapshot-disposed'
      break
    }

    default: {
      const exhaustive: never = result
      throw new Error(`Unexpected snapshot outcome: ${String(exhaustive)}`)
    }
  }
})

globalThis.addEventListener(
  'pagehide',
  () => {
    disposed = true
    snapshotClient.dispose()
    stopEdits()

    for (const [requestId, resolve] of pending) {
      resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
    }

    pending.clear()
    runtime.dispose()
  },
  { once: true }
)
