import type { FlowEdge, FlowEditResult } from '@flow/core'
import { FlowEdgeSchema } from '@flow/core'
import { expect, test } from '@playwright/test'
import { Schema } from 'effect'

const edge = (id: string, sourceHandle?: string): FlowEdge => {
  const base = {
    id,
    source: 'a',
    target: id === 'incoming' ? 'a' : 'b',
  }

  if (sourceHandle !== undefined && id === 'incoming') {
    return Schema.decodeUnknownSync(FlowEdgeSchema)({
      ...base,
      sourceHandle,
      targetHandle: 'in',
    })
  }

  if (sourceHandle !== undefined) {
    return Schema.decodeUnknownSync(FlowEdgeSchema)({ ...base, sourceHandle })
  }

  if (id === 'incoming') {
    return Schema.decodeUnknownSync(FlowEdgeSchema)({
      ...base,
      targetHandle: 'in',
    })
  }

  return Schema.decodeUnknownSync(FlowEdgeSchema)(base)
}

interface HandleConnectionsFixtureApi {
  readonly propose: (edges: readonly FlowEdge[]) => Promise<FlowEditResult>
  readonly accept: () => Promise<void>
  readonly reject: () => void
  readonly updateAccepted: (edges: readonly FlowEdge[]) => Promise<void>
  readonly events: () => readonly string[]
  readonly dispose: () => void
}

declare global {
  interface Window {
    __flowVueHandleConnections?: HandleConnectionsFixtureApi
  }
}

test('Vue handle connections filter accepted state, callbacks, and stop on disposal', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const fixturePath = ['', 'src', 'handle-connections-test.ts'].join('/')
    const { mountVueHandleConnectionsFixture } = await import(fixturePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing Vue test root')
    }

    mountVueHandleConnectionsFixture(root)
  })

  const edges = [
    edge('one', 'out'),
    edge('two', 'out-two'),
    edge('other', 'different'),
    edge('unhandled'),
    edge('incoming'),
  ]

  const result = await page.evaluate(async (acceptedEdges) => {
    const api = window.__flowVueHandleConnections

    if (api === undefined) {
      throw new Error('Missing handle connection fixture API')
    }

    const initial = api.events()
    await api.propose(acceptedEdges)
    const proposed = api.events()
    api.reject()
    const rejected = api.events()
    await api.propose(acceptedEdges)
    await api.accept()
    const accepted = api.events()
    const replacementEdges = acceptedEdges.slice(1, 3)
    await api.propose(replacementEdges)
    await api.accept()
    const changed = api.events()
    api.dispose()
    await api.updateAccepted(acceptedEdges.slice(0, 1))
    const afterDispose = api.events()

    return { initial, proposed, rejected, accepted, changed, afterDispose }
  }, edges)

  expect(result.initial).toStrictEqual([])
  expect(result.proposed).toStrictEqual([])
  expect(result.rejected).toStrictEqual([])
  expect(result.accepted.toSorted()).toStrictEqual([
    'context:connect:one',
    'explicit:connect:two',
  ])
  expect(result.changed.slice(result.accepted.length).toSorted()).toStrictEqual(
    ['context:disconnect:one']
  )
  expect(result.afterDispose).toStrictEqual(result.changed)
})
