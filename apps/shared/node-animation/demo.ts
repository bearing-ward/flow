import {
  createFlowLayoutSession,
  decodeFlowDocument,
  defaultFlowLayoutSettings,
  flowLayoutRevision,
} from '@flow/core'
import type {
  FlowDocument,
  FlowEditTransactionInput,
  FlowHistoryStatus,
  FlowLayoutInput,
  FlowNodeAnimationRequest,
  FlowNodeAnimationResult,
  Viewport,
} from '@flow/core'
import { runLayoutEngine } from '@flow/layout'
import { Effect } from 'effect'

import './style.css'

export const animationDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: ['a', 'b', 'c'].map((id, index) => ({
        id,
        label: id.toUpperCase(),
        position: { x: 60, y: 60 + index * 110 },
        size: { width: 140, height: 50 },
        style: { width: '140px', height: '50px', boxSizing: 'border-box' },
        data: { opaque: { preserved: ['animation', 159] } },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      })),
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          label: 'A to B',
          path: 'straight',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
        {
          id: 'bc',
          source: 'b',
          target: 'c',
          label: 'B to C',
          path: 'straight',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
      ],
    })
  )

export interface NodeAnimationDemo {
  readonly read: () => Promise<{
    readonly document: FlowDocument
    readonly input: FlowLayoutInput
  }>
  readonly animate: (
    request: FlowNodeAnimationRequest
  ) => Promise<FlowNodeAnimationResult>
  readonly edit: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly undo: () => void
  readonly redo: () => void
  readonly copy: () => void
  readonly paste: () => void
  readonly viewport: (value: Viewport) => void
  readonly dispose: () => void
}

declare global {
  var flowNodeAnimationDemo: NodeAnimationDemo | undefined
}

export const mountNodeAnimationControls = (owner: NodeAnimationDemo) => {
  globalThis.flowNodeAnimationDemo = owner
  const toolbar = document.querySelector('#animation-controls')
  const status = document.querySelector<HTMLElement>('#animation-status')

  if (toolbar === null || status === null) {
    throw new Error('Missing animation controls')
  }

  const session = createFlowLayoutSession()
  const abort = new AbortController()
  let duration = 300
  let sequence = 0
  let disposed = false

  const dispose = () => {
    disposed = true
    sequence += 1
    session.dispose()
    abort.abort()
    status.dataset.state = 'disposed'
  }

  const toggle = async (direction: 'TB' | 'LR') => {
    sequence += 1
    const ticket = sequence
    status.dataset.state = 'pending'
    const state = await owner.read()
    let current = flowLayoutRevision(state.document, state.input)

    const result = await Effect.runPromise(
      session.run(
        {
          revision: current,
          settings: { ...defaultFlowLayoutSettings, direction },
          input: state.input,
        },
        (request) =>
          runLayoutEngine(request).pipe(
            Effect.flatMap((layout) =>
              Effect.promise(async () => {
                const latest = await owner.read()
                current = flowLayoutRevision(latest.document, latest.input)

                return {
                  ...layout,
                  positions: new Map(
                    [...layout.positions].map(([id, point]) => [
                      id,
                      { x: point.x + 60, y: point.y + 60 },
                    ])
                  ),
                }
              })
            )
          ),
        () => current
      )
    )

    if (disposed || ticket !== sequence || result.kind === 'discarded') {
      return
    }

    status.dataset.state = 'running'
    status.dataset.direction = direction
    const outcome = await owner.animate({ result: result.result, duration })

    if (!disposed && ticket === sequence) {
      status.dataset.state = outcome.kind
      status.textContent = `${direction}: ${outcome.kind}`
    }
  }

  const button = (label: string, action: () => void) => {
    const element = document.createElement('button')
    element.textContent = label
    element.addEventListener(
      'click',
      () => {
        void action()
      },
      { signal: abort.signal }
    )
    toolbar.append(element)
  }

  button('Horizontal', () => toggle('LR'))
  button('Vertical', () => toggle('TB'))
  const input = document.createElement('input')
  input.type = 'number'
  input.value = '300'
  input.min = '0'
  input.setAttribute('aria-label', 'Animation duration')
  input.addEventListener(
    'change',
    () => {
      duration = input.valueAsNumber
    },
    { signal: abort.signal }
  )
  toolbar.append(input)
  button('Undo', owner.undo)
  button('Redo', owner.redo)
  button('Copy', owner.copy)
  button('Paste', owner.paste)
  button('Pan and zoom', () => owner.viewport({ x: 45, y: 35, zoom: 0.8 }))
  button('Remove C', () =>
    owner.edit({ operations: [{ kind: 'delete-elements', nodeIds: ['c'] }] })
  )
  button('Dispose', () => {
    dispose()
    owner.dispose()
  })

  status.dataset.state = 'ready'

  return { dispose }
}
