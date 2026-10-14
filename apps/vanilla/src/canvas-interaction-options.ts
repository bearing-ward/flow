import { FlowStyleSchema } from '@flow/core'
import type { FlowEdge } from '@flow/core'
import { Schema as S } from 'effect'

import type { FlowKeyCode } from './key-press-observer.ts'
import { observeKeyPress } from './key-press-observer.ts'

const keyCode = S.Union([S.String, S.Array(S.String), S.Null])

const distance = S.Finite.check(S.isGreaterThanOrEqualTo(0))

export const CanvasInteractionOptionsSchema = S.Struct({
  deleteKeyCode: S.optional(keyCode),
  selectionKeyCode: S.optional(keyCode),
  multiSelectionKeyCode: S.optional(keyCode),
  zoomActivationKeyCode: S.optional(keyCode),
  autoPanOnNodeDrag: S.optional(S.Boolean),
  autoPanOnSelection: S.optional(S.Boolean),
  autoPanOnNodeFocus: S.optional(S.Boolean),
  autoPanSpeed: S.optional(distance),
  reconnectRadius: S.optional(distance),
  paneClickDistance: S.optional(distance),
  nodeClickDistance: S.optional(distance),
  preventScrolling: S.optional(S.Boolean),
  connectionLineStyle: S.optional(FlowStyleSchema),
  connectionLineContainerStyle: S.optional(FlowStyleSchema),
  noDragClassName: S.optional(S.NonEmptyString),
  noWheelClassName: S.optional(S.NonEmptyString),
  noPanClassName: S.optional(S.NonEmptyString),
  edgesReconnectable: S.optional(S.Boolean),
})

export type CanvasInteractionOptions =
  typeof CanvasInteractionOptionsSchema.Type

export const noGestureSelector = (
  gesture: 'drag' | 'wheel' | 'pan',
  className: string | undefined
): string =>
  `[data-flow-no-${gesture}], [data-flow-no${gesture}], .${CSS.escape(className ?? `no${gesture}`)}`

export const reconnectableEdge = (
  edge: FlowEdge,
  canvasDefault: boolean | undefined
): FlowEdge => ({
  ...edge,
  reconnectable: edge.reconnectable ?? canvasDefault ?? true,
})

export const matchesKeyEvent = (
  event: MouseEvent | KeyboardEvent,
  code: FlowKeyCode
): boolean => {
  if (code === null) {
    return false
  }

  const alternatives: readonly string[] = Array.isArray(code) ? code : [code]

  return alternatives.some((alternative) =>
    alternative
      .split('+')
      .every(
        (part) =>
          (part === 'Control' && event.ctrlKey) ||
          (part === 'Meta' && event.metaKey) ||
          (part === 'Shift' && event.shiftKey) ||
          (part === 'Alt' && event.altKey) ||
          ('key' in event && (event.key === part || event.code === part))
      )
  )
}

export const bindCanvasKeys = (
  options: CanvasInteractionOptions,
  disposers: Set<() => void>
) => {
  let deleteHeld = false
  let selectionHeld = false
  let multiHeld = false
  let zoomHeld = false

  disposers.add(
    observeKeyPress(
      options.deleteKeyCode ?? null,
      (held) => {
        deleteHeld = held
      },
      {
        capture: true,
        actInsideInputWithModifier: false,
        preventDefault: false,
      }
    )
  )

  for (const [code, listener] of [
    [
      options.selectionKeyCode ?? null,
      (held: boolean) => {
        selectionHeld = held
      },
    ],
    [
      options.multiSelectionKeyCode ?? null,
      (held: boolean) => {
        multiHeld = held
      },
    ],
    [
      options.zoomActivationKeyCode ?? null,
      (held: boolean) => {
        zoomHeld = held
      },
    ],
  ] as const) {
    disposers.add(observeKeyPress(code, listener, { preventDefault: false }))
  }

  return {
    deletePressed: (event: KeyboardEvent): boolean =>
      options.deleteKeyCode === undefined
        ? matchesKeyEvent(event, ['Delete', 'Backspace'])
        : deleteHeld,
    get selectionHeld() {
      return selectionHeld
    },
    get zoomHeld() {
      return zoomHeld
    },
    multiSelection: (event: MouseEvent | KeyboardEvent): boolean =>
      options.multiSelectionKeyCode === undefined
        ? event.metaKey || event.ctrlKey
        : multiHeld || matchesKeyEvent(event, options.multiSelectionKeyCode),
  }
}

export const allowsCanvasWheel = (
  target: EventTarget | null,
  className: string | undefined
): boolean =>
  !(target instanceof Element) ||
  (target.closest(
    'button, input, select, textarea, a[href], [contenteditable="true"]'
  ) === null &&
    target.closest(noGestureSelector('wheel', className)) === null)

export const focusPanDelta = (node: DOMRect, pane: DOMRect) => {
  const intersects =
    node.right > pane.left &&
    node.left < pane.right &&
    node.bottom > pane.top &&
    node.top < pane.bottom

  return intersects
    ? { x: 0, y: 0 }
    : {
        x: pane.left + pane.width / 2 - node.left - node.width / 2,
        y: pane.top + pane.height / 2 - node.top - node.height / 2,
      }
}
