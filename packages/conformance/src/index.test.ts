import { readFileSync } from 'node:fs'

import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { FlowEditErrorSchema } from '../../core/src/domain/flow-edit-error.ts'
import { prepareFlowEdit } from '../../core/src/domain/flow-edit.ts'
import {
  FlowDocumentSchema,
  decodeFlowDocument,
} from '../../core/src/domain/flow.schema.ts'
import {
  PublicStateContractFixtureSchema,
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
  conformanceFixtures,
  validateConformanceFixtures,
  validatePublicStateContractFixtures,
  validatePublicEditContractFixtures,
} from './index.ts'

const XYSchema = S.Struct({ x: S.Number, y: S.Number })

const ResizeCaptureSchema = S.Struct({
  normalized: S.Struct({
    parent: S.Struct({
      position: XYSchema,
      size: S.Struct({ width: S.Number, height: S.Number }),
    }),
    child: S.Struct({ worldPosition: XYSchema, localPosition: XYSchema }),
  }),
})

describe('shared conformance fixtures', () => {
  it('loads fixed public-edit outcomes and prepares their complete candidates', () => {
    const file = S.decodeUnknownSync(
      S.Struct({
        version: S.Literal(1),
        fixtures: S.Array(PublicEditContractFixtureSchema),
        queuedDisposal: PublicEditQueuedDisposalSchema,
      })
    )(
      JSON.parse(
        readFileSync('research/fixtures/public-edit-contract.json', 'utf-8')
      )
    )

    expect(() =>
      validatePublicEditContractFixtures(file.fixtures)
    ).not.toThrow()
    expect(file.queuedDisposal.expected).toStrictEqual({
      triggerOutcome: 'accepted',
      queuedOutcome: 'disposed',
      lateNotifications: 0,
    })
    expect(file.fixtures.map(({ id }) => id)).toStrictEqual([
      'data-merge-and-replacement',
      'cascade-delete',
      'protected-edge-conflict',
      'protected-descendant-conflict',
      'invalid-final-endpoint-rollback',
    ])

    for (const fixture of file.fixtures) {
      const document = Effect.runSync(decodeFlowDocument(fixture.document))

      const actual = (() => {
        try {
          const result = Effect.runSync(
            prepareFlowEdit(document, fixture.transaction)
          )

          return {
            document: S.encodeSync(FlowDocumentSchema)(result.document),
            deletedNodeIds: result.deletion.deletedNodeIds,
            deletedEdgeIds: result.deletion.deletedEdgeIds,
          }
        } catch (error) {
          return {
            document: fixture.document,
            deletedNodeIds: [],
            deletedEdgeIds: [],
            error: S.encodeSync(FlowEditErrorSchema)(
              S.decodeUnknownSync(FlowEditErrorSchema)(error)
            ),
          }
        }
      })()

      const expected =
        fixture.expected.error === undefined
          ? fixture.expected
          : {
              ...fixture.expected,
              error: S.encodeSync(FlowEditErrorSchema)(fixture.expected.error),
            }

      expect(actual).toStrictEqual(expected)
    }
  })

  it('uses unique versioned fixture identifiers for the eight shared scenarios', () => {
    expect(conformanceFixtures.map(({ id }) => id)).toStrictEqual([
      'keyed-update',
      'nested-absolute-position',
      'nested-grandchild-parent-update',
      'hidden-ancestor',
      'controlled-acknowledgement',
      'connection-validity',
      'gesture-cancellation',
      'viewport-culling',
    ])
    expect(() => validateConformanceFixtures(conformanceFixtures)).not.toThrow()
    const firstFixture = conformanceFixtures.at(0)

    if (firstFixture === undefined) {
      throw new Error('Expected conformance fixtures')
    }

    expect(() =>
      validateConformanceFixtures([firstFixture, firstFixture])
    ).toThrow(/duplicate/u)
    expect(
      conformanceFixtures.every(({ version }) => version === 1)
    ).toBeTruthy()
  })

  it('loads four schema-checked public-state contract scenarios with complete expectations', () => {
    const file = S.decodeUnknownSync(
      S.Struct({
        version: S.Literal(1),
        fixtures: S.Array(PublicStateContractFixtureSchema),
      })
    )(
      JSON.parse(
        readFileSync('research/fixtures/public-state-contract.json', 'utf-8')
      )
    )

    expect(file.version).toBe(1)
    expect(file.fixtures.map(({ id }) => id)).toStrictEqual([
      'initial-hidden-missing-reads',
      'external-document-replacement',
      'controlled-proposal-acknowledgement',
      'uncontrolled-commit-and-viewport',
    ])
    expect(() =>
      validatePublicStateContractFixtures(file.fixtures)
    ).not.toThrow()
    expect(
      file.fixtures.every((fixture) =>
        fixture.steps.every(
          ({ expected }) =>
            expected.read.snapshot.document.nodes.length > 0 &&
            expected.rendered.nodeIds.length > 0 &&
            expected.acceptedStates !== undefined &&
            expected.semanticKinds !== undefined
        )
      )
    ).toBeTruthy()
  })

  it('rejects duplicate node ids through the core document boundary', () => {
    const fixture = conformanceFixtures.at(0)

    if (fixture === undefined) {
      throw new Error('Expected the duplicate-id fixture')
    }

    const result = Effect.runSync(
      Effect.exit(
        decodeFlowDocument({
          ...fixture.document,
          nodes: [
            { id: 'duplicate', label: 'First', position: { x: 0, y: 0 } },
            { id: 'duplicate', label: 'Second', position: { x: 10, y: 10 } },
          ],
        })
      )
    )

    expect(result._tag).toBe('Failure')
  })

  it('reloads pinned reference captures and validates normalized outcomes', () => {
    const captures = S.decodeUnknownSync(
      S.Struct({
        fixtureVersion: S.Number,
        reference: S.Struct({ commit: S.String }),
        captures: S.Array(
          S.Struct({
            id: S.String,
            input: S.optional(
              S.Struct({
                viewport: S.optional(
                  S.Struct({ width: S.Number, height: S.Number })
                ),
              })
            ),
            observed: S.Record(S.String, S.Unknown),
          })
        ),
      })
    )(
      JSON.parse(
        readFileSync('research/fixtures/reference-captures.json', 'utf-8')
      )
    )

    expect({
      fixtureVersion: captures.fixtureVersion,
      referenceCommit: captures.reference.commit,
      captureCount: captures.captures.length,
    }).toStrictEqual({
      fixtureVersion: 1,
      referenceCommit: '0a1f9575b25679f2880175de8d3eae21aedde921',
      captureCount: 3,
    })

    const locked = captures.captures.find(
      ({ id }) => id === 'xyflow-draggable-false'
    )

    const customHandle = captures.captures.find(
      ({ id }) => id === 'xyflow-custom-drag-handle'
    )

    expect([
      locked?.observed.before === locked?.observed.after,
      locked?.observed.transformChanged,
      customHandle?.observed.initial ===
        customHandle?.observed.afterOutsideHandle,
      customHandle?.observed.outsideHandleTransformChanged,
      customHandle?.observed.initial !== customHandle?.observed.afterHandle,
      customHandle?.observed.handleTransformChanged,
    ]).toStrictEqual([true, false, true, false, true, true])

    const leftResize = captures.captures.find(
      ({ id }) => id === 'xyflow-left-resize-direct-child'
    )

    const leftResizeCaptures = S.decodeUnknownSync(
      S.Array(ResizeCaptureSchema)
    )(leftResize?.observed.captures ?? [])

    const normalized = leftResizeCaptures.map(
      ({ normalized: result }) => result
    )

    expect({
      viewport: leftResize?.input?.viewport,
      captureCount: leftResizeCaptures.length,
      capturesAgree: normalized[0],
    }).toStrictEqual({
      viewport: { width: 960, height: 640 },
      captureCount: 2,
      capturesAgree: normalized[1],
    })
    expect(normalized[0]).toStrictEqual({
      parent: { position: { x: 100, y: 100 }, size: { width: 70, height: 60 } },
      child: {
        worldPosition: { x: 95, y: 115 },
        localPosition: { x: -5, y: 15 },
      },
    })
  })
})
