import {
  FlowDocumentSchema,
  ViewportSchema,
  NodeChangeSchema,
  EdgeChangeSchema,
  EdgeIdSchema,
  createFlowGraph,
} from '@flow/core'
import {
  createProgram,
  defaultInteractionOptions,
  HostAction,
  createViewportClient,
  createFoldkitNodeMeasurementObserver,
  createFoldkitDeleteClient,
  createFoldkitFlowInstance,
  createFoldkitStore,
  createFoldkitInteractionHandlers,
  applyFoldkitElementChanges,
} from '@flow/foldkit'
import type {
  ports,
  FoldkitFlowInstance,
  FoldkitRendererRegistry,
} from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import {
  componentCallbacks,
  mountComponentControls,
  componentConfig,
  componentReceipt,
  recordDistinct,
  recordEvent,
  recordNodes,
  recordViewport,
} from '../../shared/upstream/component.ts'
import { prepareUpstreamRoot } from '../../shared/upstream/fixture.ts'

import '@flow/foldkit/style.css'

interface ComponentInstanceOwner {
  current?: FoldkitFlowInstance
}

declare global {
  interface Window {
    __componentSettle?: () => Promise<void>
  }
}

const root = prepareUpstreamRoot()

const config = componentConfig(Number(location.pathname.split('/').at(-1)))

const receipt = componentReceipt()

for (const type of ['dblclick', 'contextmenu']) {
  window.addEventListener(
    type,
    (event) => {
      if (event instanceof MouseEvent) {
        receipt.inputs.push({
          type,
          x: event.clientX,
          y: event.clientY,
          target:
            event.target instanceof Element
              ? event.target.outerHTML.slice(0, 250)
              : '',
          hit:
            document
              .elementFromPoint(event.clientX, event.clientY)
              ?.outerHTML.slice(0, 250) ?? '',
        })
      }
    },
    true
  )
}

let mountNumber = 0

const mount = (owner: HTMLElement, edgeId?: string) => {
  const target = document.createElement('div')
  target.id = `${owner.id}-runtime`
  owner.append(target)

  let accepted = edgeId
    ? {
        ...config.document,
        edges: config.document.edges.map((e) => ({
          ...e,
          id: EdgeIdSchema.make(edgeId),
        })),
      }
    : config.document

  const instanceRef: ComponentInstanceOwner = {}

  const check = () => {
    queueMicrotask(async () => {
      const instance = instanceRef.current

      if (!instance) {
        throw new Error('Missing mounted instance')
      }

      const [nodes, internals] = await Promise.all([
        instance.getNodes(),
        instance.getInternalNodes(),
      ])

      receipt.checks.push({
        nodesLength: nodes.length,
        lookupSize: internals.length,
      })
    })
  }

  const renderers: FoldkitRendererRegistry = {
    nodeTypes: {
      custom: (_node, h) => h.div([h.Class('customnode')], ['custom node']),
      checker: (_node, h) => {
        check()

        return h.div([], [_node.label])
      },
    },
    edgeTypes: {
      custom: (_edge, geometry, h) =>
        h.path(
          [
            h.Attribute(
              'd',
              `M${geometry.start.x} ${geometry.start.y} L${geometry.end.x} ${geometry.end.y}`
            ),
            h.Attribute('stroke', 'black'),
            h.DataAttribute('component-custom-edge', 'true'),
          ],
          []
        ),
      default:
        config.id === 42
          ? (edge, geometry, h, label) => {
              label(h.div([h.Class('label')], [edge.id]))

              return h.path([h.Attribute('d', geometry.path)], [])
            }
          : undefined,
    },
  }

  const { initial } = config

  const runtime = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      target,
      accepted,
      initial,
      [],
      config.controlled ? 'controlled' : 'uncontrolled',
      'uncontrolled',
      renderers,
      { minZoom: config.minZoom, maxZoom: config.maxZoom },
      'full',
      {
        ...defaultInteractionOptions,
        ...config.options,
        panOnDrag: true,
        zoomOnScroll: true,
        zoomOnDoubleClick: true,
        selectionOnDrag: false,
        isValidConnection: () => true,
      }
    )
  )

  const viewportClient = createViewportClient(
    runtime.ports,
    () => {
      const bounds = owner.getBoundingClientRect()

      return {
        width: bounds.width,
        height: bounds.height,
        originX: bounds.left,
        originY: bounds.top,
      }
    },
    initial,
    { minZoom: config.minZoom, maxZoom: config.maxZoom }
  )

  const instance = createFoldkitFlowInstance(runtime.ports, {
    viewport: viewportClient,
  })

  instanceRef.current = instance
  const flow = instance
  window.__componentSettle = async () => {
    recordNodes(receipt, await flow.getNodes())
    const { promise, resolve } = Promise.withResolvers<number>()
    requestAnimationFrame(resolve)
    await promise
  }

  const store = createFoldkitStore(runtime.ports)
  const deleteClient = createFoldkitDeleteClient(runtime, () => true)

  const pointerNames = new Set([
    'onNodeClick',
    'onNodeMouseEnter',
    'onNodeMouseMove',
    'onNodeMouseLeave',
    'onEdgeClick',
  ])

  const handlers = createFoldkitInteractionHandlers(
    runtime.ports,
    Object.fromEntries(
      componentCallbacks(config.id).flatMap((name) =>
        pointerNames.has(name) ? [[name, () => false]] : []
      )
    )
  )

  recordNodes(receipt, store.getState().nodes)
  recordDistinct(receipt.edges, store.getState().edges)
  recordDistinct(receipt.initialized, store.getState().nodesInitialized)
  recordViewport(receipt, store.getState().viewport)
  let disposed = false

  const sample = async () => {
    const nodes = await flow.getNodes()
    const edges = await flow.getEdges()

    if (disposed) {
      return
    }

    recordNodes(receipt, nodes)
    recordDistinct(receipt.edges, edges)
    recordDistinct(receipt.initialized, store.getState().nodesInitialized)
  }

  const stops = [
    store.subscribe((state) => {
      recordDistinct(receipt.initialized, state.nodesInitialized)
      recordViewport(receipt, state.viewport)
      void sample()
    }),
    runtime.ports.measurementResults.subscribe(() => {
      void sample()
    }),
    runtime.ports.viewportEvents.subscribe((event) => {
      const viewport = S.decodeUnknownSync(ViewportSchema)(event.viewport)

      switch (event.kind) {
        case 'start': {
          receipt.starts.push(viewport)
          recordEvent(receipt, 'onMoveStart')
          break
        }

        case 'change': {
          receipt.changes.push(viewport)
          recordEvent(receipt, 'onMove')
          break
        }

        case 'end': {
          receipt.ends.push(viewport)
          recordEvent(receipt, 'onMoveEnd')
          break
        }

        default: {
          const exhaustive: never = event.kind
          throw new Error(String(exhaustive))
        }
      }
    }),
    runtime.ports.interactionEvents.subscribe((events) => {
      for (const event of events) {
        if (!['onMoveStart', 'onMove', 'onMoveEnd'].includes(event.name)) {
          recordEvent(receipt, event.name)
        }
      }
    }),
    runtime.ports.elementChanges.subscribe((changes) => {
      if (changes.nodes.length) {
        receipt.nodeChanges.push(changes.nodes)
      }

      if (config.controlled) {
        const next = applyFoldkitElementChanges(accepted, {
          nodes: config.applyNodes
            ? S.decodeUnknownSync(S.Array(NodeChangeSchema))(changes.nodes)
            : [],
          edges: config.applyEdges
            ? S.decodeUnknownSync(S.Array(EdgeChangeSchema))(
                changes.edges.filter((change) => change.type !== 'add')
              )
            : [],
        })

        if (JSON.stringify(next) !== JSON.stringify(accepted)) {
          accepted = next
          runtime.ports.actions.send(
            HostAction.ReplaceDocument({ document: next })
          )
        }
      }
    }),
    runtime.ports.changes.subscribe((change) => {
      if (
        change.kind === 'edge-add' &&
        config.controlled &&
        config.applyConnect
      ) {
        accepted = S.decodeUnknownSync(FlowDocumentSchema)({
          ...accepted,
          edges: [...accepted.edges, change.edge],
        })
        runtime.ports.actions.send(
          HostAction.ReplaceDocument({ document: accepted })
        )
      }
    }),
  ]

  const observer = createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => store.getState().viewport.zoom,
    onMeasure: (requests) => {
      runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))
    },
  })

  window.__componentUpdate = async () => {
    await flow.updateNode('1', { style: { width: 200, height: 100 } })
  }

  let frame = 0

  const ready = async () => {
    if (disposed) {
      return
    }

    const graph = createFlowGraph(accepted)
    const pane = owner.querySelector<HTMLElement>('.flow-foldkit-canvas')

    if (
      !pane ||
      (graph.nodes.size > 0 &&
        config.id !== 66 &&
        !config.options.onlyRenderVisibleElements &&
        !store.getState().nodesInitialized)
    ) {
      frame = requestAnimationFrame(() => {
        void ready()
      })

      return
    }

    if (config.fit) {
      try {
        await viewportClient.fitView(config.fitOptions)
      } catch (error) {
        receipt.errors.push(
          error instanceof Error ? error.message : String(error)
        )
      }
    }

    if (config.id === 32) {
      pane.style.backgroundColor = 'red'
    }

    if (config.id === 33) {
      pane.classList.add('custom')
    }

    if (config.id !== 66) {
      await sample()
    }

    root.dataset.upstreamReady = 'true'
  }

  const initialize = async () => {
    await store.ready
    await ready()
  }

  void initialize()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)

    for (const stop of stops) {
      stop()
    }

    observer.dispose()
    handlers.dispose()
    deleteClient.dispose()
    store.dispose()
    flow.dispose()
    viewportClient.dispose()
    runtime.dispose()
  }
}

const owner = document.createElement('div')

owner.id = `upstream-component-foldkit-${mountNumber}`

owner.style.cssText = 'width:100%;height:100%'

root.append(owner)

if (config.id === 73 || config.id === 74) {
  root.style.height = '2000px'
  owner.style.height = '500px'
}

let stop: () => void = () => false

const start = () => {
  try {
    stop = mount(owner)
  } catch (error) {
    receipt.errors.push(error instanceof Error ? error.message : String(error))
    root.dataset.upstreamReady = 'true'
  }
}

if (config.id === 42) {
  owner.style.height = '50%'
  const second = document.createElement('div')
  second.id = 'upstream-component-foldkit-second'
  second.style.cssText = 'width:100%;height:50%'
  root.append(second)
  const firstStop = mount(owner, 'edge1')
  const secondStop = mount(second, 'edge2')
  stop = () => {
    firstStop()
    secondStop()
  }
} else {
  start()
}

window.__componentRemount = () => {
  root.dataset.upstreamReady = 'false'
  stop()
  owner.replaceChildren()
  mountNumber += 1
  owner.id = `upstream-component-foldkit-${mountNumber}`
  start()
}

mountComponentControls(root, config.id)

window.addEventListener('pagehide', () => stop(), { once: true })
