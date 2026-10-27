import { localWorkflowImageAsset } from '@flow/workflow'
import type { WorkflowRunState, WorkflowNodeEvent } from '@flow/workflow'

import type { WorkflowRunOwner } from './run-owner.ts'
import type { WorkflowValidationSnapshot } from './validation.ts'

const outputText = (node: WorkflowNodeEvent | undefined) => {
  if (node?.state === 'succeeded') {
    return JSON.stringify(node.outputs)
  }

  if (node?.state === 'failed') {
    return `Failed: ${node.failure.code}`
  }

  return node?.state === 'running' && node.text !== undefined
    ? node.text
    : 'No run output.'
}

const renderOutputs = (panel: Element, state: WorkflowRunState | null) => {
  for (const output of panel.querySelectorAll<HTMLTextAreaElement>(
    '[data-run-output]'
  )) {
    const node = state?.nodes[output.dataset.runOutput ?? '']
    output.value = outputText(node)
  }

  for (const preview of panel.querySelectorAll<HTMLImageElement>(
    '[data-run-image]'
  )) {
    const node = state?.nodes[preview.dataset.runImage ?? '']

    const image =
      node?.state === 'succeeded'
        ? Object.values(node.outputs).find((value) => value.kind === 'image')
        : undefined

    if (
      image?.kind === 'image' &&
      image.assetId === localWorkflowImageAsset.assetId
    ) {
      preview.src = localWorkflowImageAsset.dataUrl
      preview.width = image.width
      preview.height = image.height
      preview.hidden = false
    } else {
      preview.removeAttribute('src')
      preview.hidden = true
    }
  }
}

export const mountWorkflowRunControls = (owner: {
  readonly runs: WorkflowRunOwner
  readonly controls: Element
  readonly canvas: HTMLElement
  readonly panel: Element
  readonly snapshot: () => Promise<WorkflowValidationSnapshot>
  readonly button: (
    parent: Element,
    label: string,
    action: () => Promise<void> | void
  ) => HTMLButtonElement
}) => {
  const section = document.createElement('section')
  section.id = 'workflow-run'
  section.setAttribute('aria-label', 'Offline workflow run')
  const summary = document.createElement('output')
  summary.setAttribute('aria-label', 'Run status')
  summary.setAttribute('aria-live', 'polite')
  const events = document.createElement('pre')
  events.id = 'run-state'
  events.setAttribute('aria-label', 'Transient run state')
  const providerLabel = document.createElement('p')
  providerLabel.textContent = `Offline provider: ${owner.runs.capabilities.providerId}. Deterministic local text and image simulation.`
  section.append(providerLabel, summary, events)
  owner.canvas.closest('#layout')?.after(section)
  let latest: WorkflowValidationSnapshot | undefined

  const run = owner.button(owner.controls, 'Run', async () => {
    const expected = latest?.revision

    if (expected === undefined) {
      return
    }

    try {
      await owner.runs.start(await owner.snapshot(), expected)
    } catch {
      summary.textContent =
        'Run blocked. Resolve issues or retry the accepted revision.'
    }
  })

  const cancel = owner.button(owner.controls, 'Cancel', owner.runs.cancel)

  const render = () => {
    const state = owner.runs.state()
    const active = state?.state === 'queued' || state?.state === 'running'
    summary.textContent =
      state === null
        ? 'Offline simulation. No active run.'
        : `Offline simulation: ${state.state}`
    events.textContent = JSON.stringify(state)
    cancel.disabled = !active
    run.disabled = active || (latest?.report.issues.length ?? 1) > 0
    run.setAttribute(
      'aria-describedby',
      latest?.report.issues.length === 0 ? 'workflow-run' : 'validation-report'
    )

    renderOutputs(owner.panel, state)
  }

  const stop = owner.runs.subscribe(render)
  render()

  return {
    refresh: (snapshot: WorkflowValidationSnapshot) => {
      latest = snapshot
      render()
    },
    render,
    dispose: () => {
      stop()

      for (const preview of owner.panel.querySelectorAll<HTMLImageElement>(
        '[data-run-image]'
      )) {
        preview.removeAttribute('src')
        preview.hidden = true
      }

      run.remove()
      cancel.remove()
      section.remove()
      void owner.runs.dispose()
    },
  }
}
