import {
  applyEdgeReconnectChange,
  applyEdgeRemoveChange,
  applyEdgeSelectionChange,
  applyNodePositionChange,
  applyNodeBoundsChange,
  applyNodePositionsChange,
  applyNodeSelectionChange,
  applySelectionSetChange,
  decodeFlowDocument,
  type FlowEdge,
  type FlowNode,
  simpleBezierEdgePath,
} from "@flow/core";
import { Effect, ManagedRuntime } from "effect";

import "./style.css";
import { createFlowHost } from "./mount-flow.ts";
import { BrowserApplicationLive } from "./telemetry.ts";

const source = {
  nodes: [
    {
      id: "input",
      label: "Input · drag me",
      position: { x: 110, y: 500 },
      handles: [{ id: "out", kind: "source", side: "right" }],
    },
    {
      id: "transform",
      label: "Transform",
      position: { x: 390, y: 320 },
      type: "demo-card",
      data: { detail: "Typed node renderer" },
      size: { width: 210, height: 100 },
      handles: [
        { id: "in", kind: "target", side: "left" },
        { id: "out", kind: "source", side: "right" },
      ],
    },
    {
      id: "validate",
      label: "Validate",
      position: { x: 390, y: 510 },
      handles: [
        { id: "in", kind: "target", side: "left" },
        { id: "out", kind: "source", side: "right" },
      ],
    },
    {
      id: "output",
      label: "Output",
      position: { x: 710, y: 410 },
      handles: [{ id: "in", kind: "target", side: "left" }],
    },
    {
      id: "remote-a",
      label: "Remote input",
      position: { x: 1900, y: 400 },
      handles: [{ id: "out", kind: "source", side: "right" }],
    },
    {
      id: "remote-b",
      label: "Remote output",
      position: { x: 2200, y: 400 },
      handles: [{ id: "in", kind: "target", side: "left" }],
    },
  ],
  edges: [
    {
      id: "straight",
      source: "input",
      target: "transform",
      path: "straight",
      label: "straight",
      markerEnd: "arrowclosed",
      stroke: "#2563eb",
    },
    {
      id: "bezier",
      source: "input",
      target: "validate",
      path: "bezier",
      label: "bezier",
      markerEnd: "arrow",
    },
    {
      id: "simple",
      source: "transform",
      target: "output",
      path: "simplebezier",
      type: "demo-edge",
      label: "simple Bezier",
      markerEnd: "arrowclosed",
      zIndex: 1,
      stroke: "#7c3aed",
    },
    {
      id: "smooth",
      source: "validate",
      target: "output",
      path: "smoothstep",
      label: "smooth step",
    },
    {
      id: "hidden",
      source: "transform",
      target: "validate",
      path: "step",
      label: "step · hidden",
      hidden: true,
      stroke: "#ea580c",
    },
    {
      id: "remote",
      source: "remote-a",
      target: "remote-b",
      path: "step",
      label: "step",
      markerEnd: "arrowclosed",
    },
  ],
};

const runtime = ManagedRuntime.make(BrowserApplicationLive);

const playgroundCopy = {
  home: {
    description:
      "Main graph: compare edge paths, connect handles, reveal the hidden step edge, and hide Validate to see its connected edges disappear.",
    helper:
      "Click to select a node. Control or Command adds nodes to the selection; drag one selected node to move the group. Drag between handles or click a source and target to connect. Shift-drag the pane to select overlapping nodes.",
  },
  remote: {
    description:
      "Distant graph: inspect the remote node pair. Viewport culling removes the main graph from the DOM until you return to it.",
    helper:
      "Only nodes near the viewport are rendered. Connect Remote input to Remote output, then choose Main graph to return. Drag near a pane edge during a connection to pan.",
  },
  fit: {
    description:
      "Fit graph: centered the full graph, including nodes outside the current viewport.",
    helper:
      "Fit graph uses measured sizes where available and temporary node-size estimates elsewhere. It leaves padding around the whole graph; visited nodes use their exact measured sizes.",
  },
  fitPending: {
    description:
      "Fit graph: the graph already fits within the current viewport.",
    helper:
      "Drag the pane or zoom with the mouse wheel, then choose Fit graph to return to an overview of all nodes.",
  },
  validatorOn: {
    description:
      "Connection rule active: new links into Output are rejected. Try connecting Input to Output, then turn the rule off.",
    helper:
      "Drag from Input's source handle or click it, then choose Output's target handle. The rule rejects that new edge; existing edges stay visible.",
  },
  validatorOff: {
    description:
      "Connection rule off: new source-to-target links into Output are allowed when they are not duplicates.",
    helper:
      "Connect Input to Output by dragging or by clicking the two handles. A duplicate endpoint pair is still rejected.",
  },
  hiddenShown: {
    description:
      "Step edge visible: compare its right-angle route with the other paths in the main graph.",
    helper:
      "The step edge runs from Transform to Validate. Choose Hide step edge to remove its rendered path while keeping it in the document.",
  },
  hiddenHidden: {
    description:
      "Step edge hidden: its edge remains in the document but has no rendered path.",
    helper:
      "Choose Show hidden edge to render the same edge again. The graph document keeps the edge throughout the toggle.",
  },
  nodeHidden: {
    description:
      "Validate hidden: its node and connected edges leave the canvas while the document keeps them.",
    helper:
      "Choose Show Validate node to restore the node and its connected edges. Other nodes and edges remain mounted.",
  },
  nodeShown: {
    description:
      "Validate visible: its node and connected edges return without replacing the graph.",
    helper:
      "Drag Validate to see its connected paths follow, or choose Hide Validate node to remove it from the rendered canvas again.",
  },
} as const;

const program = Effect.gen(function* program() {
  const root = globalThis.document.querySelector<HTMLElement>("#app");

  if (root === null) {
    return yield* Effect.die(new Error("Missing #app host element"));
  }

  const document = yield* decodeFlowDocument(source);
  let currentDocument = document;
  let blockOutputConnections = false;

  const host = yield* createFlowHost(root, document, {
    documentMode: "uncontrolled",
    autoPanOnConnect: true,
    connectOnClick: true,
    connectionRadius: 20,
    isValidConnection: (connection) =>
      !blockOutputConnections || connection.target !== "output",
    nodeDragThreshold: 4,
    nodeExtent: { minX: 0, minY: 0, maxX: 3200, maxY: 1000 },
    renderOnlyVisible: true,
    selectionMode: "partial",
    ui: { controls: true, minimap: true },
    snapGrid: { x: 10, y: 10 },
    runEffect: runtime.runSync,
    nodeRenderers: {
      "demo-card": (node: FlowNode, content: HTMLElement) => {
        const update = (next: FlowNode): void => {
          content.textContent = `${next.label} · ${String(next.data?.detail ?? "")}`;
        };
        update(node);
        return { update, destroy: () => content.replaceChildren() };
      },
    },
    edgeRenderers: {
      "demo-edge": {
        geometry: (_edge: FlowEdge, endpoints) => ({
          pathData: simpleBezierEdgePath(endpoints.source, endpoints.target, endpoints.sourceSide, endpoints.targetSide),
          labelAnchor: { x: (endpoints.source.x + endpoints.target.x) / 2, y: (endpoints.source.y + endpoints.target.y) / 2 },
        }),
      },
    },
    viewport: {
      extent: { minX: -100, minY: -100, maxX: 3200, maxY: 1200 },
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { maxZoom: 2, minZoom: 0.5 },
      mode: "uncontrolled",
    },
  });

  const panel = globalThis.document.createElement("aside");
  panel.className = "flow-demo-panel";
  panel.innerHTML = `<span class="flow-demo-kicker">VANILLA HOST · LIVE</span>
    <h1>Flow playground</h1>
    <p class="flow-demo-description" aria-live="polite">${playgroundCopy.home.description}</p>
    <div class="flow-demo-actions">
      <button type="button" data-action="home" aria-pressed="true" aria-current="true">Main graph</button>
      <button type="button" data-action="remote" aria-pressed="false">Distant graph</button>
      <button type="button" data-action="fit">Fit graph</button>
      <button type="button" data-action="validator" aria-pressed="false">Block Output connections</button>
      <button type="button" data-action="hidden">Show hidden edge</button>
      <button type="button" data-action="node">Hide Validate node</button>
    </div>
    <p class="flow-demo-note" aria-live="polite">${playgroundCopy.home.helper}</p>
    <output class="flow-demo-status" aria-live="polite">Ready · 5 edge paths · 6 nodes</output>`;
  root.append(panel);

  const status = panel.querySelector<HTMLOutputElement>("output");

  const description = panel.querySelector<HTMLParagraphElement>(
    ".flow-demo-description"
  );

  const helper = panel.querySelector<HTMLParagraphElement>(".flow-demo-note");

  const selectAction = (
    action: string,
    copy: { readonly description: string; readonly helper: string }
  ): void => {
    if (description !== null) {
      description.textContent = copy.description;
    }

    if (helper !== null) {
      helper.textContent = copy.helper;
    }

    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      "button[data-action]"
    )) {
      if (button.dataset.action === action) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  };

  let hiddenShown = false;
  let validateHidden = false;

  const showExample = (example: "home" | "remote"): void => {
    host.updateViewport(
      example === "home" ? { x: 0, y: 0, zoom: 1 } : { x: -1730, y: 0, zoom: 1 }
    );

    selectAction(example, playgroundCopy[example]);

    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      'button[data-action="home"], button[data-action="remote"]'
    )) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.action === example)
      );
    }
  };

  const showFit = (): void => {
    selectAction(
      "fit",
      host.fitView() ? playgroundCopy.fit : playgroundCopy.fitPending
    );
  };

  const onPanelClick = (event: MouseEvent): void => {
    const button =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>("button[data-action]")
        : null;

    if (button?.dataset.action === "home") {
      showExample("home");
    } else if (button?.dataset.action === "remote") {
      showExample("remote");
    } else if (button?.dataset.action === "fit") {
      showFit();
    } else if (button?.dataset.action === "validator") {
      showExample("home");
      blockOutputConnections = !blockOutputConnections;
      button.setAttribute("aria-pressed", String(blockOutputConnections));
      button.textContent = blockOutputConnections
        ? "Allow Output connections"
        : "Block Output connections";

      selectAction(
        "validator",
        blockOutputConnections
          ? playgroundCopy.validatorOn
          : playgroundCopy.validatorOff
      );
    } else if (button?.dataset.action === "hidden") {
      showExample("home");
      hiddenShown = !hiddenShown;
      currentDocument = {
        ...currentDocument,
        edges: currentDocument.edges.map((edge) =>
          edge.id === "hidden" ? { ...edge, hidden: !hiddenShown } : edge
        ),
      };
      host.update(currentDocument);
      button.textContent = hiddenShown ? "Hide step edge" : "Show hidden edge";

      selectAction(
        "hidden",
        hiddenShown ? playgroundCopy.hiddenShown : playgroundCopy.hiddenHidden
      );
    } else if (button?.dataset.action === "node") {
      showExample("home");
      validateHidden = !validateHidden;
      currentDocument = {
        ...currentDocument,
        nodes: currentDocument.nodes.map((node) =>
          node.id === "validate" ? { ...node, hidden: validateHidden } : node
        ),
      };
      host.update(currentDocument);
      button.textContent = validateHidden
        ? "Show Validate node"
        : "Hide Validate node";

      selectAction(
        "node",
        validateHidden ? playgroundCopy.nodeHidden : playgroundCopy.nodeShown
      );
    }
  };

  panel.addEventListener("click", onPanelClick);

  const unsubscribe = host.subscribe((change) => {
    // eslint-disable-next-line default-case -- The schema-derived change union is exhaustive.
    switch (change.kind) {
      case "node-bounds": {
        currentDocument = applyNodeBoundsChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "node-position": {
        currentDocument =
          applyNodePositionChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "node-positions": {
        currentDocument =
          applyNodePositionsChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "node-selection": {
        currentDocument =
          applyNodeSelectionChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "selection-set": {
        currentDocument =
          applySelectionSetChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "edge-add": {
        currentDocument = {
          ...currentDocument,
          edges: [...currentDocument.edges, change.edge],
        };
        break;
      }

      case "edge-selection": {
        currentDocument =
          applyEdgeSelectionChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "edge-reconnect": {
        currentDocument =
          applyEdgeReconnectChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "edge-remove": {
        currentDocument =
          applyEdgeRemoveChange(currentDocument, change) ?? currentDocument;
        break;
      }

      case "viewport": {
        break;
      }
    }

    root.dataset.lastChange = JSON.stringify(change);

    if (status !== null) {
      status.textContent = `${change.kind.replaceAll("-", " ")} · ${new Date().toLocaleTimeString()}`;
    }
  });

  yield* Effect.sync(() => {
    globalThis.addEventListener(
      "beforeunload",
      () => {
        panel.removeEventListener("click", onPanelClick);
        unsubscribe();
        host.destroy();
        void runtime.dispose();
      },
      { once: true }
    );
  });
}).pipe(Effect.withSpan("flow.app.start"));

void runtime.runPromise(
  program.pipe(Effect.catchCause((cause) => Effect.logFatal(cause)))
);
