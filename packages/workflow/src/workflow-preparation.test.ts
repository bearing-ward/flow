import {
  prepareFlowEdit,
  createFlowHistory,
  reduceFlowHistory,
} from '@flow/core'
import { Effect, Result, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  baseWorkflowFixture,
  aiWorkflowFixture,
  decodeWorkflowDocument,
  WorkflowDocumentSchema,
  WorkflowValidationReportSchema,
  WorkflowExecutionPlanSchema,
  workflowValidationReport,
  createWorkflowExecutionPlan,
  prepareWorkflowExecution,
  prepareWorkflowConnection,
} from './public.ts'

const decode = (input: Parameters<typeof decodeWorkflowDocument>[0]) =>
  Effect.runSync(decodeWorkflowDocument(input))

const raw = S.decodeUnknownSync(WorkflowDocumentSchema)

const report = (input: Parameters<typeof raw>[0]) =>
  workflowValidationReport(raw(input))

describe('workflow readiness and deterministic preparation', () => {
  it('reports exact missing inputs and unreachable nodes independently of editable integrity', () => {
    const document = decode({ ...baseWorkflowFixture, edges: [] })
    const result = workflowValidationReport(document)
    expect(result).toStrictEqual({
      issues: [
        { code: 'missing-input', nodeId: 'branch', portId: 'in' },
        { code: 'missing-input', nodeId: 'join', portId: 'in' },
        { code: 'missing-input', nodeId: 'output', portId: 'in' },
        { code: 'missing-input', nodeId: 'transform', portId: 'in' },
        { code: 'unreachable-node', nodeId: 'branch' },
        { code: 'unreachable-node', nodeId: 'join' },
        { code: 'unreachable-node', nodeId: 'output' },
        { code: 'unreachable-node', nodeId: 'transform' },
      ],
      reachableNodeIds: ['initial'],
    })
    expect(
      S.decodeUnknownSync(WorkflowValidationReportSchema)(result)
    ).toStrictEqual(result)
    expect(createWorkflowExecutionPlan(document, 0)).toStrictEqual({
      kind: 'invalid',
      report: result,
    })
    expect(report({ nodes: [], edges: [] })).toStrictEqual({
      issues: [{ code: 'empty-workflow' }],
      reachableNodeIds: [],
    })
  })

  it('reports settings with field identity and accepts a corrected field', () => {
    const input = {
      ...baseWorkflowFixture,
      nodes: baseWorkflowFixture.nodes.map((node) =>
        node.id === 'branch'
          ? {
              ...node,
              data: {
                workflow: {
                  version: 1,
                  kind: 'branch',
                  ports: { input: 'in', true: 'yes', false: 'no' },
                  config: { operator: 'contains', value: '' },
                },
              },
            }
          : node
      ),
    }

    expect(report(input)).toStrictEqual({
      issues: [{ code: 'invalid-setting', nodeId: 'branch', field: 'value' }],
      reachableNodeIds: ['branch', 'initial', 'join', 'output', 'transform'],
    })
    expect(
      workflowValidationReport(decode(baseWorkflowFixture)).issues
    ).toStrictEqual([])
    const ai = decode(aiWorkflowFixture)

    const invalid = {
      ...ai,
      nodes: ai.nodes.map((node) =>
        node.data?.workflow?.kind === 'generate-text'
          ? {
              ...node,
              data: {
                workflow: {
                  ...node.data.workflow,
                  config: { ...node.data.workflow.config, modelId: ' ' },
                },
              },
            }
          : node
      ),
    }

    expect(workflowValidationReport(invalid).issues).toStrictEqual([
      { code: 'invalid-setting', nodeId: 'generate-text', field: 'modelId' },
    ])
  })

  it('requires trigger and connected or inline prompts, while system input is optional', () => {
    const document = decode({
      ...aiWorkflowFixture,
      edges: aiWorkflowFixture.edges.filter(
        (edge) => edge.id !== 'prompt-text' && edge.id !== 'trigger-text'
      ),
    })

    expect(workflowValidationReport(document).issues).toStrictEqual([
      { code: 'missing-input', nodeId: 'generate-text', portId: 'prompt' },
      { code: 'missing-input', nodeId: 'generate-text', portId: 'start' },
      { code: 'unreachable-node', nodeId: 'generate-text' },
    ])

    const inline = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.data?.workflow?.kind === 'generate-text'
          ? {
              ...node,
              data: {
                workflow: {
                  ...node.data.workflow,
                  config: { ...node.data.workflow.config, prompt: 'Inline' },
                },
              },
            }
          : node
      ),
    }

    expect(workflowValidationReport(inline).issues).toStrictEqual([
      { code: 'missing-input', nodeId: 'generate-text', portId: 'start' },
      { code: 'unreachable-node', nodeId: 'generate-text' },
    ])
  })

  it('reports exact type mismatch and cycles with stable IDs regardless of array order', () => {
    const mismatch = report({
      ...aiWorkflowFixture,
      edges: aiWorkflowFixture.edges.map((edge) =>
        edge.id === 'prompt-text'
          ? { ...edge, source: 'generate-image', sourceHandle: 'image' }
          : edge
      ),
    })

    expect(mismatch.issues).toStrictEqual([
      {
        code: 'cycle',
        nodeIds: ['generate-image', 'generate-text'],
        edgeIds: ['prompt-text', 'text-image'],
      },
      {
        code: 'incompatible-ports',
        edgeId: 'prompt-text',
        nodeId: 'generate-text',
        portId: 'prompt',
        sourceNodeId: 'generate-image',
        sourcePortId: 'image',
      },
    ])

    const document = raw({
      ...baseWorkflowFixture,
      edges: [
        ...baseWorkflowFixture.edges.filter(
          (edge) => edge.id !== 'initial-transform'
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

    const expected = {
      issues: [
        {
          code: 'cycle',
          nodeIds: ['branch', 'join', 'transform'],
          edgeIds: ['back', 'branch-false', 'branch-true', 'transform-branch'],
        },
        { code: 'unreachable-node', nodeId: 'branch' },
        { code: 'unreachable-node', nodeId: 'join' },
        { code: 'unreachable-node', nodeId: 'output' },
        { code: 'unreachable-node', nodeId: 'transform' },
      ],
      reachableNodeIds: ['initial'],
    }

    expect(workflowValidationReport(document)).toStrictEqual(expected)
    expect(
      workflowValidationReport({
        ...document,
        nodes: document.nodes.toReversed(),
        edges: document.edges.toReversed(),
      })
    ).toStrictEqual(expected)
  })

  it('prepares stable sequential order, explicit branches and joins that settle skipped predecessors', () => {
    const document = decode(baseWorkflowFixture)
    const result = createWorkflowExecutionPlan(document, 4)

    if (result.kind !== 'ready') {
      throw new Error('Expected ready plan')
    }

    expect({
      order: result.plan.steps.map((step) => step.nodeId),
      requiredPorts: result.plan.steps.map((step) => step.requiredPortIds),
    }).toStrictEqual({
      order: ['initial', 'transform', 'branch', 'join', 'output'],
      requiredPorts: [[], ['in'], ['in'], ['in'], ['in']],
    })
    expect(result.plan.policy).toStrictEqual({
      scheduling: 'sequential-node-id',
      inactiveBranch: 'skip',
      join: 'settle-all-use-active',
      noActiveInput: 'skip',
    })
    expect(result.plan.steps[3]?.inputs).toStrictEqual([
      {
        edgeId: 'branch-false',
        sourceNodeId: 'branch',
        sourcePort: {
          id: 'no',
          role: 'false',
          direction: 'source',
          valueType: 'text',
          multiple: false,
        },
        targetPort: {
          id: 'in',
          role: 'input',
          direction: 'target',
          valueType: 'text',
          multiple: true,
        },
      },
      {
        edgeId: 'branch-true',
        sourceNodeId: 'branch',
        sourcePort: {
          id: 'yes',
          role: 'true',
          direction: 'source',
          valueType: 'text',
          multiple: false,
        },
        targetPort: {
          id: 'in',
          role: 'input',
          direction: 'target',
          valueType: 'text',
          multiple: true,
        },
      },
    ])
    expect(
      S.decodeUnknownSync(WorkflowExecutionPlanSchema)(result.plan)
    ).toStrictEqual(result.plan)

    const reordered = createWorkflowExecutionPlan(
      {
        ...document,
        nodes: document.nodes.toReversed(),
        edges: document.edges.toReversed(),
      },
      4
    )

    expect(
      reordered.kind === 'ready' ? reordered.plan.steps : []
    ).toStrictEqual(result.plan.steps)
  })

  it('orders simultaneous ready nodes by ID and detaches the snapshot', () => {
    const document = decode(baseWorkflowFixture)
    const result = createWorkflowExecutionPlan(document, 4)

    if (result.kind !== 'ready') {
      throw new Error('Expected ready plan')
    }

    const ai = createWorkflowExecutionPlan(decode(aiWorkflowFixture), 5)
    expect(
      ai.kind === 'ready' ? ai.plan.steps.map((step) => step.nodeId) : []
    ).toStrictEqual([
      'text',
      'trigger',
      'generate-text',
      'generate-image',
      'image-output',
    ])
    expect({
      detachedDocument: result.plan.document !== document,
      detachedNode: result.plan.document.nodes[0] !== document.nodes[0],
    }).toStrictEqual({ detachedDocument: true, detachedNode: true })
  })

  it('distinguishes decoding, invalid executable graphs and stale revisions before a run', () => {
    const document = decode(baseWorkflowFixture)
    expect(
      Effect.runSync(prepareWorkflowExecution({ document, revision: 2 }, 2))
        .revision
    ).toBe(2)

    const stale = Effect.runSync(
      Effect.result(prepareWorkflowExecution({ document, revision: 3 }, 2))
    )

    expect(Result.isFailure(stale) ? stale.failure : undefined).toMatchObject({
      expectedRevision: 2,
      acceptedRevision: 3,
    })

    const invalid = Effect.runSync(
      Effect.result(
        prepareWorkflowExecution(
          {
            document: decode({ ...baseWorkflowFixture, edges: [] }),
            revision: 2,
          },
          2
        )
      )
    )

    expect(Result.isFailure(invalid) ? invalid.failure._tag : '').toBe(
      'WorkflowValidationError'
    )

    const malformed = Effect.runSync(
      Effect.result(decodeWorkflowDocument({ nodes: 'invalid' }))
    )

    expect(Result.isFailure(malformed) ? malformed.failure._tag : '').toBe(
      'WorkflowDecodeError'
    )
  })

  it('rejects connections before document or history mutation', () => {
    const document = decode(baseWorkflowFixture)
    const history = createFlowHistory(document)

    const rejected = Effect.runSync(
      Effect.result(
        prepareWorkflowConnection(document, {
          id: 'rejected',
          source: 'join',
          sourceHandle: 'out',
          target: 'transform',
          targetHandle: 'in',
          data: { workflow: { version: 1, kind: 'data' } },
        })
      )
    )

    expect(Result.isFailure(rejected) ? rejected.failure._tag : '').toBe(
      'WorkflowValidationError'
    )
    expect({ document, history }).toStrictEqual({
      document: decode(baseWorkflowFixture),
      history: createFlowHistory(document),
    })

    const incomplete = decode({
      ...baseWorkflowFixture,
      edges: baseWorkflowFixture.edges.filter(
        (edge) => edge.id !== 'initial-transform'
      ),
    })

    const [edge] = baseWorkflowFixture.edges

    const transaction = Effect.runSync(
      prepareWorkflowConnection(incomplete, edge)
    )

    const accepted = decode(
      Effect.runSync(prepareFlowEdit(incomplete, transaction)).document
    )

    const recorded = reduceFlowHistory(createFlowHistory(incomplete), {
      kind: 'accepted',
      document: accepted,
    })

    expect(workflowValidationReport(accepted).issues).toStrictEqual([])
    expect(recorded.state.past).toHaveLength(1)

    const replay = reduceFlowHistory(recorded.state, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'undo-connection',
    })

    expect(replay.replacement?.document.edges).toStrictEqual(incomplete.edges)
  })
})
