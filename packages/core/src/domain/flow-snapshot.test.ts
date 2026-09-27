import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { ViewportSchema } from './flow-runtime.schema.ts'
import {
  createFlowSnapshot,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
} from './flow-snapshot.ts'
import { decodeFlowDocument } from './flow.schema.ts'

describe('Flow snapshots', () => {
  it('preserves decoded document and viewport values in a detached deeply frozen projection', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: 'Parent',
            position: { x: 10, y: 20 },
            hidden: true,
            data: { nested: { values: [1, 2] } },
          },
          {
            id: 'child',
            label: 'Child',
            position: { x: 3, y: 4 },
            parentId: 'parent',
          },
        ],
        edges: [
          {
            id: 'edge',
            source: 'parent',
            target: 'child',
            hidden: true,
          },
        ],
      })
    )

    const viewport = S.decodeUnknownSync(ViewportSchema)({
      x: 5,
      y: 6,
      zoom: 1.5,
    })

    const snapshot = createFlowSnapshot(document, viewport)

    expect({
      schemaValid: S.is(FlowSnapshotSchema)(snapshot),
      nodeIds: snapshot.document.nodes.map((node) => node.id),
      childPosition: snapshot.document.nodes[1]?.position,
      hiddenNode: snapshot.document.nodes[0]?.hidden,
      hiddenEdge: snapshot.document.edges[0]?.hidden,
      viewport: snapshot.viewport,
    }).toStrictEqual({
      schemaValid: true,
      nodeIds: ['parent', 'child'],
      childPosition: { x: 3, y: 4 },
      hiddenNode: true,
      hiddenEdge: true,
      viewport,
    })

    expect([
      !Object.is(snapshot, document),
      !Object.is(snapshot.document, document),
      !Object.is(snapshot.document.nodes[0]?.data, document.nodes[0]?.data),
    ]).toStrictEqual([true, true, true])

    expect([
      Object.isFrozen(snapshot),
      Object.isFrozen(snapshot.document),
      Object.isFrozen(snapshot.document.nodes),
      Object.isFrozen(snapshot.document.nodes[0]?.data),
      Object.isFrozen(snapshot.document.nodes[0]?.data?.nested),
    ]).toStrictEqual([true, true, true, true, true])

    const nestedSchema = S.Struct({ values: S.Array(S.Number) })
    const nested = snapshot.document.nodes[0]?.data?.nested

    if (!S.is(nestedSchema)(nested)) {
      throw new Error('Snapshot fixture is missing nested data')
    }

    expect(Reflect.set(nested, 'changed', true)).toBeFalsy()
    expect(document.nodes[0]?.data?.nested).toStrictEqual({ values: [1, 2] })
  })

  it('detaches and freezes edge JSON data in accepted snapshots', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
        edges: [
          {
            id: 'edge',
            source: 'node',
            target: 'node',
            data: { nested: { labels: ['kept'] } },
          },
        ],
      })
    )

    const snapshot = createFlowSnapshot(
      document,
      S.decodeUnknownSync(ViewportSchema)({ x: 0, y: 0, zoom: 1 })
    )

    const edgeData = snapshot.document.edges[0]?.data

    expect({
      cloned: edgeData !== document.edges[0]?.data,
      frozen: Object.isFrozen(edgeData) && Object.isFrozen(edgeData?.nested),
      value: edgeData,
    }).toStrictEqual({
      cloned: true,
      frozen: true,
      value: { nested: { labels: ['kept'] } },
    })
    expect([
      Reflect.set(edgeData ?? {}, 'changed', true),
      document.edges[0]?.data,
    ]).toStrictEqual([false, { nested: { labels: ['kept'] } }])
  })

  it('validates accepted-state transition payloads from the snapshot schema', () => {
    const document = Effect.runSync(
      decodeFlowDocument({ nodes: [], edges: [] })
    )

    const viewport = S.decodeUnknownSync(ViewportSchema)({
      x: 0,
      y: 0,
      zoom: 1,
    })

    const snapshot = createFlowSnapshot(document, viewport)

    expect(
      S.is(FlowStateChangeSchema)({
        previous: snapshot,
        current: snapshot,
        cause: 'semantic-change',
      })
    ).toBeTruthy()
  })
})
