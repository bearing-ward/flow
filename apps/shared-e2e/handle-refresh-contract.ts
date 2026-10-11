import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

import './handle-refresh-fixture.ts'
import reference from '../../research/fixtures/handle-refresh-reference.json' with { type: 'json' }

const configureEquivalentLayout = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    for (const node of document.querySelectorAll<HTMLElement>(
      '[data-testid="flow-node"]'
    )) {
      node.style.border = '0'
      node.style.padding = '0'
    }

    for (const handle of document.querySelectorAll<HTMLElement>(
      '[data-handle-id]'
    )) {
      handle.style.width = '10px'
      handle.style.height = '10px'
      handle.style.border = '0'
      handle.style.padding = '0'
      handle.style.top = '50%'
      handle.style.transform = 'translateY(-50%)'

      if (handle.dataset.handleId === 'out') {
        handle.style.right = '-5px'
      } else {
        handle.style.left = '-5px'
      }
    }
  })
}

export const assertDynamicHandleRefresh = async (
  page: Page,
  host: 'vanilla' | 'vue' | 'foldkit',
  zoom: number,
  controlled: boolean,
  equivalentLayout: boolean
): Promise<void> => {
  await page.goto(host === 'vanilla' ? '/' : '/test.html')
  await page.evaluate(
    async ({ hostName, scale, control }) => {
      const path =
        hostName === 'foldkit'
          ? '/e2e/handle-refresh-fixture.ts'
          : '/src/handle-refresh-fixture.ts'

      const { startHandleRefresh } = await import(path)
      await startHandleRefresh(scale, control)
    },
    { hostName: host, scale: zoom, control: controlled }
  )
  await expect(
    page.locator('[data-testid="flow-node"][data-node-id="source"]')
  ).toBeVisible()

  if (equivalentLayout) {
    await configureEquivalentLayout(page)
  }

  const before = await page.evaluate(async () => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing native fixture')
    }

    await fixture.refresh(['source', 'target'])

    return { snapshot: await fixture.snapshot(), saved: await fixture.saved() }
  })

  const observation = await page.evaluate(async (scale) => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing native fixture')
    }

    const source = document.querySelector<HTMLElement>(
      '[data-node-id="source"] [data-handle-id="out"]'
    )

    const target = document.querySelector<HTMLElement>(
      '[data-node-id="target"] [data-handle-id="in"]'
    )

    const other = document.querySelector<HTMLElement>(
      '[data-node-id="target"] [data-handle-id="other"]'
    )

    if (source === null || target === null || other === null) {
      throw new Error('Missing declared handles')
    }

    source.style.top = '25%'
    target.style.top = '75%'
    other.style.top = '25%'

    const results = await fixture.refresh([
      'source',
      'target',
      'source',
      'absent',
    ])

    return {
      results,
      source: await fixture.internal('source'),
      target: await fixture.internal('target'),
      snapshot: await fixture.snapshot(),
      saved: await fixture.saved(),
      dom: (() => {
        const sourceNode = source.closest<HTMLElement>(
          '[data-testid="flow-node"]'
        )

        const targetNode = target.closest<HTMLElement>(
          '[data-testid="flow-node"]'
        )

        if (sourceNode === null || targetNode === null) {
          throw new Error('Missing node containers')
        }

        const a = source.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        const an = sourceNode.getBoundingClientRect()
        const bn = targetNode.getBoundingClientRect()

        return {
          sourceY: (a.top + a.height / 2 - an.top) / scale,
          targetY: (b.top + b.height / 2 - bn.top) / scale,
        }
      })(),
    }
  }, zoom)

  expect(observation.results).toEqual([
    { nodeId: 'source', status: 'requested' },
    { nodeId: 'target', status: 'requested' },
    { nodeId: 'absent', status: 'missing' },
  ])
  expect(observation.source?.absolutePosition).toEqual({ x: 50, y: 70 })
  expect(observation.snapshot).toEqual(before.snapshot)
  expect(observation.saved).toEqual(before.saved)
  expect(JSON.stringify(observation.saved)).not.toContain('offset')

  const sourceGeometry = observation.source?.handles.find(
    ({ handleId }) => handleId === 'out'
  )

  const targetGeometry = observation.target?.handles.find(
    ({ handleId }) => handleId === 'in'
  )

  if (
    sourceGeometry === undefined ||
    targetGeometry === undefined ||
    observation.source === null ||
    observation.target === null
  ) {
    throw new Error('Missing public measured handles')
  }

  expect(sourceGeometry.offset.y).toBeCloseTo(observation.dom.sourceY)
  expect(targetGeometry.offset.y).toBeCloseTo(observation.dom.targetY)

  const expected = {
    start: {
      x:
        observation.source.absolutePosition.x +
        sourceGeometry.offset.x +
        sourceGeometry.width / 2,
      y: observation.source.absolutePosition.y + sourceGeometry.offset.y,
    },
    end: {
      x:
        observation.target.absolutePosition.x +
        targetGeometry.offset.x -
        targetGeometry.width / 2,
      y: observation.target.absolutePosition.y + targetGeometry.offset.y,
    },
  }

  if (equivalentLayout) {
    expect({
      absolutePosition: observation.source.absolutePosition,
      width: observation.source.width,
      height: observation.source.height,
      center: sourceGeometry.offset,
    }).toEqual(reference.cases.moved.source)
    expect({
      absolutePosition: observation.target.absolutePosition,
      width: observation.target.width,
      height: observation.target.height,
      center: targetGeometry.offset,
    }).toEqual(reference.cases.moved.target)
    expect(expected).toEqual(reference.cases.moved.endpoints)
  }

  await expect
    .poll(() =>
      page.evaluate(() => {
        const path = document.querySelector<SVGPathElement>(
          '[data-edge-id="initial"] path.flow-edge-path, [data-edge-id="initial"] path.flow-vue-edge-path, [data-edge-id="initial"] path.flow-foldkit-edge-path'
        )

        if (path === null) {
          return null
        }

        const start = path.getPointAtLength(0)
        const end = path.getPointAtLength(path.getTotalLength())

        return {
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
        }
      })
    )
    .toEqual(expected)

  if (!controlled) {
    const source = page.locator(
      '[data-testid="flow-node"][data-node-id="source"] [data-handle-id="out"]'
    )

    const target = page.locator(
      '[data-testid="flow-node"][data-node-id="target"] [data-handle-id="other"]'
    )

    const sourceBounds = await source.boundingBox()
    const targetBounds = await target.boundingBox()

    if (sourceBounds === null || targetBounds === null) {
      throw new Error('Missing pointer handle bounds')
    }

    await page.mouse.move(
      sourceBounds.x + sourceBounds.width / 2,
      sourceBounds.y + sourceBounds.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
      targetBounds.x + targetBounds.width / 2 + 12,
      targetBounds.y + targetBounds.height / 2,
      { steps: 8 }
    )
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const fixture = window.__handleRefresh

          if (fixture === undefined) {
            throw new Error('Missing native fixture')
          }

          const preview = await fixture.preview()

          return preview?.candidate?.targetHandle
        })
      )
      .toBe('other')
    await page.mouse.up()
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const fixture = window.__handleRefresh

          if (fixture === undefined) {
            throw new Error('Missing native fixture')
          }

          const snapshot = await fixture.snapshot()

          return snapshot.document.edges.some(
            (edge) =>
              edge.sourceHandle === 'out' && edge.targetHandle === 'other'
          )
        })
      )
      .toBe(true)
  }

  const replacement = await page.evaluate(async (scale) => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing native fixture')
    }

    const prior = await fixture.snapshot()

    const withAdded = {
      ...prior.document,
      nodes: prior.document.nodes.map((node) =>
        node.id === 'target'
          ? {
              ...node,
              handles: [
                ...(node.handles ?? []),
                { id: 'added', kind: 'target' as const, side: 'left' as const },
              ],
            }
          : node
      ),
    }

    await fixture.replace(withAdded)
    await fixture.refresh('target')
    const added = await fixture.internal('target')

    const addedElement = document.querySelector<HTMLElement>(
      '[data-testid="flow-node"][data-node-id="target"] [data-handle-id="added"]'
    )

    if (addedElement === null) {
      throw new Error('New declared handle was not rendered')
    }

    addedElement.style.top = '20%'
    await fixture.refresh('target')
    const relocatedAdded = await fixture.internal('target')

    const addedNode = addedElement.closest<HTMLElement>(
      '[data-testid="flow-node"]'
    )

    if (addedNode === null) {
      throw new Error('Missing new handle owner')
    }

    const addedBounds = addedElement.getBoundingClientRect()
    const addedNodeBounds = addedNode.getBoundingClientRect()

    const addedCenter =
      (addedBounds.top + addedBounds.height / 2 - addedNodeBounds.top) / scale

    await fixture.replace(prior.document)
    await fixture.refresh('target')
    const removedAdded = await fixture.internal('target')

    const without = {
      ...prior.document,
      nodes: prior.document.nodes.map((node) =>
        node.id === 'source' ? { ...node, handles: [] } : node
      ),
      edges: [],
    }

    await fixture.replace(without)
    await fixture.refresh('source')
    const removed = await fixture.internal('source')
    await fixture.replace(prior.document)
    await fixture.refresh('source')

    return {
      added,
      addedCenter,
      relocatedAdded,
      removedAdded,
      removed,
      restored: await fixture.internal('source'),
    }
  }, zoom)

  expect(replacement.added?.handles.map(({ handleId }) => handleId)).toContain(
    'added'
  )
  expect(
    replacement.relocatedAdded?.handles.find(
      ({ handleId }) => handleId === 'added'
    )?.offset.y
  ).toBeCloseTo(replacement.addedCenter)
  expect(
    replacement.removedAdded?.handles.map(({ handleId }) => handleId)
  ).not.toContain('added')
  expect(replacement.removed?.handles).toEqual([])
  expect(replacement.restored?.handles.map(({ handleId }) => handleId)).toEqual(
    ['out']
  )

  const disposed = await page.evaluate(async () => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing native fixture')
    }

    const pending = fixture.refresh(['source', 'target'])
    fixture.dispose()

    return { pending: await pending, late: await fixture.refresh('source') }
  })

  expect(disposed.pending).toEqual([
    { nodeId: 'source', status: 'disposed' },
    { nodeId: 'target', status: 'disposed' },
  ])
  expect(disposed.late).toEqual([{ nodeId: 'source', status: 'disposed' }])
}

/** Original 065 members, through mounted public APIs rather than a private store. */
export const assertHandleMemberAcceptance = async (
  page: Page,
  host: 'vanilla' | 'vue' | 'foldkit',
  zoom: number
): Promise<void> => {
  await page.goto(host === 'vanilla' ? '/' : '/test.html')
  await page.evaluate(
    async ({ hostName, scale }) => {
      const path =
        hostName === 'foldkit'
          ? '/e2e/handle-refresh-fixture.ts'
          : '/src/handle-refresh-fixture.ts'

      const { startHandleRefresh } = await import(path)
      await startHandleRefresh(scale, false)
      const fixture = window.__handleRefresh

      if (fixture === undefined) {
        throw new Error('Missing member acceptance owner')
      }

      const sides = ['top', 'right', 'bottom', 'left'] as const
      const kinds = ['source', 'target'] as const

      await fixture.replace({
        edges: [],
        nodes: [
          {
            id: 'members',
            label: 'Member geometry',
            position: { x: 40, y: 60 },
            size: { width: 160, height: 100 },
            handles: kinds.flatMap((kind) =>
              sides.map((side) => ({ id: `${kind}-${side}`, kind, side }))
            ),
          },
          {
            id: 'hidden-members',
            label: 'Hidden member fallback',
            hidden: true,
            position: { x: 0, y: 0 },
            size: { width: 93, height: 47 },
            handles: [{ id: 'hidden', kind: 'source', side: 'top' }],
          },
          {
            id: 'hidden-default',
            label: 'Hidden default fallback',
            hidden: true,
            position: { x: 0, y: 0 },
          },
        ],
      })
      await fixture.refresh('members')
    },
    { hostName: host, scale: zoom }
  )
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const internal = await window.__handleRefresh?.internal('members')

        return internal?.handles.length
      })
    )
    .toBe(8)

  const observation = await page.evaluate(async (scale) => {
    const fixture = window.__handleRefresh

    const node = document.querySelector<HTMLElement>(
      '[data-testid="flow-node"][data-node-id="members"]'
    )

    if (fixture === undefined || node === null) {
      throw new Error('Missing public member node')
    }

    const snapshot = await fixture.snapshot()
    const internal = await fixture.internal('members')
    const nodeBounds = node.getBoundingClientRect()

    const rectangles = [
      ...node.querySelectorAll<HTMLElement>('[data-handle-id]'),
    ].map((element) => {
      const rectangle = element.getBoundingClientRect()

      return {
        id: element.dataset.handleId,
        width: rectangle.width / scale,
        height: rectangle.height / scale,
        x: (rectangle.left - nodeBounds.left) / scale,
        y: (rectangle.top - nodeBounds.top) / scale,
      }
    })

    await fixture.replace(snapshot.document)

    return {
      internal,
      rectangles,
      snapshot,
      callbackRetained: fixture.refreshIdentity(),
      nodeWidth: nodeBounds.width / scale,
      nodeHeight: nodeBounds.height / scale,
      hidden: await fixture.internal('hidden-members'),
      defaultHidden: await fixture.internal('hidden-default'),
      missing: await fixture.internal('missing'),
      invalidIds: await (async () => {
        const before = await fixture.snapshot()

        const rejected = await Promise.all(
          (['missing', 'null', 'empty'] as const).map((variant) =>
            fixture.rejectInvalidHandleId(variant)
          )
        )

        return { rejected, before, after: await fixture.snapshot() }
      })(),
    }
  }, zoom)

  const { internal } = observation

  if (internal === null) {
    throw new Error('Public internal node missing')
  }

  expect(Object.keys(internal).toSorted()).toEqual([
    'absolutePosition',
    'handles',
    'height',
    'measurementStatus',
    'node',
    'width',
  ])
  expect(internal.measurementStatus).toBe('measured')
  expect(internal.width).toBeCloseTo(observation.nodeWidth)
  expect(internal.height).toBeCloseTo(observation.nodeHeight)
  expect(internal.absolutePosition).toEqual({ x: 40, y: 60 })
  expect(observation.callbackRetained).toBe(true)
  expect(observation.missing).toBeNull()
  expect(observation.invalidIds.rejected).toEqual([true, true, true])
  expect(observation.invalidIds.after).toEqual(observation.invalidIds.before)
  expect(observation.hidden).toMatchObject({
    measurementStatus: 'hidden',
    width: 93,
    height: 47,
    handles: [],
  })
  expect(observation.defaultHidden).toMatchObject({
    measurementStatus: 'hidden',
    width: 150,
    height: 44,
    handles: [],
  })
  await expect(page.locator('[data-node-id="hidden-members"]')).toHaveCount(0)

  const accepted = observation.snapshot.document.nodes.find(
    ({ id }) => id === 'members'
  )

  expect(internal.node).toEqual(accepted)
  expect(new Set(internal.handles.map(({ handleId }) => handleId)).size).toBe(8)

  for (const kind of ['source', 'target'] as const) {
    const declarations = (internal.node.handles ?? []).filter(
      (declaration) => declaration.kind === kind
    )

    expect(declarations.map(({ side }) => side).toSorted()).toEqual([
      'bottom',
      'left',
      'right',
      'top',
    ])
    expect(declarations.map(({ id }) => id).toSorted()).toEqual(
      internal.handles
        .filter(({ handleId }) =>
          declarations.some(({ id }) => id === handleId)
        )
        .map(({ handleId }) => handleId)
        .toSorted()
    )

    for (const declaration of declarations) {
      const handle = internal.handles.find(
        ({ handleId }) => handleId === declaration.id
      )

      const rectangle = observation.rectangles.find(
        ({ id }) => id === declaration.id
      )

      if (handle === undefined || rectangle === undefined) {
        throw new Error(`Missing ${kind}/${declaration.side} member geometry`)
      }

      expect(Object.keys(handle).toSorted()).toEqual([
        'handleId',
        'height',
        'nodeId',
        'offset',
        'width',
      ])
      expect(handle.handleId).toBe(`${kind}-${declaration.side}`)
      expect(handle.nodeId).toBe('members')
      expect(handle.width).toBeCloseTo(rectangle.width)
      expect(handle.height).toBeCloseTo(rectangle.height)
      expect(handle.offset.x).toBeCloseTo(rectangle.x + rectangle.width / 2)
      expect(handle.offset.y).toBeCloseTo(rectangle.y + rectangle.height / 2)
      expect(handle.offset.x - handle.width / 2).toBeCloseTo(rectangle.x)
      expect(handle.offset.y - handle.height / 2).toBeCloseTo(rectangle.y)
    }
  }

  const removed = await page.evaluate(async () => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing member owner')
    }

    const snapshot = await fixture.snapshot()
    await fixture.replace({
      ...snapshot.document,
      nodes: snapshot.document.nodes.map((node) =>
        node.id === 'members' ? { ...node, handles: [] } : node
      ),
    })
    await fixture.refresh('members')

    return fixture.internal('members')
  })

  expect(removed?.handles).toEqual([])
  expect(removed?.measurementStatus).toBe('measured')

  const undeclared = await page.evaluate(async () => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing undeclared member owner')
    }

    const snapshot = await fixture.snapshot()
    await fixture.replace({
      ...snapshot.document,
      nodes: snapshot.document.nodes.map((node) => {
        if (node.id !== 'members') {
          return node
        }

        const { handles, ...withoutDeclarations } = node
        void handles

        return withoutDeclarations
      }),
    })
    await fixture.refresh('members')

    return fixture.internal('members')
  })

  expect(undeclared?.handles).toEqual([])
  expect(undeclared?.node.handles).toBeUndefined()

  // Vue ends the element generation on unmount; other owners retain the current
  // sample. Core hidden projection retains dimensions only for a current sample.
  const hiddenAfterMeasurement = await page.evaluate(async () => {
    const fixture = window.__handleRefresh

    if (fixture === undefined) {
      throw new Error('Missing hidden sample owner')
    }

    const node = document.querySelector<HTMLElement>(
      '[data-testid="flow-node"][data-node-id="members"]'
    )

    if (node === null) {
      throw new Error('Missing hidden sample DOM')
    }

    node.style.width = '199px'
    node.style.height = '77px'
    await fixture.refresh('members')
    const before = await fixture.internal('members')
    const snapshot = await fixture.snapshot()
    await fixture.replace({
      ...snapshot.document,
      nodes: snapshot.document.nodes.map((nodeRecord) =>
        nodeRecord.id === 'members'
          ? { ...nodeRecord, hidden: true }
          : nodeRecord
      ),
    })

    return { before, after: await fixture.internal('members') }
  })

  expect(hiddenAfterMeasurement.before).toMatchObject({
    width: 199,
    height: 77,
    measurementStatus: 'measured',
  })
  expect(hiddenAfterMeasurement.after).toMatchObject({
    measurementStatus: 'hidden',
    handles: [],
    width: host === 'vue' ? 160 : hiddenAfterMeasurement.before?.width,
    height: host === 'vue' ? 100 : hiddenAfterMeasurement.before?.height,
  })
}
