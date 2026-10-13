import {
  describeFlowStateChange,
  devToolsEdgeRows,
  devToolsNodeRows,
  formatViewportLog,
} from '@flow/core'
import type { FlowDocument, FlowStateChange, Viewport } from '@flow/core'

import type { CanvasPanelPlacement } from '../mount-flow.ts'
import { createFlowOverlay } from './overlay.ts'
import type { FlowUIController } from './overlay.ts'

export type FlowDevToolsPanel = 'viewport' | 'nodes' | 'changes'

export interface FlowDevToolsOptions {
  readonly position?: CanvasPanelPlacement
  readonly className?: string
  readonly ariaLabel?: string
  /** Panels shown on mount. Defaults to none, like React Flow UI DevTools. */
  readonly open?: readonly FlowDevToolsPanel[]
  /** Maximum change log entries kept, newest first. Defaults to 50. */
  readonly maxChanges?: number
}

export interface FlowDevToolsMount {
  readonly element: HTMLDivElement
  readonly setOpen: (panel: FlowDevToolsPanel, open: boolean) => void
  readonly destroy: () => void
}

const panelLabels: Record<FlowDevToolsPanel, string> = {
  viewport: 'Viewport logger',
  nodes: 'Node inspector',
  changes: 'Change logger',
}

const panels: readonly FlowDevToolsPanel[] = ['viewport', 'nodes', 'changes']

/**
 * React Flow UI DevTools: toggleable viewport logger, node inspector and
 * change logger fed from public controller snapshots.
 */
export const createFlowDevTools = (
  controller: FlowUIController,
  options: FlowDevToolsOptions = {}
): FlowDevToolsMount => {
  const overlay = createFlowOverlay(controller, {
    kind: 'devtools',
    position: options.position ?? 'top-right',
    className: options.className,
    ariaLabel: options.ariaLabel ?? 'Flow devtools',
  })

  const owner = overlay.element.ownerDocument
  const maxChanges = options.maxChanges ?? 50
  const toolbar = owner.createElement('div')
  toolbar.className = 'flow-devtools-toggles'
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', 'Devtools panels')
  overlay.element.append(toolbar)

  const sections = new Map<FlowDevToolsPanel, HTMLElement>()
  const toggles = new Map<FlowDevToolsPanel, HTMLButtonElement>()

  const setOpen = (panel: FlowDevToolsPanel, open: boolean): void => {
    const section = sections.get(panel)
    const toggle = toggles.get(panel)

    if (section !== undefined) {
      section.hidden = !open
    }

    toggle?.setAttribute('aria-pressed', String(open))
  }

  for (const panel of panels) {
    const toggle = owner.createElement('button')
    toggle.type = 'button'
    toggle.className = 'flow-control-button flow-devtools-toggle'
    toggle.textContent = panelLabels[panel]
    toggle.dataset.devtoolsToggle = panel
    toggle.addEventListener('click', () =>
      setOpen(panel, toggle.getAttribute('aria-pressed') !== 'true')
    )
    toggles.set(panel, toggle)
    toolbar.append(toggle)

    const section = owner.createElement('section')
    section.className = `flow-devtools-panel flow-devtools-${panel}`
    section.dataset.devtoolsPanel = panel
    section.setAttribute('aria-label', panelLabels[panel])
    sections.set(panel, section)
    overlay.element.append(section)
  }

  const viewportOutput = owner.createElement('output')
  viewportOutput.className = 'flow-devtools-viewport-value'
  sections.get('viewport')?.append(viewportOutput)

  const nodeList = owner.createElement('ul')
  nodeList.className = 'flow-devtools-nodes'
  nodeList.setAttribute('aria-label', 'Nodes')

  const edgeList = owner.createElement('ul')
  edgeList.className = 'flow-devtools-edges'
  edgeList.setAttribute('aria-label', 'Edges')
  sections.get('nodes')?.append(nodeList, edgeList)

  const changeLog = owner.createElement('ol')
  changeLog.className = 'flow-devtools-changes'
  changeLog.setAttribute('role', 'log')
  changeLog.setAttribute('aria-label', 'Changes')
  changeLog.setAttribute('aria-live', 'polite')
  sections.get('changes')?.append(changeLog)

  const renderViewport = (viewport: Viewport): void => {
    viewportOutput.textContent = formatViewportLog(viewport)
  }

  const renderDocument = (document: FlowDocument): void => {
    nodeList.replaceChildren(
      ...devToolsNodeRows(document).map((row) => {
        const item = owner.createElement('li')
        item.dataset.devtoolsNode = row.id
        item.textContent = `${row.id} "${row.label}" ${row.type} (${row.x}, ${row.y})${row.selected ? ' selected' : ''}${row.hidden ? ' hidden' : ''}`

        return item
      })
    )
    edgeList.replaceChildren(
      ...devToolsEdgeRows(document).map((row) => {
        const item = owner.createElement('li')
        item.dataset.devtoolsEdge = row.id
        item.textContent = `${row.id} ${row.source} -> ${row.target}${row.selected ? ' selected' : ''}`

        return item
      })
    )
  }

  const logChange = (change: FlowStateChange): void => {
    for (const entry of describeFlowStateChange(change)) {
      const item = owner.createElement('li')
      item.dataset.changeKind = entry.kind
      item.textContent = entry.text
      changeLog.prepend(item)
    }

    while (changeLog.childElementCount > maxChanges) {
      changeLog.lastElementChild?.remove()
    }
  }

  const snapshot = controller.getSnapshot()
  renderViewport(snapshot.viewport)
  renderDocument(snapshot.document)

  for (const panel of panels) {
    setOpen(panel, options.open?.includes(panel) ?? false)
  }

  const stopState = controller.subscribeState((change) => {
    logChange(change)
    renderDocument(change.current.document)
    renderViewport(change.current.viewport)
  })

  const stopViewport = controller.subscribeViewport(({ viewport }) =>
    renderViewport(viewport)
  )

  return {
    element: overlay.element,
    setOpen,
    destroy: () => {
      stopState()
      stopViewport()
      overlay.destroy()
    },
  }
}
