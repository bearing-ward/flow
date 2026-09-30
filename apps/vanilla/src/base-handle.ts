import type { FlowHandle } from '@flow/core'

export interface FlowBaseHandleOptions {
  readonly id: FlowHandle['id']
  readonly kind: FlowHandle['kind']
  readonly side: FlowHandle['side']
}

/**
 * Describe one native Vanilla connection handle for a Flow node.
 *
 * The mounted canvas owns the focusable DOM control and connection lifecycle;
 * this recipe returns the serializable handle descriptor consumed by the
 * existing public node contract.
 */
export const createFlowBaseHandle = (
  options: FlowBaseHandleOptions
): FlowHandle => ({
  id: options.id,
  kind: options.kind,
  side: options.side,
})
