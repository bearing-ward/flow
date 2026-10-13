import { Effect } from 'effect'

import { decodeFlowDocument } from '../../packages/core/dist/public.js'

export type PhysicalActor =
  | 'node'
  | 'connection'
  | 'reconnection'
  | 'resize'
  | 'selection'
  | 'pan'

export const reentryDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 20, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          selected: true,
          position: { x: 220, y: 20 },
          size: { width: 150, height: 45 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 420, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'edge',
          selected: true,
          reconnectable: true,
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in',
        },
      ],
    })
  )

export const reentryRoot = () => {
  const root = document.createElement('div')
  root.style.cssText = 'width:900px;height:600px;position:relative'
  document.body.replaceChildren(root)

  return root
}

export const requiredElement = (root: Element, selector: string) => {
  const element = root.querySelector(selector)

  if (element === null) {
    throw new Error(`Missing ${selector}`)
  }

  return element
}

const defaultPoint = { x: 40, y: 40 }

export const dispatchPointer = (
  element: Element,
  type: string,
  point = defaultPoint,
  shiftKey = false
) =>
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: 7,
      clientX: point.x,
      clientY: point.y,
      shiftKey,
    })
  )

export const center = (element: Element) => {
  const bounds = element.getBoundingClientRect()

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

export const syntheticCaptures = (root: Element) => {
  const attempts: string[] = []

  const history: { action: 'set' | 'release'; target: string; id: number }[] =
    []

  const held = new Map<Element, Set<number>>()

  for (const element of root.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      continue
    }

    const ids = new Set<number>()
    held.set(element, ids)

    const label =
      element.dataset.nodeId ??
      element.dataset.direction ??
      element.dataset.endpoint ??
      'canvas'

    element.setPointerCapture = (id) => {
      attempts.push(label)
      ids.add(id)
      history.push({ action: 'set', target: label, id })
    }

    element.hasPointerCapture = (id) => ids.has(id)
    element.releasePointerCapture = (id) => {
      ids.delete(id)
      history.push({ action: 'release', target: label, id })
    }
  }

  return {
    attempts,
    history,
    count: () => [...held.values()].reduce((total, ids) => total + ids.size, 0),
  }
}

export const actorTarget = (
  root: Element,
  host: 'vue' | 'vanilla',
  actor: PhysicalActor
) => {
  const prefix = host === 'vue' ? 'flow-vue' : 'flow'

  const selectors = {
    node: `.${prefix}-node[data-node-id="b"]`,
    connection: `.${prefix}-node[data-node-id="b"] [data-handle-id="out"]`,
    reconnection: `.${prefix}-edge-reconnect-anchor[data-endpoint="target"]`,
    resize: `.${prefix}-node[data-node-id="b"] [data-direction="right"]`,
    selection: `.${prefix}-canvas`,
    pan: `.${prefix}-canvas`,
  }

  return requiredElement(root, selectors[actor])
}

export const actorInput = (
  root: Element,
  host: 'vue' | 'vanilla',
  actor: PhysicalActor
) => {
  const target = actorTarget(root, host, actor)

  const start =
    actor === 'pan' || actor === 'selection'
      ? { x: 650, y: 300 }
      : center(target)

  const end =
    actor === 'connection' || actor === 'reconnection'
      ? center(
          requiredElement(root, '[data-node-id="c"] [data-handle-id="in"]')
        )
      : { x: start.x + 12, y: start.y + (actor === 'selection' ? 12 : 0) }

  return {
    down: () =>
      dispatchPointer(target, 'pointerdown', start, actor === 'selection'),
    finish: () => {
      dispatchPointer(target, 'pointermove', end, actor === 'selection')
      dispatchPointer(target, 'pointerup', end, actor === 'selection')
    },
  }
}

export const mountedGeometry = () => {
  const ready = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => requestAnimationFrame(() => ready.resolve()))

  return ready.promise
}
