import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { Options } from './connection-threshold-harness.ts'

const entry = '/e2e/connection-threshold-harness.ts'

const call = (
  page: Page,
  action: string,
  value?: number | string | boolean | null
) =>
  page.evaluate(
    async ({ entry: modulePath, action: method, value: input }) => {
      const harness = await import(modulePath)

      return harness[method](input)
    },
    { entry, action, value }
  )

const center = async (page: Page, selector: string) => {
  const bounds = await page.locator(selector).boundingBox()

  if (bounds === null) {
    throw new Error(`Missing ${selector}`)
  }

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

const handle = (node: string, id = node.startsWith('source') ? 'out' : 'in') =>
  `[data-node-id="${node}"] [data-handle-id="${id}"]`

const start = async (page: Page, selector: string) => {
  const point = await center(page, selector)
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()

  return point
}

export const connectionThresholdTests = (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const mount = async (page: Page, options: Options) => {
    page.on('pageerror', (error) => console.error(error))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(message.text())
      }
    })
    await page.goto('/connection-threshold.html', { waitUntil: 'networkidle' })
    await page.evaluate(
      async ({ entry: modulePath, host: adapter, options: settings }) => {
        const harness = await import(modulePath)
        await harness.mount(adapter, settings)
      },
      { entry, host, options }
    )
  }

  const anchor = (endpoint: string) => {
    if (host === 'foldkit') {
      return `[data-edge-id="edge"][data-edge-endpoint="${endpoint}"]`
    }

    if (host === 'vue') {
      return `[data-edge-id="edge"][data-endpoint="${endpoint}"]`
    }

    return `[data-edge-id="edge"] [data-endpoint="${endpoint}"]`
  }

  for (const kind of ['fresh', 'reconnect']) {
    test(`connectionDragThreshold ${host} ${kind} pending cannot auto-pan and active policy is preserved`, async ({
      page,
    }) => {
      const selector = kind === 'fresh' ? handle('source') : anchor('target')
      await mount(page, { threshold: 2000, edge: kind === 'reconnect' })
      await start(page, selector)
      const before = await call(page, 'read')
      await page.mouse.move(950, 300)
      await call(page, 'frames', 12)
      const pending = await call(page, 'read')
      expect(pending).toMatchObject({
        events: [],
        changes: [],
        preview: null,
        captured: true,
      })
      expect(pending.state.viewport).toEqual(before.state.viewport)
      expect(pending.renderedTransform).toEqual(before.renderedTransform)
      await page.mouse.up()
      await mount(page, { threshold: 8, edge: kind === 'reconnect' })
      await start(page, selector)
      const initial = await call(page, 'read')
      await page.mouse.move(950, 300)
      await call(page, 'frames', 12)
      const active = await call(page, 'read')
      expect(active.events).toContain(
        kind === 'fresh' ? 'connectStart' : 'reconnectStart'
      )

      if (kind === 'fresh' || host === 'vue') {
        expect(active.renderedTransform).not.toEqual(initial.renderedTransform)
      } else {
        expect(active.renderedTransform).toEqual(initial.renderedTransform)
      }

      await page.mouse.up()
    })
  }

  if (host !== 'vanilla') {
    test(`connectionDragThreshold ${host} keyboard reconnect stays immediate`, async ({
      page,
    }) => {
      await mount(page, { threshold: 80, edge: true, click: true })
      await page.locator(anchor('target')).focus()
      await page.keyboard.press('Enter')
      const started = await call(page, 'read')
      expect(started.events).toContain('reconnectStart')
      expect(started.captured).toBe(false)
      await page.locator(handle('target')).focus()
      await page.keyboard.press('Enter')
      const completed = await call(page, 'read')
      expect(completed.changes).toHaveLength(1)
      expect(completed.changes[0].kind).toBe('edge-reconnect')
    })
  }

  for (const kind of ['fresh', 'source', 'target']) {
    for (const zoom of [0.5, 2]) {
      test(`connectionDragThreshold ${host} ${kind} strict boundary and capture at zoom ${zoom}`, async ({
        page,
      }) => {
        await mount(page, { threshold: 8, zoom, edge: kind !== 'fresh' })

        const point = await start(
          page,
          kind === 'fresh' ? handle('source') : anchor(kind)
        )

        await call(page, 'frames')
        const pendingRead = await call(page, 'read')
        expect(pendingRead, JSON.stringify(pendingRead)).toMatchObject({
          events: [],
          changes: [],
          captured: true,
          preview: null,
          validations: 0,
        })
        await page.mouse.move(point.x + 3, point.y + 4)
        await page.mouse.move(point.x, point.y + 8)
        expect(await call(page, 'read')).toMatchObject({
          events: [],
          changes: [],
          captured: true,
          preview: null,
          validations: 0,
          captureEvents: ['got'],
        })
        await page.mouse.move(point.x + 6, point.y + 8)
        const crossing = await call(page, 'read')
        expect(
          crossing.events.filter((event: string) => event.endsWith('Start'))
        ).toEqual([kind === 'fresh' ? 'connectStart' : 'reconnectStart'])

        const canvas = await page
          .locator('[data-testid="flow-canvas"]')
          .boundingBox()

        expect(canvas).not.toBeNull()

        const endpoint = {
          x: (point.x + 6 - (canvas?.x ?? 0) - 80) / zoom,
          y: (point.y + 8 - (canvas?.y ?? 0) - 80) / zoom,
        }

        expect(crossing.preview.to.x).toBeCloseTo(endpoint.x, 4)
        expect(crossing.preview.to.y).toBeCloseTo(endpoint.y, 4)

        const rendered = await page
          .locator(
            '.flow-connection-preview, .flow-vue-connection-preview, .flow-foldkit-connection-preview-path'
          )
          .evaluate((element) => {
            const line =
              element instanceof SVGLineElement
                ? element
                : element.querySelector('line')

            if (line instanceof SVGLineElement) {
              return { x: line.x2.baseVal.value, y: line.y2.baseVal.value }
            }

            const path =
              element instanceof SVGPathElement
                ? element
                : element.querySelector('path')

            if (!(path instanceof SVGPathElement)) {
              throw new Error('Missing preview path')
            }

            const end = path.getPointAtLength(path.getTotalLength())

            return { x: end.x, y: end.y }
          })

        expect(rendered.x).toBeCloseTo(endpoint.x, 2)
        expect(rendered.y).toBeCloseTo(endpoint.y, 2)
        expect(crossing.captured).toBe(true)
        expect(crossing.captureEvents).toEqual(['got'])
        expect(crossing.captureAtStart).toEqual([true])

        if (host !== 'vanilla') {
          expect(crossing.events).toContain(
            kind === 'fresh' ? 'connectProgress' : 'reconnectProgress'
          )
        }

        const target = await center(
          page,
          handle(kind === 'source' ? 'source-next' : 'target')
        )

        await page.mouse.move(target.x, target.y)
        await page.mouse.up()
        const finished = await call(page, 'read')
        expect(finished.captured).toBe(false)
        expect(
          finished.events.filter((event: string) => event.endsWith('Start'))
        ).toHaveLength(1)
        expect(finished.changes, JSON.stringify(finished)).toHaveLength(1)
        expect(finished.changes[0].kind).toBe(
          kind === 'fresh' ? 'edge-add' : 'edge-reconnect'
        )

        if (kind !== 'fresh') {
          expect(finished.changes[0].edge).toMatchObject({
            label: 'Keep label',
            data: { keep: 42 },
            ...(kind === 'source'
              ? { source: 'source-next', target: 'original' }
              : { source: 'source', target: 'target' }),
          })
        }
      })
    }
  }

  for (const kind of ['fresh', 'source', 'target']) {
    for (const threshold of [undefined, 0]) {
      test(`connectionDragThreshold ${host} ${kind} default or zero ${threshold}`, async ({
        page,
      }) => {
        await mount(page, { threshold, edge: kind !== 'fresh' })

        const point = await start(
          page,
          kind === 'fresh' ? handle('source') : anchor(kind)
        )

        const receipt2 = await call(page, 'read')
        expect(receipt2.events).toEqual(
          threshold === 0
            ? [kind === 'fresh' ? 'connectStart' : 'reconnectStart']
            : []
        )

        if (threshold === undefined) {
          await page.mouse.move(point.x + 1, point.y)
          const receipt3 = await call(page, 'read')
          expect(receipt3.events).toEqual([])
          await page.mouse.move(point.x + 2, point.y)
        }

        const receipt4 = await call(page, 'read')
        expect(receipt4.captureAtStart).toEqual([true])
        await page.mouse.up()
      })
    }
  }

  for (const kind of ['blur', 'cancel', 'loss', 'replace'] as const) {
    test(`connectionDragThreshold ${host} pending ${kind} is silent and rejects late events`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true })
      const point = await start(page, anchor('target'))
      await page.mouse.move(point.x + 1, point.y)
      await call(page, 'cancel', kind)
      await page.mouse.move(point.x + 30, point.y)
      await page.mouse.up()
      expect(await call(page, 'read')).toMatchObject({
        events: [],
        changes: [],
        captured: false,
        preview: null,
      })
    })
  }

  for (const loss of ['foreign-loss', 'obsolete-loss']) {
    test(`connectionDragThreshold ${host} ${loss} synthetic loss preserves real owner`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true })
      const point = await start(page, anchor('target'))
      await call(page, 'cancel', loss)
      expect(await call(page, 'read')).toMatchObject({
        events: [],
        captured: true,
      })
      await page.mouse.move(point.x + 10, point.y)
      const receipt7 = await call(page, 'read')
      expect(receipt7.events).toContain('reconnectStart')
      await page.mouse.up()
    })
  }

  for (const click of [false, true]) {
    test(`connectionDragThreshold ${host} pending fresh click ${click}`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, click })
      await page.locator(handle('source')).click()
      const receipt8 = await call(page, 'read')
      expect(receipt8.events).toEqual(click ? ['connectStart'] : [])

      if (click) {
        await page.locator(handle('target')).click()
        const result = await call(page, 'read')
        expect(result.changes).toHaveLength(1)
        expect(
          result.events.filter((event: string) => event === 'connectStart')
        ).toHaveLength(1)
      }
    })
  }

  test(`connectionDragThreshold ${host} zero with click disabled completes only the pointer drag`, async ({
    page,
  }) => {
    await mount(page, { threshold: 0, click: false })
    await page.locator(handle('source')).click()
    const clicked = await call(page, 'read')
    expect(clicked.changes).toHaveLength(0)
    expect(clicked.preview).toBeNull()
    expect(
      clicked.rawEvents.filter(
        (event: { inputKind: string }) => event.inputKind === 'click'
      )
    ).toHaveLength(0)
    await start(page, handle('source'))
    const target = await center(page, handle('target'))
    await page.mouse.move(target.x, target.y)
    await page.mouse.up()
    const result = await call(page, 'read')
    expect(result.changes).toHaveLength(1)
    expect(result.preview).toBeNull()
  })

  const registerFoldkitRepairs = () => {
    if (host === 'foldkit') {
      for (const threshold of [0, 8]) {
        for (const controlled of [false, true]) {
          test(`connectionDragThreshold repair Foldkit routed click threshold ${threshold} controlled ${controlled}`, async ({
            page,
          }) => {
            await mount(page, {
              threshold,
              click: true,
              loose: true,
              controlled,
            })
            await page.locator(handle('source')).click()
            const source = await call(page, 'read')
            expect(
              source.rawEvents.filter(
                (event: { name: string; inputKind: string }) =>
                  event.name === 'onConnectStart' && event.inputKind === 'click'
              )
            ).toHaveLength(1)
            await page.locator(handle('target')).click()
            const result = await call(page, 'read')
            expect(result.changes).toHaveLength(1)

            const proposal = result.rawEvents.filter(
              (event: { name: string }) => event.name === 'onConnect'
            )

            expect(proposal).toHaveLength(1)
            expect(proposal[0].outcome).toBe(
              controlled ? 'proposed' : 'accepted'
            )
            expect(
              result.rawEvents.findLast(
                (event: { name: string }) => event.name === 'onConnectEnd'
              )
            ).toMatchObject({
              name: 'onConnectEnd',
              outcome: controlled ? 'proposed' : 'accepted',
            })
            expect(result.preview).toBeNull()
          })
        }
      }

      for (const threshold of [undefined, 8]) {
        for (const controlled of [false, true]) {
          test(`connectionDragThreshold round3 Foldkit keyboard source native target click threshold ${threshold ?? 'default'} controlled ${controlled}`, async ({
            page,
          }) => {
            await mount(page, {
              threshold,
              controlled,
              loose: true,
              click: false,
            })
            await page.locator(handle('source')).focus()
            await page.keyboard.press('Enter')
            const started = await call(page, 'read')
            expect(started.events).toEqual(['connectStart'])
            await page.locator(handle('target')).click()
            const completed = await call(page, 'read')
            expect(completed.events).toEqual([
              'connectStart',
              'connect',
              'connectEnd',
            ])
            expect(completed.changes).toMatchObject([
              {
                kind: 'edge-add',
                edge: {
                  source: 'source',
                  sourceHandle: 'out',
                  target: 'target',
                  targetHandle: 'in',
                },
              },
            ])
            expect(completed.state.document.edges).toHaveLength(
              controlled ? 0 : 1
            )
            expect(
              completed.rawEvents.filter((event: { name: string }) =>
                event.name.startsWith('onConnect')
              )
            ).toMatchObject([
              {
                name: 'onConnectStart',
                inputKind: 'keyboard',
                nodeId: 'source',
              },
              {
                name: 'onConnect',
                inputKind: 'keyboard',
                outcome: controlled ? 'proposed' : 'accepted',
              },
              {
                name: 'onConnectEnd',
                inputKind: 'keyboard',
                outcome: controlled ? 'proposed' : 'accepted',
              },
            ])
            expect(completed).toMatchObject({ captured: false, preview: null })
          })
        }

        test(`connectionDragThreshold round3 Foldkit disabled native click initiation and source-kind completion threshold ${threshold ?? 'default'}`, async ({
          page,
        }) => {
          await mount(page, { threshold, loose: true, click: false })
          await page.locator(handle('source')).click()
          await page.locator(handle('target')).click()
          expect(await call(page, 'read')).toMatchObject({
            events: [],
            changes: [],
            captured: false,
            preview: null,
          })
          await page.locator(handle('source')).focus()
          await page.keyboard.press('Enter')
          await page.locator(handle('source-next')).click()
          expect(await call(page, 'read')).toMatchObject({
            events: ['connectStart'],
            changes: [],
            captured: false,
          })
          await page.locator(handle('target')).click()
          const completed = await call(page, 'read')
          expect(completed.events).toEqual([
            'connectStart',
            'connect',
            'connectEnd',
          ])
          expect(completed.changes).toMatchObject([
            { kind: 'edge-add', edge: { source: 'source', target: 'target' } },
          ])
        })
      }

      for (const controlled of [false, true]) {
        test(`connectionDragThreshold round3 Foldkit keyboard native duplicate target click is rejected controlled ${controlled}`, async ({
          page,
        }) => {
          await mount(page, {
            threshold: 8,
            loose: true,
            click: false,
            edge: true,
            controlled,
          })
          await call(page, 'invalidate', 'selection')
          await call(page, 'frames')
          await page.locator(handle('source')).focus()
          await page.keyboard.press('Enter')
          await page.locator(handle('original')).click()
          const rejected = await call(page, 'read')
          expect(rejected.events).toEqual(['connectStart', 'connectEnd'])
          expect(rejected.changes).toHaveLength(0)
          expect(
            rejected.rawEvents.filter(
              (event: { name: string }) => event.name === 'onConnectEnd'
            )
          ).toMatchObject([
            { inputKind: 'keyboard', outcome: 'rejected', nodeId: 'source' },
          ])
          expect(rejected).toMatchObject({ captured: false, preview: null })
          await page.locator(handle('source')).focus()
          await page.keyboard.press('Enter')
          await page.locator(handle('target')).click()
          const retry = await call(page, 'read')
          expect(retry.changes).toMatchObject([
            { kind: 'edge-add', edge: { source: 'source', target: 'target' } },
          ])
        })
      }

      test('connectionDragThreshold round2 Foldkit rejected routed duplicate has one rejected terminal and no proposal', async ({
        page,
      }) => {
        await mount(page, {
          threshold: 8,
          click: true,
          loose: true,
          edge: true,
        })
        await call(page, 'invalidate', 'selection')
        await call(page, 'frames')
        await page.locator(handle('source')).click()
        await page.locator(handle('original')).click()
        const result = await call(page, 'read')
        expect(result.changes).toHaveLength(0)
        expect(
          result.rawEvents.filter(
            (event: { name: string }) => event.name === 'onConnect'
          )
        ).toHaveLength(0)
        expect(
          result.rawEvents.filter(
            (event: { name: string }) => event.name === 'onConnectEnd'
          )
        ).toMatchObject([{ outcome: 'rejected', inputKind: 'click' }])
        expect(result.preview).toBeNull()
      })

      test('connectionDragThreshold round2 Foldkit native clicks cannot replay a consumed drag receipt', async ({
        page,
      }) => {
        await mount(page, { threshold: 8, click: true, loose: true })
        await start(page, handle('source'))
        const target = await center(page, handle('target'))
        await page.mouse.move(target.x, target.y)
        await page.mouse.up()
        const completed = await call(page, 'read')
        expect(completed.changes).toHaveLength(1)
        expect(completed.preview).toBeNull()
        await page.mouse.click(700, 400)
        await page.mouse.click(700, 400)
        const replayed = await call(page, 'read')
        expect(replayed.changes).toEqual(completed.changes)
        expect(
          replayed.rawEvents.filter((event: { name: string }) =>
            event.name.startsWith('onConnect')
          )
        ).toEqual(
          completed.rawEvents.filter((event: { name: string }) =>
            event.name.startsWith('onConnect')
          )
        )
        expect(replayed.preview).toBeNull()
        await page.locator(handle('source')).click()
        const retry = await call(page, 'read')
        expect(
          retry.rawEvents.filter(
            (event: { name: string; inputKind: string }) =>
              event.name === 'onConnectStart' && event.inputKind === 'click'
          )
        ).toHaveLength(1)
      })

      test('connectionDragThreshold repair Foldkit viewport publications survive lifecycle composition', async ({
        page,
      }) => {
        await mount(page, { threshold: 8, pan: true })
        await page.mouse.move(700, 400)
        await page.mouse.down()
        await page.mouse.move(740, 430)
        await page.mouse.up()
        const result = await call(page, 'read')
        expect(result.viewportEvents).toEqual(['start', 'change', 'end'])
      })
      test('connectionDragThreshold repair Foldkit owner edge zIndex controls are reachable and labels retain their layer', async ({
        page,
      }) => {
        await mount(page, { threshold: 8, edge: true, edgeZIndex: 3 })
        const point = await start(page, anchor('target'))
        const pending = await call(page, 'read')
        expect(pending.captured).toBe(true)
        await page.mouse.move(point.x + 10, point.y)
        const active = await call(page, 'read')
        expect(active.events).toContain('reconnectStart')
        await page.mouse.up()
        expect(
          await page
            .locator('.flow-foldkit-edge-labels')
            .evaluate((element) => getComputedStyle(element).zIndex)
        ).toBe('1')
        await call(page, 'overlapLabel')
        const overlap = await center(page, '.flow-foldkit-edge-label')

        const stack = await page
          .locator('.flow-foldkit-edge-label')
          .evaluate((label, overlapPoint) => {
            if (!(label instanceof HTMLElement)) {
              throw new Error('Missing label')
            }

            label.style.pointerEvents = 'auto'

            const top = document
              .elementFromPoint(overlapPoint.x, overlapPoint.y)
              ?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId

            label.style.removeProperty('pointer-events')

            return top
          }, overlap)

        expect(stack).toBe('source-next')
        await page.mouse.click(overlap.x, overlap.y)
        const selected = await call(page, 'read')
        expect(selected.rawEvents).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'onNodeClick',
              nodeId: 'source-next',
            }),
          ])
        )
      })
    }
  }

  registerFoldkitRepairs()

  for (const action of ['dispose', 'replace'] as const) {
    for (const threshold of [0, 8]) {
      test(`connectionDragThreshold repair ${host} fresh reentrant ${action} threshold ${threshold}`, async ({
        page,
      }) => {
        await mount(page, { threshold, reentrant: action })
        const point = await start(page, handle('source'))
        await page.mouse.move(point.x + 10, point.y)
        await call(page, 'frames')
        await page.mouse.up()
        const result = await call(page, 'read')
        expect(
          result.events.filter((event: string) => event === 'connectStart')
        ).toEqual(['connectStart'])
        expect(result).toMatchObject({
          captured: false,
          preview: null,
          changes: [],
        })
      })
    }
  }

  for (const invalidation of [
    'selection',
    'hidden',
    'reconnectable',
    'handle-kind',
  ]) {
    test(`connectionDragThreshold ${host} pending invalidation ${invalidation}`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true })
      const point = await start(page, anchor('target'))
      await call(page, 'invalidate', invalidation)
      await page.mouse.move(point.x + 30, point.y)
      await page.mouse.up()
      expect(await call(page, 'read')).toMatchObject({
        events: [],
        changes: [],
        captured: false,
        preview: null,
      })
    })
  }

  test(`connectionDragThreshold ${host} wrong synthetic pointer cannot promote`, async ({
    page,
  }) => {
    await mount(page, { threshold: 8, edge: true })
    const point = await start(page, anchor('target'))
    await call(page, 'wrongPointer')
    expect(await call(page, 'read')).toMatchObject({
      events: [],
      captured: true,
      preview: null,
    })
    await page.mouse.up()
    expect(await call(page, 'read')).toMatchObject({
      events: [],
      changes: [],
      captured: false,
      preview: null,
    })
    await page.mouse.move(point.x, point.y)
    await page.mouse.down()
    await page.mouse.move(point.x + 10, point.y)
    const receipt12 = await call(page, 'read')
    expect(receipt12.events).toContain('reconnectStart')
    await page.mouse.up()
  })
  test(`connectionDragThreshold ${host} native capture failure has no lifecycle`, async ({
    page,
  }) => {
    await mount(page, { threshold: 0, edge: true })
    await call(page, 'captureFailure', true)
    await start(page, anchor('target'))
    expect(await call(page, 'read')).toMatchObject({
      events: [],
      changes: [],
      captured: false,
      preview: null,
    })
    await page.mouse.up()
    await call(page, 'captureFailure', false)
  })

  for (const action of ['dispose', 'replace'] as const) {
    test(`connectionDragThreshold ${host} reentrant start ${action}`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true, reentrant: action })
      const point = await start(page, anchor('target'))
      await page.mouse.move(point.x + 10, point.y)
      await call(page, 'frames')
      await page.mouse.up()
      const result = await call(page, 'read')
      expect(
        result.events.filter((event: string) => event.endsWith('Start'))
      ).toEqual(['reconnectStart'])
      expect(result).toMatchObject({
        changes: [],
        captured: false,
        preview: null,
      })
    })
  }

  test(`connectionDragThreshold ${host} Escape clears pending and native disposal releases`, async ({
    page,
  }) => {
    await mount(page, { threshold: 8, edge: true })
    await start(page, anchor('target'))
    await page.keyboard.press('Escape')
    await page.mouse.up()
    expect(await call(page, 'read')).toMatchObject({
      events: [],
      changes: [],
      captured: false,
      preview: null,
    })
    await start(page, anchor('target'))
    await call(page, 'cancel', 'dispose')
    await page.mouse.up()
    expect(await call(page, 'read')).toMatchObject({
      events: [],
      changes: [],
      captured: false,
      preview: null,
    })
  })
  test(`connectionDragThreshold ${host} controlled reconnect proposes then awaits acknowledgement`, async ({
    page,
  }) => {
    await mount(page, { threshold: 8, edge: true, controlled: true })
    await start(page, anchor('target'))
    const point = await center(page, handle('target'))
    await page.mouse.move(point.x, point.y)
    await page.mouse.up()
    const result = await call(page, 'read')
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0]).toMatchObject({
      kind: 'edge-reconnect',
      edge: { target: 'target', label: 'Keep label', data: { keep: 42 } },
    })
    expect(result.state.document.edges[0].target).toBe('original')
    await call(page, 'acknowledge')
    const acknowledged = await call(page, 'read')
    expect(acknowledged.state.document.edges[0].target).toBe('target')
  })

  for (const loose of [false, true]) {
    test(`connectionDragThreshold ${host} target start admission loose ${loose}`, async ({
      page,
    }) => {
      await mount(page, { threshold: 8, loose })
      const point = await start(page, handle('original'))
      await page.mouse.move(point.x + 10, point.y)
      const receipt16 = await call(page, 'read')
      expect(
        receipt16.events.filter((event: string) => event.endsWith('Start'))
      ).toEqual(loose ? ['connectStart'] : [])
      await page.mouse.up()
    })
  }

  if (host !== 'vanilla') {
    test(`connectionDragThreshold ${host} keyboard connection stays immediate`, async ({
      page,
    }) => {
      await mount(page, { threshold: 80, click: true })
      await page.locator(handle('source')).focus()
      await page.keyboard.press('Enter')
      const receipt17 = await call(page, 'read')
      expect(receipt17.events).toEqual(['connectStart'])
      await page.locator(handle('target')).focus()
      await page.keyboard.press('Enter')
      const receipt18 = await call(page, 'read')
      expect(receipt18.changes).toHaveLength(1)
    })
  }

  test(`connectionDragThreshold ${host} public constructors reject invalid values`, async ({
    page,
  }) => {
    await page.goto('/connection-threshold.html', { waitUntil: 'networkidle' })

    const results = await page.evaluate(
      async ({ entry: modulePath, host: adapter }) => {
        const harness = await import(modulePath)

        return harness.invalidConstructors(adapter)
      },
      { entry, host }
    )

    expect(results).toEqual(
      Array.from({ length: host === 'vanilla' ? 18 : 6 }, () => true)
    )
  })

  if (host === 'vue') {
    for (const kind of ['blur', 'cancel', 'loss', 'escape']) {
      test(`connectionDragThreshold repair Vue retained click ${kind} settles before retry`, async ({
        page,
      }) => {
        await mount(page, { threshold: 8, click: true, loose: true })
        await page.locator(handle('source')).click()
        await start(page, handle('target'))

        await (kind === 'escape'
          ? page.keyboard.press('Escape')
          : call(page, 'cancel', kind))

        await page.mouse.move(700, 400)
        await page.mouse.up()
        const cancelled = await call(page, 'read')
        expect(
          cancelled.events.filter((event: string) => event === 'connectEnd')
        ).toHaveLength(1)
        const point = await start(page, handle('source'))
        await page.mouse.move(point.x + 10, point.y)
        const retry = await call(page, 'read')
        expect(
          retry.events.filter((event: string) => event === 'connectStart')
        ).toHaveLength(2)
        await call(page, 'cancel', 'blur')
        await page.mouse.up()
      })
    }

    test('connectionDragThreshold repair Vue invalid live value settles active auto-pan viewport', async ({
      page,
    }) => {
      await mount(page, { threshold: 8 })
      await start(page, handle('source'))
      await page.mouse.move(950, 300)
      await call(page, 'frames', 8)
      const active = await call(page, 'read')
      expect(active.viewportEvents).toContain('start')
      await call(page, 'threshold', null)
      await page.mouse.up()
      const cancelled = await call(page, 'read')
      expect(cancelled.viewportEvents.at(-1)).toBe('end')
      expect(
        cancelled.viewportEvents.filter((kind: string) => kind === 'end')
      ).toHaveLength(1)
      expect(cancelled).toMatchObject({ captured: false, preview: null })
    })
    test('connectionDragThreshold Vue valid live replacement preserves an active pointer', async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true })
      const point = await start(page, anchor('target'))
      await page.mouse.move(point.x + 10, point.y)
      await call(page, 'threshold', 40)
      expect(await call(page, 'read')).toMatchObject({ captured: true })
      const target = await center(page, handle('target'))
      await page.mouse.move(target.x, target.y)
      await page.mouse.up()
      const receipt20 = await call(page, 'read')
      expect(receipt20.changes).toHaveLength(1)
    })

    test('connectionDragThreshold Vue invalid live value cancels active capture and prevents readmission', async ({
      page,
    }) => {
      await mount(page, { threshold: 8, edge: true })
      const point = await start(page, anchor('target'))
      await page.mouse.move(point.x + 10, point.y)
      await call(page, 'threshold', null)
      await page.mouse.up()
      const cancelled = await call(page, 'read')
      expect(cancelled).toMatchObject({
        captured: false,
        preview: null,
        changes: [],
      })
      expect(cancelled.errors).toHaveLength(1)
      await call(page, 'clearEvents')
      await start(page, anchor('target'))
      await page.mouse.move(point.x + 20, point.y)
      await page.mouse.up()
      const rejected = await call(page, 'read')
      expect(rejected).toMatchObject({
        events: [],
        captured: false,
        preview: null,
        changes: [],
      })
    })

    for (const input of ['click', 'keyboard']) {
      test(`connectionDragThreshold Vue valid live replacement preserves ${input}`, async ({
        page,
      }) => {
        await mount(page, { threshold: 8, click: true })

        if (input === 'click') {
          await page.locator(handle('source')).click()
        } else {
          await page.locator(handle('source')).focus()
          await page.keyboard.press('Enter')
        }

        await call(page, 'threshold', 40)

        if (input === 'click') {
          await page.locator(handle('target')).click()
        } else {
          await page.locator(handle('target')).focus()
          await page.keyboard.press('Enter')
        }

        const completed = await call(page, 'read')
        expect(completed.changes).toHaveLength(1)
        expect(
          completed.events.filter((event: string) => event === 'connectStart')
        ).toHaveLength(1)
      })
    }

    for (const value of [2, null]) {
      test(`connectionDragThreshold Vue live pending replacement ${value}`, async ({
        page,
      }) => {
        await mount(page, { threshold: 8, edge: true })
        const point = await start(page, anchor('target'))
        await call(page, 'threshold', value)
        await page.mouse.move(point.x + 30, point.y)
        await page.mouse.up()
        expect(await call(page, 'read')).toMatchObject({
          events: [],
          changes: [],
          captured: false,
          preview: null,
          validations: 0,
        })
        const receipt22 = await call(page, 'read')
        expect(receipt22.errors).toHaveLength(value === null ? 1 : 0)
      })
    }
  }
}
