import type { Page } from '@playwright/test'

export interface EdgeLabelGeometry {
  readonly expected: { readonly x: number; readonly y: number }
  readonly center: { readonly x: number; readonly y: number }
  readonly text: { readonly width: number; readonly height: number }
  readonly background: {
    readonly width: number
    readonly height: number
    readonly rx: string | null
  } | null
  readonly visibility: string | null
}

export interface EdgePathAttributes {
  readonly visibleD: string | null
  readonly visibleClass: string | null
  readonly visibleFill: string | null
  readonly stroke: string | null
  readonly computedStroke: string | null
  readonly computedStrokeWidth: string | null
  readonly markerEnd: string | null
  readonly interactionClass: string | null
  readonly interactionD: string | null
  readonly interactionWidth: string | null
  readonly interactionOpacity: string | null
}

declare global {
  interface Window {
    __readSharedEdgeLabel?: (
      selector: string,
      backgroundSelector: string,
      point: { readonly x: number; readonly y: number }
    ) => EdgeLabelGeometry
    __readSharedEdgePath?: (selector: string) => EdgePathAttributes
  }
}

/** Installs page-side readers that measure labels against their parent's screen matrix. */
export const installEdgeGeometryReaders = (page: Page) =>
  page.evaluate(() => {
    window.__readSharedEdgeLabel = (selector, backgroundSelector, point) => {
      const wrapper = document.querySelector(selector)
      const parent = wrapper?.parentNode
      const text = wrapper?.querySelector('text')
      const rect = wrapper?.querySelector(backgroundSelector) ?? null

      if (
        wrapper === null ||
        wrapper === undefined ||
        !(parent instanceof SVGGraphicsElement) ||
        text === null ||
        text === undefined
      ) {
        throw new Error('Missing edge label geometry')
      }

      const matrix = parent.getScreenCTM()

      if (matrix === null) {
        throw new Error('Edge label parent has no screen matrix')
      }

      const expected = new DOMPoint(point.x, point.y).matrixTransform(matrix)
      const box = (rect ?? text).getBoundingClientRect()
      const textBox = text.getBBox()

      return {
        expected: { x: expected.x, y: expected.y },
        center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        text: { width: textBox.width, height: textBox.height },
        background:
          rect === null
            ? null
            : {
                width: Number(rect.getAttribute('width')),
                height: Number(rect.getAttribute('height')),
                rx: rect.getAttribute('rx'),
              },
        visibility: wrapper.getAttribute('visibility'),
      }
    }

    window.__readSharedEdgePath = (selector) => {
      const visible = document.querySelector(selector)
      const interaction = visible?.nextElementSibling ?? null

      // eslint-disable-next-line unicorn/consistent-function-scoping -- This helper runs in the page, where module scope is unavailable.
      const read = (element: Element | null | undefined, name: string) =>
        element?.getAttribute(name) ?? null

      return {
        visibleD: read(visible, 'd'),
        visibleClass: read(visible, 'class'),
        visibleFill: read(visible, 'fill'),
        stroke: read(visible, 'stroke'),
        computedStroke:
          visible === null ? null : getComputedStyle(visible).stroke,
        computedStrokeWidth:
          visible === null ? null : getComputedStyle(visible).strokeWidth,
        markerEnd: read(visible, 'marker-end'),
        interactionClass: read(interaction, 'class'),
        interactionD: read(interaction, 'd'),
        interactionWidth: read(interaction, 'stroke-width'),
        interactionOpacity: read(interaction, 'stroke-opacity'),
      }
    }
  })

export const readEdgeLabel = async (
  page: Page,
  selector: string,
  backgroundSelector: string,
  point: { readonly x: number; readonly y: number }
): Promise<EdgeLabelGeometry> => {
  const geometry = await page.evaluate(
    ([target, background, at]) =>
      window.__readSharedEdgeLabel?.(target, background, at),
    [selector, backgroundSelector, point] as const
  )

  if (geometry === undefined) {
    throw new Error('Edge label reader is not installed')
  }

  return geometry
}

export const readEdgePath = async (
  page: Page,
  selector: string
): Promise<EdgePathAttributes> => {
  const paths = await page.evaluate(
    (target) => window.__readSharedEdgePath?.(target),
    selector
  )

  if (paths === undefined) {
    throw new Error('Edge path reader is not installed')
  }

  return paths
}
