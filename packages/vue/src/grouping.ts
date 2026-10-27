import { getInternalNodeLayoutBounds, prepareFlowGrouping } from '@flow/core'
import type { FlowGroupingActionInput } from '@flow/core'
import { Effect } from 'effect'

import { useFlow } from './use-flow.ts'

/** Uses the current canvas owner, including controlled acceptance and history. */
export const useFlowGrouping = () => {
  const flow = useFlow()

  return {
    execute: (action: FlowGroupingActionInput) => {
      const bounds = new Map(
        flow.nodes.value.flatMap(({ id }) => {
          const internal = flow.getInternalNode(id)

          return internal?.measurementStatus === 'measured'
            ? [[id, getInternalNodeLayoutBounds(internal).bounds] as const]
            : []
        })
      )

      const transaction = Effect.runSync(
        prepareFlowGrouping(flow.getSnapshot().document, bounds, action)
      )

      return flow.applyEdit(transaction)
    },
  }
}
