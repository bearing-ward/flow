import type { Page } from '@playwright/test'

/** Allow rendering and observers to run before checking cancelled effects. */
export const browserFrames = (page: Page, count = 2): Promise<void> =>
  page.evaluate(async (frames) => {
    const { promise, resolve } = Promise.withResolvers<undefined>()
    let remaining = frames

    const next = () => {
      remaining -= 1

      if (remaining === 0) {
        resolve(undefined)
      } else {
        requestAnimationFrame(next)
      }
    }

    requestAnimationFrame(next)
    await promise
  }, count)
