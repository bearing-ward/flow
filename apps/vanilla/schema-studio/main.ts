// oxlint-disable eslint/no-use-before-define -- This app composes mutually dependent event callbacks before mounting at the end of the module.
import { Graph, layout } from '@dagrejs/dagre'
import { FlowAttribute, FlowSpan, FlowDocumentSchema } from '@flow/core'
import { Effect, Schema as S } from 'effect'
import { toPng } from 'html-to-image'

import {
  canConnect,
  exportStudio,
  history,
  importStudio,
  record,
  redo,
  undo,
} from '../../shared/schema-studio/model.ts'
import type {
  Item,
  Point,
  Relationship,
  Studio,
} from '../../shared/schema-studio/model.ts'
import sample from '../../shared/schema-studio/sample-schema.dbml?raw'
import { seedFromDbml } from '../../shared/schema-studio/seed.ts'
import {
  createFlowMiniMap,
  createFlowNodeResizer,
  createFlowNodeToolbar,
  mountFlow,
} from '../src/public.ts'
import type { JavaScriptFlowController } from '../src/public.ts'
import {
  fieldEndpoint,
  fieldHandle,
  projectGraph,
  tableHeight,
} from './graph.ts'
import { button, nodeRenderer, relationshipRenderer } from './renderers.ts'

import '../src/style.css'
import './style.css'

const requireElement = <T extends Element>(element: T | null): T => {
  if (element === null) {
    throw new Error('Missing Schema Studio element')
  }

  return element
}

const root = requireElement(document.querySelector<HTMLElement>('#app'))

root.innerHTML = `<header class="studio-top"><div><strong>Schema Studio</strong><span>Bookshop / local diagram</span></div><nav aria-label="Document actions"></nav></header>
<main class="studio-workspace"><aside><h2>Tables</h2><input type="search" aria-label="Filter tables" placeholder="Filter schema or table…"><div class="studio-list"></div><section class="studio-settings"><h2>Canvas</h2></section></aside>
<section class="studio-canvas" aria-label="Schema canvas"><div class="studio-controls" aria-label="Canvas controls"></div></section></main>
<footer><output data-testid="studio-status"></output><span class="studio-announcement" role="status" aria-live="polite"></span></footer>
<dialog aria-label="Edit item"></dialog><div class="studio-menu" role="menu" hidden></div>`

const canvas = requireElement(root.querySelector<HTMLElement>('.studio-canvas'))

const controls = requireElement(
  root.querySelector<HTMLElement>('.studio-controls')
)

const actions = requireElement(root.querySelector<HTMLElement>('nav'))

const list = requireElement(root.querySelector<HTMLElement>('.studio-list'))

const settings = requireElement(
  root.querySelector<HTMLElement>('.studio-settings')
)

const status = requireElement(root.querySelector<HTMLOutputElement>('output'))

const announcement = requireElement(
  root.querySelector<HTMLElement>('[role="status"]')
)

const editor = requireElement(root.querySelector<HTMLDialogElement>('dialog'))

const menu = requireElement(root.querySelector<HTMLElement>('[role="menu"]'))

const filterInput = requireElement(
  root.querySelector<HTMLInputElement>('input[type="search"]')
)

const lost = document.createElement('button')

lost.type = 'button'

lost.textContent = 'Lost in canvas · Show all'

const snapButton = document.createElement('button')

snapButton.type = 'button'

snapButton.textContent = 'Snap 20'

const storageKey = 'flow-schema-studio-v1'

const telemetry = (span: string, kind: string): void =>
  Effect.runSync(
    Effect.logDebug('Schema Studio boundary').pipe(
      Effect.annotateLogs({ [FlowAttribute.changeKind]: kind }),
      Effect.withSpan(span)
    )
  )

const reportError = (cause: unknown): void => {
  announcement.textContent =
    cause instanceof Error ? cause.message : String(cause)
  Effect.runSync(
    Effect.logError('Schema Studio operation failed', cause).pipe(
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

const load = (): Studio => {
  try {
    const saved = localStorage.getItem(storageKey)
    telemetry(FlowSpan.documentDecode, 'load')

    return saved === null ? seedFromDbml(sample) : importStudio(saved)
  } catch (error) {
    reportError(error)

    return seedFromDbml(sample)
  }
}

let state = history(load())

let resizeHistory: typeof state | undefined

let current: JavaScriptFlowController | undefined

let selected = new Set<string>()

let selectedEdges = new Set<string>()

let snap = false

let shift = false

let panScroll = true

let visibleOnly = true

const hiddenTables = new Set<string>()

let dependencies = true

let dark = false

let minimap = true

let overlapHighlight = false

let painting = false

let pendingSync = false

const mountedDisposers: (() => void)[] = []

const toolIds = new Set<string>()

const renderedContents = new Map<string, HTMLElement>()

let mini: ReturnType<typeof createFlowMiniMap> | undefined

let clipboard: readonly Item[] = []

let floating:
  | { readonly source: Relationship['source']; readonly position: Point }
  | undefined

const controller = (): JavaScriptFlowController => {
  if (current === undefined) {
    throw new Error('Canvas is not mounted')
  }

  return current
}

const graph = () => {
  const base = projectGraph(state.present, {
    selected,
    selectedEdges,
    hiddenTables,
    dependencies,
    highlightOverlaps: overlapHighlight,
  })

  const source = state.present.items.find(
    (item) => item.id === floating?.source.table
  )

  if (floating === undefined || source === undefined) {
    return base
  }

  return S.decodeUnknownSync(FlowDocumentSchema)({
    nodes: [
      ...base.nodes,
      {
        id: 'studio-cursor',
        type: 'cursor',
        label: '',
        position: floating.position,
        size: { width: 8, height: 8 },
        handles: [{ id: 'cursor', kind: 'target', side: 'left' }],
        selectable: false,
        draggable: false,
        connectable: false,
        className: 'studio-cursor-node',
        zIndex: 50,
      },
    ],
    edges: [
      ...base.edges,
      {
        id: 'studio-floating',
        source: source.id,
        sourceHandle: fieldHandle(source, floating.source.field, 'right'),
        target: 'studio-cursor',
        targetHandle: 'cursor',
        path: 'straight',
        stroke: '#dd5a24',
        style: { strokeDasharray: '5 4' },
        selectable: false,
        reconnectable: false,
        zIndex: 50,
      },
    ],
  })
}

let viewportOperations = 0

const settle = async (operation: Promise<unknown>): Promise<void> => {
  viewportOperations += 1
  status.dataset.busy = 'true'

  try {
    await operation
    updateStatus()
  } catch (error) {
    reportError(error)
  } finally {
    viewportOperations -= 1
    status.dataset.busy = String(viewportOperations > 0)
  }
}

const updateStatus = (): void => {
  const view = current?.getViewport()
  status.dataset.model = JSON.stringify(state.present)
  status.dataset.viewport = JSON.stringify(view)
  status.dataset.selected = JSON.stringify([...selected])
  status.dataset.edges = JSON.stringify(current?.getEdges() ?? [])
  status.dataset.snap = String(snap || shift)
  status.dataset.undo = String(state.past.length)
  status.dataset.redo = String(state.future.length)
  status.value = `${state.present.items.filter((item) => item.kind === 'table').length} tables · ${state.present.relationships.length} relationships · ${Math.round((view?.zoom ?? 1) * 100)}%`

  for (const element of list.querySelectorAll<HTMLButtonElement>(
    '[data-table]'
  )) {
    element.setAttribute(
      'aria-pressed',
      String(selected.has(element.dataset.table ?? ''))
    )
  }

  if (current !== undefined) {
    const rect = canvas.getBoundingClientRect()
    const a = current.screenToFlowPosition({ x: rect.left, y: rect.top })
    const b = current.screenToFlowPosition({ x: rect.right, y: rect.bottom })

    const inView = current
      .getIntersectingNodes(
        { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y },
        true
      )
      .filter((node) => node.type === 'studio' && !node.hidden)

    lost.hidden = inView.length > 0
  }
}

const persist = (): void => {
  try {
    localStorage.setItem(storageKey, exportStudio(state.present))
  } catch (error) {
    reportError(error)
  }
}

const renderList = (): void => {
  list.replaceChildren(
    ...state.present.items
      .filter(
        (item) =>
          item.kind === 'table' &&
          `${item.schema}.${item.name}`
            .toLowerCase()
            .includes(filterInput.value.toLowerCase())
      )
      .map((item) => {
        const entry = button(item.name, () => {
          selected = new Set([item.id])
          selectedEdges.clear()
          paint()
          void settle(
            controller().fitView({
              nodes: [{ id: item.id }],
              duration: 500,
              minZoom: 1,
              maxZoom: 1,
            })
          )
        })

        entry.dataset.table = item.id

        const row = document.createElement('div')
        row.className = 'studio-list-row'

        const visibility = button('', () => {
          if (hiddenTables.has(item.id)) {
            hiddenTables.delete(item.id)
          } else {
            hiddenTables.add(item.id)
          }

          syncGraph()
          showAll()
        })

        visibility.setAttribute(
          'aria-label',
          `Canvas visibility for ${item.name}`
        )
        visibility.setAttribute(
          'aria-pressed',
          String(!hiddenTables.has(item.id))
        )
        visibility.innerHTML =
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M2 12Q12 0 22 12Q12 24 2 12Z" fill="none" stroke="currentColor"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'
        row.append(entry, visibility)

        return row
      })
  )
}

const paint = (): void => {
  if (current === undefined) {
    return
  }

  painting = true
  current.update(graph())
  painting = false

  for (const item of state.present.items) {
    if (!toolIds.has(item.id)) {
      attachTools(current, item)
    }
  }

  renderList()
  updateStatus()
}

const commit = (next: Studio, kind: string): void => {
  state = record(state, next)
  telemetry(FlowSpan.controllerUpdate, kind)
  persist()
  paint()
}

const replaceItem = (item: Item): void =>
  commit(
    {
      ...state.present,
      items: state.present.items.map((candidate) =>
        candidate.id === item.id ? item : candidate
      ),
    },
    'edit-item'
  )

const applyHistory = (direction: 'undo' | 'redo'): void => {
  state = direction === 'undo' ? undo(state) : redo(state)
  selected = new Set(
    [...selected].filter((id) =>
      state.present.items.some((item) => item.id === id)
    )
  )
  persist()
  paint()
  announcement.textContent =
    direction === 'undo' ? 'Undid change' : 'Redid change'
}

const edit = (item: Item): void => {
  if (
    item.kind === 'note' &&
    state.present.items.some(
      (candidate) =>
        candidate.id === item.id &&
        candidate.kind === 'note' &&
        candidate.text !== item.text
    )
  ) {
    replaceItem(item)

    return
  }

  editor.replaceChildren()
  const title = document.createElement('h2')
  title.textContent = `Edit ${item.kind}`
  const name = document.createElement('input')
  name.value = item.name
  name.setAttribute('aria-label', 'Name')
  const color = document.createElement('input')
  color.type = 'color'
  color.value = item.color
  color.setAttribute('aria-label', 'Color')
  editor.append(title, name, color)

  const fieldInputs: {
    readonly field: { readonly id: string }
    readonly name: HTMLInputElement
    readonly type: HTMLInputElement
  }[] = []

  if (item.kind === 'table') {
    for (const field of item.fields) {
      const row = document.createElement('div')
      row.className = 'studio-edit-field'
      const fieldName = document.createElement('input')
      fieldName.value = field.name
      fieldName.setAttribute('aria-label', `Field ${field.id}`)
      const type = document.createElement('input')
      type.value = field.type
      type.setAttribute('aria-label', `Type ${field.id}`)
      fieldInputs.push({ field, name: fieldName, type })
      row.append(fieldName, type)
      editor.append(row)
    }
  }

  const save = button('Save changes', () => {
    const base = { ...item, name: name.value, color: color.value }
    replaceItem(
      base.kind === 'table'
        ? {
            ...base,
            fields: base.fields.map((field) => {
              const inputs = fieldInputs.find(
                (entry) => entry.field.id === field.id
              )

              return {
                ...field,
                name: inputs?.name.value.trim() || field.name,
                type: inputs?.type.value.trim() || field.type,
              }
            }),
          }
        : base
    )
    editor.close()
    root.append(editor)
    void controller().updateNodeInternals(item.id)
  })

  editor.append(
    save,
    button('Cancel', () => editor.close())
  )
  const content = renderedContents.get(item.id)

  if (content === undefined) {
    editor.showModal()
  } else {
    content.append(editor)
    editor.show()
  }

  name.focus()
}

const addAt = (kind: 'table' | 'note' | 'area', position: Point): void => {
  const id = `${kind}-${crypto.randomUUID()}`

  const base = {
    id,
    position,
    name: `New ${kind}`,
    color: '#428a94',
    width: kind === 'area' ? 600 : 250,
    height: kind === 'area' ? 400 : 160,
  }

  let item: Item

  if (kind === 'table') {
    item = {
      ...base,
      kind,
      schema: 'public',
      collapsed: false,
      fields: [
        {
          id: 'id',
          name: 'id',
          type: 'integer',
          primary: true,
          nullable: false,
          unique: false,
        },
      ],
    }
  } else if (kind === 'note') {
    item = { ...base, kind, color: '#edcd70', text: 'Write a note…' }
  } else {
    item = { ...base, kind }
  }

  selected = new Set([id])
  commit(
    { ...state.present, items: [...state.present.items, item] },
    'add-item'
  )
}

const duplicate = (items: readonly Item[]): void => {
  const ids = new Map(
    items.map((item) => [item.id, `${item.kind}-${crypto.randomUUID()}`])
  )

  const copies = items.map((item) => ({
    ...item,
    id: ids.get(item.id) ?? item.id,
    name: `${item.name} copy`,
    position: { x: item.position.x + 40, y: item.position.y + 40 },
  }))

  const relationships = state.present.relationships.flatMap((relation) => {
    const source = ids.get(relation.source.table)
    const target = ids.get(relation.target.table)

    return source === undefined || target === undefined
      ? []
      : [
          {
            ...relation,
            id: crypto.randomUUID(),
            source: { ...relation.source, table: source },
            target: { ...relation.target, table: target },
          },
        ]
  })

  selected = new Set(copies.map((item) => item.id))
  commit(
    {
      ...state.present,
      items: [...state.present.items, ...copies],
      relationships: [...state.present.relationships, ...relationships],
    },
    'duplicate'
  )
}

const deleteSelected = async (): Promise<void> => {
  await controller().deleteElements({
    nodeIds: [...selected],
    edgeIds: [...selectedEdges],
  })
  syncGraph()
  announcement.textContent = 'Deleted selected items'
}

const showMenu = (point: Point, nodeId?: string): void => {
  menu.replaceChildren()
  const item = state.present.items.find((candidate) => candidate.id === nodeId)
  const atScreen = controller().flowToScreenPosition(point)
  menu.style.left = `${Math.min(atScreen.x, window.innerWidth - 190)}px`
  menu.style.top = `${Math.min(atScreen.y, window.innerHeight - 260)}px`

  const option = (label: string, action: () => void): void => {
    const entry = button(label, () => {
      menu.hidden = true
      action()
    })

    entry.setAttribute('role', 'menuitem')
    menu.append(entry)
  }

  if (item === undefined) {
    for (const kind of ['table', 'note', 'area'] as const) {
      option(`Add ${kind}`, () => addAt(kind, point))
    }
  } else {
    option('Edit item', () => edit(item))
    option('Duplicate item', () => duplicate([item]))
    option('Delete item', () => {
      selected = new Set([item.id])
      void deleteSelected()
    })

    if (item.kind === 'table') {
      for (const field of item.fields) {
        option(`Relate ${field.name}`, () =>
          startFloating({ table: item.id, field: field.id }, point)
        )
      }
    }
  }

  menu.hidden = false
}

const cardinalityAction =
  (
    id: string,
    sourceCardinality: Relationship['sourceCardinality'],
    targetCardinality: Relationship['targetCardinality']
  ): (() => void) =>
  () => {
    commit(
      {
        ...state.present,
        relationships: state.present.relationships.map((candidate) =>
          candidate.id === id
            ? { ...candidate, sourceCardinality, targetCardinality }
            : candidate
        ),
      },
      'cardinality'
    )
    menu.hidden = true
  }

const cardinality = (id: string, x: number, y: number): void => {
  const relation = state.present.relationships.find(
    (candidate) => candidate.id === id
  )

  if (relation === undefined) {
    return
  }

  selectedEdges = new Set([id])
  paint()

  menu.replaceChildren()
  menu.style.left = `${x}px`
  menu.style.top = `${y}px`

  for (const sourceCardinality of ['one', 'many'] as const) {
    for (const targetCardinality of ['one', 'many'] as const) {
      const choice = button(
        `${sourceCardinality} to ${targetCardinality}`,
        cardinalityAction(id, sourceCardinality, targetCardinality)
      )

      choice.setAttribute('role', 'menuitem')
      menu.append(choice)
    }
  }

  menu.hidden = false
}

const cursor = document.createElement('span')

cursor.className = 'studio-cursor-label'

cursor.textContent = 'Choose a field'

cursor.hidden = true

const paintFloating = (): void => {
  if (floating === undefined || current === undefined) {
    return
  }

  const source = state.present.items.find(
    (item) => item.id === floating?.source.table
  )

  if (source === undefined) {
    return
  }

  const rect = canvas.getBoundingClientRect()

  const cursorPosition = floating.position
  const b = current.flowToScreenPosition(cursorPosition)
  painting = true
  current.update({
    ...current.getSnapshot().document,
    nodes: current
      .getNodes()
      .map((node) =>
        node.id === 'studio-cursor'
          ? { ...node, position: cursorPosition }
          : node
      ),
  })
  painting = false
  cursor.style.left = `${b.x - rect.left}px`
  cursor.style.top = `${b.y - rect.top}px`
}

const startFloating = (
  source: Relationship['source'],
  position: Point
): void => {
  floating = { source, position }
  cursor.hidden = false
  paint()
  paintFloating()
  announcement.textContent = 'Click a destination field. Escape cancels.'
}

const finishFloating = (target: Relationship['target']): void => {
  if (
    floating === undefined ||
    !canConnect(state.present, floating.source, target)
  ) {
    announcement.textContent = 'Choose a different, unconnected field'

    return
  }

  addRelationship(floating.source, target)
  floating = undefined
  cursor.hidden = true
  paint()
}

const addRelationship = (
  source: Relationship['source'],
  target: Relationship['target']
): void => {
  if (!canConnect(state.present, source, target)) {
    return
  }

  commit(
    {
      ...state.present,
      relationships: [
        ...state.present.relationships,
        {
          id: crypto.randomUUID(),
          source,
          target,
          sourceCardinality: 'one',
          targetCardinality: 'one',
        },
      ],
    },
    'connect'
  )
}

const syncGraph = (): void => {
  if (painting || current === undefined) {
    return
  }

  const nodes = current.getNodes()

  const items = state.present.items.flatMap((item) => {
    const node = nodes.find((candidate) => candidate.id === item.id)

    if (node === undefined) {
      return []
    }

    const parent = nodes.find((candidate) => candidate.id === node.parentId)

    return [
      {
        ...item,
        position: {
          x: node.position.x + (parent?.position.x ?? 0),
          y: node.position.y + (parent?.position.y ?? 0),
        },
        width: node.size?.width ?? item.width,
        height:
          item.kind === 'table'
            ? item.height
            : (node.size?.height ?? item.height),
      },
    ]
  })

  const ids = new Set(items.map((item) => item.id))
  const edges = new Set<string>(current.getEdges().map((edge) => edge.id))

  const next: Studio = {
    ...state.present,
    items: items.map((item) =>
      item.kind === 'view'
        ? {
            ...item,
            dependencies: item.dependencies.filter((id) => ids.has(id)),
          }
        : item
    ),
    relationships: state.present.relationships.filter(
      (relation) =>
        ids.has(relation.source.table) &&
        ids.has(relation.target.table) &&
        edges.has(relation.id)
    ),
  }

  state =
    resizeHistory === undefined
      ? record(state, next)
      : { ...state, present: next }
  persist()
  paint()
}

const scheduleSync = (): void => {
  if (painting || pendingSync) {
    return
  }

  pendingSync = true
  queueMicrotask(() => {
    pendingSync = false
    syncGraph()
  })
}

const updateCanvasOptions = (): void => {
  controller().setCanvasOptions({
    snapToGrid: snap || shift,
    snapGrid: { x: 20, y: 20 },
    panOnScroll: panScroll,
    panOnScrollSpeed: 0.5,
    panOnScrollMode: 'free',
    zoomOnScroll: !panScroll,
    renderOnlyVisible: visibleOnly,
  })
  canvas.classList.toggle('studio-snapping', shift)
  updateStatus()
}

const mountCanvas = (): void => {
  const viewport = { x: 0, y: 0, zoom: 1 }

  const renderer = nodeRenderer({
    contents: renderedContents,
    edit,
    collapse: (item) => {
      if (item.kind === 'table') {
        const collapsed = !item.collapsed
        replaceItem({
          ...item,
          collapsed,
          height: tableHeight({ ...item, collapsed }),
        })
        void controller().updateNodeInternals(item.id)
      }
    },
  })

  current = mountFlow(canvas, graph(), {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: viewport,
      limits: { minZoom: 0.1, maxZoom: 5 },
    },
    background: { pattern: 'dots', spacing: 20 },
    ui: { controls: false, minimap: false },
    selectionMode: 'full',
    multiSelectionKeyCode: ['Shift', 'Meta', 'Control'],
    deleteKeyCode: null,
    zIndexMode: 'manual',
    snapToGrid: snap || shift,
    snapGrid: { x: 20, y: 20 },
    panOnScroll: panScroll,
    panOnScrollSpeed: 0.5,
    panOnScrollMode: 'free',
    zoomOnScroll: !panScroll,
    renderOnlyVisible: visibleOnly,
    autoPanOnConnect: false,
    autoPanOnNodeDrag: false,
    colorMode: dark ? 'dark' : 'light',
    connectionMode: 'loose',
    connectOnClick: false,
    nodeRenderers: { studio: renderer },
    edgeRenderers: {
      relationship: relationshipRenderer(() => current, cardinality),
    },
    onHandleRender: (node, handle, element) => {
      const item = state.present.items.find(
        (candidate) => candidate.id === node.id
      )

      if (item?.kind !== 'table' || !handle.id.startsWith('f')) {
        return
      }

      const index = Number(
        /^f(?<index>\d+)/u.exec(handle.id)?.groups?.index ?? 0
      )

      element.style.top = `${44 + Math.min(index, item.collapsed ? 2 : index) * 28 + 14}px`
      element.dataset.testid = `field-${node.id}-${handle.id}`
      const field = item.fields[index]
      element.setAttribute(
        'aria-label',
        `${node.label} ${field?.name ?? ''} ${handle.side}`
      )
      element.addEventListener('pointerdown', (event) => {
        if (floating !== undefined && field !== undefined) {
          event.preventDefault()
          event.stopPropagation()
          finishFloating({ table: node.id, field: field.id })
        }
      })
    },
    isValidConnection: (candidate) => {
      const source = fieldEndpoint(
        state.present,
        candidate.source,
        candidate.sourceHandle
      )

      const target = fieldEndpoint(
        state.present,
        candidate.target,
        candidate.targetHandle
      )

      return (
        source !== undefined &&
        target !== undefined &&
        canConnect(state.present, source, target)
      )
    },
    connectionPreview: (preview, container) => {
      container.replaceChildren()

      if (preview === null) {
        return
      }

      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )

      line.setAttribute(
        'd',
        `M${preview.from.x} ${preview.from.y} L${preview.to.x} ${preview.to.y}`
      )
      line.setAttribute('stroke', '#dd5a24')
      line.setAttribute('stroke-width', '3')
      line.setAttribute('stroke-dasharray', '6 4')
      container.append(line)
    },
    onConnect: (candidate) => {
      const source = fieldEndpoint(
        state.present,
        candidate.source,
        candidate.sourceHandle
      )

      const target = fieldEndpoint(
        state.present,
        candidate.target,
        candidate.targetHandle
      )

      if (source !== undefined && target !== undefined) {
        queueMicrotask(() => addRelationship(source, target))
      }
    },
    onReconnectStart: () => {
      status.dataset.reconnect = 'started'
    },
    onReconnectEnd: (result) => {
      status.dataset.reconnect = `${result.outcome}:${result.reason ?? ''}`
    },
    onReconnect: (edge) => {
      const source = fieldEndpoint(
        state.present,
        edge.source,
        edge.sourceHandle
      )

      const target = fieldEndpoint(
        state.present,
        edge.target,
        edge.targetHandle
      )

      if (
        source !== undefined &&
        target !== undefined &&
        canConnect(state.present, source, target, edge.id)
      ) {
        queueMicrotask(() =>
          commit(
            {
              ...state.present,
              relationships: state.present.relationships.map((relation) =>
                relation.id === edge.id
                  ? { ...relation, source, target }
                  : relation
              ),
            },
            'reconnect'
          )
        )
      }
    },
    onSelectionChange: (selection) => {
      selected = new Set(selection.nodes.map((node) => node.id))
      selectedEdges = new Set(selection.edges.map((edge) => edge.id))

      if (!painting) {
        scheduleSync()
      }
    },
    onNodeDoubleClick: ({ nodeId }) => {
      const item = state.present.items.find(
        (candidate) => candidate.id === nodeId
      )

      if (item !== undefined) {
        edit(item)
      }
    },
    onPaneContextMenu: ({ position, event }) => {
      event.preventDefault()
      showMenu(
        controller().screenToFlowPosition({
          x: position.x + canvas.getBoundingClientRect().left,
          y: position.y + canvas.getBoundingClientRect().top,
        })
      )
    },
    onNodeContextMenu: ({ position, nodeId, event }) => {
      event.preventDefault()
      showMenu(
        controller().screenToFlowPosition({
          x: position.x + canvas.getBoundingClientRect().left,
          y: position.y + canvas.getBoundingClientRect().top,
        }),
        nodeId
      )
    },
    onEdgeClick: ({ edgeId, position }) => {
      if (edgeId !== undefined) {
        const rect = canvas.getBoundingClientRect()
        cardinality(edgeId, rect.left + position.x, rect.top + position.y)
      }
    },
  })
  const mounted = current
  mountedDisposers.push(
    mounted.subscribeState(scheduleSync),
    mounted.subscribeViewport(() => {
      updateStatus()
      paintFloating()
    })
  )

  for (const item of state.present.items) {
    attachTools(mounted, item)
  }

  if (minimap) {
    mini = createFlowMiniMap(mounted, {
      pannable: true,
      zoomable: true,
      width: 180,
      height: 110,
    })
  }

  canvas.append(controls, cursor)
  canvas.classList.toggle('studio-snapping', shift)
  updateStatus()
}

const resizeOptions = (item: Item) => {
  if (item.kind === 'table') {
    return {
      minWidth: 224,
      maxWidth: 450,
      minHeight: tableHeight(item),
      maxHeight: tableHeight(item),
      handleStyle: { display: 'none' },
      lineClassName: 'studio-table-resize',
    }
  }

  return {
    minWidth: item.kind === 'note' ? 200 : 100,
    minHeight: item.kind === 'note' ? 150 : 100,
  }
}

const attachTools = (mounted: JavaScriptFlowController, item: Item): void => {
  toolIds.add(item.id)

  const callbacks = {
    onResizeStart: () => {
      resizeHistory = state
    },
    onResizeEnd: () => {
      queueMicrotask(() => {
        syncGraph()

        if (resizeHistory !== undefined) {
          state = record(resizeHistory, state.present)
          resizeHistory = undefined
          persist()
          updateStatus()
        }
      })
    },
  }

  const resize = createFlowNodeResizer(mounted, item.id, {
    ...callbacks,
    ...resizeOptions(item),
    isVisible: selected.has(item.id),
  })

  const refresh = (): void => {
    const latest =
      state.present.items.find((candidate) => candidate.id === item.id) ?? item

    resize.update({
      ...callbacks,
      isVisible: selected.has(item.id),
      ...resizeOptions(latest),
    })
  }

  mountedDisposers.push(
    resize.destroy,
    mounted.subscribeSelection(refresh),
    mounted.subscribeState(refresh)
  )

  if (item.kind === 'table') {
    const toolbar = document.createElement('div')
    toolbar.className = 'studio-node-toolbar'
    toolbar.append(
      button('Edit', () => {
        const latest = state.present.items.find(
          (candidate) => candidate.id === item.id
        )

        if (latest !== undefined) {
          edit(latest)
        }
      }),
      button('Duplicate', () =>
        duplicate([
          state.present.items.find((candidate) => candidate.id === item.id) ??
            item,
        ])
      ),
      button('Relate', () => {
        if (item.fields[0] !== undefined) {
          startFloating(
            { table: item.id, field: item.fields[0].id },
            item.position
          )
        }
      })
    )
    mountedDisposers.push(
      createFlowNodeToolbar(mounted, toolbar, { nodeId: item.id }).destroy
    )
  }
}

const showAll = (): void => {
  void settle(
    controller().fitView({ padding: 0.1, maxZoom: 0.8, duration: 500 })
  )
}

lost.addEventListener('click', showAll)

lost.className = 'studio-lost'

lost.hidden = true

snapButton.addEventListener('click', () => {
  snap = !snap
  snapButton.setAttribute('aria-pressed', String(snap))
  updateCanvasOptions()
})

controls.append(snapButton)

snapButton.setAttribute('aria-pressed', 'false')

controls.append(
  button('Show all', () => {
    showAll()
  }),
  button('Zoom in', () => {
    void settle(controller().zoomIn())
  }),
  button('Zoom out', () => {
    void settle(controller().zoomOut())
  }),
  button('Auto-arrange', () => {
    const diagram = new Graph()
    diagram.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })
    diagram.setDefaultEdgeLabel(() => ({}))

    for (const item of state.present.items.filter(
      (candidate) => candidate.kind === 'table'
    )) {
      diagram.setNode(item.id, { width: item.width, height: tableHeight(item) })
    }

    for (const relation of state.present.relationships) {
      diagram.setEdge(relation.source.table, relation.target.table)
    }

    layout(diagram)
    commit(
      {
        ...state.present,
        items: state.present.items.map((item) => {
          if (item.kind !== 'table') {
            return item
          }

          const node = diagram.node(item.id)

          return {
            ...item,
            position: {
              x: node.x - item.width / 2,
              y: node.y - tableHeight(item) / 2,
            },
          }
        }),
      },
      'layout'
    )
    void settle(controller().fitView({ duration: 200 }))
  }),
  lost
)

const setting = (
  label: string,
  checked: boolean,
  change: (value: boolean) => void
): void => {
  const row = document.createElement('label')
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => change(input.checked))
  row.append(input, label)
  settings.append(row)
}

setting('Dark mode', dark, (value) => {
  dark = value
  root.classList.toggle('studio-dark', dark)
  controller().setColorMode(dark ? 'dark' : 'light')
})

setting('Minimap', minimap, (value) => {
  minimap = value

  if (value) {
    mini = createFlowMiniMap(controller(), {
      pannable: true,
      zoomable: true,
      width: 180,
      height: 110,
    })
  } else {
    mini?.destroy()
    mini = undefined
  }
})

setting('Zoom on scroll', !panScroll, (value) => {
  panScroll = !value
  updateCanvasOptions()
})

setting('Render only visible', visibleOnly, (value) => {
  visibleOnly = value
  updateCanvasOptions()
})

setting('View dependencies', dependencies, (value) => {
  dependencies = value
  paint()
})

settings.append(
  button('Show overlaps', () => {
    overlapHighlight = !overlapHighlight
    paint()

    const items = controller()
      .getNodes()
      .filter((node) => node.className?.includes('studio-overlap'))

    if (items.length > 0) {
      void settle(controller().fitView({ nodes: items, duration: 200 }))
    }

    announcement.textContent = `${items.length} overlapping tables`
  }),
  button('Delete intersecting', () => {
    const intersecting = new Set(
      controller()
        .getNodes()
        .filter((node) => selected.has(node.id))
        .flatMap((node) =>
          controller()
            .getIntersectingNodes(node, true)
            .filter((other) => other.className?.includes('studio-table'))
            .map((other) => other.id)
        )
    )

    announcement.textContent = `${intersecting.size} intersecting tables deleted`
    void controller().deleteElements({ nodeIds: [...intersecting] })
  })
)

filterInput.addEventListener('input', renderList)

const download = (name: string, href: string): void => {
  const link = document.createElement('a')
  link.download = name
  link.href = href
  link.click()
}

const exportImage = async (): Promise<void> => {
  try {
    await document.fonts.ready

    const url = await toPng(canvas, {
      pixelRatio: 4,
      skipAutoScale: true,
      backgroundColor: dark ? '#18242e' : '#f5f7f5',
      filter: (node) =>
        !(node instanceof Element) ||
        (!node.classList.contains('studio-controls') &&
          !node.classList.contains('studio-node-toolbar')),
    })

    download('schema-studio.png', url)
    announcement.textContent = 'PNG exported'
  } catch (error) {
    reportError(error)
  }
}

actions.append(
  button('Undo', () => applyHistory('undo')),
  button('Redo', () => applyHistory('redo')),
  button('Export PNG', () => {
    void exportImage()
  }),
  button('Export JSON', () =>
    download(
      'schema-studio.json',
      `data:application/json;charset=utf-8,${encodeURIComponent(exportStudio(state.present))}`
    )
  )
)

const file = document.createElement('input')

file.type = 'file'

file.accept = '.json,application/json'

file.hidden = true

const importFile = async (): Promise<void> => {
  try {
    const content = await file.files?.[0]?.text()

    if (content !== undefined) {
      const next = importStudio(content)
      telemetry(FlowSpan.documentDecode, 'import')
      commit(next, 'import')
      void settle(controller().fitView())
    }
  } catch (error) {
    reportError(error)
  }
}

file.addEventListener('change', () => {
  void importFile()
})

actions.append(
  button('Import JSON', () => file.click()),
  file
)

const editableTarget = (event: KeyboardEvent): boolean => {
  const [target] = event.composedPath()

  return (
    target instanceof Element &&
    (target.closest(
      'input, textarea, select, .nokey, [contenteditable]:not([contenteditable="false"])'
    ) !== null ||
      (target instanceof HTMLElement && target.isContentEditable))
  )
}

const handleShortcut = (event: KeyboardEvent): boolean => {
  const modifier = event.metaKey || event.ctrlKey

  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.stopImmediatePropagation()
    applyHistory(event.shiftKey ? 'redo' : 'undo')

    return true
  }

  if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    applyHistory('redo')

    return true
  }

  if (modifier && event.key.toLowerCase() === 'c') {
    clipboard = state.present.items.filter(
      (item) => item.kind === 'table' && selected.has(item.id)
    )
    announcement.textContent = `Copied ${clipboard.length} tables`

    return true
  }

  if (modifier && event.key.toLowerCase() === 'v' && clipboard.length > 0) {
    event.preventDefault()
    duplicate(clipboard)

    return true
  }

  return false
}

window.addEventListener(
  'keydown',
  (event) => {
    if (editableTarget(event)) {
      return
    }

    if (event.key === 'Shift' && !shift) {
      shift = true
      updateCanvasOptions()
    }

    if (event.key === 'Escape') {
      floating = undefined
      cursor.hidden = true
      menu.hidden = true
      paint()
    }

    if (handleShortcut(event)) {
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      event.stopImmediatePropagation()

      if (!event.repeat) {
        void deleteSelected()
      }
    }
  },
  { capture: true }
)

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift' && shift) {
    shift = false
    updateCanvasOptions()
  }
})

window.addEventListener('blur', () => {
  if (shift) {
    shift = false
    updateCanvasOptions()
  }
})

canvas.addEventListener('pointermove', (event) => {
  if (floating !== undefined) {
    floating = {
      ...floating,
      position: controller().screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    }
    paintFloating()
  }
})

window.addEventListener(
  'pagehide',
  () => {
    for (const dispose of mountedDisposers) {
      dispose()
    }

    mini?.destroy()
    current?.destroy()
    telemetry(FlowSpan.hostDestroy, 'pagehide')
  },
  { once: true }
)

mountCanvas()

renderList()

showAll()
