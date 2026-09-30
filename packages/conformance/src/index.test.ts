import { readFileSync } from 'node:fs'

import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  findConnectionIssue,
  normalizeFlowConnection,
  nextConnectionEdge,
} from '../../core/src/domain/flow-connection.schema.ts'
import { FlowEditErrorSchema } from '../../core/src/domain/flow-edit-error.ts'
import { prepareFlowEdit } from '../../core/src/domain/flow-edit.ts'
import { createFlowGraph } from '../../core/src/domain/flow-graph.ts'
import { reconnectFlowEdge } from '../../core/src/domain/flow-reconnection.schema.ts'
import {
  applyEdgeReconnectChange,
  calculateNodeResize,
} from '../../core/src/domain/flow-runtime.schema.ts'
import { selectionInRect } from '../../core/src/domain/flow-visibility.schema.ts'
import {
  FlowDocumentSchema,
  decodeFlowDocument,
} from '../../core/src/domain/flow.schema.ts'
import {
  PublicStateContractFixtureSchema,
  PublicEditContractFixtureSchema,
  PublicEditQueuedDisposalSchema,
  RendererContractFixtureSchema,
  InteractionLifecycleFixtureSchema,
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
  it('runs shared selection and resize cases through core production contracts', () => {
    const fixture = S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
      JSON.parse(
        readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
      )
    )

    const document = Effect.runSync(decodeFlowDocument(fixture.document))
    const graph = createFlowGraph(document)

    const childStart = fixture.document.nodes.find(
      (node) => node.id === 'child'
    )

    if (childStart === undefined) {
      throw new Error('Missing nested resize child in fixture')
    }

    for (const selectionCase of fixture.selectionCases) {
      expect(
        selectionInRect(
          graph,
          selectionCase.rect,
          selectionCase.mode
        ).nodeIds.map(String)
      ).toStrictEqual(selectionCase.nodeIds)
    }

    for (const resizeCase of fixture.resizeCases) {
      const result = calculateNodeResize({
        direction: resizeCase.direction,
        positionStart: fixture.resizeStart.position,
        sizeStart: fixture.resizeStart.size,
        delta: resizeCase.delta,
        minimumSize: fixture.resizeStart.minimumSize,
      })

      expect(result).toMatchObject({
        position: resizeCase.position,
        size: resizeCase.size,
      })
      expect({
        x: childStart.position.x + result.childrenPositionDelta.x,
        y: childStart.position.y + result.childrenPositionDelta.y,
      }).toStrictEqual(resizeCase.childPosition)
    }

    expect(fixture.cancellationReasons).toContain('pointer-cancel')
    expect(fixture.proposalOrder).toStrictEqual([
      'preview',
      'proposal',
      'accepted-notification',
      'terminal-event',
    ])
  })

  it('runs accepted, rejected, and loose connections through core validation', () => {
    const fixture = S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
      JSON.parse(
        readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
      )
    )

    const connectionDocuments = {
      connection: Effect.runSync(
        decodeFlowDocument(fixture.connectionDocument)
      ),
      duplicate: Effect.runSync(decodeFlowDocument(fixture.duplicateDocument)),
    }

    const evaluated = fixture.connectionCases.map((scenario) => {
      const document = connectionDocuments[scenario.document]

      const normalized = normalizeFlowConnection(
        document,
        scenario.connection,
        scenario.mode
      )

      const reason = findConnectionIssue(
        document,
        scenario.connection,
        scenario.mode
      )

      return {
        id: scenario.id,
        normalized,
        outcome: reason === undefined ? 'accepted' : 'rejected',
        reason,
        edgeId:
          reason === undefined
            ? nextConnectionEdge(document, normalized).id
            : undefined,
        eventOrder:
          reason === undefined
            ? ['connectStart', 'connect', 'connectEnd']
            : ['connectStart', 'connectEnd'],
      }
    })

    expect(evaluated).toStrictEqual(
      fixture.connectionCases.map((scenario) => ({
        id: scenario.id,
        normalized: scenario.normalized ?? scenario.connection,
        outcome: scenario.outcome,
        reason: scenario.reason,
        edgeId: scenario.expectedEdgeId,
        eventOrder: scenario.eventOrder,
      }))
    )
  })

  it('runs edge reconnection outcomes through the core reconnection helper', () => {
    const fixture = S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
      JSON.parse(
        readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
      )
    )

    const document = Effect.runSync(
      decodeFlowDocument(fixture.reconnectDocument)
    )

    const decodedReconnectDocument = S.decodeSync(FlowDocumentSchema)(
      fixture.reconnectDocument
    )

    const [reconnectEdge] = decodedReconnectDocument.edges

    if (reconnectEdge === undefined) {
      throw new Error('Missing starting edge in reconnection fixture')
    }

    const sourceHandle = decodedReconnectDocument.nodes
      .find((node) => node.id === reconnectEdge.source)
      ?.handles?.find((handle) => handle.id === reconnectEdge.sourceHandle)

    const targetHandle = decodedReconnectDocument.nodes
      .find((node) => node.id === reconnectEdge.target)
      ?.handles?.find((handle) => handle.id === reconnectEdge.targetHandle)

    if (sourceHandle === undefined || targetHandle === undefined) {
      throw new Error('Missing original edge handles in reconnection fixture')
    }

    const evaluated = fixture.reconnectionCases.map((scenario) => {
      const node = decodedReconnectDocument.nodes.find(
        (candidate) => candidate.id === scenario.nodeId
      )

      const handle = node?.handles?.find(
        (candidate) => candidate.id === scenario.handleId
      )

      if (node === undefined || handle === undefined) {
        throw new Error(`Missing replacement handle for ${scenario.id}`)
      }

      const result = Effect.runSyncExit(
        reconnectFlowEdge(
          document,
          reconnectEdge.id,
          scenario.endpoint,
          node.id,
          handle.id
        )
      )

      const replacement = Exit.isSuccess(result) ? result.value : undefined

      const candidate = {
        source: scenario.endpoint === 'source' ? node.id : reconnectEdge.source,
        sourceHandle:
          scenario.endpoint === 'source' ? handle.id : sourceHandle.id,
        target: scenario.endpoint === 'target' ? node.id : reconnectEdge.target,
        targetHandle:
          scenario.endpoint === 'target' ? handle.id : targetHandle.id,
      }

      const validationDocument = {
        ...document,
        edges: document.edges.filter((edge) => edge.id !== reconnectEdge.id),
      }

      const reason = findConnectionIssue(
        validationDocument,
        candidate,
        'strict'
      )

      let outcome: 'accepted' | 'rejected' | 'unchanged'

      if (replacement !== undefined) {
        outcome = 'accepted'
      } else if (reason === undefined) {
        outcome = 'unchanged'
      } else {
        outcome = 'rejected'
      }

      const applied =
        replacement === undefined
          ? undefined
          : applyEdgeReconnectChange(document, {
              kind: 'edge-reconnect',
              edge: replacement,
            })

      return {
        id: scenario.id,
        outcome,
        reason,
        edge: replacement,
        appliedEdge: applied?.edges.find(
          (edge) => edge.id === reconnectEdge.id
        ),
      }
    })

    expect(evaluated).toStrictEqual(
      fixture.reconnectionCases.map((scenario) => ({
        id: scenario.id,
        outcome: scenario.outcome,
        reason: scenario.reason,
        edge: scenario.expectedEdge,
        appliedEdge: scenario.expectedEdge,
      }))
    )
  })

  it('declares cancellation and retry sequences in the shared fixture', () => {
    const fixture = S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
      JSON.parse(
        readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
      )
    )

    const document = Effect.runSync(
      decodeFlowDocument(fixture.connectionDocument)
    )

    const retries = fixture.cancellationRetryCases.map((scenario) => {
      const terminalIndex = Math.max(
        scenario.eventOrder.indexOf('cancel'),
        scenario.eventOrder.indexOf('replace')
      )

      return {
        reason: scenario.reason,
        attemptIssue: findConnectionIssue(document, scenario.attempt, 'strict'),
        terminalBeforeRetry:
          terminalIndex >= 0 &&
          terminalIndex < scenario.eventOrder.indexOf('retry-start'),
        retryEdgeId: nextConnectionEdge(document, scenario.retry).id,
        staleReleaseIgnored: scenario.eventOrder.includes(
          'stale-release-ignored'
        ),
      }
    })

    expect(retries).toStrictEqual(
      fixture.cancellationRetryCases.map((scenario) => ({
        reason: scenario.reason,
        attemptIssue: undefined,
        terminalBeforeRetry: true,
        retryEdgeId: scenario.expectedRetryEdgeId,
        staleReleaseIgnored: scenario.eventOrder.includes(
          'stale-release-ignored'
        ),
      }))
    )
  })

  it('keeps the renderer contract scene schema-valid and host-neutral', () => {
    const fixture = S.decodeUnknownSync(RendererContractFixtureSchema)(
      JSON.parse(
        readFileSync('research/fixtures/renderer-contract.json', 'utf-8')
      )
    )

    const decoded = Effect.runSync(decodeFlowDocument(fixture.document))

    expect({
      nodeIds: decoded.nodes.map(({ id }) => id),
      paths: decoded.edges.map(({ path }) => path),
      builtInPaths: fixture.expected.builtInPaths,
      labelOwner: fixture.expected.labelOwner,
      dynamicHandle: fixture.expected.dynamicHandle,
      nodesSized: decoded.nodes.every(
        (node) => node.data?.width === 140 && node.data.height === 76
      ),
    }).toStrictEqual({
      nodeIds: ['source', 'target'],
      paths: [
        'straight',
        'bezier',
        'simplebezier',
        'step',
        'smoothstep',
        undefined,
        'bezier',
        'simplebezier',
      ],
      builtInPaths: [
        'straight',
        'bezier',
        'simplebezier',
        'step',
        'smoothstep',
      ],
      labelOwner: 'host-overlay',
      dynamicHandle: {
        nodeId: 'source',
        handleId: 'out',
        initialTop: 21,
        resizedTop: 49,
      },
      nodesSized: true,
    })
  })

  it('keeps the shared measured-geometry cases in a fixed contract fixture', () => {
    const fixture = S.decodeUnknownSync(
      S.Struct({
        contract: S.Literal('flow-measured-geometry-v1'),
        units: S.Literal('unscaled-local-graph-units'),
        cases: S.Array(S.Json),
      })
    )(
      JSON.parse(
        readFileSync('research/fixtures/measurement-contract.json', 'utf-8')
      )
    )

    expect(fixture.cases).toHaveLength(5)

    const caseIds = fixture.cases.map((item) => {
      const decodedCase = S.decodeUnknownSync(
        S.Struct({
          name: S.optional(S.String),
          nodeId: S.optional(S.String),
        })
      )(item)

      return decodedCase.name ?? decodedCase.nodeId
    })

    expect(caseIds).toStrictEqual([
      'nested-visible-node',
      'hidden-node-readiness',
      'zero-sized-node',
      'culled-node-fit-fallback',
      'remove-readd-same-id',
    ])
  })

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
