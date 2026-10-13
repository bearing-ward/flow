import { applyEdgeChanges, applyNodeChanges } from '@flow/core'
import type { EdgeChange, FlowEdge, FlowNode, NodeChange } from '@flow/core'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

type ListUpdate<Item> = readonly Item[] | ((items: Item[]) => readonly Item[])

const isListUpdater = <Item>(
  update: ListUpdate<Item>
): update is (items: Item[]) => readonly Item[] =>
  // eslint-disable-next-line anti-slop/no-runtime-typeof -- callback discrimination is the public adapter boundary; functions stay out of serialized core operations.
  typeof update === 'function'

const listState = <Item>(initial: readonly Item[]) => {
  const items = shallowRef<Item[]>([...initial])

  const setItems = (update: ListUpdate<Item>): void => {
    items.value = [...(isListUpdater(update) ? update(items.value) : update)]
  }

  return { items, setItems }
}

export type UseNodesStateResult<N extends FlowNode = FlowNode> = readonly [
  nodes: ShallowRef<N[]>,
  setNodes: (update: ListUpdate<N>) => void,
  onNodesChange: (changes: readonly NodeChange<N>[]) => void,
]

export type UseEdgesStateResult<E extends FlowEdge = FlowEdge> = readonly [
  edges: ShallowRef<E[]>,
  setEdges: (update: ListUpdate<E>) => void,
  onEdgesChange: (changes: readonly EdgeChange<E>[]) => void,
]

/**
 * React Flow `useNodesState` for controlled split binding:
 * `<FlowCanvas :nodes="nodes" @nodes-change="onNodesChange" />`.
 */
export const useNodesState = <N extends FlowNode = FlowNode>(
  initial: readonly N[]
): UseNodesStateResult<N> => {
  const { items, setItems } = listState(initial)

  return [
    items,
    setItems,
    (changes) => {
      items.value = applyNodeChanges(changes, items.value)
    },
  ]
}

/** React Flow `useEdgesState`; pair it with the `edgesChange` event. */
export const useEdgesState = <E extends FlowEdge = FlowEdge>(
  initial: readonly E[]
): UseEdgesStateResult<E> => {
  const { items, setItems } = listState(initial)

  return [
    items,
    setItems,
    (changes) => {
      items.value = applyEdgeChanges(changes, items.value)
    },
  ]
}
