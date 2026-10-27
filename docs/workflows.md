# Build and simulate workflows

Open `/workflow/` in the Vanilla, Vue, or Foldkit development host. The landing page links to **Workflow and offline AI editor**. Both editors share this route. Select **Load base workflow** or **Load AI workflow** to start with the same fixture in every host.

1. Add a kind with the palette button or drag it onto the canvas. Keyboard users can focus a palette button and press Enter.
2. Select **Configure** for a node, edit its typed fields, and select **Apply configuration**. Text Input's **Locked** setting prevents text edits.
3. Choose source and target ports and select **Connect ports**. Validation issues identify the affected node, port, or setting. Activate an issue to focus its control.
4. Select **Run** to execute the accepted graph with the deterministic local provider. Inspect node status and the selected node's output. Select **Cancel** to stop work.
5. Select **Layout and fit** to arrange measured nodes with ELK. Use **Undo** and **Redo** for accepted edits and layout.
6. Select **Export workflow**, retain the saved JSON, and restore it through **Workflow JSON** and **Import workflow**.

Select a canvas node, focus it, and press Backspace or Delete to remove it and its incident edges. **Undo** restores it. Use **Select all**, **Copy selected**, and **Paste** to duplicate a graph with remapped port references. Theme offers light, dark, and system modes. Configuration controls are outside canvas gesture handling and remain keyboard accessible on narrow screens.

## Contracts and limits

The optional [`@flow/workflow` contract](../packages/workflow/README.md) describes all nine kinds, their configurations and named ports, structural and readiness issues, the versioned save format, run events, and provider services. Import through `@flow/workflow`, never implementation paths. Core and reusable host adapters have no workflow dependency. Browser controls and resource lifetime belong to application composition.

Runs use immutable accepted snapshots. A semantic edit invalidates the active run. Run output stays outside history, clipboard, room documents, and saved configuration. Groups, trees, shapes, rotation, manual routes, and bundles retain their existing presentation meaning. Groups are not executable subworkflows. Collaboration synchronizes accepted configuration, not distributed runs.

The default provider exposes `local-text` and `local-image` capabilities. It emits literal text chunks and an embedded original 256 by 256 PNG. Model choices, temperatures, and image sizes come from decoded capabilities. This is offline simulation. There is no API key field, vendor SDK, network fallback, live generation, backend persistence, or run resumption. A future service adapter requires a separate provider and credential-ownership decision. Applications must keep secrets out of opaque metadata as well as workflow fields.

## Acceptance boundary

The [independent closure trace](../research/traces/workflow-closure-2026-10-27.md) maps the original audit's W1-W9 and A1-A8 outcomes to production and test paths. Dedicated `workflow-editor.e2e.ts`, `workflow-ai-editor.e2e.ts`, and `workflow-closure.e2e.ts` run in every host. Tests block external HTTP and WebSocket traffic. Unit and real local room tests cover extension interoperability and transient runs; packed consumers exercise the published workflow entry.

These checks establish Flow's functional offline outcomes. Subscription source, upstream scheduling and subscription behavior, commercial model equivalence, exact visuals, service delivery, and OTLP collector delivery remain unverified.
