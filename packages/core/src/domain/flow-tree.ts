import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import { prepareFlowEdit } from './flow-edit.ts'
import { flowTreeData } from './flow-tree.schema.ts'
import { EdgeIdSchema, NodeIdSchema } from './flow-values.ts'
import { decodeFlowDocument, FlowNodeSchema } from './flow.schema.ts'
import type { FlowDocument, FlowNode, NodeId } from './flow.schema.ts'

const tagged = S.TaggedError

export class InvalidFlowTree extends tagged<InvalidFlowTree>()(
  'InvalidFlowTree',
  {
    reason: S.String,
  }
) {}

/** Explicit tree boundary, including all descendants, even when collapsed/hidden. */
export const decodeFlowTree = (
  input: Parameters<typeof decodeFlowDocument>[0]
) =>
  Effect.gen(function* decodeTree() {
    const document = yield* decodeFlowDocument(input)
    const parents = new Map<NodeId, NodeId>()
    const children = new Map<NodeId, NodeId[]>()

    for (const node of document.nodes) {
      if (flowTreeData(node) === undefined || node.parentId !== undefined) {
        return yield* new InvalidFlowTree({
          reason:
            'Every tree node requires version-1 tree data and graph-space coordinates',
        })
      }
    }

    for (const edge of document.edges) {
      if (parents.has(edge.target)) {
        return yield* new InvalidFlowTree({
          reason: 'Tree nodes must have exactly one incoming parent edge',
        })
      }

      parents.set(edge.target, edge.source)
      const list = children.get(edge.source) ?? []
      list.push(edge.target)
      children.set(edge.source, list)
    }

    const visited = new Set<NodeId>()
    const roots = document.nodes.filter(({ id }) => !parents.has(id))
    const pending = roots.map(({ id }) => id)

    while (pending.length > 0) {
      const id = pending.pop()

      if (id !== undefined) {
        if (visited.has(id)) {
          return yield* new InvalidFlowTree({ reason: 'Tree contains a cycle' })
        }

        visited.add(id)
        pending.push(...(children.get(id) ?? []))
      }
    }

    if (visited.size !== document.nodes.length) {
      return yield* new InvalidFlowTree({ reason: 'Tree contains a cycle' })
    }

    if (document.nodes.length > 0 && roots.length !== 1) {
      return yield* new InvalidFlowTree({
        reason: 'Tree requires a single root',
      })
    }

    if (
      document.nodes.some(
        (node) =>
          flowTreeData(node)?.kind === 'placeholder' && children.has(node.id)
      )
    ) {
      return yield* new InvalidFlowTree({
        reason: 'Placeholders must be leaves',
      })
    }

    return document
  }).pipe(
    Effect.withSpan(FlowSpan.documentDecode),
    Effect.tap(() => Effect.logDebug('Tree decoded'))
  )

const newNode = {
  id: NodeIdSchema,
  label: S.String,
}

export const FlowTreeEditSchema = S.Union([
  S.Struct({ kind: S.Literal('create-root'), ...newNode }),
  S.Struct({ kind: S.Literal('toggle'), nodeId: NodeIdSchema }),
  S.Struct({
    kind: S.Literal('promote'),
    nodeId: NodeIdSchema,
    label: S.String,
  }),
  S.Struct({
    kind: S.Literal('add-child'),
    parentId: NodeIdSchema,
    ...newNode,
    edgeId: EdgeIdSchema,
    placeholder: S.optional(S.Boolean),
  }),
  S.Struct({
    kind: S.Literal('insert'),
    edgeId: EdgeIdSchema,
    ...newNode,
    newEdgeId: EdgeIdSchema,
  }),
  S.Struct({ kind: S.Literal('delete-subtree'), nodeId: NodeIdSchema }),
])

export type FlowTreeEdit = typeof FlowTreeEditSchema.Type

export const createFlowTreeNode = (input: {
  readonly id: string
  readonly label: string
  readonly placeholder?: boolean | undefined
  readonly position?: FlowNode['position'] | undefined
}): FlowNode =>
  S.decodeUnknownSync(FlowNodeSchema)({
    id: input.id,
    label: input.label,
    position: input.position ?? { x: 60, y: 60 },
    size: { width: 150, height: 60 },
    data: {
      tree: {
        version: 1,
        kind: input.placeholder === true ? 'placeholder' : 'node',
        expanded: true,
      },
    },
    sourcePosition: 'bottom',
    targetPosition: 'top',
  })

const insertTreeNode = (
  document: FlowDocument,
  command: Extract<FlowTreeEdit, { kind: 'insert' }>
) =>
  Effect.gen(function* insert() {
    const edge = document.edges.find(({ id }) => id === command.edgeId)

    if (edge === undefined) {
      return yield* new InvalidFlowTree({
        reason: 'Insertion edge no longer exists',
      })
    }

    const source = document.nodes.find(({ id }) => id === edge.source)
    const target = document.nodes.find(({ id }) => id === edge.target)

    const node = createFlowTreeNode({
      ...command,
      position: {
        x: ((source?.position.x ?? 0) + (target?.position.x ?? 0)) / 2,
        y: ((source?.position.y ?? 0) + (target?.position.y ?? 0)) / 2,
      },
    })

    return {
      ...document,
      nodes: [...document.nodes, node],
      edges: [
        ...document.edges.map((current) =>
          current.id === edge.id
            ? { ...current, target: node.id, targetHandle: undefined }
            : current
        ),
        {
          ...edge,
          id: command.newEdgeId,
          source: node.id,
          sourceHandle: undefined,
        },
      ],
    }
  })

const freshTreeId = (document: FlowDocument, prefix: string): string => {
  const used = new Set<string>(
    [...document.nodes, ...document.edges].map(({ id }) => id)
  )

  let id = prefix
  let sequence = 0

  while (used.has(id)) {
    sequence += 1
    id = `${prefix}-${sequence}`
  }

  return id
}

/** One validated semantic command, ready for ordinary or animated host acceptance. */
export const prepareFlowTreeEdit = (
  document: FlowDocument,
  input: typeof FlowTreeEditSchema.Encoded
) =>
  Effect.gen(function* prepareTreeEdit() {
    yield* decodeFlowTree(document)
    const command = yield* S.decodeUnknownEffect(FlowTreeEditSchema)(input)
    let next = document

    if (command.kind === 'create-root') {
      if (document.nodes.length !== 0) {
        return yield* new InvalidFlowTree({ reason: 'Root already exists' })
      }

      next = { ...document, nodes: [createFlowTreeNode(command)] }
    } else if (command.kind === 'insert') {
      next = yield* insertTreeNode(document, command)
    } else {
      const id =
        command.kind === 'add-child' ? command.parentId : command.nodeId

      const node = document.nodes.find((current) => current.id === id)
      const tree = flowTreeData(node)

      if (node === undefined || tree === undefined) {
        return yield* new InvalidFlowTree({
          reason: 'Tree node no longer exists',
        })
      }

      switch (command.kind) {
        case 'toggle': {
          next = {
            ...document,
            nodes: document.nodes.map((current) =>
              current.id === id
                ? {
                    ...current,
                    data: {
                      ...current.data,
                      tree: { ...tree, expanded: !tree.expanded },
                    },
                  }
                : current
            ),
          }
          break
        }

        case 'promote': {
          if (tree.kind !== 'placeholder') {
            return yield* new InvalidFlowTree({
              reason: 'Only placeholders can be promoted',
            })
          }

          const child = createFlowTreeNode({
            id: freshTreeId(document, `${id}-placeholder`),
            label: '+',
            placeholder: true,
            position: { x: node.position.x, y: node.position.y + 120 },
          })

          next = {
            ...document,
            edges: [
              ...document.edges,
              {
                id: EdgeIdSchema.make(
                  freshTreeId(document, `${id}-placeholder-edge`)
                ),
                source: id,
                target: child.id,
              },
            ],
            nodes: [
              ...document.nodes.map((current) =>
                current.id === id
                  ? {
                      ...current,
                      label: command.label,
                      data: {
                        ...current.data,
                        tree: { ...tree, kind: 'node' },
                      },
                    }
                  : current
              ),
              child,
            ],
          }
          break
        }

        case 'add-child': {
          if (tree.kind === 'placeholder') {
            return yield* new InvalidFlowTree({
              reason: 'Promote a placeholder before adding children',
            })
          }

          const child = createFlowTreeNode({
            ...command,
            position: { x: node.position.x, y: node.position.y + 120 },
          })

          next = {
            ...document,
            nodes: [...document.nodes, child],
            edges: [
              ...document.edges,
              { id: command.edgeId, source: id, target: child.id },
            ],
          }
          break
        }

        case 'delete-subtree': {
          const removed = new Set<NodeId>([id])
          let previous = -1

          while (previous !== removed.size) {
            previous = removed.size

            for (const edge of document.edges) {
              if (removed.has(edge.source)) {
                removed.add(edge.target)
              }
            }
          }

          next = {
            ...document,
            nodes: document.nodes.filter((current) => !removed.has(current.id)),
            edges: document.edges.filter(
              (edge) => !removed.has(edge.source) && !removed.has(edge.target)
            ),
          }
          break
        }

        default: {
          const exhaustive: never = command

          return exhaustive
        }
      }
    }

    yield* decodeFlowTree(next)

    const transaction: FlowEditTransaction = {
      operations: [
        { kind: 'set-nodes', nodes: next.nodes },
        { kind: 'set-edges', edges: next.edges },
      ],
    }

    yield* prepareFlowEdit(document, transaction)

    return transaction
  }).pipe(
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'tree' },
    }),
    Effect.tapError((cause) =>
      Effect.logWarning('Tree edit rejected').pipe(
        Effect.annotateLogs({ [FlowAttribute.failureName]: cause._tag }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    )
  )
