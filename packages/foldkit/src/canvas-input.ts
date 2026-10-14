import {
  createFlowGraph,
  getFlowMeasuredNodes,
  NodeIdSchema,
  selectionAutoPanDelta,
} from '@flow/core'

import type { Message, GraphMessageData, Model } from './graph.ts'
import { observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyCode } from './key-press-observer.ts'

/** Native subscriptions owned and disposed with the program pointer resource. */
export const observeCanvasInput = (
  messages: Pick<typeof Message, 'SetCanvasKey' | 'AutoPan' | 'DeleteSelected'>,
  model: () => Model,
  getCanvas: () => HTMLElement | null,
  isPressed: () => boolean,
  emit: (message: GraphMessageData) => void
): (() => void) => {
  let lastPointer: { x: number; y: number } | undefined

  const rememberPointer = (event: PointerEvent): void => {
    lastPointer = { x: event.clientX, y: event.clientY }
  }

  const observeModifier = (
    key: FlowKeyCode,
    kind: 'selection' | 'multiSelection' | 'zoom'
  ): (() => void) => {
    let initializing = true

    return observeKeyPress(
      key,
      (pressed) => {
        if (initializing) {
          initializing = false

          return
        }

        emit(messages.SetCanvasKey({ kind, pressed }))
      },
      { preventDefault: false }
    )
  }

  const keyStops = [
    observeModifier(model().selectionKeyCode, 'selection'),
    observeModifier(model().multiSelectionKeyCode, 'multiSelection'),
    observeModifier(model().zoomActivationKeyCode, 'zoom'),
    observeKeyPress(model().deleteKeyCode, (isKeyPressed) => {
      if (isKeyPressed && getCanvas()?.contains(document.activeElement)) {
        emit(messages.DeleteSelected())
      }
    }),
  ]

  const focus = (event: FocusEvent): void => {
    if (
      !model().autoPanOnNodeFocus ||
      model().disableKeyboardA11y ||
      !(event.target instanceof Element)
    ) {
      return
    }

    const node = event.target.closest<HTMLElement>('[data-node-id]')
    const canvas = getCanvas()

    if (
      node === null ||
      canvas === null ||
      canvas.clientWidth <= 0 ||
      canvas.clientHeight <= 0 ||
      !canvas.contains(node) ||
      !node.matches(':focus-visible')
    ) {
      return
    }

    const current = model()
    const id = node.dataset.nodeId

    if (id === undefined) {
      return
    }

    const resolved = createFlowGraph(
      current.document,
      getFlowMeasuredNodes(current.document, current.measurements)
    ).nodes.get(NodeIdSchema.make(id))

    if (resolved === undefined) {
      return
    }

    const left =
      resolved.absolutePosition.x * current.viewport.zoom + current.viewport.x

    const top =
      resolved.absolutePosition.y * current.viewport.zoom + current.viewport.y

    const width = resolved.dimensions.width * current.viewport.zoom
    const height = resolved.dimensions.height * current.viewport.zoom

    const inside =
      left < canvas.clientWidth &&
      top < canvas.clientHeight &&
      left + width > 0 &&
      top + height > 0

    const x = inside ? 0 : canvas.clientWidth / 2 - (left + width / 2)
    const y = inside ? 0 : canvas.clientHeight / 2 - (top + height / 2)

    canvas.scrollLeft = 0
    canvas.scrollTop = 0

    if (x !== 0 || y !== 0) {
      emit(messages.AutoPan({ x, y }))
    }
  }

  let frame = 0

  const autoPanFrame = (): void => {
    const canvas = getCanvas()
    const current = model()

    const nodeDrag =
      current.autoPanOnNodeDrag && current.pointerSession?.kind === 'node-drag'

    const selection =
      current.autoPanOnSelection &&
      current.gestureSession?.kind === 'selection' &&
      current.gestureSession.pointerId !== -2

    if (
      canvas !== null &&
      canvas.clientWidth > 0 &&
      canvas.clientHeight > 0 &&
      lastPointer !== undefined &&
      isPressed() &&
      (nodeDrag || selection)
    ) {
      const bounds = canvas.getBoundingClientRect()

      const delta = selectionAutoPanDelta(
        { x: lastPointer.x - bounds.left, y: lastPointer.y - bounds.top },
        bounds.width,
        bounds.height,
        40,
        model().autoPanSpeed
      )

      if (delta.x !== 0 || delta.y !== 0) {
        emit(messages.AutoPan(delta))
      }
    }

    frame = requestAnimationFrame(autoPanFrame)
  }

  frame = requestAnimationFrame(autoPanFrame)
  document.addEventListener('pointermove', rememberPointer, true)
  document.addEventListener('focusin', focus)

  return () => {
    cancelAnimationFrame(frame)

    for (const stop of keyStops) {
      stop()
    }

    document.removeEventListener('pointermove', rememberPointer, true)
    document.removeEventListener('focusin', focus)
  }
}
