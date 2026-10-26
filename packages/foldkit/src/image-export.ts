import { createFlowImageExportRequest } from '@flow/core'
import type { FlowImageExportOptions, FlowImageExportRequest } from '@flow/core'

import type { FoldkitFlowInstance } from './instance.ts'

export const createFoldkitImageExportRequest = async (
  instance: FoldkitFlowInstance,
  options: FlowImageExportOptions
): Promise<FlowImageExportRequest> => {
  const object = await instance.toObject()
  const internals = await instance.getInternalNodes()

  return createFlowImageExportRequest(object, internals, 'foldkit', options)
}
