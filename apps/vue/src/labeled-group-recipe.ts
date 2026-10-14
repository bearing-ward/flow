import { mountFinalWiringFixture } from './final-wiring-test.ts'

/**
 * React Flow UI "Labeled Group Node": a group node with a title tag whose
 * children sit inside it, drag with it and stay within it.
 */
const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing Vue Labeled Group root')
}

mountFinalWiringFixture(root, { scene: 'labeled-group' })
