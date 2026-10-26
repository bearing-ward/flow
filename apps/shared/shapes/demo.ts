import { Effect } from 'effect'

import {
  decodeFlowDocument,
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  flowFigureColors,
  flowFigureKinds,
  prepareFlowEdit,
  prepareFlowFigureEdit,
} from '../../../packages/core/src/public.ts'
import type {
  FlowDocument,
  FlowEditTransaction,
  FlowHistoryStatus,
  FlowFigureKind,
  Viewport,
} from '../../../packages/core/src/public.ts'

export const figuresDocument = (): FlowDocument => {
  let document = Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))

  for (const [index, type] of flowFigureKinds.entries()) {
    const transaction = Effect.runSync(
      prepareFlowFigureEdit(document, {
        kind: 'create',
        id: type,
        position: { x: 100 + index * 240, y: 150 },
        figure: { type, color: flowFigureColors[index] ?? flowFigureColors[0] },
      })
    )

    const result = Effect.runSync(prepareFlowEdit(document, transaction))

    ;({ document } = result)
  }

  return {
    ...document,
    nodes: document.nodes.map((node) => ({
      ...node,
      data: { ...node.data, opaque: { keep: ['shape', 7] } },
    })),
  }
}

export interface FiguresDemo {
  readonly document: () => Promise<FlowDocument>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly edit: (transaction: FlowEditTransaction) => Promise<void>
  readonly undo: () => void
  readonly redo: () => void
  readonly copy: () => void
  readonly paste: () => void
  readonly viewport: (viewport: Viewport) => void
  readonly dispose: () => void
}

declare global {
  var flowFiguresDemo: FiguresDemo | undefined
}

/** Application controls shared by the three recipes. Accepted state remains host-owned. */
export const mountFiguresControls = (demo: FiguresDemo) => {
  globalThis.flowFiguresDemo = demo
  const palette = document.querySelector('#shape-palette')
  const controls = document.querySelector('#shape-controls')
  const colorToolbar = document.querySelector<HTMLElement>('#shape-colors')
  const status = document.querySelector('#shape-status')

  if (
    palette === null ||
    controls === null ||
    colorToolbar === null ||
    status === null
  ) {
    throw new Error('Missing figure controls')
  }

  let selected: string | undefined
  let saved: unknown
  let disposed = false
  const abort = new AbortController()

  let frame: number | undefined

  const positionToolbar = () => {
    frame = undefined

    const element = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="flow-node"][data-node-id]'
      ),
    ].find((candidate) => candidate.dataset.nodeId === selected)

    if (element !== undefined) {
      const bounds = element.getBoundingClientRect()
      colorToolbar.style.left = `${bounds.x + bounds.width / 2}px`
      colorToolbar.style.top = `${bounds.y - 12}px`
    }
  }

  const scheduleToolbar = () => {
    frame ??= requestAnimationFrame(positionToolbar)
  }

  const observer = new MutationObserver(scheduleToolbar)
  const canvas = document.querySelector('#app')

  if (canvas !== null) {
    observer.observe(canvas, {
      attributes: true,
      subtree: true,
      childList: true,
    })
  }

  const dispose = () => {
    disposed = true
    abort.abort()
    observer.disconnect()

    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }

    globalThis.flowFiguresDemo = undefined
    colorToolbar.hidden = true
  }

  const button = (
    parent: Element,
    label: string,
    action: () => void | Promise<void>
  ) => {
    const element = document.createElement('button')
    element.type = 'button'
    element.textContent = label
    element.addEventListener(
      'click',
      async () => {
        try {
          await action()
          status.textContent = ''
        } catch {
          status.textContent = 'Shape data rejected. The graph is unchanged.'
        }
      },
      { signal: abort.signal }
    )
    parent.append(element)
  }

  const create = async (type: FlowFigureKind) => {
    const current = await demo.document()
    let sequence = 1

    while (current.nodes.some((node) => node.id === `${type}-${sequence}`)) {
      sequence += 1
    }

    const transaction = await Effect.runPromise(
      prepareFlowFigureEdit(current, {
        kind: 'create',
        id: `${type}-${sequence}`,
        position: {
          x: 100 + (current.nodes.length % 3) * 240,
          y: 340 + Math.floor((current.nodes.length - 3) / 3) * 150,
        },
        figure: { type, color: flowFigureColors[0] },
      })
    )

    await demo.edit(transaction)
  }

  for (const type of flowFigureKinds) {
    button(palette, `Create ${type}`, () => create(type))
  }

  const recolor = async (color: (typeof flowFigureColors)[number]) => {
    if (selected === undefined) {
      return
    }

    const transaction = await Effect.runPromise(
      prepareFlowFigureEdit(await demo.document(), {
        kind: 'color',
        nodeId: selected,
        color,
      })
    )

    await demo.edit(transaction)
  }

  for (const color of flowFigureColors) {
    button(colorToolbar, `Color ${color}`, () => recolor(color))
  }

  button(controls, 'Undo', demo.undo)
  button(controls, 'Redo', demo.redo)
  button(controls, 'Copy', demo.copy)
  button(controls, 'Paste', demo.paste)
  button(controls, 'Transform viewport', () =>
    demo.viewport({ x: 60, y: 40, zoom: 0.75 })
  )
  button(controls, 'Save', async () => {
    saved = encodeVersionedFlowDocument(await demo.document())
  })

  const load = async (decoded: FlowDocument) => {
    await demo.edit({
      operations: [
        { kind: 'set-nodes', nodes: decoded.nodes },
        { kind: 'set-edges', edges: decoded.edges },
      ],
    })
  }

  button(controls, 'Load', async () =>
    load(await Effect.runPromise(decodeVersionedFlowDocument(saved)))
  )
  button(controls, 'Load malformed shape', async () => {
    const current = await demo.document()
    const envelope = encodeVersionedFlowDocument(current)
    await load(
      await Effect.runPromise(
        decodeVersionedFlowDocument({
          ...envelope,
          document: {
            ...current,
            nodes: current.nodes.map((node, index) =>
              index === 0
                ? {
                    ...node,
                    data: { type: 'arbitrary-svg', color: 'url(unsafe)' },
                  }
                : node
            ),
          },
        })
      )
    )
  })
  button(controls, 'Dispose', () => {
    demo.dispose()
    dispose()
  })

  const refresh = (current: FlowDocument) => {
    if (disposed) {
      return
    }

    selected = current.nodes.find(
      (node) => node.selected && node.type === 'shape'
    )?.id
    colorToolbar.hidden = selected === undefined
    colorToolbar.dataset.nodeId = selected ?? ''
    scheduleToolbar()
  }

  void demo.document().then(refresh)

  return { refresh, dispose }
}
