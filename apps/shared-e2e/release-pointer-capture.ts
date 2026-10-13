import type { Page } from '@playwright/test'

/**
 * Releases real pointer capture held inside the canvas so the browser fires a
 * genuine `lostpointercapture`. Synthetic events dispatched while capture is
 * still held are ignored by the host, as they are in real browsers.
 *
 * Chromium delivers `lostpointercapture` before the next pointer event, so the
 * helper follows the release with a real mouse move over the former owner.
 */
export const releasePointerCapture = async (
  page: Page,
  pointerId = 1
): Promise<void> => {
  const owner = await page.evaluate((id) => {
    const canvas = globalThis.document.querySelector(
      '[data-testid="flow-canvas"]'
    )

    if (canvas === null) {
      throw new Error('Missing flow canvas')
    }

    const owners = [canvas, ...canvas.querySelectorAll('*')].filter((element) =>
      element.hasPointerCapture(id)
    )

    for (const element of owners) {
      element.releasePointerCapture(id)
    }

    const bounds = owners.at(0)?.getBoundingClientRect()

    return bounds === undefined
      ? undefined
      : { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  }, pointerId)

  if (owner === undefined) {
    throw new Error(`No element holds pointer capture for pointer ${pointerId}`)
  }

  await page.mouse.move(owner.x, owner.y)
}
