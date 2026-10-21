import { FlowCanvas } from '@flow/vue'
import { createApp, h, ref } from 'vue'

import {
  applyUpstreamChange,
  upstreamGenericConfig,
} from '../../../packages/conformance/src/upstream-generic/index.ts'

export const mountControlledDelete = (): void => {
  const config = upstreamGenericConfig('nodes/general')
  const document = ref(config.document)

  createApp({
    setup: () => () =>
      h(FlowCanvas, {
        documentMode: 'controlled',
        document: document.value,
        nodeDragThreshold: 0,
        deleteKeyCode: 'd',
        onChange: (change) => {
          document.value = applyUpstreamChange(document.value, change)
        },
        style: { width: '100%', height: '100%' },
      }),
  }).mount('#app')
}
