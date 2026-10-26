import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { writeFile, mkdir } from 'node:fs/promises'

import type { FlowImageExportRequest } from '@flow/core'
import { flowRoutingRevision, getEdgesGeometry } from '@flow/core'
import type { Page } from '@playwright/test'
import { expect, test as it } from '@playwright/test'

import { imageServiceRequest } from './document.ts'

const endpoint = 'http://127.0.0.1:4191'

const expectMatchingPixels = async (
  page: Page,
  first: Buffer,
  second: Buffer
): Promise<void> => {
  const difference = await page.evaluate(
    async ([firstPng, secondPng]) => {
      const images = await Promise.all(
        [firstPng, secondPng].map(async (base64) => {
          const image = new Image()
          image.src = `data:image/png;base64,${base64}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')

          if (context === null) {
            throw new Error('No pixel context')
          }

          context.drawImage(image, 0, 0)

          return context.getImageData(0, 0, image.width, image.height)
        })
      )

      const [left, right] = images

      if (
        left === undefined ||
        right === undefined ||
        left.width !== right.width ||
        left.height !== right.height
      ) {
        throw new Error('Image dimensions differ')
      }

      let changed = 0
      let total = 0

      for (let index = 0; index < left.data.length; index += 4) {
        const r = Math.abs((left.data[index] ?? 0) - (right.data[index] ?? 0))

        const g = Math.abs(
          (left.data[index + 1] ?? 0) - (right.data[index + 1] ?? 0)
        )

        const b = Math.abs(
          (left.data[index + 2] ?? 0) - (right.data[index + 2] ?? 0)
        )

        changed += Number(Math.max(r, g, b) > 32)
        total += r + g + b
      }

      return { changed, mean: total / (left.width * left.height * 3) }
    },
    [first.toString('base64'), second.toString('base64')]
  )

  // Native CSS measurements can differ by a layout fraction across capture origins.
  expect(difference.changed).toBeLessThanOrEqual(40)
  expect(difference.mean).toBeLessThan(0.02)
}

const activeContexts = async (): Promise<number> => {
  const response = await fetch(`${endpoint}/health`)
  const value = await response.json()

  return value.activeContexts
}

const stop = async (child: ChildProcess): Promise<void> => {
  if (child.exitCode !== null) {
    return
  }

  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  await exited
}

const start = async (
  host: FlowImageExportRequest['host'],
  origin: string,
  timeout = '15000'
): Promise<ChildProcess> => {
  const child = spawn('bun', ['packages/image-service/src/server.ts'], {
    cwd: new URL('../../../', import.meta.url),
    env: {
      ...process.env,
      [`FLOW_IMAGE_${host.toUpperCase()}_ORIGIN`]: origin,
      FLOW_IMAGE_TIMEOUT_MS: timeout,
    },
    stdio: 'pipe',
  })

  let logs = ''
  child.stdout?.on('data', (data) => {
    logs += String(data)
  })
  child.stderr?.on('data', (data) => {
    logs += String(data)
  })

  try {
    await expect
      .poll(() => {
        if (child.exitCode !== null) {
          throw new Error(logs)
        }

        return fetch(`${endpoint}/health`)
          .then((response) => response.status)
          .catch(() => 0)
      })
      .toBe(200)
  } catch (error) {
    await stop(child)
    throw new Error(`${String(error)}\nService output:\n${logs}`, {
      cause: error,
    })
  }

  return child
}

export const imageServiceAcceptance = (
  host: FlowImageExportRequest['host']
): void => {
  it.describe(`${host} server image creation`, () => {
    it('captures real renderer pixels, routes, bundles, explicit size, hidden state and repeatable readiness', async ({
      page,
      baseURL,
      request,
    }) => {
      const server = await start(host, String(baseURL))

      try {
        await page.goto('/image-service/')
        await expect(page.locator('#capture')).toHaveAttribute(
          'data-ready',
          'initial'
        )
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id="card"]')
        ).toContainText('Real host renderer')
        await expect(page.locator('[data-shape="hexagon"]')).toHaveCount(1)
        await expect(page.locator('[data-node-id="hidden"]')).toHaveCount(0)
        await expect(page.locator('[data-node-id="collapsed"]')).toHaveCount(0)

        const snapshot = await page.evaluate(() =>
          globalThis.flowImageDemo?.request()
        )

        expect(snapshot?.scene.document.bundles?.[0]?.edgeIds).toEqual([
          'wire-a',
          'wire-b',
        ])
        expect(
          snapshot?.scene.document.nodes.find((node) => node.id === 'card')
            ?.parentId
        ).toBe('group')
        expect(
          snapshot?.scene.document.nodes.find((node) => node.id === 'target')
            ?.data?.tree
        ).toEqual({ version: 1, kind: 'node', expanded: false })

        const response = await request.post(`${endpoint}/render`, {
          data: snapshot,
        })

        expect(response.status()).toBe(200)
        expect(response.headers()['content-type']).toBe('image/png')
        expect(response.headers()['x-flow-revision']).toBe('0')
        const bytes = await response.body()
        expect(bytes.readUInt32BE(16)).toBe(800)
        expect(bytes.readUInt32BE(20)).toBe(500)
        await mkdir('/tmp/plan165', { recursive: true })
        await writeFile(`/tmp/plan165/${host}.png`, bytes)

        await page.evaluate(
          (value) => globalThis.flowImageHost?.render(value),
          snapshot
        )

        const live = await page
          .locator('#capture')
          .screenshot({ animations: 'disabled' })

        await writeFile(`/tmp/plan165/${host}-live.png`, live)
        await expectMatchingPixels(page, bytes, live)

        const repeat = await request.post(`${endpoint}/render`, {
          data: snapshot,
        })

        const repeatBytes = await repeat.body()
        expect(repeatBytes.equals(bytes)).toBe(true)

        const counts = await page.evaluate(async (base64) => {
          const image = new Image()
          image.src = `data:image/png;base64,${base64}`
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')

          if (context === null) {
            throw new Error('Missing pixel context')
          }

          context.drawImage(image, 0, 0)

          const pixels = context.getImageData(
            0,
            0,
            image.width,
            image.height
          ).data

          let green = 0
          let red = 0
          let purple = 0
          let blue = 0

          for (let index = 0; index < pixels.length; index += 4) {
            const r = pixels[index] ?? 0
            const g = pixels[index + 1] ?? 0
            const b = pixels[index + 2] ?? 0
            green += Number(g > 110 && r < 40 && b > 80 && b < 180)
            red += Number(r > 150 && g < 90 && b < 140)
            purple += Number(r > 80 && r < 170 && g < 100 && b > 180)
            blue += Number(r < 40 && g > 70 && g < 180 && b > 150)
          }

          return { green, red, purple, blue }
        }, bytes.toString('base64'))

        expect(counts.green).toBeGreaterThan(1000)
        expect(counts.red).toBeGreaterThan(100)
        expect(counts.purple).toBeGreaterThan(100)
        expect(counts.blue).toBeGreaterThan(100)
        const fixed = imageServiceRequest(host)

        const explicit = await request.post(`${endpoint}/render`, {
          data: {
            ...fixed,
            width: 640,
            height: 360,
            framing: { kind: 'viewport', x: 10, y: 20, zoom: 0.75 },
          },
        })

        expect(explicit.status()).toBe(200)
        const explicitBytes = await explicit.body()
        expect(explicitBytes.readUInt32BE(16)).toBe(640)
        expect(explicitBytes.readUInt32BE(20)).toBe(360)
        await page
          .getByRole('button', { name: 'Refresh server image', exact: true })
          .click()
        await expect(page.locator('#server-image')).toHaveAttribute(
          'data-revision',
          '0'
        )
        await page
          .getByRole('button', { name: 'Edit label', exact: true })
          .click()
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id="card"]')
        ).toContainText('Edited revision 1')
        expect(
          await page.evaluate(() => globalThis.flowImageDemo?.history())
        ).toMatchObject({ pastCount: 1 })
        await page
          .getByRole('button', { name: 'Refresh server image', exact: true })
          .click()
        await expect(page.locator('#server-image')).toHaveAttribute(
          'data-revision',
          '1'
        )
        await page.getByRole('button', { name: 'Undo', exact: true }).click()
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id="card"]')
        ).toContainText('Chromium capture')
        await page.getByRole('button', { name: 'Redo', exact: true }).click()
        await expect(
          page.locator('[data-testid="flow-node"][data-node-id="card"]')
        ).toContainText('Edited revision 1')

        const card = page.locator(
          '[data-testid="flow-node"][data-node-id="card"]'
        )

        const box = await card.boundingBox()

        if (box === null) {
          throw new Error('Missing draggable card')
        }

        const beforeDrag = await page.evaluate(() =>
          globalThis.flowImageDemo?.request()
        )

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        await page.mouse.move(
          box.x + box.width / 2 + 40,
          box.y + box.height / 2 + 25,
          { steps: 5 }
        )
        await page.mouse.up()

        const afterDrag = await page.evaluate(() =>
          globalThis.flowImageDemo?.request()
        )

        expect(
          afterDrag?.scene.document.nodes.find((node) => node.id === 'card')
            ?.position
        ).not.toEqual(
          beforeDrag?.scene.document.nodes.find((node) => node.id === 'card')
            ?.position
        )
        expect(
          await page.evaluate(() => globalThis.flowImageDemo?.history())
        ).toMatchObject({ pastCount: 2 })
        await page
          .getByRole('button', { name: 'Refresh server image', exact: true })
          .click()
        await expect(page.locator('#server-image')).toHaveAttribute(
          'data-revision',
          String(afterDrag?.revision)
        )
        await expect.poll(() => activeContexts()).toBe(0)
      } finally {
        await stop(server)
      }
    })

    it('preserves generated route geometry through the actual host renderer', async ({
      page,
      baseURL,
      request,
    }) => {
      const server = await start(host, String(baseURL))

      try {
        await page.goto('/image-service/')
        await expect(page.locator('#capture')).toHaveAttribute(
          'data-ready',
          'initial'
        )

        const snapshot = await page.evaluate(() =>
          globalThis.flowImageDemo?.request()
        )

        if (snapshot === undefined) {
          throw new Error('Missing export snapshot')
        }

        const document = {
          ...snapshot.scene.document,
          edges: snapshot.scene.document.edges.map((edge) =>
            edge.id === 'manual'
              ? { ...edge, route: { mode: 'automatic' as const } }
              : edge
          ),
        }

        const measurements = new Map(
          snapshot.scene.measurements.map((item) => [item.nodeId, item])
        )

        const geometry = getEdgesGeometry(document, { measurements }).find(
          (edge) => edge.id === 'manual'
        )

        if (geometry === undefined) {
          throw new Error('Missing route endpoints')
        }

        const routed: FlowImageExportRequest = {
          ...snapshot,
          scene: {
            ...snapshot.scene,
            document,
            edgeRouting: {
              revision: flowRoutingRevision(document, { measurements }),
              paths: [
                {
                  id: 'manual',
                  kind: 'routed',
                  points: [
                    geometry.source,
                    { x: 365, y: geometry.source.y },
                    { x: 365, y: geometry.target.y },
                    geometry.target,
                  ],
                },
              ],
            },
          },
        }

        await page.evaluate(
          (value) => globalThis.flowImageHost?.render(value),
          routed
        )

        const path = await page
          .locator('[data-edge-id="manual"] path')
          .first()
          .getAttribute('d')

        expect(path).toContain('365')

        const response = await request.post(`${endpoint}/render`, {
          data: routed,
        })

        expect(response.status()).toBe(200)
        const bytes = await response.body()

        const live = await page
          .locator('#capture')
          .screenshot({ animations: 'disabled' })

        await expectMatchingPixels(page, bytes, live)
      } finally {
        await stop(server)
      }
    })

    it('rejects invalid input, unsupported renderers and missing assets, then releases contexts', async ({
      baseURL,
      request,
    }) => {
      const server = await start(host, String(baseURL))

      try {
        const invalidResponse = await request.post(`${endpoint}/render`, {
          data: { invalid: true },
        })

        expect(invalidResponse.status()).toBe(400)
        const value = imageServiceRequest(host)

        const unsupported = {
          ...value,
          scene: {
            ...value.scene,
            document: {
              ...value.scene.document,
              nodes: value.scene.document.nodes.map((node) =>
                node.id === 'card' ? { ...node, type: 'unapproved' } : node
              ),
            },
          },
        }

        const unsupportedResponse = await request.post(`${endpoint}/render`, {
          data: unsupported,
        })

        expect(unsupportedResponse.status()).toBe(400)

        const missing = await request.post(`${endpoint}/render`, {
          data: { ...value, assets: ['missing.svg'] },
        })

        expect(missing.status()).toBe(502)
        expect(await missing.json()).toMatchObject({ error: 'asset' })
        await expect.poll(() => activeContexts()).toBe(0)
      } finally {
        await stop(server)
      }
    })

    it('times out and cancels real browser work without retaining request contexts', async ({
      baseURL,
      request,
    }) => {
      const server = await start(host, String(baseURL), '1')

      try {
        const response = await request.post(`${endpoint}/render`, {
          data: imageServiceRequest(host),
        })

        expect(response.status()).toBe(504)
        expect(await response.json()).toMatchObject({ error: 'timeout' })
        await expect.poll(() => activeContexts()).toBe(0)
      } finally {
        await stop(server)
      }

      const cancellable = await start(host, String(baseURL))

      try {
        const abort = new AbortController()

        const response = fetch(`${endpoint}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imageServiceRequest(host)),
          signal: abort.signal,
        }).catch(() => null)

        await expect.poll(() => activeContexts()).toBe(1)
        abort.abort()
        await response
        await expect.poll(() => activeContexts()).toBe(0)
      } finally {
        await stop(cancellable)
      }
    })

    it('discards a server response after an edit and after disposal', async ({
      page,
      baseURL,
    }) => {
      const server = await start(host, String(baseURL))

      try {
        await page.goto('/image-service/')
        await expect(page.locator('#capture')).toHaveAttribute(
          'data-ready',
          'initial'
        )
        const held = Promise.withResolvers<undefined>()
        const arrived = Promise.withResolvers<undefined>()
        await page.route(`${endpoint}/render`, async (route) => {
          const response = await route.fetch()
          arrived.resolve(undefined)
          await held.promise
          await route.fulfill({ response })
        })
        await page
          .getByRole('button', { name: 'Refresh server image', exact: true })
          .click()
        await arrived.promise
        await page
          .getByRole('button', { name: 'Edit label', exact: true })
          .click()
        held.resolve(undefined)
        await expect(page.locator('#server-image')).not.toHaveAttribute(
          'data-revision',
          '0'
        )
        await page.unroute(`${endpoint}/render`)
        await page
          .getByRole('button', { name: 'Refresh server image', exact: true })
          .click()
        await expect(page.locator('#server-image')).toHaveAttribute(
          'data-revision',
          '1'
        )
        await page.evaluate(() => globalThis.flowImageDemo?.dispose())
        expect(
          await page.evaluate(() => globalThis.flowImageDemo)
        ).toBeUndefined()
        await expect.poll(() => activeContexts()).toBe(0)
      } finally {
        await stop(server)
      }
    })
  })
}
