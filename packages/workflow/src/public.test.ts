import {
  copyFlowSelection,
  pasteFlowGraphFragment,
  prepareFlowEdit,
  createFlowHistory,
  reduceFlowHistory,
  decodeFlowDocument,
  makeTypedFlow,
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
  projectFlowRoomDocument,
} from '@flow/core'
import { Cause, Effect, Exit, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  aiWorkflowFixture,
  baseWorkflowFixture,
  decodeWorkflowDocument,
  projectWorkflowDocument,
  workflowDataContract,
  workflowClipboardExtension,
  workflowPorts,
  WorkflowDocumentSchema,
  WorkflowIssueSchema,
  WorkflowNodeEventSchema,
  WorkflowRunRequestSchema,
  workflowIssues,
} from './public.ts'

const decode = (input: Parameters<typeof decodeWorkflowDocument>[0]) =>
  Effect.runSync(decodeWorkflowDocument(input))

const raw = Schema.decodeUnknownSync(WorkflowDocumentSchema)

const failure = (input: Parameters<typeof decodeWorkflowDocument>[0]) => {
  const exit = Effect.runSyncExit(decodeWorkflowDocument(input))

  if (Exit.isSuccess(exit)) {
    throw new Error('Expected rejected workflow')
  }

  const error = Cause.findErrorOption(exit.cause)

  if (Option.isNone(error)) {
    throw new Error('Expected typed failure')
  }

  return error.value
}

const nodeData = (document: ReturnType<typeof raw>, id: string) =>
  document.nodes.find((node) => node.id === id)?.data

describe('workflow document and port contracts', () => {
  it('decodes all nine kinds and round-trips allowed opaque metadata', () => {
    const base = decode(baseWorkflowFixture)
    const ai = decode(aiWorkflowFixture)
    expect(base.nodes.map((node) => node.data?.workflow?.kind)).toStrictEqual([
      'initial',
      'transform',
      'branch',
      'join',
      'output',
    ])
    expect(ai.nodes.map((node) => node.data?.workflow?.kind)).toStrictEqual([
      'workflow-trigger',
      'text-input',
      'generate-text',
      'generate-image',
      'output',
    ])
    expect([
      Schema.encodeSync(WorkflowDocumentSchema)(base),
      Schema.encodeSync(WorkflowDocumentSchema)(ai),
    ]).toStrictEqual([baseWorkflowFixture, aiWorkflowFixture])
    expect(base.nodes[0]?.data?.metadata).toStrictEqual({
      opaque: ['preserved', 169],
    })
    expect(
      base.nodes.flatMap((node) =>
        node.data?.workflow === undefined
          ? []
          : workflowPorts(node.data.workflow).map(({ role }) => role)
      )
    ).toStrictEqual([
      'output',
      'input',
      'output',
      'input',
      'true',
      'false',
      'input',
      'output',
      'input',
    ])
  })

  it('rejects unknown versions, kind/config combinations, malformed configuration and run or credential fields', () => {
    const [first] = baseWorkflowFixture.nodes

    if (first === undefined) {
      throw new Error('Missing fixture')
    }

    const wrong = [
      { ...first.data.workflow, version: 2 },
      { ...first.data.workflow, kind: 'foreign' },
      { ...first.data.workflow, kind: 'transform' },
      { ...first.data.workflow, config: { value: 12 } },
      {
        ...first.data.workflow,
        config: { value: 'hello', apiKey: 'excluded' },
      },
      { ...first.data.workflow, runState: 'running' },
      { ...first.data.workflow, credentials: { token: 'excluded' } },
    ]

    expect(
      wrong.map((workflow) =>
        failure({ nodes: [{ ...first, data: { workflow } }], edges: [] })
      )
    ).toStrictEqual(
      wrong.map(() => expect.objectContaining({ code: 'invalid-document' }))
    )
    const ai = aiWorkflowFixture.nodes.find(({ id }) => id === 'generate-text')

    if (ai === undefined) {
      throw new Error('Missing AI fixture')
    }

    expect(
      failure({
        nodes: [
          {
            ...ai,
            data: {
              workflow: {
                ...ai.data.workflow,
                config: {
                  modelId: 'local',
                  temperature: 3,
                  system: '',
                  prompt: '',
                },
              },
            },
          },
        ],
        edges: [],
      })
    ).toMatchObject({ code: 'invalid-document' })
  })

  it('reports exact duplicate IDs and missing endpoints', () => {
    const [first] = baseWorkflowFixture.nodes
    const [edge] = baseWorkflowFixture.edges

    if (first === undefined || edge === undefined) {
      throw new Error('Missing fixture')
    }

    expect(failure({ nodes: [first, first], edges: [] })).toMatchObject({
      issues: [{ code: 'duplicate-node-id', nodeId: 'initial' }],
    })
    expect(
      failure({ ...baseWorkflowFixture, edges: [edge, edge] })
    ).toMatchObject({
      issues: [
        { code: 'duplicate-edge-id', edgeId: 'initial-transform' },
        {
          code: 'multiple-inputs',
          edgeId: 'initial-transform',
          nodeId: 'transform',
          portId: 'in',
        },
      ],
    })
    expect(
      failure({
        ...baseWorkflowFixture,
        edges: [{ ...edge, source: 'missing' }],
      })
    ).toMatchObject({
      issues: [
        {
          code: 'missing-endpoint',
          edgeId: 'initial-transform',
          nodeId: 'missing',
        },
      ],
    })
  })

  it('rejects missing, duplicate and wrong-direction physical port bindings', () => {
    const [first] = baseWorkflowFixture.nodes

    if (first === undefined) {
      throw new Error('Missing fixture')
    }

    expect(
      failure({ nodes: [{ ...first, handles: [] }], edges: [] })
    ).toMatchObject({
      issues: [{ code: 'invalid-port', nodeId: 'initial', portId: 'out' }],
    })
    expect(
      failure({
        nodes: [
          { ...first, handles: [{ id: 'out', kind: 'target', side: 'left' }] },
        ],
        edges: [],
      })
    ).toMatchObject({
      issues: [{ code: 'invalid-port', nodeId: 'initial', portId: 'out' }],
    })
    const branch = baseWorkflowFixture.nodes.find(({ id }) => id === 'branch')

    if (branch === undefined) {
      throw new Error('Missing branch')
    }

    expect(
      failure({
        nodes: [
          {
            ...branch,
            data: {
              workflow: {
                version: 1,
                kind: 'branch',
                config: { operator: 'equals', value: 'x' },
                ports: { input: 'in', true: 'yes', false: 'yes' },
              },
            },
          },
        ],
        edges: [],
      })
    ).toMatchObject({
      issues: [{ code: 'invalid-port', nodeId: 'branch', portId: 'yes' }],
    })
  })

  it('reports exact incompatible data/trigger/image ports and connection contracts', () => {
    const ai = decode(aiWorkflowFixture)
    const [first] = ai.edges

    if (first === undefined) {
      throw new Error('Missing edge')
    }

    expect(
      failure({ ...ai, edges: [{ ...first, targetHandle: 'prompt' }] })
    ).toMatchObject({
      issues: [
        {
          code: 'incompatible-ports',
          edgeId: 'trigger-text',
          nodeId: 'generate-text',
          portId: 'prompt',
          sourceNodeId: 'trigger',
          sourcePortId: 'start',
        },
      ],
    })
    expect(
      failure({
        ...ai,
        edges: [{ ...first, data: { workflow: { version: 1, kind: 'data' } } }],
      })
    ).toMatchObject({
      issues: [
        {
          code: 'incompatible-ports',
          edgeId: 'trigger-text',
          nodeId: 'generate-text',
          portId: 'start',
          sourceNodeId: 'trigger',
          sourcePortId: 'start',
        },
      ],
    })
    expect(
      failure({
        ...ai,
        edges: [
          {
            id: 'bad-image',
            source: 'generate-image',
            sourceHandle: 'image',
            target: 'generate-text',
            targetHandle: 'prompt',
            data: { workflow: { version: 1, kind: 'data' } },
          },
        ],
      })
    ).toMatchObject({
      issues: [
        {
          code: 'incompatible-ports',
          edgeId: 'bad-image',
          nodeId: 'generate-text',
          portId: 'prompt',
          sourceNodeId: 'generate-image',
          sourcePortId: 'image',
        },
      ],
    })
    expect(
      failure({ ...ai, edges: [{ ...first, sourceHandle: 'absent' }] })
    ).toMatchObject({
      issues: [{ code: 'invalid-port', nodeId: 'trigger', portId: 'absent' }],
    })
    expect(
      failure({ ...ai, edges: [{ ...first, data: undefined }] })
    ).toMatchObject({
      issues: [{ code: 'missing-connection-contract', edgeId: 'trigger-text' }],
    })
  })

  it('rejects cyclic executable dependencies with exact members, excluding downstream nodes', () => {
    const document = raw({
      ...baseWorkflowFixture,
      edges: [
        ...baseWorkflowFixture.edges.filter(
          ({ id }) => id !== 'initial-transform'
        ),
        {
          id: 'back',
          source: 'join',
          sourceHandle: 'out',
          target: 'transform',
          targetHandle: 'in',
          data: { workflow: { version: 1, kind: 'data' } },
        },
      ],
    })

    expect(workflowIssues(document)).toStrictEqual([
      {
        code: 'cycle',
        nodeIds: ['branch', 'join', 'transform'],
        edgeIds: ['back', 'branch-false', 'branch-true', 'transform-branch'],
      },
    ])
    expect(
      workflowIssues({
        ...document,
        nodes: document.nodes.toReversed(),
        edges: document.edges.toReversed(),
      })
    ).toStrictEqual(workflowIssues(document))
    expect(failure(document)).toMatchObject({
      issues: workflowIssues(document),
    })

    for (const issue of workflowIssues(document)) {
      expect(
        Schema.decodeUnknownSync(WorkflowIssueSchema)(issue)
      ).toStrictEqual(issue)
    }
  })

  it('keeps generic documents usable and rejects invalid existing presentation contracts', () => {
    const generic = {
      nodes: [
        {
          id: 'plain',
          label: 'Generic',
          position: { x: 0, y: 0 },
          data: { custom: ['opaque'] },
        },
      ],
      edges: [],
    }

    expect(projectWorkflowDocument(decode(generic))).toStrictEqual(
      Effect.runSync(decodeFlowDocument(generic))
    )
    expect(
      failure({ nodes: [{ ...generic.nodes[0], type: 'shape' }], edges: [] })
    ).toMatchObject({ code: 'invalid-document' })
    expect(
      failure({
        nodes: [{ ...generic.nodes[0], data: { tree: { version: 99 } } }],
        edges: [],
      })
    ).toMatchObject({ code: 'invalid-document' })
  })

  it('keeps transient execution contracts separate and schema-derived', () => {
    const run = Schema.decodeUnknownSync(WorkflowRunRequestSchema)({
      runId: 'run-1',
      revision: 2,
      document: decode(baseWorkflowFixture),
    })

    expect({ runId: run.runId, revision: run.revision }).toStrictEqual({
      runId: 'run-1',
      revision: 2,
    })

    const event = Schema.decodeUnknownSync(WorkflowNodeEventSchema)({
      runId: 'run-1',
      revision: 2,
      nodeId: 'initial',
      state: 'succeeded',
      outputs: { output: { kind: 'text', text: 'hello' } },
    })

    expect(event).toStrictEqual({
      runId: 'run-1',
      revision: 2,
      nodeId: 'initial',
      state: 'succeeded',
      outputs: { output: { kind: 'text', text: 'hello' } },
    })
    expect(() =>
      Schema.decodeUnknownSync(WorkflowNodeEventSchema)({
        runId: 'run-1',
        revision: 2,
        nodeId: 'initial',
        state: 'succeeded',
      })
    ).toThrow(/outputs/u)
  })

  it('isolates typed actor snapshots and rejects invalid replacements atomically', async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* proveWorkflowActor() {
          const flow = yield* makeTypedFlow({
            contract: workflowDataContract,
            viewport: { x: 0, y: 0, zoom: 1 },
            initial: { kind: 'encoded', input: baseWorkflowFixture },
          })

          const before = yield* flow.readSnapshot()
          expect({
            document: before.document,
            detached: before.document !== (yield* flow.readSnapshot()).document,
          }).toStrictEqual({
            document: decode(baseWorkflowFixture),
            detached: true,
          })

          const rejected = yield* Effect.exit(
            flow.replaceEncoded(
              {
                ...baseWorkflowFixture,
                edges: [
                  {
                    id: 'back',
                    source: 'transform',
                    sourceHandle: 'out',
                    target: 'transform',
                    targetHandle: 'in',
                    data: { workflow: { version: 1, kind: 'data' } },
                  },
                ],
              },
              0
            )
          )

          expect(Exit.isFailure(rejected)).toBeTruthy()
          expect(yield* flow.readSnapshot()).toStrictEqual(before)
          expect(
            yield* flow.replaceEncoded(aiWorkflowFixture, 0)
          ).toStrictEqual({ revision: 1, changed: true })
          expect(yield* flow.encodeDocument()).toStrictEqual(aiWorkflowFixture)
        })
      )
    )
  })

  it('round-trips groups, trees, shapes, manual routes and bundles through persistence, history and clipboard', () => {
    const document = decode({
      ...baseWorkflowFixture,
      nodes: [
        {
          id: 'group',
          label: 'Group',
          position: { x: 0, y: 0 },
          size: { width: 1300, height: 400 },
          selected: true,
        },
        ...baseWorkflowFixture.nodes.map((node) => ({
          ...node,
          parentId: 'group',
          extent: 'parent',
          data: {
            ...node.data,
            tree: { version: 1, kind: 'node', expanded: true },
          },
        })),
        {
          id: 'figure',
          label: 'Figure',
          type: 'shape',
          size: { width: 40, height: 40 },
          position: { x: 30, y: 300 },
          parentId: 'group',
          data: {
            type: 'diamond',
            color: '#ff0071',
            metadata: { opaque: 'initial' },
          },
        },
      ],
      edges: baseWorkflowFixture.edges.map((edge) => ({
        ...edge,
        route: {
          mode: 'manual',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 200 },
          ],
        },
      })),
      bundles: [
        {
          id: 'branches',
          edgeIds: ['branch-true', 'branch-false'],
          ties: [{ x: 600, y: 100 }],
        },
      ],
    })

    const projected = projectWorkflowDocument(document)
    const saved = encodeVersionedFlowDocument(projected)
    const restored = Effect.runSync(decodeVersionedFlowDocument(saved))
    expect(
      decode(restored).nodes.find(({ id }) => id === 'branch')?.data
    ).toStrictEqual(document.nodes.find(({ id }) => id === 'branch')?.data)
    const clipboard = Effect.runSync(copyFlowSelection(projected))

    const pasted = pasteFlowGraphFragment(clipboard, projected, {}, [
      workflowClipboardExtension,
    ])

    const edited = Effect.runSync(
      prepareFlowEdit(projected, pasted.transaction)
    ).document

    const accepted = decode(edited)
    const branch = accepted.nodes.find(({ id }) => id === 'branch-copy-1')

    const history = reduceFlowHistory(createFlowHistory(projected), {
      kind: 'accepted',
      document: edited,
    }).state

    const undo = reduceFlowHistory(history, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'undo-copy-1',
    })

    expect({
      ports: branch?.data?.workflow?.ports,
      metadata: branch?.data?.metadata,
      tree: branch?.data?.tree,
      figureMetadata: accepted.nodes.find(({ id }) => id === 'figure-copy-1')
        ?.data?.metadata,
      edge: accepted.edges.find(({ id }) => id === 'branch-true-copy-1'),
      bundle: accepted.bundles?.[1],
      originalPorts: nodeData(document, 'branch')?.workflow?.ports,
      undoCount: decode(undo.replacement?.document).nodes.length,
      undoPorts: nodeData(decode(undo.replacement?.document), 'branch')
        ?.workflow?.ports,
      roomIssues: workflowIssues(decode(projectFlowRoomDocument(edited))),
    }).toMatchObject({
      ports: {
        input: 'branch-copy-1-in',
        true: 'branch-copy-1-yes',
        false: 'branch-copy-1-no',
      },
      metadata: { opaque: ['preserved', 169] },
      tree: { version: 1, kind: 'node', expanded: true },
      figureMetadata: { opaque: 'initial' },
      edge: {
        source: 'branch-copy-1',
        sourceHandle: 'branch-copy-1-yes',
        target: 'join-copy-1',
        targetHandle: 'join-copy-1-in',
        route: {
          mode: 'manual',
          points: [
            { x: 120, y: 120 },
            { x: 220, y: 220 },
          ],
        },
      },
      bundle: {
        id: 'branches-copy-1',
        edgeIds: ['branch-true-copy-1', 'branch-false-copy-1'],
        ties: [{ x: 620, y: 120 }],
      },
      originalPorts: { input: 'in', true: 'yes', false: 'no' },
      undoCount: 7,
      undoPorts: { input: 'in', true: 'yes', false: 'no' },
      roomIssues: [],
    })
  })
})
