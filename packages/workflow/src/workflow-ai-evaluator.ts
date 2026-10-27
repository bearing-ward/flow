import { FlowSpan } from '@flow/core'
import { Effect, Stream } from 'effect'

import type { WorkflowAiProviderService } from './workflow-ai-provider.ts'
import { WorkflowRuntimeError } from './workflow-execution.schema.ts'
import { evaluateOfflineWorkflowNode } from './workflow-runner.ts'
import type { WorkflowEvaluator } from './workflow-runner.ts'

/** Connected text roles override inline fallbacks. Trigger ports remain scheduling dependencies. */
export const createWorkflowAiEvaluator =
  (provider: WorkflowAiProviderService): WorkflowEvaluator =>
  (evaluation) => {
    const { workflow, inputs } = evaluation

    const inputText = (role: 'prompt' | 'system', fallback: string) => {
      const value = inputs.find((input) => input.port.role === role)?.value

      return value?.kind === 'text' ? value.text : fallback
    }

    if (workflow.kind === 'generate-text') {
      return Effect.suspend(() => {
        let text = ''

        return provider
          .text({
            ...workflow.config,
            system: inputText('system', workflow.config.system),
            prompt: inputText('prompt', workflow.config.prompt),
          })
          .pipe(
            Stream.runForEach((event) =>
              Effect.sync(() => {
                if (event.kind === 'chunk') {
                  text += event.text
                  evaluation.onText?.(text)
                }
              })
            ),
            Effect.map(() => ({ output: { kind: 'text' as const, text } })),
            Effect.mapError(
              (failure) => new WorkflowRuntimeError({ code: failure.code })
            ),
            Effect.withSpan(FlowSpan.workflowAi)
          )
      })
    }

    if (workflow.kind === 'generate-image') {
      return provider
        .image({
          ...workflow.config,
          prompt: inputText('prompt', workflow.config.prompt),
        })
        .pipe(
          Effect.map((image) => ({
            image: { kind: 'image' as const, ...image },
          })),
          Effect.mapError(
            (failure) => new WorkflowRuntimeError({ code: failure.code })
          ),
          Effect.withSpan(FlowSpan.workflowAi)
        )
    }

    return evaluateOfflineWorkflowNode(evaluation)
  }
