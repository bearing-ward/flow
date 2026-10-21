import { createFlowSnapshot } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  DuplicateEdgeId,
  DuplicateHandleId,
  DuplicateNodeId,
  MissingEdgeEndpoint,
  MissingEdgeHandle,
  MissingParentNode,
  ParentCycle,
  ParentExtentWithoutParent,
  SelfParentNode,
  decodeFlowDocument,
  validateFlowDocument,
} from './flow.schema.ts'

interface CyclicNodeDataFixture {
  valid: boolean
  self?: unknown
}

describe('FlowDocumentSchema', () => {
  it('rejects missing parents, cycles, and duplicate IDs through the typed document boundary', () => {
    const invalidDocuments = [
      {
        nodes: [
          {
            id: 'child',
            label: 'Child',
            position: { x: 0, y: 0 },
            parentId: 'missing',
          },
        ],
        error: MissingParentNode,
      },
      {
        nodes: [
          {
            id: 'one',
            label: 'One',
            position: { x: 0, y: 0 },
            parentId: 'two',
          },
          {
            id: 'two',
            label: 'Two',
            position: { x: 0, y: 0 },
            parentId: 'one',
          },
        ],
        error: ParentCycle,
      },
      {
        nodes: [
          { id: 'same', label: 'First', position: { x: 0, y: 0 } },
          { id: 'same', label: 'Second', position: { x: 1, y: 1 } },
        ],
        error: DuplicateNodeId,
      },
    ]

    for (const invalid of invalidDocuments) {
      const error = Effect.runSync(
        Effect.flip(decodeFlowDocument({ edges: [], nodes: invalid.nodes }))
      )

      expect(error).toBeInstanceOf(invalid.error)
    }
  })

  it('decodes a document with one node', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [],
        nodes: [
          { id: 'node-1', position: { x: 120, y: 80 }, label: 'First node' },
        ],
      })
    )

    expect(document.nodes[0]?.label).toBe('First node')
  })

  it('rejects an empty node identifier', () => {
    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: '', position: { x: 120, y: 80 }, label: 'Invalid node' },
          ],
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })

  it('accepts a reordered nested graph with declared renderer fields', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [
          { id: 'edge', source: 'child', target: 'root', type: 'custom' },
        ],
        nodes: [
          {
            id: 'child',
            label: 'Child',
            position: { x: 5, y: 7 },
            parentId: 'root',
            extent: 'parent',
            size: { width: 80, height: 40 },
            type: 'card',
            data: { status: 'ready', values: [1, true, null] },
            zIndex: 2,
          },
          { id: 'root', label: 'Root', position: { x: 10, y: 20 } },
        ],
      })
    )

    expect(document.nodes[0]?.parentId).toBe('root')
    expect(document.nodes[0]?.position).toStrictEqual({ x: 5, y: 7 })
    expect(document.edges[0]?.type).toBe('custom')
  })

  it('accepts nonempty custom descriptions and per-node drag locking', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [],
        nodes: [
          {
            id: 'locked',
            label: 'Locked',
            position: { x: 0, y: 0 },
            draggable: false,
            ariaDescription: 'Cannot be moved',
          },
        ],
      })
    )

    expect(document.nodes[0]).toMatchObject({
      draggable: false,
      ariaDescription: 'Cannot be moved',
    })
  })

  it('rejects missing, self, and cyclic parents and root parent extents', () => {
    const invalidCases = [
      {
        nodes: [
          {
            id: 'child',
            label: 'Child',
            position: { x: 0, y: 0 },
            parentId: 'absent',
          },
        ],
        error: MissingParentNode,
      },
      {
        nodes: [
          {
            id: 'self',
            label: 'Self',
            position: { x: 0, y: 0 },
            parentId: 'self',
          },
        ],
        error: SelfParentNode,
      },
      {
        nodes: [
          {
            id: 'one',
            label: 'One',
            position: { x: 0, y: 0 },
            parentId: 'two',
          },
          {
            id: 'two',
            label: 'Two',
            position: { x: 0, y: 0 },
            parentId: 'three',
          },
          {
            id: 'three',
            label: 'Three',
            position: { x: 0, y: 0 },
            parentId: 'one',
          },
        ],
        error: ParentCycle,
      },
      {
        nodes: [
          {
            id: 'root',
            label: 'Root',
            position: { x: 0, y: 0 },
            extent: 'parent',
          },
        ],
        error: ParentExtentWithoutParent,
      },
    ]

    for (const invalid of invalidCases) {
      const error = Effect.runSync(
        Effect.flip(decodeFlowDocument({ edges: [], nodes: invalid.nodes }))
      )

      expect(error).toBeInstanceOf(invalid.error)
    }
  })

  it('rejects non-JSON node data', () => {
    const data: CyclicNodeDataFixture = { valid: true }
    data.self = data

    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: 'node', label: 'Node', position: { x: 0, y: 0 }, data },
          ],
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })

  it('rejects duplicate node identifiers', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [],
          nodes: [
            { id: 'node-1', position: { x: 0, y: 0 }, label: 'First' },
            { id: 'node-1', position: { x: 10, y: 10 }, label: 'Duplicate' },
          ],
        })
      )
    )

    if (!(error instanceof DuplicateNodeId)) {
      throw new TypeError('Expected DuplicateNodeId')
    }

    expect(error.nodeId).toBe('node-1')
  })

  it('rejects ambiguous handle declarations on one node', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [],
          nodes: [
            {
              id: 'node-1',
              label: 'One',
              position: { x: 0, y: 0 },
              handles: [
                { id: 'port', kind: 'source', side: 'right' },
                { id: 'port', kind: 'target', side: 'left' },
              ],
            },
          ],
        })
      )
    )

    expect(error).toBeInstanceOf(DuplicateHandleId)
  })

  it('rejects an edge referencing a missing handle', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [
            {
              id: 'edge-1',
              source: 'first',
              sourceHandle: 'missing',
              target: 'second',
              targetHandle: 'in',
            },
          ],
          nodes: [
            {
              id: 'first',
              label: 'First',
              position: { x: 0, y: 0 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
            {
              id: 'second',
              label: 'Second',
              position: { x: 100, y: 0 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
        })
      )
    )

    expect(error).toBeInstanceOf(MissingEdgeHandle)
  })

  it('rejects duplicate edge identifiers', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [
            { id: 'edge-1', source: 'source', target: 'target' },
            { id: 'edge-1', source: 'target', target: 'source' },
          ],
          nodes: [
            { id: 'source', position: { x: 0, y: 0 }, label: 'Source' },
            { id: 'target', position: { x: 10, y: 10 }, label: 'Target' },
          ],
        })
      )
    )

    if (!(error instanceof DuplicateEdgeId)) {
      throw new TypeError('Expected DuplicateEdgeId')
    }

    expect(error.edgeId).toBe('edge-1')
  })

  it('rejects an edge with a missing source node', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [{ id: 'edge-1', source: 'missing', target: 'target' }],
          nodes: [
            { id: 'target', position: { x: 10, y: 10 }, label: 'Target' },
          ],
        })
      )
    )

    if (!(error instanceof MissingEdgeEndpoint)) {
      throw new TypeError('Expected MissingEdgeEndpoint')
    }

    expect(error.edgeId).toBe('edge-1')
    expect(error.endpoint).toBe('source')
    expect(error.nodeId).toBe('missing')
  })

  it('rejects an edge with a missing target node', () => {
    const error = Effect.runSync(
      Effect.flip(
        decodeFlowDocument({
          edges: [{ id: 'edge-1', source: 'source', target: 'missing' }],
          nodes: [{ id: 'source', position: { x: 0, y: 0 }, label: 'Source' }],
        })
      )
    )

    if (!(error instanceof MissingEdgeEndpoint)) {
      throw new TypeError('Expected MissingEdgeEndpoint')
    }

    expect(error.edgeId).toBe('edge-1')
    expect(error.endpoint).toBe('target')
    expect(error.nodeId).toBe('missing')
  })

  it('preserves the identity of a valid typed document', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }],
        nodes: [{ id: 'node-1', position: { x: 0, y: 0 }, label: 'Node' }],
      })
    )

    const validated = Effect.runSync(validateFlowDocument(document))

    expect(validated).toBe(document)
  })

  it('accepts JSON edge data and an explicit non-deletable node', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'source',
            label: 'Source',
            position: { x: 0, y: 0 },
            deletable: false,
          },
          { id: 'target', label: 'Target', position: { x: 1, y: 1 } },
        ],
        edges: [
          {
            id: 'edge',
            source: 'source',
            target: 'target',
            data: { nested: { tags: ['one', 2, null] } },
          },
        ],
      })
    )

    expect(document.nodes[0]?.deletable).toBeFalsy()
    expect(document.edges[0]?.data).toStrictEqual({
      nested: { tags: ['one', 2, null] },
    })
  })

  it('rejects non-JSON edge data', () => {
    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
          edges: [
            {
              id: 'edge',
              source: 'node',
              target: 'node',
              data: { invalid: Number.NaN },
            },
          ],
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })
})

describe('approved native metadata through full public decode and snapshot', () => {
  const node = { id: 'node', label: 'Node', position: { x: 0, y: 0 } }
  const edge = { id: 'edge', source: 'node', target: 'node' }
  const viewport = { x: 5, y: -7, zoom: 1.5 }

  const fields = [
    {
      owner: 'node',
      field: 'connectable',
      values: [undefined, false, true],
      invalid: [null, '', 0, {}],
    },
    ...['ariaRole', 'ariaLabel', 'ariaDescription'].map((field) => ({
      owner: 'node',
      field,
      values: [undefined, '', '   ', 'custom value'],
      invalid: [null, false, 0, {}],
    })),
    ...['ariaRole', 'ariaLabel'].map((field) => ({
      owner: 'edge',
      field,
      values: [undefined, '', '   ', 'custom value'],
      invalid: [null, false, 0, {}],
    })),
  ]

  it.each(fields)(
    'keeps missing $owner.$field missing without defaults',
    ({ owner, field }) => {
      const document = Effect.runSync(
        decodeFlowDocument({ nodes: [node], edges: [edge] })
      )

      const snapshot = createFlowSnapshot(document, viewport)

      const record =
        owner === 'node'
          ? snapshot.document.nodes[0]
          : snapshot.document.edges[0]

      expect(record).toBeDefined()
      expect(Object.hasOwn(record ?? {}, field)).toBeFalsy()
    }
  )

  it.each(
    fields.flatMap(({ owner, field, values }) =>
      values.map((value) => ({ owner, field, value }))
    )
  )(
    'retains exact $owner.$field=$value in full decode, detached snapshot and JSON',
    ({ owner, field, value }) => {
      const input = {
        nodes: [owner === 'node' ? { ...node, [field]: value } : node],
        edges: [owner === 'edge' ? { ...edge, [field]: value } : edge],
      }

      const document = Effect.runSync(decodeFlowDocument(input))
      const snapshot = createFlowSnapshot(document, viewport)
      const decoded = owner === 'node' ? document.nodes[0] : document.edges[0]

      const record =
        owner === 'node'
          ? snapshot.document.nodes[0]
          : snapshot.document.edges[0]

      expect({
        decodedPresent: Object.hasOwn(decoded ?? {}, field),
        snapshotPresent: Object.hasOwn(record ?? {}, field),
      }).toStrictEqual({ decodedPresent: true, snapshotPresent: true })
      expect(record).toMatchObject({ [field]: value })

      expect(record).not.toBe(decoded)
      expect({
        record: Object.isFrozen(record),
        document: Object.isFrozen(snapshot.document),
        viewport: Object.isFrozen(snapshot.viewport),
      }).toStrictEqual({ record: true, document: true, viewport: true })
      const json = JSON.stringify(document)
      const jsonDocument = Effect.runSync(decodeFlowDocument(JSON.parse(json)))

      const jsonRecord =
        owner === 'node' ? jsonDocument.nodes[0] : jsonDocument.edges[0]

      const originalRecord = owner === 'node' ? node : edge

      const expectedJsonRecord =
        value === undefined
          ? originalRecord
          : { ...originalRecord, [field]: value }

      expect({
        present: Object.hasOwn(jsonRecord ?? {}, field),
        record: jsonRecord,
      }).toStrictEqual({
        present: value !== undefined,
        record: expectedJsonRecord,
      })
    }
  )

  it.each(
    fields.flatMap(({ owner, field, invalid }) =>
      invalid.map((value) => ({ owner, field, value }))
    )
  )(
    'rejects invalid $owner.$field=$value at full decode',
    ({ owner, field, value }) => {
      const input = {
        nodes: [owner === 'node' ? { ...node, [field]: value } : node],
        edges: [owner === 'edge' ? { ...edge, [field]: value } : edge],
      }

      expect(Effect.runSync(Effect.exit(decodeFlowDocument(input)))._tag).toBe(
        'Failure'
      )
    }
  )

  it('keeps malformed graph validation and strips unapproved edge descriptions', () => {
    expect(
      Effect.runSync(
        Effect.flip(
          decodeFlowDocument({
            nodes: [{ ...node, connectable: false, ariaRole: '' }],
            edges: [{ ...edge, target: 'missing' }],
          })
        )
      )
    ).toBeInstanceOf(MissingEdgeEndpoint)

    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [node],
        edges: [{ ...edge, ariaDescription: 'unapproved' }],
      })
    )

    expect(
      Object.hasOwn(document.edges[0] ?? {}, 'ariaDescription')
    ).toBeFalsy()
  })
})
