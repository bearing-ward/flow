import type { ResizeCompletionFixture } from '../../shared-e2e/resize-completion-fixture.ts'
import { mountWiringFixture } from './final-wiring-fixture.ts'

export const mountResizeCompletion = (
  root: HTMLElement,
  mode: 'controlled' | 'uncontrolled',
  throwEnd = false
): void => {
  const fixture = mountWiringFixture(root, {
    document: {
      nodes: [
        {
          id: 'r',
          label: 'Resize',
          position: { x: 100, y: 100 },
          size: { width: 150, height: 80 },
        },
      ],
      edges: [],
    },
    documentMode: mode,
    resizeEndThrows: throwEnd,
    ownerAppliesLatest: mode === 'controlled',
    resizers: [{ nodeId: 'r', kind: 'resizer', vetoWidthAbove: 180 }],
  })

  window.__resizeCompletion = {
    changes: () => fixture.nodeChanges,
    clear: () => {
      fixture.nodeChanges.length = 0
    },
    bounds: () => {
      const node = fixture.controller.getNode('r')

      return node?.size === undefined
        ? null
        : { ...node.position, ...node.size }
    },
    callbackFailures: () => fixture.errors.length,
    geometryChangeCount: () =>
      fixture.changes.filter(
        ({ kind }) => kind === 'node-bounds' || kind === 'edit-proposal'
      ).length,
    endCount: () =>
      fixture.resizeEvents.filter((name) => name === 'end:r').length,
    remove: () => fixture.controller.update({ nodes: [], edges: [] }),
    unmount: () => fixture.controller.destroy(),
  } satisfies ResizeCompletionFixture
}
