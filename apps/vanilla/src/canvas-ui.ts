import type { FlowToolbarAnchor } from "@flow/core";
import type { CanvasPanelPlacement } from "./mount-flow.ts";

export interface CanvasUINode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CanvasUIActions {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly fit: () => void;
  readonly navigate: (x: number, y: number) => void;
  readonly setInteractionMode: (mode: "select" | "pan") => void;
}

export interface CanvasUISettings {
  readonly controls: boolean;
  readonly minimap: boolean;
  readonly toolbarContainers?: {
    readonly nodes?: Readonly<Record<string, HTMLElement>> | undefined;
    readonly edges?: Readonly<Record<string, HTMLElement>> | undefined;
  } | undefined;
  readonly panels?: readonly CanvasUIPanel[] | undefined;
}

export interface CanvasUIPanel {
  readonly id: string;
  readonly element: HTMLElement;
  readonly placement: CanvasPanelPlacement;
}

export const createCanvasUI = (
  settings: CanvasUISettings,
  actions: CanvasUIActions,
  panel?: HTMLElement,
  panelParent?: Node,
  panelNextSibling?: Node | null
) => {
  const root = document.createElement("div");
  root.className = "flow-canvas-ui";
  const buttons: HTMLButtonElement[] = [];
  root.addEventListener("click", (event) => {
    const action = (event.target as Element | null)?.closest<HTMLButtonElement>("button[data-action]")?.dataset.action;
    if (action === "zoom-in") actions.zoomIn();
    if (action === "zoom-out") actions.zoomOut();
    if (action === "fit") actions.fit();
    if (action === "interaction-mode") {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button[data-action=interaction-mode]");
      actions.setInteractionMode(button?.getAttribute("aria-pressed") === "true" ? "select" : "pan");
    }
    event.stopPropagation();
  });
  if (settings.controls) {
    const controls = document.createElement("div");
    controls.className = "flow-controls";
    const addButton = (name: string, label: string): void => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "flow-control-button";
      button.dataset.action = name;
      button.setAttribute("aria-label", label);
      button.textContent = name === "zoom-in" ? "+" : name === "zoom-out" ? "−" : "Fit";
      buttons.push(button);
      controls.append(button);
    };
    addButton("zoom-in", "Zoom in");
    addButton("zoom-out", "Zoom out");
    addButton("fit", "Fit view");
    const modeButton = document.createElement("button");
    modeButton.type = "button";
    modeButton.className = "flow-control-button";
    modeButton.dataset.action = "interaction-mode";
    modeButton.setAttribute("aria-label", "Switch to pan mode");
    modeButton.setAttribute("aria-pressed", "false");
    modeButton.textContent = "Select";
    buttons.push(modeButton);
    controls.append(modeButton);
    root.append(controls);
  }

  let minimap: SVGSVGElement | undefined;
  let scene: SVGGElement | undefined;
  if (settings.minimap) {
    minimap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    minimap.classList.add("flow-minimap");
    minimap.setAttribute("viewBox", "0 0 180 120");
    minimap.setAttribute("role", "img");
    minimap.setAttribute("aria-label", "Graph minimap");
    scene = document.createElementNS("http://www.w3.org/2000/svg", "g");
    minimap.append(scene);
    minimap.addEventListener("click", (event) => {
      const rect = minimap!.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        actions.navigate((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
      }
    });
    root.append(minimap);
  }

  const panels: readonly CanvasUIPanel[] = settings.panels ?? (panel === undefined ? [] : [{ id: "legacy-panel", element: panel, placement: "top-right" }]);
  const panelRestores = panels.map(({ element }) => ({
    element,
    parent: element === panel ? panelParent ?? element.parentNode ?? undefined : element.parentNode ?? undefined,
    next: element === panel ? panelNextSibling ?? element.nextSibling : element.nextSibling,
    classAttribute: element.getAttribute("class"),
    styleAttribute: element.getAttribute("style"),
    hiddenAttribute: element.getAttribute("hidden"),
  }));
  const focusedPanelElement = panels.map(({ element }) => element.contains(document.activeElement) ? document.activeElement : null).find((element) => element instanceof HTMLElement) as HTMLElement | undefined;
  const readSelection = (element: HTMLElement | undefined) =>
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && ["text", "search", "url", "tel", "password"].includes(element.type))
      ? { start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection }
      : undefined;
  const restoreSelection = (element: HTMLElement | undefined, selection: ReturnType<typeof readSelection>): void => {
    if (selection !== undefined && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      element.setSelectionRange(selection.start, selection.end, selection.direction ?? undefined);
    }
  };
  const focusedInput = readSelection(focusedPanelElement);
  for (const entry of panels) {
    const slot = document.createElement("div");
    slot.className = "flow-panel-slot";
    slot.dataset.placement = entry.placement;
    slot.dataset.panelId = entry.id;
    slot.append(entry.element);
    root.append(slot);
  }
  const portal = document.createElement("div");
  portal.className = "flow-overlay-portal";
  portal.dataset.flowOverlayPortal = "";
  root.append(portal);

  const toolbarRestores: Array<{
    element: HTMLElement;
    parent: Node | undefined;
    next: Node | null;
    classAttribute: string | null;
    hiddenAttribute: string | null;
    transform: string;
    transformPriority: string;
    toolbarKind: string | null;
    toolbarId: string | null;
  }> = [];
  for (const [kind, items] of [["node", settings.toolbarContainers?.nodes], ["edge", settings.toolbarContainers?.edges]] as const) {
    for (const [id, element] of Object.entries(items ?? {})) {
      toolbarRestores.push({
        element,
        parent: element.parentNode ?? undefined,
        next: element.nextSibling,
        classAttribute: element.getAttribute("class"),
        hiddenAttribute: element.getAttribute("hidden"),
        transform: element.style.getPropertyValue("transform"),
        transformPriority: element.style.getPropertyPriority("transform"),
        toolbarKind: element.getAttribute("data-toolbar-kind"),
        toolbarId: element.getAttribute("data-toolbar-id"),
      });
      element.classList.add("flow-toolbar-container");
      element.dataset.toolbarKind = kind;
      element.dataset.toolbarId = id;
      root.append(element);
    }
  }

  return {
    element: root,
    update: (nodes: readonly CanvasUINode[], bounds: { x: number; y: number; width: number; height: number }, viewport: { x: number; y: number; zoom: number }, pane: { width: number; height: number }): void => {
      if (scene === undefined || minimap === undefined) return;
      scene.replaceChildren();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const scale = Math.min(168 / bounds.width, 108 / bounds.height);
      const offsetX = 6 + (168 - bounds.width * scale) / 2;
      const offsetY = 6 + (108 - bounds.height * scale) / 2;
      for (const node of nodes) {
        const shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shape.dataset.nodeId = node.id;
        shape.setAttribute("x", String(offsetX + (node.x - bounds.x) * scale));
        shape.setAttribute("y", String(offsetY + (node.y - bounds.y) * scale));
        shape.setAttribute("width", String(Math.max(1, node.width * scale)));
        shape.setAttribute("height", String(Math.max(1, node.height * scale)));
        shape.setAttribute("rx", "1");
        shape.classList.add("flow-minimap-node");
        scene.append(shape);
      }
      const visible = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      visible.dataset.testid = "flow-minimap-viewport";
      visible.setAttribute("x", String(offsetX + (-viewport.x / viewport.zoom - bounds.x) * scale));
      visible.setAttribute("y", String(offsetY + (-viewport.y / viewport.zoom - bounds.y) * scale));
      visible.setAttribute("width", String((pane.width / viewport.zoom) * scale));
      visible.setAttribute("height", String((pane.height / viewport.zoom) * scale));
      visible.classList.add("flow-minimap-viewport");
      scene.append(visible);
      minimap.dataset.scale = String(scale);
      minimap.dataset.offsetX = String(offsetX);
      minimap.dataset.offsetY = String(offsetY);
      minimap.dataset.boundsX = String(bounds.x);
      minimap.dataset.boundsY = String(bounds.y);
      minimap.dataset.boundsWidth = String(bounds.width);
      minimap.dataset.boundsHeight = String(bounds.height);
    },
    updateToolbars: (anchors: { readonly nodes: readonly FlowToolbarAnchor[]; readonly edges: readonly FlowToolbarAnchor[] }): void => {
      for (const [items, anchorsForKind] of [[settings.toolbarContainers?.nodes, anchors.nodes], [settings.toolbarContainers?.edges, anchors.edges]] as const) {
        const byId = new Map(anchorsForKind.map((anchor) => [anchor.id, anchor]));
        for (const [id, element] of Object.entries(items ?? {})) {
          const anchor = byId.get(id);
          element.hidden = anchor === undefined;
          if (anchor !== undefined) element.style.transform = `translate(${anchor.position.x}px, ${anchor.position.y}px) translate(-50%, -100%)`;
        }
      }
    },
    setInteractionMode: (mode: "select" | "pan"): void => {
      const button = root.querySelector<HTMLButtonElement>('button[data-action="interaction-mode"]');
      if (button === null) return;
      button.setAttribute("aria-pressed", String(mode === "pan"));
      button.setAttribute("aria-label", mode === "pan" ? "Switch to select mode" : "Switch to pan mode");
      button.textContent = mode === "pan" ? "Pan" : "Select";
    },
    restoreFocus: (): void => {
      focusedPanelElement?.focus({ preventScroll: true });
      restoreSelection(focusedPanelElement, focusedInput);
    },
    captureActiveFocus: (): (() => void) | undefined => {
      const focusedElement = document.activeElement instanceof HTMLElement && panelRestores.some(({ element }) => element.contains(document.activeElement))
        ? document.activeElement
        : undefined;
      if (focusedElement === undefined) return undefined;
      const focusedSelection = readSelection(focusedElement);
      return () => {
        focusedElement.focus({ preventScroll: true });
        restoreSelection(focusedElement, focusedSelection);
      };
    },
    destroy: (restoreCapturedFocus?: (() => void) | undefined): void => {
      for (const button of buttons) button.remove();
      const focusedElement = document.activeElement instanceof HTMLElement && panelRestores.some(({ element }) => element.contains(document.activeElement))
        ? document.activeElement
        : undefined;
      const focusedSelection = readSelection(focusedElement);
      const owned = [
        ...toolbarRestores.map((restore) => ({ element: restore.element, parent: restore.parent, next: restore.next })),
        ...panelRestores.map((restore) => ({ element: restore.element, parent: restore.parent, next: restore.next })),
      ];
      for (const restore of owned) restore.element.remove();
      const restoreGroups = new Map<Node, typeof owned>();
      for (const restore of owned) {
        if (restore.parent === undefined) continue;
        const group = restoreGroups.get(restore.parent) ?? [];
        group.push(restore);
        restoreGroups.set(restore.parent, group);
      }
      for (const [parent, restores] of restoreGroups) {
        const pending = new Set(restores);
        while (pending.size > 0) {
          let restoredAny = false;
          for (const restore of pending) {
            const nextIsPending = [...pending].some((candidate) => candidate.element === restore.next);
            if (nextIsPending) continue;
            parent.insertBefore(restore.element, restore.next?.parentNode === parent ? restore.next : null);
            pending.delete(restore);
            restoredAny = true;
          }
          if (!restoredAny) {
            for (const restore of pending) parent.appendChild(restore.element);
            pending.clear();
          }
        }
      }
      for (const restore of toolbarRestores) {
        if (restore.classAttribute === null) restore.element.removeAttribute("class");
        else restore.element.setAttribute("class", restore.classAttribute);
        if (restore.hiddenAttribute === null) restore.element.removeAttribute("hidden");
        else restore.element.setAttribute("hidden", restore.hiddenAttribute);
        if (restore.transform === "") restore.element.style.removeProperty("transform");
        else restore.element.style.setProperty("transform", restore.transform, restore.transformPriority);
        if (restore.toolbarKind === null) restore.element.removeAttribute("data-toolbar-kind");
        else restore.element.setAttribute("data-toolbar-kind", restore.toolbarKind);
        if (restore.toolbarId === null) restore.element.removeAttribute("data-toolbar-id");
        else restore.element.setAttribute("data-toolbar-id", restore.toolbarId);
      }
      for (const restore of panelRestores) {
        if (restore.classAttribute === null) restore.element.removeAttribute("class");
        else restore.element.setAttribute("class", restore.classAttribute);
        if (restore.styleAttribute === null) restore.element.removeAttribute("style");
        else restore.element.setAttribute("style", restore.styleAttribute);
        if (restore.hiddenAttribute === null) restore.element.removeAttribute("hidden");
        else restore.element.setAttribute("hidden", restore.hiddenAttribute);
      }
      root.remove();
      if (restoreCapturedFocus === undefined) {
        focusedElement?.focus({ preventScroll: true });
        restoreSelection(focusedElement, focusedSelection);
      } else {
        restoreCapturedFocus();
      }
    },
    portal,
  };
};
