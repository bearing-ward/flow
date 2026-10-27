import type { WorkflowRunOwner } from './run-owner.ts'
import type { WorkflowValidationSnapshot } from './validation.ts'

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
  section.append(summary, events)
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

    for (const output of owner.panel.querySelectorAll<HTMLTextAreaElement>(
      '[data-run-output]'
    )) {
      const node = state?.nodes[output.dataset.runOutput ?? '']
      output.value =
        node?.state === 'succeeded'
          ? JSON.stringify(node.outputs)
          : 'No run output.'
    }
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
      run.remove()
      cancel.remove()
      section.remove()
      void owner.runs.dispose()
    },
  }
}
