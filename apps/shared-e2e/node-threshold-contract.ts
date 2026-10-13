import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { FlowChange } from '../../packages/core/src/public.ts'

const entry = '/e2e/connection-threshold-harness.ts'

const read = (page: Page) =>
  page.evaluate(async (path) => {
    const harness = await import(path)

    return harness.read()
  }, entry)

const readEvents = async (page: Page) => {
  const result = await read(page)

  return result.events
}

const namedEvents = async (page: Page, name: string) => {
  const events = await readEvents(page)

  return events.filter((event: string) => event === name)
}

const observedNodeClicks = async (page: Page) => {
  const result = await read(page)

  return result.rawEvents
    .filter((event: { name: string }) => event.name === 'onNodeClick')
    .map((event: { nodeId: string }) => event.nodeId)
}

const sourcePosition = async (page: Page) => {
  const result = await read(page)

  return result.state.document.nodes.find(
    (node: { id: string }) => node.id === 'source'
  ).position
}

const positions = async (page: Page) => {
  const result = await read(page)

  return result.changes.filter(
    (change: { kind: string }) => change.kind === 'node-position'
  )
}

const lastEvent = async (page: Page) => {
  const events = await readEvents(page)

  return events.at(-1)
}

const readCaptureAtStart = async (page: Page) => {
  const result = await read(page)

  return result.captureAtStart
}

const pointerId = async (page: Page) => {
  const result = await read(page)

  return result.pointerId
}

const positionCount = async (page: Page) => {
  const changes = await positions(page)

  return changes.length
}

const mount = (
  page: Page,
  host: string,
  nodeThreshold: number | undefined,
  zoom = 1,
  controlled = false
) =>
  page.evaluate(
    async (input) => {
      const harness = await import(input.entry)
      await harness.mount(input.host, {
        nodeThreshold: input.nodeThreshold,
        zoom: input.zoom,
        controlled: input.controlled,
      })
    },
    { entry, host, nodeThreshold, zoom, controlled }
  )

const point = async (page: Page) => {
  const box = await page
    .locator('[data-node-id="source"]')
    .first()
    .boundingBox()

  if (box === null) {
    throw new Error('Missing source node')
  }

  return {
    x: box.x + Math.min(30, box.width / 2),
    y: box.y + Math.min(20, box.height / 2),
  }
}

export const nodeThresholdContract = (host: 'vanilla' | 'vue' | 'foldkit') => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connection-threshold.html')
  })

  for (const zoom of [0.5, 1, 2]) {
    test(`native pointer threshold equality crossing and latch at zoom ${zoom}`, async ({
      page,
    }) => {
      await mount(page, host, 5, zoom)
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 3, start.y + 4)
      expect(await readEvents(page)).toEqual([])
      await page.mouse.move(start.x + 6, start.y)
      await expect
        .poll(async () => await readEvents(page))
        .toEqual(['nodeStart', 'nodeMove'])
      await page.mouse.move(start.x, start.y)
      await page.mouse.up()
      await expect
        .poll(async () => await readEvents(page))
        .toEqual(['nodeStart', 'nodeMove', 'nodeMove', 'nodeStop'])
      const result = await read(page)
      expect(
        result.changes.filter(
          (change: { kind: string }) => change.kind === 'node-position'
        )
      ).toHaveLength(1)
      expect(
        result.state.document.nodes.find(
          (node: { id: string }) => node.id === 'source'
        ).position
      ).toEqual({ x: 60, y: 70 })
      expect(result.captured).toBe(false)
    })
  }

  test('native zero down and no-move release', async ({ page }) => {
    await mount(page, host, 0)
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await expect.poll(async () => await readEvents(page)).toEqual(['nodeStart'])
    expect(await readCaptureAtStart(page)).toEqual([true])
    await page.mouse.up()
    await expect
      .poll(async () => await readEvents(page))
      .toEqual(['nodeStart', 'nodeStop'])
    expect(await positions(page)).toHaveLength(1)
  })
  test('default one and controlled refusal retain accepted position', async ({
    page,
  }) => {
    await mount(page, host, undefined, 1, true)
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 1, start.y)
    expect(await readEvents(page)).toEqual([])
    await page.mouse.move(start.x + 2, start.y)
    await page.mouse.up()
    await expect.poll(async () => await lastEvent(page)).toBe('nodeStop')
    const result = await read(page)
    expect(
      result.changes.filter(
        (change: { kind: string }) => change.kind === 'node-position'
      )
    ).toHaveLength(1)
    expect(
      result.state.document.nodes.find(
        (node: { id: string }) => node.id === 'source'
      ).position
    ).toEqual({ x: 60, y: 70 })
  })
  test('synthetic distant release cannot activate pending pointer', async ({
    page,
  }) => {
    await mount(page, host, 5)
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    const id = await pointerId(page)
    await page
      .locator('[data-node-id="source"]')
      .first()
      .dispatchEvent('pointerup', {
        pointerId: id,
        clientX: start.x + 100,
        clientY: start.y,
      })
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
    expect(await positions(page)).toHaveLength(0)
  })
  test('native pending stays quiet while canvas bounds move', async ({
    page,
  }) => {
    await mount(page, host, 5)
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.locator('#app').evaluate((element) => {
      element.style.marginLeft = '30px'
    })
    await page.mouse.move(start.x + 1, start.y)
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
  })
  test('native node-wrapper capture retains down-node click targeting on release over another node', async ({
    page,
  }) => {
    await mount(page, host, 1000)
    const start = await point(page)

    const target = await page
      .locator('[data-node-id="target"]')
      .first()
      .boundingBox()

    if (target === null) {
      throw new Error('Missing target')
    }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(target.x + 20, target.y + 20)
    await page.mouse.up()
    const result = await read(page)
    expect(result.events).toEqual([])
    expect(result.nodeClicks).toEqual(host === 'vanilla' ? [] : ['source'])

    if (host === 'foldkit') {
      expect(
        result.rawEvents.filter(
          (event: { name: string }) => event.name === 'onNodeClick'
        )
      ).toHaveLength(1)
    }
  })

  for (const mode of ['pending', 'active']) {
    test(`native Escape cancels ${mode} and permits retry`, async ({
      page,
    }) => {
      await mount(page, host, mode === 'pending' ? 5 : 0)
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.keyboard.press('Escape')
      await page.mouse.up()
      const cancelled = await read(page)
      expect(cancelled.events).toEqual(
        mode === 'pending' ? [] : ['nodeStart', 'nodeStop']
      )
      expect(cancelled.captured).toBe(false)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 6, start.y)
      await page.mouse.up()
      await expect.poll(async () => await positionCount(page)).toBe(1)
    })
  }

  test('checked capture failure stays silent and permits retry', async ({
    page,
  }) => {
    await mount(page, host, 0)
    const start = await point(page)
    await page.evaluate(async (path) => {
      const harness = await import(path)

      return harness.captureFailure(true)
    }, entry)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
    await page.evaluate(async (path) => {
      const harness = await import(path)

      return harness.captureFailure(false)
    }, entry)
    await page.mouse.down()
    await page.mouse.up()
    await expect
      .poll(async () => await readEvents(page))
      .toEqual(['nodeStart', 'nodeStop'])
  })

  test('nonthrowing false capture has no node output or preview and permits native retry', async ({
    page,
  }) => {
    await mount(page, host, 0)
    const wrapper = page.locator('[data-node-id="source"]').first()
    const before = await wrapper.boundingBox()

    if (before === null) {
      throw new Error('Missing node before refused capture')
    }

    const start = await point(page)
    await page.evaluate(async (path) => {
      const harness = await import(path)

      return harness.captureFailure('false')
    }, entry)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 12, start.y)
    const pending = await read(page)
    const refused = await wrapper.boundingBox()

    if (refused === null) {
      throw new Error('Missing node after refused capture')
    }

    expect({
      nodePreviewDelta: { x: refused.x - before.x, y: refused.y - before.y },
      events: pending.events,
      changes: pending.changes,
      preview: pending.preview,
      captured: pending.captured,
    }).toEqual({
      nodePreviewDelta: { x: 0, y: 0 },
      events: [],
      changes: [],
      preview: null,
      captured: false,
    })
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
    await page.evaluate(async (path) => {
      const harness = await import(path)

      return harness.captureFailure(false)
    }, entry)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 12, start.y)
    await page.mouse.up()
    await expect.poll(async () => await positionCount(page)).toBe(1)
    const retried = await read(page)
    expect(retried.events).toEqual(['nodeStart', 'nodeMove', 'nodeStop'])
    expect(
      retried.changes.filter(
        (change: FlowChange) => change.kind === 'node-position'
      )
    ).toEqual([
      { kind: 'node-position', nodeId: 'source', position: { x: 72, y: 70 } },
    ])
    expect(retried.captured).toBe(false)
  })

  if (host === 'vue') {
    test('valid threshold replacement affects future admissions while invalid replacement cancels and restores', async ({
      page,
    }) => {
      await mount(page, host, 5)
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.evaluate(async (path) => {
        const harness = await import(path)

        return harness.nodeThreshold(100)
      }, entry)
      await page.mouse.move(start.x + 6, start.y)
      expect(await readEvents(page)).toEqual(['nodeStart', 'nodeMove'])
      await page.evaluate(async (path) => {
        const harness = await import(path)

        return harness.nodeThreshold(-1)
      }, entry)
      await page.mouse.up()
      const cancelled = await read(page)
      expect(cancelled.events).toEqual(['nodeStart', 'nodeMove', 'nodeStop'])
      expect(
        cancelled.changes.filter(
          (change: { kind: string }) => change.kind === 'node-position'
        )
      ).toHaveLength(0)
      await page.evaluate(async (path) => {
        const harness = await import(path)

        return harness.nodeThreshold(0)
      }, entry)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.up()
      expect(await positions(page)).toHaveLength(1)
    })

    for (const kind of [
      'position',
      'selection',
      'origin',
      'hidden',
      'draggable',
      'remove',
    ]) {
      test(`Vue accepted ${kind} update has bounded invalidation`, async ({
        page,
      }) => {
        await mount(page, host, 0)
        const start = await point(page)
        await page.mouse.move(start.x, start.y)
        await page.mouse.down()
        await page.evaluate(
          async ({ path, kind: mutation }) => {
            const harness = await import(path)

            return harness.nodeMutation(mutation)
          },
          { path: entry, kind }
        )
        await page.mouse.move(start.x + 12, start.y)
        await page.mouse.up()
        const result = await read(page)
        expect(
          result.changes.filter(
            (change: { kind: string }) => change.kind === 'node-position'
          )
        ).toHaveLength(kind === 'position' || kind === 'selection' ? 1 : 0)
        expect(
          result.events.filter((name: string) => name === 'nodeStop')
        ).toHaveLength(1)
        expect(result.captured).toBe(false)
      })
    }
  }

  test('every public node option boundary rejects invalid explicit values', async ({
    page,
  }) => {
    const rejected = await page.evaluate(
      async ({ path, host: adapter }) => {
        const harness = await import(path)

        return harness.invalidNodeConstructors(adapter)
      },
      { path: entry, host }
    )

    expect(rejected).toEqual(
      Array.from({ length: host === 'vanilla' ? 24 : 8 }, () => true)
    )
  })

  for (const reentrant of ['dispose', 'replace']) {
    test(`node start callback ${reentrant} cannot publish a stale release`, async ({
      page,
    }) => {
      await page.evaluate(
        async ({ path, host: adapter, reentrant: action }) => {
          const harness = await import(path)
          await harness.mount(adapter, { nodeThreshold: 0, reentrant: action })
        },
        { path: entry, host, reentrant }
      )
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 20, start.y)
      await page.mouse.up()
      expect(await positions(page)).toHaveLength(0)
    })
  }

  for (const parentOrigin of [false, true]) {
    test(`native origin geometry retains local anchors with parent origin ${parentOrigin}`, async ({
      page,
    }) => {
      await page.evaluate(
        async ({ path, host: adapter, parentOrigin: anchoredParent }) => {
          const harness = await import(path)
          await harness.mount(adapter, {
            nodeThreshold: 5,
            zoom: 2,
            geometry: true,
            parentOrigin: anchoredParent,
          })
        },
        { path: entry, host, parentOrigin }
      )
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 12, start.y + 6)
      await page.mouse.up()
      await expect.poll(() => positionCount(page)).toBe(1)
      const proposed = await positions(page)
      expect(proposed[0].position).toEqual({ x: 36, y: 43 })

      const world = await page.evaluate(() => {
        const node = document.querySelector<HTMLElement>(
          '[data-node-id="source"]'
        )

        const canvas = document.querySelector<HTMLElement>(
          '[data-testid="flow-canvas"]'
        )

        if (node === null || canvas === null) {
          throw new Error('Missing geometry')
        }

        const bounds = node.getBoundingClientRect()
        const origin = canvas.getBoundingClientRect()

        return {
          x: (bounds.x - origin.x - canvas.clientLeft - 80) / 2,
          y: (bounds.y - origin.y - canvas.clientTop - 80) / 2,
        }
      })

      expect(world).toEqual({ x: 126, y: 238 })
    })
  }

  test('native controls exclude node admission and a subsequent ordinary drag succeeds', async ({
    page,
  }) => {
    await mount(page, host, 0)
    const node = page.locator('[data-node-id="source"]').first()
    await node.evaluate((element) => {
      const button = document.createElement('button')
      button.textContent = 'Native control'
      button.dataset.testid = 'native-control'
      ;(element.querySelector('.flow-node-content') ?? element).append(button)
    })
    const button = page.getByTestId('native-control')
    const bounds = await button.boundingBox()

    if (bounds === null) {
      throw new Error('Missing control')
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 12,
      bounds.y + bounds.height / 2
    )
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
    await button.evaluate((element) => element.remove())
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 12, start.y)
    await page.mouse.up()
    await expect.poll(() => positionCount(page)).toBe(1)
  })

  test('native node completion hands capture to a connection gesture', async ({
    page,
  }) => {
    await mount(page, host, 0)
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 6, start.y)
    await page.mouse.up()

    const handle = await page
      .locator('[data-node-id="source"] [data-handle-id="out"]')
      .first()
      .boundingBox()

    const target = await page
      .locator('[data-node-id="target"] [data-handle-id="in"]')
      .first()
      .boundingBox()

    if (handle === null || target === null) {
      throw new Error('Missing handles')
    }

    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      target.x + target.width / 2,
      target.y + target.height / 2
    )
    await page.mouse.up()
    await expect
      .poll(async () => await namedEvents(page, 'connect'))
      .toEqual(['connect'])
    expect(await namedEvents(page, 'nodeStop')).toEqual(['nodeStop'])
  })

  if (host === 'vue') {
    for (const kind of [
      'ancestor-move',
      'ancestor-hidden',
      'ancestry',
      'own-measurement',
      'parent-measurement',
      'disconnect',
    ]) {
      for (const parentOrigin of [false, true]) {
        test(`Vue frame ${kind} with parent origin ${parentOrigin}`, async ({
          page,
        }) => {
          await page.evaluate(
            async ({ path, origin }) => {
              const harness = await import(path)
              await harness.mount('vue', {
                geometry: true,
                nodeThreshold: 0,
                parentOrigin: origin,
                zoom: 2,
              })
            },
            { path: entry, origin: parentOrigin }
          )
          const start = await point(page)
          await page.mouse.move(start.x, start.y)
          await page.mouse.down()
          await page.evaluate(
            async ({ path, mutation }) => {
              const harness = await import(path)

              if (mutation === 'disconnect') {
                document.querySelector('[data-node-id="source"]')?.remove()
              } else if (mutation.endsWith('measurement')) {
                const id = mutation === 'own-measurement' ? 'source' : 'parent'
                document
                  .querySelector<HTMLElement>(`[data-node-id="${id}"]`)
                  ?.style.setProperty('width', '120px', 'important')
                await harness.frames()
              } else {
                await harness.nodeMutation(mutation)
              }
            },
            { path: entry, mutation: kind }
          )
          await page.mouse.move(start.x + 12, start.y)
          await page.mouse.up()

          const survives =
            kind === 'own-measurement' ||
            (kind === 'parent-measurement' && !parentOrigin)

          expect(await positionCount(page)).toBe(survives ? 1 : 0)
          expect(await namedEvents(page, 'nodeStop')).toHaveLength(1)
        })
      }
    }
  }

  test('controlled node proposal can be acknowledged synchronously without a duplicate terminal', async ({
    page,
  }) => {
    await page.evaluate(
      async ({ path, adapter }) => {
        const harness = await import(path)
        await harness.mount(adapter, {
          nodeThreshold: 0,
          controlled: true,
          acknowledgeNode: true,
        })
      },
      { path: entry, adapter: host }
    )
    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 12, start.y + 6)
    await page.mouse.up()
    await expect.poll(() => sourcePosition(page)).toEqual({ x: 72, y: 76 })
    expect(await namedEvents(page, 'nodeStop')).toHaveLength(1)
  })

  test('crossing renders the existing host preview policy before release', async ({
    page,
  }) => {
    await mount(page, host, 5)
    const wrapper = page.locator('[data-node-id="source"]').first()
    const before = await wrapper.boundingBox()

    if (before === null) {
      throw new Error('Missing node bounds')
    }

    const start = await point(page)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 6, start.y)
    await expect
      .poll(async () => {
        const bounds = await wrapper.boundingBox()

        return bounds?.x
      })
      .toBe(before.x + (host === 'foldkit' ? 0 : 6))
    expect(await positionCount(page)).toBe(0)
    await page.mouse.up()
    await expect.poll(() => positionCount(page)).toBe(1)
  })

  if (host === 'foldkit') {
    test('detail-zero wrapper click is brokered without a pointer lease', async ({
      page,
    }) => {
      await mount(page, host, 5)
      await page
        .locator('[data-node-id="source"]')
        .first()
        .evaluate((element: HTMLElement) => element.click())
      await expect.poll(() => observedNodeClicks(page)).toHaveLength(1)
      expect(await readEvents(page)).toEqual([])
    })
    test('native captured release outside every node retains the original node click', async ({
      page,
    }) => {
      await mount(page, host, 10_000)
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(900, 600)
      await page.mouse.up()
      await expect.poll(() => observedNodeClicks(page)).toEqual(['source'])
      expect(await readEvents(page)).toEqual([])
    })
  }

  if (host === 'vanilla') {
    test('selected group anchors receive one client delta without origin correction twice', async ({
      page,
    }) => {
      await page.evaluate(async (path) => {
        const harness = await import(path)
        await harness.mount('vanilla', {
          nodeThreshold: 0,
          zoom: 2,
          group: true,
        })
      }, entry)
      const start = await point(page)
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      await page.mouse.move(start.x + 12, start.y + 6)
      await page.mouse.up()
      const result = await read(page)
      expect(
        result.changes.filter(
          (change: { kind: string }) => change.kind === 'node-positions'
        )
      ).toHaveLength(1)
      expect(
        result.state.document.nodes
          .filter(
            (node: { id: string }) =>
              node.id === 'source' || node.id === 'source-next'
          )
          .map((node: { position: { x: number; y: number } }) => node.position)
      ).toEqual([
        { x: 66, y: 73 },
        { x: 66, y: 223 },
      ])
    })
  }

  test('marked drag handle admits only its own native pointer target', async ({
    page,
  }) => {
    await mount(page, host, 5)
    await page
      .locator('[data-node-id="source"]')
      .first()
      .evaluate((node) => {
        const content = node.querySelector('.flow-node-content') ?? node
        const ordinary = document.createElement('span')
        ordinary.dataset.testid = 'unmarked-content'
        ordinary.textContent = 'Ordinary content'
        ordinary.style.display = 'block'
        const handle = document.createElement('button')
        handle.dataset.flowDragHandle = ''
        handle.dataset.testid = 'marked-drag-handle'
        handle.textContent = 'Drag here'
        content.append(ordinary, handle)
      })
    const unmarked = await page.getByTestId('unmarked-content').boundingBox()

    if (unmarked === null) {
      throw new Error('Missing ordinary content')
    }

    await page.mouse.move(unmarked.x + 30, unmarked.y + unmarked.height / 2)
    await page.mouse.down()
    await page.mouse.move(unmarked.x + 42, unmarked.y + unmarked.height / 2)
    await page.mouse.up()
    expect(await readEvents(page)).toEqual([])
    const marked = await page.getByTestId('marked-drag-handle').boundingBox()

    if (marked === null) {
      throw new Error('Missing marked handle')
    }

    await page.mouse.move(
      marked.x + marked.width / 2,
      marked.y + marked.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      marked.x + marked.width / 2 + 12,
      marked.y + marked.height / 2
    )
    await page.mouse.up()
    await expect.poll(() => positionCount(page)).toBe(1)
  })
  test('native keyboard selection bypasses the pointer node threshold', async ({
    page,
  }) => {
    await mount(page, host, 10_000)

    const target =
      host === 'foldkit'
        ? page.locator('[data-node-id="source"] .flow-foldkit-select-node')
        : page.locator('[data-node-id="source"]').first()

    await target.focus()
    await page.keyboard.press('Space')
    await expect
      .poll(async () => {
        const result = await read(page)

        return result.state.document.nodes.find(
          (node: { id: string }) => node.id === 'source'
        ).selected
      })
      .toBe(true)
    expect(await readEvents(page)).toEqual([])
    expect(await positionCount(page)).toBe(0)
  })
}
