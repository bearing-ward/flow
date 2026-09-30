import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  EdgeChangeSchema,
  NodeChangeSchema,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getEdgeCenter,
  isEdge,
  isNode,
  reconnectEdge,
} from './flow-change-compatibility.ts'
import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument } from './flow.schema.ts'

const nodeId = (value: string) => S.decodeUnknownSync(NodeIdSchema)(value)

const edgeId = (value: string) => S.decodeUnknownSync(EdgeIdSchema)(value)

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 40 },
      },
      { id: 'b', label: 'B', position: { x: 100, y: 100 } },
    ],
    edges: [{ id: 'e1', source: 'a', target: 'b', label: 'kept' }],
  })
)

describe('reference-compatible change arrays', () => {
  it('applies sequential changes, removal precedence, replacement, and indexed additions immutably', () => {
    const [a, b] = document.nodes

    if (a === undefined || b === undefined) {
      throw new Error('Missing fixture nodes')
    }

    const changes = [
      { id: a.id, type: 'select' as const, selected: true },
      {
        id: a.id,
        type: 'position' as const,
        position: { x: 3, y: 4 },
        dragging: true,
      },
      { id: b.id, type: 'select' as const, selected: true },
      { id: b.id, type: 'remove' as const },
      { id: nodeId('absent'), type: 'remove' as const },
      {
        item: { ...a, id: nodeId('replacement') },
        type: 'add' as const,
        index: 0,
      },
    ]

    const before = structuredClone(document.nodes)
    const next = applyNodeChanges(changes, document.nodes)
    expect(next.map((node) => node.id)).toStrictEqual(['replacement', 'a'])
    expect(next[1]).toMatchObject({
      selected: true,
      position: { x: 3, y: 4 },
      dragging: true,
    })
    expect(document.nodes).toStrictEqual(before)
    expect(next[1]).not.toBe(a)
  })

  it('lets replace supersede earlier changes and stores measured dimensions outside persisted size', () => {
    const [a] = document.nodes

    if (a === undefined) {
      throw new Error('Missing fixture node')
    }

    const sized = applyNodeChanges(
      [
        {
          id: a.id,
          type: 'dimensions',
          dimensions: { width: 120, height: 60 },
          setAttributes: 'width',
          resizing: true,
        },
      ],
      [a]
    )

    expect(sized[0]).toMatchObject({
      measured: { width: 120, height: 60 },
      width: 120,
      resizing: true,
    })

    const changed = applyNodeChanges(
      [
        { id: a.id, type: 'select', selected: true },
        { id: a.id, item: { ...a, label: 'replacement' }, type: 'replace' },
      ],
      [a]
    )

    expect(changed[0]).toMatchObject({ label: 'replacement' })
    expect(changed[0]?.size).toStrictEqual({ width: 80, height: 40 })
    expect(a).not.toHaveProperty('measured')
  })

  it('ignores positionAbsolute metadata while applying only the caller node position', () => {
    const [a] = document.nodes

    if (a === undefined) {
      throw new Error('Missing fixture node')
    }

    const [updated] = applyNodeChanges(
      [
        {
          id: a.id,
          type: 'position',
          positionAbsolute: { x: 40, y: 50 },
          dragging: false,
        },
      ],
      [a]
    )

    expect(updated?.position).toStrictEqual(a.position)
    // SAFETY: The compatibility reducer preserves the upstream dragging metadata even though FlowNode omits it from persisted nodes.
    expect(
      (updated as (typeof a & { readonly dragging?: boolean }) | undefined)
        ?.dragging
    ).toBeFalsy()
  })

  it('applies ordered edge changes and keeps unknown IDs harmless', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing fixture edge')
    }

    const changed = applyEdgeChanges(
      [
        { id: edge.id, type: 'select', selected: true },
        {
          id: edge.id,
          type: 'replace',
          item: { ...edge, label: 'replacement' },
        },
        { id: edgeId('absent'), type: 'remove' },
        {
          item: { ...edge, id: edgeId('e2') },
          type: 'add',
          index: 0,
        },
      ],
      [edge]
    )

    expect(changed.map((item) => [item.id, item.label])).toStrictEqual([
      ['e2', 'kept'],
      ['e1', 'replacement'],
    ])
    expect(edge.selected).toBeUndefined()
  })

  it('decodes the public discriminated change variants', () => {
    expect(
      S.decodeUnknownSync(NodeChangeSchema)({
        id: 'a',
        type: 'dimensions',
        resizing: false,
      })
    ).toMatchObject({ type: 'dimensions' })
    expect(
      S.decodeUnknownSync(EdgeChangeSchema)({
        item: { id: 'e', source: 'a', target: 'b' },
        type: 'add',
      })
    ).toMatchObject({ type: 'add' })
  })
})

describe('edge collection utilities', () => {
  it('adds a copied edge, normalizes null handles for duplicate checks, and returns the same array on duplicates', () => {
    const edges = [
      { id: edgeId('e1'), source: nodeId('a'), target: nodeId('b') },
    ]

    const duplicate = addEdge(
      {
        source: nodeId('a'),
        target: nodeId('b'),
        sourceHandle: null,
        targetHandle: null,
      },
      edges
    )

    expect(duplicate).toBe(edges)

    const added = addEdge(
      { source: nodeId('b'), target: nodeId('a'), sourceHandle: null },
      edges
    )

    expect(added).toHaveLength(2)
    expect(added[1]).toMatchObject({ id: 'xy-edge__b-a' })
    expect(added[1]).not.toHaveProperty('sourceHandle')
    expect(edges).toHaveLength(1)
  })

  it('treats empty handle strings as equivalent to missing handles', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing fixture edge')
    }

    // SAFETY: Empty handles are intentionally malformed relative to the branded persisted schema to exercise partial utility semantics.
    const withEmptyHandles = {
      ...edge,
      sourceHandle: '',
      targetHandle: '',
    } as typeof edge

    expect(
      addEdge({ source: edge.source, target: edge.target }, [withEmptyHandles])
    ).toHaveLength(1)
  })

  it('supports replacement IDs and preserves old edge metadata on reconnect', () => {
    const [edge] = document.edges
    const edgesBefore = [...document.edges]

    if (edge === undefined) {
      throw new Error('Missing fixture edge')
    }

    const edges = reconnectEdge(
      edge,
      { source: nodeId('b'), target: nodeId('a'), sourceHandle: null },
      edgesBefore
    )

    expect(edges).toMatchObject([
      { id: 'xy-edge__b-a', source: 'b', target: 'a', label: 'kept' },
    ])
    expect([
      edges[0]?.sourceHandle,
      edges[0]?.targetHandle,
      Object.hasOwn(edges[0] ?? {}, 'targetHandle'),
    ]).toStrictEqual([null, undefined, true])

    const stable = reconnectEdge(
      edge,
      { source: nodeId('b'), target: nodeId('a') },
      edgesBefore,
      { shouldReplaceId: false }
    )

    expect(stable[0]?.id).toBe(edge.id)

    const emptyOptions = reconnectEdge(
      edge,
      { source: nodeId('b'), target: nodeId('a') },
      edgesBefore,
      {}
    )

    expect(emptyOptions[0]?.id).toBe(edge.id)
    expect(
      reconnectEdge(
        { ...edge, id: edgeId('missing') },
        { source: nodeId('b'), target: nodeId('a') },
        edgesBefore
      )
    ).toBe(edgesBefore)
  })

  it('reports a reconnect request for an absent edge through the optional error callback', () => {
    const [edge] = document.edges

    if (edge === undefined) {
      throw new Error('Missing fixture edge')
    }

    const errors: [string, string][] = []

    const notFound = reconnectEdge(
      edge,
      { source: nodeId('b'), target: nodeId('a') },
      [],
      { onError: (code, message) => errors.push([code, message]) }
    )

    expect(notFound).toStrictEqual([])
    expect(errors).toStrictEqual([
      ['007', `The old edge with id=${edge.id} does not exist.`],
    ])
  })

  it('provides structural type predicates and the edge-center geometry tuple', () => {
    expect(isNode(document.nodes[0])).toBeTruthy()
    expect(isNode(document.edges[0])).toBeFalsy()
    expect(isEdge(document.edges[0])).toBeTruthy()
    expect(isEdge({ id: 'e', source: 'a', target: 'b' })).toBeTruthy()
    expect(
      getEdgeCenter({ sourceX: 10, sourceY: 30, targetX: 0, targetY: 10 })
    ).toStrictEqual([5, 20, 5, 10])
  })

  it('uses a caller-provided ID generator for added connections', () => {
    const generated = addEdge(
      { source: nodeId('a'), target: nodeId('missing') },
      [],
      { getEdgeId: () => 'custom-edge-id' }
    )

    expect(generated[0]?.id).toBe('custom-edge-id')
  })
})
