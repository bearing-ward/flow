# Controlled selection followed by keyboard deletion

## Entry and observed failure

UP-126-028 enters through the real browser wrapper click, immediately presses `d`, then checks detachment and zero edges at `apps/shared-e2e/upstream/nodes.ts:192`. Foldkit registers the unchanged contract at `apps/foldkit/e2e/upstream-playwright.e2e.ts:21`. Its fixture embeds a controlled document at `apps/foldkit/src/upstream-fixture.ts:73`, installs the public delete client at `apps/foldkit/src/upstream-fixture.ts:108`, and synchronously applies each `changes` proposal and sends `HostAction.ReplaceDocument` at `apps/foldkit/src/upstream-fixture.ts:207`.

The baseline's initial single run passed. The repeated run then failed eight times before interruption, with one interrupted and eleven unexecuted repetitions. The separate new regression also failed against the original product code. Thus the planner's 20/20 report was not reproduced as that exact count in this environment; the race itself was reproduced.

A temporary production probe recorded the following reduction order, with instrumentation removed afterward:

1. Replace the unchanged, unselected position document.
2. Native delete reads accepted revision 0 and no selected nodes.
3. Replace the document selecting Node-1, advancing to revision 1.
4. DeleteRequest arrives with empty IDs and baseRevision 0 against revision 1.

This confirms the selection acknowledgement race and an additional stale client revision. A selected class observed afterward does not prove that selection was accepted at keydown.

## Production ordering, geometry, and DOM

Native pointer release and the trailing node click reach `ObserveMouse` through `packages/foldkit/src/graph.ts:6572`. Click selection constructs a `selection-set` and retains the accepted document in controlled mode at `packages/foldkit/src/graph.ts:3153`. No pending selection is rendered optimistically. Live drag geometry is projected separately through `selectLiveModel` at `packages/foldkit/src/graph.ts:2722`; the view constructs measured graph geometry at `packages/foldkit/src/graph.ts:7324`, then derives the wrapper's selected class from its node at `packages/foldkit/src/graph.ts:7521`.

The native keyboard subscription filters instance and editable-target ownership and emits `DeleteSelected` at `packages/foldkit/src/canvas-input.ts:58`. At baseline `08134ca`, `packages/foldkit/src/application.ts:2742` immediately copied selected IDs from the accepted document. The detached publication worker yields before publishing each FIFO batch at `packages/foldkit/src/application.ts:3640`.

Pinned Foldkit 0.169.0 adds two more scheduling boundaries. `node_modules/foldkit/dist/runtime/hostConnector.js:39` explicitly defers outbound subscribers with `queueMicrotask`; `node_modules/foldkit/dist/port/port.js:95` implements inbound streams using a callback queue. `Port.emit` schedules host delivery rather than completing a subscriber acknowledgement at `node_modules/foldkit/dist/port/port.js:144`. The runtime's message queue can also defer its drain after its work budget at `node_modules/foldkit/dist/runtime/messageQueue.js:85`. A synchronous host callback therefore does not synchronously replace runtime state.

The owner's action stream enters at `packages/foldkit/src/application.ts:2020`. `ReplaceDocument` routes to the graph's replacement branch, `packages/foldkit/src/graph.ts:3603`, and accepted-document changes advance the application revision. The client independently counts document-changing `acceptedStates` notifications at `packages/foldkit/src/delete-approval.ts:427`. Before the fix its keyboard request used that potentially older count; the runtime rejects mismatched revisions before candidate preparation at `packages/foldkit/src/application.ts:2959`.

## Repair and public ownership

Native `DeleteSelected` now publishes an intent, preserving the detached FIFO lane. After preceding `changes` subscriber callbacks, the public delete client sends `RequestKeyboardDelete` through the same actions port those callbacks use at `packages/foldkit/src/delete-approval.ts:519`. FIFO delivery on that one inbound stream places the selection acknowledgement first. The action reads accepted IDs and their revision together at `packages/foldkit/src/application.ts:2231`. The resulting keyboard request carries that exact revision into the existing guarded delete workflow at `packages/foldkit/src/delete-approval.ts:523`. Selection rejection or replacement remains authoritative; no pending selection is accepted internally.

The shared action schema lives in `packages/foldkit/src/host-action.ts:13`, with the previous application exports retained. It avoids a client/application import cycle. Existing edit-prepare spans, delete failure boundaries, cancellation, disposal, and approval revision checks remain. No high-frequency logging or OTLP delivery claim is added. Hosts that deliberately acknowledge later must still decide when to accept their changes; this ordering guarantee covers acknowledgements sent synchronously from the changes subscriber.

## Other hosts and test boundaries

Vanilla's fixture explicitly selects controlled mode at `apps/vanilla/src/upstream-fixture.ts:43`. Its subscriber calls `controller.update` synchronously at `apps/vanilla/src/upstream-fixture.ts:79`; production publication invokes listeners directly at `apps/vanilla/src/mount-flow.ts:8463`. Replacement sets the document before returning at `apps/vanilla/src/mount-flow.ts:13776`, so keyboard deletion reads that accepted document at `apps/vanilla/src/mount-flow.ts:11924`. Reentrant updates drain in the same stack through `executeMutation` at `apps/vanilla/src/mount-flow.ts:3811`. There is no port boundary between selection and owner acknowledgement.

Vue's upstream fixture passes a reactive document and synchronously applies changes at `apps/vue/src/upstream-fixture.ts:75`, but it does not set documentMode. The actual default is uncontrolled at `packages/vue/src/flow-canvas.ts:764`. The uncontrolled owner updates immediately through the publish path. In explicit controlled mode, `activeDocument` reads props at `packages/vue/src/flow-canvas.ts:1279`, change emission calls the owner synchronously at `packages/vue/src/flow-canvas.ts:2505`, and Vue flushes that reactive owner's props before the next discrete browser task. Vue 3.5.44 schedules component jobs at `node_modules/.bun/@vue+runtime-core@3.5.44/node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js:6465` and flushes them through a resolved Promise at `node_modules/.bun/@vue+runtime-core@3.5.44/node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js:320`. Delete reads `activeDocument` at `packages/vue/src/flow-canvas.ts:7960`.

The Foldkit regression at `apps/foldkit/e2e/node-input.e2e.ts:43` uses real browser click and immediate keypress against the public controlled fixture, with no selection assertion or waiting between them. The explicit controlled Vue regression at `apps/vue/e2e/node-input.e2e.ts:9` mounts the public component with a synchronous owner through `apps/vue/e2e/controlled-delete-harness.ts:9`, then uses the same immediate browser sequence. Reducer checks at `packages/foldkit/src/delete-approval.test.ts:91` separately prove owner acceptance and rejection. The client revision test separately proves use of the runtime's receipt when accepted-state delivery lags. These unit inputs do not establish native input ordering; the browser regressions do.

The broad verifier also reproduced the named dynamic-layout flake, separately from deletion. The original conversion step checked document counts, then sampled geometry without waiting for the layout-completion counter at `apps/foldkit/e2e/layout-recipes.e2e.ts:297`. The fixture updates that counter only after editing positions, refreshing measurements, fitting, and rendering at `apps/foldkit/ui-recipes/layout/main.ts:186` and `apps/foldkit/ui-recipes/layout/main.ts:197`. The test now uses its existing counter barrier at `apps/foldkit/e2e/layout-recipes.e2e.ts:302` before the original geometry comparisons. No upstream assertion, geometry threshold, timeout, or product layout behavior changes.

Final results are recorded in [Plan 129](../../plans/129-foldkit-controlled-select-delete.md). Every browser invocation uses the owner-token lock wrapper and one worker. Imported upstream evidence and assertions remain unchanged.

## Conformity and deviations

Conforming within the unchanged UP-126-028 and native browser regression boundaries: click followed immediately by the configured delete key removes the selected node and incident edges. Intentionally different internally: Foldkit preserves typed ports, detached publication, and host-local asynchronous approval instead of React's discrete-event state flush. A rejecting controlled owner remains authoritative. Broader React parity, delayed-owner behavior, other browser engines, full-profile acceptance, and collector-side OTLP delivery remain unverified.
