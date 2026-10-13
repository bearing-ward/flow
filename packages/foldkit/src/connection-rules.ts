import { FlowAttribute, FlowSpan } from '@flow/core'
import type { FlowConnection, FlowDocument } from '@flow/core'
import { Effect } from 'effect'

/**
 * React Flow `isValidConnection`. It receives the directed connection and the
 * Runtime's current document, and runs for previews, pointer, click and
 * keyboard connections, and reconnections.
 */
export type FoldkitIsValidConnection = (
  connection: FlowConnection,
  document: FlowDocument
) => boolean

/**
 * Callbacks cannot live in the schema-checked Runtime model, so each Runtime
 * registers its rule here under its instance id.
 */
const rules = new Map<string, FoldkitIsValidConnection>()

export const registerConnectionRule = (
  instanceId: string,
  rule?: FoldkitIsValidConnection
): void => {
  if (rule === undefined) {
    rules.delete(instanceId)

    return
  }

  rules.set(instanceId, rule)
}

export const hasConnectionRule = (instanceId: string): boolean =>
  rules.has(instanceId)

/** Run the registered rule; a throwing rule rejects the connection. */
export const connectionRuleAccepts = (
  instanceId: string,
  connection: FlowConnection,
  document: FlowDocument
): boolean => {
  const rule = rules.get(instanceId)

  if (rule === undefined) {
    return true
  }

  try {
    return rule(connection, document)
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error))

    Effect.runSync(
      Effect.logError('Foldkit isValidConnection callback failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure.name,
          [FlowAttribute.failureMessage]: failure.message,
          [FlowAttribute.inputKind]: 'is-valid-connection',
        }),
        Effect.withSpan(FlowSpan.connectionValidate)
      )
    )

    return false
  }
}

/**
 * Whether a node may be offered as a connection target. A registered
 * `isValidConnection` replaces the static `allowedConnectionTargets` list.
 */
export const connectionTargetOffered = (
  instanceId: string,
  allowedTargets: readonly string[],
  nodeId: string
): boolean => hasConnectionRule(instanceId) || allowedTargets.includes(nodeId)

/**
 * The canvas rule for a new connection whose gesture ended on `toNodeId`:
 * the static target list, or the callback when one is registered.
 */
export const connectionPermitted = (
  instanceId: string,
  allowedTargets: readonly string[],
  toNodeId: string,
  connection: FlowConnection,
  document: FlowDocument
): boolean =>
  hasConnectionRule(instanceId)
    ? connectionRuleAccepts(instanceId, connection, document)
    : allowedTargets.includes(toNodeId)
