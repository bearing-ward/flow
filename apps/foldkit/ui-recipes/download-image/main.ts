import { getNodesBounds, getViewportForBounds } from '@flow/core'
import { toPng } from 'html-to-image'

import { mountRecipeHost } from '../recipe-host.ts'

const width = 1024

const height = 768

const host = mountRecipeHost({
  page: 'download-image-page',
  document: {
    nodes: [
      {
        id: 'a',
        label: 'Export input',
        position: { x: 80, y: 80 },
        size: { width: 150, height: 50 },
      },
      {
        id: 'b',
        label: 'Export output',
        position: { x: 420, y: 280 },
        size: { width: 150, height: 50 },
      },
    ],
    edges: [{ id: 'export', source: 'a', target: 'b' }],
  },
})

const download = async (): Promise<void> => {
  try {
    const state = await host.measuredState()

    const bounds = getNodesBounds(state.document.nodes, {
      nodeLookup: state.internals,
    })

    const viewport = getViewportForBounds({
      bounds,
      width,
      height,
      limits: { minZoom: 0.1, maxZoom: 2 },
      padding: 0.1,
    })

    const element = host.root.querySelector<HTMLElement>(
      '.flow-foldkit-viewport'
    )

    if (viewport === undefined || element === null) {
      throw new Error('Graph is not ready to export')
    }

    const data = await toPng(element, {
      backgroundColor: '#ffffff',
      width,
      height,
      pixelRatio: 1,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    })

    const link = document.createElement('a')
    link.download = 'flow.png'
    link.href = data
    link.dataset.testid = 'export-result'
    link.textContent = 'Save PNG'
    host.toolbar.querySelector('[data-testid="export-result"]')?.remove()
    host.toolbar.append(link)
    link.click()
    host.status.value = `PNG ${width}x${height}`
  } catch (error) {
    host.status.value = error instanceof Error ? error.message : String(error)
  }
}

host
  .button('download-image', 'Download image')
  .addEventListener('click', () => {
    void download()
  })
