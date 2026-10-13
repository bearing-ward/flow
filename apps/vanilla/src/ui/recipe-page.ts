import type { FlowInternalNode } from '@flow/core'
import type { JavaScriptFlowController } from '@flow/vanilla'

import '../style.css'
import './recipe-page.css'

/** Elements of an example recipe page: a tool bar, the canvas and a status line. */
export interface RecipePage {
  readonly root: HTMLElement
  readonly toolbar: HTMLElement
  readonly canvas: HTMLElement
  readonly status: HTMLOutputElement
}

/** Build the shared recipe page shell inside `#app`. */
export const createRecipePage = (name: string): RecipePage => {
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error(`Missing ${name} recipe root`)
  }

  root.innerHTML =
    '<main class="recipe-page"><div class="recipe-toolbar"></div><div id="canvas" class="recipe-canvas"></div><output data-testid="recipe-status" aria-live="polite"></output></main>'

  root.dataset.recipe = name

  const toolbar = root.querySelector<HTMLElement>('.recipe-toolbar')
  const canvas = root.querySelector<HTMLElement>('#canvas')
  const status = root.querySelector<HTMLOutputElement>('output')

  if (toolbar === null || canvas === null || status === null) {
    throw new Error(`Missing ${name} recipe elements`)
  }

  return { root, toolbar, canvas, status }
}

export const pageButton = (
  testId: string,
  text: string,
  onClick: () => void
): HTMLButtonElement => {
  const button = document.createElement('button')

  button.type = 'button'
  button.dataset.testid = testId
  button.textContent = text
  button.addEventListener('click', onClick)

  return button
}

/** Owns the mounted canvas so renderers and page controls can reach it after mount. */
export interface RecipeCanvasOwner {
  current: JavaScriptFlowController | undefined
}

/** The `?scene=` query value, or the fallback. */
export const sceneParameter = (fallback: string): string =>
  new URLSearchParams(globalThis.location.search).get('scene') ?? fallback

/** Measured internal node, or undefined while the host has not measured it yet. */
export const measuredNode = (
  controller: JavaScriptFlowController,
  id: string
): FlowInternalNode | undefined => {
  const internal = controller.getInternalNode(id)

  return internal?.measurementStatus === 'measured' ? internal : undefined
}

/**
 * Run `check` on every animation frame until `destroy`. Recipes use it to
 * notice measurement changes, which the host reports through internal nodes
 * rather than state events.
 */
export const everyFrame = (check: () => void): (() => void) => {
  let frame = 0
  let stopped = false

  const tick = (): void => {
    check()

    if (!stopped) {
      frame = globalThis.requestAnimationFrame(tick)
    }
  }

  frame = globalThis.requestAnimationFrame(tick)

  return () => {
    stopped = true
    globalThis.cancelAnimationFrame(frame)
  }
}
