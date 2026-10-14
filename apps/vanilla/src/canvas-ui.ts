import type { FlowAriaLabelConfig, FlowToolbarAnchor } from '@flow/core'

import type { CanvasPanelPlacement } from './mount-flow.ts'

export interface CanvasUINode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CanvasUIActions {
  readonly zoomIn: () => void
  readonly zoomOut: () => void
  readonly fit: () => void
  readonly navigate: (x: number, y: number) => void
  readonly setInteractionMode: (mode: 'select' | 'pan') => void
}

export interface CanvasUISettings {
  readonly controls: boolean
  readonly minimap: boolean
  /** Resolved `ariaLabelConfig` entries for the built-in controls and minimap. */
  readonly ariaLabels: Pick<
    FlowAriaLabelConfig,
    | 'controls.ariaLabel'
    | 'controls.zoomIn.ariaLabel'
    | 'controls.zoomOut.ariaLabel'
    | 'controls.fitView.ariaLabel'
    | 'minimap.ariaLabel'
  >
  readonly toolbarContainers?:
    | {
        readonly nodes?: Readonly<Record<string, HTMLElement>> | undefined
        readonly edges?: Readonly<Record<string, HTMLElement>> | undefined
      }
    | undefined
  readonly panels?: readonly CanvasUIPanel[] | undefined
}

export interface CanvasUIPanel {
  readonly id: string
  readonly element: HTMLElement
  readonly placement: CanvasPanelPlacement
}

type ParentContainer = Node & ParentNode

type SiblingNode = Node & ChildNode

const getParentContainer = (node: Node | null): ParentContainer | undefined =>
  node instanceof Element ||
  node instanceof Document ||
  node instanceof DocumentFragment
    ? node
    : undefined

const getSiblingNode = (node: Node | null): SiblingNode | null =>
  node instanceof Element || node instanceof CharacterData ? node : null

interface OwnedElementRestore {
  readonly element: HTMLElement
  readonly parent: ParentContainer | undefined
  readonly next: SiblingNode | null
}

type PanelRestore = OwnedElementRestore & {
  readonly classAttribute: string | null
  readonly styleAttribute: string | null
  readonly hiddenAttribute: string | null
}

type ToolbarRestore = OwnedElementRestore & {
  readonly classAttribute: string | null
  readonly hiddenAttribute: string | null
  readonly transform: string
  readonly transformPriority: string
  readonly toolbarKind: string | null
  readonly toolbarId: string | null
}

const readSelection = (element: HTMLElement | undefined) =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement &&
    ['text', 'search', 'url', 'tel', 'password'].includes(element.type))
    ? {
        start: element.selectionStart,
        end: element.selectionEnd,
        direction: element.selectionDirection,
      }
    : undefined

interface FocusRestore {
  readonly element: HTMLElement | undefined
  readonly selection: ReturnType<typeof readSelection>
}

const restoreOwnedElements = (owned: readonly OwnedElementRestore[]): void => {
  for (const restore of owned) {
    restore.element.remove()
  }

  const restoreGroups = new Map<ParentContainer, OwnedElementRestore[]>()

  for (const restore of owned) {
    if (restore.parent === undefined) {
      continue
    }

    const group = restoreGroups.get(restore.parent) ?? []
    group.push(restore)
    restoreGroups.set(restore.parent, group)
  }

  for (const [parent, restores] of restoreGroups) {
    const pending = new Set(restores)

    while (pending.size > 0) {
      let restoredAny = false

      for (const restore of pending) {
        const nextIsPending = [...pending].some(
          (candidate) => candidate.element === restore.next
        )

        if (nextIsPending) {
          continue
        }

        if (restore.next?.parentNode === parent) {
          restore.next.before(restore.element)
        } else {
          parent.append(restore.element)
        }

        pending.delete(restore)
        restoredAny = true
      }

      if (!restoredAny) {
        for (const restore of pending) {
          parent.append(restore.element)
        }

        pending.clear()
      }
    }
  }
}

const restoreAttribute = (
  element: HTMLElement,
  name: string,
  value: string | null
): void => {
  if (value === null) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

const restoreToolbarState = (restores: readonly ToolbarRestore[]): void => {
  for (const restore of restores) {
    restoreAttribute(restore.element, 'class', restore.classAttribute)
    restoreAttribute(restore.element, 'hidden', restore.hiddenAttribute)

    if (restore.transform === '') {
      restore.element.style.removeProperty('transform')
    } else {
      restore.element.style.setProperty(
        'transform',
        restore.transform,
        restore.transformPriority
      )
    }

    if (restore.toolbarKind === null) {
      delete restore.element.dataset.toolbarKind
    } else {
      restore.element.dataset.toolbarKind = restore.toolbarKind
    }

    if (restore.toolbarId === null) {
      delete restore.element.dataset.toolbarId
    } else {
      restore.element.dataset.toolbarId = restore.toolbarId
    }
  }
}

const restorePanelState = (restores: readonly PanelRestore[]): void => {
  for (const restore of restores) {
    restoreAttribute(restore.element, 'class', restore.classAttribute)
    restoreAttribute(restore.element, 'style', restore.styleAttribute)
    restoreAttribute(restore.element, 'hidden', restore.hiddenAttribute)
  }
}

const capturePanelFocus = (restores: readonly PanelRestore[]): FocusRestore => {
  const element =
    document.activeElement instanceof HTMLElement &&
    restores.some(({ element: panel }) =>
      panel.contains(document.activeElement)
    )
      ? document.activeElement
      : undefined

  return { element, selection: readSelection(element) }
}

const restorePanelFocus = (focus: FocusRestore): void => {
  focus.element?.focus({ preventScroll: true })

  if (
    focus.selection !== undefined &&
    (focus.element instanceof HTMLInputElement ||
      focus.element instanceof HTMLTextAreaElement)
  ) {
    focus.element.setSelectionRange(
      focus.selection.start,
      focus.selection.end,
      focus.selection.direction ?? undefined
    )
  }
}

export const createCanvasUI = (
  settings: CanvasUISettings,
  actions: CanvasUIActions,
  panel?: HTMLElement,
  panelParent?: Node,
  panelNextSibling?: Node | null
) => {
  const root = document.createElement('div')
  root.className = 'flow-canvas-ui'
  const buttons: HTMLButtonElement[] = []
  root.addEventListener('click', (event) => {
    const { target } = event

    const action =
      target instanceof Element
        ? target.closest<HTMLButtonElement>('button[data-action]')?.dataset
            .action
        : undefined

    if (action === 'zoom-in') {
      actions.zoomIn()
    }

    if (action === 'zoom-out') {
      actions.zoomOut()
    }

    if (action === 'fit') {
      actions.fit()
    }

    if (action === 'interaction-mode') {
      const button =
        target instanceof Element
          ? target.closest<HTMLButtonElement>(
              'button[data-action=interaction-mode]'
            )
          : undefined

      actions.setInteractionMode(
        button?.getAttribute('aria-pressed') === 'true' ? 'select' : 'pan'
      )
    }

    event.stopPropagation()
  })

  if (settings.controls) {
    const controls = document.createElement('div')
    controls.className = 'flow-controls'
    controls.setAttribute('role', 'group')
    controls.setAttribute(
      'aria-label',
      settings.ariaLabels['controls.ariaLabel']
    )

    const addButton = (name: string, label: string): void => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'flow-control-button'
      button.dataset.action = name
      button.setAttribute('aria-label', label)

      if (name === 'zoom-in') {
        button.textContent = '+'
      } else if (name === 'zoom-out') {
        button.textContent = '−'
      } else {
        button.textContent = 'Fit'
      }

      buttons.push(button)
      controls.append(button)
    }

    addButton('zoom-in', settings.ariaLabels['controls.zoomIn.ariaLabel'])
    addButton('zoom-out', settings.ariaLabels['controls.zoomOut.ariaLabel'])
    addButton('fit', settings.ariaLabels['controls.fitView.ariaLabel'])
    const modeButton = document.createElement('button')
    modeButton.type = 'button'
    modeButton.className = 'flow-control-button'
    modeButton.dataset.action = 'interaction-mode'
    modeButton.setAttribute('aria-label', 'Switch to pan mode')
    modeButton.setAttribute('aria-pressed', 'false')
    modeButton.textContent = 'Select'
    buttons.push(modeButton)
    controls.append(modeButton)
    root.append(controls)
  }

  let minimap: SVGSVGElement | undefined
  let scene: SVGGElement | undefined

  if (settings.minimap) {
    const minimapElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    )

    minimap = minimapElement
    minimapElement.classList.add('flow-minimap')
    minimapElement.setAttribute('viewBox', '0 0 180 120')
    minimapElement.setAttribute('role', 'img')
    minimapElement.setAttribute(
      'aria-label',
      settings.ariaLabels['minimap.ariaLabel']
    )
    scene = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    minimapElement.append(scene)
    minimapElement.addEventListener('click', (event) => {
      const rect = minimapElement.getBoundingClientRect()

      if (rect.width > 0 && rect.height > 0) {
        actions.navigate(
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height
        )
      }
    })
    root.append(minimapElement)
  }

  const panels: readonly CanvasUIPanel[] =
    settings.panels ??
    (panel === undefined
      ? []
      : [{ id: 'legacy-panel', element: panel, placement: 'top-right' }])

  const panelRestores = panels.map(({ element }) => ({
    element,
    parent:
      element === panel
        ? getParentContainer(panelParent ?? element.parentNode)
        : getParentContainer(element.parentNode),
    next:
      element === panel
        ? getSiblingNode(panelNextSibling ?? element.nextSibling)
        : getSiblingNode(element.nextSibling),
    classAttribute: element.getAttribute('class'),
    styleAttribute: element.getAttribute('style'),
    hiddenAttribute: element.getAttribute('hidden'),
  }))

  const focusedPanelElement = panels
    .map(({ element }) =>
      element.contains(document.activeElement) ? document.activeElement : null
    )
    .find((element): element is HTMLElement => element instanceof HTMLElement)

  const restoreSelection = (
    element: HTMLElement | undefined,
    selection: ReturnType<typeof readSelection>
  ): void => {
    if (
      selection !== undefined &&
      (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement)
    ) {
      element.setSelectionRange(
        selection.start,
        selection.end,
        selection.direction ?? undefined
      )
    }
  }

  const focusedInput = readSelection(focusedPanelElement)

  for (const entry of panels) {
    const slot = document.createElement('div')
    slot.className = 'flow-panel-slot'
    slot.dataset.placement = entry.placement
    slot.dataset.panelId = entry.id
    slot.append(entry.element)
    root.append(slot)
  }

  const portal = document.createElement('div')
  portal.className = 'flow-overlay-portal'
  portal.dataset.flowOverlayPortal = ''
  root.append(portal)

  const toolbarRestores: ToolbarRestore[] = []

  for (const [kind, items] of [
    ['node', settings.toolbarContainers?.nodes],
    ['edge', settings.toolbarContainers?.edges],
  ] as const) {
    for (const [id, element] of Object.entries(items ?? {})) {
      toolbarRestores.push({
        element,
        parent: getParentContainer(element.parentNode),
        next: getSiblingNode(element.nextSibling),
        classAttribute: element.getAttribute('class'),
        hiddenAttribute: element.getAttribute('hidden'),
        transform: element.style.getPropertyValue('transform'),
        transformPriority: element.style.getPropertyPriority('transform'),
        toolbarKind: element.dataset.toolbarKind ?? null,
        toolbarId: element.dataset.toolbarId ?? null,
      })
      element.classList.add('flow-toolbar-container')
      element.dataset.toolbarKind = kind
      element.dataset.toolbarId = id
      root.append(element)
    }
  }

  return {
    element: root,
    update: (
      nodes: readonly CanvasUINode[],
      bounds: { x: number; y: number; width: number; height: number },
      viewport: { x: number; y: number; zoom: number },
      pane: { width: number; height: number }
    ): void => {
      if (scene === undefined || minimap === undefined) {
        return
      }

      scene.replaceChildren()

      if (bounds.width <= 0 || bounds.height <= 0) {
        return
      }

      const scale = Math.min(168 / bounds.width, 108 / bounds.height)
      const offsetX = 6 + (168 - bounds.width * scale) / 2
      const offsetY = 6 + (108 - bounds.height * scale) / 2

      for (const node of nodes) {
        const nodeRectangle = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'rect'
        )

        nodeRectangle.dataset.nodeId = node.id
        nodeRectangle.setAttribute(
          'x',
          String(offsetX + (node.x - bounds.x) * scale)
        )
        nodeRectangle.setAttribute(
          'y',
          String(offsetY + (node.y - bounds.y) * scale)
        )
        nodeRectangle.setAttribute(
          'width',
          String(Math.max(1, node.width * scale))
        )
        nodeRectangle.setAttribute(
          'height',
          String(Math.max(1, node.height * scale))
        )
        nodeRectangle.setAttribute('rx', '1')
        nodeRectangle.classList.add('flow-minimap-node')
        scene.append(nodeRectangle)
      }

      const visible = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect'
      )

      visible.dataset.testid = 'flow-minimap-viewport'
      visible.setAttribute(
        'x',
        String(offsetX + (-viewport.x / viewport.zoom - bounds.x) * scale)
      )
      visible.setAttribute(
        'y',
        String(offsetY + (-viewport.y / viewport.zoom - bounds.y) * scale)
      )
      visible.setAttribute(
        'width',
        String((pane.width / viewport.zoom) * scale)
      )
      visible.setAttribute(
        'height',
        String((pane.height / viewport.zoom) * scale)
      )
      visible.classList.add('flow-minimap-viewport')
      scene.append(visible)
      minimap.dataset.scale = String(scale)
      minimap.dataset.offsetX = String(offsetX)
      minimap.dataset.offsetY = String(offsetY)
      minimap.dataset.boundsX = String(bounds.x)
      minimap.dataset.boundsY = String(bounds.y)
      minimap.dataset.boundsWidth = String(bounds.width)
      minimap.dataset.boundsHeight = String(bounds.height)
    },
    updateToolbars: (anchors: {
      readonly nodes: readonly FlowToolbarAnchor[]
      readonly edges: readonly FlowToolbarAnchor[]
    }): void => {
      for (const [items, anchorsForKind] of [
        [settings.toolbarContainers?.nodes, anchors.nodes],
        [settings.toolbarContainers?.edges, anchors.edges],
      ] as const) {
        const byId = new Map(
          anchorsForKind.map((anchor) => [anchor.id, anchor])
        )

        for (const [id, element] of Object.entries(items ?? {})) {
          const anchor = byId.get(id)
          element.hidden = anchor === undefined

          if (anchor !== undefined) {
            element.style.transform = `translate(${anchor.position.x}px, ${anchor.position.y}px) translate(-50%, -100%)`
          }
        }
      }
    },
    setInteractionMode: (mode: 'select' | 'pan'): void => {
      const button = root.querySelector<HTMLButtonElement>(
        'button[data-action="interaction-mode"]'
      )

      if (button === null) {
        return
      }

      button.setAttribute('aria-pressed', String(mode === 'pan'))
      button.setAttribute(
        'aria-label',
        mode === 'pan' ? 'Switch to select mode' : 'Switch to pan mode'
      )
      button.textContent = mode === 'pan' ? 'Pan' : 'Select'
    },
    restoreFocus: (): void => {
      focusedPanelElement?.focus({ preventScroll: true })
      restoreSelection(focusedPanelElement, focusedInput)
    },
    captureActiveFocus: (): (() => void) | undefined => {
      const focusedElement =
        document.activeElement instanceof HTMLElement &&
        panelRestores.some(({ element }) =>
          element.contains(document.activeElement)
        )
          ? document.activeElement
          : undefined

      if (focusedElement === undefined) {
        return undefined
      }

      const focusedSelection = readSelection(focusedElement)

      return () => {
        focusedElement.focus({ preventScroll: true })
        restoreSelection(focusedElement, focusedSelection)
      }
    },
    destroy: (restoreCapturedFocus?: (() => void) | undefined): void => {
      for (const button of buttons) {
        button.remove()
      }

      const focus = capturePanelFocus(panelRestores)

      const owned = [...toolbarRestores, ...panelRestores]

      restoreOwnedElements(owned)
      restoreToolbarState(toolbarRestores)
      restorePanelState(panelRestores)

      root.remove()

      if (restoreCapturedFocus === undefined) {
        restorePanelFocus(focus)
      } else {
        restoreCapturedFocus()
      }
    },
    portal,
  }
}
