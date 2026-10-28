import { describe, expect, it } from 'vitest'

import { isFlowTraceSourcePath } from './check-research-traces.ts'

describe('research trace source path ownership', () => {
  it('resolves Flow adapters locally and upstream packages from imported evidence', () => {
    expect(
      isFlowTraceSourcePath('packages/core/src/domain/flow.schema.ts')
    ).toBeTruthy()
    expect(
      isFlowTraceSourcePath('packages/vue/src/flow-canvas.ts')
    ).toBeTruthy()
    expect(isFlowTraceSourcePath('apps/foldkit/src/graph.ts')).toBeTruthy()
    expect(
      isFlowTraceSourcePath('packages/react/src/components/NodeWrapper.tsx')
    ).toBeFalsy()
  })
})
