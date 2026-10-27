import { FlowAttribute, FlowSpan } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import { Effect, Fiber, Result, Schema as S } from 'effect'
import type { Scope } from 'effect'

import type { WorkflowAiCapabilities } from './workflow-ai.schema.ts'
import {
  WorkflowOutputsSchema,
  WorkflowRunIdSchema,
  WorkflowRuntimeError,
} from './workflow-execution.schema.ts'
import type {
  WorkflowNodeEvent,
  WorkflowOutputs,
  WorkflowRunEvent,
  WorkflowRunRequest,
  WorkflowValue,
} from './workflow-execution.schema.ts'
import { prepareWorkflowExecution } from './workflow-preparation.ts'
import type {
  WorkflowExecutionPlan,
  WorkflowPreparationFailure,
} from './workflow-preparation.ts'
import type { WorkflowNodeData, WorkflowPort } from './workflow.schema.ts'

export interface WorkflowEvaluation {
  readonly onText?: (text: string) => void
  readonly nodeId: WorkflowNodeEvent['nodeId']
  readonly workflow: WorkflowNodeData
  readonly inputs: readonly {
    readonly port: WorkflowPort
    readonly value: WorkflowValue
  }[]
}

export type WorkflowEvaluator = (
  evaluation: WorkflowEvaluation
) => Effect.Effect<WorkflowOutputs, WorkflowRuntimeError>

export interface WorkflowRunSession {
  readonly request: WorkflowRunRequest
  readonly cancel: Effect.Effect<void>
  readonly await: Effect.Effect<void>
}

const textOutput = (text: string): WorkflowValue => ({ kind: 'text', text })

/** Deterministic local evaluation. AI providers are a separate, later capability. */
export const evaluateOfflineWorkflowNode: WorkflowEvaluator = ({
  workflow,
  inputs,
}) => {
  const text = inputs.find((input) => input.port.role === 'input')?.value
  const value = text?.kind === 'text' ? text.text : undefined

  switch (workflow.kind) {
    case 'initial': {
      return Effect.succeed({ output: textOutput(workflow.config.value) })
    }

    case 'text-input': {
      return Effect.succeed({ output: textOutput(workflow.config.text) })
    }

    case 'workflow-trigger': {
      return Effect.succeed({ output: { kind: 'trigger' } })
    }

    case 'transform': {
      if (value === undefined) {
        return Effect.fail(new WorkflowRuntimeError({ code: 'invalid-input' }))
      }

      const operations = {
        uppercase: () => value.toUpperCase(),
        lowercase: () => value.toLowerCase(),
        trim: () => value.trim(),
      }

      return Effect.succeed({
        output: textOutput(operations[workflow.config.operation]()),
      })
    }

    case 'branch': {
      if (value === undefined) {
        return Effect.fail(new WorkflowRuntimeError({ code: 'invalid-input' }))
      }

      const matches =
        workflow.config.operator === 'equals'
          ? value === workflow.config.value
          : value.includes(workflow.config.value)

      return Effect.succeed({ [matches ? 'true' : 'false']: textOutput(value) })
    }

    case 'join': {
      return Effect.succeed({
        output: textOutput(
          inputs
            .flatMap((input) =>
              input.value.kind === 'text' ? [input.value.text] : []
            )
            .join(workflow.config.separator)
        ),
      })
    }

    case 'output': {
      const input = inputs.find((item) => item.port.role === 'input')?.value

      return input?.kind === workflow.config.format
        ? Effect.succeed({ result: input })
        : Effect.fail(new WorkflowRuntimeError({ code: 'invalid-input' }))
    }

    case 'generate-text':
    case 'generate-image': {
      return Effect.fail(new WorkflowRuntimeError({ code: 'unsupported-kind' }))
    }

    default: {
      const exhaustive: never = workflow

      return exhaustive
    }
  }
}

const freezeSnapshot = <A>(value: A): void => {
  if (value === null || value === undefined || Object.isFrozen(value)) {
    return
  }

  Object.freeze(value)

  for (const child of Object.values(value)) {
    freezeSnapshot(child)
  }
}

const validOutputs = (
  outputs: WorkflowOutputs,
  step: WorkflowExecutionPlan['steps'][number],
  workflow: WorkflowNodeData
): boolean => {
  if (workflow.kind === 'output') {
    return (
      Object.keys(outputs).length === 1 &&
      outputs.result?.kind === workflow.config.format
    )
  }

  const keys = Object.keys(outputs)

  return (
    keys.length === (workflow.kind === 'branch' ? 1 : step.outputs.length) &&
    keys.every((key) =>
      step.outputs.some(
        (port) => port.role === key && port.valueType === outputs[key]?.kind
      )
    )
  )
}

/** Revalidates a fresh accepted revision, detaches it, and starts a scope-owned fiber. */
export const startWorkflowRun = (
  accepted: { readonly document: FlowDocument; readonly revision: number },
  options: {
    readonly runId: unknown
    readonly expectedRevision: number
    readonly onEvent: (event: WorkflowRunEvent) => void
    readonly evaluate?: WorkflowEvaluator
    readonly capabilities?: WorkflowAiCapabilities
  }
): Effect.Effect<WorkflowRunSession, WorkflowPreparationFailure, Scope.Scope> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* startRun() {
      const runId = yield* restore(
        S.decodeUnknownEffect(WorkflowRunIdSchema)(options.runId)
      )

      const plan = yield* restore(
        prepareWorkflowExecution(
          accepted,
          options.expectedRevision,
          options.capabilities
        )
      )

      const request: WorkflowRunRequest = {
        runId,
        revision: plan.revision,
        document: plan.document,
      }

      freezeSnapshot(request)
      const identity = { runId, revision: plan.revision }
      const states = new Map<string, WorkflowNodeEvent['state']>()
      const results = new Map<string, WorkflowOutputs>()

      const emit = (event: WorkflowRunEvent) =>
        Effect.sync(() => {
          freezeSnapshot(event)
          options.onEvent(event)
        })

      const nodeEvent = (event: WorkflowNodeEvent) =>
        Effect.gen(function* publishNode() {
          states.set(event.nodeId, event.state)
          yield* emit({ kind: 'node', event })
        })

      const settlePending = (state: 'cancelled' | 'skipped') =>
        Effect.gen(function* settleNodes() {
          for (const step of plan.steps) {
            const previous = states.get(step.nodeId)

            if (previous === 'queued' || previous === 'running') {
              yield* nodeEvent({ ...identity, nodeId: step.nodeId, state })
            }
          }
        })

      yield* emit({ kind: 'run', ...identity, state: 'queued' })

      for (const step of plan.steps) {
        yield* nodeEvent({ ...identity, nodeId: step.nodeId, state: 'queued' })
      }

      const execute = Effect.gen(function* executeRun() {
        yield* emit({ kind: 'run', ...identity, state: 'running' })
        yield* Effect.logDebug('Started workflow run')

        for (const step of plan.steps) {
          const workflow = request.document.nodes.find(
            (node) => node.id === step.nodeId
          )?.data?.workflow

          if (workflow === undefined) {
            continue
          }

          const inputs = step.inputs.flatMap((input) => {
            const value = results.get(input.sourceNodeId)?.[
              input.sourcePort.role
            ]

            return value === undefined
              ? []
              : [{ port: input.targetPort, value }]
          })

          if (
            (step.inputs.length > 0 && inputs.length === 0) ||
            step.requiredPortIds.some(
              (id) => !inputs.some((input) => input.port.id === id)
            )
          ) {
            yield* nodeEvent({
              ...identity,
              nodeId: step.nodeId,
              state: 'skipped',
            })
            continue
          }

          yield* nodeEvent({
            ...identity,
            nodeId: step.nodeId,
            state: 'running',
          })

          const evaluation = Effect.suspend(() =>
            (options.evaluate ?? evaluateOfflineWorkflowNode)({
              nodeId: step.nodeId,
              onText: (text) => {
                if (states.get(step.nodeId) !== 'running') {
                  return
                }

                const event: WorkflowRunEvent = {
                  kind: 'node',
                  event: {
                    ...identity,
                    nodeId: step.nodeId,
                    state: 'running',
                    text,
                  },
                }

                freezeSnapshot(event)
                options.onEvent(event)
              },
              workflow,
              inputs,
            })
          ).pipe(
            Effect.flatMap((value) =>
              S.decodeUnknownEffect(WorkflowOutputsSchema)(value).pipe(
                Effect.mapError(
                  () => new WorkflowRuntimeError({ code: 'invalid-output' })
                )
              )
            ),
            Effect.flatMap((outputs) =>
              validOutputs(outputs, step, workflow)
                ? Effect.succeed(outputs)
                : Effect.fail(
                    new WorkflowRuntimeError({ code: 'invalid-output' })
                  )
            ),
            Effect.catchDefect(() =>
              Effect.fail(
                new WorkflowRuntimeError({ code: 'evaluator-defect' })
              )
            ),
            Effect.withSpan(FlowSpan.workflowNode, {
              attributes: { [FlowAttribute.nodeId]: step.nodeId },
            })
          )

          const result = yield* Effect.result(evaluation)

          if (Result.isFailure(result)) {
            const failure = { code: result.failure.code }
            yield* nodeEvent({
              ...identity,
              nodeId: step.nodeId,
              state: 'failed',
              failure,
            })
            yield* settlePending('skipped')
            yield* emit({ kind: 'run', ...identity, state: 'failed', failure })
            yield* Effect.logWarning('Failed workflow run').pipe(
              Effect.annotateLogs({
                [FlowAttribute.nodeId]: step.nodeId,
                [FlowAttribute.failureName]: failure.code,
              })
            )

            return
          }

          const outputs = structuredClone(result.success)
          freezeSnapshot(outputs)
          results.set(step.nodeId, outputs)
          yield* nodeEvent({
            ...identity,
            nodeId: step.nodeId,
            state: 'succeeded',
            outputs,
          })
        }

        yield* emit({ kind: 'run', ...identity, state: 'succeeded' })
        yield* Effect.logDebug('Succeeded workflow run')
      }).pipe(
        Effect.onInterrupt(() =>
          Effect.gen(function* cancelRun() {
            yield* settlePending('cancelled')
            yield* emit({ kind: 'run', ...identity, state: 'cancelled' })
            yield* Effect.logDebug('Cancelled workflow run')
          })
        ),
        Effect.annotateLogs({
          [FlowAttribute.workflowRunId]: runId,
          [FlowAttribute.workflowRevision]: plan.revision,
        }),
        Effect.withSpan(FlowSpan.workflowRun, {
          attributes: {
            [FlowAttribute.workflowRunId]: runId,
            [FlowAttribute.workflowRevision]: plan.revision,
          },
        })
      )

      const fiber = yield* Effect.forkScoped(restore(execute), {
        startImmediately: true,
      })

      return {
        request,
        cancel: Fiber.interrupt(fiber),
        await: Fiber.join(fiber),
      }
    })
  ).pipe(
    Effect.tapError((failure) =>
      Effect.logWarning('Rejected workflow run').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure._tag,
          [FlowAttribute.inputKind]: 'workflow-run',
        })
      )
    ),
    Effect.withSpan(FlowSpan.documentIntegrity)
  )
