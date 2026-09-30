import { expect, test } from '@playwright/test'

interface CanvasUiTransformSample {
  readonly viewport: string
  readonly pattern: string
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

        const foreground =
          svg.querySelector('circle')?.getAttribute('fill') ??
          svg.querySelector('path')?.getAttribute('stroke') ??
          ''

        return {
          variant,
          pattern: pattern?.outerHTML ?? '',
          fill: svg.querySelector('rect')?.getAttribute('fill') ?? '',
          ariaHidden: svg.getAttribute('aria-hidden'),
          backgroundClass: svg.getAttribute('class') ?? '',
          patternClass: pattern?.getAttribute('class') ?? '',
          patternId: pattern?.getAttribute('id') ?? '',
          patternOffset: [
            pattern?.getAttribute('x') ?? '',
            pattern?.getAttribute('y') ?? '',
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
  expect(result[0]?.pattern).toContain('<circle')
  expect(result[1]?.pattern).toContain('<path')
  expect(result[2]?.pattern).toContain('H 14')
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
        patternOffset[0] === '2' &&
        patternOffset[1] === '3' &&
        foreground === '#123456' &&
        fillReference === `url(#test-${variant})`
    )
  ).toBe(true)

  const controls = page.getByRole('group', { name: 'Flow controls' })
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
  const zoomIn = page.getByRole('button', { name: 'Zoom in' })
  const zoomOut = page.getByRole('button', { name: 'Zoom out' })
  const fit = page.getByRole('button', { name: 'Fit view' })

  const expectBackgroundAligned = async (): Promise<void> => {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const viewport = document.querySelector<HTMLElement>(
            '.flow-foldkit-viewport'
          )

          const pattern = document.querySelector('pattern')

          const viewportValues =
            /translate\((?<x>-?[\d.]+)px, (?<y>-?[\d.]+)px\) scale\((?<zoom>[\d.]+)\)/u.exec(
              viewport?.style.transform ?? ''
            )?.groups

          const patternValues =
            /translate\((?<x>-?[\d.]+) (?<y>-?[\d.]+)\) scale\((?<zoom>[\d.]+)\)/u.exec(
              pattern?.getAttribute('patternTransform') ?? ''
            )?.groups

          if (viewportValues === undefined || patternValues === undefined) {
            return 1_000_000
          }

          return Math.max(
            ...(['x', 'y', 'zoom'] as const).map((key) =>
              Math.abs(Number(viewportValues[key]) - Number(patternValues[key]))
            )
          )
        })
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
    (sample) => {
      const viewportValues =
        /translate\((?<x>-?[\d.]+)px, (?<y>-?[\d.]+)px\) scale\((?<zoom>[\d.]+)\)/u.exec(
          sample.viewport
        )?.groups

      const patternValues =
        /translate\((?<x>-?[\d.]+) (?<y>-?[\d.]+)\) scale\((?<zoom>[\d.]+)\)/u.exec(
          sample.pattern
        )?.groups

      if (viewportValues === undefined || patternValues === undefined) {
        return true
      }

      return (
        Math.abs(Number(viewportValues.x) - Number(patternValues.x)) >= 0.01 ||
        Math.abs(Number(viewportValues.y) - Number(patternValues.y)) >= 0.01 ||
        Math.abs(Number(viewportValues.zoom) - Number(patternValues.zoom)) >=
          0.01
      )
    }
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
  await expect(page.getByRole('group', { name: 'Flow controls' })).toHaveCount(
    1
  )
})
