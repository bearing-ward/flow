import { createFlowImageExportRequest } from '@flow/core'
import type { FlowImageExportOptions, FlowImageExportRequest } from '@flow/core'

import { useFlow } from './use-flow.ts'

export const useFlowImageExport = (): ((
  options: FlowImageExportOptions
) => FlowImageExportRequest) => {
  const flow = useFlow()

  return (options) => {
    const object = flow.toObject()

    return createFlowImageExportRequest(
      object,
      object.nodes.map(({ id }) => flow.getInternalNode(id)),
      'vue',
      options
    )
  }
}
