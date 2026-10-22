import { expect, test } from '@playwright/test'

interface CanvasUiTransformSample {
  readonly viewport: string
  readonly pattern: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// Pinned packages/react/src/additional-components/Background/Background.tsx:40-47,68-76 scales cells and centers offsets.
const backgroundAlignmentError = (sample: CanvasUiTransformSample): number => {
  const viewport =
    /translate\((?<x>-?[\d.]+)px, (?<y>-?[\d.]+)px\) scale\((?<zoom>[\d.]+)\)/u.exec(
      sample.viewport
    )?.groups

  const offset = /translate\((?<x>-?[\d.]+),(?<y>-?[\d.]+)\)/u.exec(
    sample.pattern
  )?.groups

  if (viewport === undefined || offset === undefined) {
    return Number.POSITIVE_INFINITY
  }

  const gap = 20 * Number(viewport.zoom)

  return Math.max(
    Math.abs(sample.width - gap),
    Math.abs(sample.height - gap),
    Math.abs(sample.x - (Number(viewport.x) % gap)),
    Math.abs(sample.y - (Number(viewport.y) % gap)),
    Math.abs(Number(offset.x) + gap / 2),
    Math.abs(Number(offset.y) + gap / 2)
  )
}

declare global {
  interface Window {
    __flowCanvasUiTransformSamples: CanvasUiTransformSample[] | undefined
    __flowCanvasUiTransformObserver: MutationObserver | undefined
  }
}

test('Foldkit mounts canvas UI, tracks viewport transforms, clamps zoom and disposes cleanly', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const uiModulePath = '/e2e/package-ui.ts'
    const { createFlowBackground } = await import(uiModulePath)

    const backgroundResults = (['dots', 'lines', 'cross'] as const).map(
      (variant) => {
        const svg = createFlowBackground(document, {
          variant,
          gap: [16, 24],
          offset: [2, 3],
          color: '#123456',
          bgColor: '#ffffff',
          id: `test-${variant}`,
          className: `background-${variant}`,
          patternClassName: `pattern-${variant}`,
        })

        const pattern = svg.querySelector('pattern')

        if (pattern === null) {
          throw new Error('Background pattern is missing')
        }

        const foreground =
          svg.querySelector('circle')?.getAttribute('fill') ??
          svg.querySelector('path')?.getAttribute('stroke') ??
          ''

        return {
          variant,
          pattern: pattern.outerHTML,
          patternTransform: pattern.getAttribute('patternTransform') ?? '',
          fill: svg.querySelector('rect')?.getAttribute('fill') ?? '',
          ariaHidden: svg.getAttribute('aria-hidden'),
          backgroundClass: svg.getAttribute('class') ?? '',
          patternClass: pattern.getAttribute('class') ?? '',
          patternId: pattern.getAttribute('id') ?? '',
          patternOffset: [
            pattern.getAttribute('x') ?? '',
            pattern.getAttribute('y') ?? '',
          ],
          foreground,
          fillReference:
            svg.querySelectorAll('rect').item(1)?.getAttribute('fill') ?? '',
        }
      }
    )

    return backgroundResults
  })

  expect(result.map(({ variant }) => variant)).toEqual([
    'dots',
    'lines',
    'cross',
  ])
  expect(result.map(({ patternTransform }) => patternTransform)).toEqual([
    'translate(-10,-15)',
    'translate(-10,-15)',
    'translate(-5,-6)',
  ])
  expect(result[0]?.pattern).toContain('r="0.5"')
  expect(result[0]?.pattern).toContain('<circle')
  expect(result[1]?.pattern).toContain('<path')
  // Pinned packages/react/src/additional-components/Background/Patterns.tsx:16 uses the complete cross size.
  expect(result[2]?.pattern).toContain('H 6')
  expect(
    result.every(
      ({ fill, ariaHidden }) => fill === '#ffffff' && ariaHidden === 'true'
    )
  ).toBe(true)
  expect(
    result.every(
      ({ backgroundClass, patternClass }) =>
        backgroundClass.split(' ').includes('flow-foldkit-background') &&
        backgroundClass
          .split(' ')
          .some((name: string) => name.startsWith('background-')) &&
        patternClass.startsWith('pattern-')
    )
  ).toBe(true)
  expect(
    result.every(
      ({ patternId, patternOffset, foreground, fillReference, variant }) =>
        patternId === `test-${variant}` &&
        patternOffset[0] === '0' &&
        patternOffset[1] === '0' &&
        foreground === '#123456' &&
        fillReference === `url(#test-${variant})`
    )
  ).toBe(true)

  const controls = page.getByRole('group', { name: 'Control Panel' })
  await expect(controls).toBeVisible()
  const canvas = page.locator('.flow-foldkit-canvas')
  const background = page.locator('.flow-foldkit-background-overlay')
  await expect(background).toHaveCount(1)
  await expect(controls).toHaveCount(1)
  expect(
    await background.evaluate((element) =>
      element.parentElement?.classList.contains('flow-foldkit-canvas')
    )
  ).toBe(true)
  expect(
    await controls.evaluate((element) =>
      element.parentElement?.classList.contains('flow-foldkit-canvas')
    )
  ).toBe(true)

  const canvasBounds = await canvas.boundingBox()
  const controlsBounds = await controls.boundingBox()

  if (canvasBounds === null || controlsBounds === null) {
    throw new Error('Canvas controls have no measurable screen bounds')
  }

  expect(controlsBounds.x + controlsBounds.width).toBeLessThanOrEqual(
    canvasBounds.x + canvasBounds.width
  )

  expect(controlsBounds.x).toBeGreaterThanOrEqual(canvasBounds.x)
  expect(controlsBounds.y + controlsBounds.height).toBeLessThanOrEqual(
    canvasBounds.y + canvasBounds.height
  )

  expect(controlsBounds.y).toBeGreaterThanOrEqual(canvasBounds.y)
  const zoomIn = page.getByRole('button', { name: 'Zoom In' })
  const zoomOut = page.getByRole('button', { name: 'Zoom Out' })
  const fit = page.getByRole('button', { name: 'Fit View' })

  const expectBackgroundAligned = async (): Promise<void> => {
    await expect
      .poll(() =>
        page
          .evaluate(() => {
            const viewport = document.querySelector<HTMLElement>(
              '.flow-foldkit-viewport'
            )

            const pattern = document.querySelector('pattern')

            return {
              viewport: viewport?.style.transform ?? '',
              pattern: pattern?.getAttribute('patternTransform') ?? '',
              x: Number(pattern?.getAttribute('x')),
              y: Number(pattern?.getAttribute('y')),
              width: Number(pattern?.getAttribute('width')),
              height: Number(pattern?.getAttribute('height')),
            }
          })
          .then(backgroundAlignmentError)
      )
      .toBeLessThan(0.01)
  }

  await expect(zoomIn).toBeEnabled()
  await zoomIn.click()
  await expect(page.locator('.flow-foldkit-viewport')).toHaveAttribute(
    'style',
    /scale\(1\.2\)/u
  )
  await zoomIn.click()
  await zoomIn.click()
  await expect(page.locator('.flow-foldkit-viewport')).toHaveAttribute(
    'style',
    /scale\(1\.5\)/u
  )
  await expect(zoomIn).toBeDisabled()
  await fit.click()

  const beforeAnimationOutput = await page
    .locator('[data-viewport-result]')
    .textContent()

  const initialAnimationTransform = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>(
      '.flow-foldkit-viewport'
    )

    const pattern = document.querySelector('pattern')

    if (viewport === null || pattern === null) {
      throw new Error('Missing viewport or background pattern')
    }

    const samples: CanvasUiTransformSample[] = []

    const capture = () => {
      samples.push({
        viewport: viewport.style.transform,
        pattern: pattern.getAttribute('patternTransform') ?? '',
        x: Number(pattern.getAttribute('x')),
        y: Number(pattern.getAttribute('y')),
        width: Number(pattern.getAttribute('width')),
        height: Number(pattern.getAttribute('height')),
      })
    }

    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.target === viewport)) {
        capture()
      }
    })

    observer.observe(viewport, {
      attributes: true,
      attributeFilter: ['style'],
    })
    window.__flowCanvasUiTransformSamples = samples
    window.__flowCanvasUiTransformObserver = observer

    return viewport.style.transform
  })

  await page.getByRole('button', { name: 'Zoom to 1.25' }).click()
  await expect
    .poll(() => page.locator('[data-viewport-result]').textContent())
    .not.toBe(beforeAnimationOutput)

  const animationSamples = await page.evaluate(() => {
    window.__flowCanvasUiTransformObserver?.disconnect()

    return window.__flowCanvasUiTransformSamples ?? []
  })

  const finalAnimationTransform = await page.evaluate(
    () =>
      document.querySelector<HTMLElement>('.flow-foldkit-viewport')?.style
        .transform ?? ''
  )

  const intermediateAnimationSamples = animationSamples.filter(
    ({ viewport: transform }) =>
      transform !== initialAnimationTransform &&
      transform !== finalAnimationTransform
  )

  expect(intermediateAnimationSamples.length).toBeGreaterThan(0)

  const misalignedIntermediateSamples = intermediateAnimationSamples.filter(
    (sample) => backgroundAlignmentError(sample) >= 0.01
  )

  expect(misalignedIntermediateSamples).toEqual([])

  await expectBackgroundAligned()

  await expect(zoomOut).toBeEnabled()

  const panStart = {
    x: canvasBounds.x + canvasBounds.width * 0.05,
    y: canvasBounds.y + canvasBounds.height * 0.05,
  }

  const viewport = page.locator('.flow-foldkit-viewport')
  const beforePointerPan = await viewport.getAttribute('style')
  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 40, panStart.y - 35)
  await page.mouse.up()
  await expect
    .poll(() => viewport.getAttribute('style'))
    .not.toBe(beforePointerPan)
  await expectBackgroundAligned()

  const beforeWheelZoom = await viewport.getAttribute('style')
  await page.mouse.move(canvasBounds.x + 30, canvasBounds.y + 30)
  await page.mouse.wheel(0, -120)
  await expect
    .poll(() => viewport.getAttribute('style'))
    .not.toBe(beforeWheelZoom)
  await expectBackgroundAligned()

  /* eslint-disable no-await-in-loop -- Repeated public zoom-out actions prove the configured lower bound and disabled state. */
  while (await zoomOut.isEnabled()) {
    await zoomOut.click()
  }

  /* eslint-enable no-await-in-loop */
  await expect(page.locator('.flow-foldkit-viewport')).toHaveAttribute(
    'style',
    /scale\(0\.5\)/u
  )
  await expect(zoomOut).toBeDisabled()

  await background.evaluate((element) => element.remove())
  await controls.evaluate((element) => element.remove())
  await page.getByRole('button', { name: 'Zoom to 1.25' }).click()
  await expect(background).toHaveCount(1)
  await expect(controls).toHaveCount(1)

  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'))
  })
  await expect(background).toHaveCount(0)
  await expect(controls).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.flow-foldkit-background-overlay')).toHaveCount(1)
  await expect(page.getByRole('group', { name: 'Control Panel' })).toHaveCount(
    1
  )
})
