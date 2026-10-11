import { Effect, Predicate } from 'effect'

import { decodeFlowDocument } from '../../packages/core/src/public.ts'
import type {
  FlowDocumentSchema,
  SavedVersionedFlowSession,
} from '../../packages/core/src/public.ts'

export const persistenceDocument = (
  extended: boolean
): typeof FlowDocumentSchema.Encoded => {
  const node = {
    id: 'node',
    label: 'Node',
    position: { x: 20, y: 30 },
    data: { nested: { value: 1 }, list: [{ value: 2 }] },
  }

  const edge = {
    id: 'edge',
    source: 'node',
    target: 'node',
    data: { nested: { value: 1 }, list: [{ value: 2 }] },
  }

  const input = { nodes: [node], edges: [edge] }

  if (extended) {
    Object.assign(input, { nodeOrigin: [0, 0] })
    Object.assign(node, {
      origin: [-0.5, 1.5],
      connectable: false,
      ariaRole: '',
      ariaLabel: '',
      ariaDescription: '',
    })
    Object.assign(edge, { ariaRole: '', ariaLabel: '' })
  }

  return Effect.runSync(decodeFlowDocument(input))
}

export const mutateSavedData = (saved: SavedVersionedFlowSession) => {
  for (const value of [
    ...saved.document.nodes.map((node) => node.data),
    ...saved.document.edges.map((edge) => edge.data),
  ]) {
    if (
      value === undefined ||
      !Predicate.isObject(value.nested) ||
      !Array.isArray(value.list)
    ) {
      throw new Error('Missing saved nested data')
    }

    Object.assign(value.nested, { value: 99 })
    value.list.push({ value: 100 })

    if (
      !('value' in value.nested) ||
      value.nested.value !== 99 ||
      value.list.length !== 2
    ) {
      throw new Error('Actual saved output mutation failed')
    }
  }
}
