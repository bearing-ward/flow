# Workflow templates audit, 2026-10-26

Plan 168 at `a6c4eab7c50d3178b5483ecf2a5d346102dfe73a`. This audit changes research and planning only. The [delivery plan](../../plans/168-workflow-delivery.md) proposes implementation work. Imported artifacts remain unchanged.

## Sources and access boundary

All URLs below were accessed on 2026-10-26 without authentication.

| Source | What was read |
| --- | --- |
| [Workflow Editor page](https://reactflow.dev/ui/templates/workflow-editor) | Public description, feature list, demo link, and Pro subscription notice. It names ELK layout, sidebar drops, themes, and sequential execution. |
| [Workflow Editor demo](https://workflow-editor.reactflow.dev/workflow) | Live browser DOM and local editing controls. The root URL redirects to `/workflow`. |
| [AI Workflow Editor page](https://reactflow.dev/ui/templates/ai-workflow-editor) | Public description, AI SDK dependency, demo link, and Pro subscription notice. |
| [AI Workflow Editor demo](https://ai-workflow-editor.reactflow.dev/workflow) | Live browser DOM, model menu, settings, and a sidebar drop. The root URL redirects to `/workflow`. |
| [Public xyflow repository](https://github.com/xyflow/xyflow) | README and root listing. This contains the React, Svelte, and system libraries, not an identified public template implementation. |

Neither template page links a public template source repository. Exact demo-URL searches and searches for the template names under `github.com/xyflow` found no attributable public template source. Candidate URLs `https://github.com/xyflow/react-flow-workflow-editor`, `https://github.com/xyflow/ai-workflow-editor`, and `https://github.com/xyflow/react-flow-ui` returned 404. This is a bounded discovery result, not proof that no public repository exists. The public library repository is not evidence of the subscription templates' runner or tests. No template ZIP, private source, or minified application bundle was used. No Svelte template implementation was identified or inspected.

The pages identify both templates as Pro examples. Implement original equivalents of public outcomes. Do not infer that the library's MIT license grants permission to copy template source or assets. No source or assets were copied.

## Live demo observations

The browser opened a new hidden preview tab and closed it after inspection. Snapshot capture timed out twice. DOM reads and locator-based actions succeeded. These notes record DOM observations, not screenshot or pixel comparisons.

### Workflow Editor

The initial graph contains Initial, Branch, Transform, and two Output nodes. The sidebar offers Initial, Transform, Join, Branch, and Output. Dragging **Join Node** onto the canvas increased the node count from five to six and created a `react-flow__node-join-node`. Each existing node has play and delete controls. Branch exposes separate `true` and `false` source handles. Edges expose `+` controls. An attempted click on an edge `+` timed out, so insertion through that control remains unverified.

The toolbar exposes zoom, a percentage readout, fit, a route-icon control, and **Run Workflow**. Settings opens a color-mode panel with **Toggle theme**. Double-clicking Transform did not expose any input, select, or textarea. A typed configuration panel is therefore a delivery question, not an observed promise of this template. The article identifies sequential execution and ELK layout, but neither was triggered. No workflow run, node play, external action, persistence, undo, clipboard, grouping, or collaboration behavior was exercised.

### AI Workflow Editor

The initial graph has two Text Input nodes, Generate Text, and Generate Image. The sidebar also offers Workflow Trigger. Dragging that item onto the canvas added a fifth node of type `workflow-trigger-node`. Text inputs contain editable prompt and system text. Generate Text exposes a model selector, temperature slider, System and Prompt inputs, Result output, and an empty generated-text display. The initial text model is `gpt-4o-mini`. Opening its menu exposed multiple model choices. These are observed demo labels, not recommendations or current provider availability claims.

Generate Image exposes an image-model selector, image-size selector, Prompt input, Image output, and an empty image preview. Its initial labels are `dall-e-2` and `256x256`. The DOM identifies `text-system`, `text-prompt`, `text-output`, `image-output`, `trigger-input`, and `trigger-output` handles. This proves distinct visible port roles, not runtime type enforcement. Per-node play, delete, and Text Input lock controls exist. Their execution and lock semantics remain unverified.

The demo initially reports that an OpenAI API key is missing. Settings exposes an empty OpenAI key field and the color-mode control. No key was entered. No play or trigger control was invoked. No LLM, image-generation, or workflow service API was called. Loading public pages and editing their local graph were the only remote-site operations. Streaming, output propagation, credentials storage, request routing, cancellation, retry, error statuses, and provider-side behavior remain unverified. The public page names AI SDK but does not establish a particular version or transport protocol.

## Rating method

C means current public Flow APIs or a runnable recipe cover the bounded outcome. P means outcome-specific support exists but the workflow composition is missing. G means no public equivalent of the essential outcome exists. These are functional availability ratings, not reference-conformity claims. Existing tests below are separate evidence of Flow behavior. A passing building-block test does not prove a template.

Each cell applies to the named outcome only. Both complete templates remain **G in Vanilla, Vue, and Foldkit** because neither an integrated workflow editor nor a workflow runner exists. Reusable data transforms and status components do not make a runner partial. No ratings were promoted by this research-only change.

Basis `page` means a public description, `demo` means the DOM or interaction above, and `proposal` means a recommended delivery requirement whose upstream behavior remains unverified. Evidence groups below give independent host citations. AI inherits W1, W5, W6, W7, and W9. Its own node kinds and configuration replace W2 through W4, and A6 replaces W8.

| ID | Workflow Editor outcome | Basis | Vanilla | Vue | Foldkit | Flow evidence and missing boundary |
| --- | --- | --- | --- | --- | --- | --- |
| W1 | View, select, move, connect, delete, zoom, and fit a graph | demo | C | C | C | E1 and E2 provide the graph and navigation APIs. This excludes workflow-specific ports and commands. |
| W2 | Drop five workflow node kinds from the palette | page, demo | P | P | P | E2 provides generic drops. No Initial, Transform, Join, Branch, Output registry or workflow palette. |
| W3 | Append a workflow node through edge controls and retain branch roles | demo control, interaction unverified | P | P | P | E2 and E4 provide edits and node/handle UI. No workflow append transaction or branch-role rules. |
| W4 | Edit configuration for each workflow kind | proposal | P | P | P | E3 provides decoded text data and editable custom nodes. No workflow configuration schema or panel. No panel was observed upstream. |
| W5 | Validate workflow structure and report actionable node/port errors | proposal | P | P | P | E1 and E2 validate documents and connection rules. No executable workflow contract, required-input checks, or runner validation report. |
| W6 | Automatically arrange nodes and edges with ELK | page, demo control | C | C | C | E5 provides measured ELK layout and host controls. Exact template coordinates and port routing remain unverified. |
| W7 | Switch light, dark, and system themes | page, demo panel | C | C | C | E6 provides shared color-mode resolution and host styling. Template theme composition is still absent. |
| W8 | Run or simulate a workflow sequentially with per-node progress and results | page, demo controls | G | G | G | E3 computes data and E4 renders status, but neither schedules a workflow or owns a run. |
| W9 | Save and restore an editable workflow | proposal | P | P | P | E7 saves generic graphs. No versioned workflow configuration or migration contract. Upstream persistence is unverified. |

| ID | AI Workflow Editor additional or replacement outcome | Basis | Vanilla | Vue | Foldkit | Flow evidence and missing boundary |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Palette for Text Input, Generate Text, Generate Image, and Workflow Trigger | demo | P | P | P | E2 supports drops, but no AI kind registry or template. |
| A2 | Edit prompt and system text without dragging the node | demo | P | P | P | E3 provides text input and propagation. No prompt/system configuration contract or AI bindings. |
| A3 | Configure a text model and temperature; inspect generated text | demo | G | G | G | E1 stores opaque JSON, but no model capability registry, generation request, or generated-text contract. |
| A4 | Configure image model and size; inspect generated image | demo | G | G | G | No image-generation boundary or output-preview lifecycle. E1's custom rendering alone is insufficient. |
| A5 | Connect text, image, system, prompt, and trigger ports | demo | P | P | P | E1 supplies named directional handles and E2 supplies connection policies. Semantic compatibility and trigger/data separation are missing. |
| A6 | Trigger runs and display per-node execution state | demo controls, execution unverified | G | G | G | E4's status display is usable, but no run scheduler or provider lifecycle exists. |
| A7 | Display incremental text output with cancellation and failure handling | proposal, upstream unverified | G | G | G | No generation stream or run-event reducer. Do not infer streaming from the AI SDK dependency. |
| A8 | Configure a provider without exposing credentials in graph data | demo key field, security behavior unverified | G | G | G | No workflow provider capability or credential boundary. Recommend offline fixtures by default, not a copied API-key field. |

## Production paths and types

### E1: shared edit, geometry, and rendered output

Input contracts are `FlowNodeSchema`, with optional string type and JSON data at `packages/core/src/domain/flow.schema.ts:147`, `FlowEdgeSchema` data at `packages/core/src/domain/flow.schema.ts:326`, and `FlowDocumentSchema` at `packages/core/src/domain/flow.schema.ts:357`. `prepareFlowEdit` decodes a transaction, constructs a candidate, and validates its final document at `packages/core/src/domain/flow-edit.ts:247`. These contracts do not define workflow node kinds or execution semantics. Typed document contracts already exist at `packages/core/src/domain/flow-data-contract.schema.ts:62`; reuse this seam rather than adding workflow fields to every canvas node.

The real browser entries for data editing are `apps/vanilla/ui-recipes/computing-flows/index.html:10`, `apps/vue/ui-recipes/computing-flows/index.html:49`, and `apps/foldkit/ui-recipes/computing-flows/index.html:10`. They load the production recipes described in E3. The production path after a public edit differs by host:

- Vanilla `updateNodeData` enters the resolved edit path at `apps/vanilla/src/mount-flow.ts:15360`. `applyEditResolved` reads the authoritative document, prepares the edit, and publishes a proposal at `apps/vanilla/src/mount-flow.ts:12357`. Uncontrolled acceptance assigns the candidate and reconciles at `apps/vanilla/src/mount-flow.ts:8918`. Projection reads absolute graph positions at `apps/vanilla/src/mount-flow.ts:8490`; `applyNodePosition` writes the DOM transform at `apps/vanilla/src/mount-flow.ts:1783`.
- Vue `useFlow().updateNodeData` resolves against the current document at `packages/vue/src/use-flow.ts:766`. `FlowCanvas` prepares an edit at `packages/vue/src/flow-canvas.ts:4668`, emits controlled proposals, or accepts into `ownedDocument` at `packages/vue/src/flow-canvas.ts:4737`. `renderNode` selects custom content and position at `packages/vue/src/flow-canvas.ts:9588`; node DOM coordinates are assigned at `packages/vue/src/flow-canvas.ts:9819`. Measurement is browser-owned through `ResizeObserver` at `packages/vue/src/flow-canvas.ts:2530`.
- Foldkit's input renderer emits `updateNodeData` at `apps/foldkit/ui-recipes/computing-flows/main.ts:41`. The recipe embeds the public program through `apps/foldkit/ui-recipes/recipe-host.ts:101`. `dispatchCommand` prepares transactions and conditionally accepts them into the model at `packages/foldkit/src/graph.ts:1344`. Graph projection resolves absolute positions and measured dimensions, then writes left/top styles at `packages/foldkit/src/graph.ts:7660`. Custom content comes from the renderer registry at `packages/foldkit/src/graph.ts:7829`. The recipe's frame wait is at `apps/foldkit/ui-recipes/recipe-host.ts:363`.

Connection edits also reach rendered SVG output. Shared handle resolution and attachment geometry are at `packages/core/src/domain/flow-edge.schema.ts:62` and line 80; Bezier path generation is at line 135. Vanilla reconciles edges after node positions at `apps/vanilla/src/mount-flow.ts:4484`, resolves handles at `apps/vanilla/src/edge-renderer.ts:627`, and writes the visible SVG path at `apps/vanilla/src/edge-renderer.ts:992`. Vue resolves measured endpoints at `packages/vue/src/flow-canvas.ts:9994`, projects edge components at line 10409, and its default edge writes the path at line 614. Foldkit calculates endpoint/path geometry at `packages/foldkit/src/graph.ts:5534`, projects edges at line 7910, and writes the SVG path at line 6064. The separate per-host `edge-geometry-recipes.e2e.ts` suites cover generic path updates, not workflow port semantics.

State ownership is explicit. Controlled owners must accept proposals; uncontrolled canvases accept them internally. DOM measurements and scheduled rendering do not define workflow meaning. React's publicly described Zustand ownership is an integration detail, not a required Flow dependency. No inaccessible upstream production call path is reconstructed from these Flow paths.

### E2: palette, connection, and mutation support

Vanilla starts at `apps/vanilla/ui-recipes/closing/index.html:10`, mounts the generic drop recipe at `apps/vanilla/src/ui/closing-recipes.ts:165`, converts client coordinates at `apps/vanilla/src/ui/closing-recipes.ts:204`, and submits `addNodes`. Vue starts at `apps/vue/ui-recipes/closing-gaps/index.html:58`; its canvas drop handler and screen conversion are at `apps/vue/src/closing-recipes.ts:420` and `apps/vue/src/closing-recipes.ts:436`. Foldkit starts at `apps/foldkit/ui-recipes/drag-and-drop/index.html:10`, decodes the dragged kind at `apps/foldkit/ui-recipes/drag-and-drop/main.ts:92`, requests viewport conversion at line 107, and submits an add-nodes transaction at line 116. Each reaches E1's edit and render path. These recipes have different generic palettes, none with workflow kinds. Separate native-drop tests are `apps/vanilla/e2e/closing-recipes.e2e.ts:84`, `apps/vue/e2e/closing-recipes.e2e.ts:91`, and `apps/foldkit/e2e/drag-and-drop-recipe.e2e.ts:33`.

Vanilla's cycle-prevention connection policy is at `apps/vanilla/src/ui/closing-recipes.ts:237`; Vue's is at `apps/vue/src/closing-recipes.ts:197`. Foldkit's production Schema Studio connection policy is at `apps/foldkit/schema-studio/main.ts:213`. Its separate test fixture defines a cycle policy at `apps/foldkit/e2e/events-and-changes-fixture.ts:203`, driven by `apps/foldkit/e2e/events-and-changes.e2e.ts:328`. This is not a standalone production workflow recipe. Graph integrity and handle identity do not establish required workflow inputs, executable DAG semantics, or type-compatible data ports.

### E3: configurable data and deterministic transforms

Vanilla's input calls `updateNodeData` at `apps/vanilla/src/ui/computing-flows-recipes.ts:62`; its uppercase renderer derives upstream text at line 82. Vue's input writes data at `apps/vue/src/computing-flows-recipes.ts:31`; its uppercase watcher is at line 71. Foldkit's renderer writes text at `apps/foldkit/ui-recipes/computing-flows/main.ts:41`; its snapshot-driven derivation starts at line 140 and syncs at line 175. Input is decoded text data, and output is uppercase text plus joined incoming values. These are dataflow examples, not a sequential runner, job history, or streamed provider output.

### E4: reusable node and status UI

Browser entries are `apps/vanilla/ui-recipes/status-indicator/index.html:18`, `apps/vue/ui-recipes/status-indicator/index.html:10`, and `apps/foldkit/ui-recipes/status-indicator/index.html:10`. Vanilla creates and updates an app-owned status indicator at `apps/vanilla/src/ui/status-indicator-test.ts:30`. Vue edits accepted data and renders `StatusIndicator` at `apps/vue/src/status-indicator-test.ts:17` and line 32. Foldkit projects accepted status through `createFoldkitStatusIndicator` at `apps/foldkit/ui-recipes/status-indicator/main.ts:66`. These runnable pages use production APIs despite the Vanilla and Vue filenames. Waiting, ready, and error visuals are not a run-state machine. Button Handle recipe tests at `apps/vanilla/e2e/button-handle-recipe.e2e.ts:1`, `apps/vue/e2e/button-handle-recipe.e2e.ts:1`, and `apps/foldkit/e2e/button-handle-recipe.e2e.ts:1` establish reusable append UI, not workflow edge insertion. Existing Base Node, node search, tooltips, and zoom controls are reusable UI ingredients, not proof of template integration.

### E5: measured layout

Browser entries are `apps/vanilla/ui-recipes/layout/index.html:10`, `apps/vue/ui-recipes/layout/index.html:63`, and `apps/foldkit/ui-recipes/layout/index.html:10`. Host adapters mount shared controls at `apps/vanilla/src/ui/layout-recipes.ts:406`, `apps/vue/src/layout-recipes.ts:301`, and `apps/foldkit/ui-recipes/layout/main.ts:528`. `mountLayoutControls` reads measurements, schedules the selected engine, rejects stale revisions, commits node positions, and waits for host presentation at `apps/shared/layout/browser.ts:161`. Shared input and position application are at `packages/core/src/domain/flow-layout.ts:51` and line 138. `runLayoutEngine` uses ELK for the selected engine at `packages/layout/src/public.ts:34`. Output is top-left node positions passed through E1, not a copied template layout or a proof of port-level edge equivalence.

### E6: themes

Shared light, dark, and system modes resolve at `packages/core/src/domain/flow-theme.ts:4` and line 19. Vanilla binds the mode at `apps/vanilla/src/mount-flow.ts:2337`. Vue binds it at `packages/vue/src/flow-canvas.ts:1261` and renders the class at line 11456. Foldkit resolves the model mode into the rendered root at `packages/foldkit/src/graph.ts:8141`. Existing per-host styling tests are named below. A template-wide settings panel still needs app composition, but the bounded theme-switching capability is available in every host.

### E7: persistence

Shared versioned document encoding and decoding are at `packages/core/src/domain/flow-persistence.ts:532` and line 598. Vanilla, Vue, and Foldkit session round-trip tests are `apps/vanilla/e2e/graph-editing-examples.e2e.ts:136`, `apps/vue/e2e/graph-editing-examples.e2e.ts:138`, and `apps/foldkit/e2e/graph-editing-examples.e2e.ts:154`. Saved graph JSON is useful groundwork. It has no workflow version migration, provider secret policy, or execution-resume guarantee.

## Separate test paths and reusable capabilities

The following checked-in tests navigate real recipe entries and inspect accepted state and rendered output. They do not mount either template and do not compare a Flow run with an upstream run. This audit's final verification record is in the delivery plan.

| Capability | Shared production | Vanilla production | Vue production | Foldkit production | Test boundary |
| --- | --- | --- | --- | --- | --- |
| Text data and propagation | `packages/core/src/domain/flow-edit.ts:247` | `apps/vanilla/src/ui/computing-flows-recipes.ts:51` | `apps/vue/src/computing-flows-recipes.ts:22` | `apps/foldkit/ui-recipes/computing-flows/main.ts:31` | `apps/vanilla/e2e/computing-flows-recipes.e2e.ts:3`, `apps/vue/e2e/computing-flows-recipes.e2e.ts:3`, `apps/foldkit/e2e/computing-flows-recipes.e2e.ts:3`. Text propagation, not scheduled execution. |
| Status UI | E1 edits | `apps/vanilla/src/ui/status-indicator-test.ts:25` | `apps/vue/src/status-indicator-test.ts:17` | `apps/foldkit/ui-recipes/status-indicator/main.ts:114` | `apps/vanilla/e2e/ui-recipes.e2e.ts:95`, `apps/vue/e2e/ui-recipes.e2e.ts:3`, `apps/foldkit/e2e/ui-recipes.e2e.ts:3`. Manual status edits, not runner progress. |
| History | `packages/core/src/domain/flow-history.ts:288` | `apps/vanilla/src/history-demo.ts:66` | `apps/vue/src/history-demo.ts:12` | `apps/foldkit/history/main.ts:123` | Each host's `transaction-history.e2e.ts:1` under `apps/<host>/e2e/`. Accepted graph transitions, not run events. |
| Clipboard | `packages/core/src/domain/flow-clipboard.ts:178` | `apps/vanilla/src/clipboard-demo.ts:28` | `apps/vue/src/clipboard-demo.ts:24` | `apps/foldkit/src/clipboard-demo.ts:95` | Each host's `graph-clipboard.e2e.ts:1`. Fragment remapping, not workflow port/config references. |
| Grouping | `packages/core/src/domain/flow-grouping.ts:73` | `apps/vanilla/src/ui/subflows-recipes.ts:112` | `apps/vue/src/subflows-recipes.ts:111` | `apps/foldkit/ui-recipes/subflows/main.ts:213` | Each host's `grouping-actions.e2e.ts:1`. Spatial containment, not executable subworkflows. |
| Layout | `packages/layout/src/public.ts:34` | `apps/vanilla/src/ui/layout-recipes.ts:406` | `apps/vue/src/layout-recipes.ts:301` | `apps/foldkit/ui-recipes/layout/main.ts:528` | `apps/vanilla/e2e/layout-engines.e2e.ts:1`, `apps/vue/e2e/layout-engines.e2e.ts:1`, `apps/foldkit/e2e/layout-engines.e2e.ts:1`. Shared measured-engine acceptance, not template coordinates. |
| Shapes | `packages/core/src/domain/flow-shape.schema.ts:23` | `apps/vanilla/src/shapes-demo.ts:42` | `apps/vue/src/shapes-demo.ts:36` | `apps/foldkit/src/shapes-demo.ts:119` | Each host's `shapes.e2e.ts:1`. Shapes are optional presentation, not workflow kinds. |
| Animation | `packages/core/src/domain/flow-node-animation.ts:42` | `apps/vanilla/src/node-animation-demo.ts:27` | `apps/vue/src/node-animation-demo.ts:26` | `apps/foldkit/src/node-animation-demo.ts:100` | Each host's `node-animation.e2e.ts:1`. Position animation, not execution animation. |
| Routing | `packages/core/src/domain/flow-routing.ts:192` | `apps/vanilla/src/edge-routing-demo.ts:26` | `apps/vue/src/edge-routing-demo.ts:32` | `apps/foldkit/src/edge-routing-demo.ts:62` | Each host's `edge-routing.e2e.ts:1`. Obstacle routing, not workflow control flow. |
| Collaboration | `packages/collaboration-yjs/src/public.ts:529` | `apps/vanilla/src/collaborative-demo.ts:28` | `apps/vue/src/collaborative-demo.ts:40` | `apps/foldkit/src/collaborative-demo.ts:80` | Each host's `collaborative.e2e.ts:1` and `apps/shared/collaborative/mixed-host.e2e.ts:1`. Room document sync, not distributed execution. |

History, clipboard, grouping, shapes, animation, routing, and collaboration are available building blocks in all hosts, rated C for their existing bounded recipes. They were not established as upstream template requirements. They must not increase either template's aggregate rating. Theme tests are `apps/vanilla/e2e/styling-recipes.e2e.ts:137`, `apps/vue/e2e/final-wiring.e2e.ts:465`, and `apps/foldkit/e2e/model-styling.e2e.ts:200`. Navigation controls have separate per-host `ui-controls.e2e.ts` coverage. These are not a claim of identical coverage.

Negative findings used the three public package entries, generic node/data contracts, recipe implementations above, and a scoped search under `packages/`, `apps/`, and `tests/`, excluding generated output and dependencies. Searches for `WorkflowRunner`, `runWorkflow`, `generateText`, `generateImage`, and workflow-editor routes found no template implementation. `runWorkflow1` in the typed actor is a generic Effect operation, not a graph scheduler. Missing provider and workflow contracts are therefore G even though arbitrary JSON or custom renderers could hold related values.

## Observability boundary

Existing spans and attributes are defined at `packages/core/src/telemetry/flow-telemetry.ts:1` and line 35. Proposed workflow decode and edit paths reuse `FlowSpan.documentDecode`, `documentIntegrity`, `editPrepare`, `editFailure`, and host lifecycle spans, with failure, instance, and change context. Register any new workflow lifecycle spans and run/node identifiers centrally before adding them. Emit structured logs at decode, start, accepted semantic change, completion, cancellation, and failure. Keep token chunks and pointer moves out of logs. Never log prompt contents, credentials, or generated content by default. Application composition owns optional export and shutdown flushing. This research makes no collector-delivery claim.

## Conformity and deviations

- **Unverified reference conformity:** Flow supplies graph editing/navigation, theme switching, and measured ELK layout through the cited APIs and existing tests. C is availability evidence only. Exact template layouts, DOM, and behavior have no cross-reference acceptance test and remain unverified.
- **Intentionally different, proposed:** Effect and Schema own framework-independent workflow meaning, typed errors, and execution resources in `packages/`. Apps own palettes, controls, and browser lifecycle. This follows Flow standards instead of adopting Next.js, React, Zustand, shadcn, or AI SDK as required architecture. Unit and per-host offline acceptance tests are the proposed boundary.
- **Intentionally different, proposed:** Deterministic local text and image providers replace paid remote generation in default demos and tests. Label simulation explicitly. No API key is needed. A real provider is a separate maintainer decision with server-side credential ownership. Offline stream/event tests prove simulation only, not provider equivalence.
- **Unverified:** Subscription source and tests, template configuration and persistence, edge-plus insertion, validation policy, runtime traversal, branch/join semantics, lock behavior, streaming, and external provider behavior. No production or test call path beyond public observations is invented. Neither template has Flow acceptance tests today, so both remain G in all three hosts.
