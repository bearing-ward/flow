# Drag Handle recipe trace

This trace covers the bounded Drag Handle recipe evidence in Vanilla, Vue, and Foldkit. The catalog row remains `partial`: focused browser tests exist, but dedicated user-facing gallery routes are still planned and upstream behavior has not been compared.

## Public entry and production paths

- **Vanilla:** Consumers enter through the public `mountFlow` export in `apps/vanilla/src/public.ts:1-4`. The host's node-content pointer policy is implemented by `isNodePointerTargetAllowed` in `apps/vanilla/src/mount-flow.ts:1402-1444`: it rejects explicit no-drag descendants, requires pointerdown to be within a descendant marked `data-flow-drag-handle` when one exists, and preserves native-control behavior. The public guide documents these markers and the `draggable: false` rule in `docs/guides/custom-nodes-and-edges.md:9`.
- **Vue:** Consumers enter through the public `FlowCanvas` export in `packages/vue/src/public.ts:1`. Its pointerdown handler consults `isNodePointerTargetAllowed` at `packages/vue/src/flow-canvas.ts:2594-2640`; the policy at `packages/vue/src/flow-canvas.ts:415-433` requires the live DOM target to be inside a marked handle whenever the node content currently contains one. The explicit no-drag check is applied at `packages/vue/src/flow-canvas.ts:2601-2609`.
- **Foldkit:** Consumers enter through `createProgram` in `packages/foldkit/src/public.ts:1-12`; node-pointer admission is implemented by `shouldIgnoreNodePointer` in `packages/foldkit/src/graph.ts:2147-2174` and called by `beginPointer` in `packages/foldkit/src/graph.ts:2176-2204`. A node with a marker ignores body pointerdown outside the marked descendant; explicit no-drag descendants are ignored even within it. The playground creates a marked handle and nested keyboard control in `apps/foldkit/src/main.ts:632-669`.

The marker is host-rendered DOM state, not persisted graph data. A marked descendant narrows pointer dragging to that region; `data-flow-no-drag` exempts nested controls. The host's ordinary graph interaction then owns node movement and rendering. This slice does not assert that connected edge paths changed in every host.

## Browser test paths

- **Vanilla:** `apps/vanilla/e2e/playground.e2e.ts:66-96` activates the custom handle scene, checks the handle is visible and a card action leaves position unchanged, then drags the header and asserts the node position changes. `apps/vanilla/e2e/playground.e2e.ts:107-120` switches scenes and confirms the card fixture is restored. Focused command reported by the executor: `bun run test:browser -- playground.e2e.ts` passed all 3 tests.
- **Vue:** `apps/vue/e2e/drag-handle-recipe.e2e.ts:3-73` checks marked-handle movement, content-area suppression, normal body dragging on an unmarked node, and reload reset. Focused command reported by the executor passed 1/1.
- **Foldkit:** `apps/foldkit/e2e/drag-handle-recipe.e2e.ts:3-169` checks body suppression, nested no-drag details and keyboard controls retaining click/focus behavior, pointer dragging from the marked handle, keyboard arrow movement, and reload reset. Focused command reported by the executor passed 1/1.

The automated test evidence is a focused per-host slice, not proof that three navigable gallery routes exist. The catalog retains all host route statuses as `planned`.

## Conformity and deviations

- **Conforming within the tested boundary:** Each host has browser evidence that a marked region can initiate node movement while tested content/control regions do not. Vue additionally verifies ordinary body dragging for an unmarked node. Foldkit additionally verifies keyboard movement and nested no-drag control behavior.
- **Intentionally different:** Foldkit's playground adds a keyboard arrow control inside its pointer handle, and its focused test covers this extra interaction. This host-specific accessibility affordance is not claimed as shared behavior.
- **Unverified:** No executable comparison against the pinned or dated upstream implementation was run for this slice. Upstream parity, connected-edge path updates across every host, visual parity, and dedicated gallery routes remain unverified or planned, respectively. Test boundary: the focused Chromium E2E cases listed above; no cross-browser, device, or screen-reader comparison is included.
