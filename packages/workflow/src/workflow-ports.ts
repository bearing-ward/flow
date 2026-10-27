import type { WorkflowNodeData, WorkflowPort } from './workflow.schema.ts'

/** Port roles survive clipboard handle renaming; execution never infers roles from IDs. */
const port = (
  role: WorkflowPort['role'],
  id: WorkflowPort['id'],
  direction: WorkflowPort['direction'],
  valueType: WorkflowPort['valueType'] = 'text',
  multiple = false
): WorkflowPort => ({ id, role, direction, valueType, multiple })

export const workflowPorts = (
  data: WorkflowNodeData
): readonly WorkflowPort[] => {
  switch (data.kind) {
    case 'initial':
    case 'text-input': {
      return [port('output', data.ports.output, 'source')]
    }

    case 'transform': {
      return [
        port('input', data.ports.input, 'target'),
        port('output', data.ports.output, 'source'),
      ]
    }

    case 'join': {
      return [
        port('input', data.ports.input, 'target', 'text', true),
        port('output', data.ports.output, 'source'),
      ]
    }

    case 'branch': {
      return [
        port('input', data.ports.input, 'target'),
        port('true', data.ports.true, 'source'),
        port('false', data.ports.false, 'source'),
      ]
    }

    case 'output': {
      return [port('input', data.ports.input, 'target', data.config.format)]
    }

    case 'generate-text': {
      return [
        port('trigger', data.ports.trigger, 'target', 'trigger'),
        port('system', data.ports.system, 'target'),
        port('prompt', data.ports.prompt, 'target'),
        port('output', data.ports.output, 'source'),
      ]
    }

    case 'generate-image': {
      return [
        port('trigger', data.ports.trigger, 'target', 'trigger'),
        port('prompt', data.ports.prompt, 'target'),
        port('image', data.ports.image, 'source', 'image'),
      ]
    }

    case 'workflow-trigger': {
      return [port('output', data.ports.output, 'source', 'trigger')]
    }

    default: {
      const exhaustive: never = data

      return exhaustive
    }
  }
}
