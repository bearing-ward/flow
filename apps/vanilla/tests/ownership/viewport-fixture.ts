import {
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../../../apps/shared-e2e/node-reentry-fixture.ts'
import { createFlow } from '../../src/mount-flow.ts'

const observationPointer = (
  canvas: Element,
  type: string,
  id: number,
  x: number,
  y: number,
  touch = false
) =>
  canvas.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      pointerType: touch ? 'touch' : 'mouse',
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: x,
      clientY: y,
    })
  )

export const viewportContinuationProof = async (
  route: 'pan' | 'pinch' | 'wheel' | 'doubleclick' | 'start-cancel',
  successor: boolean
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const events: { name: string; payload: unknown }[] = []
  let admitted = false
  let cancelled = false

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    panOnDrag: true,
    panOnScroll: true,
    zoomOnDoubleClick: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onMoveStart: (value) => {
      record('start', value)

      if (route === 'start-cancel' && !cancelled) {
        cancelled = true
        window.dispatchEvent(new Event('blur'))
      }
    },
    onMove: (value) => record('move', value),
    onMoveEnd: (value) => {
      record('end', value)

      if (successor && !admitted) {
        admitted = true
        observationPointer(
          requiredElement(root, '.flow-canvas'),
          'pointerdown',
          8,
          650,
          350
        )
      }
    },
  })

  controller.subscribe((value) => record('change', value))
  controller.subscribeViewport((value) => record('observe', value))
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const canvas = requiredElement(root, '.flow-canvas')

  try {
    if (route === 'wheel') {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          clientX: 650,
          clientY: 350,
          deltaX: 20,
          deltaY: 30,
        })
      )
    } else if (route === 'doubleclick') {
      canvas.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          clientX: 650,
          clientY: 350,
        })
      )
    } else if (route === 'pinch') {
      observationPointer(canvas, 'pointerdown', 7, 650, 350, true)
      observationPointer(canvas, 'pointerdown', 9, 750, 350, true)
      observationPointer(canvas, 'pointermove', 9, 850, 350, true)
      observationPointer(canvas, 'pointerup', 9, 850, 350, true)
    } else {
      observationPointer(canvas, 'pointerdown', 7, 650, 350)

      if (route === 'pan') {
        // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 ends the last move transform.
        observationPointer(canvas, 'pointermove', 7, 670, 380)
        observationPointer(canvas, 'pointerup', 7, 670, 380)
      }
    }

    const afterA = {
      events: structuredClone(events),
      captures: [...capture.history],
      held: capture.count(),
      viewport: controller.getSnapshot().viewport,
    }

    if (successor) {
      observationPointer(canvas, 'pointermove', 8, 660, 370)
      observationPointer(canvas, 'pointerup', 8, 660, 370)
    }

    return {
      afterA,
      events,
      captures: capture.history,
      held: capture.count(),
      viewport: controller.getSnapshot().viewport,
    }
  } finally {
    await controller.destroyAsync()
    root.remove()
  }
}
