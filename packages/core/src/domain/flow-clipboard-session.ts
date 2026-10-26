import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import {
  copyFlowSelection,
  createFlowClipboard,
  decodeFlowGraphFragment,
  FlowPasteOptionsSchema,
  pasteFlowGraphFragment,
} from './flow-clipboard.ts'
import type { FlowGraphFragment, FlowPasteOptions } from './flow-clipboard.ts'
import type { FlowEditResult, FlowEditTransaction } from './flow-edit.schema.ts'
import type { FlowDocument } from './flow.schema.ts'

export interface FlowClipboardActions {
  readonly copySelection: () => FlowGraphFragment | null
  readonly pasteSelection: (
    options?: FlowPasteOptions
  ) => Promise<FlowEditResult>
  readonly setClipboardFragment: (
    input: Parameters<typeof decodeFlowGraphFragment>[0]
  ) => void
}

const run = <A, E>(workflow: Effect.Effect<A, E>): A =>
  Effect.runSync(
    workflow.pipe(
      Effect.tapError((failure) =>
        Effect.logWarning('Graph clipboard failed').pipe(
          Effect.annotateLogs({
            [FlowAttribute.failureMessage]: String(failure),
          }),
          Effect.withSpan(FlowSpan.editFailure)
        )
      )
    )
  )

/** A mounted host supplies accepted reads and serial atomic edits. No browser capabilities. */
export const createFlowClipboardSession = (owner: {
  readonly getDocument: () => FlowDocument
  readonly applyEdit: (
    resolve: (document: FlowDocument) => FlowEditTransaction
  ) => Promise<FlowEditResult>
  readonly isDisposed: () => boolean
}): FlowClipboardActions => {
  let state = createFlowClipboard()

  return {
    copySelection: () => {
      if (owner.isDisposed()) {
        return null
      }

      state = run(copyFlowSelection(owner.getDocument()))

      return structuredClone(state.fragment)
    },
    setClipboardFragment: (input) => {
      if (!owner.isDisposed()) {
        state = { fragment: run(decodeFlowGraphFragment(input)), pasteCount: 0 }
      }
    },
    pasteSelection: (options = {}) => {
      const decoded = run(
        S.decodeUnknownEffect(FlowPasteOptionsSchema)(options)
      )

      return owner.applyEdit((document) => {
        const { state: nextState, transaction } = pasteFlowGraphFragment(
          state,
          document,
          decoded
        )

        state = nextState

        return transaction
      })
    },
  }
}
