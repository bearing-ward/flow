# Node dragging

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The first Flow slice intentionally implements one-node pointer dragging, not the full reference behavior described here.

All paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Shared path

```text
pointer or touch starts on a draggable node
  -> adapter-owned XYDrag instance
    -> threshold and selection handling
      -> screen-to-flow pointer conversion
        -> drag items with pointer offset and measured geometry
          -> extent and snap calculation on every move
            -> adapter position update and semantic changes
              -> final non-dragging change and cleanup
```

`XYDrag` receives store access and adapter callbacks, then owns transient pointer position, drag items, threshold state, animation-frame auto-pan, and cancellation flags at `packages/system/src/xydrag/XYDrag.ts:100`.

At drag start it resolves selection behavior, converts the event through the current viewport, and creates drag items for the target or selected nodes at `packages/system/src/xydrag/XYDrag.ts:259`. `getDragItems` records each node's document position, absolute position, measured dimensions, and pointer offset at `packages/system/src/xydrag/utils.ts:35`.

Movement starts only after client-coordinate distance exceeds `nodeDragThreshold`. This keeps the threshold stable across zoom levels at `packages/system/src/xydrag/XYDrag.ts:324`. Each move converts the pointer to flow coordinates, preserves the initial pointer offset, optionally snaps, applies single- or multi-node extents, mutates drag items, and calls the adapter's `updateNodePositions` at `packages/system/src/xydrag/XYDrag.ts:130`.

Auto-pan runs on animation frames near the pane edge. It pans the viewport, compensates the last flow position for zoom, and recomputes node positions at `packages/system/src/xydrag/XYDrag.ts:232`. Multi-touch or removal of the active node aborts the gesture. End cancels the frame, emits a final `dragging: false` update when positions changed, and calls stop callbacks at `packages/system/src/xydrag/XYDrag.ts:364`.

The d3 filter accepts the primary button, rejects `noDragClassName` descendants, and enforces an optional drag-handle selector at `packages/system/src/xydrag/XYDrag.ts:401`. `destroy` removes d3's `.drag` listeners at `packages/system/src/xydrag/XYDrag.ts:414`.

The current implementation uses d3's global gesture handling rather than explicit pointer capture. Flow's browser adapter can use native pointer capture for its smaller first slice.

## React production path

`useDrag` creates one `XYDrag` instance for a draggable wrapper, bridges selection and local dragging state, updates instance options, and destroys it on effect cleanup at `packages/react/src/hooks/useDrag.ts:22`.

The React store converts drag items into `position` changes. It also updates active connections, expands parents, runs change middleware, updates uncontrolled nodes, and calls `onNodesChange` at `packages/react/src/store/index.ts:211`.

## Svelte production path

The Svelte action exposes the same store values to `XYDrag`, including viewport, extents, snapping, selection, auto-pan, and position callbacks at `packages/svelte/src/lib/actions/drag/index.ts:20`. The action destroys the instance when disabled or unmounted.

The Svelte store immediately maps drag items into a new bound node array at `packages/svelte/src/lib/store/index.ts:61`. `NodeWrapper` passes public start, move, and stop callbacks into the action at `packages/svelte/src/lib/components/NodeWrapper/NodeWrapper.svelte:238`.

## Tests and gaps

The shared Playwright suite verifies a visible node moves, `draggable=false` blocks movement, and a custom handle restricts initiation at `tests/playwright/e2e/nodes.spec.ts:94`. The generic test does not assert the exact final flow position, threshold, zoom conversion, semantic change payload, cancellation, auto-pan, or cleanup.

## Flow decision

The first slice models an active drag as schema-derived transient state with a node id, pointer id, and flow-space offset. Core functions calculate positions from viewport and pointer inputs. The vanilla host owns pointer capture and listeners, applies transient CSS positions, and emits one schema-derived node-position change on completion. Multi-selection, snapping, extents, auto-pan, touch-specific policy, and keyboard movement remain later behaviors.

## Conformity and deviations

- **Conforms:** Flow converts pointer coordinates through the viewport and preserves the initial pointer-to-node offset.
- **Conforms:** Flow applies transient positions during drag and commits a semantic position when the gesture ends.
- **Deviates:** Flow uses native pointer capture instead of d3-drag. This avoids adding a dependency before the full gesture contract is designed.
- **Deviates:** Flow emits one final position change. The reference emits changes during dragging and at stop. The controlled-state contract must decide the final policy.
- **Unverified:** Thresholds, selection interaction, drag handles, snapping, extents, auto-pan, multitouch abort, removal during drag, and keyboard movement are not implemented.

The Flow browser test proves one exact mouse drag and final semantic change. It does not prove the unimplemented reference behaviors.
