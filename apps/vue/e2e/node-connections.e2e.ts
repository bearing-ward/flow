import type { FlowEdge, FlowEditResult } from '@flow/core'
import { expect, test } from '@playwright/test'

interface ConnectionFixtureApi {
  readonly propose: (edges: readonly FlowEdge[]) => Promise<FlowEditResult>
  readonly accept: () => Promise<void>
  readonly reject: () => void
  readonly failNextDisconnect: () => void
  readonly updateSecond: (edges: readonly FlowEdge[]) => Promise<void>
  readonly events: () => readonly string[]
  readonly errors: () => readonly string[]
  readonly dispose: () => void
}

declare global {
  interface Window {
    __flowVueNodeConnections?: ConnectionFixtureApi
  }
}

test('Vue node connection composable observes accepted deltas in node context', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const fixturePath = ['', 'src', 'node-connections-test.ts'].join('/')
    const { mountVueNodeConnectionsFixture } = await import(fixturePath)

    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing Vue test root')
    }

    mountVueNodeConnectionsFixture(root)
  })

  const events = await page.evaluate(async () => {
    const knownFixtureIds = new Set(['a', 'b', 'c', 'ab', 'ac'])

    const fixtureEdges = (
      edges: readonly { id: string; source: string; target: string }[]
    ): FlowEdge[] => {
      if (
        edges.some(
          ({ id, source, target }) =>
            !knownFixtureIds.has(id) ||
            !knownFixtureIds.has(source) ||
            !knownFixtureIds.has(target)
        )
      ) {
        throw new Error('Unexpected connection fixture ID')
      }

      // SAFETY: all known fixture IDs are non-empty and accepted by Flow schemas.
      return edges as FlowEdge[]
    }

    const api = window.__flowVueNodeConnections

    if (api === undefined) {
      throw new Error('Missing connection fixture API')
    }

    const initial = api.events()
    await api.propose(
      fixtureEdges([
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
      ])
    )
    const proposed = api.events()
    api.reject()
    const rejected = api.events()

    await api.propose(
      fixtureEdges([
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
      ])
    )
    await api.accept()
    const added = api.events()

    api.failNextDisconnect()
    await api.propose(
      fixtureEdges([
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'c', target: 'a' },
      ])
    )
    await api.accept()
    const reconnected = api.events()

    await api.propose(fixtureEdges([{ id: 'ab', source: 'a', target: 'b' }]))
    await api.accept()
    const removed = api.events()
    await api.updateSecond(
      fixtureEdges([
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
      ])
    )
    const afterSecondUpdate = api.events()
    api.dispose()

    return {
      initial,
      proposed,
      rejected,
      added,
      reconnected,
      removed,
      afterSecondUpdate,
      errors: api.errors(),
    }
  })

  expect(events.initial).toStrictEqual([])
  expect(events.proposed).toStrictEqual([])
  expect(events.rejected).toStrictEqual([])
  expect(events.added.toSorted()).toStrictEqual([
    'connect:first:a:ac',
    'connect:first:c:ac',
  ])
  expect(
    events.reconnected
      .slice(events.added.length)
      .filter((event) => event.startsWith('disconnect:'))
  ).toStrictEqual(['disconnect:first:a:ac', 'disconnect:first:c:ac'])
  expect(
    events.reconnected
      .slice(events.added.length)
      .filter((event) => event.startsWith('connect:'))
  ).toStrictEqual(['connect:first:a:ac', 'connect:first:c:ac'])

  const reconnectDisconnect = events.reconnected.findIndex((event) =>
    event.startsWith('disconnect:')
  )

  expect(events.reconnected[reconnectDisconnect + 1]).toBe('connect:first:a:ac')
  expect(events.errors).toContain('Vue observer disconnect failed')
  expect(
    events.removed
      .slice(events.reconnected.length)
      .filter((event) => event.startsWith('disconnect:'))
  ).toStrictEqual(['disconnect:first:a:ac', 'disconnect:first:c:ac'])
  expect(
    events.removed.filter((event) => event.includes(':second:'))
  ).toStrictEqual([])
  expect(
    events.afterSecondUpdate
      .slice(events.removed.length)
      .filter((event) => event.includes(':second:'))
  ).toStrictEqual(['connect:second:a:ac', 'connect:second:c:ac'])
})
