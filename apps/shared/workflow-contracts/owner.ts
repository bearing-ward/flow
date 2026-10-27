import type { FlowDocument } from '@flow/core'
import {
  baseWorkflowFixture,
  aiWorkflowFixture,
  decodeWorkflowDocument,
  projectWorkflowDocument,
} from '@flow/workflow'
import { Effect } from 'effect'

export interface WorkflowCanvasOwner {
  readonly replace: (document: FlowDocument) => Promise<void>
  readonly dispose: () => void
}

export const initialWorkflowDocument = () =>
  Effect.runPromise(decodeWorkflowDocument(baseWorkflowFixture)).then(
    projectWorkflowDocument
  )

export const showAcceptedWorkflow = (document: FlowDocument) => {
  const output = globalThis.document.querySelector('#accepted')

  if (output !== null) {
    output.textContent = JSON.stringify(document)
  }
}

/** Each host owns its accepted document; imports share one package decode boundary. */
export const mountWorkflowImports = (owner: WorkflowCanvasOwner) => {
  const input = document.querySelector<HTMLTextAreaElement>('#import')
  const status = document.querySelector('#status')

  if (input === null || status === null) {
    throw new Error('Missing workflow controls')
  }

  const listeners: (() => void)[] = []

  const bind = (id: string, run: () => Promise<void>) => {
    const button = document.querySelector<HTMLButtonElement>(`#${id}`)

    if (button === null) {
      throw new Error(`Missing ${id}`)
    }

    const listener = () => {
      void run().catch(() => {
        status.textContent = 'Rejected document'
      })
    }

    button.addEventListener('click', listener)
    listeners.push(() => button.removeEventListener('click', listener))
  }

  const load = async (text: string) => {
    const accepted = await Effect.runPromise(
      decodeWorkflowDocument(JSON.parse(text))
    )

    await owner.replace(projectWorkflowDocument(accepted))
    input.value = text
    status.textContent = 'Accepted document'
  }

  bind('base', () => load(JSON.stringify(baseWorkflowFixture)))
  bind('ai', () => load(JSON.stringify(aiWorkflowFixture)))
  bind('accept', () => load(input.value))

  const dispose = () => {
    for (const stop of listeners.splice(0)) {
      stop()
    }

    owner.dispose()
    status.textContent = 'Disposed'
  }

  bind('dispose', () => {
    dispose()

    return Promise.resolve()
  })
  window.addEventListener('pagehide', dispose, { once: true })
  listeners.push(() => window.removeEventListener('pagehide', dispose))
  input.value = JSON.stringify(baseWorkflowFixture)
  status.textContent = 'Accepted document'
}
