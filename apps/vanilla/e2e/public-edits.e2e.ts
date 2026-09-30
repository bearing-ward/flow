import { readFileSync } from 'node:fs'

import type * as CoreModule from '@flow/core'
import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

import {
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
} from '../../../packages/conformance/src/index.ts'
import type { ApiUtilityDeletionEvent } from '../../shared-e2e/api-utility-reference.ts'
import { apiUtilityDeletionReference } from '../../shared-e2e/api-utility-reference.ts'
import type * as HostModule from '../src/public.ts'

type FlowNodeDragStopPayload = Parameters<
  NonNullable<HostModule.FlowCreateOptions['onNodeDragStop']>
>[0]

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
    __reentrantDestroyHarness?: {
      controller: HostModule.JavaScriptFlowController | undefined
      nestedDestroy: Promise<void> | undefined
      dragStarted: boolean
      cancelledCallbackCount: number
      cancellationReason: string | undefined
      nestedCompletedBeforeCleanup: boolean
    }
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

test('Vanilla async deletion approves and narrows through the mounted controller', async ({
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
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 20, y: 0 } },
          { id: 'c', label: 'C', position: { x: 40, y: 0 } },
        ],
        edges: [{ id: 'ab', source: 'a', target: 'b' }],
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

    const approval = Promise.withResolvers<CoreModule.FlowDeleteDecision>()
    const order: string[] = []
    const seen = Promise.withResolvers<null>()
    const events: ApiUtilityDeletionEvent[] = []
    let beforeCompleted = false

    const deletion = controller.deleteElements(
      { nodeIds: ['b'], edgeIds: [] },
      {
        onBeforeDelete: async ({ nodes, edges }) => {
          events.push({
            type: 'before:start',
            nodes: nodes.map(({ id }) => id),
            edges: edges.map(({ id }) => id),
          })
          seen.resolve(null)
          const decision = await approval.promise
          beforeCompleted = true
          events.push({ type: 'before:resolved' })

          return decision
        },
        onEdgesDelete: (edges) => {
          order.push('edges')
          events.push({
            type: 'edges',
            beforeCompleted,
            ids: edges.map(({ id }) => id),
          })
        },
        onNodesDelete: (nodes) => {
          order.push('nodes')
          events.push({
            type: 'nodes',
            beforeCompleted,
            ids: nodes.map(({ id }) => id),
          })
        },
        onDelete: ({ nodes, edges }) => {
          order.push('combined')
          events.push({
            type: 'delete',
            beforeCompleted,
            nodes: nodes.map(({ id }) => id),
            edges: edges.map(({ id }) => id),
          })
        },
      }
    )

    await seen.promise

    const beforeApproval = controller
      .getNodes()
      .map((node: { readonly id: string }) => node.id)

    const node = controller.getNode('b')
    const [edge] = controller.getEdges()

    if (node === undefined || edge === undefined) {
      throw new Error('Expected deletion candidates')
    }

    approval.resolve({ nodes: [node], edges: [edge] })
    const deletionResult = await deletion

    return {
      requested: { nodes: ['b'], edges: [] },
      beforeApproval,
      result: deletionResult,
      after: controller.getNodes().map((item: { id: string }) => item.id),
      order,
      events,
    }
  })

  expect(result).toMatchObject({
    beforeApproval: ['a', 'b', 'c'],
    result: { deletedNodeIds: ['b'], deletedEdgeIds: ['ab'] },
    after: ['a', 'c'],
    order: ['edges', 'nodes', 'combined'],
  })
  expect({
    requested: result.requested,
    events: result.events,
    result: {
      nodes: result.result.deletedNodeIds,
      edges: result.result.deletedEdgeIds,
    },
  }).toEqual(apiUtilityDeletionReference)
})

test('Vanilla controlled deletion stays proposed until owner acknowledgement', async ({
  page,
}) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const initial = {
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }

    const controller: HostModule.JavaScriptFlowController = await createFlow(
      root,
      initial,
      {
        documentMode: 'controlled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const callbacks: string[] = []
    const proposals: string[] = []
    const accepted: string[] = []
    controller.subscribe(({ kind }) => proposals.push(kind))
    controller.subscribeState(({ cause }) => accepted.push(cause))

    const proposal = await controller.deleteElements(
      { nodeIds: ['a'] },
      {
        onBeforeDelete: () => Promise.resolve(true),
        onEdgesDelete: () => callbacks.push('edges'),
        onNodesDelete: () => callbacks.push('nodes'),
        onDelete: () => callbacks.push('combined'),
      }
    )

    const beforeAcknowledgement = {
      nodes: controller.getNodes().map(({ id }) => id),
      edges: controller.getEdges().map(({ id }) => id),
      domNodes: [...document.querySelectorAll<HTMLElement>('[data-node-id]')]
        .map((node) => node.dataset.nodeId)
        .toSorted(),
    }

    controller.update({ nodes: initial.nodes.slice(1), edges: [] })

    const afterAcknowledgement = {
      nodes: controller.getNodes().map(({ id }) => id),
      edges: controller.getEdges().map(({ id }) => id),
      domNodes: [...document.querySelectorAll<HTMLElement>('[data-node-id]')]
        .map((node) => node.dataset.nodeId)
        .toSorted(),
    }

    controller.destroy()

    return {
      proposal,
      callbacks,
      proposals,
      accepted,
      beforeAcknowledgement,
      afterAcknowledgement,
    }
  })

  expect(outcome.proposal).toEqual({
    deletedNodeIds: ['a'],
    deletedEdgeIds: ['ab'],
  })
  expect(outcome.callbacks).toEqual(['edges', 'nodes', 'combined'])
  expect(outcome.proposals).toContain('edit-proposal')
  expect(outcome.beforeAcknowledgement).toEqual({
    nodes: ['a', 'b'],
    edges: ['ab'],
    domNodes: ['a', 'b'],
  })
  expect(outcome.afterAcknowledgement).toEqual({
    nodes: ['b'],
    edges: [],
    domNodes: ['b'],
  })
  expect(outcome.accepted).toContain('document-update')
})

test('Vanilla controlled delete proposal remains unaccepted without owner update', async ({
  page,
}) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const initial = {
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }

    const controller: HostModule.JavaScriptFlowController = await createFlow(
      root,
      initial,
      {
        documentMode: 'controlled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const proposals: string[] = []
    const acceptedNotifications: string[] = []
    controller.subscribe(({ kind }) => proposals.push(kind))
    controller.subscribeState(({ cause }) => acceptedNotifications.push(cause))

    const result = await controller.deleteElements(
      { nodeIds: ['a'] },
      { onBeforeDelete: () => Promise.resolve(true) }
    )

    const afterProposal = {
      nodes: controller.getNodes().map(({ id }) => id),
      edges: controller.getEdges().map(({ id }) => id),
      renderedNodes: [
        ...document.querySelectorAll<HTMLElement>('[data-node-id]'),
      ]
        .map((node) => node.dataset.nodeId)
        .toSorted(),
      renderedEdges: [
        ...document.querySelectorAll<SVGGElement>('.flow-edge-group'),
      ]
        .map((edge) => edge.dataset.edgeId)
        .toSorted(),
    }

    controller.destroy()

    return { result, proposals, acceptedNotifications, afterProposal }
  })

  expect(outcome.result).toEqual({
    deletedNodeIds: ['a'],
    deletedEdgeIds: ['ab'],
  })
  expect(outcome.proposals).toContain('edit-proposal')
  expect(outcome.acceptedNotifications).toEqual([])
  expect(outcome.afterProposal).toEqual({
    nodes: ['a', 'b'],
    edges: ['ab'],
    renderedNodes: ['a', 'b'],
    renderedEdges: [],
  })
})

test('Vanilla destroy settles pending approval once and ignores late approval', async ({
  page,
}) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller: HostModule.JavaScriptFlowController = await createFlow(
      root,
      { nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const approval = Promise.withResolvers<CoreModule.FlowDeleteDecision>()
    const requested = Promise.withResolvers<null>()
    let settlements = 0
    let callbacks = 0

    const deletion = controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          onBeforeDelete: () => {
            requested.resolve(null)

            return approval.promise
          },
          onDelete: () => {
            callbacks += 1
          },
        }
      )
      .then(
        (value) => {
          settlements += 1

          return { kind: 'resolved', value, message: undefined }
        },
        (error: Error) => {
          settlements += 1

          return { kind: 'rejected', name: error.name, message: error.message }
        }
      )

    await requested.promise
    controller.destroy()
    const result = await deletion
    approval.resolve(true)
    await Promise.resolve()

    return {
      result,
      settlements,
      callbacks,
      nodes: controller.getNodes().map(({ id }) => id),
    }
  })

  expect(outcome.result.kind).toBe('rejected')
  expect(outcome.result.message).toBe('FlowControllerDisposed')
  expect(outcome.settlements).toBe(1)
  expect(outcome.callbacks).toBe(0)
  expect(outcome.nodes).toEqual(['a'])
})

test('Vanilla empty deletion requests skip all callbacks', async ({ page }) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const controller: HostModule.JavaScriptFlowController = await createFlow(
      root,
      { nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }], edges: [] },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )

    const callbacks: string[] = []

    const result = await controller.deleteElements(
      { nodeIds: ['missing'], edgeIds: [] },
      {
        onBeforeDelete: () => {
          callbacks.push('before')

          return Promise.resolve(true)
        },
        onEdgesDelete: () => callbacks.push('edges'),
        onNodesDelete: () => callbacks.push('nodes'),
        onDelete: () => callbacks.push('combined'),
      }
    )

    const nodes = controller.getNodes().map(({ id }) => id)
    controller.destroy()

    return { result, callbacks, nodes }
  })

  expect(outcome).toEqual({
    result: { deletedNodeIds: [], deletedEdgeIds: [] },
    callbacks: [],
    nodes: ['a'],
  })
})

test('Vanilla deletion callback failure prevents proposal publication', async ({
  page,
}) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
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
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 20, y: 0 } },
        ],
        edges: [{ id: 'ab', source: 'a', target: 'b' }],
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

    const changes: string[] = []
    const stop = controller.subscribe(({ kind }) => changes.push(kind))
    let laterCallbacks = 0

    const result = await controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          onEdgesDelete: () => {
            throw new Error('consumer callback failed')
          },
          onNodesDelete: () => {
            laterCallbacks += 1
          },
          onDelete: () => {
            laterCallbacks += 1
          },
        }
      )
      .then(
        () => ({ kind: 'resolved' }),
        (error: Error) => ({ kind: 'rejected', message: error.message })
      )

    stop()

    const snapshot = {
      nodes: controller.getNodes().map(({ id }) => id),
      edges: controller.getEdges().map(({ id }) => id),
      domNodes: [...document.querySelectorAll<HTMLElement>('[data-node-id]')]
        .map((node) => node.dataset.nodeId)
        .toSorted(),
    }

    controller.destroy()

    return { result, changes, laterCallbacks, snapshot }
  })

  expect(outcome.result).toEqual({
    kind: 'rejected',
    message: 'consumer callback failed',
  })
  expect(outcome.changes).toEqual([])
  expect(outcome.laterCallbacks).toBe(0)
  expect(outcome.snapshot).toEqual({
    nodes: ['a', 'b'],
    edges: ['ab'],
    domNodes: ['a', 'b'],
  })
})

test('Vanilla rejects approval after an accepted document changes away and back', async ({
  page,
}) => {
  await page.goto('/')

  const outcome = await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { createFlow } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing flow root')
    }

    const initial = {
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
      ],
      edges: [],
    }

    const controller = await createFlow(root, initial, {
      documentMode: 'uncontrolled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    const approval = Promise.withResolvers<CoreModule.FlowDeleteDecision>()
    const requested = Promise.withResolvers<null>()

    const deletion = controller
      .deleteElements(
        { nodeIds: ['b'] },
        {
          onBeforeDelete: () => {
            requested.resolve(null)

            return approval.promise
          },
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    await requested.promise

    const [firstNode, secondNode] = initial.nodes

    if (firstNode === undefined || secondNode === undefined) {
      throw new Error('Expected initial nodes')
    }

    controller.update({
      ...initial,
      nodes: [{ ...firstNode, position: { x: 1, y: 0 } }, secondNode],
    })
    controller.update(initial)
    approval.resolve(true)

    const result = await deletion

    const retry = await controller
      .deleteElements(
        { nodeIds: ['b'] },
        { onBeforeDelete: () => Promise.resolve(true) }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    const nodes = controller
      .getNodes()
      .map((node: { readonly id: string }) => node.id)

    await controller.destroyAsync()

    return { result, retry, nodes }
  })

  expect(outcome.result).toContain('FlowDeleteRevisionConflict')
  expect(outcome.retry).toBe('deleted')
  expect(outcome.nodes).toEqual(['a'])
})

test('Vanilla reentrant destroyAsync awaits the shared host close', async ({
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

    const harness: NonNullable<Window['__reentrantDestroyHarness']> = {
      controller: undefined,
      nestedDestroy: undefined,
      dragStarted: false,
      cancelledCallbackCount: 0,
      cancellationReason: undefined,
      nestedCompletedBeforeCleanup: false,
    }

    window.__reentrantDestroyHarness = harness

    const controller = await createFlow(
      root,
      {
        nodes: [{ id: 'a', label: 'A', position: { x: 80, y: 80 } }],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
        onNodeDragStart: () => {
          harness.dragStarted = true
        },
        onNodeDragStop: ({ outcome, reason }: FlowNodeDragStopPayload) => {
          if (outcome !== 'cancelled') {
            return
          }

          harness.cancelledCallbackCount += 1
          harness.cancellationReason = reason
          const nestedDestroy = harness.controller?.destroyAsync()

          if (nestedDestroy === undefined) {
            throw new Error(
              'Controller was unavailable during drag cancellation'
            )
          }

          harness.nestedDestroy = nestedDestroy
          void nestedDestroy.then(() => {
            harness.nestedCompletedBeforeCleanup =
              root.querySelector('.flow-canvas') !== null
          })
        },
      }
    )

    harness.controller = controller
  })

  const node = page.locator('.flow-node[data-node-id="a"]')
  const bounds = await node.boundingBox()

  if (bounds === null) {
    throw new Error('Missing draggable node bounds')
  }

  await page.mouse.move(bounds.x + 20, bounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 80, bounds.y + 60, { steps: 3 })
  await expect
    .poll(() =>
      page.evaluate(() => window.__reentrantDestroyHarness?.dragStarted)
    )
    .toBe(true)

  const teardown = await page.evaluate(async () => {
    const harness = window.__reentrantDestroyHarness
    const controller = harness?.controller

    if (harness === undefined || controller === undefined) {
      throw new Error('Missing reentrant destroy test harness')
    }

    let outerSettlements = 0
    let nestedSettlements = 0
    const outerDestroy = controller.destroyAsync()
    const { nestedDestroy } = harness

    if (nestedDestroy === undefined) {
      throw new Error('Cancellation callback did not reenter destroyAsync')
    }

    const callersSharePromise = outerDestroy === nestedDestroy

    const outerCompletion = outerDestroy.then(() => {
      outerSettlements += 1
    })

    const nestedCompletion = nestedDestroy.then(() => {
      nestedSettlements += 1
    })

    await Promise.all([outerCompletion, nestedCompletion])

    return {
      callersSharePromise,
      outerSettlements,
      nestedSettlements,
      cancelledCallbackCount: harness.cancelledCallbackCount,
      cancellationReason: harness.cancellationReason,
      nestedCompletedBeforeCleanup: harness.nestedCompletedBeforeCleanup,
      retainedCanvas: document.querySelector('.flow-canvas') !== null,
      rootChildCount: document.querySelector('#app')?.childElementCount,
    }
  })

  expect(teardown).toEqual({
    callersSharePromise: true,
    outerSettlements: 1,
    nestedSettlements: 1,
    cancelledCallbackCount: 1,
    cancellationReason: 'host-destroyed',
    nestedCompletedBeforeCleanup: false,
    retainedCanvas: false,
    rootChildCount: 0,
  })
})

test('Vanilla cancellation settles async deletion once and ignores late approval', async ({
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
        nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
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

    const decision = Promise.withResolvers<CoreModule.FlowDeleteDecision>()
    const abort = new AbortController()
    const requested = Promise.withResolvers<null>()

    let callbacks = 0

    const deletion = controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          signal: abort.signal,

          onBeforeDelete: () => {
            requested.resolve(null)

            return decision.promise
          },
          onDelete: () => {
            callbacks += 1
          },
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    await requested.promise
    abort.abort()
    const outcome = await deletion
    decision.resolve(true)
    await Promise.resolve()

    return {
      outcome,
      callbacks,
      nodeIds: controller
        .getNodes()
        .map((node: { readonly id: string }) => node.id),
    }
  })

  expect(result.outcome).toContain('FlowDeleteCancelled')
  expect(result.callbacks).toBe(0)
  expect(result.nodeIds).toEqual(['a'])
})

test('Vanilla async deletion wraps hook rejection and emits no deletion callbacks', async ({
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
        nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 0 } }],
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

    let callbacks = 0

    const outcome = await controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          onBeforeDelete: () => {
            throw new Error('permission service failed')
          },
          onEdgesDelete: () => {
            callbacks += 1
          },
          onNodesDelete: () => {
            callbacks += 1
          },
          onDelete: () => {
            callbacks += 1
          },
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    return {
      outcome,
      callbacks,
      nodes: controller
        .getNodes()
        .map((node: { readonly id: string }) => node.id),
    }
  })

  expect(result.outcome).toContain('FlowDeleteApprovalFailed')
  expect(result.callbacks).toBe(0)
  expect(result.nodes).toEqual(['a'])
})

test('Vanilla denial and widened candidate leave the graph untouched', async ({
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
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 20, y: 0 } },
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

    const denied = await controller.deleteElements(
      { nodeIds: ['a'] },
      {
        onBeforeDelete: () => false,
      }
    )

    const widenedNode = controller.getNode('b')

    if (widenedNode === undefined) {
      throw new Error('Expected widening candidate node')
    }

    const widened = await controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          onBeforeDelete: () => ({
            nodes: [widenedNode],
            edges: [],
          }),
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    return {
      denied,
      widened,
      nodes: controller
        .getNodes()
        .map((node: { readonly id: string }) => node.id),
    }
  })

  expect(result.denied).toEqual({ deletedNodeIds: [], deletedEdgeIds: [] })
  expect(result.widened).toContain('FlowDeleteInvalidCandidate')
  expect(result.nodes).toEqual(['a', 'b'])
})

test('Vanilla awaited reentrant delete settles before outer stale revision check', async ({
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
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 20, y: 0 } },
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

    let inner: CoreModule.FlowDeleteResult | undefined
    const callbacks: string[] = []

    const outer = controller
      .deleteElements(
        { nodeIds: ['a'] },
        {
          onBeforeDelete: async () => {
            inner = await controller.deleteElements({ nodeIds: ['b'] })

            return true
          },
          onEdgesDelete: () => callbacks.push('edges'),
          onNodesDelete: () => callbacks.push('nodes'),
          onDelete: () => callbacks.push('combined'),
        }
      )
      .then(
        () => 'deleted',
        (error: Error) => error.name
      )

    const outerResult = await outer

    return {
      outerResult,
      inner,
      callbacks,
      nodes: controller
        .getNodes()
        .map((node: { readonly id: string }) => node.id),
    }
  })

  expect(result.outerResult).toContain('FlowDeleteRevisionConflict')
  expect(result.inner).toEqual({ deletedNodeIds: ['b'], deletedEdgeIds: [] })
  expect(result.callbacks).toEqual([])
  expect(result.nodes).toEqual(['a'])
})

test('Vanilla callback cancellation rejects publication and preserves deletion callbacks without a hook', async ({
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

    const initial = {
      nodes: [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 20, y: 0 } },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b' }],
    }

    const controller = await createFlow(root, initial, {
      documentMode: 'uncontrolled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    })

    const runCase = async (trigger: 'edges' | 'nodes' | 'combined') => {
      controller.update(initial)
      const abort = new AbortController()
      const callbacks: string[] = []

      const abortAt = (name: typeof trigger): void => {
        callbacks.push(name)

        if (trigger === name) {
          abort.abort()
        }
      }

      const outcome = await controller
        .deleteElements(
          { nodeIds: ['a'] },
          {
            signal: abort.signal,
            onEdgesDelete: () => abortAt('edges'),
            onNodesDelete: () => abortAt('nodes'),
            onDelete: () => abortAt('combined'),
          }
        )
        .then(() => 'deleted', String)

      return {
        trigger,
        outcome,
        callbacks,
        nodeIds: controller
          .getNodes()
          .map((node: { readonly id: string }) => node.id),
        edgeIds: controller
          .getEdges()
          .map((edge: { readonly id: string }) => edge.id),
      }
    }

    const cases = [
      await runCase('edges'),
      await runCase('nodes'),
      await runCase('combined'),
    ]

    controller.destroy()

    return cases
  })

  expect(result).toEqual([
    {
      trigger: 'edges',
      outcome: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges'],
      nodeIds: ['a', 'b'],
      edgeIds: ['ab'],
    },
    {
      trigger: 'nodes',
      outcome: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges', 'nodes'],
      nodeIds: ['a', 'b'],
      edgeIds: ['ab'],
    },
    {
      trigger: 'combined',
      outcome: expect.stringContaining('FlowDeleteCancelled'),
      callbacks: ['edges', 'nodes', 'combined'],
      nodeIds: ['a', 'b'],
      edgeIds: ['ab'],
    },
  ])
})

test('Vanilla callback-triggered delete runs after the outer publication without deadlock', async ({
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
          { id: 'a', label: 'A', position: { x: 0, y: 0 } },
          { id: 'b', label: 'B', position: { x: 20, y: 0 } },
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

    let inner: Promise<CoreModule.FlowDeleteResult> | undefined

    const outer = await controller.deleteElements(
      { nodeIds: ['a'] },
      {
        onDelete: () => {
          inner = controller.deleteElements({ nodeIds: ['b'] })
        },
      }
    )

    const innerResult = inner === undefined ? undefined : await inner

    const nodeIds = controller
      .getNodes()
      .map((node: { readonly id: string }) => node.id)

    controller.destroy()

    return { outer, innerResult, nodeIds }
  })

  expect(result).toEqual({
    outer: { deletedNodeIds: ['a'], deletedEdgeIds: [] },
    innerResult: { deletedNodeIds: ['b'], deletedEdgeIds: [] },
    nodeIds: [],
  })
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
