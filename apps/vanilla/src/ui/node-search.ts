import {
  nextListIndex,
  searchFlowNodes,
  selectOnlyNodeTransaction,
} from '@flow/core'
import type { FlowNode, FlowNodeSearchResult } from '@flow/core'

import type { CanvasPanelPlacement } from '../mount-flow.ts'
import { createFlowOverlay } from './overlay.ts'
import type { FlowUIController } from './overlay.ts'

export interface FlowNodeSearchOptions {
  readonly position?: CanvasPanelPlacement
  readonly className?: string
  readonly ariaLabel?: string
  readonly placeholder?: string
  /** Replace the default lowercase label search. */
  readonly onSearch?: (query: string) => readonly FlowNode[]
  /** Replace the default select-and-centre behavior. */
  readonly onSelectNode?: (node: FlowNode) => void
}

export interface FlowNodeSearchMount {
  readonly element: HTMLDivElement
  readonly input: HTMLInputElement
  readonly destroy: () => void
}

let searchInstance = 0

/** Keep focus in the combobox while choosing a result with a pointer. */
const onListPointerDown = (event: PointerEvent): void => {
  event.preventDefault()
}

/** Select only `node` and centre the viewport on it at the current zoom. */
export const selectAndCentreNode = async (
  controller: FlowUIController,
  node: FlowNode
): Promise<void> => {
  await controller.applyEdit(
    selectOnlyNodeTransaction(controller.getSnapshot().document, node.id)
  )

  const internal = controller.getInternalNode(node.id)
  const position = internal?.absolutePosition ?? node.position

  await controller.setCenter(
    position.x + (internal?.width ?? 0) / 2,
    position.y + (internal?.height ?? 0) / 2,
    { zoom: controller.getViewport().zoom }
  )
}

/** React Flow UI Node Search: a combobox over node labels with keyboard navigation. */
export const createFlowNodeSearch = (
  controller: FlowUIController,
  options: FlowNodeSearchOptions = {}
): FlowNodeSearchMount => {
  searchInstance += 1
  const id = `flow-node-search-${searchInstance}`

  const overlay = createFlowOverlay(controller, {
    kind: 'node-search',
    position: options.position ?? 'top-left',
    className: options.className,
    ariaLabel: options.ariaLabel ?? 'Node search',
  })

  const owner = overlay.element.ownerDocument
  overlay.element.setAttribute('role', 'search')

  const input = owner.createElement('input')
  input.type = 'search'
  input.className = 'flow-node-search-input'
  input.placeholder = options.placeholder ?? 'Search nodes...'
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-label', 'Search nodes')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', `${id}-results`)
  input.setAttribute('aria-expanded', 'false')

  const list = owner.createElement('ul')
  list.id = `${id}-results`
  list.className = 'flow-node-search-results'
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Matching nodes')
  list.hidden = true

  overlay.element.append(input, list)

  let results: readonly FlowNodeSearchResult[] = []
  let active = -1

  const search = (query: string): readonly FlowNodeSearchResult[] => {
    if (options.onSearch === undefined) {
      return searchFlowNodes(controller.getNodes(), query)
    }

    return options.onSearch(query).map((node) => ({
      id: node.id,
      label: node.label,
    }))
  }

  const render = (): void => {
    list.replaceChildren(
      ...results.map((result, index) => {
        const item = owner.createElement('li')
        item.id = `${id}-option-${index}`
        item.className = 'flow-node-search-option'
        item.dataset.nodeSearchResult = result.id
        item.setAttribute('role', 'option')
        item.setAttribute('aria-selected', String(index === active))
        item.textContent = result.label

        return item
      })
    )

    const open = results.length > 0
    list.hidden = !open
    input.setAttribute('aria-expanded', String(open))

    if (active >= 0 && open) {
      input.setAttribute('aria-activedescendant', `${id}-option-${active}`)
    } else {
      input.removeAttribute('aria-activedescendant')
    }
  }

  const choose = (index: number): void => {
    const result = results[index]

    const node =
      result === undefined ? undefined : controller.getNode(result.id)

    if (node === undefined) {
      return
    }

    results = []
    active = -1
    input.value = node.label
    render()

    if (options.onSelectNode === undefined) {
      void selectAndCentreNode(controller, node)
    } else {
      options.onSelectNode(node)
    }
  }

  const onInput = (): void => {
    results = search(input.value)
    active = results.length > 0 ? 0 : -1
    render()
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      choose(active)

      return
    }

    if (event.key === 'Escape') {
      results = []
      active = -1
      render()

      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    const next = nextListIndex(active, results.length, event.key)

    if (next !== undefined) {
      event.preventDefault()
      active = next
      render()
    }
  }

  const onListClick = (event: MouseEvent): void => {
    const { target } = event

    if (!(target instanceof Element)) {
      return
    }

    const item = target.closest<HTMLElement>('[data-node-search-result]')
    const index = item === null ? -1 : [...list.children].indexOf(item)

    if (index >= 0) {
      choose(index)
    }
  }

  input.addEventListener('input', onInput)
  input.addEventListener('keydown', onKeydown)
  list.addEventListener('pointerdown', onListPointerDown)
  list.addEventListener('click', onListClick)

  return {
    element: overlay.element,
    input,
    destroy: () => {
      input.removeEventListener('input', onInput)
      input.removeEventListener('keydown', onKeydown)
      list.removeEventListener('pointerdown', onListPointerDown)
      list.removeEventListener('click', onListClick)
      overlay.destroy()
    },
  }
}
