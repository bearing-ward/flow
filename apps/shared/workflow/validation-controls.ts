import type { FlowDocument, FlowEditTransaction } from '@flow/core'
import {
  prepareWorkflowExecution,
  prepareWorkflowConnection,
  WorkflowRevisionError,
} from '@flow/workflow'
import type { WorkflowIssue, WorkflowNodeData } from '@flow/workflow'
import { Effect, Result } from 'effect'

import { workflowConnectionOptions } from './validation.ts'
import type { WorkflowValidationSnapshot } from './validation.ts'

const issueNode = (issue: WorkflowIssue) => {
  if ('nodeId' in issue) {
    return issue.nodeId
  }

  if (issue.code === 'cycle') {
    return issue.nodeIds[0]
  }
}

const fieldLabel = (
  issue: WorkflowIssue,
  snapshot: WorkflowValidationSnapshot
) => {
  const data = snapshot.document.nodes.find(
    (node) => node.id === issueNode(issue)
  )?.data?.workflow

  if (issue.code === 'invalid-setting') {
    if (issue.field === 'value') {
      return 'Compare value'
    }

    return data?.kind === 'generate-image' ? 'Image model' : 'Text model'
  }

  if (
    issue.code === 'missing-input' &&
    (data?.kind === 'generate-text' || data?.kind === 'generate-image') &&
    issue.portId === data.ports.prompt
  ) {
    return data.kind === 'generate-text' ? 'Prompt' : 'Image prompt'
  }
}

export const mountWorkflowValidation = (owner: {
  readonly controls: Element
  readonly panel: Element
  readonly canvas: HTMLElement
  readonly button: (
    parent: Element,
    label: string,
    action: () => Promise<void> | void
  ) => HTMLButtonElement
  readonly snapshot: () => Promise<WorkflowValidationSnapshot>
  readonly edit: (transaction: FlowEditTransaction) => Promise<void>
  readonly configure: (
    id: FlowDocument['nodes'][number]['id'],
    data: WorkflowNodeData
  ) => void
  readonly changed: () => Promise<void>
  readonly allocate: () => string
}) => {
  const validation = document.createElement('section')
  validation.setAttribute('aria-label', 'Workflow validation')
  validation.id = 'validation'
  const reportOutput = document.createElement('pre')
  reportOutput.id = 'validation-report'
  const issueList = document.createElement('div')
  issueList.setAttribute('aria-live', 'polite')
  const preparation = document.createElement('output')
  preparation.setAttribute('aria-label', 'Execution preparation')
  const connectionControls = document.createElement('div')
  connectionControls.setAttribute('aria-label', 'Connect workflow ports')
  const help = document.createElement('p')
  help.textContent =
    'Resolve the issues before preparing a run. Use the port controls for data and trigger connections. Canvas gestures create data connections.'
  validation.append(
    help,
    reportOutput,
    issueList,
    preparation,
    connectionControls
  )
  owner.canvas.closest('#layout')?.after(validation)
  let latestRevision: number | undefined

  const sourcePort = document.createElement('select')
  sourcePort.setAttribute('aria-label', 'Source port')
  const targetPort = document.createElement('select')
  targetPort.setAttribute('aria-label', 'Target port')
  connectionControls.append(sourcePort, targetPort)

  const annotateFields = (id: string, snapshot: WorkflowValidationSnapshot) => {
    for (const previous of owner.panel.querySelectorAll(
      '[data-workflow-field-issue]'
    )) {
      previous.remove()
    }

    const controls = [
      ...owner.panel.querySelectorAll<HTMLElement>('[data-field]'),
    ]

    for (const [index, control] of controls.entries()) {
      const issues = snapshot.report.issues.filter(
        (issue) =>
          issueNode(issue) === id &&
          fieldLabel(issue, snapshot) === control.dataset.field
      )

      control.setAttribute('aria-invalid', String(issues.length > 0))

      if (issues.length > 0) {
        const message = document.createElement('p')
        message.dataset.workflowFieldIssue = ''
        message.id = `workflow-field-issue-${index}`
        message.textContent = issues
          .map((issue) =>
            issue.code === 'invalid-setting'
              ? `Enter a valid ${control.dataset.field}.`
              : 'Connect this input or enter a prompt.'
          )
          .join(' ')
        control.closest('label')?.after(message)
        control.setAttribute('aria-describedby', message.id)
      } else {
        control.removeAttribute('aria-describedby')
      }
    }
  }

  const focusIssue = (
    issue: WorkflowIssue,
    snapshot: WorkflowValidationSnapshot
  ) => {
    const id = issueNode(issue)

    const data = snapshot.document.nodes.find((node) => node.id === id)?.data
      ?.workflow

    if (id === undefined || data === undefined) {
      return
    }

    owner.configure(id, data)
    const label = fieldLabel(issue, snapshot)

    const control = [
      ...owner.panel.querySelectorAll<HTMLElement>('[data-field]'),
    ].find((element) => element.dataset.field === label)

    if (control !== undefined) {
      control.focus()
    } else if ('portId' in issue) {
      targetPort.value = JSON.stringify([id, issue.portId])
      targetPort.focus()
    } else {
      const node = [
        ...owner.canvas.querySelectorAll<HTMLElement>('[data-node-id]'),
      ].find((element) => element.dataset.nodeId === id)

      node?.focus()
    }
  }

  const renderConnections = (snapshot: WorkflowValidationSnapshot) => {
    for (const [select, direction] of [
      [sourcePort, 'source'],
      [targetPort, 'target'],
    ] as const) {
      const previous = select.value
      select.replaceChildren()

      for (const option of workflowConnectionOptions(snapshot, direction)) {
        const element = document.createElement('option')
        element.value = JSON.stringify([option.nodeId, option.port.id])
        element.textContent = option.label
        select.append(element)
      }

      if ([...select.options].some((option) => option.value === previous)) {
        select.value = previous
      }
    }
  }

  owner.button(connectionControls, 'Connect ports', async () => {
    const current = await owner.snapshot()

    const source = workflowConnectionOptions(current, 'source').find(
      (option) =>
        JSON.stringify([option.nodeId, option.port.id]) === sourcePort.value
    )

    const target = workflowConnectionOptions(current, 'target').find(
      (option) =>
        JSON.stringify([option.nodeId, option.port.id]) === targetPort.value
    )

    if (source === undefined || target === undefined) {
      return
    }

    const result = await Effect.runPromise(
      Effect.result(
        prepareWorkflowConnection(current.document, {
          id: owner.allocate(),
          source: source.nodeId,
          sourceHandle: source.port.id,
          target: target.nodeId,
          targetHandle: target.port.id,
          data: {
            workflow: {
              version: 1,
              kind: source.port.valueType === 'trigger' ? 'trigger' : 'data',
            },
          },
        })
      )
    )

    if (Result.isFailure(result)) {
      throw result.failure
    }

    await owner.edit(result.success)
    await owner.changed()
  })

  const runButton = owner.button(owner.controls, 'Prepare run', async () => {
    if (latestRevision === undefined) {
      return
    }

    const expectedRevision = latestRevision
    const current = await owner.snapshot()

    const result = await Effect.runPromise(
      Effect.result(prepareWorkflowExecution(current, expectedRevision))
    )

    if (Result.isFailure(result)) {
      preparation.textContent =
        result.failure instanceof WorkflowRevisionError
          ? 'Accepted revision changed. Prepare again.'
          : 'Run blocked. Resolve the workflow issues.'

      return
    }

    preparation.textContent = JSON.stringify({
      revision: result.success.revision,
      nodeIds: result.success.steps.map((step) => step.nodeId),
      policy: result.success.policy,
    })
  })

  return {
    annotateFields,
    refresh: (snapshot: WorkflowValidationSnapshot) => {
      const changed = latestRevision !== snapshot.revision
      latestRevision = snapshot.revision
      reportOutput.textContent = JSON.stringify(snapshot.report)

      if (changed) {
        preparation.textContent =
          snapshot.report.issues.length > 0
            ? 'Run blocked. Resolve the workflow issues.'
            : ''
      }

      runButton.disabled = snapshot.report.issues.length > 0
      runButton.setAttribute(
        'aria-disabled',
        String(snapshot.report.issues.length > 0)
      )
      issueList.replaceChildren()

      for (const issue of snapshot.report.issues) {
        owner.button(issueList, JSON.stringify(issue), () =>
          focusIssue(issue, snapshot)
        )
      }

      renderConnections(snapshot)
    },
    dispose: () => {
      validation.remove()
      runButton.remove()
    },
  }
}
