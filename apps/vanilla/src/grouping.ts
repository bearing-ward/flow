import { getInternalNodeLayoutBounds, prepareFlowGrouping } from '@flow/core'
import type { FlowGroupingActionInput } from '@flow/core'
import { Effect } from 'effect'

import type { JavaScriptFlowController } from './mount-flow.ts'

/** Commands use the controller's accepted document and current measured geometry. */
export const createFlowGrouping = (controller: JavaScriptFlowController) => ({
  execute: (action: FlowGroupingActionInput) => {
    const { document } = controller.getSnapshot()

    const bounds = new Map(
      document.nodes.flatMap(({ id }) => {
        const internal = controller.getInternalNode(id)

        return internal?.measurementStatus === 'measured'
          ? [[id, getInternalNodeLayoutBounds(internal).bounds] as const]
          : []
      })
    )

    return controller.applyEdit(
      Effect.runSync(prepareFlowGrouping(document, bounds, action))
    )
  },
})
