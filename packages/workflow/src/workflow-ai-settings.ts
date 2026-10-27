import type { NodeIdSchema } from '@flow/core'

import type { WorkflowAiCapabilities } from './workflow-ai.schema.ts'
import type { WorkflowIssue, WorkflowNodeData } from './workflow.schema.ts'

/** Capability checks supplement editable graph validation without changing its configuration. */
export const workflowAiSettingIssues = (
  nodeId: typeof NodeIdSchema.Type,
  workflow: WorkflowNodeData,
  capabilities?: WorkflowAiCapabilities
): readonly WorkflowIssue[] => {
  if (capabilities === undefined) {
    return []
  }

  const issue = (
    field: 'modelId' | 'temperature' | 'size'
  ): WorkflowIssue[] => [{ code: 'invalid-setting', nodeId, field }]

  if (workflow.kind === 'generate-text') {
    const model = capabilities.text.find(
      (item) => item.modelId === workflow.config.modelId
    )

    if (model === undefined) {
      return issue('modelId')
    }

    return model.temperatures.includes(workflow.config.temperature)
      ? []
      : issue('temperature')
  }

  if (workflow.kind === 'generate-image') {
    const model = capabilities.image.find(
      (item) => item.modelId === workflow.config.modelId
    )

    if (model === undefined) {
      return issue('modelId')
    }

    return model.sizes.some(
      (size) =>
        size.width === workflow.config.width &&
        size.height === workflow.config.height
    )
      ? []
      : issue('size')
  }

  return []
}
