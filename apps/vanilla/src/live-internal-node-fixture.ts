import { decodeFlowDocument } from '@flow/core'
import { Effect } from 'effect'

import { liveInternalDocument } from '../../shared-e2e/live-internal-document.ts'
import { mountFlow } from './mount-flow.ts'

import './style.css'

export const mountLiveInternalFixture = (root: HTMLElement): void => {
  const controller = mountFlow(
    root,
    Effect.runSync(decodeFlowDocument(liveInternalDocument)),
    {
      documentMode: 'uncontrolled',
      nodesResizable: true,
      autoPanOnNodeDrag: false,
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
    }
  )

  window.__flowLiveInternal = {
    internal: controller.getInternalNode,
    node: controller.getNode,
    nodes: controller.getNodes,
  }
}
