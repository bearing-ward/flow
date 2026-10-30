import { readdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

for (const colorScheme of ['light', 'dark'] as const) {
  test(`landing page and demo links in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/flow/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Graphs, in your framework.'
    )
    await expect(
      page.getByRole('link', { name: 'Skip to content' })
    ).toBeVisible()

    const links = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => anchor.getAttribute('href'))
      )

    const pages = readdirSync('dist-site', {
      recursive: true,
      withFileTypes: true,
    }).flatMap((entry) => {
      const file = path.relative(
        'dist-site',
        path.join(entry.parentPath, entry.name)
      )

      return entry.isFile() &&
        file.endsWith('index.html') &&
        file !== 'index.html'
        ? [file.slice(0, -'index.html'.length)]
        : []
    })

    for (const route of pages) {
      expect(links).toContain(route)
    }

    expect(
      pages.some((route) =>
        /upstream|test|preflight|workflow-contracts|workflow-ai-capability|live-internal-node/u.test(
          route
        )
      )
    ).toBeFalsy()
    await page.screenshot({
      path: `test-results/site/landing-${colorScheme}.png`,
      fullPage: true,
    })
  })
}

for (const host of ['vanilla', 'vue', 'foldkit']) {
  test(`${host} static playground and workflow`, async ({ page }) => {
    const errors: string[] = []
    const failures: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failures.push(response.url())
      }
    })
    page.on('requestfailed', (request) => failures.push(request.url()))
    page.on('websocket', (socket) => failures.push(socket.url()))
    await page.goto(`/flow/${host}/`)
    await expect(page.locator('[data-node-id]').first()).toBeVisible()
    await page
      .getByRole('link', { name: 'Workflow and offline AI editor' })
      .click()
    await expect(page).toHaveURL(`/flow/${host}/workflow/`)
    await expect(page.locator('[data-node-id]').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Workflow editor', exact: true })
    ).toBeVisible()

    expect(errors).toStrictEqual([])
    expect(failures).toStrictEqual([])
  })
}

for (const host of ['vanilla', 'vue', 'foldkit']) {
  for (const route of ['collaborative', 'image-service']) {
    test(`${host} ${route} explains local setup`, async ({ page }) => {
      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))
      page.on('websocket', (socket) => requests.push(socket.url()))
      await page.goto(`/flow/${host}/${route}/`)
      await expect(
        page.getByText('This demo requires a local server.', { exact: false })
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: /Read the .* docs/u })
      ).toHaveAttribute('href', /github\.com\/bearing-ward\/flow\//u)
      expect(requests).toStrictEqual([
        `http://127.0.0.1:4186/flow/${host}/${route}/`,
      ])
    })
  }
}
