# Schema API reference



This file is generated from the exported Effect Schemas. Run `bun run docs:generate-api` after changing a public schema. It describes decoded values; see [the JavaScript API](public-api.md) for host acquisition and lifecycle.

The TypeScript shapes show decoded field types. Branded identifiers appear as strings here; runtime schemas also enforce non-empty ids, valid stroke colors, finite positive sizes and zoom, and document integrity rules such as unique ids and valid edge endpoints.

Host pane options are documented in [pane input and zoom limits](public-api.md#pane-input-and-zoom-limits).



`JsonValue` below is the recursive JSON type admitted by `FlowNode.data`.



```ts

export type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | Readonly<Record<string, JsonValue>>;

```





## Node

Generated from `FlowNodeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowNode = {
  readonly id: string;
  readonly label: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly origin?: ReadonlyArray<number>;
  readonly parentId?: string;
  readonly type?: string;
  readonly data?: Readonly<Record<string, JsonValue>>;
  readonly zIndex?: number;
  readonly size?: {
    readonly width: number;
    readonly height: number;
  };
  readonly extent?: "parent";
  readonly handles?: ReadonlyArray<{
    readonly id: string;
    readonly kind: "source" | "target";
    readonly side: "top" | "right" | "bottom" | "left";
    readonly connectable?: boolean;
    readonly connectableStart?: boolean;
    readonly connectableEnd?: boolean;
  }>;
  readonly selected?: boolean;
  readonly selectable?: boolean;
  readonly focusable?: boolean;
  readonly connectable?: boolean;
  readonly draggable?: boolean;
  readonly deletable?: boolean;
  readonly ariaRole?: string;
  readonly ariaLabel?: string;
  readonly ariaDescription?: string;
  readonly hidden?: boolean;
  readonly style?: Readonly<Record<string, JsonValue>>;
  readonly className?: string;
  readonly sourcePosition?: "top" | "right" | "bottom" | "left";
  readonly targetPosition?: "top" | "right" | "bottom" | "left";
  readonly dragHandle?: string;
  readonly expandParent?: boolean;
  readonly measured?: {
    readonly width?: number;
    readonly height?: number;
  };
};
```

## Shape data

Generated from `FlowFigureDataSchema` in `packages/core/src/public.ts`.

```ts
export type FlowFigureData = {
  readonly type: "circle" | "diamond" | "hexagon";
  readonly color: "#ff0071" | "#1a8cff" | "#00b884" | "#ffb300";
};
```

## Shape commands

Generated from `FlowFigureEditSchema` in `packages/core/src/public.ts`.

```ts
export type FlowFigureEdit = {
  readonly kind: "create";
  readonly id: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly figure: {
    readonly type: "circle" | "diamond" | "hexagon";
    readonly color: "#ff0071" | "#1a8cff" | "#00b884" | "#ffb300";
  };
  readonly size?: {
    readonly width: number;
    readonly height: number;
  };
}
| {
  readonly kind: "color";
  readonly nodeId: string;
  readonly color: "#ff0071" | "#1a8cff" | "#00b884" | "#ffb300";
};
```

## Edge

Generated from `FlowEdgeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowEdge = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type?: string;
  readonly sourceHandle?: string;
  readonly targetHandle?: string;
  readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
  readonly route?: {
    readonly mode: "automatic";
  }
  | {
    readonly mode: "manual";
    readonly points: ReadonlyArray<{
      readonly x: number;
      readonly y: number;
    }>;
  };
  readonly label?: string;
  readonly data?: Readonly<Record<string, JsonValue>>;
  readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
  readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly style?: Readonly<Record<string, JsonValue>>;
  readonly className?: string;
  readonly animated?: boolean;
  readonly labelStyle?: Readonly<Record<string, JsonValue>>;
  readonly labelShowBg?: boolean;
  readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
  readonly labelBgPadding?: ReadonlyArray<number>;
  readonly labelBgBorderRadius?: number;
  readonly selected?: boolean;
  readonly deletable?: boolean;
  readonly selectable?: boolean;
  readonly focusable?: boolean;
  readonly reconnectable?: boolean | "source" | "target";
  readonly interactionWidth?: number;
  readonly ariaRole?: string;
  readonly ariaLabel?: string;
  readonly hidden?: boolean;
  readonly zIndex?: number;
};
```

## Document

Generated from `FlowDocumentSchema` in `packages/core/src/public.ts`.

```ts
export type FlowDocument = {
  readonly edges: ReadonlyArray<{
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly type?: string;
    readonly sourceHandle?: string;
    readonly targetHandle?: string;
    readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
    readonly route?: {
      readonly mode: "automatic";
    }
    | {
      readonly mode: "manual";
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
    };
    readonly label?: string;
    readonly data?: Readonly<Record<string, JsonValue>>;
    readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
    readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
    readonly stroke?: string;
    readonly strokeWidth?: number;
    readonly style?: Readonly<Record<string, JsonValue>>;
    readonly className?: string;
    readonly animated?: boolean;
    readonly labelStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelShowBg?: boolean;
    readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelBgPadding?: ReadonlyArray<number>;
    readonly labelBgBorderRadius?: number;
    readonly selected?: boolean;
    readonly deletable?: boolean;
    readonly selectable?: boolean;
    readonly focusable?: boolean;
    readonly reconnectable?: boolean | "source" | "target";
    readonly interactionWidth?: number;
    readonly ariaRole?: string;
    readonly ariaLabel?: string;
    readonly hidden?: boolean;
    readonly zIndex?: number;
  }>;
  readonly nodeOrigin?: ReadonlyArray<number>;
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly position: {
      readonly x: number;
      readonly y: number;
    };
    readonly origin?: ReadonlyArray<number>;
    readonly parentId?: string;
    readonly type?: string;
    readonly data?: Readonly<Record<string, JsonValue>>;
    readonly zIndex?: number;
    readonly size?: {
      readonly width: number;
      readonly height: number;
    };
    readonly extent?: "parent";
    readonly handles?: ReadonlyArray<{
      readonly id: string;
      readonly kind: "source" | "target";
      readonly side: "top" | "right" | "bottom" | "left";
      readonly connectable?: boolean;
      readonly connectableStart?: boolean;
      readonly connectableEnd?: boolean;
    }>;
    readonly selected?: boolean;
    readonly selectable?: boolean;
    readonly focusable?: boolean;
    readonly connectable?: boolean;
    readonly draggable?: boolean;
    readonly deletable?: boolean;
    readonly ariaRole?: string;
    readonly ariaLabel?: string;
    readonly ariaDescription?: string;
    readonly hidden?: boolean;
    readonly style?: Readonly<Record<string, JsonValue>>;
    readonly className?: string;
    readonly sourcePosition?: "top" | "right" | "bottom" | "left";
    readonly targetPosition?: "top" | "right" | "bottom" | "left";
    readonly dragHandle?: string;
    readonly expandParent?: boolean;
    readonly measured?: {
      readonly width?: number;
      readonly height?: number;
    };
  }>;
};
```

## Transaction context

Generated from `FlowTransactionContextSchema` in `packages/core/src/public.ts`.

```ts
export type FlowTransactionContext = {
  readonly transactionId: string;
  readonly origin: {
    readonly kind: "local" | "remote" | "system";
    readonly actorId: string;
  };
  readonly gestureId?: string;
};
```

## History status

Generated from `FlowHistoryStatusSchema` in `packages/core/src/public.ts`.

```ts
export type FlowHistoryStatus = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pending: boolean;
  readonly pastCount: number;
  readonly futureCount: number;
  readonly capacity: number;
  readonly disposed: boolean;
};
```

## Commands

Generated from `FlowCommandSchema` in `packages/core/src/public.ts`.

```ts
export type FlowCommand = {
  readonly kind: "set-node-position";
  readonly nodeId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}
| {
  readonly kind: "set-viewport";
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
  };
}
| {
  readonly kind: "edit-transaction";
  readonly transaction: {
    readonly operations: ReadonlyArray<{
      readonly kind: "set-nodes";
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    }
    | {
      readonly kind: "add-nodes";
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    }
    | {
      readonly kind: "set-edges";
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
    }
    | {
      readonly kind: "add-edges";
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
    }
    | {
      readonly kind: "update-node";
      readonly nodeId: string;
      readonly patch: Readonly<Record<string, JsonValue>>;
      readonly replace?: boolean;
    }
    | {
      readonly kind: "update-edge";
      readonly edgeId: string;
      readonly patch: Readonly<Record<string, JsonValue>>;
      readonly replace?: boolean;
    }
    | {
      readonly kind: "update-node-data";
      readonly nodeId: string;
      readonly data: Readonly<Record<string, JsonValue>>;
      readonly replace?: boolean;
    }
    | {
      readonly kind: "update-edge-data";
      readonly edgeId: string;
      readonly data: Readonly<Record<string, JsonValue>>;
      readonly replace?: boolean;
    }
    | {
      readonly kind: "delete-elements";
      readonly nodeIds?: ReadonlyArray<string>;
      readonly edgeIds?: ReadonlyArray<string>;
    }>;
    readonly context?: {
      readonly transactionId: string;
      readonly origin: {
        readonly kind: "local" | "remote" | "system";
        readonly actorId: string;
      };
      readonly gestureId?: string;
    };
  };
};
```

## Changes

Generated from `FlowChangeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowChange = {
  readonly kind: "node-position";
  readonly nodeId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}
| {
  readonly kind: "node-positions";
  readonly positions: ReadonlyArray<{
    readonly nodeId: string;
    readonly position: {
      readonly x: number;
      readonly y: number;
    };
  }>;
}
| {
  readonly kind: "node-size";
  readonly nodeId: string;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
}
| {
  readonly kind: "node-bounds";
  readonly nodeId: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly childPositions: ReadonlyArray<{
    readonly nodeId: string;
    readonly position: {
      readonly x: number;
      readonly y: number;
    };
  }>;
}
| {
  readonly kind: "viewport";
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
  };
}
| {
  readonly kind: "edge-add";
  readonly edge: {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly type?: string;
    readonly sourceHandle?: string;
    readonly targetHandle?: string;
    readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
    readonly route?: {
      readonly mode: "automatic";
    }
    | {
      readonly mode: "manual";
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
    };
    readonly label?: string;
    readonly data?: Readonly<Record<string, JsonValue>>;
    readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
    readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
    readonly stroke?: string;
    readonly strokeWidth?: number;
    readonly style?: Readonly<Record<string, JsonValue>>;
    readonly className?: string;
    readonly animated?: boolean;
    readonly labelStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelShowBg?: boolean;
    readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelBgPadding?: ReadonlyArray<number>;
    readonly labelBgBorderRadius?: number;
    readonly selected?: boolean;
    readonly deletable?: boolean;
    readonly selectable?: boolean;
    readonly focusable?: boolean;
    readonly reconnectable?: boolean | "source" | "target";
    readonly interactionWidth?: number;
    readonly ariaRole?: string;
    readonly ariaLabel?: string;
    readonly hidden?: boolean;
    readonly zIndex?: number;
  };
}
| {
  readonly kind: "edge-selection";
  readonly edgeId: string;
  readonly selected: boolean;
}
| {
  readonly kind: "node-selection";
  readonly nodeId: string;
  readonly selected: boolean;
}
| {
  readonly kind: "selection-set";
  readonly nodeIds: ReadonlyArray<string>;
  readonly edgeIds: ReadonlyArray<string>;
}
| {
  readonly kind: "edge-reconnect";
  readonly edge: {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly type?: string;
    readonly sourceHandle?: string;
    readonly targetHandle?: string;
    readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
    readonly route?: {
      readonly mode: "automatic";
    }
    | {
      readonly mode: "manual";
      readonly points: ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>;
    };
    readonly label?: string;
    readonly data?: Readonly<Record<string, JsonValue>>;
    readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
    readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
    readonly stroke?: string;
    readonly strokeWidth?: number;
    readonly style?: Readonly<Record<string, JsonValue>>;
    readonly className?: string;
    readonly animated?: boolean;
    readonly labelStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelShowBg?: boolean;
    readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
    readonly labelBgPadding?: ReadonlyArray<number>;
    readonly labelBgBorderRadius?: number;
    readonly selected?: boolean;
    readonly deletable?: boolean;
    readonly selectable?: boolean;
    readonly focusable?: boolean;
    readonly reconnectable?: boolean | "source" | "target";
    readonly interactionWidth?: number;
    readonly ariaRole?: string;
    readonly ariaLabel?: string;
    readonly hidden?: boolean;
    readonly zIndex?: number;
  };
}
| {
  readonly kind: "edge-remove";
  readonly edgeId: string;
}
| {
  readonly kind: "edit-proposal";
  readonly document: {
    readonly edges: ReadonlyArray<{
      readonly id: string;
      readonly source: string;
      readonly target: string;
      readonly type?: string;
      readonly sourceHandle?: string;
      readonly targetHandle?: string;
      readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
      readonly route?: {
        readonly mode: "automatic";
      }
      | {
        readonly mode: "manual";
        readonly points: ReadonlyArray<{
          readonly x: number;
          readonly y: number;
        }>;
      };
      readonly label?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
      readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
      readonly stroke?: string;
      readonly strokeWidth?: number;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly animated?: boolean;
      readonly labelStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelShowBg?: boolean;
      readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelBgPadding?: ReadonlyArray<number>;
      readonly labelBgBorderRadius?: number;
      readonly selected?: boolean;
      readonly deletable?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly reconnectable?: boolean | "source" | "target";
      readonly interactionWidth?: number;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly hidden?: boolean;
      readonly zIndex?: number;
    }>;
    readonly nodeOrigin?: ReadonlyArray<number>;
    readonly nodes: ReadonlyArray<{
      readonly id: string;
      readonly label: string;
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly origin?: ReadonlyArray<number>;
      readonly parentId?: string;
      readonly type?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly zIndex?: number;
      readonly size?: {
        readonly width: number;
        readonly height: number;
      };
      readonly extent?: "parent";
      readonly handles?: ReadonlyArray<{
        readonly id: string;
        readonly kind: "source" | "target";
        readonly side: "top" | "right" | "bottom" | "left";
        readonly connectable?: boolean;
        readonly connectableStart?: boolean;
        readonly connectableEnd?: boolean;
      }>;
      readonly selected?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly connectable?: boolean;
      readonly draggable?: boolean;
      readonly deletable?: boolean;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly ariaDescription?: string;
      readonly hidden?: boolean;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly sourcePosition?: "top" | "right" | "bottom" | "left";
      readonly targetPosition?: "top" | "right" | "bottom" | "left";
      readonly dragHandle?: string;
      readonly expandParent?: boolean;
      readonly measured?: {
        readonly width?: number;
        readonly height?: number;
      };
    }>;
  };
  readonly deletion: {
    readonly deletedNodeIds: ReadonlyArray<string>;
    readonly deletedEdgeIds: ReadonlyArray<string>;
  };
  readonly context?: {
    readonly transactionId: string;
    readonly origin: {
      readonly kind: "local" | "remote" | "system";
      readonly actorId: string;
    };
    readonly gestureId?: string;
  };
};
```

## Snapshot

Generated from `FlowSnapshotSchema` in `packages/core/src/public.ts`.

```ts
export type FlowSnapshot = {
  readonly document: {
    readonly edges: ReadonlyArray<{
      readonly id: string;
      readonly source: string;
      readonly target: string;
      readonly type?: string;
      readonly sourceHandle?: string;
      readonly targetHandle?: string;
      readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
      readonly route?: {
        readonly mode: "automatic";
      }
      | {
        readonly mode: "manual";
        readonly points: ReadonlyArray<{
          readonly x: number;
          readonly y: number;
        }>;
      };
      readonly label?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
      readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
      readonly stroke?: string;
      readonly strokeWidth?: number;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly animated?: boolean;
      readonly labelStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelShowBg?: boolean;
      readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelBgPadding?: ReadonlyArray<number>;
      readonly labelBgBorderRadius?: number;
      readonly selected?: boolean;
      readonly deletable?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly reconnectable?: boolean | "source" | "target";
      readonly interactionWidth?: number;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly hidden?: boolean;
      readonly zIndex?: number;
    }>;
    readonly nodeOrigin?: ReadonlyArray<number>;
    readonly nodes: ReadonlyArray<{
      readonly id: string;
      readonly label: string;
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly origin?: ReadonlyArray<number>;
      readonly parentId?: string;
      readonly type?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly zIndex?: number;
      readonly size?: {
        readonly width: number;
        readonly height: number;
      };
      readonly extent?: "parent";
      readonly handles?: ReadonlyArray<{
        readonly id: string;
        readonly kind: "source" | "target";
        readonly side: "top" | "right" | "bottom" | "left";
        readonly connectable?: boolean;
        readonly connectableStart?: boolean;
        readonly connectableEnd?: boolean;
      }>;
      readonly selected?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly connectable?: boolean;
      readonly draggable?: boolean;
      readonly deletable?: boolean;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly ariaDescription?: string;
      readonly hidden?: boolean;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly sourcePosition?: "top" | "right" | "bottom" | "left";
      readonly targetPosition?: "top" | "right" | "bottom" | "left";
      readonly dragHandle?: string;
      readonly expandParent?: boolean;
      readonly measured?: {
        readonly width?: number;
        readonly height?: number;
      };
    }>;
  };
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
  };
};
```

## Accepted-state change

Generated from `FlowStateChangeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowStateChange = {
  readonly previous: {
    readonly document: {
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
      readonly nodeOrigin?: ReadonlyArray<number>;
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    };
    readonly viewport: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
    };
  };
  readonly current: {
    readonly document: {
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
      readonly nodeOrigin?: ReadonlyArray<number>;
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    };
    readonly viewport: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
    };
  };
  readonly cause: "document-update" | "viewport-update" | "semantic-change";
};
```

## Accepted state snapshot

Generated from `FlowSnapshotSchema` in `packages/core/src/public.ts`.

```ts
export type FlowSnapshot = {
  readonly document: {
    readonly edges: ReadonlyArray<{
      readonly id: string;
      readonly source: string;
      readonly target: string;
      readonly type?: string;
      readonly sourceHandle?: string;
      readonly targetHandle?: string;
      readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
      readonly route?: {
        readonly mode: "automatic";
      }
      | {
        readonly mode: "manual";
        readonly points: ReadonlyArray<{
          readonly x: number;
          readonly y: number;
        }>;
      };
      readonly label?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
      readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
      readonly stroke?: string;
      readonly strokeWidth?: number;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly animated?: boolean;
      readonly labelStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelShowBg?: boolean;
      readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
      readonly labelBgPadding?: ReadonlyArray<number>;
      readonly labelBgBorderRadius?: number;
      readonly selected?: boolean;
      readonly deletable?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly reconnectable?: boolean | "source" | "target";
      readonly interactionWidth?: number;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly hidden?: boolean;
      readonly zIndex?: number;
    }>;
    readonly nodeOrigin?: ReadonlyArray<number>;
    readonly nodes: ReadonlyArray<{
      readonly id: string;
      readonly label: string;
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly origin?: ReadonlyArray<number>;
      readonly parentId?: string;
      readonly type?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly zIndex?: number;
      readonly size?: {
        readonly width: number;
        readonly height: number;
      };
      readonly extent?: "parent";
      readonly handles?: ReadonlyArray<{
        readonly id: string;
        readonly kind: "source" | "target";
        readonly side: "top" | "right" | "bottom" | "left";
        readonly connectable?: boolean;
        readonly connectableStart?: boolean;
        readonly connectableEnd?: boolean;
      }>;
      readonly selected?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly connectable?: boolean;
      readonly draggable?: boolean;
      readonly deletable?: boolean;
      readonly ariaRole?: string;
      readonly ariaLabel?: string;
      readonly ariaDescription?: string;
      readonly hidden?: boolean;
      readonly style?: Readonly<Record<string, JsonValue>>;
      readonly className?: string;
      readonly sourcePosition?: "top" | "right" | "bottom" | "left";
      readonly targetPosition?: "top" | "right" | "bottom" | "left";
      readonly dragHandle?: string;
      readonly expandParent?: boolean;
      readonly measured?: {
        readonly width?: number;
        readonly height?: number;
      };
    }>;
  };
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
  };
};
```

## Accepted state notification

Generated from `FlowStateChangeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowStateChange = {
  readonly previous: {
    readonly document: {
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
      readonly nodeOrigin?: ReadonlyArray<number>;
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    };
    readonly viewport: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
    };
  };
  readonly current: {
    readonly document: {
      readonly edges: ReadonlyArray<{
        readonly id: string;
        readonly source: string;
        readonly target: string;
        readonly type?: string;
        readonly sourceHandle?: string;
        readonly targetHandle?: string;
        readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
        readonly route?: {
          readonly mode: "automatic";
        }
        | {
          readonly mode: "manual";
          readonly points: ReadonlyArray<{
            readonly x: number;
            readonly y: number;
          }>;
        };
        readonly label?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly markerStart?: "arrow" | "arrowclosed" | JsonValue;
        readonly markerEnd?: "arrow" | "arrowclosed" | JsonValue;
        readonly stroke?: string;
        readonly strokeWidth?: number;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly animated?: boolean;
        readonly labelStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelShowBg?: boolean;
        readonly labelBgStyle?: Readonly<Record<string, JsonValue>>;
        readonly labelBgPadding?: ReadonlyArray<number>;
        readonly labelBgBorderRadius?: number;
        readonly selected?: boolean;
        readonly deletable?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly reconnectable?: boolean | "source" | "target";
        readonly interactionWidth?: number;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly hidden?: boolean;
        readonly zIndex?: number;
      }>;
      readonly nodeOrigin?: ReadonlyArray<number>;
      readonly nodes: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly position: {
          readonly x: number;
          readonly y: number;
        };
        readonly origin?: ReadonlyArray<number>;
        readonly parentId?: string;
        readonly type?: string;
        readonly data?: Readonly<Record<string, JsonValue>>;
        readonly zIndex?: number;
        readonly size?: {
          readonly width: number;
          readonly height: number;
        };
        readonly extent?: "parent";
        readonly handles?: ReadonlyArray<{
          readonly id: string;
          readonly kind: "source" | "target";
          readonly side: "top" | "right" | "bottom" | "left";
          readonly connectable?: boolean;
          readonly connectableStart?: boolean;
          readonly connectableEnd?: boolean;
        }>;
        readonly selected?: boolean;
        readonly selectable?: boolean;
        readonly focusable?: boolean;
        readonly connectable?: boolean;
        readonly draggable?: boolean;
        readonly deletable?: boolean;
        readonly ariaRole?: string;
        readonly ariaLabel?: string;
        readonly ariaDescription?: string;
        readonly hidden?: boolean;
        readonly style?: Readonly<Record<string, JsonValue>>;
        readonly className?: string;
        readonly sourcePosition?: "top" | "right" | "bottom" | "left";
        readonly targetPosition?: "top" | "right" | "bottom" | "left";
        readonly dragHandle?: string;
        readonly expandParent?: boolean;
        readonly measured?: {
          readonly width?: number;
          readonly height?: number;
        };
      }>;
    };
    readonly viewport: {
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
    };
  };
  readonly cause: "document-update" | "viewport-update" | "semantic-change";
};
```

## Saved envelope

Generated from `SavedFlowDocumentSchema` in `packages/core/src/public.ts`.

```ts
export type SavedFlowDocument = {
  readonly version: 1;
  readonly document: {
    readonly nodes: ReadonlyArray<{
      readonly id: string;
      readonly label: string;
      readonly position: {
        readonly x: number;
        readonly y: number;
      };
      readonly parentId?: string;
      readonly type?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly zIndex?: number;
      readonly size?: {
        readonly width: number;
        readonly height: number;
      };
      readonly extent?: "parent";
      readonly handles?: ReadonlyArray<{
        readonly id: string;
        readonly kind: "source" | "target";
        readonly side: "top" | "right" | "bottom" | "left";
      }>;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly draggable?: boolean;
      readonly deletable?: boolean;
      readonly ariaLabel?: string;
      readonly ariaDescription?: string;
      readonly hidden?: boolean;
    }>;
    readonly edges: ReadonlyArray<{
      readonly id: string;
      readonly source: string;
      readonly target: string;
      readonly type?: string;
      readonly sourceHandle?: string;
      readonly targetHandle?: string;
      readonly path?: "straight" | "bezier" | "step" | "smoothstep" | "simplebezier";
      readonly label?: string;
      readonly data?: Readonly<Record<string, JsonValue>>;
      readonly markerStart?: "arrow" | "arrowclosed";
      readonly markerEnd?: "arrow" | "arrowclosed";
      readonly stroke?: string;
      readonly strokeWidth?: number;
      readonly deletable?: boolean;
      readonly selectable?: boolean;
      readonly focusable?: boolean;
      readonly reconnectable?: boolean | "source" | "target";
      readonly interactionWidth?: number;
      readonly ariaLabel?: string;
      readonly hidden?: boolean;
      readonly zIndex?: number;
    }>;
  };
};
```