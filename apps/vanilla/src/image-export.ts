import { createFlowImageExportRequest } from '@flow/core'
import type { FlowImageExportOptions, FlowImageExportRequest } from '@flow/core'

import type { JavaScriptFlowController } from './mount-flow.ts'

export const createVanillaImageExportRequest = (
  controller: JavaScriptFlowController,
  options: FlowImageExportOptions
): FlowImageExportRequest => {
  const object = controller.toObject()

  return createFlowImageExportRequest(
    object,
    object.nodes.map(({ id }) => controller.getInternalNode(id)),
    'vanilla',
    options
  )
}
