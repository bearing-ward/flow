import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

interface LabelGeometry {
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

interface PathAttributes {
  readonly visibleD: string | null
  readonly visibleClass: string | null
  readonly visibleFill: string | null
  readonly stroke: string | null
  readonly markerEnd: string | null
  readonly interactionClass: string | null
  readonly interactionD: string | null
  readonly interactionWidth: string | null
  readonly interactionOpacity: string | null
}

declare global {
  interface Window {
    __readEdgeLabel?: (
      selector: string,
      point: { readonly x: number; readonly y: number }
    ) => LabelGeometry
    __readEdgePaths?: (id: string) => PathAttributes
  }
}

const installReaders = (page: Page) =>
  page.evaluate(() => {
    window.__readEdgeLabel = (selector, point) => {
      const wrapper = document.querySelector(selector)
      const parent = wrapper?.parentNode
      const text = wrapper?.querySelector('text')
      const rect = wrapper?.querySelector('rect.flow-vue-edge-textbg') ?? null

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

    window.__readEdgePaths = (id) => {
      const visible = document.querySelector(`[data-testid="base-edge-${id}"]`)
      const interaction = visible?.nextElementSibling ?? null

      // eslint-disable-next-line unicorn/consistent-function-scoping -- This helper runs in the page, where module scope is unavailable.
      const read = (element: Element | null | undefined, name: string) =>
        element?.getAttribute(name) ?? null

      return {
        visibleD: read(visible, 'd'),
        visibleClass: read(visible, 'class'),
        visibleFill: read(visible, 'fill'),
        stroke: read(visible, 'stroke'),
        markerEnd: read(visible, 'marker-end'),
        interactionClass: read(interaction, 'class'),
        interactionD: read(interaction, 'd'),
        interactionWidth: read(interaction, 'stroke-width'),
        interactionOpacity: read(interaction, 'stroke-opacity'),
      }
    }
  })

const readLabel = async (
  page: Page,
  selector: string,
  point: { readonly x: number; readonly y: number }
): Promise<LabelGeometry> => {
  const geometry = await page.evaluate(
    ([target, at]) => window.__readEdgeLabel?.(target, at),
    [selector, point] as const
  )

  if (geometry === undefined) {
    throw new Error('Edge label reader is not installed')
  }

  return geometry
}

const readPaths = async (page: Page, id: string): Promise<PathAttributes> => {
  const paths = await page.evaluate(
    (edgeId) => window.__readEdgePaths?.(edgeId),
    id
  )

  if (paths === undefined) {
    throw new Error('Edge path reader is not installed')
  }

  return paths
}

const labeledSelector =
  '[data-testid="base-edge-labeled"] ~ .flow-vue-edge-textwrapper'

const labeledPoint = { x: 300, y: 160 }

test('Vue FlowBaseEdge and FlowEdgeText render paths and centered measured labels', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const { mountVueBaseEdgeFixture } = await import('../src/base-edge-test.ts')
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Vue base edge fixture mount point is missing')
    }

    mountVueBaseEdgeFixture(root)
  })
  await installReaders(page)

  await expect(page.getByTestId('base-edge-labeled')).toHaveCount(1)
  await expect(page.getByTestId('base-edge-plain')).toHaveCount(1)

  const labeled = await readPaths(page, 'labeled')
  expect(labeled.visibleD).toMatch(/^M/u)
  expect(labeled).toMatchObject({
    visibleClass: 'flow-vue-edge-path fixture-base-edge',
    visibleFill: 'none',
    stroke: '#0f766e',
    interactionClass: 'flow-vue-edge-interaction',
    interactionD: labeled.visibleD,
    interactionWidth: '20',
    interactionOpacity: '0',
  })
  expect(labeled.markerEnd).toMatch(/^url\(#.+arrowclosed/u)

  // interactionWidth 0 omits the interaction path; the label wrapper follows.
  const plain = await readPaths(page, 'plain')
  expect(plain.interactionClass).toBe('flow-vue-edge-textwrapper')
  // Without caller stroke attributes the visible path draws the themed default.
  expect(plain.stroke).toBeNull()
  await expect(page.getByTestId('base-edge-plain')).toHaveCSS(
    'stroke',
    'rgb(177, 177, 183)'
  )
  await expect(page.getByTestId('base-edge-plain')).toHaveCSS(
    'stroke-width',
    '1.5px'
  )

  await expect
    .poll(async () => {
      const { visibility } = await readLabel(
        page,
        labeledSelector,
        labeledPoint
      )

      return visibility
    })
    .toBe('visible')

  // At zoom 1 the measured text box equals the live text box.
  const initial = await readLabel(page, labeledSelector, labeledPoint)
  expect(initial.center.x).toBeCloseTo(initial.expected.x, 0)
  expect(initial.center.y).toBeCloseTo(initial.expected.y, 0)
  expect(initial.background).toEqual({
    width: initial.text.width + 4,
    height: initial.text.height + 8,
    rx: '2',
  })

  const plainLabel = await readLabel(
    page,
    '[data-testid="base-edge-plain"] ~ .flow-vue-edge-textwrapper',
    { x: 200, y: 300 }
  )

  expect(plainLabel.background).toBeNull()

  const standalone = await readLabel(
    page,
    '[data-testid="standalone-edge-text"]',
    { x: 500, y: 120 }
  )

  expect(standalone.center.x).toBeCloseTo(standalone.expected.x, 0)
  expect(standalone.center.y).toBeCloseTo(standalone.expected.y, 0)
  expect(standalone.background).toEqual({
    width: standalone.text.width + 12,
    height: standalone.text.height + 6,
    rx: '5',
  })
  await expect(page.getByTestId('edge-text-child')).toHaveCount(1)

  await page.evaluate(() =>
    window.__flowVueBaseEdge?.setLabel('labeled', 'Approve with a longer label')
  )
  await expect
    .poll(async () => {
      const { text } = await readLabel(page, labeledSelector, labeledPoint)

      return text.width
    })
    .toBeGreaterThan(initial.text.width)

  const relabeled = await readLabel(page, labeledSelector, labeledPoint)
  expect(relabeled.center.x).toBeCloseTo(relabeled.expected.x, 0)
  expect(relabeled.center.y).toBeCloseTo(relabeled.expected.y, 0)
  expect(relabeled.background?.width).toBeCloseTo(relabeled.text.width + 4, 3)

  // Labels stay centered on their flow point through pan and zoom.
  await page.evaluate(() =>
    window.__flowVueBaseEdge?.setViewport({ x: 20, y: 10, zoom: 1.25 })
  )
  await expect
    .poll(async () => {
      const { center, expected } = await readLabel(
        page,
        labeledSelector,
        labeledPoint
      )

      return Math.round(Math.abs(center.x - expected.x))
    })
    .toBeLessThanOrEqual(1)

  const zoomed = await readLabel(page, labeledSelector, labeledPoint)
  expect(Math.abs(zoomed.center.y - zoomed.expected.y)).toBeLessThanOrEqual(1)
})
