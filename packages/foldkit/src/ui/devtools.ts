import {
  describeFlowStateChange,
  devToolsEdgeRows,
  devToolsNodeRows,
  formatViewportLog,
} from '@flow/core'
import type { FlowSnapshot, FlowStateChange, Viewport } from '@flow/core'

import type { FlowPanelPosition } from '../ui.ts'
import { mountCatalogPanel } from './catalog-panel.ts'

export type FoldkitDevToolsPanel = 'viewport' | 'nodes' | 'changes'

export interface FoldkitDevToolsOptions {
  readonly position?: FlowPanelPosition
  readonly className?: string
  readonly ariaLabel?: string
  /** Panels shown on mount. Defaults to none, like React Flow UI DevTools. */
  readonly open?: readonly FoldkitDevToolsPanel[]
  /** Maximum change log entries kept, newest first. Defaults to 50. */
  readonly maxChanges?: number
}

export interface FoldkitDevToolsMount {
  readonly element: HTMLDivElement
  /** Feed each accepted Runtime state change. */
  readonly update: (change: FlowStateChange) => void
  /** Feed in-flight viewport frames between accepted states. */
  readonly updateViewport: (viewport: Viewport) => void
  readonly setOpen: (panel: FoldkitDevToolsPanel, open: boolean) => void
  readonly dispose: () => void
}

const panelLabels: Record<FoldkitDevToolsPanel, string> = {
  viewport: 'Viewport logger',
  nodes: 'Node inspector',
  changes: 'Change logger',
}

const panels: readonly FoldkitDevToolsPanel[] = ['viewport', 'nodes', 'changes']

/**
 * React Flow UI DevTools for one Foldkit canvas: toggleable viewport logger,
 * node inspector and change logger fed by accepted Runtime states.
 */
export const mountFlowDevTools = (
  canvas: HTMLElement,
  snapshot: FlowSnapshot,
  options: FoldkitDevToolsOptions = {}
): FoldkitDevToolsMount => {
  const panel = mountCatalogPanel(canvas, {
    kind: 'devtools',
    position: options.position ?? 'top-right',
    ariaLabel: options.ariaLabel ?? 'Flow devtools',
    className: options.className,
  })

  const owner = canvas.ownerDocument
  const maxChanges = options.maxChanges ?? 50
  const toolbar = owner.createElement('div')
  toolbar.className = 'flow-foldkit-devtools-toggles'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Devtools panels')
  panel.content.append(toolbar)

  const sections = new Map<FoldkitDevToolsPanel, HTMLElement>()
  const toggles = new Map<FoldkitDevToolsPanel, HTMLButtonElement>()

  const setOpen = (name: FoldkitDevToolsPanel, open: boolean): void => {
    const section = sections.get(name)

    if (section !== undefined) {
      section.hidden = !open
    }

    toggles.get(name)?.setAttribute('aria-pressed', String(open))
  }

  for (const name of panels) {
    const toggle = owner.createElement('button')
    toggle.type = 'button'
    toggle.className = 'flow-foldkit-control-button'
    toggle.textContent = panelLabels[name]
    toggle.dataset.devtoolsToggle = name
    toggle.addEventListener('click', () =>
      setOpen(name, toggle.getAttribute('aria-pressed') !== 'true')
    )
    toggles.set(name, toggle)
    toolbar.append(toggle)

    const section = owner.createElement('section')
    section.className = `flow-foldkit-devtools-panel flow-foldkit-devtools-${name}`
    section.dataset.devtoolsPanel = name
    section.setAttribute('aria-label', panelLabels[name])
    sections.set(name, section)
    panel.content.append(section)
  }

  const viewportOutput = owner.createElement('output')
  sections.get('viewport')?.append(viewportOutput)

  const nodeList = owner.createElement('ul')
  nodeList.setAttribute('aria-label', 'Nodes')

  const edgeList = owner.createElement('ul')
  edgeList.setAttribute('aria-label', 'Edges')
  sections.get('nodes')?.append(nodeList, edgeList)

  const changeLog = owner.createElement('ol')
  changeLog.setAttribute('role', 'log')
  changeLog.setAttribute('aria-label', 'Changes')
  changeLog.setAttribute('aria-live', 'polite')
  sections.get('changes')?.append(changeLog)

  const updateViewport = (viewport: Viewport): void => {
    viewportOutput.textContent = formatViewportLog(viewport)
  }

  const renderSnapshot = (next: FlowSnapshot): void => {
    updateViewport(next.viewport)
    nodeList.replaceChildren(
      ...devToolsNodeRows(next.document).map((row) => {
        const item = owner.createElement('li')
        item.dataset.devtoolsNode = row.id
        item.textContent = `${row.id} "${row.label}" ${row.type} (${row.x}, ${row.y})${row.selected ? ' selected' : ''}${row.hidden ? ' hidden' : ''}`

        return item
      })
    )
    edgeList.replaceChildren(
      ...devToolsEdgeRows(next.document).map((row) => {
        const item = owner.createElement('li')
        item.dataset.devtoolsEdge = row.id
        item.textContent = `${row.id} ${row.source} -> ${row.target}${row.selected ? ' selected' : ''}`

        return item
      })
    )
  }

  renderSnapshot(snapshot)

  for (const name of panels) {
    setOpen(name, options.open?.includes(name) ?? false)
  }

  return {
    element: panel.element,
    update: (change) => {
      panel.attach()

      for (const entry of describeFlowStateChange(change)) {
        const item = owner.createElement('li')
        item.dataset.changeKind = entry.kind
        item.textContent = entry.text
        changeLog.prepend(item)
      }

      while (changeLog.childElementCount > maxChanges) {
        changeLog.lastElementChild?.remove()
      }

      renderSnapshot(change.current)
    },
    updateViewport,
    setOpen,
    dispose: panel.dispose,
  }
}
