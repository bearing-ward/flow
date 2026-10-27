import {
  copyFlowSelection,
  pasteFlowGraphFragment,
  prepareFlowEdit,
  createFlowHistory,
  reduceFlowHistory,
} from '@flow/core'
import { Effect, Result } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  baseWorkflowFixture,
  decodeWorkflowDocument,
  decodeSavedWorkflow,
  encodeSavedWorkflow,
  workflowClipboardExtension,
} from './public.ts'

const decode = (input: Parameters<typeof decodeWorkflowDocument>[0]) =>
  Effect.runSync(decodeWorkflowDocument(input))

const save = (document: Parameters<typeof encodeSavedWorkflow>[0]) =>
  Effect.runSync(encodeSavedWorkflow(document, 'dark'))

const restore = (input: Parameters<typeof decodeSavedWorkflow>[0]) =>
  Effect.runSync(decodeSavedWorkflow(input))

const extended = () =>
  decode({
    ...baseWorkflowFixture,
    nodes: [
      {
        id: 'group',
        label: 'Group',
        position: { x: 0, y: 0 },
        size: { width: 1400, height: 500 },
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
        position: { x: 30, y: 350 },
        size: { width: 40, height: 40 },
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

describe('versioned local workflow persistence', () => {
  it('saves exact configuration and restores detached editable semantics and theme', () => {
    const document = decode(baseWorkflowFixture)
    const saved = save(document)
    expect(saved).toStrictEqual({
      format: '@flow/workflow',
      version: 1,
      workflowVersion: 1,
      graph: { version: 1, document: structuredClone(document) },
      theme: 'dark',
    })
    expect(restore(saved)).toStrictEqual({
      document,
      theme: 'dark',
    })
    expect(saved.graph.document.nodes[0]).not.toBe(document.nodes[0])
  })

  it('preserves every presentation extension through save, clipboard and history', () => {
    const document = extended()
    const saved = save(document)
    expect(saved.graph.version).toBe(6)
    const restored = restore(saved).document
    expect(restored).toStrictEqual(
      decode({
        ...document,
        nodes: document.nodes.map(({ selected: _selected, ...node }) => node),
      })
    )
    const clipboard = Effect.runSync(copyFlowSelection(document))

    const pasted = pasteFlowGraphFragment(clipboard, restored, {}, [
      workflowClipboardExtension,
    ])

    const edited = Effect.runSync(
      prepareFlowEdit(restored, pasted.transaction)
    ).document

    const accepted = restore(save(edited)).document
    const branch = accepted.nodes.find((node) => node.id === 'branch-copy-1')
    expect({
      branch,
      bundle: accepted.bundles?.at(-1),
      route: accepted.edges.find((edge) => edge.id === 'branch-false-copy-1')
        ?.route,
    }).toMatchObject({
      branch: {
        rotation: 35,
        data: {
          tree: { version: 1, kind: 'node', expanded: true },
          workflow: {
            kind: 'branch',
            config: { operator: 'equals', value: 'HELLO' },
            ports: {
              input: 'branch-copy-1-in',
              true: 'branch-copy-1-yes',
              false: 'branch-copy-1-no',
            },
          },
        },
      },
      bundle: { edgeIds: ['branch-true-copy-1', 'branch-false-copy-1'] },
      route: {
        mode: 'manual',
        points: [
          { x: 120, y: 120 },
          { x: 220, y: 220 },
        ],
      },
    })

    const history = reduceFlowHistory(createFlowHistory(restored), {
      kind: 'accepted',
      document: accepted,
    })

    const undone = reduceFlowHistory(history.state, {
      kind: 'replay',
      direction: 'undo',
      transactionId: 'undo-save',
    })

    expect(undone.replacement?.document).toStrictEqual(restored)

    const replayed = reduceFlowHistory(undone.state, {
      kind: 'accepted',
      document: restored,
      context: undone.replacement?.context,
    })

    expect(
      reduceFlowHistory(replayed.state, {
        kind: 'replay',
        direction: 'redo',
        transactionId: 'redo-save',
      }).replacement?.document
    ).toStrictEqual(accepted)
  })

  it('omits browser measurements and selection and rejects transient or secret semantic fields', () => {
    const document = decode(baseWorkflowFixture)

    const selected = decode({
      ...document,
      nodes: document.nodes.map((node) => ({
        ...node,
        selected: true,
        measured: { width: 999, height: 777 },
      })),
    })

    const saved = save(selected)
    expect(
      saved.graph.document.nodes.every(
        (node) => !('selected' in node) && !('measured' in node)
      )
    ).toBeTruthy()

    for (const extra of [
      { status: 'running' },
      { credentials: 'secret' },
      { provider: {} },
      { runId: 'transient' },
    ]) {
      const { graph } = saved

      const malformed = {
        ...saved,
        graph: {
          ...graph,
          document: {
            ...graph.document,
            nodes: graph.document.nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                workflow: { ...document.nodes[0]?.data?.workflow, ...extra },
              },
            })),
          },
        },
      }

      expect(
        Result.isFailure(
          Effect.runSync(Effect.result(decodeSavedWorkflow(malformed)))
        )
      ).toBeTruthy()
    }
  })

  it('rejects future envelope, graph and semantic versions without implicit migration', () => {
    const saved = save(decode(baseWorkflowFixture))

    for (const input of [
      { ...saved, version: 2 },
      { ...saved, workflowVersion: 2 },
      { ...saved, credentials: 'secret' },
      { ...saved, graph: { ...saved.graph, version: 99 } },
      {
        ...saved,
        graph: {
          ...saved.graph,
          document: {
            nodes: [],
            edges: [{ id: 'bad', source: 'missing', target: 'missing' }],
          },
        },
      },
      baseWorkflowFixture,
    ]) {
      expect(
        Result.isFailure(
          Effect.runSync(Effect.result(decodeSavedWorkflow(input)))
        )
      ).toBeTruthy()
    }
  })
})
