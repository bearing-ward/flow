import { flowNodeHandles } from '@flow/core'
import type { FlowNode, MeasuredHandle } from '@flow/core'

/**
 * The scale of the rendered viewport transform around `element`. Layout reads
 * reflect this transform, which can lag the reactive viewport right after a
 * viewport change, so client rects are divided by it, not by the viewport.
 */
export const renderedViewportZoom = (
  element: HTMLElement,
  fallback: number
): number => {
  const viewportElement = element.closest<HTMLElement>('.flow-vue-viewport')

  if (viewportElement === null) {
    return fallback
  }

  const { transform } = getComputedStyle(viewportElement)

  if (transform === '' || transform === 'none') {
    return fallback
  }

  const matrix = new DOMMatrixReadOnly(transform)
  const scale = Math.hypot(matrix.a, matrix.b)

  return Number.isFinite(scale) && scale > 0 ? scale : fallback
}

/** Handle centers and sizes in flow units, relative to the node's box. */
export const collectNodeHandles = (
  node: FlowNode,
  element: HTMLElement,
  nodeBounds: DOMRect,
  zoom: number
): readonly MeasuredHandle[] => {
  const measurements: [string, MeasuredHandle][] = []

  for (const handleElement of element.querySelectorAll<HTMLElement>(
    '[data-handle-id]'
  )) {
    const handle = flowNodeHandles(node).find(
      (candidate) => candidate.id === handleElement.dataset.handleId
    )

    if (
      handle === undefined ||
      handleElement.closest('[data-testid="flow-node"]') !== element ||
      handleElement.getClientRects().length === 0
    ) {
      continue
    }

    const bounds = handleElement.getBoundingClientRect()

    measurements.push([
      handle.id,
      {
        nodeId: node.id,
        handleId: handle.id,
        offset: {
          x: (bounds.left + bounds.width / 2 - nodeBounds.left) / zoom,
          y: (bounds.top + bounds.height / 2 - nodeBounds.top) / zoom,
        },
        width: bounds.width / zoom,
        height: bounds.height / zoom,
      },
    ])
  }

  return [...new Map(measurements).values()]
}
