import { readFileSync } from 'node:fs'

import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

import {
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
} from '../../../packages/conformance/src/index.ts'
import type * as HostModule from '../src/public.ts'

const publicEditFixtures = Schema.decodeUnknownSync(
  Schema.Struct({
    version: Schema.Literal(1),
    fixtures: Schema.Array(PublicEditContractFixtureSchema),
    queuedDisposal: PublicEditQueuedDisposalSchema,
  })
)(
  JSON.parse(
    readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
  )
)

const graphEditReference = Schema.decodeUnknownSync(
  Schema.Struct({
    cases: Schema.Struct({
      setters: Schema.Struct({
        nodes: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            position: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
            parentId: Schema.optional(Schema.String),
            data: Schema.optional(Schema.JsonObject),
          })
        ),
        edges: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            source: Schema.String,
            target: Schema.String,
            data: Schema.optional(Schema.JsonObject),
          })
        ),
      }),
    }),
  })
)(
  JSON.parse(
    readFileSync('research/fixtures/graph-edit-reference.json', 'utf-8')
  )
)

declare global {
  interface Window {
    __publicEditController?: HostModule.JavaScriptFlowController
  }
}

test('JavaScript public edits commit atomically and expose deletion results', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    window.__publicEditController = await createFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 20, y: 20 },
            data: { count: 0 },
          },
          { id: 'b', label: 'B', position: { x: 250, y: 20 } },
          { id: 'c', label: 'C', position: { x: 480, y: 20 } },
        ],
        edges: [
          { id: 'ab', source: 'a', target: 'b', data: { color: 'blue' } },
          { id: 'bc', source: 'b', target: 'c' },
        ],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const result = await page.evaluate(async () => {
    const controller = window.__publicEditController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    const events: string[] = []

    const stableNode = document.querySelector<HTMLElement>('[data-node-id="c"]')

    if (stableNode === null) {
      throw new Error('Missing unaffected node before edit')
    }

    stableNode.dataset.identity = 'retained'
    controller.subscribe(({ kind }) => events.push(`change:${kind}`))
    controller.subscribeState(({ cause }) => events.push(`state:${cause}`))
    await controller.updateNodeData('a', { count: 1, label: 'first' })
    await controller.updateNodeData('a', { count: 2 })
    await controller.updateEdgeData('ab', { color: 'red' }, { replace: true })
    const edgeData = controller.getEdge('ab')?.data
    await controller.addNodes({
      id: 'd',
      label: 'D',
      position: { x: 700, y: 20 },
    })

    const deletion = await controller.deleteElements({
      nodeIds: ['b', 'b', 'missing'],
    })

    return {
      nodes: controller.getNodes().map(({ id }) => id),
      edges: controller.getEdges().map(({ id }) => id),
      nodeData: controller.getNode('a')?.data,
      edgeData,
      deletion,
      events,
      dom: document.querySelectorAll('[data-node-id]').length,
      unaffectedDomIdentity:
        document.querySelector('[data-node-id="c"]') === stableNode &&
        stableNode.dataset.identity === 'retained',
    }
  })

  expect(result).toMatchObject({
    nodes: ['a', 'c', 'd'],
    edges: [],
    nodeData: { count: 2, label: 'first' },
    edgeData: { color: 'red' },
    deletion: { deletedNodeIds: ['b'], deletedEdgeIds: ['ab', 'bc'] },
    dom: 3,
    unaffectedDomIdentity: true,
  })
  expect(result.events).toEqual(
    Array.from({ length: 5 }, () => [
      'change:edit-proposal',
      'state:semantic-change',
    ]).flat()
  )

  const rollback = await page.evaluate(async () => {
    const controller = window.__publicEditController

    if (controller === undefined) {
      throw new Error('Missing controller')
    }

    const before = JSON.stringify(controller.getSnapshot())
    const events: string[] = []
    const stop = controller.subscribe(({ kind }) => events.push(kind))
    const nodeCount = document.querySelectorAll('[data-node-id]').length

    try {
      await controller.setNodes([
        { id: 'duplicate', label: 'One', position: { x: 0, y: 0 } },
        { id: 'duplicate', label: 'Two', position: { x: 1, y: 1 } },
      ])

      stop()

      return { rolledBack: false, events }
    } catch {
      const rolledBack = JSON.stringify(controller.getSnapshot()) === before

      const unchangedDom =
        document.querySelectorAll('[data-node-id]').length === nodeCount

      stop()

      return { rolledBack, unchangedDom, events }
    }
  })

  expect(rollback).toEqual({ rolledBack: true, unchangedDom: true, events: [] })

  await page.evaluate(() => window.__publicEditController?.destroy())
})

test('JavaScript collection setters match the pinned valid setter subcase', async ({
  page,
}) => {
  await page.goto('/')

  const actual = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller: HostModule.JavaScriptFlowController = await createFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 0, y: 0 },
            data: { label: 'A', nested: { keep: 1 } },
          },
          {
            id: 'b',
            label: 'B',
            position: { x: 100, y: 0 },
            data: { label: 'B' },
          },
          {
            id: 'b-child',
            label: 'B child',
            parentId: 'b',
            position: { x: 0, y: 60 },
            data: { label: 'B child' },
          },
          {
            id: 'c',
            label: 'C',
            position: { x: 200, y: 0 },
            data: { label: 'C' },
          },
          {
            id: 'd',
            label: 'D',
            position: { x: 300, y: 0 },
            data: { label: 'D' },
          },
        ],
        edges: [
          {
            id: 'ab',
            source: 'a',
            target: 'b',
            data: { label: 'AB', nested: { keep: 1 } },
          },
          { id: 'bc', source: 'b', target: 'c' },
          { id: 'child-c', source: 'b-child', target: 'c' },
          { id: 'cd', source: 'c', target: 'd', data: { label: 'CD' } },
        ],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    await controller.setNodes(
      controller
        .getNodes()
        .map((node) =>
          node.id === 'c'
            ? { ...node, data: { ...node.data, label: 'C set' } }
            : node
        )
    )
    await controller.setEdges(
      controller
        .getEdges()
        .map((edge) =>
          edge.id === 'bc' ? { ...edge, data: { label: 'BC set' } } : edge
        )
    )

    const snapshot = controller.getSnapshot().document

    const normalized = {
      nodes: snapshot.nodes.map(({ id, parentId, position, data }) => {
        const node = { id, position }

        if (parentId !== undefined) {
          Object.assign(node, { parentId })
        }

        if (data !== undefined) {
          Object.assign(node, { data })
        }

        return node
      }),
      edges: snapshot.edges.map(({ id, source, target, data }) => {
        const edge = { id, source, target }

        if (data !== undefined) {
          Object.assign(edge, { data })
        }

        return edge
      }),
    }

    controller.destroy()

    return normalized
  })

  expect(actual).toStrictEqual(graphEditReference.cases.setters)
})

test('JavaScript updater callbacks run once against the queued accepted snapshot', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      {
        nodes: [
          {
            id: 'a',
            label: 'A',
            position: { x: 20, y: 20 },
            data: { count: 0 },
          },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    let calls = 0
    let mutationBlocked = false
    let queued: Promise<unknown> | undefined

    const stop = controller.subscribeState(
      (change: CoreModule.FlowStateChange) => {
        const { current } = change

        if (
          current.document.nodes[0]?.data?.count === 1 &&
          queued === undefined
        ) {
          queued = controller.updateNodeData(
            'a',
            (data: NonNullable<CoreModule.FlowNode['data']>) => {
              calls += 1

              try {
                mutationBlocked = !Reflect.set(data, 'count', 100)
              } catch {
                mutationBlocked = true
              }

              return { count: Number(data.count ?? 0) + 1 }
            }
          )
        }
      }
    )

    await controller.updateNodeData(
      'a',
      (data: NonNullable<CoreModule.FlowNode['data']>) => {
        calls += 1

        return { count: Number(data.count ?? 0) + 1 }
      }
    )
    await queued
    stop()
    const count = controller.getNode('a')?.data?.count
    controller.destroy()

    return { calls, count, mutationBlocked }
  })

  expect(result).toEqual({ calls: 2, count: 2, mutationBlocked: true })
})

test('JavaScript disposal settles shared queued work without late notifications', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async (scenario) => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller = await createFlow(
      root,
      {
        nodes: scenario.document.nodes,
        edges: scenario.document.edges,
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    let queued: Promise<unknown> | undefined
    const events: string[] = []

    const stop = controller.subscribeState(
      (change: CoreModule.FlowStateChange) => {
        const { current } = change

        if (current.document.nodes[0]?.data?.count === 1) {
          events.push('accepted:trigger')
          queued = controller.applyEdit(scenario.queued)
          controller.destroy()
        }
      }
    )

    await controller.applyEdit(scenario.trigger)
    let rejection = ''

    try {
      await queued
    } catch (error) {
      rejection = error instanceof Error ? error.message : String(error)
    }

    await Promise.resolve()
    stop()

    return { rejection, events }
  }, publicEditFixtures.queuedDisposal)

  expect(result).toEqual({
    rejection: 'FlowControllerDisposed',
    events: ['accepted:trigger'],
  })
  expect(publicEditFixtures.queuedDisposal.expected.queuedOutcome).toBe(
    'disposed'
  )
  expect(publicEditFixtures.queuedDisposal.expected.lateNotifications).toBe(0)
})

test('JavaScript production edits match the fixed public-edit fixture', async ({
  page,
}) => {
  const [fixture] = publicEditFixtures.fixtures

  if (fixture === undefined) {
    throw new Error('Missing public-edit contract fixture')
  }

  await page.goto('/')

  const result = await page.evaluate(
    async ({ document, transaction }) => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing Flow root')
      }

      const controller = await createFlow(root, document, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      const edit = await controller.applyEdit(transaction)
      const accepted = controller.getSnapshot().document
      controller.destroy()

      return { edit, accepted }
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result.edit.document).toStrictEqual(fixture.expected.document)
  expect(result.accepted).toStrictEqual(fixture.expected.document)
  expect(result.edit.deletion).toStrictEqual({
    deletedNodeIds: fixture.expected.deletedNodeIds,
    deletedEdgeIds: fixture.expected.deletedEdgeIds,
  })
})

test('JavaScript production cascade matches the fixed public-edit fixture', async ({
  page,
}) => {
  const fixture = publicEditFixtures.fixtures.find(
    ({ id }) => id === 'cascade-delete'
  )

  if (fixture === undefined) {
    throw new Error('Missing cascade public-edit fixture')
  }

  await page.goto('/')

  const result = await page.evaluate(
    async ({ document, transaction }) => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing Flow root')
      }

      const controller = await createFlow(root, document, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      const edit = await controller.applyEdit(transaction)
      const accepted = controller.getSnapshot().document
      controller.destroy()

      return { edit, accepted }
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result.edit.document).toStrictEqual(fixture.expected.document)
  expect(result.accepted).toStrictEqual(fixture.expected.document)
  expect(result.edit.deletion).toStrictEqual({
    deletedNodeIds: fixture.expected.deletedNodeIds,
    deletedEdgeIds: fixture.expected.deletedEdgeIds,
  })
})

test('JavaScript rejects the fixed protected-deletion fixture without mutation', async ({
  page,
}) => {
  const fixture = publicEditFixtures.fixtures.find(
    ({ id }) => id === 'protected-edge-conflict'
  )

  if (fixture === undefined) {
    throw new Error('Missing protected-deletion fixture')
  }

  await page.goto('/')

  const result = await page.evaluate(
    async ({ document, transaction }) => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing Flow root')
      }

      const controller = await createFlow(root, document, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      const before = controller.getSnapshot().document

      let failureName: string | undefined

      try {
        await controller.applyEdit(transaction)
      } catch (error) {
        if (error instanceof Error) {
          failureName = error.name
        }
      }

      const after = controller.getSnapshot().document
      controller.destroy()

      return { before, after, failureName }
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result.failureName).toBe(fixture.expected.error?._tag)
  expect(result.after).toStrictEqual(result.before)
  expect(result.after).toStrictEqual(fixture.expected.document)
})

test('JavaScript rejects the fixed protected-descendant fixture without mutation', async ({
  page,
}) => {
  const fixture = publicEditFixtures.fixtures.find(
    ({ id }) => id === 'protected-descendant-conflict'
  )

  if (fixture === undefined) {
    throw new Error('Missing protected-deletion fixture')
  }

  await page.goto('/')

  const result = await page.evaluate(
    async ({ document, transaction }) => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing Flow root')
      }

      const controller = await createFlow(root, document, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      const before = controller.getSnapshot().document

      let failureName: string | undefined

      try {
        await controller.applyEdit(transaction)
      } catch (error) {
        if (error instanceof Error) {
          failureName = error.name
        }
      }

      const after = controller.getSnapshot().document
      controller.destroy()

      return { before, after, failureName }
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result.failureName).toBe(fixture.expected.error?._tag)
  expect(result.after).toStrictEqual(result.before)
  expect(result.after).toStrictEqual(fixture.expected.document)
})

test('JavaScript rejects the fixed invalid-endpoint fixture without mutation', async ({
  page,
}) => {
  const fixture = publicEditFixtures.fixtures.find(
    ({ id }) => id === 'invalid-final-endpoint-rollback'
  )

  if (fixture === undefined) {
    throw new Error('Missing invalid-endpoint fixture')
  }

  await page.goto('/')

  const result = await page.evaluate(
    async ({ document, transaction }) => {
      const modulePath = '/src/public.ts'
      const { createFlow } = await import(modulePath)
      const root = globalThis.document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing Flow root')
      }

      const controller = await createFlow(root, document, {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      })

      const before = controller.getSnapshot().document
      let failureName: string | undefined

      try {
        await controller.applyEdit(transaction)
      } catch (error) {
        if (error instanceof Error) {
          failureName = error.name
        }
      }

      const after = controller.getSnapshot().document
      controller.destroy()

      return { before, after, failureName }
    },
    { document: fixture.document, transaction: fixture.transaction }
  )

  expect(result.failureName).toBe(fixture.expected.error?._tag)
  expect(result.after).toStrictEqual(result.before)
  expect(result.after).toStrictEqual(fixture.expected.document)
})
