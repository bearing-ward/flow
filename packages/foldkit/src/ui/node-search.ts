import {
  graphNodeBounds,
  nextListIndex,
  searchFlowNodes,
  selectOnlyNodeTransaction,
} from '@flow/core'
import type {
  FlowEditTransactionInput,
  FlowGraphView,
  FlowNode,
  FlowNodeSearchResult,
} from '@flow/core'

import type { ViewportClient } from '../application.ts'
import type { FlowPanelPosition } from '../ui.ts'
import { mountCatalogPanel } from './catalog-panel.ts'

export interface FoldkitNodeSearchOptions {
  /** Apply the selection edit, for example through the Runtime edit port. */
  readonly applyEdit: (transaction: FlowEditTransactionInput) => void
  readonly position?: FlowPanelPosition
  readonly className?: string
  readonly ariaLabel?: string
  readonly placeholder?: string
  /** Replace the default lowercase label search. */
  readonly onSearch?: (query: string) => readonly FlowNode[]
  /** Replace the default select-and-centre behavior. */
  readonly onSelectNode?: (node: FlowNode) => void
}

export interface FoldkitNodeSearchMount {
  readonly element: HTMLDivElement
  readonly input: HTMLInputElement
  /** Feed the latest accepted graph; search results and centring read it. */
  readonly update: (graph: FlowGraphView) => void
  readonly dispose: () => void
}

let searchInstance = 0

/** Keep focus in the combobox while choosing a result with a pointer. */
const onListPointerDown = (event: PointerEvent): void => {
  event.preventDefault()
}

/** React Flow UI Node Search for one Foldkit canvas, fed by app graph updates. */
export const mountFlowNodeSearch = (
  canvas: HTMLElement,
  viewport: ViewportClient,
  graph: FlowGraphView,
  options: FoldkitNodeSearchOptions
): FoldkitNodeSearchMount => {
  searchInstance += 1
  const id = `flow-foldkit-node-search-${searchInstance}`

  const panel = mountCatalogPanel(canvas, {
    kind: 'node-search',
    position: options.position ?? 'top-left',
    ariaLabel: options.ariaLabel ?? 'Node search',
    className: options.className,
    role: 'search',
  })

  const owner = canvas.ownerDocument
  let current = graph

  const input = owner.createElement('input')
  input.type = 'search'
  input.className = 'flow-foldkit-node-search-input'
  input.placeholder = options.placeholder ?? 'Search nodes...'
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-label', 'Search nodes')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-controls', `${id}-results`)
  input.setAttribute('aria-expanded', 'false')

  const list = owner.createElement('ul')
  list.id = `${id}-results`
  list.className = 'flow-foldkit-node-search-results'
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Matching nodes')
  list.hidden = true

  panel.content.append(input, list)

  let results: readonly FlowNodeSearchResult[] = []
  let active = -1

  const render = (): void => {
    list.replaceChildren(
      ...results.map((result, index) => {
        const item = owner.createElement('li')
        item.id = `${id}-option-${index}`
        item.className = 'flow-foldkit-node-search-option'
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

    if (open && active >= 0) {
      input.setAttribute('aria-activedescendant', `${id}-option-${active}`)
    } else {
      input.removeAttribute('aria-activedescendant')
    }
  }

  const selectAndCentre = (node: FlowNode): void => {
    options.applyEdit(selectOnlyNodeTransaction(current.document, node.id))

    const graphNode = current.nodes.get(node.id)

    if (graphNode === undefined) {
      return
    }

    const bounds = graphNodeBounds(graphNode)

    void viewport.setCenter({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    })
  }

  const choose = (index: number): void => {
    const result = results[index]

    const node =
      result === undefined
        ? undefined
        : current.document.nodes.find(({ id: nodeId }) => nodeId === result.id)

    if (node === undefined) {
      return
    }

    results = []
    active = -1
    input.value = node.label
    render()

    if (options.onSelectNode === undefined) {
      selectAndCentre(node)
    } else {
      options.onSelectNode(node)
    }
  }

  const onInput = (): void => {
    results =
      options.onSearch === undefined
        ? searchFlowNodes(current.document.nodes, input.value)
        : options.onSearch(input.value).map((node) => ({
            id: node.id,
            label: node.label,
          }))
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
    element: panel.element,
    input,
    update: (next) => {
      panel.attach()
      current = next
    },
    dispose: () => {
      input.removeEventListener('input', onInput)
      input.removeEventListener('keydown', onKeydown)
      list.removeEventListener('pointerdown', onListPointerDown)
      list.removeEventListener('click', onListClick)
      panel.dispose()
    },
  }
}
