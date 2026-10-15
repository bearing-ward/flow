// oxlint-disable eslint/no-use-before-define -- Runtime ports and host callbacks are composed before either runtime processes messages.
import { Graph, layout } from '@dagrejs/dagre'
import {
  createFlowGraph,
  FlowAttribute,
  FlowSpan,
  FlowDocumentSchema,
  FlowSnapshotSchema,
} from '@flow/core'
import {
  createProgram,
  createViewportClient,
  createFoldkitFlowInstance,
  createFoldkitNodeMeasurementObserver,
  createFlowMiniMap,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Effect, Schema as S, Exit, Match } from 'effect'
import { Runtime, Port, Subscription } from 'foldkit'
import { toPng } from 'html-to-image'

import {
  canConnect,
  exportStudio,
  importStudio,
} from '../../shared/schema-studio/model.ts'
import sample from '../../shared/schema-studio/sample-schema.dbml?raw'
import { seedFromDbml } from '../../shared/schema-studio/seed.ts'
import {
  fieldEndpoint,
  fieldHandle,
  projectGraph,
  tableHeight,
} from './graph.ts'
import { ModelSchema, Msg, initialModel, createUpdate, view } from './model.ts'
import type { Model, StudioMessage, Host } from './model.ts'
import { createRenderers } from './renderers.ts'

import '@flow/foldkit/style.css'
import './style.css'

const requireElement = <T extends Element>(element: T | null): T => {
  if (element === null) {
    throw new Error('Missing Schema Studio element')
  }

  return element
}

const root = requireElement(document.querySelector<HTMLElement>('#app'))

const chrome = document.createElement('div')

const canvas = document.createElement('section')

chrome.id = 'schema-studio-application'

canvas.id = 'schema-studio-flow'

canvas.className = 'studio-canvas'

canvas.setAttribute('aria-label', 'Schema canvas')

root.append(chrome, canvas)

const runtimeRoot = document.createElement('div')

runtimeRoot.id = 'schema-studio-runtime'

canvas.append(runtimeRoot)

const storageKey = 'flow-schema-studio-foldkit-v1'

const telemetry = (span: string, kind: string) =>
  Effect.runSync(
    Effect.logDebug('Foldkit Schema Studio boundary').pipe(
      Effect.annotateLogs({ [FlowAttribute.changeKind]: kind }),
      Effect.withSpan(span)
    )
  )

const reportFailure = (cause: unknown): void => {
  Effect.runSync(
    Effect.logError('Schema Studio boundary failed', cause).pipe(
      Effect.annotateLogs({
        [FlowAttribute.failureName]:
          cause instanceof Error ? cause.name : 'Unknown',
        [FlowAttribute.failureMessage]:
          cause instanceof Error ? cause.message : String(cause),
      }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

let studio = seedFromDbml(sample)

try {
  const saved = localStorage.getItem(storageKey)

  if (saved !== null) {
    studio = importStudio(saved)
  }

  telemetry(FlowSpan.documentDecode, 'load')
} catch (error) {
  Effect.runSync(
    Effect.logError('Schema Studio load failed', error).pipe(
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

let model = initialModel(studio)

const graph = (value: Model) => {
  const base = projectGraph(value.history.present, {
    selected: new Set(value.selected),
    selectedEdges: new Set(value.selectedEdges),
    hiddenTables: new Set(value.hiddenTables),
    dependencies: value.dependencies,
    highlightOverlaps: value.overlaps,
  })

  const { floating } = value

  if (floating === null) {
    return base
  }

  const source = value.history.present.items.find(
    (item) => item.id === floating.source.table
  )

  if (source === undefined) {
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

model = { ...model, flow: graph(model) }

const renderers = createRenderers()

const flowRuntime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    runtimeRoot,
    graph(model),
    model.viewport,
    [],
    'uncontrolled',
    'uncontrolled',
    renderers.registry,
    { minZoom: 0.1, maxZoom: 5 },
    'full',
    {
      ...defaultInteractionOptions,
      connectionMode: 'loose',
      autoPanOnConnect: false,
      autoPanOnNodeDrag: false,
      autoPanOnSelection: false,
      panOnDrag: true,
      selectionOnDrag: false,
      snapGrid: [20, 20],
      panOnScroll: true,
      panOnScrollSpeed: 0.5,
      panOnScrollMode: 'free',
      zoomOnScroll: false,
      onlyRenderVisibleElements: true,
      multiSelectionKeyCode: ['Shift', 'Meta', 'Control'],
      deleteKeyCode: null,
      zIndexMode: 'manual',
      noDragClassName: 'nodrag',
      noPanClassName: 'nopan',
      noWheelClassName: 'nowheel',
      connectOnClick: false,
      isValidConnection: (candidate) => {
        const source = fieldEndpoint(
          model.history.present,
          candidate.source,
          candidate.sourceHandle ?? undefined
        )

        const target = fieldEndpoint(
          model.history.present,
          candidate.target,
          candidate.targetHandle ?? undefined
        )

        return (
          source !== undefined &&
          target !== undefined &&
          canConnect(
            model.history.present,
            source,
            target,
            model.reconnect === 'started' ? model.selectedEdges[0] : undefined
          )
        )
      },
    }
  )
)

const viewport = createViewportClient(
  flowRuntime.ports,
  () => ({
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    originX: canvas.getBoundingClientRect().left,
    originY: canvas.getBoundingClientRect().top,
  }),
  model.viewport,
  { minZoom: 0.1, maxZoom: 5 }
)

const instance = createFoldkitFlowInstance(flowRuntime.ports, { viewport })

let mini: ReturnType<typeof createFlowMiniMap> | undefined

let renderedGraph = graph(model)

const updateUI = () => {
  canvas.style.backgroundSize = `${20 * model.viewport.zoom}px ${20 * model.viewport.zoom}px`
  canvas.style.backgroundPosition = `${model.viewport.x}px ${model.viewport.y}px`
  const projected = createFlowGraph(renderedGraph)

  if (model.minimap) {
    if (mini === undefined) {
      mini = createFlowMiniMap(
        document,
        canvas,
        viewport,
        projected,
        model.viewport,
        { pannable: true, zoomable: true }
      )
    } else {
      mini.update(projected, model.viewport)
    }
  } else {
    mini?.dispose()
    mini = undefined
  }
}

const file = document.createElement('input')

file.type = 'file'

file.accept = '.json,application/json'

file.hidden = true

root.append(file)

const download = (name: string, href: string) => {
  const link = document.createElement('a')
  link.download = name
  link.href = href
  link.click()
}

const host: Host = {
  paint: (next) => {
    const projected = graph(next)

    if (JSON.stringify(projected) !== JSON.stringify(renderedGraph)) {
      send(Msg.Flow({ document: projected }))
      renderedGraph = projected
      flowRuntime.ports.actions.send(
        HostAction.ReplaceDocument({ document: projected })
      )
    }

    updateUI()
  },
  settings: (next) => {
    flowRuntime.ports.actions.send(
      HostAction.SetCanvasOptions({
        options: {
          snapToGrid: next.snap || next.shift,
          snapGrid: { x: 20, y: 20 },
          panOnScroll: next.panScroll,
          panOnScrollSpeed: 0.5,
          panOnScrollMode: 'free',
          zoomOnScroll: !next.panScroll,
          onlyRenderVisibleElements: next.visibleOnly,
        },
      })
    )
    flowRuntime.ports.actions.send(
      HostAction.SetColorMode({ mode: next.dark ? 'dark' : 'light' })
    )
    canvas.classList.toggle('studio-snapping', next.shift)
    root.classList.toggle('studio-dark', next.dark)
  },
  fit: async (id) => {
    await instance.fitView(
      id === undefined
        ? { padding: 0.1, maxZoom: 0.8, duration: 500 }
        : { nodes: [{ id }], duration: 500, minZoom: 1, maxZoom: 1 }
    )
  },
  zoom: async (direction) => {
    await (direction === 'in' ? instance.zoomIn() : instance.zoomOut())
  },
  delete: async (ids, edges) => {
    const result = await instance.deleteElements({
      nodes: ids.map((id) => ({ id })),
      edges: edges.map((id) => ({ id })),
    })

    if ('error' in result) {
      throw new Error(result.error._tag)
    }
  },
  intersections: async () => {
    const groups = await Promise.all(
      model.selected.map((id) => instance.getIntersectingNodes(id, true))
    )

    return [
      ...new Set(
        groups
          .flat()
          .filter((node) => node.className?.includes('studio-table'))
          .map((node) => node.id)
      ),
    ]
  },
  layout: (value) => {
    const diagram = new Graph()
    diagram.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 })
    diagram.setDefaultEdgeLabel(() => ({}))

    for (const item of value.items) {
      if (item.kind === 'table') {
        diagram.setNode(item.id, {
          width: item.width,
          height: tableHeight(item),
        })
      }
    }

    for (const relation of value.relationships) {
      diagram.setEdge(relation.source.table, relation.target.table)
    }

    layout(diagram)

    return {
      ...value,
      items: value.items.map((item) => {
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
    }
  },
  persist: (value) => {
    localStorage.setItem(storageKey, exportStudio(value))
    telemetry(FlowSpan.controllerUpdate, 'persist')
  },
  export: async (kind, value) => {
    if (kind === 'json') {
      download(
        'schema-studio.json',
        `data:application/json;charset=utf-8,${encodeURIComponent(exportStudio(value.history.present))}`
      )

      return
    }

    await document.fonts.ready

    const url = await toPng(canvas, {
      style: {
        position: 'relative',
        inset: '0',
        insetInline: '0',
        insetBlock: '0',
        margin: '0',
      },
      pixelRatio: 4,
      skipAutoScale: true,
      backgroundColor: value.dark ? '#18242e' : '#f5f7f5',
      filter: (node) =>
        !(node instanceof Element) ||
        !node.classList.contains('studio-node-toolbar'),
    })

    download('schema-studio.png', url)
  },
  import: () => file.click(),
}

const appPorts = { inbound: { messages: Port.inbound(Msg) } }

const update = createUpdate(host)

const app = Runtime.embed<typeof appPorts, never, 'Element'>(
  Runtime.makeElement({
    Model: ModelSchema,
    ports: appPorts,
    container: chrome,
    init: () => ({ model }),
    update: (previous, message) => {
      const result = update(previous, message)

      ;({ model } = result)

      return result
    },
    view,
    subscriptions: Subscription.make<Model, StudioMessage>()(() => ({
      messages: Port.subscription(
        appPorts.inbound.messages,
        (message) => message
      ),
    })),
  })
)

const send = (message: StudioMessage) => {
  const sent = app.ports.messages.send(message)

  if (Exit.isFailure(sent)) {
    throw new Error('Schema Studio message rejected')
  }
}

const run = async (operation: () => Promise<void>): Promise<void> => {
  try {
    await operation()
  } catch (error) {
    reportFailure(error)
    send(
      Msg.Failure({
        message: error instanceof Error ? error.message : String(error),
      })
    )
  }
}

flowRuntime.ports.acceptedStates.subscribe((change) => {
  if (change.cause === 'viewport-update') {
    recordViewport(change.current.viewport)
  }

  if (change.cause === 'semantic-change') {
    send(
      Msg.Accepted({
        document: S.decodeUnknownSync(FlowSnapshotSchema)(change.current)
          .document,
      })
    )
  }
})

const recordViewport = (current: Model['viewport']) => {
  const left = -current.x / current.zoom
  const top = -current.y / current.zoom
  const right = left + canvas.clientWidth / current.zoom
  const bottom = top + canvas.clientHeight / current.zoom

  const visible = createFlowGraph(renderedGraph).orderedNodes.some(
    (node) =>
      !node.hidden &&
      node.absolutePosition.x < right &&
      node.absolutePosition.x + node.dimensions.width > left &&
      node.absolutePosition.y < bottom &&
      node.absolutePosition.y + node.dimensions.height > top
  )

  send(Msg.Viewport({ viewport: current, lost: !visible }))
  canvas.style.backgroundSize = `${20 * current.zoom}px ${20 * current.zoom}px`
  canvas.style.backgroundPosition = `${current.x}px ${current.y}px`
  mini?.update(createFlowGraph(renderedGraph), current)
}

flowRuntime.ports.viewportEvents.subscribe(({ kind, viewport: current }) => {
  if (kind !== 'start') {
    recordViewport(current)
  }
})

flowRuntime.ports.viewportResults.subscribe(({ viewport: current }) => {
  recordViewport(current)
})

flowRuntime.ports.interactionEvents.subscribe((events) => {
  for (const event of events) {
    if (
      (event.name === 'onPaneContextMenu' ||
        event.name === 'onNodeContextMenu') &&
      !(event.button === 0 && event.ctrlKey === true)
    ) {
      const screen = { x: event.clientX ?? 0, y: event.clientY ?? 0 }
      void run(async () => {
        const point = await instance.screenToFlowPosition(screen)
        send(
          Msg.OpenMenu({
            menu:
              event.nodeId === null || event.nodeId === undefined
                ? { kind: 'pane', point, screen }
                : { kind: 'node', id: event.nodeId, point, screen },
          })
        )
      })
    }

    if (event.name === 'onReconnectStart') {
      send(Msg.Reconnect({ value: 'started' }))
    }

    if (event.name === 'onReconnectEnd') {
      send(Msg.Reconnect({ value: `${event.outcome}:${event.reason ?? ''}` }))
    }

    if (
      event.name === 'onEdgeClick' &&
      event.edgeId !== null &&
      event.edgeId !== undefined
    ) {
      send(
        Msg.OpenMenu({
          menu: {
            kind: 'cardinality',
            id: event.edgeId,
            screen: { x: event.clientX ?? 0, y: event.clientY ?? 0 },
          },
        })
      )
    }
  }
})

flowRuntime.ports.changes.subscribe((change) => {
  if (change.kind === 'edge-add' || change.kind === 'edge-reconnect') {
    const { edge } = change

    const source = fieldEndpoint(
      model.history.present,
      edge.source,
      edge.sourceHandle
    )

    const target = fieldEndpoint(
      model.history.present,
      edge.target,
      edge.targetHandle
    )

    if (source !== undefined && target !== undefined) {
      send(
        Msg.Connect({
          source,
          target,
          id: edge.id,
          replacing: change.kind === 'edge-reconnect' ? edge.id : null,
        })
      )
    }
  }
})

const measurements = createFoldkitNodeMeasurementObserver({
  owner: canvas,
  zoom: () => model.viewport.zoom,
  onMeasure: ({ requestId, measurement }) => {
    flowRuntime.ports.actions.send(
      HostAction.MeasureNode({ requestId, measurement })
    )
  },
})

root.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return
  }

  const label = event.target.closest<HTMLElement>('[data-studio-cardinality]')

  if (label !== null) {
    event.stopPropagation()
    const rect = label.getBoundingClientRect()
    send(
      Msg.OpenMenu({
        menu: {
          kind: 'cardinality',
          id: label.dataset.studioCardinality ?? '',
          screen: { x: rect.x, y: rect.bottom },
        },
      })
    )

    return
  }

  const action = event.target.closest<HTMLElement>('[data-studio-action]')

  if (action === null) {
    return
  }

  event.stopPropagation()
  const id = action.dataset.studioId ?? ''

  switch (action.dataset.studioAction) {
    case 'edit': {
      send(Msg.Edit({ id }))
      break
    }

    case 'collapse': {
      send(Msg.Collapse({ id }))
      break
    }

    case 'duplicate': {
      send(Msg.Duplicate({ ids: [id], suffix: crypto.randomUUID() }))
      break
    }

    case 'relate': {
      const item = model.history.present.items.find(
        (candidate) => candidate.id === id
      )

      if (item?.kind === 'table' && item.fields[0] !== undefined) {
        send(
          Msg.Float({
            source: { table: id, field: item.fields[0].id },
            position: item.position,
          })
        )
      }

      break
    }

    default: {
      break
    }
  }
})

root.addEventListener('dblclick', (event) => {
  if (event.target instanceof Element) {
    const header = event.target.closest<HTMLElement>('[data-studio-id]')

    if (header?.dataset.studioId !== undefined) {
      send(Msg.Edit({ id: header.dataset.studioId }))
    }
  }
})

root.addEventListener('input', (event) => {
  if (
    event.target instanceof HTMLTextAreaElement &&
    event.target.dataset.studioNote !== undefined
  ) {
    send(
      Msg.Note({
        id: event.target.dataset.studioNote,
        text: event.target.value,
      })
    )
  }
})

root.addEventListener(
  'pointerdown',
  (event) => {
    if (model.floating === null || !(event.target instanceof Element)) {
      return
    }

    const handle = event.target.closest<HTMLElement>('[data-studio-field]')

    if (handle === null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    send(
      Msg.FinishFloat({
        target: {
          table: handle.dataset.studioTable ?? '',
          field: handle.dataset.studioField ?? '',
        },
        id: crypto.randomUUID(),
      })
    )
  },
  { capture: true }
)

canvas.addEventListener('pointermove', (event) => {
  if (model.floating !== null) {
    void run(async () => {
      const position = await instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      send(Msg.Pointer({ position }))
    })
  }
})

file.addEventListener('change', () => {
  void run(async () => {
    const content = await file.files?.[0]?.text()

    if (content !== undefined) {
      send(Msg.Import({ studio: importStudio(content) }))
    }
  })
})

const editable = (event: KeyboardEvent) => {
  const [target] = event.composedPath()

  return (
    target instanceof Element &&
    (target.closest(
      'input, textarea, select, .nokey, [contenteditable]:not([contenteditable="false"])'
    ) !== null ||
      (target instanceof HTMLElement && target.isContentEditable))
  )
}

const dismissMenu = (event: PointerEvent): void => {
  if (event.button !== 0 || model.menu.kind === 'closed') {
    return
  }

  const menu = root.querySelector('.studio-menu')

  if (menu !== null && !event.composedPath().includes(menu)) {
    send(Msg.CloseMenu())
  }
}

window.addEventListener('pointerdown', dismissMenu, { capture: true })

window.addEventListener(
  'keydown',
  (event) => {
    if (editable(event)) {
      return
    }

    if (event.key === 'Shift' && !model.shift) {
      send(Msg.Shift({ pressed: true }))
    }

    if (event.key === 'Escape') {
      send(Msg.Escape())
    }

    const modifier = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (modifier && ['z', 'y', 'c', 'v'].includes(key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      send(
        Match.value(key).pipe(
          Match.when('z', () => (event.shiftKey ? Msg.Redo() : Msg.Undo())),
          Match.when('y', () => Msg.Redo()),
          Match.when('c', () => Msg.Copy()),
          Match.orElse(() => Msg.Paste())
        )
      )
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      event.stopImmediatePropagation()

      if (!event.repeat) {
        send(Msg.Delete())
      }
    }
  },
  { capture: true }
)

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift' && model.shift) {
    send(Msg.Shift({ pressed: false }))
  }
})

window.addEventListener('blur', () => {
  if (model.shift) {
    send(Msg.Shift({ pressed: false }))
  }
})

window.addEventListener(
  'pagehide',
  () => {
    window.removeEventListener('pointerdown', dismissMenu, { capture: true })
    measurements.dispose()
    mini?.dispose()
    renderers.dispose()
    instance.dispose()
    viewport.dispose()
    app.dispose()
    flowRuntime.dispose()
    telemetry(FlowSpan.hostDestroy, 'pagehide')
  },
  { once: true }
)

updateUI()

telemetry(FlowSpan.hostMount, 'mount')

void run(async () => {
  await host.fit()
  send(Msg.Ready())
})
