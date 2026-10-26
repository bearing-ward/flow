import type { ResizeCompletionFixture } from '../../shared-e2e/resize-completion-fixture.ts'
import { mountFoldkitModelStylingFixture } from './model-styling-fixture.ts'

export const mountResizeCompletion = (
  root: HTMLElement,
  mode: 'controlled' | 'uncontrolled',
  throwEnd = false
): void => {
  root.innerHTML = '<div id="resize-completion-fixture"></div>'
  const container = root.firstElementChild

  if (!(container instanceof HTMLElement)) {
    throw new TypeError('Missing resize completion container')
  }

  const fixture = mountFoldkitModelStylingFixture(container, {
    document: {
      nodes: [
        {
          id: 'r',
          type: 'resizable',
          label: 'Resize',
          position: { x: 100, y: 100 },
          size: { width: 150, height: 80 },
        },
      ],
      edges: [],
    },
    documentMode: mode,
    resizeEndThrows: throwEnd,
    vetoWidthAbove: 180,
  })

  window.__resizeCompletion = {
    changes: fixture.nodeChanges,
    clear: fixture.clearNodeChanges,
    bounds: async () => {
      const node = await fixture.node('r')

      return node?.size === undefined
        ? null
        : { ...node.position, ...node.size }
    },
    callbackFailures: fixture.callbackFailures,
    geometryChangeCount: () =>
      fixture
        .changeKinds()
        .filter((kind) => kind === 'node-bounds' || kind === 'edit-proposal')
        .length,
    endCount: () =>
      fixture.resizeLog().filter(({ name }) => name === 'onResizeEnd').length,
    remove: fixture.removeNodes,
    unmount: fixture.unmount,
  } satisfies ResizeCompletionFixture
}
