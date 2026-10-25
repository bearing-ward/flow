import type {
  FlowDocument,
  FlowEditTransactionInput,
  FlowHistoryStatus,
} from '@flow/core'

/** Browser proofs call the same public APIs as the visible recipe controls. */
export interface GroupingFixture {
  readonly read: () => Promise<{
    readonly document: FlowDocument
    readonly history: FlowHistoryStatus
  }>
  readonly edit: (input: FlowEditTransactionInput) => Promise<void>
  readonly undo: () => Promise<void>
  readonly redo: () => Promise<void>
  readonly saveLoad: () => Promise<void>
  readonly zoom: () => Promise<void>
}

declare global {
  var flowGroupingFixture: GroupingFixture | undefined
}
