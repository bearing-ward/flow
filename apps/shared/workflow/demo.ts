import {
  getEdgesGeometry,
  copyFlowSelection,
  createFlowClipboard,
  pasteFlowGraphFragment,
  prepareFlowEdit,
  XYPositionSchema,
} from '@flow/core'
import type { FlowDocument, FlowEditTransaction, Viewport } from '@flow/core'
import {
  baseWorkflowFixture,
  aiWorkflowFixture,
  createWorkflowNode,
  decodeWorkflowDocument,
  prepareWorkflowEdit,
  workflowKinds,
  WorkflowKindSchema,
  WorkflowNodeDataSchema,
  workflowClipboardExtension,
  workflowPorts,
  WorkflowValidationError,
  WorkflowDecodeError,
} from '@flow/workflow'
import type {
  WorkflowEdit,
  WorkflowIds,
  WorkflowNodeData,
} from '@flow/workflow'
import { Effect, Option, Result, Schema as S } from 'effect'

import { mountWorkflowValidation } from './validation-controls.ts'
import type { WorkflowValidationSnapshot } from './validation.ts'

interface WorkflowValidationControlsOwner {
  controls?: ReturnType<typeof mountWorkflowValidation>
}

export interface WorkflowOwner {
  readonly snapshot: () => Promise<WorkflowValidationSnapshot>
  readonly document: () => Promise<FlowDocument>
  readonly replace: (document: FlowDocument) => Promise<void>
  readonly edit: (transaction: FlowEditTransaction) => Promise<void>
  readonly flowToScreen: (
    point: typeof XYPositionSchema.Type
  ) => Promise<typeof XYPositionSchema.Type>
  readonly screenToFlow: (
    point: typeof XYPositionSchema.Type
  ) => Promise<typeof XYPositionSchema.Type>
  readonly viewport: (value: Viewport) => Promise<void>
  readonly undo: () => void
  readonly redo: () => void
  readonly dispose: () => void
}

export const workflowData = (node: FlowDocument['nodes'][number]) =>
  Option.getOrUndefined(
    S.decodeUnknownOption(WorkflowNodeDataSchema)(node.data?.workflow)
  )

export const workflowCaption = (node: FlowDocument['nodes'][number]) => {
  const data = workflowData(node)

  return data === undefined
    ? node.label
    : `${data.kind}\n${workflowPorts(data)
        .map((port) => port.role)
        .join(' · ')}`
}

export const workflowDocument = (): FlowDocument => {
  let n = 0

  const ids: WorkflowIds = {
    allocate: (namespace) => `seed-${namespace}-${(n += 1)}`,
  }

  const initial = createWorkflowNode(
    { kind: 'initial', position: { x: 40, y: 80 } },
    ids
  )

  const output = createWorkflowNode(
    { kind: 'output', position: { x: 540, y: 80 } },
    ids
  )

  return Effect.runSync(
    decodeWorkflowDocument({
      nodes: [initial, output],
      edges: [
        {
          id: 'seed-edge',
          source: initial.id,
          sourceHandle: initial.handles?.[0]?.id,
          target: output.id,
          targetHandle: output.handles?.[0]?.id,
          data: { workflow: { version: 1, kind: 'data' } },
        },
      ],
    })
  )
}

export const mountWorkflowControls = (owner: WorkflowOwner) => {
  const palette = document.querySelector('#palette')
  const controls = document.querySelector('#controls')
  const members = document.querySelector('#members')
  const edges = document.querySelector('#edges')
  const panel = document.querySelector('#configuration')
  const accepted = document.querySelector('#accepted')
  const status = document.querySelector('#status')
  const canvas = document.querySelector<HTMLElement>('#app')

  if (
    palette === null ||
    controls === null ||
    members === null ||
    edges === null ||
    panel === null ||
    accepted === null ||
    status === null ||
    canvas === null
  ) {
    throw new Error('Missing workflow editor controls')
  }

  const edgeActions = document.createElement('div')
  edgeActions.className = 'workflow-edge-actions nodrag nopan'
  canvas.append(edgeActions)

  const validationState: WorkflowValidationControlsOwner = {}
  let selectedNode: FlowDocument['nodes'][number]['id'] | undefined
  let latestSnapshot: WorkflowValidationSnapshot | undefined
  let renderRevision = 0

  const abort = new AbortController()
  let disposed = false
  let clipboard = createFlowClipboard()
  let sequence = 0

  const ids: WorkflowIds = {
    allocate: (namespace) => `workflow-${namespace}-${(sequence += 1)}`,
  }

  let chain = Promise.resolve(true)

  const run = (action: () => Promise<void> | void) => {
    chain = chain.then(async () => {
      if (disposed) {
        return false
      }

      try {
        status.textContent = 'Accepted edit'
        await action()

        return true
      } catch (error) {
        if (error instanceof WorkflowValidationError) {
          status.textContent = `Rejected edit. ${JSON.stringify(error.issues)}`
        } else if (error instanceof WorkflowDecodeError) {
          status.textContent =
            'Rejected document. Invalid document encoding or settings.'
        } else {
          status.textContent = 'Rejected edit. The graph is unchanged.'
        }

        return false
      }
    })
  }

  const button = (
    parent: Element,
    label: string,
    action: () => Promise<void> | void
  ) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.addEventListener('click', () => run(action), {
      signal: abort.signal,
    })
    parent.append(element)

    return element
  }

  const actions = {
    copy: async (): Promise<void> => {
      clipboard = await Effect.runPromise(
        copyFlowSelection(await owner.document())
      )
    },
    paste: async (): Promise<void> => {
      const current = await owner.document()

      const pasted = pasteFlowGraphFragment(clipboard, current, {}, [
        workflowClipboardExtension,
      ])

      const result = await Effect.runPromise(
        prepareFlowEdit(current, pasted.transaction)
      )

      await Effect.runPromise(decodeWorkflowDocument(result.document))
      await owner.edit(pasted.transaction)
      clipboard = pasted.state
      await actions.refresh()
    },
    append: async (
      edgeId: FlowDocument['edges'][number]['id']
    ): Promise<void> => {
      const current = await owner.document()

      const geometry = getEdgesGeometry(current).find(
        (edge) => edge.id === edgeId
      )

      if (geometry === undefined) {
        return
      }

      await actions.edit({
        kind: 'append',
        edgeId,
        nodeKind: 'transform',
        position: geometry.label,
      })
    },
    edit: async (command: WorkflowEdit): Promise<void> => {
      const transaction = await Effect.runPromise(
        prepareWorkflowEdit(await owner.document(), command, ids)
      )

      await owner.edit(transaction)
      await actions.refresh()
    },
    configure: (
      id: FlowDocument['nodes'][number]['id'],
      data: WorkflowNodeData
    ) => {
      selectedNode = id
      panel.replaceChildren()
      const title = document.createElement('h2')
      title.textContent = `Configure ${data.kind}`
      panel.append(title)

      const text = (label: string, value: string, multiline = false) => {
        const wrapper = document.createElement('label')
        wrapper.textContent = label

        const input = multiline
          ? document.createElement('textarea')
          : document.createElement('input')

        input.value = value
        input.dataset.field = label
        wrapper.append(input)
        panel.append(wrapper)

        return input
      }

      const choice = (
        label: string,
        value: string,
        options: readonly string[]
      ) => {
        const wrapper = document.createElement('label')
        wrapper.textContent = label
        const input = document.createElement('select')

        for (const option of options) {
          const item = document.createElement('option')
          item.value = option
          item.textContent = option
          input.append(item)
        }

        input.value = value
        input.dataset.field = label
        wrapper.append(input)
        panel.append(wrapper)

        return input
      }

      let read: () => typeof WorkflowNodeDataSchema.Encoded

      switch (data.kind) {
        case 'initial': {
          const value = text('Value', data.config.value)
          read = () => ({ ...data, config: { value: value.value } })
          break
        }

        case 'transform': {
          const operation = choice('Operation', data.config.operation, [
            'uppercase',
            'lowercase',
            'trim',
          ])

          read = () =>
            S.decodeUnknownSync(WorkflowNodeDataSchema)({
              ...data,
              config: { operation: operation.value },
            })
          break
        }

        case 'branch': {
          const operator = choice('Operator', data.config.operator, [
            'equals',
            'contains',
          ])

          const value = text('Compare value', data.config.value)
          read = () =>
            S.decodeUnknownSync(WorkflowNodeDataSchema)({
              ...data,
              config: { operator: operator.value, value: value.value },
            })
          break
        }

        case 'join': {
          const separator = text('Separator', data.config.separator)
          read = () => ({ ...data, config: { separator: separator.value } })
          break
        }

        case 'output': {
          const format = choice('Format', data.config.format, ['text', 'image'])
          read = () =>
            S.decodeUnknownSync(WorkflowNodeDataSchema)({
              ...data,
              config: { format: format.value },
            })
          break
        }

        case 'text-input': {
          const input = text('Text', data.config.text, true)
          input.readOnly = data.config.locked

          const locked = choice('Text lock', String(data.config.locked), [
            'false',
            'true',
          ])

          read = () => ({
            ...data,
            config: { text: input.value, locked: locked.value === 'true' },
          })
          break
        }

        case 'generate-text': {
          const modelId = text('Text model', data.config.modelId)

          const temperature = text(
            'Temperature',
            String(data.config.temperature)
          )

          const system = text('System', data.config.system, true)
          const prompt = text('Prompt', data.config.prompt, true)
          read = () => ({
            ...data,
            config: {
              modelId: modelId.value,
              temperature: Number(temperature.value),
              system: system.value,
              prompt: prompt.value,
            },
          })
          break
        }

        case 'generate-image': {
          const modelId = text('Image model', data.config.modelId)
          const width = text('Width', String(data.config.width))
          const height = text('Height', String(data.config.height))
          const prompt = text('Image prompt', data.config.prompt, true)
          read = () => ({
            ...data,
            config: {
              modelId: modelId.value,
              width: Number(width.value),
              height: Number(height.value),
              prompt: prompt.value,
            },
          })
          break
        }

        case 'workflow-trigger': {
          const label = text('Trigger label', data.config.label)
          read = () => ({ ...data, config: { label: label.value } })
          break
        }

        default: {
          const exhaustive: never = data

          return exhaustive
        }
      }

      button(panel, 'Apply configuration', async () => {
        const workflow = S.decodeUnknownSync(WorkflowNodeDataSchema)(read())
        await actions.edit({ kind: 'configure', nodeId: id, workflow })
        actions.configure(id, workflow)
        panel.querySelector<HTMLElement>('input, textarea, select')?.focus()
      })
      button(panel, 'Delete and reconnect', async () => {
        await actions.edit({ kind: 'delete', nodeId: id, reconnect: true })
        panel.replaceChildren()
      })
      const output = document.createElement('textarea')
      output.readOnly = true
      output.setAttribute('aria-label', 'Run output')
      output.value = 'No run output.'
      panel.append(output)

      if (latestSnapshot !== undefined) {
        validationState.controls?.annotateFields(id, latestSnapshot)
      }
    },
    refresh: async (): Promise<void> => {
      const snapshot = await owner.snapshot()
      const current = snapshot.document

      if (disposed) {
        return
      }

      latestSnapshot = snapshot
      validationState.controls?.refresh(snapshot)

      if (selectedNode !== undefined) {
        validationState.controls?.annotateFields(selectedNode, snapshot)
      }

      renderRevision += 1
      const revision = renderRevision
      accepted.textContent = JSON.stringify(current)
      members.replaceChildren()
      edges.replaceChildren()

      for (const node of current.nodes) {
        const data = workflowData(node)

        if (data !== undefined) {
          button(members, `Configure ${node.id}`, () =>
            actions.configure(node.id, data)
          )
        }
      }

      for (const edge of current.edges) {
        const row = document.createElement('div')
        row.textContent = `${edge.source} to ${edge.target}`
        button(row, `Append transform on ${edge.id}`, () =>
          actions.append(edge.id)
        )
        edges.append(row)
      }

      const anchors = await Promise.all(
        getEdgesGeometry(current).map(async (geometry) => ({
          id: geometry.id,
          point: await owner.flowToScreen(geometry.label),
        }))
      )

      if (disposed || revision !== renderRevision) {
        return
      }

      edgeActions.replaceChildren()
      const bounds = canvas.getBoundingClientRect()

      for (const anchor of anchors) {
        const insert = button(edgeActions, '+', () => actions.append(anchor.id))
        insert.setAttribute(
          'aria-label',
          `Insert transform on edge ${anchor.id}`
        )
        insert.className = 'nodrag nopan'
        insert.style.left = `${anchor.point.x - bounds.left}px`
        insert.style.top = `${anchor.point.y - bounds.top}px`
      }
    },
  }

  validationState.controls = mountWorkflowValidation({
    controls,
    panel,
    canvas,
    button,
    snapshot: owner.snapshot,
    edit: owner.edit,
    configure: actions.configure,
    changed: actions.refresh,
    allocate: () => ids.allocate('edge'),
  })

  const add = async (
    nodeKind: typeof WorkflowKindSchema.Type,
    point?: typeof XYPositionSchema.Type
  ) => {
    const bounds = canvas.getBoundingClientRect()

    const position = await owner.screenToFlow(
      point ??
        S.decodeUnknownSync(XYPositionSchema)({
          x: bounds.left + 260,
          y: bounds.top + 240,
        })
    )

    await actions.edit({ kind: 'add', nodeKind, position })
    panel.querySelector<HTMLElement>('input, textarea, select')?.focus()
  }

  for (const kind of workflowKinds) {
    const item = button(palette, `Add ${kind}`, () => add(kind))
    item.draggable = true
    item.addEventListener(
      'dragstart',
      (event) =>
        event.dataTransfer?.setData('application/x-flow-workflow', kind),
      { signal: abort.signal }
    )
  }

  canvas.addEventListener(
    'dragover',
    (event) => {
      event.preventDefault()
    },
    { signal: abort.signal }
  )
  canvas.addEventListener(
    'drop',
    (event) => {
      event.preventDefault()

      const kind = S.decodeUnknownOption(WorkflowKindSchema)(
        event.dataTransfer?.getData('application/x-flow-workflow')
      )

      if (Option.isSome(kind)) {
        run(() =>
          add(
            kind.value,
            S.decodeUnknownSync(XYPositionSchema)({
              x: event.clientX,
              y: event.clientY,
            })
          )
        )
      }
    },
    { signal: abort.signal }
  )

  const loadFixture = async (
    fixture: typeof baseWorkflowFixture | typeof aiWorkflowFixture
  ) => {
    const current = await Effect.runPromise(decodeWorkflowDocument(fixture))
    await owner.replace(current)
    panel.replaceChildren()
    await actions.refresh()
  }

  const importInput = document.createElement('textarea')
  importInput.setAttribute('aria-label', 'Workflow JSON')
  importInput.id = 'workflow-import'
  accepted.after(importInput)
  button(controls, 'Import workflow', async () => {
    const result = await Effect.runPromise(
      Effect.result(decodeWorkflowDocument(JSON.parse(importInput.value)))
    )

    if (Result.isFailure(result)) {
      throw result.failure
    }

    const current = result.success
    await owner.replace(current)
    panel.replaceChildren()
    selectedNode = undefined
    await actions.refresh()
  })
  button(controls, 'Load base workflow', () => loadFixture(baseWorkflowFixture))
  button(controls, 'Load AI workflow', () => loadFixture(aiWorkflowFixture))
  button(controls, 'Undo', async () => {
    owner.undo()
    await actions.refresh()
  })
  button(controls, 'Redo', async () => {
    owner.redo()
    await actions.refresh()
  })
  button(controls, 'Pan and zoom', async () => {
    await owner.viewport({ x: 90, y: 40, zoom: 0.75 })
  })
  button(controls, 'Copy selected', actions.copy)
  button(controls, 'Paste', actions.paste)
  button(controls, 'Select all', async () => {
    const current = await owner.document()
    await owner.edit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: current.nodes.map((node) => ({ ...node, selected: true })),
        },
      ],
    })
    await actions.refresh()
  })

  canvas.tabIndex = -1
  canvas.addEventListener(
    'keydown',
    (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"]'
        ) !== null
      ) {
        return
      }

      const key = event.key.toLowerCase()

      if (key !== 'c' && key !== 'v') {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
      run(key === 'c' ? actions.copy : actions.paste)
    },
    { capture: true, signal: abort.signal }
  )

  canvas.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) {
        return
      }

      const id = event.target.closest<HTMLElement>('[data-testid="flow-node"]')
        ?.dataset.nodeId

      if (id !== undefined) {
        run(async () => {
          const current = await owner.document()

          const node = current.nodes.find((item) => item.id === id)

          if (node === undefined) {
            return
          }

          const data = workflowData(node)

          if (data !== undefined) {
            actions.configure(node.id, data)
          }
        })
      }
    },
    { signal: abort.signal }
  )

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    abort.abort()
    edgeActions.remove()
    validationState.controls?.dispose()
    importInput.remove()
  }

  button(controls, 'Dispose', () => {
    dispose()
    owner.dispose()
    status.textContent = 'Disposed'
  })
  window.addEventListener(
    'pagehide',
    () => {
      dispose()
      owner.dispose()
    },
    { once: true, signal: abort.signal }
  )
  void actions.refresh()

  return { refresh: actions.refresh, dispose }
}
