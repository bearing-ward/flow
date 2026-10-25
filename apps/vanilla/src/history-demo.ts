import { applyFlowChangeToDocument } from '@flow/core'
import type { FlowChange, FlowHistoryStatus } from '@flow/core'

import { createFlow } from './public.ts'
import type { FlowCreateOptions, JavaScriptFlowController } from './public.ts'

import './style.css'
import './history-demo.css'

type Proposal = Extract<FlowChange, { readonly kind: 'edit-proposal' }>

export interface VanillaHistoryFixture {
  readonly controller: JavaScriptFlowController
  readonly isolated: JavaScriptFlowController
  readonly proposals: readonly Proposal[]
  readonly setAcceptProposals: (accept: boolean) => void
  readonly acceptLatest: (echoContext?: boolean) => void
  readonly rejectLatest: () => void
}

declare global {
  var flowHistoryFixture: VanillaHistoryFixture | undefined
}

const root = document.querySelector<HTMLElement>('#app')

const isolatedRoot = document.querySelector<HTMLElement>('#isolated')

const controls = document.querySelector<HTMLElement>('#history-controls')

const statusElement =
  document.querySelector<HTMLOutputElement>('#history-status')

if (
  root === null ||
  isolatedRoot === null ||
  controls === null ||
  statusElement === null
) {
  throw new Error('Missing history demo elements')
}

const params = new URLSearchParams(location.search)

const controlled = params.has('controlled')

const capacity = params.get('capacity')

const proposals: Proposal[] = []

let acceptProposals = true

const mountOptions: FlowCreateOptions = {
  documentMode: controlled ? 'controlled' : 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.5, maxZoom: 2 },
  },
}

if (capacity !== null) {
  Object.assign(mountOptions, { historyCapacity: Number(capacity) })
}

const controller: JavaScriptFlowController = await createFlow(
  root,
  {
    nodes: [
      {
        id: 'a',
        label: 'Alpha',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 60 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
      {
        id: 'b',
        label: 'Beta',
        position: { x: 400, y: 100 },
        size: { width: 150, height: 60 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
    ],
    edges: [{ id: 'ab', source: 'a', target: 'b', reconnectable: true }],
  },
  {
    ...mountOptions,
    autoPanOnNodeFocus: false,
    onChange: (change) => {
      if (change.kind === 'edit-proposal') {
        proposals.push(change)
      }

      if (controlled && acceptProposals) {
        const next = applyFlowChangeToDocument(
          controller.getSnapshot().document,
          change
        )

        if (next !== undefined) {
          controller.update(
            next,
            change.kind === 'edit-proposal' ? change.context : undefined
          )
        }
      }
    },
  }
)

const isolated = await createFlow(
  isolatedRoot,
  {
    nodes: [
      { id: 'peer', label: 'Separate history', position: { x: 100, y: 30 } },
    ],
    edges: [],
  },
  {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  }
)

const buttons = new Map<string, HTMLButtonElement>()

const addButton = (label: string, action: () => void): void => {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.addEventListener('click', async () => {
    try {
      await action()
    } catch (error) {
      statusElement.textContent =
        error instanceof Error ? error.message : String(error)
    }
  })
  controls.append(button)
  buttons.set(label, button)
}

let nodeSequence = 0

let edgeSequence = 0

addButton('Undo', controller.undo)

addButton('Redo', controller.redo)

addButton('Add node', () => {
  nodeSequence += 1

  return controller.addNodes([
    {
      id: `new-${nodeSequence}`,
      label: 'Added node',
      position: { x: 250, y: 250 },
      size: { width: 150, height: 60 },
      handles: [
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'out', kind: 'source', side: 'right' },
      ],
    },
  ])
})

addButton('Add edge', () => {
  edgeSequence += 1

  return controller.addEdges([
    {
      id: `new-edge-${edgeSequence}`,
      source: 'a',
      target: 'b',
    },
  ])
})

addButton('Delete node', () => controller.deleteElements({ nodeIds: ['b'] }))

addButton('Delete edge', () => controller.deleteElements({ edgeIds: ['ab'] }))

addButton('Move node', () =>
  controller.updateNode('a', { position: { x: 180, y: 160 } })
)

addButton('Reject edit', () => {
  const latest = proposals.at(-1)

  if (latest?.context !== undefined) {
    controller.rejectHistory(latest.context.transactionId)
  }
})

addButton('Dispose', () => controller.destroyAsync())

const renderStatus = (status: FlowHistoryStatus): void => {
  const undo = buttons.get('Undo')
  const redo = buttons.get('Redo')

  if (undo !== undefined) {
    undo.disabled = !status.canUndo
  }

  if (redo !== undefined) {
    redo.disabled = !status.canRedo
  }

  statusElement.textContent = JSON.stringify(status)
}

controller.subscribeHistory(renderStatus)

renderStatus(controller.getHistoryStatus())

const input = document.createElement('input')

input.className = 'history-native-input'

input.setAttribute('aria-label', 'Native undo text')

input.placeholder = 'Type here for native undo'

controller.overlayPortal.append(input)

globalThis.flowHistoryFixture = {
  controller,
  isolated,
  proposals,
  setAcceptProposals: (accept) => {
    acceptProposals = accept
  },
  acceptLatest: (echoContext = true) => {
    const latest = proposals.at(-1)

    if (latest !== undefined) {
      controller.update(
        latest.document,
        echoContext ? latest.context : undefined
      )
    }
  },
  rejectLatest: () => {
    const latest = proposals.at(-1)

    if (latest?.context !== undefined) {
      controller.rejectHistory(latest.context.transactionId)
    }
  },
}

window.addEventListener(
  'pagehide',
  () => {
    controller.destroy()
    isolated.destroy()
  },
  { once: true }
)
