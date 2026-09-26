# Schema API reference

This file is generated from the exported Effect Schemas. Run `bun run docs:generate-api` after changing a public schema. It describes decoded values; see [the JavaScript API](public-api.md) for host acquisition and lifecycle.

The TypeScript shapes show decoded field types. Branded identifiers appear as strings here; runtime schemas also enforce non-empty ids, valid stroke colors, finite positive sizes and zoom, and document integrity rules such as unique ids and valid edge endpoints.

`JsonValue` below is the recursive JSON type admitted by `FlowNode.data`.

```ts
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | Readonly<Record<string, JsonValue>>
```

## Node

Generated from `FlowNodeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowNode = {
  readonly id: string
  readonly label: string
  readonly position: {
    readonly x: number
    readonly y: number
  }
  readonly parentId?: string
  readonly type?: string
  readonly data?: Readonly<Record<string, JsonValue>>
  readonly zIndex?: number
  readonly size?: {
    readonly width: number
    readonly height: number
  }
  readonly extent?: 'parent'
  readonly handles?: ReadonlyArray<{
    readonly id: string
    readonly kind: 'source' | 'target'
    readonly side: 'top' | 'right' | 'bottom' | 'left'
  }>
  readonly selected?: boolean
  readonly selectable?: boolean
  readonly focusable?: boolean
  readonly draggable?: boolean
  readonly ariaLabel?: string
  readonly ariaDescription?: string
  readonly hidden?: boolean
}
```

## Edge

Generated from `FlowEdgeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
  readonly type?: string
  readonly sourceHandle?: string
  readonly targetHandle?: string
  readonly path?: 'straight' | 'bezier' | 'step' | 'smoothstep' | 'simplebezier'
  readonly label?: string
  readonly markerStart?: 'arrow' | 'arrowclosed'
  readonly markerEnd?: 'arrow' | 'arrowclosed'
  readonly stroke?: string
  readonly strokeWidth?: number
  readonly selected?: boolean
  readonly deletable?: boolean
  readonly selectable?: boolean
  readonly focusable?: boolean
  readonly reconnectable?: boolean | 'source' | 'target'
  readonly interactionWidth?: number
  readonly ariaLabel?: string
  readonly hidden?: boolean
  readonly zIndex?: number
}
```

## Document

Generated from `FlowDocumentSchema` in `packages/core/src/public.ts`.

```ts
export type FlowDocument = {
  readonly edges: ReadonlyArray<{
    readonly id: string
    readonly source: string
    readonly target: string
    readonly type?: string
    readonly sourceHandle?: string
    readonly targetHandle?: string
    readonly path?:
      'straight' | 'bezier' | 'step' | 'smoothstep' | 'simplebezier'
    readonly label?: string
    readonly markerStart?: 'arrow' | 'arrowclosed'
    readonly markerEnd?: 'arrow' | 'arrowclosed'
    readonly stroke?: string
    readonly strokeWidth?: number
    readonly selected?: boolean
    readonly deletable?: boolean
    readonly selectable?: boolean
    readonly focusable?: boolean
    readonly reconnectable?: boolean | 'source' | 'target'
    readonly interactionWidth?: number
    readonly ariaLabel?: string
    readonly hidden?: boolean
    readonly zIndex?: number
  }>
  readonly nodes: ReadonlyArray<{
    readonly id: string
    readonly label: string
    readonly position: {
      readonly x: number
      readonly y: number
    }
    readonly parentId?: string
    readonly type?: string
    readonly data?: Readonly<Record<string, JsonValue>>
    readonly zIndex?: number
    readonly size?: {
      readonly width: number
      readonly height: number
    }
    readonly extent?: 'parent'
    readonly handles?: ReadonlyArray<{
      readonly id: string
      readonly kind: 'source' | 'target'
      readonly side: 'top' | 'right' | 'bottom' | 'left'
    }>
    readonly selected?: boolean
    readonly selectable?: boolean
    readonly focusable?: boolean
    readonly draggable?: boolean
    readonly ariaLabel?: string
    readonly ariaDescription?: string
    readonly hidden?: boolean
  }>
}
```

## Commands

Generated from `FlowCommandSchema` in `packages/core/src/public.ts`.

```ts
export type FlowCommand =
  | {
      readonly kind: 'set-node-position'
      readonly nodeId: string
      readonly position: {
        readonly x: number
        readonly y: number
      }
    }
  | {
      readonly kind: 'set-viewport'
      readonly viewport: {
        readonly x: number
        readonly y: number
        readonly zoom: number
      }
    }
```

## Changes

Generated from `FlowChangeSchema` in `packages/core/src/public.ts`.

```ts
export type FlowChange =
  | {
      readonly kind: 'node-position'
      readonly nodeId: string
      readonly position: {
        readonly x: number
        readonly y: number
      }
    }
  | {
      readonly kind: 'node-positions'
      readonly positions: ReadonlyArray<{
        readonly nodeId: string
        readonly position: {
          readonly x: number
          readonly y: number
        }
      }>
    }
  | {
      readonly kind: 'node-size'
      readonly nodeId: string
      readonly size: {
        readonly width: number
        readonly height: number
      }
    }
  | {
      readonly kind: 'node-bounds'
      readonly nodeId: string
      readonly position: {
        readonly x: number
        readonly y: number
      }
      readonly size: {
        readonly width: number
        readonly height: number
      }
      readonly childPositions: ReadonlyArray<{
        readonly nodeId: string
        readonly position: {
          readonly x: number
          readonly y: number
        }
      }>
    }
  | {
      readonly kind: 'viewport'
      readonly viewport: {
        readonly x: number
        readonly y: number
        readonly zoom: number
      }
    }
  | {
      readonly kind: 'edge-add'
      readonly edge: {
        readonly id: string
        readonly source: string
        readonly target: string
        readonly type?: string
        readonly sourceHandle?: string
        readonly targetHandle?: string
        readonly path?:
          'straight' | 'bezier' | 'step' | 'smoothstep' | 'simplebezier'
        readonly label?: string
        readonly markerStart?: 'arrow' | 'arrowclosed'
        readonly markerEnd?: 'arrow' | 'arrowclosed'
        readonly stroke?: string
        readonly strokeWidth?: number
        readonly selected?: boolean
        readonly deletable?: boolean
        readonly selectable?: boolean
        readonly focusable?: boolean
        readonly reconnectable?: boolean | 'source' | 'target'
        readonly interactionWidth?: number
        readonly ariaLabel?: string
        readonly hidden?: boolean
        readonly zIndex?: number
      }
    }
  | {
      readonly kind: 'edge-selection'
      readonly edgeId: string
      readonly selected: boolean
    }
  | {
      readonly kind: 'node-selection'
      readonly nodeId: string
      readonly selected: boolean
    }
  | {
      readonly kind: 'selection-set'
      readonly nodeIds: ReadonlyArray<string>
      readonly edgeIds: ReadonlyArray<string>
    }
  | {
      readonly kind: 'edge-reconnect'
      readonly edge: {
        readonly id: string
        readonly source: string
        readonly target: string
        readonly type?: string
        readonly sourceHandle?: string
        readonly targetHandle?: string
        readonly path?:
          'straight' | 'bezier' | 'step' | 'smoothstep' | 'simplebezier'
        readonly label?: string
        readonly markerStart?: 'arrow' | 'arrowclosed'
        readonly markerEnd?: 'arrow' | 'arrowclosed'
        readonly stroke?: string
        readonly strokeWidth?: number
        readonly selected?: boolean
        readonly deletable?: boolean
        readonly selectable?: boolean
        readonly focusable?: boolean
        readonly reconnectable?: boolean | 'source' | 'target'
        readonly interactionWidth?: number
        readonly ariaLabel?: string
        readonly hidden?: boolean
        readonly zIndex?: number
      }
    }
  | {
      readonly kind: 'edge-remove'
      readonly edgeId: string
    }
```

## Saved envelope

Generated from `SavedFlowDocumentSchema` in `packages/core/src/public.ts`.

```ts
export type SavedFlowDocument = {
  readonly version: 1
  readonly document: {
    readonly nodes: ReadonlyArray<{
      readonly id: string
      readonly label: string
      readonly position: {
        readonly x: number
        readonly y: number
      }
      readonly parentId?: string
      readonly type?: string
      readonly data?: Readonly<Record<string, JsonValue>>
      readonly zIndex?: number
      readonly size?: {
        readonly width: number
        readonly height: number
      }
      readonly extent?: 'parent'
      readonly handles?: ReadonlyArray<{
        readonly id: string
        readonly kind: 'source' | 'target'
        readonly side: 'top' | 'right' | 'bottom' | 'left'
      }>
      readonly selectable?: boolean
      readonly focusable?: boolean
      readonly draggable?: boolean
      readonly ariaLabel?: string
      readonly ariaDescription?: string
      readonly hidden?: boolean
    }>
    readonly edges: ReadonlyArray<{
      readonly id: string
      readonly source: string
      readonly target: string
      readonly type?: string
      readonly sourceHandle?: string
      readonly targetHandle?: string
      readonly path?:
        'straight' | 'bezier' | 'step' | 'smoothstep' | 'simplebezier'
      readonly label?: string
      readonly markerStart?: 'arrow' | 'arrowclosed'
      readonly markerEnd?: 'arrow' | 'arrowclosed'
      readonly stroke?: string
      readonly strokeWidth?: number
      readonly deletable?: boolean
      readonly selectable?: boolean
      readonly focusable?: boolean
      readonly reconnectable?: boolean | 'source' | 'target'
      readonly interactionWidth?: number
      readonly ariaLabel?: string
      readonly hidden?: boolean
      readonly zIndex?: number
    }>
  }
}
```
