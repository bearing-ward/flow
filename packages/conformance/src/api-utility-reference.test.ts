import { readFileSync } from 'node:fs'

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  EdgeIdSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  isEdge,
  isNode,
  NodeIdSchema,
  reconnectEdge,
} from '@flow/core'
import type {
  EdgeChange,
  FlowEdge,
  FlowNode,
  NodeChange,
  ReconnectedEdge,
} from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { ApiUtilityReferenceFixtureSchema } from '../../../scripts/api-utility-reference-schema.ts'

interface UtilityNode extends FlowNode {
  readonly dragging?: boolean
  readonly measured?: { readonly width: number; readonly height: number }
  readonly resizing?: boolean
  readonly width?: number
  readonly height?: number
}

interface ReferenceNodeInput {
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
  readonly data: { readonly label: string }
}

interface ReferenceEdgeInput {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly sourceHandle?: string | null
  readonly targetHandle?: string | null
}

const nodeInputs: readonly ReferenceNodeInput[] = [
  { id: 'a', position: { x: 1, y: 2 }, data: { label: 'A' } },
  { id: 'b', position: { x: 3, y: 4 }, data: { label: 'B' } },
  { id: 'c', position: { x: 5, y: 6 }, data: { label: 'C' } },
]

const edgeInputs: readonly ReferenceEdgeInput[] = [
  {
    id: 'ab',
    source: 'a',
    target: 'b',
    sourceHandle: 'out',
    targetHandle: null,
  },
  { id: 'bc', source: 'b', target: 'c' },
]

const fixture = S.decodeUnknownSync(ApiUtilityReferenceFixtureSchema)(
  JSON.parse(
    readFileSync('research/fixtures/api-utility-reference.json', 'utf-8')
  )
)

const nodeId = (value: string) => S.decodeUnknownSync(NodeIdSchema)(value)

const edgeId = (value: string) => S.decodeUnknownSync(EdgeIdSchema)(value)

const toFlowNode = (node: ReferenceNodeInput): UtilityNode =>
  S.decodeUnknownSync(FlowNodeSchema)({
    ...node,
    // The reference stores label in data.label; Flow requires top-level label.
    label: node.data.label,
  })

const toFlowEdge = (edge: ReferenceEdgeInput): FlowEdge => {
  const mapped = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  }
  // Flow's persisted FlowEdge schema excludes null handles, so null maps to omission.

  return S.decodeUnknownSync(FlowEdgeSchema)(mapped)
}

const toReferenceNode = ({ label: _requiredFlowLabel, ...node }: UtilityNode) =>
  node

type MutableNullableHandles<
  Edge extends {
    readonly sourceHandle?: string | null | undefined
    readonly targetHandle?: string | null | undefined
  },
> = Omit<Edge, 'sourceHandle' | 'targetHandle'> & {
  sourceHandle?: string | null | undefined
  targetHandle?: string | null | undefined
}

const omitNullableHandles = <
  Edge extends {
    readonly sourceHandle?: string | null | undefined
    readonly targetHandle?: string | null | undefined
  },
>(
  edge: Edge
) => {
  // Normalize Flow's omitted nullable handles back to the reference projection.
  const normalized: MutableNullableHandles<Edge> = { ...edge }

  if (
    normalized.sourceHandle === null ||
    normalized.sourceHandle === undefined
  ) {
    delete normalized.sourceHandle
  }

  if (
    normalized.targetHandle === null ||
    normalized.targetHandle === undefined
  ) {
    delete normalized.targetHandle
  }

  return normalized
}

const compareNodeProjection = (nodes: readonly UtilityNode[]) =>
  nodes.map(toReferenceNode)

const compareEdgeProjection = (
  edges: readonly (FlowEdge | ReconnectedEdge<FlowEdge>)[]
) => edges.map(omitNullableHandles)

describe('pinned API utility reference', () => {
  it('matches public Flow utility outputs for the fixed reference inputs', () => {
    const nodeInput = nodeInputs.map(toFlowNode)
    const edgeInput = edgeInputs.map(toFlowEdge)
    const nodeSnapshot = structuredClone(nodeInput)
    const edgeSnapshot = structuredClone(edgeInput)

    const nodeChanges: NodeChange<UtilityNode>[] = [
      { type: 'select', id: nodeId('a'), selected: true },
      {
        type: 'position',
        id: nodeId('a'),
        position: { x: 9, y: 8 },
        dragging: true,
      },
      {
        type: 'dimensions',
        id: nodeId('b'),
        dimensions: { width: 80, height: 40 },
        setAttributes: true,
        resizing: false,
      },
      { type: 'remove', id: nodeId('c') },
      { type: 'select', id: nodeId('c'), selected: true },
      {
        type: 'add',
        index: 1,
        item: toFlowNode({
          id: 'd',
          position: { x: 7, y: 8 },
          data: { label: 'D' },
        }),
      },
    ]

    const edgeChanges: EdgeChange[] = [
      { type: 'select', id: edgeId('ab'), selected: true },
      { type: 'remove', id: edgeId('bc') },
      {
        type: 'add',
        item: toFlowEdge({ id: 'cd', source: 'c', target: 'd' }),
      },
    ]

    const changedNodes = applyNodeChanges(nodeChanges, nodeInput)
    const changedEdges = applyEdgeChanges(edgeChanges, edgeInput)

    const addedEdges = addEdge(
      {
        source: nodeId('a'),
        target: nodeId('c'),
        sourceHandle: null,
        targetHandle: null,
      },
      edgeInput,
      // Upstream's edge input carries `id`; Flow accepts a connection and ID factory.
      { getEdgeId: () => edgeId('ac') }
    )

    const duplicateEdges = addEdge(
      {
        source: nodeId('a'),
        target: nodeId('b'),
        sourceHandle: 'out',
        targetHandle: null,
      },
      edgeInput,
      { getEdgeId: () => edgeId('duplicate') }
    )

    const reconnectInput = structuredClone(edgeInput)
    const reconnectSnapshot = structuredClone(reconnectInput)
    const [oldEdge] = reconnectInput

    if (oldEdge === undefined) {
      throw new Error('The fixed reconnect edge is missing')
    }

    const reconnectedEdges = reconnectEdge(
      oldEdge,
      {
        source: nodeId('b'),
        target: nodeId('c'),
        sourceHandle: 'other',
        targetHandle: null,
      },
      reconnectInput,
      { shouldReplaceId: false }
    )

    const missingReconnect = reconnectEdge(
      toFlowEdge({ id: 'missing', source: 'x', target: 'y' }),
      {
        source: nodeId('a'),
        target: nodeId('c'),
        sourceHandle: null,
        targetHandle: null,
      },
      reconnectInput,
      { shouldReplaceId: false }
    )

    expect(nodeInput).toStrictEqual(nodeSnapshot)
    expect(edgeInput).toStrictEqual(edgeSnapshot)
    expect(reconnectInput).toStrictEqual(reconnectSnapshot)

    const actualUtilities = {
      applyNodeChanges: compareNodeProjection(changedNodes),
      applyEdgeChanges: compareEdgeProjection(changedEdges),
      inputsUnchanged: {
        nodes: compareNodeProjection(nodeInput),
        edges: compareEdgeProjection(edgeInput),
      },
      addEdge: compareEdgeProjection(addedEdges),
      duplicateAddReturnsSameArray: duplicateEdges === edgeInput,
      reconnectEdge: compareEdgeProjection(reconnectedEdges),
      missingReconnectReturnsSameArray: missingReconnect === reconnectInput,
      typePredicates: {
        node: isNode(nodeInputs[0]),
        edge: isEdge(edgeInputs[0]),
        null: { node: isNode(null), edge: isEdge(null) },
      },
    }

    const expectedUtilities = {
      ...fixture.cases.utilities,
      applyEdgeChanges:
        fixture.cases.utilities.applyEdgeChanges.map(omitNullableHandles),
      inputsUnchanged: {
        ...fixture.cases.utilities.inputsUnchanged,
        edges:
          fixture.cases.utilities.inputsUnchanged.edges.map(
            omitNullableHandles
          ),
      },
      addEdge: fixture.cases.utilities.addEdge.map(omitNullableHandles),
      reconnectEdge:
        fixture.cases.utilities.reconnectEdge.map(omitNullableHandles),
    }

    expect(actualUtilities).toStrictEqual(expectedUtilities)
  })
})
