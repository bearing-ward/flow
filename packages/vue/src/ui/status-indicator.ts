import { Schema } from 'effect'
import { defineComponent, h } from 'vue'
import type { PropType } from 'vue'

export const FlowStatusSchema = Schema.Literals(['waiting', 'ready', 'error'])

export type FlowStatus = typeof FlowStatusSchema.Type

export const StatusIndicator = defineComponent({
  name: 'StatusIndicator',
  props: {
    status: {
      // SAFETY: The schema validator below rejects values outside FlowStatus.
      type: String as PropType<FlowStatus>,
      required: true,
      validator: (value: string): boolean => Schema.is(FlowStatusSchema)(value),
    },
    label: { type: String, default: 'Status' },
  },
  setup(props) {
    const statusText = (): string => {
      const labels: Record<FlowStatus, string> = {
        waiting: 'Waiting',
        ready: 'Ready',
        error: 'Error',
      }

      return labels[props.status]
    }

    return () => {
      const text = statusText()

      return h(
        'span',
        {
          class: [
            'flow-vue-status-indicator',
            `flow-vue-status-indicator--${props.status}`,
          ],
          role: 'status',
          'aria-label': `${props.label}: ${text}`,
          'data-status': props.status,
        },
        [
          h('span', {
            class: 'flow-vue-status-indicator__dot',
            'aria-hidden': 'true',
          }),
          h('span', text),
        ]
      )
    }
  },
})
