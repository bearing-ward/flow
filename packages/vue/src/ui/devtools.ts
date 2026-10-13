import {
  describeFlowStateChange,
  devToolsEdgeRows,
  devToolsNodeRows,
  formatViewportLog,
} from '@flow/core'
import type { FlowChangeLogEntry } from '@flow/core'
import { defineComponent, h, onScopeDispose, ref } from 'vue'
import type { PropType, VNode } from 'vue'

import { FlowControlButton, FlowPanel } from '../ui.ts'
import type { FlowPanelPosition } from '../ui.ts'
import { useFlow } from '../use-flow.ts'

export type FlowDevToolsPanel = 'viewport' | 'nodes' | 'changes'

const panelLabels: Record<FlowDevToolsPanel, string> = {
  viewport: 'Viewport logger',
  nodes: 'Node inspector',
  changes: 'Change logger',
}

const panels: readonly FlowDevToolsPanel[] = ['viewport', 'nodes', 'changes']

/* eslint-disable anti-slop/require-safety-comment-for-type-assertion -- SAFETY: Vue requires PropType assertions to retain generic runtime prop contracts. */

/**
 * React Flow UI DevTools: toggleable viewport logger, node inspector and
 * change logger fed from the canvas's public snapshots.
 */
export const FlowDevTools = defineComponent({
  name: 'FlowDevTools',
  props: {
    position: {
      type: String as PropType<FlowPanelPosition>,
      default: 'top-right',
    },
    ariaLabel: { type: String, default: 'Flow devtools' },
    /** Panels shown on mount. Defaults to none, like React Flow UI DevTools. */
    open: {
      type: Array as PropType<readonly FlowDevToolsPanel[]>,
      default: () => [],
    },
    /** Maximum change log entries kept, newest first. */
    maxChanges: { type: Number, default: 50 },
  },
  setup(props) {
    const flow = useFlow()
    const opened = ref(new Set<FlowDevToolsPanel>(props.open))
    const changes = ref<readonly (FlowChangeLogEntry & { key: number })[]>([])
    let nextKey = 0

    const stop = flow.subscribeState((change) => {
      const entries = describeFlowStateChange(change).map((entry) => {
        nextKey += 1

        return { ...entry, key: nextKey }
      })

      if (entries.length > 0) {
        changes.value = [...entries.toReversed(), ...changes.value].slice(
          0,
          props.maxChanges
        )
      }
    })

    onScopeDispose(stop)

    const toggle = (panel: FlowDevToolsPanel): void => {
      const next = new Set(opened.value)

      if (next.has(panel)) {
        next.delete(panel)
      } else {
        next.add(panel)
      }

      opened.value = next
    }

    const section = (panel: FlowDevToolsPanel, children: VNode[]) =>
      h(
        'section',
        {
          class: ['flow-vue-devtools-panel', `flow-vue-devtools-${panel}`],
          'aria-label': panelLabels[panel],
          'data-devtools-panel': panel,
          hidden: !opened.value.has(panel),
        },
        children
      )

    return () => {
      const document = flow.document.value

      return h(
        FlowPanel,
        {
          position: props.position,
          class: 'flow-vue-devtools',
          'aria-label': props.ariaLabel,
          onKeydown: (event: KeyboardEvent) => event.stopPropagation(),
        },
        {
          default: () => [
            h(
              'div',
              {
                class: 'flow-vue-devtools-toggles',
                role: 'toolbar',
                'aria-label': 'Devtools panels',
              },
              panels.map((panel) =>
                h(
                  FlowControlButton,
                  {
                    'aria-pressed': String(opened.value.has(panel)),
                    'data-devtools-toggle': panel,
                    onClick: () => toggle(panel),
                  },
                  { default: () => panelLabels[panel] }
                )
              )
            ),
            section('viewport', [
              h(
                'output',
                { class: 'flow-vue-devtools-viewport-value' },
                formatViewportLog(flow.viewport.value)
              ),
            ]),
            section('nodes', [
              h(
                'ul',
                { 'aria-label': 'Nodes' },
                devToolsNodeRows(document).map((row) =>
                  h(
                    'li',
                    { key: row.id, 'data-devtools-node': row.id },
                    `${row.id} "${row.label}" ${row.type} (${row.x}, ${row.y})${row.selected ? ' selected' : ''}${row.hidden ? ' hidden' : ''}`
                  )
                )
              ),
              h(
                'ul',
                { 'aria-label': 'Edges' },
                devToolsEdgeRows(document).map((row) =>
                  h(
                    'li',
                    { key: row.id, 'data-devtools-edge': row.id },
                    `${row.id} ${row.source} -> ${row.target}${row.selected ? ' selected' : ''}`
                  )
                )
              ),
            ]),
            section('changes', [
              h(
                'ol',
                {
                  role: 'log',
                  'aria-label': 'Changes',
                  'aria-live': 'polite',
                },
                changes.value.map((entry) =>
                  h(
                    'li',
                    { key: entry.key, 'data-change-kind': entry.kind },
                    entry.text
                  )
                )
              ),
            ]),
          ],
        }
      )
    }
  },
})

/* eslint-enable anti-slop/require-safety-comment-for-type-assertion */
