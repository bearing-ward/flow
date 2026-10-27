import assert from 'node:assert/strict'

import { chromium, expect } from '@playwright/test'

const url =
  'https://example-apps.xyflow.com/react/examples/nodes/rotatable-node/index.html'

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
  await page.goto(url)
  const node = page.locator('.react-flow__node-rotatableNode').first()
  const visual = node.locator('.rotatable-node')
  const handle = visual.locator('.rotatable-node__handle')
  await handle.waitFor({ state: 'visible' })
  const before = await visual.boundingBox()
  const start = await handle.boundingBox()
  assert.ok(before && start)

  const center = {
    x: before.x + before.width / 2,
    y: before.y + before.height / 2,
  }

  const distance = Math.hypot(
    start.x + start.width / 2 - center.x,
    start.y + start.height / 2 - center.y
  )

  const initial = await page.locator('.react-flow__edge-path').getAttribute('d')
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(center.x + distance, center.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForFunction(() =>
    document
      .querySelector('.rotatable-node')
      ?.getAttribute('style')
      ?.match(/rotate\((?!0deg)[^)]+\)/u)
  )

  let previous = ''
  let stable = 0

  await expect
    .poll(
      async () => {
        const signature = await page.evaluate(() =>
          [
            document.querySelector('.rotatable-node')?.getAttribute('style'),
            document.querySelector('.react-flow__edge-path')?.getAttribute('d'),
          ].join('|')
        )

        stable = signature === previous ? stable + 1 : 0
        previous = signature

        return stable
      },
      { intervals: [16], timeout: 5000 }
    )
    .toBeGreaterThanOrEqual(3)

  const result = await page.evaluate(() => {
    const content = document.querySelector('.rotatable-node')
    const source = content?.querySelector('.react-flow__handle.source')
    const path = document.querySelector('.react-flow__edge-path')

    if (
      !(path instanceof SVGPathElement) ||
      source === null ||
      source === undefined
    ) {
      throw new Error('Missing reference geometry')
    }

    const point = path.getPointAtLength(0)
    const matrix = path.getScreenCTM()

    if (matrix === null) {
      throw new Error('Missing reference viewport')
    }

    const screen = point.matrixTransform(matrix)
    const handleBounds = source.getBoundingClientRect()

    return {
      rotation: content?.getAttribute('style'),
      sourceHandle: {
        x: handleBounds.x,
        y: handleBounds.y,
        width: handleBounds.width,
        height: handleBounds.height,
      },
      edgeStart: { x: screen.x, y: screen.y },
      path: path.getAttribute('d'),
    }
  })

  await page.reload()
  await handle.waitFor({ state: 'visible' })
  const afterReloadRotation = await visual.getAttribute('style')
  assert.ok(afterReloadRotation?.includes('rotate(0deg)'))

  process.stdout.write(
    `${JSON.stringify({ url, accessed: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), initialPath: initial, edgeChanged: result.path !== initial, afterReloadRotation, ...result }, null, 2)}\n`
  )
} finally {
  await browser.close()
}
