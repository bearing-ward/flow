import {
  createFlowTreeEditor,
  createFlowTreeNode,
  decodeFlowTree,
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  flowTreeData,
  InvalidFlowTree,
  projectFlowTree,
} from '@flow/core'
import type { FlowDocument, FlowTreeEditSchema } from '@flow/core'
import { runLayoutEngine } from '@flow/layout'
import { Effect } from 'effect'

import type { NodeAnimationDemo } from '../node-animation/demo.ts'

import './style.css'

export const treeDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowTree({
      nodes: [
        createFlowTreeNode({
          id: 'root',
          label: 'Root',
          position: { x: 250, y: 30 },
        }),
        createFlowTreeNode({
          id: 'branch',
          label: 'Branch',
          position: { x: 100, y: 170 },
        }),
        createFlowTreeNode({
          id: 'leaf',
          label: 'Leaf',
          position: { x: 100, y: 310 },
        }),
        createFlowTreeNode({
          id: 'placeholder',
          label: '+',
          placeholder: true,
          position: { x: 420, y: 170 },
        }),
      ].map((node) => ({
        ...node,
        data: { ...node.data, opaque: { keep: ['tree', 160] } },
        style: { width: '150px', height: '60px', boxSizing: 'border-box' },
      })),
      edges: [
        {
          id: 'root-branch',
          source: 'root',
          target: 'branch',
          label: 'kept edge',
          data: { opaque: { retained: [160, 'edge'] } },
          stroke: '#336699',
          path: 'straight',
        },
        {
          id: 'branch-leaf',
          source: 'branch',
          target: 'leaf',
          path: 'straight',
        },
        {
          id: 'root-placeholder',
          source: 'root',
          target: 'placeholder',
          path: 'straight',
        },
      ],
    })
  )

export interface TreeDemo extends NodeAnimationDemo {
  readonly tree: (command: typeof FlowTreeEditSchema.Encoded) => Promise<void>
}

declare global {
  var flowTreeDemo: TreeDemo | undefined
}

/** Recipe controls only; graph semantics and the entire edit workflow live in core. */
export const mountTreeControls = (owner: NodeAnimationDemo) => {
  const toolbar = document.querySelector('#tree-controls')
  const actions = document.querySelector<HTMLElement>('#tree-actions')
  const status = document.querySelector<HTMLElement>('#tree-status')
  const canvas = document.querySelector<HTMLElement>('#app')

  if (
    toolbar === null ||
    actions === null ||
    status === null ||
    canvas === null
  ) {
    throw new Error('Missing tree controls')
  }

  const editor = createFlowTreeEditor({ ...owner, engine: runLayoutEngine })
  const abort = new AbortController()
  let disposed = false
  let saved: unknown
  let sequence = 0
  let duration = 300
  let frame: number | undefined
  let focusedNode: string | undefined
  const controls = new Map<string, HTMLButtonElement>()
  const parent = document.createElement('select')
  parent.setAttribute('aria-label', 'Parent node')

  const submit = async (command: typeof FlowTreeEditSchema.Encoded) => {
    status.dataset.state = 'running'

    try {
      await Effect.runPromise(editor.edit(command, duration))

      if (!disposed) {
        status.dataset.state = 'ready'
        status.textContent = 'Tree updated'
      }
    } catch (error) {
      if (!disposed) {
        status.dataset.state = 'error'
        status.textContent =
          error instanceof InvalidFlowTree ? error.reason : String(error)
      }
    }
  }

  globalThis.flowTreeDemo = { ...owner, tree: submit }

  const add = async (parentId: string, placeholder = false) => {
    const { document } = await owner.read()

    do {
      sequence += 1
    } while (
      document.nodes.some(({ id }) => id === `child-${sequence}`) ||
      document.edges.some(({ id }) => id === `edge-${sequence}`)
    )

    await submit({
      kind: 'add-child',
      parentId,
      id: `child-${sequence}`,
      edgeId: `edge-${sequence}`,
      label: placeholder ? '+' : `Child ${sequence}`,
      placeholder,
    })
  }

  const button = (label: string, action: () => void | Promise<void>) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.addEventListener(
      'click',
      async () => {
        try {
          await action()
        } catch (error) {
          if (!disposed) {
            status.dataset.state = 'error'
            status.textContent =
              error instanceof InvalidFlowTree ? error.reason : String(error)
          }
        }
      },
      { signal: abort.signal }
    )
    toolbar.append(element)
  }

  button('Undo', owner.undo)
  button('Redo', owner.redo)
  button('Save', async () => {
    const state = await owner.read()
    saved = encodeVersionedFlowDocument(state.document)
  })
  button('Load', async () => {
    const document = await Effect.runPromise(
      decodeVersionedFlowDocument(saved).pipe(Effect.flatMap(decodeFlowTree))
    )

    await owner.edit({
      operations: [
        { kind: 'set-nodes', nodes: document.nodes },
        { kind: 'set-edges', edges: document.edges },
      ],
    })
  })
  button('Copy tree', async () => {
    const { document } = await owner.read()
    await owner.edit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: document.nodes.map((node) => ({ ...node, selected: true })),
        },
      ],
    })
    owner.copy()
  })
  button('Paste', owner.paste)
  toolbar.append(parent)
  button('Add child to parent', () => add(parent.value))
  button('Delete parent subtree', () =>
    submit({ kind: 'delete-subtree', nodeId: parent.value })
  )
  button('Create root', () =>
    submit({ kind: 'create-root', id: 'root', label: 'Root' })
  )
  button('Pan and zoom', () => owner.viewport({ x: 20, y: 10, zoom: 0.75 }))
  const input = document.createElement('input')
  input.type = 'number'
  input.min = '0'
  input.value = '300'
  input.setAttribute('aria-label', 'Animation duration')
  input.addEventListener(
    'change',
    () => {
      duration = input.valueAsNumber
    },
    { signal: abort.signal }
  )
  toolbar.append(input)

  const restoreFocus = (current: FlowDocument) => {
    if (
      focusedNode !== undefined &&
      (document.activeElement === document.body ||
        (document.activeElement !== null &&
          canvas.contains(document.activeElement) &&
          document.activeElement.closest('[data-testid=flow-node]') === null))
    ) {
      let id: string | undefined = focusedNode
      const visited = new Set<string>()

      while (id !== undefined && !visited.has(id)) {
        visited.add(id)
        const focusId: string = id

        const element = [
          ...canvas.querySelectorAll<HTMLElement>('[data-testid=flow-node]'),
        ].find((candidate) => candidate.dataset.nodeId === focusId)

        if (element !== undefined) {
          element.focus()
          focusedNode = id
          break
        }

        id = current.edges.find((edge) => edge.target === focusId)?.source
      }

      if (id === undefined) {
        controls.get('toggle-root')?.focus()
      }
    }
  }

  const syncParents = (current: FlowDocument) => {
    const ids: string[] = current.nodes
      .filter((node) => flowTreeData(node)?.kind === 'node')
      .map(({ id }) => id)

    if (
      JSON.stringify([...parent.options].map(({ value }) => value)) !==
      JSON.stringify(ids)
    ) {
      const selected = parent.value
      parent.replaceChildren(...ids.map((id) => new Option(id, id)))

      if (ids.includes(selected)) {
        parent.value = selected
      }
    }
  }

  const insert = async (edgeId: string) => {
    const { document: current } = await owner.read()

    const used = new Set<string>(
      [...current.nodes, ...current.edges].map(({ id }) => id)
    )

    do {
      sequence += 1
    } while (
      used.has(`insert-${sequence}`) ||
      used.has(`insert-edge-${sequence}`)
    )

    await submit({
      kind: 'insert',
      edgeId,
      newEdgeId: `insert-edge-${sequence}`,
      id: `insert-${sequence}`,
      label: `Inserted ${sequence}`,
    })
  }

  const refresh = async () => {
    frame = undefined

    if (disposed) {
      return
    }

    const { document: current } = await owner.read()

    if (disposed) {
      return
    }

    const projection = projectFlowTree(current)

    restoreFocus(current)

    const active = new Set<string>()
    const bounds = new Map<string, DOMRect>()

    for (const element of canvas.querySelectorAll<HTMLElement>(
      '[data-testid=flow-node][data-node-id]'
    )) {
      if (element.dataset.nodeId !== undefined) {
        bounds.set(element.dataset.nodeId, element.getBoundingClientRect())
      }
    }

    const action = (
      key: string,
      label: string,
      x: number,
      y: number,
      run: () => Promise<void>,
      expanded?: boolean
    ) => {
      active.add(key)
      let element = controls.get(key)

      if (element === undefined) {
        element = document.createElement('button')
        element.type = 'button'
        element.dataset.treeAction = key
        element.addEventListener(
          'click',
          () => {
            void run()
          },
          { signal: abort.signal }
        )
        actions.append(element)
        controls.set(key, element)
      }

      element.textContent = label
      element.style.left = `${x}px`
      element.style.top = `${y}px`

      if (expanded !== undefined) {
        element.setAttribute('aria-expanded', String(expanded))
      }
    }

    for (const node of projection.nodes) {
      const box = bounds.get(node.id)
      const tree = flowTreeData(node)

      if (box === undefined || tree === undefined) {
        continue
      }

      if (tree.kind === 'placeholder') {
        action(
          `promote-${node.id}`,
          `Promote ${node.id}`,
          box.x,
          box.y + box.height - 20,
          () =>
            submit({
              kind: 'promote',
              nodeId: node.id,
              label: `Node ${node.id}`,
            })
        )
      } else {
        action(
          `toggle-${node.id}`,
          `Toggle ${node.id}`,
          box.x,
          box.y + box.height - 20,
          () => submit({ kind: 'toggle', nodeId: node.id }),
          tree.expanded
        )
        action(
          `add-${node.id}`,
          `Add child ${node.id}`,
          box.right + 4,
          box.y,
          () => add(node.id)
        )
      }
    }

    for (const edge of projection.edges) {
      const source = bounds.get(edge.source)
      const target = bounds.get(edge.target)

      if (
        edge.hidden === true ||
        source === undefined ||
        target === undefined
      ) {
        continue
      }

      action(
        `insert-${edge.id}`,
        `+ ${edge.id}`,
        (source.x + target.x + source.width) / 2,
        (source.bottom + target.y) / 2,
        () => insert(edge.id)
      )
    }

    for (const [key, element] of controls) {
      if (!active.has(key)) {
        if (document.activeElement === element) {
          const fallback = controls.get('toggle-root')
          fallback?.focus()
        }

        element.remove()
        controls.delete(key)
      }
    }

    syncParents(current)

    if (
      document.activeElement === document.body &&
      current.nodes.length === 0
    ) {
      toolbar.querySelector<HTMLButtonElement>('button')?.focus()
    }
  }

  const schedule = () => {
    frame ??= requestAnimationFrame(() => {
      void refresh()
    })
  }

  const observer = new MutationObserver(schedule)
  observer.observe(canvas, { childList: true, subtree: true, attributes: true })

  const nodeAction = (event: MouseEvent | KeyboardEvent) => {
    if (
      !(event.target instanceof Element) ||
      event.target.closest('button, input, [data-handle-id]') !== null
    ) {
      return
    }

    if (
      event instanceof KeyboardEvent &&
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return
    }

    const node = event.target.closest<HTMLElement>(
      '[data-testid=flow-node][data-node-id]'
    )

    const id = node?.dataset.nodeId

    if (id !== undefined) {
      event.preventDefault()
      event.stopPropagation()
      void owner.read().then(({ document }) => {
        const tree = flowTreeData(
          document.nodes.find((current) => current.id === id)
        )

        if (tree?.kind === 'placeholder') {
          return submit({ kind: 'promote', nodeId: id, label: `Node ${id}` })
        }

        return location.pathname.includes('/dynamic-layouting')
          ? add(id, true)
          : submit({ kind: 'toggle', nodeId: id })
      })
    }
  }

  canvas.addEventListener(
    'focusin',
    (event) => {
      if (event.target instanceof Element) {
        const id = event.target.closest<HTMLElement>('[data-testid=flow-node]')
          ?.dataset.nodeId

        if (id !== undefined) {
          focusedNode = id
        }
      }
    },
    { signal: abort.signal }
  )
  canvas.addEventListener('click', nodeAction, {
    capture: true,
    signal: abort.signal,
  })
  canvas.addEventListener('keydown', nodeAction, {
    capture: true,
    signal: abort.signal,
  })

  const dispose = () => {
    disposed = true
    abort.abort()
    observer.disconnect()
    editor.dispose()

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }

    actions.replaceChildren()
    globalThis.flowTreeDemo = undefined
    status.dataset.state = 'disposed'
  }

  button('Dispose', () => {
    dispose()
    owner.dispose()
  })
  status.dataset.state = 'ready'
  schedule()

  return { dispose }
}
