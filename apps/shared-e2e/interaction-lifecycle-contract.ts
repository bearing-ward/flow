import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

import {
  conformanceFixtures,
  InteractionLifecycleFixtureSchema,
} from '../../packages/conformance/src/index.ts'
import type {
  ConformanceAdapter,
  ConformanceFixture,
  InteractionLifecycleFixture,
} from '../../packages/conformance/src/index.ts'

export const interactionLifecycleFixture: InteractionLifecycleFixture =
  S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
    JSON.parse(
      readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
    )
  )

export const interactionConnectionCases =
  interactionLifecycleFixture.connectionCases

// Preserve the immutable historical rejection. Current native hosts consume
// the separately reviewed named target-target acceptance contract.
export const currentNativeConnectionCases: InteractionLifecycleFixture['connectionCases'] =
  interactionConnectionCases.map((scenario) => {
    if (scenario.id !== 'loose-rejects-target-to-target-rendering-gap') {
      return scenario
    }

    const { reason: _historicalReason, ...current } = scenario

    return {
      ...current,
      id: 'loose-accepts-directed-named-target-to-target',
      outcome: 'accepted',
      expectedEdgeId: 'edge-1',
      eventOrder: ['connectStart', 'connect', 'connectEnd'],
    }
  })

export const interactionReconnectionCases =
  interactionLifecycleFixture.reconnectionCases

export const interactionCancellationRetryCases =
  interactionLifecycleFixture.cancellationRetryCases

type LifecycleHost = 'vue' | 'foldkit'

interface LifecycleOptions {
  readonly host: LifecycleHost
  readonly createAdapter: (page: Page) => ConformanceAdapter
  readonly mount: (
    page: Page,
    adapter: ConformanceAdapter,
    fixture: ConformanceFixture,
    selectionMode: 'full' | 'partial',
    connectionMode: 'strict' | 'loose'
  ) => Promise<void>
  readonly prepareConnectionGeometry?: (page: Page) => Promise<void>
}

const connectHandles = async (
  page: Page,
  connection: (typeof interactionLifecycleFixture.connectionCases)[number]['connection']
): Promise<void> => {
  const source = await page
    .locator(
      `[data-node-id="${connection.source}"] [data-handle-id="${connection.sourceHandle}"]`
    )
    .boundingBox()

  const target = await page
    .locator(
      `[data-node-id="${connection.target}"] [data-handle-id="${connection.targetHandle}"]`
    )
    .boundingBox()

  if (source === null || target === null) {
    throw new Error('Missing native connection handles')
  }

  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 2, start.y)
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
    { steps: 3 }
  )
  await page.mouse.up()
}

export const interactionLifecycleContract = ({
  host,
  createAdapter,
  mount,
  prepareConnectionGeometry,
}: LifecycleOptions) => {
  const mountLifecycle = (
    page: Page,
    adapter: ConformanceAdapter,
    fixture: ConformanceFixture,
    selectionMode: 'full' | 'partial' = 'full',
    connectionMode: 'strict' | 'loose' = 'strict'
  ) =>
    mount(
      page,
      adapter,
      {
        ...fixture,
        allowedConnectionTargets: fixture.document.nodes.map((node) => node.id),
      },
      selectionMode,
      connectionMode
    )

  const base = conformanceFixtures.find(({ id }) => id === 'keyed-update')

  if (base === undefined) {
    throw new Error('Missing keyed-update fixture')
  }

  test.describe(`${host} shared interaction lifecycle`, () => {
    test('node drag/focus and edge select/focus flags preserve input ownership', async ({
      page,
    }) => {
      const adapter = createAdapter(page)

      const document = {
        ...interactionLifecycleFixture.reconnectDocument,
        nodes: interactionLifecycleFixture.reconnectDocument.nodes.map(
          (node) =>
            node.id === 'source'
              ? { ...node, draggable: false, focusable: false }
              : node
        ),
        edges: interactionLifecycleFixture.reconnectDocument.edges.map(
          (edge) =>
            edge.id === 'edge-existing'
              ? { ...edge, focusable: false, selectable: false }
              : edge
        ),
      }

      await mountLifecycle(page, adapter, {
        ...base,
        documentMode: 'uncontrolled',
        document,
      })
      const node = page.locator('[data-node-id="source"]')
      await expect(node).not.toHaveAttribute('tabindex')
      const box = await node.boundingBox()

      if (box === null) {
        throw new Error('Missing non-draggable source geometry')
      }

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width + 70, box.y + 20)
      await page.mouse.up()
      const afterDrag = await adapter.readState({ nodeId: 'source' })
      expect(afterDrag.node?.position).toEqual({ x: 20, y: 20 })

      const edge =
        host === 'vue'
          ? page.getByTestId('flow-edge-hit-target')
          : page.locator(
              '.flow-foldkit-edge[data-edge-id="edge-existing"] .flow-foldkit-edge-hit-target'
            )

      await expect(edge).toHaveAttribute('tabindex', '-1')
      await expect(edge).toHaveAttribute('role', 'img')
      await edge.click({ force: true })
      expect(await adapter.changeKinds()).not.toContain('edge-selection')
      await adapter.destroy()
    })
    test('full and partial rectangles publish the shared selection fixture', async ({
      page,
    }) => {
      const adapter = createAdapter(page)

      const document = {
        ...interactionLifecycleFixture.document,
        nodes: interactionLifecycleFixture.document.nodes.map((node) => ({
          ...node,
          selected: false,
          size: node.size ?? { width: 150, height: 44 },
        })),
      }

      // oxlint-disable no-await-in-loop
      for (const scenario of interactionLifecycleFixture.selectionCases) {
        await mountLifecycle(
          page,
          adapter,
          { ...base, documentMode: 'uncontrolled', document },
          scenario.mode
        )
        const box = await page.getByTestId('flow-canvas').boundingBox()

        if (box === null) {
          throw new Error('Missing selection canvas bounds')
        }

        const { rect } = scenario
        await page.keyboard.down('Shift')
        await page.mouse.move(box.x + rect.x + 2, box.y + rect.y + 2)
        await page.mouse.down()
        await page.mouse.move(
          box.x + rect.x + rect.width + 2,
          box.y + rect.y + rect.height + 2,
          { steps: 4 }
        )

        const preview =
          host === 'vue'
            ? page.getByTestId('flow-selection-rect')
            : page.locator('.flow-foldkit-selection-rect')

        await expect(preview).toBeVisible()
        await page.mouse.up()
        await page.keyboard.up('Shift')
        await expect
          .poll(() => adapter.changeKinds())
          .toContain('selection-set')

        const states = await Promise.all(
          document.nodes.map((node) => adapter.readState({ nodeId: node.id }))
        )

        expect(
          states.flatMap((state) =>
            state.node?.selected ? [state.node.id] : []
          )
        ).toEqual(scenario.nodeIds)
        expect(
          states.flatMap((state) =>
            state.snapshot.document.edges
              .filter((edge) => edge.selected)
              .map((edge) => edge.id)
          )
        ).toEqual([])
        await adapter.destroy()
      }
      // oxlint-enable no-await-in-loop
    })
    test('strict and loose pointer connections preserve normalized identities and reject duplicates', async ({
      page,
    }) => {
      const adapter = createAdapter(page)

      // oxlint-disable no-await-in-loop
      for (const scenario of currentNativeConnectionCases) {
        const document =
          scenario.document === 'duplicate'
            ? interactionLifecycleFixture.duplicateDocument
            : interactionLifecycleFixture.connectionDocument

        await mountLifecycle(
          page,
          adapter,
          { ...base, documentMode: 'uncontrolled', document },
          'full',
          scenario.mode
        )
        await prepareConnectionGeometry?.(page)
        await connectHandles(page, scenario.connection)
        await expect
          .poll(() => adapter.snapshot(), { message: scenario.id })
          .toMatchObject({
            edgeIds:
              scenario.outcome === 'accepted' ||
              scenario.document === 'duplicate'
                ? ['edge-1']
                : [],
          })

        if (
          scenario.outcome === 'accepted' &&
          scenario.normalized !== undefined
        ) {
          await expect
            .poll(() => adapter.readState({ edgeId: 'edge-1' }), {
              message: scenario.id,
            })
            .toMatchObject({
              edge: scenario.normalized,
            })
        }

        await adapter.destroy()
      }

      // oxlint-enable no-await-in-loop
      await mountLifecycle(
        page,
        adapter,
        {
          ...base,
          documentMode: 'uncontrolled',
          document: interactionLifecycleFixture.connectionDocument,
        },
        'full',
        'loose'
      )
      await prepareConnectionGeometry?.(page)
      await connectHandles(page, {
        source: 'source',
        sourceHandle: 'out',
        target: 'target-next',
        targetHandle: 'in-next',
      })
      await expect
        .poll(() => adapter.readState({ edgeId: 'edge-1' }))
        .toMatchObject({
          edge: {
            source: 'source',
            sourceHandle: 'out',
            target: 'target-next',
            targetHandle: 'in-next',
          },
        })
      await adapter.destroy()
    })
  })
}
