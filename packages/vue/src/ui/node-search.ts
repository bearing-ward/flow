import {
  nextListIndex,
  searchFlowNodes,
  selectOnlyNodeTransaction,
} from '@flow/core'
import type { FlowNode, FlowNodeSearchResult } from '@flow/core'
import { defineComponent, h, ref, useId } from 'vue'
import type { DeepReadonly, PropType } from 'vue'

import { FlowPanel } from '../ui.ts'
import type { FlowPanelPosition } from '../ui.ts'
import { useFlow } from '../use-flow.ts'

type SearchNode = DeepReadonly<FlowNode>

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

/** React Flow UI Node Search: a combobox over node labels with keyboard navigation. */
export const FlowNodeSearch = defineComponent({
  name: 'FlowNodeSearch',
  props: {
    position: {
      type: String as PropType<FlowPanelPosition>,
      default: 'top-left',
    },
    ariaLabel: { type: String, default: 'Node search' },
    placeholder: { type: String, default: 'Search nodes...' },
    /** Replace the default lowercase label search. */
    onSearch: {
      type: Function as PropType<(query: string) => readonly SearchNode[]>,
      default: undefined,
    },
    /** Replace the default select-and-centre behavior. */
    onSelectNode: {
      type: Function as PropType<(node: SearchNode) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const flow = useFlow()
    const id = `flow-vue-node-search-${useId()}`
    const query = ref('')
    const results = ref<readonly FlowNodeSearchResult[]>([])
    const active = ref(-1)

    const search = (text: string): readonly FlowNodeSearchResult[] =>
      props.onSearch === undefined
        ? searchFlowNodes(flow.nodes.value, text)
        : props.onSearch(text).map((node) => ({
            id: node.id,
            label: node.label,
          }))

    const selectAndCentre = async (node: SearchNode): Promise<void> => {
      await flow.applyEdit(
        selectOnlyNodeTransaction(flow.document.value, node.id)
      )

      const internal = flow.getInternalNode(node.id)
      const position = internal?.absolutePosition ?? node.position

      await flow.setCenter(
        position.x + (internal?.width ?? 0) / 2,
        position.y + (internal?.height ?? 0) / 2,
        { zoom: flow.getViewport().zoom }
      )
    }

    const choose = (index: number): void => {
      const result = results.value[index]
      const node = result === undefined ? undefined : flow.getNode(result.id)

      if (node === undefined) {
        return
      }

      query.value = node.label
      results.value = []
      active.value = -1

      if (props.onSelectNode === undefined) {
        void selectAndCentre(node)
      } else {
        props.onSelectNode(node)
      }
    }

    const onInput = (event: Event): void => {
      if (!(event.target instanceof HTMLInputElement)) {
        return
      }

      query.value = event.target.value
      results.value = search(query.value)
      active.value = results.value.length > 0 ? 0 : -1
    }

    const onKeydown = (event: KeyboardEvent): void => {
      // Typing in the search never reaches canvas shortcuts.
      event.stopPropagation()

      if (event.key === 'Enter') {
        event.preventDefault()
        choose(active.value)

        return
      }

      if (event.key === 'Escape') {
        results.value = []
        active.value = -1

        return
      }

      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return
      }

      const next = nextListIndex(active.value, results.value.length, event.key)

      if (next !== undefined) {
        event.preventDefault()
        active.value = next
      }
    }

    return () => {
      const open = results.value.length > 0

      return h(
        FlowPanel,
        {
          position: props.position,
          class: 'flow-vue-node-search',
          role: 'search',
          'aria-label': props.ariaLabel,
        },
        {
          default: () => [
            h('input', {
              type: 'search',
              class: 'flow-vue-node-search-input',
              role: 'combobox',
              value: query.value,
              placeholder: props.placeholder,
              'aria-label': 'Search nodes',
              'aria-autocomplete': 'list',
              'aria-controls': `${id}-results`,
              'aria-expanded': String(open),
              'aria-activedescendant':
                open && active.value >= 0
                  ? `${id}-option-${active.value}`
                  : undefined,
              onInput,
              onKeydown,
            }),
            h(
              'ul',
              {
                id: `${id}-results`,
                class: 'flow-vue-node-search-results',
                role: 'listbox',
                'aria-label': 'Matching nodes',
                hidden: !open,
              },
              results.value.map((result, index) =>
                h(
                  'li',
                  {
                    key: result.id,
                    id: `${id}-option-${index}`,
                    class: 'flow-vue-node-search-option',
                    role: 'option',
                    'aria-selected': String(index === active.value),
                    'data-node-search-result': result.id,
                    // Keep focus in the combobox while choosing with a pointer.
                    onPointerdown: (event: PointerEvent) =>
                      event.preventDefault(),
                    onClick: () => choose(index),
                  },
                  result.label
                )
              )
            ),
          ],
        }
      )
    }
  },
})

/* eslint-enable anti-slop/require-safety-comment-for-type-assertion */
