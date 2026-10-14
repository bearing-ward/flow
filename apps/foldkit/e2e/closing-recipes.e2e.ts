import { expect, test } from '@playwright/test'

test('Turbo Flow renders gradient custom nodes and SVG gradient custom edges', async ({
  page,
}) => {
  await page.goto('/ui-recipes/turbo-flow/')
  await expect(page.getByTestId('turbo-node')).toHaveCount(2)
  await expect(page.getByTestId('turbo-node').first()).toHaveCSS(
    'background-image',
    /linear-gradient/u
  )
  await expect(
    page.locator('[data-edge-id="turbo"] linearGradient')
  ).toHaveCount(1)
  await expect(page.getByTestId('turbo-edge')).toHaveAttribute(
    'stroke',
    'url(#turbo-gradient-turbo)'
  )
  await expect(page.getByTestId('turbo-edge')).toHaveAttribute('d', /^M.+C/u)
  await expect(page.locator('[data-edge-id="turbo"] stop')).toHaveCount(2)
})

test('Download Image exports the measured viewport as a PNG with graph pixels', async ({
  page,
}) => {
  await page.goto('/ui-recipes/download-image/')
  await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(2)
  const download = page.waitForEvent('download')
  await page.getByTestId('download-image').click()
  const downloaded = await download

  expect(downloaded.suggestedFilename()).toBe('flow.png')
  const link = page.getByTestId('export-result')
  await expect(link).toHaveAttribute('href', /^data:image\/png;base64,/u)

  const result = await link.evaluate(async (element) => {
    const image = new Image()
    image.src = element.getAttribute('href') ?? ''
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')

    if (context === null) {
      throw new Error('Missing image canvas')
    }

    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let graphPixels = 0

    for (let i = 0; i < pixels.length; i += 4) {
      if (
        (pixels[i] ?? 255) < 240 ||
        (pixels[i + 1] ?? 255) < 240 ||
        (pixels[i + 2] ?? 255) < 240
      ) {
        graphPixels += 1
      }
    }

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      graphPixels,
    }
  })

  expect(result.width).toBe(1024)
  expect(result.height).toBe(768)
  expect(result.graphPixels).toBeGreaterThan(500)
})
