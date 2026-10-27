import {
  prepareFlowEdit,
  createFlowHistory,
  reduceFlowHistory,
  copyFlowSelection,
  pasteFlowGraphFragment,
} from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Cause, Effect, Exit, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  baseWorkflowFixture,
  aiWorkflowFixture,
  decodeWorkflowDocument,
  createWorkflowNode,
  prepareWorkflowEdit,
  workflowKinds,
  workflowPorts,
  workflowValidationReport,
  createWorkflowExecutionPlan,
  workflowClipboardExtension,
  WorkflowNodeDataSchema,
  WorkflowEditSchema,
} from './public.ts'
import type { WorkflowEdit, WorkflowIds } from './public.ts'

const decode = (input: Parameters<typeof decodeWorkflowDocument>[0]) =>
  Effect.runSync(decodeWorkflowDocument(input))

const allocator = (): WorkflowIds => {
  let n = 0

  return { allocate: (namespace) => `${namespace}-${(n += 1)}` }
}

const apply = (
  document: FlowDocument,
  edit: WorkflowEdit,
  ids = allocator()
) => {
  const transaction = Effect.runSync(prepareWorkflowEdit(document, edit, ids))

  return decode(Effect.runSync(prepareFlowEdit(document, transaction)).document)
}

const rejected = (
  document: FlowDocument,
  input: Parameters<typeof prepareWorkflowEdit>[1]
) => {
  const exit = Effect.runSyncExit(
    prepareWorkflowEdit(document, input, allocator())
  )

  if (Exit.isSuccess(exit)) {
    throw new Error('Expected rejected edit')
  }

  const error = Cause.findErrorOption(exit.cause)

  if (Option.isNone(error)) {
    throw new Error('Expected typed failure')
  }

  return error.value
}

const position = { x: 340, y: 180 }

describe('workflow palette transactions', () => {
  it('creates every kind with fresh declared ports and deterministic configuration', () => {
    const ids = allocator()

    const nodes = workflowKinds.map((kind) =>
      createWorkflowNode({ kind, position }, ids)
    )

    const document = decode({ nodes, edges: [] })
    expect(
      document.nodes.map((node) => node.data?.workflow?.kind)
    ).toStrictEqual([...workflowKinds])
    expect(
      new Set(
        nodes.flatMap((node) => node.handles?.map((handle) => handle.id) ?? [])
      ).size
    ).toBe(18)

    for (const node of nodes) {
      expect(node.position).toStrictEqual(position)
      expect(node.handles?.map(({ id, kind }) => ({ id, kind }))).toStrictEqual(
        node.data?.workflow === undefined
          ? []
          : workflowPorts(node.data.workflow).map(({ id, direction }) => ({
              id,
              kind: direction,
            }))
      )
    }

    expect(
      document.nodes.find(
        (node) => node.data?.workflow?.kind === 'generate-image'
      )?.data?.workflow?.config
    ).toStrictEqual({
      modelId: 'local-image',
      width: 256,
      height: 256,
      prompt: '',
    })
  })

  it('adds without altering existing nodes, edges or opaque extensions', () => {
    const before = decode(baseWorkflowFixture)

    const after = apply(before, {
      kind: 'add',
      nodeKind: 'text-input',
      position,
    })

    expect(after.nodes.slice(0, before.nodes.length)).toStrictEqual(
      before.nodes
    )
    expect(after.edges).toStrictEqual(before.edges)
    expect(after.nodes.at(-1)?.data?.workflow?.config).toStrictEqual({
      text: '',
      locked: false,
    })
  })

  it('appends atomically on both branch roles, preserves the original handle and restores with one undo', () => {
    for (const edgeId of ['branch-true', 'branch-false']) {
      const before = decode(baseWorkflowFixture)
      const original = before.edges.find((edge) => edge.id === edgeId)

      const after = apply(
        before,
        Schema.decodeUnknownSync(WorkflowEditSchema)({
          kind: 'append',
          nodeKind: 'transform',
          edgeId,
          position,
        })
      )

      const inserted = after.nodes.at(-1)
      expect(after.edges.find((edge) => edge.id === edgeId)).toMatchObject({
        source: 'branch',
        sourceHandle: edgeId === 'branch-true' ? 'yes' : 'no',
        target: inserted?.id,
        data: original?.data,
      })
      expect(after.edges.at(-1)).toMatchObject({
        source: inserted?.id,
        target: 'join',
        targetHandle: 'in',
        data: { workflow: { version: 1, kind: 'data' } },
      })

      const accepted = reduceFlowHistory(createFlowHistory(before), {
        kind: 'accepted',
        document: after,
      }).state

      const undo = reduceFlowHistory(accepted, {
        kind: 'replay',
        direction: 'undo',
        transactionId: 'undo-append',
      })

      expect(undo.replacement?.document).toStrictEqual(before)
    }
  })

  it('deletes an inserted node and reconnects using the incoming branch role', () => {
    const before = decode(baseWorkflowFixture)
    const branchEdge = before.edges.find((edge) => edge.id === 'branch-true')

    if (branchEdge === undefined) {
      throw new Error('Missing branch edge')
    }

    const appended = apply(before, {
      kind: 'append',
      nodeKind: 'transform',
      edgeId: branchEdge.id,
      position,
    })

    const node = appended.nodes.at(-1)

    if (node === undefined) {
      throw new Error('Missing inserted node')
    }

    const after = apply(
      appended,
      { kind: 'delete', nodeId: node.id, reconnect: true },
      { allocate: () => 'reconnected' }
    )

    expect(after.nodes).toStrictEqual(before.nodes)
    expect(after.edges.at(-1)).toMatchObject({
      id: 'reconnected',
      source: 'branch',
      sourceHandle: 'yes',
      target: 'join',
      targetHandle: 'in',
    })
    expect(decode(after).edges).toHaveLength(before.edges.length)
  })

  it('rejects incompatible append, invalid configuration, kind changes and locked text without changing the source', () => {
    const before = decode(aiWorkflowFixture)
    const snapshot = structuredClone(before)
    const edge = before.edges.at(-1)
    const node = before.nodes.find((item) => item.id === 'text')

    if (edge === undefined || node?.data?.workflow?.kind !== 'text-input') {
      throw new Error('Missing fixture')
    }

    expect(
      rejected(before, {
        kind: 'append',
        nodeKind: 'transform',
        edgeId: edge.id,
        position,
      })
    ).toMatchObject({
      code: 'incompatible-insertion',
    })
    const textData = node.data.workflow

    const locked = apply(before, {
      kind: 'configure',
      nodeId: node.id,
      workflow: { ...textData, config: { text: 'A tree', locked: true } },
    })

    expect(
      rejected(locked, {
        kind: 'configure',
        nodeId: node.id,
        workflow: { ...textData, config: { text: 'changed', locked: true } },
      })
    ).toMatchObject({ code: 'locked-text' })

    const unlocked = apply(locked, {
      kind: 'configure',
      nodeId: node.id,
      workflow: node.data.workflow,
    })

    expect(
      rejected(before, {
        kind: 'configure',
        nodeId: 'generate-text',
        workflow: {
          version: 1,
          kind: 'generate-text',
          config: { modelId: '', temperature: 3 },
          ports: {},
        },
      })
    ).toHaveProperty('_tag', 'SchemaError')

    const wrongKind = Schema.decodeUnknownSync(WorkflowNodeDataSchema)({
      version: 1,
      kind: 'initial',
      config: { value: 'x' },
      ports: { output: 'x' },
    })

    expect(
      rejected(before, {
        kind: 'configure',
        nodeId: node.id,
        workflow: wrongKind,
      })
    ).toMatchObject({ code: 'kind-change' })

    expect({ source: before, unlocked: unlocked.nodes }).toStrictEqual({
      source: snapshot,
      unlocked: before.nodes,
    })
  })

  it('keeps handle bindings while configuring and remaps pasted workflow references without touching the source', () => {
    const before = decode(baseWorkflowFixture)
    const node = before.nodes.find((item) => item.id === 'initial')

    if (node?.data?.workflow?.kind !== 'initial') {
      throw new Error('Missing initial')
    }

    const changed = apply(before, {
      kind: 'configure',
      nodeId: node.id,
      workflow: { ...node.data.workflow, config: { value: 'edited' } },
    })

    expect(changed.nodes[0]?.data).toStrictEqual({
      ...node.data,
      workflow: { ...node.data.workflow, config: { value: 'edited' } },
    })

    const selected = {
      ...changed,
      nodes: changed.nodes.map((item) => ({ ...item, selected: true })),
    }

    const clipboard = Effect.runSync(copyFlowSelection(selected))

    const pasted = pasteFlowGraphFragment(clipboard, selected, {}, [
      workflowClipboardExtension,
    ])

    const after = decode(
      Effect.runSync(prepareFlowEdit(selected, pasted.transaction)).document
    )

    expect(
      after.nodes.slice(0, before.nodes.length).map((item) => item.data)
    ).toStrictEqual(changed.nodes.map((item) => item.data))
    const copies = after.nodes.slice(before.nodes.length)

    for (const copy of copies) {
      expect(copy.handles?.map((item) => item.id)).toStrictEqual(
        copy.data?.workflow === undefined
          ? []
          : workflowPorts(copy.data.workflow).map((item) => item.id)
      )
      expect(
        copy.handles?.some((item) =>
          ['out', 'in', 'yes', 'no'].includes(item.id)
        )
      ).toBeFalsy()
    }
  })

  it('preserves groups, trees, shapes, routes, bundles and rotation across workflow edits and clipboard', () => {
    const before = decode({
      ...baseWorkflowFixture,
      nodes: [
        {
          id: 'group',
          label: 'Group',
          position: { x: 0, y: 0 },
          size: { width: 1600, height: 600 },
          selected: true,
        },
        ...baseWorkflowFixture.nodes.map((node) => ({
          ...node,
          parentId: 'group',
          extent: 'parent',
          rotation: 35,
          data: {
            ...node.data,
            tree: { version: 1, kind: 'node', expanded: true },
          },
        })),
        {
          id: 'shape',
          label: 'Shape',
          type: 'shape',
          size: { width: 40, height: 40 },
          position: { x: 30, y: 350 },
          data: { type: 'diamond', color: '#ff0071' },
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

    const branchEdge = before.edges.find((edge) => edge.id === 'branch-false')

    if (branchEdge === undefined) {
      throw new Error('Missing branch')
    }

    const appended = apply(before, {
      kind: 'append',
      edgeId: branchEdge.id,
      nodeKind: 'transform',
      position,
    })

    expect({
      nodes: appended.nodes.slice(0, before.nodes.length),
      bundles: appended.bundles,
      route: appended.edges.find((edge) => edge.id === branchEdge.id)?.route,
    }).toStrictEqual({
      nodes: before.nodes,
      bundles: before.bundles,
      route: branchEdge.route,
    })

    const clipboard = Effect.runSync(
      copyFlowSelection({
        ...appended,
        nodes: appended.nodes.map((node) => ({ ...node, selected: true })),
      })
    )

    const pasted = pasteFlowGraphFragment(clipboard, appended, {}, [
      workflowClipboardExtension,
    ])

    const after = decode(
      Effect.runSync(prepareFlowEdit(appended, pasted.transaction)).document
    )

    expect(
      after.nodes.find((node) => node.id === 'branch-copy-1')
    ).toMatchObject({
      parentId: 'group-copy-1',
      rotation: 35,
      data: {
        tree: { version: 1, kind: 'node', expanded: true },
        workflow: {
          kind: 'branch',
          ports: {
            input: 'branch-copy-1-in',
            true: 'branch-copy-1-yes',
            false: 'branch-copy-1-no',
          },
        },
      },
    })
    const planned = createWorkflowExecutionPlan(after, 171)
    expect({
      issues: workflowValidationReport(after).issues,
      document: planned.kind === 'ready' ? planned.plan.document : undefined,
      nodeIds:
        planned.kind === 'ready'
          ? planned.plan.steps.map((step) => step.nodeId).toSorted()
          : [],
    }).toStrictEqual({
      issues: [],
      document: after,
      nodeIds: after.nodes
        .filter((node) => node.data?.workflow !== undefined)
        .map((node) => node.id)
        .toSorted(),
    })
    expect(after.bundles?.[1]).toMatchObject({
      id: 'branches-copy-1',
      edgeIds: ['branch-true-copy-1', 'branch-false-copy-1'],
    })
  })
})
