import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  decodeSavedFlowDocument,
  encodeSavedFlowDocument,
  SavedFlowDocumentSchema,
} from './flow-persistence.ts'
import { decodeFlowDocument } from './flow.schema.ts'

describe('saved flow documents', () => {
  it('round trips declared nested graph fields while excluding selection', () => {
    const document = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'root',
            label: 'Root',
            position: { x: 20, y: 30 },
            type: 'group',
            data: { title: 'Root' },
            size: { width: 300, height: 200 },
            zIndex: 4,
            selected: true,
            draggable: false,
            ariaDescription: 'Fixed group',
          },
          {
            id: 'child',
            label: 'Child',
            parentId: 'root',
            position: { x: 12, y: 18 },
            extent: 'parent',
            type: 'card',
            data: { values: [1, true, null] },
            size: { width: 80, height: 40 },
            zIndex: 2,
            selected: true,
          },
        ],
        edges: [
          {
            id: 'edge',
            source: 'child',
            target: 'root',
            type: 'custom',
            path: 'bezier',
            selected: true,
          },
        ],
      })
    )

    const saved = encodeSavedFlowDocument(document)

    expect([
      saved.version,
      saved.document.nodes[1],
      'selected' in saved.document.nodes[1],
      saved.document.nodes[0],
      'selected' in saved.document.edges[0],
    ]).toStrictEqual([
      1,
      expect.objectContaining({
        parentId: 'root',
        position: { x: 12, y: 18 },
        type: 'card',
        size: { width: 80, height: 40 },
        zIndex: 2,
      }),
      false,
      expect.objectContaining({
        draggable: false,
        ariaDescription: 'Fixed group',
      }),
      false,
    ])

    const loaded = Effect.runSync(decodeSavedFlowDocument(saved))
    expect([
      loaded.nodes[1],
      loaded.nodes[0],
      loaded.nodes.every((node) => node.selected !== true),
      loaded.edges.every((edge) => edge.selected !== true),
    ]).toStrictEqual([
      expect.objectContaining({
        parentId: 'root',
        position: { x: 12, y: 18 },
        size: { width: 80, height: 40 },
        data: { values: [1, true, null] },
      }),
      expect.objectContaining({
        draggable: false,
        ariaDescription: 'Fixed group',
      }),
      true,
      true,
    ])
  })

  it('rejects unknown versions and invalid parent graphs', () => {
    const invalidVersion = Effect.runSync(
      Effect.exit(
        decodeSavedFlowDocument({
          version: 2,
          document: { nodes: [], edges: [] },
        })
      )
    )

    expect(invalidVersion._tag).toBe('Failure')

    const invalidGraph = Effect.runSync(
      Effect.exit(
        decodeSavedFlowDocument({
          version: 1,
          document: {
            nodes: [
              {
                id: 'child',
                label: 'Child',
                parentId: 'missing',
                position: { x: 0, y: 0 },
              },
            ],
            edges: [],
          },
        })
      )
    )

    expect(invalidGraph._tag).toBe('Failure')
  })

  it('rejects domain-invalid fields through both saved schema and full decode', () => {
    const invalidDocuments = [
      {
        version: 1,
        document: {
          nodes: [{ id: 'node', label: 'Node', position: { x: 0, y: 0 } }],
          edges: [
            { id: 'edge', source: 'node', target: 'node', stroke: 'red' },
          ],
        },
      },
      {
        version: 1,
        document: {
          nodes: [
            {
              id: 'node',
              label: 'Node',
              position: { x: 0, y: 0 },
              size: { width: 0, height: 20 },
            },
          ],
          edges: [],
        },
      },
    ]

    for (const input of invalidDocuments) {
      expect(() => S.decodeUnknownSync(SavedFlowDocumentSchema)(input)).toThrow(
        /Expected/u
      )
      expect(
        Effect.runSync(Effect.exit(decodeSavedFlowDocument(input)))._tag
      ).toBe('Failure')
    }
  })

  it('encodes only node and edge document fields', () => {
    const input = {
      nodes: [
        { id: 'node', label: 'Node', position: { x: 1, y: 2 }, selected: true },
      ],
      edges: [],
      viewport: { x: 10, y: 20, zoom: 2 },
      measurements: [{ nodeId: 'node', width: 100, height: 50 }],
    }

    expect(encodeSavedFlowDocument(input)).toStrictEqual({
      version: 1,
      document: {
        nodes: [{ id: 'node', label: 'Node', position: { x: 1, y: 2 } }],
        edges: [],
      },
    })
  })
})
