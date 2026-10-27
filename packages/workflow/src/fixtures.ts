import { Schema } from 'effect'

import { workflowPorts } from './workflow-ports.ts'
import { WorkflowNodeDataSchema } from './workflow.schema.ts'

const node = (
  id: string,
  x: number,
  y: number,
  input: typeof WorkflowNodeDataSchema.Encoded
) => {
  const data = Schema.decodeUnknownSync(WorkflowNodeDataSchema)(input)

  return {
    id,
    label: id,
    position: { x, y },
    size: { width: 150, height: 90 },
    handles: workflowPorts(data).map((port) => ({
      id: port.id,
      kind: port.direction,
      side: port.direction === 'source' ? 'right' : 'left',
    })),
    data: { workflow: data, metadata: { opaque: ['preserved', 169] } },
  }
}

const edge = (
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  kind: 'data' | 'trigger' = 'data'
) => ({
  id,
  source,
  sourceHandle,
  target,
  targetHandle,
  data: { workflow: { version: 1, kind } },
})

export const baseWorkflowFixture = {
  nodes: [
    node('initial', 30, 60, {
      version: 1,
      kind: 'initial',
      config: { value: 'hello' },
      ports: { output: 'out' },
    }),
    node('transform', 250, 60, {
      version: 1,
      kind: 'transform',
      config: { operation: 'uppercase' },
      ports: { input: 'in', output: 'out' },
    }),
    node('branch', 470, 60, {
      version: 1,
      kind: 'branch',
      config: { operator: 'equals', value: 'HELLO' },
      ports: { input: 'in', true: 'yes', false: 'no' },
    }),
    node('join', 690, 60, {
      version: 1,
      kind: 'join',
      config: { separator: ', ' },
      ports: { input: 'in', output: 'out' },
    }),
    node('output', 910, 60, {
      version: 1,
      kind: 'output',
      config: { format: 'text' },
      ports: { input: 'in' },
    }),
  ],
  edges: [
    edge('initial-transform', 'initial', 'out', 'transform', 'in'),
    edge('transform-branch', 'transform', 'out', 'branch', 'in'),
    edge('branch-true', 'branch', 'yes', 'join', 'in'),
    edge('branch-false', 'branch', 'no', 'join', 'in'),
    edge('join-output', 'join', 'out', 'output', 'in'),
  ],
}

export const aiWorkflowFixture = {
  nodes: [
    node('trigger', 30, 60, {
      version: 1,
      kind: 'workflow-trigger',
      config: { label: 'Start' },
      ports: { output: 'start' },
    }),
    node('text', 30, 250, {
      version: 1,
      kind: 'text-input',
      config: { text: 'A tree', locked: false },
      ports: { output: 'out' },
    }),
    node('generate-text', 270, 60, {
      version: 1,
      kind: 'generate-text',
      config: { modelId: 'local-text', temperature: 0, system: '', prompt: '' },
      ports: {
        trigger: 'start',
        system: 'system',
        prompt: 'prompt',
        output: 'out',
      },
    }),
    node('generate-image', 530, 60, {
      version: 1,
      kind: 'generate-image',
      config: { modelId: 'local-image', width: 256, height: 256, prompt: '' },
      ports: { trigger: 'start', prompt: 'prompt', image: 'image' },
    }),
    node('image-output', 790, 60, {
      version: 1,
      kind: 'output',
      config: { format: 'image' },
      ports: { input: 'in' },
    }),
  ],
  edges: [
    edge(
      'trigger-text',
      'trigger',
      'start',
      'generate-text',
      'start',
      'trigger'
    ),
    edge(
      'trigger-image',
      'trigger',
      'start',
      'generate-image',
      'start',
      'trigger'
    ),
    edge('prompt-text', 'text', 'out', 'generate-text', 'prompt'),
    edge('text-image', 'generate-text', 'out', 'generate-image', 'prompt'),
    edge('image-output', 'generate-image', 'image', 'image-output', 'in'),
  ],
}
