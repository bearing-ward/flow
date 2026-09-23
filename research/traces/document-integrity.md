# Graph document integrity

Status: production paths verified from source at xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Flow unit tests cover every rejected relationship in this slice.

All reference paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Reference paths

React initializes `nodeLookup`, `connectionLookup`, and `edgeLookup`, then passes the input arrays to `updateConnectionLookup` and `adoptUserNodes` at `packages/react/src/store/initialState.ts:50`, `packages/react/src/store/initialState.ts:60`, and `packages/react/src/store/initialState.ts:61`. Controlled updates follow the same path. `setNodes` calls `adoptUserNodes` at `packages/react/src/store/index.ts:120`, and `setEdges` calls `updateConnectionLookup` at `packages/react/src/store/index.ts:143`.

`adoptUserNodes` clears the node lookup and iterates over every input node at `packages/system/src/utils/store.ts:143` and `packages/system/src/utils/store.ts:146`. It writes by node identifier at `packages/system/src/utils/store.ts:150` and `packages/system/src/utils/store.ts:172`. The later entry replaces the earlier lookup value when identifiers repeat.

`updateConnectionLookup` follows the same map behavior for edges. It clears both lookups at `packages/system/src/utils/store.ts:588`, iterates over the input edges at `packages/system/src/utils/store.ts:591`, and writes each edge by identifier at `packages/system/src/utils/store.ts:601`. The function does not reject a repeated identifier or check endpoint membership.

React defers endpoint handling to edge rendering. `EdgeWrapper` reads both endpoint nodes at `packages/react/src/components/EdgeWrapper/index.tsx:74`. It returns null positions when either node is absent at `packages/react/src/components/EdgeWrapper/index.tsx:77`, then omits the edge at `packages/react/src/components/EdgeWrapper/index.tsx:120`.

Svelte performs the same endpoint lookup while deriving layout at `packages/svelte/src/lib/store/visibleElements.ts:88`. It skips the edge when either endpoint is absent at `packages/svelte/src/lib/store/visibleElements.ts:92`. The resulting map writes reused and new layouts by edge identifier at `packages/svelte/src/lib/store/visibleElements.ts:125` and `packages/svelte/src/lib/store/visibleElements.ts:140`, so repeated edge identifiers cannot produce distinct entries in that map.

## Flow decision

`FlowDocumentSchema` decodes record shapes and branded identifiers. `validateFlowDocument` then checks cross-record invariants in a separate Effect step. `decodeFlowDocument` composes both steps, so unknown input crosses one public boundary before an adapter receives it.

Validation checks identifiers before relationships. It rejects the first duplicate node identifier, then the first duplicate edge identifier, then the first missing source or target node. The order makes failure deterministic and prevents an ambiguous duplicate node from becoming an endpoint lookup.

The failure contract uses schema-backed tagged errors: `DuplicateNodeId`, `DuplicateEdgeId`, and `MissingEdgeEndpoint`. The missing-endpoint error carries the edge identifier, the `source` or `target` role, and the missing node identifier. Validation returns the original document object on success.

`flow.document.integrity` records the validation span. Failure logs and spans contain only the bounded issue kind, affected identifiers, and endpoint role. They do not contain labels, positions, or the document payload.

## Alternatives

- A schema filter could reject every invalid document during structural decoding. That would expose a generic parse error and hide which graph rule failed. Flow keeps cross-record rules in a domain validation step with typed errors.
- Adapters could omit missing edges and let keyed maps collapse duplicates, matching the reference. That would give the same input different visible meaning across adapters. Flow rejects ambiguity before adapter state exists.
- Validation could collect every issue. The current API fails on the first issue to keep the error contract small and deterministic. Batch diagnostics can be added if document authoring needs them.

## Tests and gaps

Core tests cover duplicate node identifiers, duplicate edge identifiers, missing source nodes, missing target nodes, structural schema failure, valid decoding, and identity preservation for an already decoded document. The browser OTLP test rejects a duplicate node identifier through the application runtime and verifies the exported integrity span, warning, and bounded issue tag.

The imported reference has no located tests that define duplicate-identifier behavior as a supported contract. Duplicate rendering details may differ between React and Svelte because React retains input arrays while Svelte derives keyed maps. Self-edges remain valid in Flow because both endpoints resolve to a known node.

## Conformity and deviations

- **Conforms:** Flow uses node and edge identifiers as lookup keys after structural input decoding.
- **Conforms:** A missing endpoint never reaches visible edge output.
- **Deviates:** Flow rejects duplicate node and edge identifiers. The reference lookup helpers accept them and replace earlier map entries.
- **Deviates:** Flow rejects missing endpoints at document decode. React and Svelte retain the edge input and omit it during rendering or layout.
- **Deviates:** Flow exposes schema-backed tagged integrity errors. The inspected reference paths do not expose equivalent document-level failures.
- **Unverified:** The reference does not establish cross-adapter behavior for rendering duplicate identifiers, and no matching upstream tests were located.
