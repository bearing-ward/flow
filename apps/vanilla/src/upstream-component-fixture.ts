import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  EdgeIdSchema,
} from '@flow/core'
import { mountFlow } from '@flow/vanilla'
import type { JavaScriptFlowController } from '@flow/vanilla'

import {
  componentCallbacks,
  mountComponentControls,
  componentConfig,
  componentReceipt,
  controlledDocument,
  recordDistinct,
  recordEvent,
  recordNodes,
  recordViewport,
} from '../../shared/upstream/component.ts'
import { prepareUpstreamRoot } from '../../shared/upstream/fixture.ts'

import '@flow/vanilla/style.css'

const root = prepareUpstreamRoot()

const config = componentConfig(Number(location.pathname.split('/').at(-1)))

const receipt = componentReceipt()

const ownership = controlledDocument(config)

let controller: JavaScriptFlowController

let stop: () => void = () => false

const recordStore = (flow: JavaScriptFlowController) =>
  receipt.checks.push({
    nodesLength: flow.getNodes().length,
    lookupSize: flow
      .getNodes()
      .filter((n) => flow.getInternalNode(n.id) !== undefined).length,
  })

const mount = (owner: HTMLElement, edgeId?: string) => {
  const graphDocument = edgeId
    ? {
        ...config.document,
        edges: config.document.edges.map((e) => ({
          ...e,
          id: EdgeIdSchema.make(edgeId),
        })),
      }
    : ownership.current

  const events = Object.fromEntries(
    [
      'onNodeClick',
      'onNodeDoubleClick',
      'onNodeContextMenu',
      'onNodeMouseEnter',
      'onNodeMouseMove',
      'onNodeMouseLeave',
      'onEdgeClick',
      'onEdgeDoubleClick',
      'onEdgeContextMenu',
      'onEdgeMouseEnter',
      'onEdgeMouseMove',
      'onEdgeMouseLeave',
      'onPaneClick',
      'onPaneContextMenu',
      'onNodeDragStart',
      'onNodeDrag',
      'onNodeDragStop',
    ]
      .values()
      .filter((name) => componentCallbacks(config.id).includes(name))
      .map((name) => [name, () => recordEvent(receipt, name)])
      .toArray()
  )

  const layoutChecks: ((flow: JavaScriptFlowController) => void)[] = []

  const options = {
    ...config.options,
    renderOnlyVisible: config.options.onlyRenderVisibleElements,
    documentMode: config.controlled ? 'controlled' : 'uncontrolled',
    fitView: false,
    viewport: {
      mode: 'uncontrolled',
      initial: config.initial,
      limits: { minZoom: config.minZoom, maxZoom: config.maxZoom },
    },
    ...events,
    onInit: (flow: JavaScriptFlowController) => {
      recordEvent(receipt, 'onInit')

      for (const check of layoutChecks) {
        check(flow)
      }
    },
    onMoveStart: ({ viewport }) => {
      receipt.starts.push(viewport)
      recordEvent(receipt, 'onMoveStart')
    },
    onMove: ({ viewport }) => {
      receipt.changes.push(viewport)
      recordEvent(receipt, 'onMove')
    },
    onMoveEnd: ({ viewport }) => {
      receipt.ends.push(viewport)
      recordEvent(receipt, 'onMoveEnd')
    },
    onNodesChange: (changes) => {
      receipt.nodeChanges.push(changes)

      if (config.controlled && config.applyNodes) {
        ownership.current = {
          ...ownership.current,
          nodes: applyNodeChanges(changes, ownership.current.nodes),
        }
        controller?.update(ownership.current)
      }
    },
    onEdgesChange: (changes) => {
      if (config.controlled && config.applyEdges) {
        ownership.current = {
          ...ownership.current,
          // ControlledFlow.tsx:45: onConnect owns connection additions.
          edges: applyEdgeChanges(
            changes.filter((change) => change.type !== 'add'),
            ownership.current.edges
          ),
        }
        controller?.update(ownership.current)
      }
    },
    onConnect: ({ source, target, sourceHandle, targetHandle }) => {
      if (config.controlled && config.applyConnect) {
        ownership.current = {
          ...ownership.current,
          edges: addEdge(
            { source, target, sourceHandle, targetHandle },
            ownership.current.edges
          ),
        }
        controller?.update(ownership.current)
      }
    },
    nodeRenderers: {
      checker: (node, content) => {
        content.textContent = node.label

        if (config.id === 49) {
          layoutChecks.push(recordStore)
        } else {
          queueMicrotask(() => recordStore(controller))
        }

        return {
          update: (next) => {
            content.textContent = next.label
          },
          destroy: () => content.replaceChildren(),
        }
      },
      custom: (_node, content) => {
        content.className = 'customnode'
        content.textContent = 'custom node'

        return {
          update: () => false,
          destroy: () => content.replaceChildren(),
        }
      },
    },
    edgeRenderers:
      config.id === 42
        ? {
            custom: {
              render: (_edge, context, group) => {
                const path = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'path'
                )

                path.setAttribute(
                  'd',
                  `M${context.source.x} ${context.source.y} L${context.target.x} ${context.target.y}`
                )
                path.setAttribute('stroke', 'black')
                path.dataset.componentCustomEdge = 'true'
                group.append(path)

                return { update: () => false, destroy: () => path.remove() }
              },
            },
            default: {
              render: (edge, context, group) => {
                const label = document.createElement('div')
                label.className = 'label'
                label.textContent = edge.id
                context.edgeLabelRenderer.append(label)

                const path = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'path'
                )

                path.setAttribute('d', context.pathData)
                group.append(path)

                return {
                  update: () => false,
                  destroy: () => label.remove(),
                }
              },
            },
          }
        : {
            custom: {
              render: (_edge, context, group) => {
                const path = document.createElementNS(
                  'http://www.w3.org/2000/svg',
                  'path'
                )

                path.setAttribute(
                  'd',
                  `M${context.source.x} ${context.source.y} L${context.target.x} ${context.target.y}`
                )
                path.setAttribute('stroke', 'black')
                path.dataset.componentCustomEdge = 'true'
                group.append(path)

                return { update: () => false, destroy: () => path.remove() }
              },
            },
          },
  } satisfies NonNullable<Parameters<typeof mountFlow>[2]>

  const current = mountFlow(owner, graphDocument, options)

  return current
}

const owner = document.createElement('div')

owner.style.cssText = 'width:100%;height:100%'

root.append(owner)

if (config.id === 73 || config.id === 74) {
  root.style.height = '2000px'
  owner.style.height = '500px'
}

const start = () => {
  controller = mount(owner)

  const sample = () => {
    recordNodes(receipt, controller.getNodes())
    recordDistinct(receipt.edges, controller.getEdges())
    recordDistinct(receipt.initialized, controller.nodesInitialized())
    recordViewport(receipt, controller.getViewport())
  }

  sample()

  const stops = [
    controller.subscribeState(sample),
    controller.subscribeViewport(sample),
  ]

  // Measurement publication is observable via the public getters, including mounts
  // without an accepted-document change. This loop never invents an initial value.
  let frame = 0

  const poll = () => {
    sample()
    frame = requestAnimationFrame(poll)
  }

  frame = requestAnimationFrame(poll)
  stop = () => {
    cancelAnimationFrame(frame)

    for (const unsubscribe of stops) {
      unsubscribe()
    }

    controller.destroy()
  }

  const ready = async () => {
    if (
      config.document.nodes.length &&
      !config.options.onlyRenderVisibleElements &&
      !controller.nodesInitialized()
    ) {
      requestAnimationFrame(() => {
        void ready()
      })

      return
    }

    if (config.fit) {
      try {
        await controller.fitView(config.fitOptions)
      } catch (error) {
        receipt.errors.push(
          error instanceof Error ? error.message : String(error)
        )
      }
    }

    if (config.id === 32) {
      owner
        .querySelector<HTMLElement>('.flow-canvas')
        ?.style.setProperty('background-color', 'red')
    }

    if (config.id === 33) {
      owner.querySelector('.flow-canvas')?.classList.add('custom')
    }

    root.dataset.upstreamReady = 'true'
  }

  void ready()
}

if (config.id === 42) {
  owner.style.height = '50%'
  const second = document.createElement('div')
  second.style.cssText = 'width:100%;height:50%'
  root.append(second)
  controller = mount(owner, 'edge1')
  const other = mount(second, 'edge2')
  stop = () => {
    controller.destroy()
    other.destroy()
  }

  root.dataset.upstreamReady = 'true'
} else {
  try {
    start()
  } catch (error) {
    receipt.errors.push(error instanceof Error ? error.message : String(error))
    root.dataset.upstreamReady = 'true'
  }
}

window.__componentUpdate = async () => {
  await controller.updateNode('1', { style: { width: 200, height: 100 } })
}

window.__componentRemount = () => {
  root.dataset.upstreamReady = 'false'
  stop()
  start()
}

mountComponentControls(root, config.id)

window.addEventListener('pagehide', () => stop(), { once: true })
